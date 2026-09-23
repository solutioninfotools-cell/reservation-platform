import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { ClientsService } from '../clients/clients.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateDisponibiliteDto, CreateIndisponibiliteDto, UpdateDisponibiliteDto } from './dto/disponibilite.dto';
import { UpdatePermissionsDto } from './dto/affectation.dto';
import { CreateChampDto, TYPES_AVEC_OPTIONS, UpdateChampDto } from './dto/champ.dto';
import { NoteClientDto, UpdateClientDto } from './dto/client.dto';
import { UpdateParametresDto } from './dto/parametres.dto';
import { CreateRdvDto } from '../appointments/dto/create-rdv.dto';

/** Champs du profil dont le CDC II.4 exige la saisie avant certaines fonctionnalités. */
const CHAMPS_PROFIL_REQUIS = ['nom', 'description', 'adresse', 'telephone'] as const;

@Injectable()
export class ProfessionnelService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private email: EmailService,
    private clients: ClientsService,
    private appointments: AppointmentsService,
  ) {}

  async findByUserId(userId: string) {
    const pro = await this.prisma.professionnel.findUnique({ where: { userId } });
    if (!pro) throw new NotFoundException('Profil professionnel introuvable.');
    return pro;
  }

  // ---------------- Profil ----------------

  /** Complétude du profil (CDC II.4), consommée par la bannière de l'espace. */
  private completude(pro: any) {
    const manquants = CHAMPS_PROFIL_REQUIS.filter((c) => !pro[c] || String(pro[c]).trim() === '');
    return { complet: manquants.length === 0, champsManquants: manquants };
  }

  async moi(userId: string) {
    const pro = await this.prisma.professionnel.findUnique({
      where: { userId },
      include: { user: { select: { email: true, role: true, statutCompte: true, lastLoginAt: true } } },
    });
    if (!pro) throw new NotFoundException('Profil professionnel introuvable.');

    // Le bouton « Espace Administrateur » du CDC II.2 n'est proposé qu'au
    // superviseur en mode Prestataire.
    const config = await this.prisma.systemConfig.findFirst();
    return { ...pro, profil: this.completude(pro), modeSupervision: config?.modeSupervision ?? null };
  }

  async updateProfil(userId: string, data: Partial<{ nom: string; specialite: string; description: string; adresse: string; telephone: string; photoUrl: string }>) {
    const pro = await this.findByUserId(userId);
    // `@Body() any` : on filtre explicitement, sinon une clé inconnue atteint Prisma.
    const autorises = ['nom', 'specialite', 'description', 'adresse', 'telephone', 'photoUrl'];
    const propre = Object.fromEntries(Object.entries(data ?? {}).filter(([k]) => autorises.includes(k)));
    const updated = await this.prisma.professionnel.update({ where: { id: pro.id }, data: propre });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'PROFIL_UPDATED', cible: pro.id, details: propre });
    return { ...updated, profil: this.completude(updated) };
  }

  // ---------------- Services ----------------
  async listServices(professionnelId: string) {
    return this.prisma.service.findMany({
      where: { professionnelId },
      orderBy: { createdAt: 'asc' },
      include: { champsPersonnalises: { orderBy: { ordre: 'asc' } } },
    });
  }
  async createService(userId: string, dto: CreateServiceDto) {
    const pro = await this.findByUserId(userId);
    const service = await this.prisma.service.create({ data: { ...dto, professionnelId: pro.id } });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'SERVICE_CREATED', cible: service.id, details: { nom: service.nom } });
    return service;
  }
  async updateService(userId: string, serviceId: string, dto: UpdateServiceDto) {
    const pro = await this.findByUserId(userId);
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.professionnelId !== pro.id) throw new NotFoundException('Service introuvable.');
    const updated = await this.prisma.service.update({ where: { id: serviceId }, data: dto });
    await this.audit.log({
      userId,
      professionnelId: pro.id,
      action: dto.actif !== undefined && Object.keys(dto).length === 1 ? 'SERVICE_TOGGLED' : 'SERVICE_UPDATED',
      cible: serviceId,
      details: { nom: updated.nom, ...dto },
    });
    return updated;
  }
  async deleteService(userId: string, serviceId: string) {
    const pro = await this.findByUserId(userId);
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.professionnelId !== pro.id) throw new NotFoundException('Service introuvable.');

    // CDC II.5.4 : « les informations nécessaires à l'historique des anciens
    // rendez-vous sont conservées ». Un service déjà réservé est donc désactivé
    // plutôt que supprimé — sinon la contrainte de clé étrangère lèverait une
    // erreur Prisma brute.
    const rdvLies = await this.prisma.rendezVous.count({ where: { serviceId } });
    if (rdvLies > 0) {
      const desactive = await this.prisma.service.update({ where: { id: serviceId }, data: { actif: false } });
      await this.audit.log({
        userId, professionnelId: pro.id, action: 'SERVICE_ARCHIVED', cible: serviceId,
        details: { nom: service.nom, rdvLies },
      });
      return {
        message: `Ce service est lié à ${rdvLies} rendez-vous : il a été désactivé afin de préserver l'historique.`,
        archive: true,
        service: desactive,
      };
    }

    await this.prisma.service.delete({ where: { id: serviceId } });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'SERVICE_DELETED', cible: serviceId, details: { nom: service.nom } });
    return { message: 'Service supprimé.', archive: false };
  }

  // ---------------- Champs personnalisés (CDC II.6) ----------------
  async listChamps(professionnelId: string, serviceId?: string) {
    return this.prisma.champPersonnalise.findMany({
      where: { professionnelId, ...(serviceId ? { serviceId } : {}) },
      orderBy: [{ serviceId: 'asc' }, { ordre: 'asc' }],
    });
  }

  /** Un champ à options doit en proposer au moins une, sinon le client ne peut rien choisir. */
  private assertChampCoherent(dto: CreateChampDto | UpdateChampDto) {
    if (dto.type && TYPES_AVEC_OPTIONS.includes(dto.type) && !(dto.options?.length)) {
      throw new BadRequestException(`Le type ${dto.type} exige au moins une option.`);
    }
  }

  private async assertServiceAuPro(serviceId: string | undefined, professionnelId: string) {
    if (!serviceId) return;
    const s = await this.prisma.service.findUnique({ where: { id: serviceId }, select: { professionnelId: true } });
    if (!s || s.professionnelId !== professionnelId) throw new NotFoundException('Service introuvable.');
  }

  async createChamp(userId: string, dto: CreateChampDto) {
    const pro = await this.findByUserId(userId);
    this.assertChampCoherent(dto);
    await this.assertServiceAuPro(dto.serviceId, pro.id);
    const champ = await this.prisma.champPersonnalise.create({
      data: {
        professionnelId: pro.id,
        serviceId: dto.serviceId ?? null,
        label: dto.label,
        type: dto.type as any,
        options: dto.options ?? [],
        obligatoire: dto.obligatoire ?? false,
        ordre: dto.ordre ?? 0,
        valeurParDefaut: dto.valeurParDefaut ?? null,
        texteAide: dto.texteAide ?? null,
        conditions: (dto.conditions ?? []) as any,
        conditionLogique: dto.conditionLogique ?? 'ET',
        requisSiCondition: dto.requisSiCondition ?? false,
      },
    });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'CHAMP_CREATED', cible: champ.id, details: { label: champ.label, type: champ.type } });
    return champ;
  }

  async updateChamp(userId: string, champId: string, dto: UpdateChampDto) {
    const pro = await this.findByUserId(userId);
    const existant = await this.prisma.champPersonnalise.findUnique({ where: { id: champId } });
    if (!existant || existant.professionnelId !== pro.id) throw new NotFoundException('Champ introuvable.');
    this.assertChampCoherent({ ...existant, ...dto } as any);
    await this.assertServiceAuPro(dto.serviceId, pro.id);

    const champ = await this.prisma.champPersonnalise.update({
      where: { id: champId },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.type !== undefined ? { type: dto.type as any } : {}),
        ...(dto.serviceId !== undefined ? { serviceId: dto.serviceId } : {}),
        ...(dto.options !== undefined ? { options: dto.options } : {}),
        ...(dto.obligatoire !== undefined ? { obligatoire: dto.obligatoire } : {}),
        ...(dto.ordre !== undefined ? { ordre: dto.ordre } : {}),
        ...(dto.valeurParDefaut !== undefined ? { valeurParDefaut: dto.valeurParDefaut } : {}),
        ...(dto.texteAide !== undefined ? { texteAide: dto.texteAide } : {}),
        ...(dto.conditions !== undefined ? { conditions: dto.conditions as any } : {}),
        ...(dto.conditionLogique !== undefined ? { conditionLogique: dto.conditionLogique } : {}),
        ...(dto.requisSiCondition !== undefined ? { requisSiCondition: dto.requisSiCondition } : {}),
      },
    });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'CHAMP_UPDATED', cible: champId, details: { label: champ.label } });
    return champ;
  }

  async deleteChamp(userId: string, champId: string) {
    const pro = await this.findByUserId(userId);
    const champ = await this.prisma.champPersonnalise.findUnique({ where: { id: champId } });
    if (!champ || champ.professionnelId !== pro.id) throw new NotFoundException('Champ introuvable.');

    // Les autres champs ne doivent pas rester conditionnés à un champ disparu.
    const freres = await this.prisma.champPersonnalise.findMany({
      where: { professionnelId: pro.id, serviceId: champ.serviceId, id: { not: champId } },
    });
    for (const f of freres) {
      const conds = Array.isArray(f.conditions) ? (f.conditions as any[]) : [];
      const restantes = conds.filter((c) => c?.champId !== champId);
      if (restantes.length !== conds.length) {
        await this.prisma.champPersonnalise.update({ where: { id: f.id }, data: { conditions: restantes as any } });
      }
    }

    await this.prisma.champPersonnalise.delete({ where: { id: champId } });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'CHAMP_DELETED', cible: champId, details: { label: champ.label } });
    return { message: 'Champ personnalisé supprimé.' };
  }

  // ---------------- Disponibilités ----------------
  async listDisponibilites(professionnelId: string) {
    return this.prisma.disponibilite.findMany({ where: { professionnelId }, orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }] });
  }
  async addDisponibilite(userId: string, dto: CreateDisponibiliteDto) {
    const pro = await this.findByUserId(userId);
    if (dto.heureFin <= dto.heureDebut) {
      throw new BadRequestException("L'heure de fin doit être postérieure à l'heure de début.");
    }
    const dispo = await this.prisma.disponibilite.create({ data: { ...dto, professionnelId: pro.id } });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'CRENEAU_CREATED', cible: dispo.id, details: dto });
    return dispo;
  }
  async updateDisponibilite(userId: string, id: string, dto: UpdateDisponibiliteDto) {
    const pro = await this.findByUserId(userId);
    const d = await this.prisma.disponibilite.findUnique({ where: { id } });
    if (!d || d.professionnelId !== pro.id) throw new NotFoundException('Disponibilité introuvable.');
    const debut = dto.heureDebut ?? d.heureDebut;
    const fin = dto.heureFin ?? d.heureFin;
    if (fin <= debut) throw new BadRequestException("L'heure de fin doit être postérieure à l'heure de début.");
    const updated = await this.prisma.disponibilite.update({ where: { id }, data: dto });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'CRENEAU_UPDATED', cible: id, details: dto });
    return updated;
  }
  async removeDisponibilite(userId: string, id: string) {
    const pro = await this.findByUserId(userId);
    const d = await this.prisma.disponibilite.findUnique({ where: { id } });
    if (!d || d.professionnelId !== pro.id) throw new NotFoundException('Disponibilité introuvable.');
    await this.prisma.disponibilite.delete({ where: { id } });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'CRENEAU_DELETED', cible: id, details: { jourSemaine: d.jourSemaine, heureDebut: d.heureDebut, heureFin: d.heureFin } });
    return { message: 'Disponibilité supprimée.' };
  }

  // ---------------- Indisponibilités ----------------
  async listIndisponibilites(professionnelId: string) {
    return this.prisma.indisponibilite.findMany({ where: { professionnelId }, orderBy: { dateDebut: 'desc' } });
  }
  async addIndisponibilite(userId: string, dto: CreateIndisponibiliteDto) {
    const pro = await this.findByUserId(userId);
    const dateDebut = new Date(dto.dateDebut);
    const dateFin = new Date(dto.dateFin);
    if (dateFin < dateDebut) throw new BadRequestException('La date de fin précède la date de début.');

    // Une période « journée » ou « période » doit couvrir les journées entières,
    // sinon un RDV de l'après-midi échappe au blocage.
    if (dto.type !== 'CRENEAU') {
      dateDebut.setHours(0, 0, 0, 0);
      dateFin.setHours(23, 59, 59, 999);
    }

    const indispo = await this.prisma.indisponibilite.create({
      data: { professionnelId: pro.id, type: dto.type, dateDebut, dateFin, motif: dto.motif },
    });

    // Annule automatiquement les RDV réservés qui tombent dans la période fermée.
    const impactes = await this.prisma.rendezVous.findMany({
      where: { professionnelId: pro.id, statut: 'RESERVE', dateDebut: { gte: dateDebut, lte: dateFin } },
      include: { client: true, service: true },
    });
    if (impactes.length) {
      const motif = dto.motif || 'Fermeture de la période par le professionnel';
      await this.prisma.$transaction([
        this.prisma.rendezVous.updateMany({
          where: { id: { in: impactes.map((r) => r.id) } },
          data: { statut: 'ANNULE', motifAnnulation: motif },
        }),
        ...impactes.map((r) =>
          this.prisma.historiqueStatut.create({
            data: { rendezVousId: r.id, ancienStatut: 'RESERVE', nouveauStatut: 'ANNULE', changedBy: userId },
          }),
        ),
      ]);
      await this.audit.log({
        userId, professionnelId: pro.id, action: 'RDV_AUTO_CANCELLED_INDISPO', cible: indispo.id,
        details: { count: impactes.length, motif },
      });
    }
    await this.audit.log({
      userId, professionnelId: pro.id, action: 'INDISPO_CREATED', cible: indispo.id,
      details: { type: dto.type, dateDebut, dateFin, motif: dto.motif },
    });

    return { indisponibilite: indispo, rendezVousAnnules: impactes.length };
  }

  /** CDC II.15 : « Réouvrir une période ». */
  async removeIndisponibilite(userId: string, id: string) {
    const pro = await this.findByUserId(userId);
    const i = await this.prisma.indisponibilite.findUnique({ where: { id } });
    if (!i || i.professionnelId !== pro.id) throw new NotFoundException('Indisponibilité introuvable.');
    await this.prisma.indisponibilite.delete({ where: { id } });
    await this.audit.log({
      userId, professionnelId: pro.id, action: 'INDISPO_DELETED', cible: id,
      details: { dateDebut: i.dateDebut, dateFin: i.dateFin, motif: i.motif },
    });
    // Les rendez-vous déjà annulés ne sont pas rétablis : le créneau redevient
    // simplement réservable.
    return { message: 'Période rouverte à la réservation.' };
  }

  /**
   * CDC II.15 : bouton « Notifier les clients ». Envoie un e-mail avec le motif
   * à chaque client dont le rendez-vous a été annulé par cette fermeture.
   */
  async notifierIndisponibilite(userId: string, id: string) {
    const pro = await this.findByUserId(userId);
    const i = await this.prisma.indisponibilite.findUnique({ where: { id } });
    if (!i || i.professionnelId !== pro.id) throw new NotFoundException('Indisponibilité introuvable.');

    const annules = await this.prisma.rendezVous.findMany({
      where: {
        professionnelId: pro.id,
        statut: 'ANNULE',
        dateDebut: { gte: i.dateDebut, lte: i.dateFin },
      },
      include: { client: true, service: true },
    });

    const motif = i.motif || 'Indisponibilité du professionnel';
    let envoyes = 0;
    for (const r of annules) {
      if (!r.client.email) continue;
      await this.email.send(
        r.client.email,
        `Annulation de votre rendez-vous du ${r.dateDebut.toLocaleDateString('fr-FR')}`,
        `Bonjour ${r.client.prenom},\n\nVotre rendez-vous « ${r.service.nom} » du ` +
          `${r.dateDebut.toLocaleString('fr-FR')} avec ${pro.nom} a dû être annulé.\n` +
          `Motif : ${motif}.\n\nNous vous invitons à reprendre rendez-vous.`,
      );
      envoyes++;
    }

    await this.prisma.indisponibilite.update({ where: { id }, data: { clientsNotifies: true } });
    await this.audit.log({
      userId, professionnelId: pro.id, action: 'INDISPO_CLIENTS_NOTIFIED', cible: id,
      details: { concernes: annules.length, envoyes },
    });
    return { message: `${envoyes} client(s) notifié(s).`, concernes: annules.length, envoyes };
  }

  // ---------------- Réceptionnistes affectées + permissions ----------------
  async listReceptionnistes(professionnelId: string) {
    const rows = await this.prisma.affectation.findMany({
      where: { professionnelId },
      include: {
        receptionniste: {
          include: { user: { select: { id: true, email: true, statutCompte: true, lastLoginAt: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    // `passwordHash` était exposé ici via `include: { user: true }`.
    return rows;
  }

  /** Résout une affectation en garantissant qu'elle appartient bien au professionnel connecté. */
  private async affectationDuPro(userId: string, affectationId: string) {
    const pro = await this.findByUserId(userId);
    const affectation = await this.prisma.affectation.findUnique({
      where: { id: affectationId },
      include: { receptionniste: true },
    });
    if (!affectation || affectation.professionnelId !== pro.id) {
      throw new ForbiddenException('Affectation introuvable pour ce professionnel.');
    }
    return { pro, affectation };
  }

  async updatePermissions(userId: string, affectationId: string, dto: UpdatePermissionsDto) {
    const { pro, affectation } = await this.affectationDuPro(userId, affectationId);
    const updated = await this.prisma.affectation.update({ where: { id: affectationId }, data: dto });
    await this.audit.log({
      userId, professionnelId: pro.id, action: 'PERMISSIONS_UPDATED', cible: affectationId,
      details: { receptionniste: affectation.receptionniste.nom, ...dto },
    });
    // Type prévu par le CDC II.16, jamais émis jusqu'ici.
    await this.notifications.create(
      affectation.receptionniste.userId,
      'AUTORISATIONS_MODIFIEES',
      `${pro.nom} a mis à jour vos autorisations.`,
    );
    return updated;
  }

  /** CDC II.13.1 : activer / désactiver une réceptionniste sur CET espace. */
  async setAffectationActive(userId: string, affectationId: string, actif: boolean) {
    const { pro, affectation } = await this.affectationDuPro(userId, affectationId);
    const updated = await this.prisma.affectation.update({ where: { id: affectationId }, data: { actif } });
    await this.audit.log({
      userId, professionnelId: pro.id, action: actif ? 'RECEPTIONNISTE_ACTIVATED' : 'RECEPTIONNISTE_DEACTIVATED',
      cible: affectationId, details: { receptionniste: affectation.receptionniste.nom },
    });
    await this.notifications.create(
      affectation.receptionniste.userId,
      'AUTORISATIONS_MODIFIEES',
      actif
        ? `${pro.nom} a réactivé votre accès à son espace.`
        : `${pro.nom} a suspendu votre accès à son espace.`,
    );
    return updated;
  }

  /** CDC II.13.1 : retirer une réceptionniste de son espace (l'affectation est supprimée, pas le compte). */
  async retirerReceptionniste(userId: string, affectationId: string) {
    const { pro, affectation } = await this.affectationDuPro(userId, affectationId);
    await this.prisma.affectation.delete({ where: { id: affectationId } });
    await this.audit.log({
      userId, professionnelId: pro.id, action: 'RECEPTIONNISTE_REMOVED', cible: affectationId,
      details: { receptionniste: affectation.receptionniste.nom },
    });
    await this.notifications.create(
      affectation.receptionniste.userId,
      'AFFECTATION',
      `${pro.nom} vous a retirée de son espace.`,
    );
    return { message: 'Réceptionniste retirée de votre espace.' };
  }

  // ---------------- Clients (CDC II.11) ----------------
  async listClients(professionnelId: string, search?: string) {
    const clients = await this.clients.listForProfessionnel(professionnelId, search);
    if (!clients.length) return [];

    const params = await this.prisma.parametresReservation.findUnique({ where: { professionnelId } });
    const seuil = params?.seuilAbsences ?? 2;

    const clientIds = clients.map((c: any) => c.id);
    const absencesGrouped = await this.prisma.rendezVous.groupBy({
      by: ['clientId'],
      where: {
        professionnelId,
        clientId: { in: clientIds },
        statut: 'ABSENT',
      },
      _count: { _all: true },
    });

    const absenceMap = new Map<string, number>();
    for (const g of absencesGrouped) {
      absenceMap.set(g.clientId, g._count._all);
    }

    return clients.map((c: any) => {
      const absences = absenceMap.get(c.id) ?? 0;
      return { ...c, absences, absencesRepetees: absences >= seuil };
    });
  }

  async updateClient(userId: string, clientId: string, dto: UpdateClientDto) {
    const pro = await this.findByUserId(userId);
    // Un professionnel ne modifie que les clients de sa propre activité.
    const lien = await this.prisma.rendezVous.findFirst({ where: { professionnelId: pro.id, clientId }, select: { id: true } });
    if (!lien) throw new NotFoundException("Ce client n'est pas rattaché à votre activité.");

    if (dto.telephone) {
      const doublon = await this.prisma.client.findUnique({ where: { telephone: dto.telephone } });
      if (doublon && doublon.id !== clientId) {
        throw new ConflictException('Un autre client utilise déjà ce numéro de téléphone.');
      }
    }

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        ...(dto.nom !== undefined ? { nom: dto.nom } : {}),
        ...(dto.prenom !== undefined ? { prenom: dto.prenom } : {}),
        ...(dto.telephone !== undefined ? { telephone: dto.telephone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.dateNaissance !== undefined ? { dateNaissance: dto.dateNaissance ? new Date(dto.dateNaissance) : null } : {}),
      },
    });
    await this.audit.log({
      userId, professionnelId: pro.id, action: 'CLIENT_UPDATED', cible: clientId,
      details: { client: `${updated.prenom} ${updated.nom}`, ...dto },
    });
    return updated;
  }

  /** Détection d'un client existant à la création d'un rendez-vous (CDC II.14 / III.6.1). */
  async detecterClient(telephone?: string, nom?: string, prenom?: string, dateNaissance?: string) {
    if (telephone) {
      const parTel = await this.prisma.client.findUnique({ where: { telephone } });
      if (parTel) return parTel;
    }
    if (nom && prenom) {
      return this.prisma.client.findFirst({
        where: {
          nom: { equals: nom, mode: 'insensitive' },
          prenom: { equals: prenom, mode: 'insensitive' },
          ...(dateNaissance ? { dateNaissance: new Date(dateNaissance) } : {}),
        },
      });
    }
    return null;
  }

  // ---------------- Notes internes (CDC II.12) ----------------
  async listNotes(professionnelId: string, clientId: string) {
    return this.prisma.noteClient.findMany({
      where: { professionnelId, clientId },
      orderBy: { createdAt: 'desc' },
    });
  }
  async addNote(userId: string, clientId: string, dto: NoteClientDto) {
    const pro = await this.findByUserId(userId);
    const note = await this.prisma.noteClient.create({
      data: { professionnelId: pro.id, clientId, texte: dto.texte },
    });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'NOTE_CREATED', cible: note.id, details: { clientId } });
    return note;
  }
  async updateNote(userId: string, noteId: string, dto: NoteClientDto) {
    const pro = await this.findByUserId(userId);
    const note = await this.prisma.noteClient.findUnique({ where: { id: noteId } });
    if (!note || note.professionnelId !== pro.id) throw new NotFoundException('Note introuvable.');
    const updated = await this.prisma.noteClient.update({ where: { id: noteId }, data: { texte: dto.texte } });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'NOTE_UPDATED', cible: noteId, details: { clientId: note.clientId } });
    return updated;
  }
  async deleteNote(userId: string, noteId: string) {
    const pro = await this.findByUserId(userId);
    const note = await this.prisma.noteClient.findUnique({ where: { id: noteId } });
    if (!note || note.professionnelId !== pro.id) throw new NotFoundException('Note introuvable.');
    await this.prisma.noteClient.delete({ where: { id: noteId } });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'NOTE_DELETED', cible: noteId, details: { clientId: note.clientId } });
    return { message: 'Note supprimée.' };
  }

  // ---------------- Paramètres de réservation (CDC II.15bis) ----------------
  async getParametres(professionnelId: string) {
    return this.appointments.getParametres(professionnelId);
  }
  async updateParametres(userId: string, dto: UpdateParametresDto) {
    const pro = await this.findByUserId(userId);
    const updated = await this.prisma.parametresReservation.upsert({
      where: { professionnelId: pro.id },
      create: { professionnelId: pro.id, ...dto },
      update: dto,
    });
    await this.audit.log({ userId, professionnelId: pro.id, action: 'PARAMETRES_UPDATED', cible: updated.id, details: dto });
    return updated;
  }

  // ---------------- Historique des actions (CDC II.17) ----------------
  async historique(professionnelId: string, params: { action?: string; take?: number }) {
    return this.audit.listForProfessionnel(professionnelId, params);
  }

  // ---------------- Rendez-vous (CDC II.14) ----------------

  /**
   * Création d'un rendez-vous par le professionnel lui-même.
   * `professionnelId` vient de la session : le corps de la requête ne peut pas
   * viser l'agenda d'un confrère. Toute la logique métier (créneau libre, règles
   * de réservation, déduplication client, notifications) est celle de
   * `AppointmentsService.create()` — aucune duplication.
   */
  async creerRdv(userId: string, dto: Omit<CreateRdvDto, 'professionnelId'>) {
    const pro = await this.findByUserId(userId);
    return this.appointments.create({ ...dto, professionnelId: pro.id } as CreateRdvDto, 'PROFESSIONNEL');
  }

  async creneaux(professionnelId: string, serviceId: string, date: string) {
    return this.appointments.getAvailableSlots(professionnelId, serviceId, date);
  }

  /**
   * Agenda du professionnel. Le `professionnelId` est imposé ici, et
   * `AppointmentsService.list()` revérifie ensuite le périmètre : le filtre ne
   * peut donc jamais désigner un autre professionnel.
   */
  async listRdv(
    professionnelId: string,
    user: { userId: string; role: any },
    filtres: { statut?: string; dateFrom?: string; dateTo?: string; search?: string; serviceId?: string },
  ) {
    return this.appointments.list({ ...filtres, professionnelId });
  }

  // ---------------- Statistiques (CDC II.18) ----------------

  /** Traduit une période nommée en intervalle de dates. `toutes` = pas de borne. */
  private intervalle(periode?: string, du?: string, au?: string): { debut?: Date; fin?: Date } {
    const now = new Date();
    switch (periode) {
      case 'jour': {
        const debut = new Date(now); debut.setHours(0, 0, 0, 0);
        const fin = new Date(now); fin.setHours(23, 59, 59, 999);
        return { debut, fin };
      }
      case 'semaine': {
        const debut = new Date(now);
        debut.setDate(debut.getDate() - ((debut.getDay() + 6) % 7)); // lundi
        debut.setHours(0, 0, 0, 0);
        const fin = new Date(debut); fin.setDate(fin.getDate() + 6); fin.setHours(23, 59, 59, 999);
        return { debut, fin };
      }
      case 'mois': {
        const debut = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { debut, fin };
      }
      case 'annee': {
        return {
          debut: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
          fin: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        };
      }
      case 'personnalisee': {
        const debut = du ? new Date(du) : undefined;
        const fin = au ? new Date(au) : undefined;
        if (fin) fin.setHours(23, 59, 59, 999);
        return { debut, fin };
      }
      default:
        return {};
    }
  }

  async stats(professionnelId: string, periode?: string, du?: string, au?: string) {
    const { debut, fin } = this.intervalle(periode, du, au);
    const filtreDate = debut || fin ? { dateDebut: { gte: debut, lte: fin } } : {};
    const where = { professionnelId, ...filtreDate };

    const [total, termines, annules, absents, clients, servicesActifs] = await this.prisma.$transaction([
      this.prisma.rendezVous.count({ where }),
      this.prisma.rendezVous.count({ where: { ...where, statut: 'TERMINE' } }),
      this.prisma.rendezVous.count({ where: { ...where, statut: 'ANNULE' } }),
      this.prisma.rendezVous.count({ where: { ...where, statut: 'ABSENT' } }),
      this.prisma.rendezVous.findMany({ where, select: { clientId: true }, distinct: ['clientId'] }),
      this.prisma.service.count({ where: { professionnelId, actif: true } }),
    ]);

    // Clients dont le TOUT PREMIER rendez-vous chez ce professionnel tombe dans
    // la période : c'est la définition de « nouveaux clients » du CDC II.18.
    let nouveauxClients = 0;
    if (debut || fin) {
      const premiers = await this.prisma.rendezVous.groupBy({
        by: ['clientId'],
        where: { professionnelId },
        _min: { dateDebut: true },
      });
      nouveauxClients = premiers.filter((p) => {
        const d = p._min.dateDebut;
        if (!d) return false;
        return (!debut || d >= debut) && (!fin || d <= fin);
      }).length;
    } else {
      nouveauxClients = clients.length;
    }

    // Services les plus réservés, avec leur nom (le groupBy seul ne renvoie que l'id).
    const groupes = await this.prisma.rendezVous.groupBy({
      by: ['serviceId'],
      where: { ...where, statut: { not: 'ANNULE' } },
      _count: { _all: true },
    });
    const services = await this.prisma.service.findMany({
      where: { id: { in: groupes.map((g) => g.serviceId) } },
      select: { id: true, nom: true },
    });
    const parService = groupes
      .map((g) => ({
        serviceId: g.serviceId,
        nom: services.find((s) => s.id === g.serviceId)?.nom ?? 'Service supprimé',
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    // Taux d'occupation = minutes réservées / minutes ouvertes sur la période.
    const tauxOccupation = await this.tauxOccupation(professionnelId, debut, fin);

    // Évolution dans le temps — indispensable pour tracer une courbe d'activité.
    const serie = await this.serieTemporelle(professionnelId, debut, fin);

    return {
      periode: periode ?? 'toutes',
      debut: debut ?? null,
      fin: fin ?? null,
      total,
      termines,
      annules,
      absents,
      nbClients: clients.length,
      nouveauxClients,
      servicesActifs,
      parService,
      tauxOccupation,
      serie,
    };
  }

  /**
   * Répartition des rendez-vous dans le temps, pour tracer la courbe d'activité.
   * Le pas s'adapte à l'amplitude : par jour en deçà de ~70 jours, par mois au-delà,
   * afin qu'une année ne produise pas 365 points illisibles.
   */
  private async serieTemporelle(professionnelId: string, debut?: Date, fin?: Date) {
    const finReelle = fin ?? new Date();
    const debutReel = debut ?? new Date(finReelle.getTime() - 29 * 86400000);

    const rdvs = await this.prisma.rendezVous.findMany({
      where: { professionnelId, dateDebut: { gte: debutReel, lte: finReelle } },
      select: { dateDebut: true, statut: true },
      orderBy: { dateDebut: 'asc' },
    });

    const jours = Math.max(1, Math.round((finReelle.getTime() - debutReel.getTime()) / 86400000));
    const parMois = jours > 70;

    const cle = (d: Date) =>
      parMois
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // On sème tous les intervalles, même vides : une courbe ne doit pas sauter les
    // journées sans rendez-vous, sinon elle déforme la lecture du rythme.
    const seaux = new Map<string, { total: number; termines: number }>();
    const curseur = new Date(debutReel);
    curseur.setHours(0, 0, 0, 0);
    if (parMois) curseur.setDate(1);
    while (curseur <= finReelle) {
      seaux.set(cle(curseur), { total: 0, termines: 0 });
      if (parMois) curseur.setMonth(curseur.getMonth() + 1);
      else curseur.setDate(curseur.getDate() + 1);
    }

    for (const r of rdvs) {
      const k = cle(r.dateDebut);
      const seau = seaux.get(k);
      if (!seau) continue;
      seau.total++;
      if (r.statut === 'TERMINE') seau.termines++;
    }

    return {
      pas: parMois ? 'mois' : 'jour',
      points: [...seaux.entries()].map(([date, v]) => ({ date, ...v })),
    };
  }

  /**
   * Part des minutes ouvertes réellement occupées par des rendez-vous non annulés.
   * Sans bornes de période, on retient les 30 derniers jours : un taux calculé
   * « depuis toujours » n'aurait aucun sens.
   */
  private async tauxOccupation(professionnelId: string, debut?: Date, fin?: Date) {
    const finReelle = fin ?? new Date();
    const debutReel = debut ?? new Date(finReelle.getTime() - 30 * 86400000);
    if (finReelle <= debutReel) return 0;

    const dispos = await this.prisma.disponibilite.findMany({ where: { professionnelId } });
    if (!dispos.length) return 0;

    const minutesParJour = new Map<number, number>();
    for (const d of dispos) {
      const [hd, md] = d.heureDebut.split(':').map(Number);
      const [hf, mf] = d.heureFin.split(':').map(Number);
      const duree = Math.max(0, hf * 60 + mf - (hd * 60 + md));
      minutesParJour.set(d.jourSemaine, (minutesParJour.get(d.jourSemaine) ?? 0) + duree);
    }

    let minutesOuvertes = 0;
    const curseur = new Date(debutReel); curseur.setHours(0, 0, 0, 0);
    while (curseur <= finReelle) {
      minutesOuvertes += minutesParJour.get((curseur.getDay() + 6) % 7) ?? 0;
      curseur.setDate(curseur.getDate() + 1);
    }
    if (minutesOuvertes === 0) return 0;

    const rdvs = await this.prisma.rendezVous.findMany({
      where: { professionnelId, statut: { not: 'ANNULE' }, dateDebut: { gte: debutReel, lte: finReelle } },
      select: { dateDebut: true, dateFin: true },
    });
    const minutesReservees = rdvs.reduce((acc, r) => acc + (r.dateFin.getTime() - r.dateDebut.getTime()) / 60000, 0);

    return Math.min(100, Math.round((minutesReservees / minutesOuvertes) * 100));
  }
}