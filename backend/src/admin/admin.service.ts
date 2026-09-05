import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notifications: NotificationsService) {}

  // ---------------- Comptes Professionnels ----------------
  async listProfessionnels(statut?: string) {
    return this.prisma.user.findMany({
      where: { role: 'PROFESSIONNEL', statutCompte: statut ? (statut as any) : undefined },
      include: { professionnel: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async listReceptionnistes(statut?: string) {
    return this.prisma.user.findMany({
      where: { role: 'RECEPTIONNISTE', statutCompte: statut ? (statut as any) : undefined },
      include: { receptionniste: { include: { affectations: { include: { professionnel: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setStatutCompte(userId: string, statut: 'ACTIF' | 'REFUSE' | 'DESACTIVE', adminUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Compte introuvable.');

    await this.prisma.user.update({ where: { id: userId }, data: { statutCompte: statut } });
    await this.audit.log({ userId: adminUserId, action: 'ACCOUNT_STATUS_CHANGED', cible: userId, details: { statut } });

    if (statut === 'ACTIF') await this.notifications.create(userId, 'COMPTE_VALIDE', 'Votre compte a été validé. Vous pouvez maintenant vous connecter.');
    if (statut === 'REFUSE') await this.notifications.create(userId, 'COMPTE_REFUSE', 'Votre inscription a été refusée par l\'administrateur.');

    return { message: `Statut du compte mis à jour : ${statut}` };
  }

  // ---------------- Affectation Réceptionniste ↔ Professionnel ----------------
  async affecter(professionnelId: string, receptionnisteId: string, adminUserId: string) {
    const affectation = await this.prisma.affectation.upsert({
      where: { professionnelId_receptionnisteId: { professionnelId, receptionnisteId } },
      create: { professionnelId, receptionnisteId },
      update: {},
    });
    const rec = await this.prisma.receptionniste.findUnique({ where: { id: receptionnisteId } });
    if (rec) await this.notifications.create(rec.userId, 'AFFECTATION', 'Vous avez été affectée à un nouveau professionnel.');
    await this.audit.log({ userId: adminUserId, action: 'AFFECTATION_CREATED', cible: affectation.id });
    return affectation;
  }
  async desaffecter(professionnelId: string, receptionnisteId: string, adminUserId: string) {
    await this.prisma.affectation.delete({ where: { professionnelId_receptionnisteId: { professionnelId, receptionnisteId } } });
    await this.audit.log({ userId: adminUserId, action: 'AFFECTATION_REMOVED', details: { professionnelId, receptionnisteId } });
    return { message: 'Affectation retirée.' };
  }

  // ---------------- Paramètres généraux de la plateforme ----------------
  async getParams() {
    return this.prisma.systemConfig.findFirst();
  }
  async updateParams(data: Partial<{
    platformName: string; slogan: string; description: string; logoUrl: string;
    address: string; phone: string; email: string; joursOuvrables: string[]; horairesGeneraux: string; conditions: string;
  }>, adminUserId: string) {
    const config = await this.prisma.systemConfig.findFirst();
    if (!config) throw new BadRequestException('Configuration système introuvable.');
    const updated = await this.prisma.systemConfig.update({ where: { id: config.id }, data });
    await this.audit.log({ userId: adminUserId, action: 'PLATFORM_PARAMS_UPDATED', details: data });
    return updated;
  }

  // ---------------- Statistiques globales (données réelles, section 31 & 41 du CDC) ----------------
  async statsGlobales() {
    const [nbPros, proActifs, proAttente, proDesactives, nbRec, recAttente, nbClients, nbRdv, rdvTermines, rdvAnnules] =
      await this.prisma.$transaction([
        this.prisma.professionnel.count(),
        this.prisma.user.count({ where: { role: 'PROFESSIONNEL', statutCompte: 'ACTIF' } }),
        this.prisma.user.count({ where: { role: 'PROFESSIONNEL', statutCompte: 'EN_ATTENTE' } }),
        this.prisma.user.count({ where: { role: 'PROFESSIONNEL', statutCompte: 'DESACTIVE' } }),
        this.prisma.receptionniste.count(),
        this.prisma.user.count({ where: { role: 'RECEPTIONNISTE', statutCompte: 'EN_ATTENTE' } }),
        this.prisma.client.count(),
        this.prisma.rendezVous.count(),
        this.prisma.rendezVous.count({ where: { statut: 'TERMINE' } }),
        this.prisma.rendezVous.count({ where: { statut: 'ANNULE' } }),
      ]);
    return { nbPros, proActifs, proAttente, proDesactives, nbRec, recAttente, nbClients, nbRdv, rdvTermines, rdvAnnules };
  }

  async auditLog(action?: string) {
    return this.audit.list({ action });
  }
}
