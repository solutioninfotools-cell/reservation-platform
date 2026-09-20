import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
    private email: EmailService,
  ) {}

  /**
   * Inscription Professionnel ou Réceptionniste.
   * Le compte est créé avec le statut EN_ATTENTE : il doit être validé par l'Admin
   * (ou le Prestataire superviseur, selon le mode de supervision actif) avant de
   * pouvoir se connecter — conforme au cahier des charges.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Un compte existe déjà avec cet e-mail.');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        ...(dto.role === 'PROFESSIONNEL'
          ? { professionnel: { create: { nom: dto.nom, specialite: dto.specialite, telephone: dto.telephone } } }
          : { receptionniste: { create: { nom: dto.nom, telephone: dto.telephone } } }),
      },
    });

    await this.sendVerificationCode(user.id, user.email);
    await this.audit.log({ userId: user.id, action: 'REGISTER', cible: user.id, details: { role: dto.role } });

    return { message: 'Compte créé. Vérifiez votre e-mail puis attendez la validation de votre inscription.' };
  }

  async sendVerificationCode(userId: string, email: string) {
    const code = this.email.generateCode();
    await this.prisma.emailVerificationToken.create({
      data: { userId, code, type: 'VERIFICATION_EMAIL', expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });
    await this.email.send(email, 'Vérifiez votre adresse e-mail', `Votre code de vérification est : ${code} (valable 15 minutes).`);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('Compte introuvable.');

    const token = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, code: dto.code, type: 'VERIFICATION_EMAIL', usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!token || token.expiresAt < new Date()) {
      throw new BadRequestException('Code invalide ou expiré.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: user.id }, data: { emailVerifie: true } }),
    ]);

    return { message: 'E-mail vérifié avec succès.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Identifiants invalides.');

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Identifiants invalides.');

    if (user.statutCompte === 'EN_ATTENTE') {
      // Le CDC distingue les deux causes du statut « En attente » : e-mail non
      // confirmé, ou inscription pas encore validée par le superviseur.
      if (!user.emailVerifie) {
        throw new UnauthorizedException(
          "Votre adresse e-mail n'est pas encore confirmée. Saisissez le code reçu par e-mail.",
        );
      }
      throw new UnauthorizedException("Votre compte est en attente de validation par l'administrateur.");
    }
    if (user.statutCompte === 'REFUSE') {
      throw new UnauthorizedException("Votre inscription a été refusée par l'administrateur.");
    }
    if (user.statutCompte === 'DESACTIVE') {
      throw new UnauthorizedException('Votre compte a été désactivé. Contactez votre administrateur.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({ userId: user.id, action: 'LOGIN', cible: user.id });

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  /**
   * Profil de la session courante, relu en base à chaque appel.
   * Permet au frontend de revalider une session persistée (localStorage) sans
   * jamais faire confiance au rôle stocké côté navigateur.
   */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        statutCompte: true,
        emailVerifie: true,
        lastLoginAt: true,
        professionnel: { select: { id: true, nom: true, specialite: true } },
        receptionniste: { select: { id: true, nom: true } },
      },
    });
    if (!user) throw new UnauthorizedException('Compte introuvable.');
    if (user.statutCompte !== 'ACTIF') throw new UnauthorizedException("Votre compte n'est plus actif.");
    return user;
  }

  /** Renvoie un nouveau code de vérification d'e-mail. */
  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Réponse volontairement identique dans tous les cas : ne révèle pas si
    // l'adresse existe en base (protection contre l'énumération de comptes).
    if (user && !user.emailVerifie) {
      await this.sendVerificationCode(user.id, user.email);
    }
    return { message: "Si un compte non confirmé existe pour cette adresse, un nouveau code vient d'être envoyé." };
  }

  /**
   * Mot de passe oublié (section 22 du CDC) — disponible pour tous les rôles.
   * Un code à usage unique valable 30 minutes est envoyé par e-mail.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (user) {
      const code = this.email.generateCode();
      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          code,
          type: 'RESET_PASSWORD',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      await this.email.send(
        user.email,
        "Réinitialisation de votre mot de passe",
        `Votre code de réinitialisation est : ${code} (valable 30 minutes). Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      );
      await this.audit.log({ userId: user.id, action: 'PASSWORD_RESET_REQUESTED', cible: user.id });
    }

    // Même message qu'un compte existe ou non — évite l'énumération d'adresses.
    return { message: "Si un compte existe pour cette adresse, un code de réinitialisation vient d'être envoyé." };
  }

  /** Définition du nouveau mot de passe à partir du code reçu par e-mail. */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('Code invalide ou expiré.');

    const token = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, code: dto.code, type: 'RESET_PASSWORD', usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!token || token.expiresAt < new Date()) {
      throw new BadRequestException('Code invalide ou expiré.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Le code utilisé et tout autre code de réinitialisation encore valide
      // sont invalidés en même temps.
      this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, type: 'RESET_PASSWORD', usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.audit.log({ userId: user.id, action: 'PASSWORD_RESET', cible: user.id });
    return { message: 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.' };
  }

  /**
   * Vérifie le mot de passe d'un utilisateur — utilisé pour les actions sensibles
   * (ex : réinitialisation du mode de supervision, section 7 du CDC) où une
   * ressaisie du mot de passe est exigée en plus du JWT déjà valide.
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    return bcrypt.compare(password, user.passwordHash);
  }
}
