import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClientsService } from '../clients/clients.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateDisponibiliteDto, CreateIndisponibiliteDto } from './dto/disponibilite.dto';
import { UpdatePermissionsDto } from './dto/affectation.dto';
import { CreateChampDto, UpdateChampDto } from './dto/champ.dto';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';
import { UpdateParametresDto } from './dto/parametres.dto';

@Injectable()
export class ProfessionnelService {
  constructor(private prisma: PrismaService, private audit: AuditService, private clients: ClientsService) {}

  async findByUserId(userId: string) {
    const pro = await this.prisma.professionnel.findUnique({ where: { userId } });
    if (!pro) throw new NotFoundException('Profil professionnel introuvable.');
    return pro;
  }

  /** Profil complet affiché dans l'espace Professionnel (l'e-mail vient du compte). */
  async profilComplet(userId: string) {
    const pro = await this.prisma.professionnel.findUnique({
      where: { userId },
      include: { user: { select: { email: true, statutCompte: true, emailVerifie: true } }, domaine: true },
    });
    if (!pro) throw new NotFoundException('Profil professionnel introuvable.');
    const { user, ...reste } = pro;
    return { ...reste, email: user.email, statutCompte: user.statutCompte, emailVerifie: user.emailVerifie };
  }

  // ---------------- Profil ----------------
  async updateProfil(userId: string, data: Partial<{ nom: string; specialite: string; description: string; adresse: string; telephone: string; photoUrl: string }>) {
    const pro = await this.findByUserId(userId);
    return this.prisma.professionnel.update({ where: { id: pro.id }, data });
  }

