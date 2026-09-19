import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ClientInputDto {
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  dateNaissance?: string;
  adresse?: string;
}

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Recherche/dédoublonnage client (section 15 du CDC).
   * Le téléphone est la clé d'identification principale (unique en base) :
   * si un client existe déjà avec ce numéro, sa fiche est réutilisée et mise à jour,
   * plutôt que de créer un doublon.
   */
  async findOrCreate(input: ClientInputDto, tx: any = this.prisma) {
    const existing = await tx.client.findUnique({ where: { telephone: input.telephone } });
    if (existing) {
      return tx.client.update({
        where: { id: existing.id },
        data: {
          nom: input.nom || existing.nom,
          prenom: input.prenom || existing.prenom,
          email: input.email ?? existing.email,
          dateNaissance: input.dateNaissance ? new Date(input.dateNaissance) : existing.dateNaissance,
          adresse: input.adresse ?? existing.adresse,
        },
      });
    }
    return tx.client.create({
      data: {
        nom: input.nom,
        prenom: input.prenom,
        telephone: input.telephone,
        email: input.email,
        dateNaissance: input.dateNaissance ? new Date(input.dateNaissance) : undefined,
        adresse: input.adresse,
      },
    });
  }

  async listForProfessionnel(professionnelId: string, search?: string) {
    const rdvs = await this.prisma.rendezVous.findMany({
      where: { professionnelId, ...(search ? { client: { OR: [{ nom: { contains: search, mode: 'insensitive' } }, { prenom: { contains: search, mode: 'insensitive' } }, { telephone: { contains: search } }] } } : {}) },
      include: { client: true },
      orderBy: { dateDebut: 'desc' },
    });
    const map = new Map<string, any>();
    for (const r of rdvs) {
      if (!map.has(r.clientId)) map.set(r.clientId, { ...r.client, rendezVous: [] });
      map.get(r.clientId).rendezVous.push({ id: r.id, dateDebut: r.dateDebut, statut: r.statut, service: r.serviceId });
    }
    return Array.from(map.values());
  }

  /** Détection des absences répétées (seuil configurable, par défaut 2) — utile à la Réceptionniste. */
  async absenceCount(clientId: string, professionnelId: string) {
    return this.prisma.rendezVous.count({ where: { clientId, professionnelId, statut: 'ABSENT' } });
  }
}