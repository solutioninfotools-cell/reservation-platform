import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { getSupervision } from '../common/supervision';
import { getEquipe } from '../common/equipe';
import { InitialSetupDto } from './dto/initial-setup.dto';
import { ReinitialisationTotaleDto, VersAdminDto, VersPrestataireDto } from './dto/supervision.dto';

const SALT_ROUNDS = 12;
const PHRASE_CONFIRMATION = 'REINITIALISER';

/**
 * Configuration initiale de la plateforme (section 6 du CDC) et gestion du
 * mode de supervision (section 7 du CDC).
 */
@Injectable()
export class ConfigService {
  private readonly logger = new Logger('ConfigService');

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async getPublicConfig() {
    const config = await this.prisma.systemConfig.findFirst();
    if (!config) return { isConfigured: false };
    const equipe = await getEquipe(this.prisma);
    return {
      isConfigured: config.isConfigured,
      equipeComplete: equipe.complete,
      domaine: config.domaine,
      platformName: config.platformName,
      slogan: config.slogan,
      description: config.description,
      logoUrl: config.logoUrl,
      address: config.address,
      phone: config.phone,
      email: config.email,
      joursOuvrables: config.joursOuvrables,
      horairesGeneraux: config.horairesGeneraux,
    };
  }

  async initialSetup(dto: InitialSetupDto) {
    const existing = await this.prisma.systemConfig.findFirst();
    if (existing?.isConfigured) {
      throw new BadRequestException('La configuration initiale a déjà été effectuée.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      // Le compte superviseur créé est toujours ACTIF immédiatement (pas de validation
      // nécessaire pour le tout premier compte de la plateforme).
      const role = dto.modeSupervision === 'ADMIN' ? 'ADMIN' : 'PROFESSIONNEL';
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role,
          statutCompte: 'ACTIF',
          emailVerifie: true,
          ...(role === 'PROFESSIONNEL' ? { professionnel: { create: { nom: dto.nom } } } : {}),
        },
      });

      const donneesConfig = {
        isConfigured: true,
        modeSupervision: dto.modeSupervision,
        domaine: dto.domaine,
        superviseurUserId: role === 'PROFESSIONNEL' ? user.id : null,
      };
      const config = existing
        ? await tx.systemConfig.update({ where: { id: existing.id }, data: donneesConfig })
        : await tx.systemConfig.create({ data: donneesConfig });

      // Le domaine choisi ici apparaît dans la liste des domaines de l'espace Admin.
      await tx.domaine.upsert({
        where: { nom: dto.domaine },
        update: { actif: true },
        create: { nom: dto.domaine, actif: true, ordre: 0 },
      });

