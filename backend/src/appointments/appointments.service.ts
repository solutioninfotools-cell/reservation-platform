import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../websocket/events.gateway';
import { CreateRdvDto } from './dto/create-rdv.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { RescheduleDto } from './dto/reschedule.dto';

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
        const chevaucheRdv = rdvsExistants.some((r) => slotStart < r.dateFin && slotEnd > r.dateDebut);
        const estPasse = slotStart.getTime() < Date.now();

        if (!dansIndispo && !chevaucheRdv && !estPasse) {
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
  async create(dto: CreateRdvDto, origine: 'EN_LIGNE' | 'RECEPTIONNISTE' | 'PROFESSIONNEL') {
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service || service.professionnelId !== dto.professionnelId || !service.actif) {
      throw new BadRequestException('Service invalide.');
    }

    const dateDebut = new Date(dto.dateDebut);
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
      await this.audit.log({ action: 'RDV_CREATED', cible: rdv.id, details: { origine, professionnelId: dto.professionnelId } });

      return rdv;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Ce créneau vient d\'être réservé. Merci de choisir un autre horaire.');
      }
      throw err;
    }
  }

  // ============================================================
  // LISTE / FILTRES (disponibles partout où une liste est affichée — section
  // "Filtres" des exigences UI/UX)
  // ============================================================
  async list(params: { professionnelId?: string; statut?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    return this.prisma.rendezVous.findMany({
      where: {
        professionnelId: params.professionnelId,
        statut: params.statut ? (params.statut as any) : undefined,
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
  }

  async findOne(id: string) {
    const rdv = await this.prisma.rendezVous.findUnique({
      where: { id },
      include: { client: true, service: true, professionnel: true, historique: true, reponsesChamps: { include: { champ: true } } },
    });
    if (!rdv) throw new NotFoundException('Rendez-vous introuvable.');
    return rdv;
  }

  // ============================================================
  // CHANGEMENT DE STATUT — respecte les transitions autorisées (section 18 du CDC)
  // ============================================================
  async updateStatus(id: string, dto: UpdateStatusDto, changedBy: string) {
    const rdv = await this.findOne(id);
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
    this.events.rdvStatusChanged(rdv.professionnelId, updated);
    await this.audit.log({ userId: changedBy, action: 'RDV_STATUS_CHANGED', cible: id, details: { from: rdv.statut, to: dto.statut } });

    return updated;
  }

  // ============================================================
  // MODIFICATION (déplacement de créneau) — vérifie à nouveau la disponibilité
  // ============================================================
  async reschedule(id: string, dto: RescheduleDto, changedBy: string) {
    const rdv = await this.findOne(id);
    if (rdv.statut !== 'RESERVE') throw new BadRequestException('Seul un rendez-vous encore "Réservé" peut être déplacé.');

    const dureeMs = rdv.dateFin.getTime() - rdv.dateDebut.getTime();
    const newStart = new Date(dto.dateDebut);
    const newEnd = new Date(newStart.getTime() + dureeMs);

    const conflits = await this.prisma.rendezVous.findMany({
      where: { professionnelId: rdv.professionnelId, id: { not: id }, statut: { not: 'ANNULE' }, dateDebut: { lt: newEnd }, dateFin: { gt: newStart } },
    });
    if (conflits.length) throw new ConflictException('Le nouveau créneau est déjà occupé.');

    const updated = await this.prisma.rendezVous.update({ where: { id }, data: { dateDebut: newStart, dateFin: newEnd }, include: { client: true, service: true } });
    await this.audit.log({ userId: changedBy, action: 'RDV_RESCHEDULED', cible: id, details: { newStart } });
    this.events.rdvUpdated(rdv.professionnelId, updated);
    return updated;
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
      if (aff.peutConsulterAgenda) {
        await this.notifications.create(aff.receptionniste.userId, type, message);
      }
    }
  }
}

function cryptoRandom(): string {
  return [...Array(24)].map(() => Math.floor(Math.random() * 36).toString(36)).join('');
}