  // ---------------- Services ----------------
  async listServices(professionnelId: string) {
    return this.prisma.service.findMany({ where: { professionnelId }, orderBy: { createdAt: 'asc' } });
  }
  async createService(userId: string, dto: CreateServiceDto) {
    const pro = await this.findByUserId(userId);
    return this.prisma.service.create({ data: { ...dto, professionnelId: pro.id } });
  }
  async updateService(userId: string, serviceId: string, dto: UpdateServiceDto) {
    const pro = await this.findByUserId(userId);
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.professionnelId !== pro.id) throw new NotFoundException('Service introuvable.');
    return this.prisma.service.update({ where: { id: serviceId }, data: dto });
  }
  async deleteService(userId: string, serviceId: string) {
    const pro = await this.findByUserId(userId);
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.professionnelId !== pro.id) throw new NotFoundException('Service introuvable.');
    await this.prisma.service.delete({ where: { id: serviceId } });
    return { message: 'Service supprimé.' };
  }

  // ---------------- Disponibilités ----------------
  async listDisponibilites(professionnelId: string) {
    return this.prisma.disponibilite.findMany({ where: { professionnelId }, orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }] });
  }
  async addDisponibilite(userId: string, dto: CreateDisponibiliteDto) {
    const pro = await this.findByUserId(userId);
    return this.prisma.disponibilite.create({ data: { ...dto, professionnelId: pro.id } });
  }
  async removeDisponibilite(userId: string, id: string) {
    const pro = await this.findByUserId(userId);
    const d = await this.prisma.disponibilite.findUnique({ where: { id } });
    if (!d || d.professionnelId !== pro.id) throw new NotFoundException('Disponibilité introuvable.');
    await this.prisma.disponibilite.delete({ where: { id } });
    return { message: 'Disponibilité supprimée.' };
  }

  // ---------------- Champs personnalisés (CDC II.6) ----------------
  async listChamps(professionnelId: string, serviceId?: string) {
    return this.prisma.champPersonnalise.findMany({
      where: { professionnelId, ...(serviceId ? { serviceId } : {}) },
      orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
    });
  }
  /** Vérifie que le service visé appartient bien au professionnel avant de lui rattacher un champ. */
  private async ensureServiceDuPro(professionnelId: string, serviceId?: string | null) {
    if (!serviceId) return;
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.professionnelId !== professionnelId) throw new NotFoundException('Service introuvable.');
  }
  async createChamp(userId: string, dto: CreateChampDto) {
    const pro = await this.findByUserId(userId);
    await this.ensureServiceDuPro(pro.id, dto.serviceId);
    const { conditions, ...reste } = dto;
    return this.prisma.champPersonnalise.create({
      data: { ...reste, professionnelId: pro.id, conditions: (conditions ?? []) as any },
    });
  }
  async updateChamp(userId: string, champId: string, dto: UpdateChampDto) {
    const pro = await this.findByUserId(userId);
    const champ = await this.prisma.champPersonnalise.findUnique({ where: { id: champId } });
    if (!champ || champ.professionnelId !== pro.id) throw new NotFoundException('Champ introuvable.');
    await this.ensureServiceDuPro(pro.id, dto.serviceId);
    const { conditions, ...reste } = dto;
    return this.prisma.champPersonnalise.update({
      where: { id: champId },
      data: { ...reste, ...(conditions === undefined ? {} : { conditions: conditions as any }) },
    });
  }
  async deleteChamp(userId: string, champId: string) {
    const pro = await this.findByUserId(userId);
    const champ = await this.prisma.champPersonnalise.findUnique({ where: { id: champId } });
    if (!champ || champ.professionnelId !== pro.id) throw new NotFoundException('Champ introuvable.');
    await this.prisma.champPersonnalise.delete({ where: { id: champId } });
    return { message: 'Champ supprimé.' };
  }

  // ---------------- Clients et notes internes (CDC II.9) ----------------
  async listClients(professionnelId: string, search?: string) {
    return this.clients.listForProfessionnel(professionnelId, search);
  }
  async listNotes(professionnelId: string, clientId?: string) {
    return this.prisma.noteClient.findMany({
      where: { professionnelId, ...(clientId ? { clientId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  async createNote(userId: string, dto: CreateNoteDto) {
    const pro = await this.findByUserId(userId);
    // Une note ne peut viser qu'un client déjà venu chez ce professionnel.
    const vu = await this.prisma.rendezVous.findFirst({ where: { professionnelId: pro.id, clientId: dto.clientId } });
    if (!vu) throw new NotFoundException("Ce client n'a aucun rendez-vous dans votre espace.");
    return this.prisma.noteClient.create({ data: { professionnelId: pro.id, clientId: dto.clientId, texte: dto.texte } });
  }
  async updateNote(userId: string, noteId: string, dto: UpdateNoteDto) {
    const pro = await this.findByUserId(userId);
    const note = await this.prisma.noteClient.findUnique({ where: { id: noteId } });
    if (!note || note.professionnelId !== pro.id) throw new NotFoundException('Note introuvable.');
    return this.prisma.noteClient.update({ where: { id: noteId }, data: { texte: dto.texte } });
  }
  async deleteNote(userId: string, noteId: string) {
    const pro = await this.findByUserId(userId);
    const note = await this.prisma.noteClient.findUnique({ where: { id: noteId } });
    if (!note || note.professionnelId !== pro.id) throw new NotFoundException('Note introuvable.');
    await this.prisma.noteClient.delete({ where: { id: noteId } });
    return { message: 'Note supprimée.' };
  }

  // ---------------- Paramètres de réservation (CDC II.15bis) ----------------
  /** Crée la ligne aux valeurs par défaut du schéma si le professionnel n'en a pas encore. */
  async getParametres(professionnelId: string) {
    const existant = await this.prisma.parametresReservation.findUnique({ where: { professionnelId } });
    if (existant) return existant;
    return this.prisma.parametresReservation.create({ data: { professionnelId } });
  }
  async updateParametres(userId: string, dto: UpdateParametresDto) {
    const pro = await this.findByUserId(userId);
    await this.getParametres(pro.id);
    const updated = await this.prisma.parametresReservation.update({ where: { professionnelId: pro.id }, data: dto });
    await this.audit.log({ userId, action: 'PARAMETRES_RESERVATION_UPDATED', cible: pro.id, details: dto });
    return updated;
  }

  // ---------------- Indisponibilités ----------------
  async listIndisponibilites(professionnelId: string) {
    return this.prisma.indisponibilite.findMany({ where: { professionnelId }, orderBy: { dateDebut: 'desc' } });
  }
  async removeIndisponibilite(userId: string, id: string) {
    const pro = await this.findByUserId(userId);
    const i = await this.prisma.indisponibilite.findUnique({ where: { id } });
    if (!i || i.professionnelId !== pro.id) throw new NotFoundException('Indisponibilité introuvable.');
    await this.prisma.indisponibilite.delete({ where: { id } });
    await this.audit.log({ userId, action: 'INDISPONIBILITE_DELETED', cible: id });
    // Les rendez-vous annulés lors de la création de la période ne sont pas
    // rétablis : ils ont déjà été notifiés aux clients.
    return { message: 'Indisponibilité supprimée.' };
  }
  async addIndisponibilite(userId: string, dto: CreateIndisponibiliteDto) {
    const pro = await this.findByUserId(userId);
    const dateDebut = new Date(dto.dateDebut);
    const dateFin = new Date(dto.dateFin);

    const indispo = await this.prisma.indisponibilite.create({
      data: { professionnelId: pro.id, type: dto.type, dateDebut, dateFin, motif: dto.motif },
    });

    // Annule automatiquement les RDV réservés qui tombent dans la période fermée.
    const impactes = await this.prisma.rendezVous.findMany({
      where: { professionnelId: pro.id, statut: 'RESERVE', dateDebut: { gte: dateDebut, lte: dateFin } },
    });
    if (impactes.length) {
      await this.prisma.rendezVous.updateMany({
        where: { id: { in: impactes.map((r) => r.id) } },
        data: { statut: 'ANNULE', motifAnnulation: dto.motif || 'Fermeture de la période par le professionnel' },
      });
      await this.audit.log({ userId, action: 'RDV_AUTO_CANCELLED_INDISPO', details: { count: impactes.length, indisponibiliteId: indispo.id } });
    }

    return { indisponibilite: indispo, rendezVousAnnules: impactes.length };
  }

  // ---------------- Réceptionnistes affectées + permissions ----------------
  async listReceptionnistes(professionnelId: string) {
    return this.prisma.affectation.findMany({
      where: { professionnelId },
      include: { receptionniste: { include: { user: true } } },
    });
  }
  async updatePermissions(userId: string, affectationId: string, dto: UpdatePermissionsDto) {
    const pro = await this.findByUserId(userId);
    const affectation = await this.prisma.affectation.findUnique({ where: { id: affectationId } });
    if (!affectation || affectation.professionnelId !== pro.id) throw new ForbiddenException('Affectation introuvable pour ce professionnel.');
    const updated = await this.prisma.affectation.update({ where: { id: affectationId }, data: dto });
    await this.audit.log({ userId, action: 'PERMISSIONS_UPDATED', cible: affectationId, details: dto });
    return updated;
  }

  // ---------------- Statistiques (données réelles, section 31 du CDC) ----------------
  async stats(professionnelId: string) {
    const [total, termines, annules, clients, services] = await this.prisma.$transaction([
      this.prisma.rendezVous.count({ where: { professionnelId } }),
      this.prisma.rendezVous.count({ where: { professionnelId, statut: 'TERMINE' } }),
      this.prisma.rendezVous.count({ where: { professionnelId, statut: 'ANNULE' } }),
      this.prisma.rendezVous.findMany({ where: { professionnelId }, select: { clientId: true }, distinct: ['clientId'] }),
      this.prisma.service.count({ where: { professionnelId, actif: true } }),
    ]);
    const parService = await this.prisma.rendezVous.groupBy({
      by: ['serviceId'],
      where: { professionnelId, statut: { not: 'ANNULE' } },
      _count: { _all: true },
    });
    return { total, termines, annules, nbClients: clients.length, servicesActifs: services, parService };
  }
}