      return { config, user };
    });

    await this.audit.log({
      userId: result.user.id,
      action: 'INITIAL_SETUP',
      details: { modeSupervision: dto.modeSupervision, domaine: dto.domaine },
    });

    return { message: 'Configuration initiale terminée.', domaine: dto.domaine, modeSupervision: dto.modeSupervision };
  }

  // ==========================================================================
  // MODE DE SUPERVISION
  // ==========================================================================

  /** Seul le superviseur actuel (admin actif, ou professionnel désigné) peut agir. */
  private async exigerSuperviseur(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const refus = new ForbiddenException('Seul le superviseur actuel peut effectuer cette action.');
    if (!user || user.statutCompte !== 'ACTIF') throw refus;

    if (user.role !== 'ADMIN') {
      const { mode, superviseurUserId } = await getSupervision(this.prisma);
      if (!(user.role === 'PROFESSIONNEL' && mode === 'PRESTATAIRE' && superviseurUserId === userId)) throw refus;
    }
    return user;
  }

  private async verifierMotDePasse(user: { passwordHash: string }, password: string) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    // 400 (et non 401) : le client API déconnecte l'utilisateur sur toute réponse 401.
    if (!ok) throw new BadRequestException('Mot de passe incorrect — action annulée.');
  }

  /** État courant : mode de supervision, superviseur, et professionnels pouvant le devenir. */
  async getSupervisionState(userId: string) {
    await this.exigerSuperviseur(userId);
    const { config, mode, superviseurUserId } = await getSupervision(this.prisma);

    const superviseur = superviseurUserId
      ? await this.prisma.user.findUnique({
          where: { id: superviseurUserId },
          select: { id: true, email: true, professionnel: { select: { nom: true } } },
        })
      : null;

    const professionnels = await this.prisma.professionnel.findMany({
      where: { user: { statutCompte: 'ACTIF' } },
      select: { nom: true, specialite: true, userId: true, user: { select: { email: true } } },
      orderBy: { nom: 'asc' },
    });

    const adminExistant = await this.trouverAdminExistant();

    return {
      mode: mode ?? 'ADMIN',
      domaine: config?.domaine ?? null,
      adminExistant: adminExistant ? { email: adminExistant.email } : null,
      superviseur: superviseur
        ? { userId: superviseur.id, nom: superviseur.professionnel?.nom ?? superviseur.email, email: superviseur.email }
        : null,
      professionnels: professionnels.map((p) => ({
        userId: p.userId,
        nom: p.nom,
        specialite: p.specialite,
        email: p.user.email,
      })),
    };
  }

  /**
   * Mode Admin → mode Prestataire : le professionnel choisi devient le superviseur
   * (il bascule entre son espace Professionnel et l'espace Admin). Aucune donnée n'est
   * supprimée ; les comptes Admin sont seulement désactivés (conservés).
   */
  async versPrestataire(userId: string, dto: VersPrestataireDto) {
    const acteur = await this.exigerSuperviseur(userId);
    await this.verifierMotDePasse(acteur, dto.password);

    const { config, mode } = await getSupervision(this.prisma);
    if (mode === 'PRESTATAIRE') {
      throw new BadRequestException('La plateforme est déjà en mode Professionnel superviseur.');
    }

    const cible = await this.prisma.user.findUnique({
      where: { id: dto.professionnelUserId },
      include: { professionnel: true },
    });
    if (!cible || cible.role !== 'PROFESSIONNEL' || !cible.professionnel) {
      throw new BadRequestException('Professionnel introuvable.');
    }
    if (cible.statutCompte !== 'ACTIF') {
      throw new BadRequestException("Ce professionnel n'a pas de compte actif : activez-le d'abord.");
    }

    await this.prisma.$transaction([
      config
        ? this.prisma.systemConfig.update({
            where: { id: config.id },
            data: { modeSupervision: 'PRESTATAIRE', superviseurUserId: cible.id },
          })
        : this.prisma.systemConfig.create({
            data: { isConfigured: true, modeSupervision: 'PRESTATAIRE', superviseurUserId: cible.id },
          }),
      this.prisma.user.updateMany({ where: { role: 'ADMIN' }, data: { statutCompte: 'DESACTIVE' } }),
    ]);

    await this.audit.log({
      userId,
      action: 'SUPERVISION_VERS_PRESTATAIRE',
      cible: cible.id,
      details: { superviseur: cible.email },
    });

    return {
      message: `${cible.professionnel.nom} est maintenant le professionnel superviseur. Vos données sont intégralement conservées.`,
      deconnexion: acteur.role === 'ADMIN',
    };
  }

  /** Compte Admin existant (le plus ancien) : c'est lui qui est réactivé, jamais un second compte. */
  private trouverAdminExistant() {
    return this.prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
  }

  /**
   * Mode Prestataire → mode Admin indépendant. Le compte Admin déjà existant est
   * réactivé (mot de passe modifiable, facultatif) : il n'y a jamais qu'un seul compte
   * Admin. Un compte n'est créé que si aucun n'a jamais existé (plateforme configurée
   * directement en mode Prestataire). Le bouton de basculation disparaît du compte
   * professionnel. Aucune donnée n'est supprimée.
   */
  async versAdmin(userId: string, dto: VersAdminDto) {
    const acteur = await this.exigerSuperviseur(userId);
    await this.verifierMotDePasse(acteur, dto.password);

    const { config, mode } = await getSupervision(this.prisma);
    if (mode !== 'PRESTATAIRE') {
      throw new BadRequestException('La plateforme est déjà en mode Admin indépendant.');
    }

    const nouveauMdp = dto.motDePasseAdmin && dto.motDePasseAdmin.length > 0 ? dto.motDePasseAdmin : undefined;
    if (nouveauMdp && nouveauMdp.length < 8) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    }

    const modeAdmin = config
      ? this.prisma.systemConfig.update({ where: { id: config.id }, data: { modeSupervision: 'ADMIN', superviseurUserId: null } })
      : this.prisma.systemConfig.create({ data: { isConfigured: true, modeSupervision: 'ADMIN', superviseurUserId: null } });

    const existant = await this.trouverAdminExistant();
    let admin: { id: string; email: string };

    if (existant) {
      const data: Prisma.UserUpdateInput = { statutCompte: 'ACTIF', emailVerifie: true };
      if (nouveauMdp) data.passwordHash = await bcrypt.hash(nouveauMdp, SALT_ROUNDS);
      const [reactive] = await this.prisma.$transaction([
        this.prisma.user.update({ where: { id: existant.id }, data }),
        modeAdmin,
      ]);
      admin = reactive;
    } else {
      // Première fois seulement : aucun compte Admin n'a jamais existé.
      const email = dto.email?.trim().toLowerCase();
      if (!dto.nom || dto.nom.trim().length < 2 || !email || !nouveauMdp) {
        throw new BadRequestException("Aucun compte Admin n'existe encore : nom, e-mail et mot de passe sont obligatoires.");
      }
      if (await this.prisma.user.findUnique({ where: { email } })) {
        throw new ConflictException('Cette adresse e-mail est déjà utilisée par un autre compte.');
      }
      const passwordHash = await bcrypt.hash(nouveauMdp, SALT_ROUNDS);
      const [cree] = await this.prisma.$transaction([
        this.prisma.user.create({ data: { email, passwordHash, role: 'ADMIN', statutCompte: 'ACTIF', emailVerifie: true } }),
        modeAdmin,
      ]);
      admin = cree;
    }

    await this.audit.log({
      userId,
      action: 'SUPERVISION_VERS_ADMIN',
      cible: admin.id,
      details: { email: admin.email, compteExistant: !!existant, motDePasseModifie: !!nouveauMdp },
    });

    return {
      message: `Mode Admin indépendant activé. Connectez-vous avec ${admin.email} pour accéder à l'espace Admin.`,
      adminEmail: admin.email,
    };
  }

  /**
   * Réinitialisation TOTALE : toutes les tables de l'application sont vidées (comptes,
   * professionnels, clients, rendez-vous, services, domaines, paramètres, notifications,
   * journal d'audit…). La plateforme redevient « non configurée » : la configuration
   * initiale est à refaire. Irréversible.
   */
  async reinitialisationTotale(userId: string, dto: ReinitialisationTotaleDto) {
    const acteur = await this.exigerSuperviseur(userId);
    await this.verifierMotDePasse(acteur, dto.password);
    if (dto.confirmation !== PHRASE_CONFIRMATION) {
      throw new BadRequestException(`Saisissez exactement « ${PHRASE_CONFIRMATION} » pour confirmer.`);
    }

    // Tables déduites du schéma Prisma (jamais d'entrée utilisateur dans la requête SQL).
    const tables: string[] = (Prisma as any).dmmf.datamodel.models.map((m: any) => m.dbName ?? m.name);
    const liste = tables.map((t) => `"${t.replace(/"/g, '""')}"`).join(', ');

    this.logger.warn(`RÉINITIALISATION TOTALE demandée par ${acteur.email} (${tables.length} tables).`);
    await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${liste} RESTART IDENTITY CASCADE`);

    return {
      message: 'La plateforme a été entièrement réinitialisée. Refaites la configuration initiale.',
    };
  }
}