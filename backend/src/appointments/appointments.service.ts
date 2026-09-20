import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../websocket/events.gateway';
import { EmailService } from '../email/email.service';
import { CreateRdvDto } from './dto/create-rdv.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { RescheduleDto } from './dto/reschedule.dto';

/** Identité de l'appelant, telle que fournie par `JwtStrategy.validate`. */
export interface CurrentUserContext {
  userId: string;
  role: 'ADMIN' | 'PROFESSIONNEL' | 'RECEPTIONNISTE';
}

const STATUT_SUIVANT: Record<string, string[]> = {
  RESERVE: ['CLIENT_ARRIVE', 'EN_COURS', 'TERMINE', 'ABSENT', 'ANNULE'],
  CLIENT_ARRIVE: ['EN_COURS', 'TERMINE', 'ANNULE'],
  EN_COURS: ['TERMINE', 'ANNULE'],
  TERMINE: [],
  ABSENT: [],
  ANNULE: [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private clients: ClientsService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private events: EventsGateway,
    private email: EmailService,
  ) {}

  // ============================================================
  // MOTEUR DE DISPONIBILITÉ — le backend est la seule source de vérité
  // (section 14 du CDC). Calcule les créneaux réellement disponibles pour
  // une date donnée en tenant compte : disponibilités hebdo, indisponibilités,
  // et rendez-vous déjà réservés.
  // ============================================================
  async getAvailableSlots(professionnelId: string, serviceId: string, dateStr: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.professionnelId !== professionnelId || !service.actif) {
      throw new NotFoundException('Service introuvable ou inactif.');
    }

    const date = new Date(dateStr + 'T00:00:00');
    const jourSemaine = (date.getDay() + 6) % 7; // 0 = lundi

    // Les règles du professionnel bornent l'horizon de réservation (CDC II.15bis) :
    // un créneau hors délai ne doit même pas être proposé.
    const params = await this.getParametres(professionnelId);
    const ouvertureMin = Date.now() + params.delaiMinHeures * 3600000;
    const ouvertureMax = Date.now() + params.delaiMaxJours * 86400000;

    const dispos = await this.prisma.disponibilite.findMany({ where: { professionnelId, jourSemaine } });
    if (!dispos.length) return { date: dateStr, creneaux: [] };

    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const [indispos, rdvsExistants] = await Promise.all([
      this.prisma.indisponibilite.findMany({
        where: { professionnelId, dateDebut: { lte: dayEnd }, dateFin: { gte: dayStart } },
      }),
      this.prisma.rendezVous.findMany({
        where: { professionnelId, statut: { not: 'ANNULE' }, dateDebut: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    const duree = service.dureeMinutes;
    const creneaux: string[] = [];

    for (const dispo of dispos) {
      const [hDeb, mDeb] = dispo.heureDebut.split(':').map(Number);
      const [hFin, mFin] = dispo.heureFin.split(':').map(Number);
      let cursor = new Date(date); cursor.setHours(hDeb, mDeb, 0, 0);
      const fin = new Date(date); fin.setHours(hFin, mFin, 0, 0);

      while (cursor.getTime() + duree * 60000 <= fin.getTime()) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + duree * 60000);

        const dansIndispo = indispos.some((i) => slotStart < i.dateFin && slotEnd > i.dateDebut);
        // L'intervalle minimum entre deux rendez-vous élargit la zone de conflit.
        const margeMs = params.intervalleMinutes * 60000;
        const chevaucheRdv = rdvsExistants.some(
          (r) => slotStart.getTime() - margeMs < r.dateFin.getTime() && slotEnd.getTime() + margeMs > r.dateDebut.getTime(),
        );
        const horsDelais = slotStart.getTime() < ouvertureMin || slotStart.getTime() > ouvertureMax;

        if (!dansIndispo && !chevaucheRdv && !horsDelais) {
          creneaux.push(slotStart.toISOString());
        }
        cursor = new Date(cursor.getTime() + duree * 60000);
      }
    }

    return { date: dateStr, creneaux };
  }

  // ============================================================
  // CRÉATION D'UN RENDEZ-VOUS — vérifie à nouveau la disponibilité côté
  // backend au moment de la création (jamais confiance dans le frontend),
  // et utilise une transaction + contrainte unique pour empêcher toute
  // double réservation simultanée (section 14 du CDC).
  // ============================================================
  async create(
    dto: CreateRdvDto,
    origine: 'EN_LIGNE' | 'RECEPTIONNISTE' | 'PROFESSIONNEL',
    auteurUserId?: string,
  ) {
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service || service.professionnelId !== dto.professionnelId || !service.actif) {
      throw new BadRequestException('Service invalide.');
    }

    const dateDebut = new Date(dto.dateDebut);
    if (Number.isNaN(dateDebut.getTime())) {
      throw new BadRequestException('Date de rendez-vous invalide.');
    }
    // Règles de réservation propres au professionnel (CDC II.15bis).
    await this.assertReglesReservation(dto, dateDebut, service.dureeMinutes);
    const dateFin = new Date(dateDebut.getTime() + service.dureeMinutes * 60000);

    if (dateDebut.getTime() < Date.now()) {
      throw new BadRequestException('Impossible de réserver un créneau déjà passé.');
    }

    try {
      const rdv = await this.prisma.$transaction(async (tx) => {
        // Re-vérification stricte du chevauchement dans la transaction (verrouillage logique
        // via la contrainte unique @@unique([professionnelId, dateDebut]) + vérification de
        // chevauchement explicite ci-dessous pour les durées variables).
        const conflits = await tx.rendezVous.findMany({
          where: {
            professionnelId: dto.professionnelId,
            statut: { not: 'ANNULE' },
            dateDebut: { lt: dateFin },
            dateFin: { gt: dateDebut },
          },
        });
        if (conflits.length > 0) {
          throw new ConflictException('Ce créneau vient d\'être réservé par quelqu\'un d\'autre. Merci de choisir un autre horaire.');
        }

        const client = await this.clients.findOrCreate(
          { nom: dto.nom, prenom: dto.prenom, telephone: dto.telephone, email: dto.email, dateNaissance: dto.dateNaissance },
          tx,
        );

        const manageToken = cryptoRandom();

        const created = await tx.rendezVous.create({
          data: {
            professionnelId: dto.professionnelId,
            serviceId: dto.serviceId,
            clientId: client.id,
            dateDebut,
            dateFin,
            origine,
            remarque: dto.remarque,
            manageToken,
          },
          include: { client: true, service: true },
        });

        if (dto.reponsesChamps) {
          const entries = Object.entries(dto.reponsesChamps);
          for (const [champId, valeur] of entries) {
            await tx.reponseChamp.create({ data: { champId, rendezVousId: created.id, valeur: String(valeur) } });
          }
        }

        await tx.historiqueStatut.create({ data: { rendezVousId: created.id, nouveauStatut: 'RESERVE', changedBy: origine } });

        return created;
      });

      // Notifications + temps réel (hors transaction, non bloquant pour la réservation elle-même)
      await this.notifyProfessionnelEtEquipe(dto.professionnelId, 'NOUVELLE_RESERVATION', `Nouvelle réservation : ${dto.prenom} ${dto.nom} — ${service.nom}`);
      this.events.rdvCreated(dto.professionnelId, rdv);
      await this.audit.log({
        userId: auteurUserId,
        professionnelId: dto.professionnelId,
        action: 'RDV_CREATED',
        cible: rdv.id,
        details: { origine, client: `${dto.prenom} ${dto.nom}`, service: service.nom, dateDebut },
      });

      return rdv;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Ce créneau vient d\'être réservé. Merci de choisir un autre horaire.');
      }
      throw err;
    }
  }

  // ============================================================
  // PARAMÈTRES DE RÉSERVATION (section II.15bis du CDC)
  // Ces règles sont appliquées ici, côté serveur : c'est ce qui les rend
  // effectives, quel que soit le point d'entrée (client, réceptionniste, pro).
  // ============================================================

  /** Règles du professionnel, avec les valeurs par défaut du CDC si non configurées. */
  async getParametres(professionnelId: string) {
    const p = await this.prisma.parametresReservation.findUnique({ where: { professionnelId } });
    return (
      p ?? {
        intervalleMinutes: 10,
        delaiMinHeures: 2,
        delaiMaxJours: 90,
        seuilAbsences: 2,
        maxRdvParClientParJour: 1,
      }
    );
  }

  private async assertReglesReservation(dto: CreateRdvDto, dateDebut: Date, dureeMinutes: number) {
    const p = await this.getParametres(dto.professionnelId);
    const maintenant = Date.now();

    const heuresAvant = (dateDebut.getTime() - maintenant) / 3600000;
    if (heuresAvant < p.delaiMinHeures) {
      throw new BadRequestException(
        `Ce professionnel demande un délai minimum de ${p.delaiMinHeures} h avant un rendez-vous.`,
      );
    }
    const joursAvant = (dateDebut.getTime() - maintenant) / 86400000;
    if (joursAvant > p.delaiMaxJours) {
      throw new BadRequestException(
        `Les réservations ne sont ouvertes que ${p.delaiMaxJours} jours à l'avance.`,
      );
    }

    // Intervalle minimum entre deux rendez-vous : on élargit la fenêtre de
    // conflit de part et d'autre du créneau demandé.
    if (p.intervalleMinutes > 0) {
      const margeMs = p.intervalleMinutes * 60000;
      const debutElargi = new Date(dateDebut.getTime() - margeMs);
      const finElargie = new Date(dateDebut.getTime() + dureeMinutes * 60000 + margeMs);
      const tropProche = await this.prisma.rendezVous.findFirst({
        where: {
          professionnelId: dto.professionnelId,
          statut: { not: 'ANNULE' },
          dateDebut: { lt: finElargie },
          dateFin: { gt: debutElargi },
        },
      });
      if (tropProche) {
        throw new ConflictException(
          `Un intervalle de ${p.intervalleMinutes} min est requis entre deux rendez-vous.`,
        );
      }
    }

    // Nombre maximum de rendez-vous par client et par journée.
    if (dto.telephone && p.maxRdvParClientParJour > 0) {
      const client = await this.prisma.client.findUnique({ where: { telephone: dto.telephone }, select: { id: true } });
      if (client) {
        const debutJour = new Date(dateDebut); debutJour.setHours(0, 0, 0, 0);
        const finJour = new Date(dateDebut); finJour.setHours(23, 59, 59, 999);
        const dejaPris = await this.prisma.rendezVous.count({
          where: {
            professionnelId: dto.professionnelId,
            clientId: client.id,
            statut: { not: 'ANNULE' },
            dateDebut: { gte: debutJour, lte: finJour },
          },
        });
        if (dejaPris >= p.maxRdvParClientParJour) {
          throw new ConflictException(
            `Ce client possède déjà ${dejaPris} rendez-vous ce jour-là (maximum autorisé : ${p.maxRdvParClientParJour}).`,
          );
        }
      }
    }
  }

  // ============================================================
  // ISOLATION DES DONNÉES (section II.2 du CDC : « il ne peut pas consulter les
  // données privées d'un autre professionnel »).
  //
  // Le RolesGuard ne vérifie que le rôle, et le PermissionsGuard laisse passer
  // tout ce qui n'est pas RECEPTIONNISTE : sans les contrôles ci-dessous, un
  // professionnel authentifié atteint les rendez-vous de tous les autres.
  // ============================================================

  /** `manageToken` permet d'annuler un RDV via la route publique, sans authentification : il ne doit jamais sortir d'ici. */
  private sansToken<T extends { manageToken?: string | null }>(rdv: T): Omit<T, 'manageToken'> {
    const { manageToken, ...reste } = rdv as any;
    return reste;
  }

  /** Professionnels que l'utilisateur courant a le droit de voir. `null` = aucune restriction (Admin). */
  private async perimetreProfessionnels(user: CurrentUserContext): Promise<string[] | null> {
    if (user.role === 'ADMIN') return null;

    if (user.role === 'PROFESSIONNEL') {
      const pro = await this.prisma.professionnel.findUnique({ where: { userId: user.userId }, select: { id: true } });
      if (!pro) throw new ForbiddenException('Compte professionnel introuvable.');
      return [pro.id];
    }

    const rec = await this.prisma.receptionniste.findUnique({ where: { userId: user.userId }, select: { id: true } });
    if (!rec) throw new ForbiddenException('Compte réceptionniste introuvable.');
    // Une affectation désactivée par le professionnel ne donne plus accès à son espace (CDC II.13.1).
    const affectations = await this.prisma.affectation.findMany({
      where: { receptionnisteId: rec.id, actif: true, peutConsulterAgenda: true },
      select: { professionnelId: true },
    });
    return affectations.map((a) => a.professionnelId);
  }

  /** Vérifie que l'utilisateur a le droit d'agir sur ce professionnel, ou lève une 403. */
  private async assertAccesProfessionnel(professionnelId: string, user: CurrentUserContext) {
    const perimetre = await this.perimetreProfessionnels(user);
    if (perimetre === null) return;
    if (!perimetre.includes(professionnelId)) {
      throw new ForbiddenException("Ce rendez-vous appartient à l'activité d'un autre professionnel.");
    }
  }

  // ============================================================
  // LISTE / FILTRES (disponibles partout où une liste est affichée — section
  // "Filtres" des exigences UI/UX)
  // ============================================================
  async list(
    params: { professionnelId?: string; statut?: string; dateFrom?: string; dateTo?: string; search?: string; serviceId?: string },
    user: CurrentUserContext,
  ) {
    const perimetre = await this.perimetreProfessionnels(user);

    // Le professionnelId reçu du client n'est qu'un FILTRE : il ne peut jamais
    // élargir le périmètre, seulement le restreindre à l'intérieur.
    let filtreProfessionnel: any;
    if (perimetre === null) {
      filtreProfessionnel = params.professionnelId ?? undefined;
    } else if (params.professionnelId) {
      if (!perimetre.includes(params.professionnelId)) {
        throw new ForbiddenException("Vous n'avez pas accès à l'agenda de ce professionnel.");
      }
      filtreProfessionnel = params.professionnelId;
    } else {
      filtreProfessionnel = { in: perimetre };
    }

    const rdvs = await this.prisma.rendezVous.findMany({
      where: {
        professionnelId: filtreProfessionnel,
        statut: params.statut ? (params.statut as any) : undefined,
        serviceId: params.serviceId || undefined,
        dateDebut: {
          gte: params.dateFrom ? new Date(params.dateFrom) : undefined,
          lte: params.dateTo ? new Date(params.dateTo) : undefined,
        },
        ...(params.search
          ? { client: { OR: [{ nom: { contains: params.search, mode: 'insensitive' } }, { prenom: { contains: params.search, mode: 'insensitive' } }, { telephone: { contains: params.search } }] } }
          : {}),
      },
      include: { client: true, service: true, professionnel: true },
      orderBy: { dateDebut: 'desc' },
    });
    return rdvs.map((r) => this.sansToken(r));
  }

  /** Lecture interne, sans contrôle d'accès — réservée aux appelants qui l'ont déjà fait. */
  private async findOneRaw(id: string) {
    const rdv = await this.prisma.rendezVous.findUnique({
      where: { id },
      include: { client: true, service: true, professionnel: true, historique: true, reponsesChamps: { include: { champ: true } } },
    });
    if (!rdv) throw new NotFoundException('Rendez-vous introuvable.');
    return rdv;
  }

  async findOne(id: string, user: CurrentUserContext) {
    const rdv = await this.findOneRaw(id);
    await this.assertAccesProfessionnel(rdv.professionnelId, user);
    return this.sansToken(rdv);
  }

  // ============================================================
  // CHANGEMENT DE STATUT — respecte les transitions autorisées (section 18 du CDC)
  // ============================================================
  /** `user` est omis uniquement pour l'annulation par le client via son lien de gestion (pas de session). */
  async updateStatus(id: string, dto: UpdateStatusDto, changedBy: string, user?: CurrentUserContext) {
    const rdv = await this.findOneRaw(id);
    if (user) await this.assertAccesProfessionnel(rdv.professionnelId, user);
    const autorises = STATUT_SUIVANT[rdv.statut] || [];
    if (!autorises.includes(dto.statut)) {
      throw new BadRequestException(`Transition de statut invalide : ${rdv.statut} → ${dto.statut}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.rendezVous.update({
        where: { id },
        data: { statut: dto.statut as any, motifAnnulation: dto.statut === 'ANNULE' ? dto.motif : undefined },
        include: { client: true, service: true },
      });
      await tx.historiqueStatut.create({ data: { rendezVousId: id, ancienStatut: rdv.statut as any, nouveauStatut: dto.statut as any, changedBy } });
      return u;
    });

    await this.notifyProfessionnelEtEquipe(
      rdv.professionnelId,
      'CHANGEMENT_STATUT',
      `${updated.client.prenom} ${updated.client.nom} — statut mis à jour : ${dto.statut}`,
    );
    this.events.rdvStatusChanged(rdv.professionnelId, this.sansToken(updated));
    await this.audit.log({
      userId: changedBy === 'client' ? undefined : changedBy,
      professionnelId: rdv.professionnelId,
      action: dto.statut === 'ANNULE' ? 'RDV_CANCELLED' : 'RDV_STATUS_CHANGED',
      cible: id,
      details: { from: rdv.statut, to: dto.statut, motif: dto.motif, client: `${updated.client.prenom} ${updated.client.nom}` },
    });

    // Information du client par e-mail, motif compris (CDC II.10.2).
    if (dto.statut === 'ANNULE' && updated.client.email) {
      await this.email.send(
        updated.client.email,
        `Annulation de votre rendez-vous du ${updated.dateDebut.toLocaleDateString('fr-FR')}`,
        `Bonjour ${updated.client.prenom},\n\nVotre rendez-vous « ${updated.service.nom} » du ` +
          `${updated.dateDebut.toLocaleString('fr-FR')} a été annulé.\n` +
          `Motif : ${dto.motif || 'non précisé'}.\n\nNous vous invitons à reprendre rendez-vous.`,
      );
    }

    return this.sansToken(updated);
  }

  // ============================================================
  // MODIFICATION (déplacement de créneau) — vérifie à nouveau la disponibilité
  // ============================================================
  async reschedule(id: string, dto: RescheduleDto, changedBy: string, user: CurrentUserContext) {
    const rdv = await this.findOneRaw(id);
    await this.assertAccesProfessionnel(rdv.professionnelId, user);
    if (rdv.statut !== 'RESERVE') throw new BadRequestException('Seul un rendez-vous encore "Réservé" peut être déplacé.');

    const dureeMs = rdv.dateFin.getTime() - rdv.dateDebut.getTime();
    const newStart = new Date(dto.dateDebut);
    const newEnd = new Date(newStart.getTime() + dureeMs);

    const conflits = await this.prisma.rendezVous.findMany({
      where: { professionnelId: rdv.professionnelId, id: { not: id }, statut: { not: 'ANNULE' }, dateDebut: { lt: newEnd }, dateFin: { gt: newStart } },
    });
    if (conflits.length) throw new ConflictException('Le nouveau créneau est déjà occupé.');

    const updated = await this.prisma.rendezVous.update({ where: { id }, data: { dateDebut: newStart, dateFin: newEnd }, include: { client: true, service: true } });
    await this.audit.log({
      userId: changedBy,
      professionnelId: rdv.professionnelId,
      action: 'RDV_RESCHEDULED',
      cible: id,
      details: { from: rdv.dateDebut, to: newStart, client: `${updated.client.prenom} ${updated.client.nom}` },
    });
    // Type « Modification » attendu par le CDC II.16, jamais émis jusqu'ici.
    await this.notifyProfessionnelEtEquipe(
      rdv.professionnelId,
      'MODIFICATION',
      `Rendez-vous déplacé : ${updated.client.prenom} ${updated.client.nom} — ${newStart.toLocaleString('fr-FR')}`,
    );
    this.events.rdvUpdated(rdv.professionnelId, this.sansToken(updated));
    return this.sansToken(updated);
  }

  // ============================================================
  // GESTION PAR LE CLIENT (sans compte) via manageToken (section 17 du CDC)
  // ============================================================
  async findByManageToken(token: string) {
    const rdv = await this.prisma.rendezVous.findUnique({ where: { manageToken: token }, include: { client: true, service: true, professionnel: true } });
    if (!rdv) throw new NotFoundException('Rendez-vous introuvable pour ce lien.');
    return rdv;
  }
  async cancelByClient(token: string) {
    const rdv = await this.findByManageToken(token);
    if (rdv.statut !== 'RESERVE') throw new BadRequestException('Ce rendez-vous ne peut plus être annulé.');
    return this.updateStatus(rdv.id, { statut: 'ANNULE', motif: 'Annulé par le client' }, 'client');
  }

  private async notifyProfessionnelEtEquipe(professionnelId: string, type: any, message: string) {
    const pro = await this.prisma.professionnel.findUnique({ where: { id: professionnelId }, include: { affectations: { include: { receptionniste: true } } } });
    if (!pro) return;
    await this.notifications.create(pro.userId, type, message);
    for (const aff of pro.affectations) {
      // Une affectation désactivée ne reçoit plus rien (CDC II.13.1).
      if (aff.actif && aff.peutConsulterAgenda) {
        await this.notifications.create(aff.receptionniste.userId, type, message);
      }
    }
  }
}

function cryptoRandom(): string {
  return [...Array(24)].map(() => Math.floor(Math.random() * 36).toString(36)).join('');
}
