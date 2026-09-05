import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

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
      throw new UnauthorizedException("Votre compte est en attente de validation par l'administrateur.");
    }
    if (user.statutCompte === 'REFUSE' || user.statutCompte === 'DESACTIVE') {
      throw new UnauthorizedException('Votre compte n\'est pas actif. Contactez votre administrateur.');
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
