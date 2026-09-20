import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  AnnonceDto,
  CreateCompteDto,
  StatutCompteAdmin,
  UpdateClientDto,
  UpdateParamsDto,
  UpdatePermissionsAffectationDto,
  UpdateProfessionnelDto,
  UpdateReceptionnisteDto,
} from './dto/admin.dto';

const SALT_ROUNDS = 12;

/** Statuts considérés comme « actifs » dans l'agenda (créneau réellement occupé). */
const STATUTS_ACTIFS = ['RESERVE', 'CLIENT_ARRIVE', 'EN_COURS'] as const;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private appointments: AppointmentsService,
  ) {}

  // ==========================================================================
  // COMPTES PROFESSIONNELS
  // ==========================================================================
  async listProfessionnels(filters: { statut?: string; search?: string } = {}) {
    const where: Prisma.UserWhereInput = {
      role: 'PROFESSIONNEL',
      statutCompte: filters.statut ? (filters.statut as any) : undefined,
      ...(filters.search
        ? {
            OR: [
              { email: { contains: filters.search, mode: 'insensitive' } },
              { professionnel: { nom: { contains: filters.search, mode: 'insensitive' } } },
              { professionnel: { specialite: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const users = await this.prisma.user.findMany({
      where,
      include: {
        professionnel: {
          include: {
            _count: { select: { services: true, rendezVous: true, affectations: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const clientsParPro = await this.nbClientsParProfessionnel();

    return users
      .filter((u) => u.professionnel)
      .map((u) => this.mapProfessionnel(u, clientsParPro));
  }

  /** Fiche détaillée d'un professionnel (vue Admin). */
  async getProfessionnel(professionnelId: string) {
    const pro = await this.prisma.professionnel.findUnique({
      where: { id: professionnelId },
      include: {
        user: true,
        parametres: true,
        services: { orderBy: { createdAt: 'desc' } },
        disponibilites: { orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }] },
        indisponibilites: { where: { dateFin: { gte: new Date() } }, orderBy: { dateDebut: 'asc' } },
        affectations: { include: { receptionniste: { include: { user: true } } } },
        _count: { select: { services: true, rendezVous: true, affectations: true } },
      },
    });
    if (!pro) throw new NotFoundException('Professionnel introuvable.');

    const [parStatut, clients, derniersRdv] = await Promise.all([
      this.prisma.rendezVous.groupBy({
        by: ['statut'],
        where: { professionnelId },
        _count: { _all: true },
      }),
      this.prisma.rendezVous.findMany({
        where: { professionnelId },
        distinct: ['clientId'],
        select: { clientId: true },
      }),
      this.prisma.rendezVous.findMany({
        where: { professionnelId },
        include: { client: true, service: true },
        orderBy: { dateDebut: 'desc' },
        take: 10,
      }),
    ]);

    return {
      id: pro.id,
      userId: pro.userId,
      nom: pro.nom,
      email: pro.user.email,
      telephone: pro.telephone,
      specialite: pro.specialite,
      description: pro.description,
      adresse: pro.adresse,
      photoUrl: pro.photoUrl,
      statutCompte: pro.user.statutCompte,
      emailVerifie: pro.user.emailVerifie,
      createdAt: pro.user.createdAt,
      lastLoginAt: pro.user.lastLoginAt,
      nbServices: pro._count.services,
      nbRdv: pro._count.rendezVous,
      nbClients: clients.length,
      nbReceptionnistes: pro._count.affectations,
      rdvParStatut: Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all])),
      services: pro.services,
      disponibilites: pro.disponibilites,
      indisponibilites: pro.indisponibilites,
      // Règles de réservation propres au professionnel (CDC II.15bis) — lecture seule
      // côté Admin : elles restent modifiables depuis l'espace du professionnel.
      parametresReservation: pro.parametres,
      receptionnistes: pro.affectations.map((a) => ({
        affectationId: a.id,
        receptionnisteId: a.receptionnisteId,
        nom: a.receptionniste.nom,
        email: a.receptionniste.user.email,
        statutCompte: a.receptionniste.user.statutCompte,
        // Activation sur cet espace : décidée par le professionnel (CDC II.13.1),
        // l'Admin la consulte sans la modifier.
        actifSurEspace: a.actif,
        permissions: {
          peutConsulterAgenda: a.peutConsulterAgenda,
          peutGererRdv: a.peutGererRdv,
          peutGererPlanning: a.peutGererPlanning,
          peutGererParametres: a.peutGererParametres,
        },
      })),
      derniersRdv,
    };
  }

  // ==========================================================================
  // COMPTES RÉCEPTIONNISTES
  // ==========================================================================
  async listReceptionnistes(filters: { statut?: string; search?: string } = {}) {
    const where: Prisma.UserWhereInput = {
      role: 'RECEPTIONNISTE',
      statutCompte: filters.statut ? (filters.statut as any) : undefined,
      ...(filters.search
        ? {
            OR: [
              { email: { contains: filters.search, mode: 'insensitive' } },
              { receptionniste: { nom: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const users = await this.prisma.user.findMany({
      where,
      include: {
        receptionniste: {
          include: { affectations: { include: { professionnel: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.filter((u) => u.receptionniste).map((u) => this.mapReceptionniste(u));
  }

  async getReceptionniste(receptionnisteId: string) {
    const rec = await this.prisma.receptionniste.findUnique({
      where: { id: receptionnisteId },
      include: { user: true, affectations: { include: { professionnel: true } } },
    });
    if (!rec) throw new NotFoundException('Réceptionniste introuvable.');
    return this.mapReceptionniste({ ...rec.user, receptionniste: rec } as any);
  }

  // ==========================================================================
  // GESTION DES COMPTES (validation, activation, création, mot de passe)
  // ==========================================================================
  async setStatutCompte(userId: string, statut: StatutCompteAdmin, adminUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Compte introuvable.');
    if (user.role === 'ADMIN' && userId === adminUserId) {
      throw new BadRequestException('Vous ne pouvez pas modifier le statut de votre propre compte administrateur.');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { statutCompte: statut } });
    await this.audit.log({ userId: adminUserId, action: 'ACCOUNT_STATUS_CHANGED', cible: userId, details: { statut } });

    if (statut === 'ACTIF') await this.notifications.create(userId, 'COMPTE_VALIDE', 'Votre compte a été validé. Vous pouvez maintenant vous connecter.', adminUserId);
    if (statut === 'REFUSE') await this.notifications.create(userId, 'COMPTE_REFUSE', "Votre inscription a été refusée par l'administrateur.", adminUserId);
    if (statut === 'DESACTIVE') await this.notifications.create(userId, 'COMPTE_REFUSE', "Votre compte a été désactivé par l'administrateur.", adminUserId);

    return { message: `Statut du compte mis à jour : ${statut}` };
  }

  /**
   * Même opération sur plusieurs comptes (validation en lot des inscriptions).
   * Les comptes refusés individuellement (compte de l'Admin lui-même, id inconnu)
   * n'interrompent pas le traitement : ils sont listés dans `ignores`.
   */
  async setStatutCompteGroupe(userIds: string[], statut: StatutCompteAdmin, adminUserId: string) {
    const traites: string[] = [];
    const ignores: { userId: string; raison: string }[] = [];

    for (const userId of userIds) {
      try {
        await this.setStatutCompte(userId, statut, adminUserId);
        traites.push(userId);
      } catch (e: any) {
        ignores.push({ userId, raison: e?.message ?? 'Échec' });
      }
    }

    await this.audit.log({
      userId: adminUserId,
      action: 'ACCOUNT_STATUS_BULK_CHANGED',
      details: { statut, traites: traites.length, ignores: ignores.length },
    });
    return { statut, traites, ignores, message: `${traites.length} compte(s) mis à jour.` };
  }

  /** Correction d'une fiche professionnel par l'Admin (le titulaire est notifié). */
  async updateProfessionnel(professionnelId: string, dto: UpdateProfessionnelDto, adminUserId: string) {
    const pro = await this.prisma.professionnel.findUnique({ where: { id: professionnelId } });
    if (!pro) throw new NotFoundException('Professionnel introuvable.');

    const updated = await this.prisma.professionnel.update({ where: { id: professionnelId }, data: { ...dto } });
    await this.notifications.create(pro.userId, 'MODIFICATION', "Votre fiche professionnelle a été mise à jour par l'administrateur.", adminUserId);
    await this.audit.log({
      userId: adminUserId,
      action: 'PRO_PROFILE_UPDATED',
      cible: professionnelId,
      details: dto as any,
      professionnelId,
    });
    return updated;
  }

  async updateReceptionniste(receptionnisteId: string, dto: UpdateReceptionnisteDto, adminUserId: string) {
    const rec = await this.prisma.receptionniste.findUnique({ where: { id: receptionnisteId } });
    if (!rec) throw new NotFoundException('Réceptionniste introuvable.');

    const updated = await this.prisma.receptionniste.update({ where: { id: receptionnisteId }, data: { ...dto } });
    await this.notifications.create(rec.userId, 'MODIFICATION', "Votre fiche a été mise à jour par l'administrateur.", adminUserId);
    await this.audit.log({ userId: adminUserId, action: 'RECEPTIONNISTE_PROFILE_UPDATED', cible: receptionnisteId, details: dto as any });
    return updated;
  }

  /**
   * Changement d'adresse e-mail (= identifiant de connexion). L'adresse est
   * repassée à « non vérifiée » : c'est l'Admin qui l'affirme, pas le titulaire.
   */
  async updateEmail(userId: string, email: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Compte introuvable.');
    if (user.email === email) return { message: 'Adresse inchangée.' };

    const conflit = await this.prisma.user.findUnique({ where: { email } });
    if (conflit) throw new ConflictException('Un compte existe déjà avec cette adresse e-mail.');

    await this.prisma.user.update({ where: { id: userId }, data: { email, emailVerifie: false } });
    await this.notifications.create(
      userId,
      'MODIFICATION',
      `Votre adresse de connexion a été remplacée par ${email} par l'administrateur.`,
      adminUserId,
    );
    await this.audit.log({ userId: adminUserId, action: 'ACCOUNT_EMAIL_CHANGED', cible: userId, details: { ancien: user.email, nouveau: email } });
    return { message: 'Adresse e-mail mise à jour.' };
  }

  /**
   * Création d'un compte Professionnel / Réceptionniste par l'Admin.
   * Le compte est immédiatement ACTIF (créé par une autorité de confiance) —
   * contrairement à l'inscription publique qui reste EN_ATTENTE de validation.
   */
  async createCompte(dto: CreateCompteDto, adminUserId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Un compte existe déjà avec cette adresse e-mail.');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    // Un compte ADMIN n'a pas de fiche métier : le nom saisi n'est conservé que
    // dans l'audit, l'identité d'un administrateur étant son adresse e-mail.
    const profil =
      dto.role === 'PROFESSIONNEL'
        ? { professionnel: { create: { nom: dto.nom, telephone: dto.telephone, specialite: dto.specialite } } }
        : dto.role === 'RECEPTIONNISTE'
          ? { receptionniste: { create: { nom: dto.nom, telephone: dto.telephone } } }
          : {};

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        statutCompte: 'ACTIF',
        emailVerifie: true,
        ...profil,
      },
      include: { professionnel: true, receptionniste: true },
    });

    await this.notifications.create(
      user.id,
      'COMPTE_VALIDE',
      "Votre compte a été créé et activé par l'administrateur de la plateforme.",
      adminUserId,
    );
    await this.audit.log({ userId: adminUserId, action: 'ACCOUNT_CREATED', cible: user.id, details: { role: dto.role, email: dto.email, nom: dto.nom } });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      statutCompte: user.statutCompte,
      professionnelId: user.professionnel?.id ?? null,
      receptionnisteId: user.receptionniste?.id ?? null,
    };
  }

  async resetPassword(userId: string, password: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Compte introuvable.');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, type: 'RESET_PASSWORD', usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.notifications.create(userId, 'MODIFICATION', "Votre mot de passe a été réinitialisé par l'administrateur.", adminUserId);
    await this.audit.log({ userId: adminUserId, action: 'ACCOUNT_PASSWORD_RESET', cible: userId });
    return { message: 'Mot de passe réinitialisé.' };
  }

  /**
   * Suppression définitive d'un compte. Refusée si des rendez-vous y sont
   * rattachés : l'historique métier ne doit jamais être perdu (on désactive
   * le compte dans ce cas, cf. `setStatutCompte`).
   */
  async deleteCompte(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { professionnel: { include: { _count: { select: { rendezVous: true } } } }, receptionniste: true },
    });
    if (!user) throw new NotFoundException('Compte introuvable.');
    if (userId === adminUserId) throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte.');
    if (user.role === 'ADMIN') throw new BadRequestException("Un compte administrateur ne peut pas être supprimé depuis l'interface.");
    if (user.professionnel && user.professionnel._count.rendezVous > 0) {
      throw new BadRequestException(
        "Ce professionnel possède des rendez-vous : son compte ne peut pas être supprimé. Désactivez-le pour conserver l'historique.",
      );
    }

    await this.prisma.user.delete({ where: { id: userId } });
    await this.audit.log({ userId: adminUserId, action: 'ACCOUNT_DELETED', cible: userId, details: { email: user.email, role: user.role } });
    return { message: 'Compte supprimé.' };
  }

  // ==========================================================================
  // RECHERCHE GLOBALE — tous les utilisateurs de la plateforme
  // ==========================================================================
  async listUsers(filters: { role?: string; search?: string } = {}) {
    const search = filters.search?.trim();
    const wantComptes = !filters.role || filters.role !== 'CLIENT';
    const wantClients = !filters.role || filters.role === 'CLIENT';

    const comptes = wantComptes
      ? await this.prisma.user.findMany({
          where: {
            role: filters.role && filters.role !== 'CLIENT' ? (filters.role as any) : undefined,
            ...(search
              ? {
                  OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { professionnel: { nom: { contains: search, mode: 'insensitive' } } },
                    { receptionniste: { nom: { contains: search, mode: 'insensitive' } } },
                  ],
                }
              : {}),
          },
          include: { professionnel: true, receptionniste: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const clients = wantClients
      ? await this.prisma.client.findMany({
          where: search
            ? {
                OR: [
                  { nom: { contains: search, mode: 'insensitive' } },
                  { prenom: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                  { telephone: { contains: search } },
                ],
              }
            : undefined,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    return [
      ...comptes.map((u) => ({
        id: u.id,
        type: u.role as string,
        nom: u.professionnel?.nom ?? u.receptionniste?.nom ?? u.email,
        email: u.email,
        telephone: u.professionnel?.telephone ?? u.receptionniste?.telephone ?? null,
        statutCompte: u.statutCompte as string,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        professionnelId: u.professionnel?.id ?? null,
        receptionnisteId: u.receptionniste?.id ?? null,
      })),
      ...clients.map((c) => ({
        id: c.id,
        type: 'CLIENT',
        nom: `${c.prenom} ${c.nom}`.trim(),
        email: c.email,
        telephone: c.telephone,
        statutCompte: 'ACTIF',
        createdAt: c.createdAt,
        lastLoginAt: null,
        professionnelId: null,
        receptionnisteId: null,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ==========================================================================
  // AFFECTATIONS Réceptionniste ↔ Professionnel
  // ==========================================================================
  async affecter(professionnelId: string, receptionnisteId: string, adminUserId: string) {
    const [pro, rec] = await Promise.all([
      this.prisma.professionnel.findUnique({ where: { id: professionnelId } }),
      this.prisma.receptionniste.findUnique({ where: { id: receptionnisteId } }),
    ]);
    if (!pro) throw new NotFoundException('Professionnel introuvable.');
    if (!rec) throw new NotFoundException('Réceptionniste introuvable.');

    const affectation = await this.prisma.affectation.upsert({
      where: { professionnelId_receptionnisteId: { professionnelId, receptionnisteId } },
      create: { professionnelId, receptionnisteId },
      update: {},
    });
    await this.notifications.create(rec.userId, 'AFFECTATION', `Vous avez été affectée au professionnel ${pro.nom}.`, adminUserId);
    await this.notifications.create(pro.userId, 'AFFECTATION', `${rec.nom} a été affectée à votre espace.`, adminUserId);
    await this.audit.log({
      userId: adminUserId,
      action: 'AFFECTATION_CREATED',
      cible: affectation.id,
      details: { professionnelId, receptionnisteId },
      professionnelId,
    });
    return affectation;
  }

  async desaffecter(professionnelId: string, receptionnisteId: string, adminUserId: string) {
    const existing = await this.prisma.affectation.findUnique({
      where: { professionnelId_receptionnisteId: { professionnelId, receptionnisteId } },
      include: { receptionniste: true, professionnel: true },
    });
    if (!existing) throw new NotFoundException('Affectation introuvable.');

    await this.prisma.affectation.delete({ where: { id: existing.id } });
    await this.notifications.create(
      existing.receptionniste.userId,
      'AFFECTATION',
      `Votre affectation au professionnel ${existing.professionnel.nom} a été retirée.`,
      adminUserId,
    );
    await this.audit.log({
      userId: adminUserId,
      action: 'AFFECTATION_REMOVED',
      details: { professionnelId, receptionnisteId },
      professionnelId,
    });
    return { message: 'Affectation retirée.' };
  }

  /** Remplace l'ensemble des affectations d'une réceptionniste (formulaire « Affecter »). */
  async setAffectations(receptionnisteId: string, professionnelIds: string[], adminUserId: string) {
    const rec = await this.prisma.receptionniste.findUnique({
      where: { id: receptionnisteId },
      include: { affectations: true },
    });
    if (!rec) throw new NotFoundException('Réceptionniste introuvable.');

    const valides = await this.prisma.professionnel.findMany({ where: { id: { in: professionnelIds } }, select: { id: true } });
    if (valides.length !== professionnelIds.length) throw new BadRequestException('Un ou plusieurs professionnels sont introuvables.');

    const actuels = rec.affectations.map((a) => a.professionnelId);
    const aAjouter = professionnelIds.filter((id) => !actuels.includes(id));
    const aRetirer = actuels.filter((id) => !professionnelIds.includes(id));

    for (const professionnelId of aAjouter) await this.affecter(professionnelId, receptionnisteId, adminUserId);
    for (const professionnelId of aRetirer) await this.desaffecter(professionnelId, receptionnisteId, adminUserId);

    return this.getReceptionniste(receptionnisteId);
  }

  async updatePermissionsAffectation(affectationId: string, dto: UpdatePermissionsAffectationDto, adminUserId: string) {
    const affectation = await this.prisma.affectation.findUnique({
      where: { id: affectationId },
      include: { receptionniste: true },
    });
    if (!affectation) throw new NotFoundException('Affectation introuvable.');

    const updated = await this.prisma.affectation.update({ where: { id: affectationId }, data: { ...dto } });
    await this.notifications.create(
      affectation.receptionniste.userId,
      'AUTORISATIONS_MODIFIEES',
      'Vos autorisations ont été modifiées.',
      adminUserId,
    );
    await this.audit.log({
      userId: adminUserId,
      action: 'AFFECTATION_PERMISSIONS_UPDATED',
      cible: affectationId,
      details: { ...dto },
      professionnelId: affectation.professionnelId,
    });
    return updated;
  }

  // ==========================================================================
  // ANNONCES — message diffusé par l'Admin aux comptes de la plateforme
  // ==========================================================================
  async envoyerAnnonce(dto: AnnonceDto, adminUserId: string) {
    let where: Prisma.UserWhereInput;
    if (dto.cible === 'SELECTION') {
      if (!dto.userIds?.length) throw new BadRequestException('Sélectionnez au moins un destinataire.');
      where = { id: { in: dto.userIds } };
    } else if (dto.cible === 'PROFESSIONNELS') {
      where = { role: 'PROFESSIONNEL', statutCompte: 'ACTIF' };
    } else if (dto.cible === 'RECEPTIONNISTES') {
      where = { role: 'RECEPTIONNISTE', statutCompte: 'ACTIF' };
    } else {
      where = { role: { in: ['PROFESSIONNEL', 'RECEPTIONNISTE'] }, statutCompte: 'ACTIF' };
    }

    const destinataires = await this.prisma.user.findMany({ where, select: { id: true } });
    if (!destinataires.length) throw new BadRequestException('Aucun destinataire ne correspond à cette cible.');

    const message = dto.message.trim();
    // `TypeNotification` n'a pas de valeur dédiée aux annonces : on réutilise
    // MODIFICATION, `senderId` identifiant déjà l'administrateur émetteur.
    await this.prisma.notification.createMany({
      data: destinataires.map((u) => ({ recipientId: u.id, senderId: adminUserId, type: 'MODIFICATION' as const, message })),
    });
    await this.audit.log({
      userId: adminUserId,
      action: 'ANNONCE_ENVOYEE',
      details: { cible: dto.cible, destinataires: destinataires.length, message },
    });
    return { message: `Annonce envoyée à ${destinataires.length} compte(s).`, destinataires: destinataires.length };
  }

  // ==========================================================================
  // CLIENTS (vue globale, tous professionnels confondus)
  // ==========================================================================
  async listClients(filters: { search?: string } = {}) {
    const search = filters.search?.trim();
    const clients = await this.prisma.client.findMany({
      where: search
        ? {
            OR: [
              { nom: { contains: search, mode: 'insensitive' } },
              { prenom: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { telephone: { contains: search } },
            ],
          }
        : undefined,
      include: {
        _count: { select: { rendezVous: true } },
        rendezVous: {
          include: { professionnel: { select: { id: true, nom: true } } },
          orderBy: { dateDebut: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return clients.map((c) => ({
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      telephone: c.telephone,
      email: c.email,
      dateNaissance: c.dateNaissance,
      createdAt: c.createdAt,
      nbRdv: c._count.rendezVous,
      dernierRdv: c.rendezVous[0]?.dateDebut ?? null,
      professionnel: c.rendezVous[0]?.professionnel?.nom ?? null,
    }));
  }

  async getClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        rendezVous: {
          include: { service: true, professionnel: { select: { id: true, nom: true } } },
          orderBy: { dateDebut: 'desc' },
        },
      },
    });
    if (!client) throw new NotFoundException('Client introuvable.');

    const parStatut = client.rendezVous.reduce<Record<string, number>>((acc, r) => {
      acc[r.statut] = (acc[r.statut] ?? 0) + 1;
      return acc;
    }, {});
    return { ...client, nbRdv: client.rendezVous.length, rdvParStatut: parStatut };
  }

  /**
   * Correction d'une fiche client. Le téléphone identifie le client de façon
   * unique (c'est la clé de dédoublonnage) : un doublon est donc refusé.
   */
  async updateClient(clientId: string, dto: UpdateClientDto, adminUserId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client introuvable.');

    if (dto.telephone && dto.telephone !== client.telephone) {
      const conflit = await this.prisma.client.findUnique({ where: { telephone: dto.telephone } });
      if (conflit) throw new ConflictException('Un autre client utilise déjà ce numéro de téléphone.');
    }

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: { ...dto, dateNaissance: dto.dateNaissance ? new Date(dto.dateNaissance) : undefined },
    });
    await this.audit.log({ userId: adminUserId, action: 'CLIENT_UPDATED', cible: clientId, details: dto as any });
    return updated;
  }

  /** Suppression refusée si le client a un historique : il ferait disparaître des rendez-vous. */
  async deleteClient(clientId: string, adminUserId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { _count: { select: { rendezVous: true } } },
    });
    if (!client) throw new NotFoundException('Client introuvable.');
    if (client._count.rendezVous > 0) {
      throw new BadRequestException(
        `Ce client a ${client._count.rendezVous} rendez-vous : sa fiche ne peut pas être supprimée sans perdre l'historique.`,
      );
    }

    await this.prisma.client.delete({ where: { id: clientId } });
    await this.audit.log({
      userId: adminUserId,
      action: 'CLIENT_DELETED',
      cible: clientId,
      details: { nom: client.nom, prenom: client.prenom, telephone: client.telephone },
    });
    return { message: 'Fiche client supprimée.' };
  }

  // ==========================================================================
  // RENDEZ-VOUS (vue globale)
  // ==========================================================================
  async listRendezVous(filters: {
    statut?: string;
    professionnelId?: string;
    serviceId?: string;
    from?: string;
    to?: string;
    search?: string;
    take?: number;
    skip?: number;
  } = {}) {
    const take = Math.min(Number(filters.take) || 100, 500);
    const skip = Number(filters.skip) || 0;
    const search = filters.search?.trim();

    const where: Prisma.RendezVousWhereInput = {
      statut: filters.statut ? (filters.statut as any) : undefined,
      professionnelId: filters.professionnelId || undefined,
      serviceId: filters.serviceId || undefined,
      ...(filters.from || filters.to
        ? {
            dateDebut: {
              gte: filters.from ? new Date(filters.from) : undefined,
              lte: filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined,
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { client: { nom: { contains: search, mode: 'insensitive' } } },
              { client: { prenom: { contains: search, mode: 'insensitive' } } },
              { client: { telephone: { contains: search } } },
              { service: { nom: { contains: search, mode: 'insensitive' } } },
              { professionnel: { nom: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.rendezVous.count({ where }),
      this.prisma.rendezVous.findMany({
        where,
        include: {
          client: true,
          service: { select: { id: true, nom: true, dureeMinutes: true, prix: true } },
          professionnel: { select: { id: true, nom: true } },
        },
        orderBy: { dateDebut: 'desc' },
        take,
        skip,
      }),
    ]);

    return { total, take, skip, items };
  }

  getRendezVous(id: string) {
    return this.appointments.findOne(id);
  }

  /** Annulation administrative d'un rendez-vous (notifie le pro et son équipe). */
  annulerRendezVous(id: string, motif: string | undefined, adminUserId: string) {
    return this.appointments.updateStatus(id, { statut: 'ANNULE', motif } as any, adminUserId);
  }

  /**
   * Déplacement administratif : passe par `AppointmentsService.reschedule`, qui
   * revérifie la disponibilité du créneau et prévient le professionnel.
   */
  deplacerRendezVous(id: string, dateDebut: string, adminUserId: string) {
    return this.appointments.reschedule(id, { dateDebut } as any, adminUserId);
  }

  // ==========================================================================
  // SERVICES (vue globale + activation/désactivation)
  // ==========================================================================
  async listServices(filters: { search?: string; professionnelId?: string; actif?: string; statut?: string } = {}) {
    const search = filters.search?.trim();
    const services = await this.prisma.service.findMany({
      where: {
        professionnelId: filters.professionnelId || undefined,
        actif: filters.actif === undefined || filters.actif === '' ? undefined : filters.actif === 'true',
        statut: filters.statut ? (filters.statut as any) : undefined,
        ...(search
          ? {
              OR: [
                { nom: { contains: search, mode: 'insensitive' } },
                { professionnel: { nom: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        professionnel: { select: { id: true, nom: true } },
        _count: { select: { rendezVous: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services.map((s) => ({
      id: s.id,
      nom: s.nom,
      description: s.description,
      dureeMinutes: s.dureeMinutes,
      prix: s.prix,
      // `actif` = publié ou non ; `statut` = disponibilité affichée au client.
      actif: s.actif,
      statut: s.statut,
      createdAt: s.createdAt,
      professionnelId: s.professionnelId,
      professionnel: s.professionnel.nom,
      nbRdv: s._count.rendezVous,
    }));
  }

  async setServiceActif(serviceId: string, actif: boolean, adminUserId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId }, include: { professionnel: true } });
    if (!service) throw new NotFoundException('Service introuvable.');

    const updated = await this.prisma.service.update({ where: { id: serviceId }, data: { actif } });
    await this.notifications.create(
      service.professionnel.userId,
      'MODIFICATION',
      `Le service « ${service.nom} » a été ${actif ? 'activé' : 'désactivé'} par l'administrateur.`,
      adminUserId,
    );
    await this.audit.log({
      userId: adminUserId,
      action: 'SERVICE_STATUS_CHANGED',
      cible: serviceId,
      details: { actif },
      professionnelId: service.professionnelId,
    });
    return updated;
  }

  /**
   * Disponibilité affichée au client (DISPONIBLE / COMPLET / INDISPONIBLE),
   * distincte de `actif` qui décide si le service est publié.
   */
  async setServiceStatut(serviceId: string, statut: 'DISPONIBLE' | 'COMPLET' | 'INDISPONIBLE', adminUserId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId }, include: { professionnel: true } });
    if (!service) throw new NotFoundException('Service introuvable.');

    const updated = await this.prisma.service.update({ where: { id: serviceId }, data: { statut } });
    await this.notifications.create(
      service.professionnel.userId,
      'MODIFICATION',
      `La disponibilité du service « ${service.nom} » a été passée à « ${statut} » par l'administrateur.`,
      adminUserId,
    );
    await this.audit.log({
      userId: adminUserId,
      action: 'SERVICE_DISPONIBILITE_CHANGED',
      cible: serviceId,
      details: { statut },
      professionnelId: service.professionnelId,
    });
    return updated;
  }

  /**
   * Suppression d'un service. Refusée dès qu'un rendez-vous y est rattaché :
   * la cascade Prisma détruirait l'historique. On dépublie à la place.
   */
  async deleteService(serviceId: string, adminUserId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { professionnel: true, _count: { select: { rendezVous: true } } },
    });
    if (!service) throw new NotFoundException('Service introuvable.');
    if (service._count.rendezVous > 0) {
      throw new BadRequestException(
        `${service._count.rendezVous} rendez-vous utilisent ce service : dépubliez-le au lieu de le supprimer.`,
      );
    }

    await this.prisma.service.delete({ where: { id: serviceId } });
    await this.notifications.create(
      service.professionnel.userId,
      'MODIFICATION',
      `Le service « ${service.nom} » a été supprimé par l'administrateur.`,
      adminUserId,
    );
    await this.audit.log({
      userId: adminUserId,
      action: 'SERVICE_DELETED',
      cible: serviceId,
      details: { nom: service.nom },
      professionnelId: service.professionnelId,
    });
    return { message: 'Service supprimé.' };
  }

  // ==========================================================================
  // AGENDAS (consultation seule)
  // ==========================================================================
  async listAgendas() {
    const now = new Date();
    const pros = await this.prisma.professionnel.findMany({
      where: { user: { statutCompte: 'ACTIF' } },
      include: {
        user: { select: { email: true, statutCompte: true } },
        disponibilites: { orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }] },
        indisponibilites: { where: { dateFin: { gte: now } }, orderBy: { dateDebut: 'asc' }, take: 3 },
      },
      orderBy: { nom: 'asc' },
    });

    return Promise.all(
      pros.map(async (pro) => {
        const [aVenir, prochain] = await Promise.all([
          this.prisma.rendezVous.count({
            where: { professionnelId: pro.id, dateDebut: { gte: now }, statut: { in: STATUTS_ACTIFS as any } },
          }),
          this.prisma.rendezVous.findFirst({
            where: { professionnelId: pro.id, dateDebut: { gte: now }, statut: { in: STATUTS_ACTIFS as any } },
            include: { client: true, service: { select: { nom: true } } },
            orderBy: { dateDebut: 'asc' },
          }),
        ]);
        return {
          professionnelId: pro.id,
          nom: pro.nom,
          specialite: pro.specialite,
          email: pro.user.email,
          joursTravailles: [...new Set(pro.disponibilites.map((d) => d.jourSemaine))].sort(),
          disponibilites: pro.disponibilites,
          indisponibilites: pro.indisponibilites,
          nbRdvAVenir: aVenir,
          prochainRdv: prochain
            ? { id: prochain.id, dateDebut: prochain.dateDebut, client: `${prochain.client.prenom} ${prochain.client.nom}`, service: prochain.service.nom }
            : null,
        };
      }),
    );
  }

  /** Agenda détaillé d'un professionnel pour une journée donnée (lecture seule). */
  async getAgenda(professionnelId: string, dateStr?: string) {
    const pro = await this.prisma.professionnel.findUnique({ where: { id: professionnelId } });
    if (!pro) throw new NotFoundException('Professionnel introuvable.');

    const date = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date();
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Date invalide.');
    const debutJour = new Date(date);
    debutJour.setUTCHours(0, 0, 0, 0);
    const finJour = new Date(debutJour);
    finJour.setUTCHours(23, 59, 59, 999);

    // Schéma : 0 = lundi … 6 = dimanche (JS getUTCDay : 0 = dimanche)
    const jourSemaine = (debutJour.getUTCDay() + 6) % 7;

    const [disponibilites, indisponibilites, rendezVous] = await Promise.all([
      this.prisma.disponibilite.findMany({ where: { professionnelId, jourSemaine }, orderBy: { heureDebut: 'asc' } }),
      this.prisma.indisponibilite.findMany({
        where: { professionnelId, dateDebut: { lte: finJour }, dateFin: { gte: debutJour } },
        orderBy: { dateDebut: 'asc' },
      }),
      this.prisma.rendezVous.findMany({
        where: { professionnelId, dateDebut: { gte: debutJour, lte: finJour } },
        include: { client: true, service: { select: { nom: true, dureeMinutes: true } } },
        orderBy: { dateDebut: 'asc' },
      }),
    ]);

    return {
      professionnel: { id: pro.id, nom: pro.nom, specialite: pro.specialite },
      date: debutJour.toISOString().slice(0, 10),
      jourSemaine,
      disponibilites,
      indisponibilites,
      rendezVous,
    };
  }

  /**
   * Absences et indisponibilités de tous les professionnels, sur une période.
   * Par défaut : ce qui n'est pas encore terminé (`dateFin >= maintenant`).
   */
  async listIndisponibilites(filters: { professionnelId?: string; from?: string; to?: string; type?: string } = {}) {
    const from = filters.from ? new Date(filters.from) : undefined;
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined;

    const where: Prisma.IndisponibiliteWhereInput = {
      professionnelId: filters.professionnelId || undefined,
      type: filters.type ? (filters.type as any) : undefined,
      // Chevauchement avec la période demandée, pas simple inclusion : une absence
      // longue commencée avant `from` concerne bien la période.
      ...(from || to
        ? { dateDebut: to ? { lte: to } : undefined, dateFin: from ? { gte: from } : undefined }
        : { dateFin: { gte: new Date() } }),
    };

    const items = await this.prisma.indisponibilite.findMany({
      where,
      include: { professionnel: { select: { id: true, nom: true, specialite: true } } },
      orderBy: { dateDebut: 'asc' },
      take: 300,
    });

    return items.map((i) => ({
      id: i.id,
      professionnelId: i.professionnelId,
      professionnel: i.professionnel.nom,
      specialite: i.professionnel.specialite,
      type: i.type,
      dateDebut: i.dateDebut,
      dateFin: i.dateFin,
      motif: i.motif,
      clientsNotifies: i.clientsNotifies,
      createdAt: i.createdAt,
    }));
  }

  // ==========================================================================
  // PARAMÈTRES GÉNÉRAUX DE LA PLATEFORME
  // ==========================================================================
  async getParams() {
    const config = await this.prisma.systemConfig.findFirst();
    if (!config) throw new NotFoundException('Configuration système introuvable.');
    return config;
  }

  async updateParams(data: UpdateParamsDto, adminUserId: string) {
    const config = await this.prisma.systemConfig.findFirst();
    if (!config) throw new BadRequestException('Configuration système introuvable.');
    const updated = await this.prisma.systemConfig.update({ where: { id: config.id }, data });
    await this.audit.log({ userId: adminUserId, action: 'PLATFORM_PARAMS_UPDATED', details: data as any });
    return updated;
  }

  // ==========================================================================
  // STATISTIQUES GLOBALES
  // ==========================================================================
  async statsGlobales() {
    const now = new Date();
    const debutJour = new Date(now);
    debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date(debutJour);
    finJour.setDate(finJour.getDate() + 1);
    const debutSemaine = new Date(debutJour);
    debutSemaine.setDate(debutSemaine.getDate() - ((debutJour.getDay() + 6) % 7));

    const [
      nbPros, proActifs, proAttente, proRefuses, proDesactives,
      nbRec, recActifs, recAttente,
      nbClients, nbServices, servicesActifs,
      nbRdv, rdvTermines, rdvAnnules, rdvAujourdhui, rdvSemaine, rdvAVenir,
    ] = await this.prisma.$transaction([
      this.prisma.professionnel.count(),
      this.prisma.user.count({ where: { role: 'PROFESSIONNEL', statutCompte: 'ACTIF' } }),
      this.prisma.user.count({ where: { role: 'PROFESSIONNEL', statutCompte: 'EN_ATTENTE' } }),
      this.prisma.user.count({ where: { role: 'PROFESSIONNEL', statutCompte: 'REFUSE' } }),
      this.prisma.user.count({ where: { role: 'PROFESSIONNEL', statutCompte: 'DESACTIVE' } }),
      this.prisma.receptionniste.count(),
      this.prisma.user.count({ where: { role: 'RECEPTIONNISTE', statutCompte: 'ACTIF' } }),
      this.prisma.user.count({ where: { role: 'RECEPTIONNISTE', statutCompte: 'EN_ATTENTE' } }),
      this.prisma.client.count(),
      this.prisma.service.count(),
      this.prisma.service.count({ where: { actif: true } }),
      this.prisma.rendezVous.count(),
      this.prisma.rendezVous.count({ where: { statut: 'TERMINE' } }),
      this.prisma.rendezVous.count({ where: { statut: 'ANNULE' } }),
      this.prisma.rendezVous.count({ where: { dateDebut: { gte: debutJour, lt: finJour } } }),
      this.prisma.rendezVous.count({ where: { dateDebut: { gte: debutSemaine } } }),
      this.prisma.rendezVous.count({ where: { dateDebut: { gte: now }, statut: { in: STATUTS_ACTIFS as any } } }),
    ]);

    const absencesEnCours = await this.prisma.indisponibilite.count({ where: { dateFin: { gte: now } } });

    const [parStatut, topServicesRaw, topProsRaw] = await Promise.all([
      this.prisma.rendezVous.groupBy({ by: ['statut'], _count: { _all: true } }),
      this.prisma.rendezVous.groupBy({
        by: ['serviceId'],
        where: { statut: { not: 'ANNULE' } },
        _count: { _all: true },
        orderBy: { _count: { serviceId: 'desc' } },
        take: 5,
      }),
      this.prisma.rendezVous.groupBy({
        by: ['professionnelId'],
        where: { statut: { not: 'ANNULE' } },
        _count: { _all: true },
        orderBy: { _count: { professionnelId: 'desc' } },
        take: 5,
      }),
    ]);

    const [services, pros] = await Promise.all([
      this.prisma.service.findMany({ where: { id: { in: topServicesRaw.map((s) => s.serviceId) } }, select: { id: true, nom: true } }),
      this.prisma.professionnel.findMany({ where: { id: { in: topProsRaw.map((p) => p.professionnelId) } }, select: { id: true, nom: true } }),
    ]);

    const evolution = await this.prisma.$queryRaw<{ mois: Date; total: number }[]>`
      SELECT date_trunc('month', "dateDebut") AS mois, COUNT(*)::int AS total
      FROM "RendezVous"
      WHERE "dateDebut" >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY 1
      ORDER BY 1 ASC`;

    return {
      // Comptes
      nbPros, proActifs, proAttente, proRefuses, proDesactives,
      nbRec, recActifs, recAttente,
      nbClients, nbServices, servicesActifs,
      // Absences en cours ou à venir
      absencesEnCours,
      // Rendez-vous
      nbRdv, rdvTermines, rdvAnnules, rdvAujourdhui, rdvSemaine, rdvAVenir,
      tauxAnnulation: nbRdv ? Math.round((rdvAnnules / nbRdv) * 1000) / 10 : 0,
      rdvParStatut: Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all])),
      topServices: topServicesRaw.map((s) => ({
        id: s.serviceId,
        nom: services.find((x) => x.id === s.serviceId)?.nom ?? 'Service supprimé',
        total: s._count._all,
      })),
      topProfessionnels: topProsRaw.map((p) => ({
        id: p.professionnelId,
        nom: pros.find((x) => x.id === p.professionnelId)?.nom ?? 'Professionnel supprimé',
        total: p._count._all,
      })),
      evolution: evolution.map((e) => ({ mois: e.mois, total: Number(e.total) })),
    };
  }

  // ==========================================================================
  // JOURNAL D'AUDIT
  // ==========================================================================
  async auditLog(
    filters: { action?: string; userId?: string; professionnelId?: string; from?: string; to?: string; take?: number; skip?: number } = {},
  ) {
    const take = Math.min(Number(filters.take) || 50, 500);
    const skip = Number(filters.skip) || 0;

    const where: Prisma.AuditLogWhereInput = {
      action: filters.action || undefined,
      userId: filters.userId || undefined,
      professionnelId: filters.professionnelId || undefined,
      ...(filters.from || filters.to
        ? {
            createdAt: {
              gte: filters.from ? new Date(filters.from) : undefined,
              lte: filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined,
            },
          }
        : {}),
    };

    const [total, items, actions] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.auditLog.groupBy({ by: ['action'], _count: { _all: true }, orderBy: { action: 'asc' } }),
    ]);

    return { total, take, skip, items, actions: actions.map((a) => a.action).sort() };
  }

  // ==========================================================================
  // EXPORTS CSV
  // ==========================================================================
  /**
   * `filters` reprend les paramètres de requête de la page appelante : l'export
   * porte donc sur ce que l'Admin voit à l'écran, pas sur la table entière.
   */
  async exportCsv(entity: string, filters: Record<string, string> = {}): Promise<{ filename: string; csv: string }> {
    switch (entity) {
      case 'professionnels': {
        const rows = await this.listProfessionnels({ statut: filters.statut, search: filters.search });
        return {
          filename: 'professionnels.csv',
          csv: this.toCsv(rows, [
            ['nom', 'Nom'], ['email', 'E-mail'], ['telephone', 'Téléphone'], ['specialite', 'Spécialité'],
            ['statutCompte', 'Statut'], ['nbServices', 'Services'], ['nbRdv', 'Rendez-vous'],
            ['nbClients', 'Clients'], ['createdAt', 'Créé le'], ['lastLoginAt', 'Dernière connexion'],
          ]),
        };
      }
      case 'receptionnistes': {
        const rows = (await this.listReceptionnistes({ statut: filters.statut, search: filters.search })).map((r) => ({
          ...r,
          professionnels: r.professionnels.map((p) => p.nom).join(' | '),
        }));
        return {
          filename: 'receptionnistes.csv',
          csv: this.toCsv(rows, [
            ['nom', 'Nom'], ['email', 'E-mail'], ['telephone', 'Téléphone'], ['statutCompte', 'Statut'],
            ['professionnels', 'Professionnels affectés'], ['createdAt', 'Créé le'],
          ]),
        };
      }
      case 'clients': {
        const rows = await this.listClients({ search: filters.search });
        return {
          filename: 'clients.csv',
          csv: this.toCsv(rows, [
            ['nom', 'Nom'], ['prenom', 'Prénom'], ['telephone', 'Téléphone'], ['email', 'E-mail'],
            ['professionnel', 'Professionnel'], ['nbRdv', 'Rendez-vous'], ['dernierRdv', 'Dernier RDV'], ['createdAt', 'Créé le'],
          ]),
        };
      }
      case 'rendez-vous': {
        const { items } = await this.listRendezVous({
          statut: filters.statut, professionnelId: filters.professionnelId, serviceId: filters.serviceId,
          from: filters.from, to: filters.to, search: filters.search, take: 500, skip: 0,
        });
        const rows = items.map((r) => ({
          client: `${r.client.prenom} ${r.client.nom}`,
          telephone: r.client.telephone,
          professionnel: r.professionnel.nom,
          service: r.service.nom,
          dateDebut: r.dateDebut,
          dateFin: r.dateFin,
          statut: r.statut,
          origine: r.origine,
          motifAnnulation: r.motifAnnulation,
        }));
        return {
          filename: 'rendez-vous.csv',
          csv: this.toCsv(rows, [
            ['client', 'Client'], ['telephone', 'Téléphone'], ['professionnel', 'Professionnel'], ['service', 'Service'],
            ['dateDebut', 'Début'], ['dateFin', 'Fin'], ['statut', 'Statut'], ['origine', 'Origine'], ['motifAnnulation', "Motif d'annulation"],
          ]),
        };
      }
      case 'services': {
        const rows = await this.listServices({
          search: filters.search, professionnelId: filters.professionnelId, actif: filters.actif, statut: filters.statut,
        });
        return {
          filename: 'services.csv',
          csv: this.toCsv(rows, [
            ['nom', 'Service'], ['professionnel', 'Professionnel'], ['dureeMinutes', 'Durée (min)'],
            ['prix', 'Prix'], ['actif', 'Publié'], ['statut', 'Disponibilité'], ['nbRdv', 'Rendez-vous'], ['createdAt', 'Créé le'],
          ]),
        };
      }
      case 'audit': {
        const { items } = await this.auditLog({
          action: filters.action, userId: filters.userId, professionnelId: filters.professionnelId,
          from: filters.from, to: filters.to, take: 500, skip: 0,
        });
        const rows = items.map((a) => ({
          createdAt: a.createdAt,
          action: a.action,
          utilisateur: a.user?.email ?? '—',
          cible: a.cible,
          details: a.details ? JSON.stringify(a.details) : '',
        }));
        return {
          filename: 'journal-audit.csv',
          csv: this.toCsv(rows, [
            ['createdAt', 'Date'], ['action', 'Action'], ['utilisateur', 'Utilisateur'], ['cible', 'Cible'], ['details', 'Détails'],
          ]),
        };
      }
      case 'indisponibilites': {
        const rows = await this.listIndisponibilites({
          professionnelId: filters.professionnelId, from: filters.from, to: filters.to, type: filters.type,
        });
        return {
          filename: 'absences.csv',
          csv: this.toCsv(rows, [
            ['professionnel', 'Professionnel'], ['type', 'Type'], ['dateDebut', 'Début'], ['dateFin', 'Fin'],
            ['motif', 'Motif'], ['clientsNotifies', 'Clients notifiés'], ['createdAt', 'Créée le'],
          ]),
        };
      }
      default:
        throw new BadRequestException(
          'Export inconnu. Valeurs acceptées : professionnels, receptionnistes, clients, rendez-vous, services, ' +
            'indisponibilites, audit.',
        );
    }
  }

  // ==========================================================================
  // Helpers privés
  // ==========================================================================
  private mapProfessionnel(user: any, clientsParPro: Map<string, number>) {
    const pro = user.professionnel;
    return {
      id: pro.id,
      userId: user.id,
      nom: pro.nom,
      email: user.email,
      telephone: pro.telephone,
      specialite: pro.specialite,
      photoUrl: pro.photoUrl,
      statutCompte: user.statutCompte,
      emailVerifie: user.emailVerifie,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      nbServices: pro._count?.services ?? 0,
      nbRdv: pro._count?.rendezVous ?? 0,
      nbReceptionnistes: pro._count?.affectations ?? 0,
      nbClients: clientsParPro.get(pro.id) ?? 0,
    };
  }

  private mapReceptionniste(user: any) {
    const rec = user.receptionniste;
    return {
      id: rec.id,
      userId: user.id,
      nom: rec.nom,
      email: user.email,
      telephone: rec.telephone,
      statutCompte: user.statutCompte,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      professionnelIds: rec.affectations.map((a: any) => a.professionnelId),
      professionnels: rec.affectations.map((a: any) => ({
        affectationId: a.id,
        professionnelId: a.professionnelId,
        nom: a.professionnel?.nom ?? '—',
        // Activation sur l'espace du professionnel (CDC II.13.1) : lecture seule ici.
        actifSurEspace: a.actif,
        permissions: {
          peutConsulterAgenda: a.peutConsulterAgenda,
          peutGererRdv: a.peutGererRdv,
          peutGererPlanning: a.peutGererPlanning,
          peutGererParametres: a.peutGererParametres,
        },
      })),
    };
  }


  private async nbClientsParProfessionnel() {
    const pairs = await this.prisma.rendezVous.findMany({
      distinct: ['professionnelId', 'clientId'],
      select: { professionnelId: true, clientId: true },
    });
    const map = new Map<string, number>();
    for (const p of pairs) map.set(p.professionnelId, (map.get(p.professionnelId) ?? 0) + 1);
    return map;
  }

  private toCsv(rows: any[], columns: [string, string][]): string {
    const escape = (value: any) => {
      if (value === null || value === undefined) return '';
      const str = value instanceof Date ? value.toISOString() : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };
    const header = columns.map(([, label]) => escape(label)).join(';');
    const lines = rows.map((row) => columns.map(([key]) => escape(row[key])).join(';'));
    // BOM UTF-8 : Excel ouvre correctement les accents.
    return `﻿${[header, ...lines].join('\r\n')}\r\n`;
  }
}
