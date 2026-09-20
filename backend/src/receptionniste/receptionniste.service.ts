import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateRdvDto } from '../appointments/dto/create-rdv.dto';

@Injectable()
export class ReceptionnisteService {
  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
    private appointments: AppointmentsService,
  ) {}

  async findByUserId(userId: string) {
    const rec = await this.prisma.receptionniste.findUnique({ where: { userId } });
    if (!rec) throw new NotFoundException('Profil réceptionniste introuvable.');
    return rec;
  }

  /** Liste les professionnels auxquels cette réceptionniste est affectée (avec ses permissions). */
  async mesAffectations(userId: string) {
    const rec = await this.findByUserId(userId);
    return this.prisma.affectation.findMany({ where: { receptionnisteId: rec.id }, include: { professionnel: true } });
  }

  private async ensureAffectee(userId: string, professionnelId: string) {
    const rec = await this.findByUserId(userId);
    const aff = await this.prisma.affectation.findUnique({ where: { professionnelId_receptionnisteId: { professionnelId, receptionnisteId: rec.id } } });
    if (!aff) throw new ForbiddenException("Vous n'êtes pas affectée à ce professionnel.");
    return aff;
  }

  /** Détection d'un client existant par téléphone ou (nom + date de naissance) — section 9 du CDC. */
  async detecterClient(telephone?: string, nom?: string, dateNaissance?: string) {
    if (telephone) {
      const c = await this.prisma.client.findUnique({ where: { telephone } });
      if (c) return c;
    }
    if (nom && dateNaissance) {
      const c = await this.prisma.client.findFirst({ where: { nom: { equals: nom, mode: 'insensitive' }, dateNaissance: new Date(dateNaissance) } });
      if (c) return c;
    }
    return null;
  }

  async creerRdv(userId: string, dto: CreateRdvDto) {
    await this.ensureAffectee(userId, dto.professionnelId);
    return this.appointments.create(dto, 'RECEPTIONNISTE');
  }

  async clients(userId: string, professionnelId: string, search?: string) {
    await this.ensureAffectee(userId, professionnelId);
    return this.clientsService.listForProfessionnel(professionnelId, search);
  }
}
