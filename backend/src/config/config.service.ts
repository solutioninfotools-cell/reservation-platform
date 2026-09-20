import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InitialSetupDto } from './dto/initial-setup.dto';
import { ResetSupervisorDto } from './dto/reset-supervisor.dto';

const SALT_ROUNDS = 12;

/**
 * Configuration initiale de la plateforme (section 6 du CDC).
 * V1 : un seul espace configuré (un seul domaine actif) — pas de marketplace
 * multi-domaines visible côté client.
 */
@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async getPublicConfig() {
    const config = await this.prisma.systemConfig.findFirst();
    if (!config) return { isConfigured: false };
    return {
      isConfigured: config.isConfigured,
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
      const config = existing
        ? await tx.systemConfig.update({
            where: { id: existing.id },
            data: { isConfigured: true, modeSupervision: dto.modeSupervision, domaine: dto.domaine },
          })
        : await tx.systemConfig.create({
            data: { isConfigured: true, modeSupervision: dto.modeSupervision, domaine: dto.domaine },
          });

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

      return { config, user };
    });

    await this.audit.log({
      userId: result.user.id,
      action: 'INITIAL_SETUP',
      details: { modeSupervision: dto.modeSupervision, domaine: dto.domaine },
    });

    return { message: 'Configuration initiale terminée.', domaine: dto.domaine, modeSupervision: dto.modeSupervision };
  }

  /**
   * Réinitialisation sécurisée du mode de supervision (section 7 du CDC).
   * Ne supprime AUCUNE donnée métier : les comptes Professionnels/Réceptionnistes,
   * clients, rendez-vous, historique, services restent intégralement conservés.
   * Les comptes existants sont temporairement suspendus (DESACTIVE) jusqu'à ce
   * que le nouveau superviseur soit configuré.
   */
  async resetSupervisor(userId: string, dto: ResetSupervisorDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSIONNEL')) {
      throw new ForbiddenException('Seul le superviseur actuel peut réinitialiser la configuration.');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Mot de passe incorrect — réinitialisation annulée.');

    const config = await this.prisma.systemConfig.findFirst();
    if (!config) throw new BadRequestException('Aucune configuration existante.');

    await this.prisma.$transaction([
      this.prisma.systemConfig.update({ where: { id: config.id }, data: { modeSupervision: dto.nouveauMode } }),
      // Suspend temporairement les autres comptes actifs (hors superviseur courant) —
      // aucune donnée métier n'est supprimée, seul l'accès est suspendu.
      this.prisma.user.updateMany({
        where: { id: { not: userId }, statutCompte: 'ACTIF' },
        data: { statutCompte: 'DESACTIVE' },
      }),
    ]);

    await this.audit.log({
      userId,
      action: 'SUPERVISOR_RESET',
      details: { nouveauMode: dto.nouveauMode },
    });

    return { message: 'Mode de supervision réinitialisé. Les comptes existants ont été suspendus temporairement (aucune donnée supprimée).' };
  }
}
