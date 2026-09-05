import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateDisponibiliteDto, CreateIndisponibiliteDto } from './dto/disponibilite.dto';
import { UpdatePermissionsDto } from './dto/affectation.dto';

@Injectable()
export class ProfessionnelService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findByUserId(userId: string) {
    const pro = await this.prisma.professionnel.findUnique({ where: { userId } });
    if (!pro) throw new NotFoundException('Profil professionnel introuvable.');
    return pro;
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

  // ---------------- Indisponibilités ----------------
  async listIndisponibilites(professionnelId: string) {
    return this.prisma.indisponibilite.findMany({ where: { professionnelId }, orderBy: { dateDebut: 'desc' } });
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
