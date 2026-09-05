import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Espace public — consulté par le Client, sans authentification (le client n'a
 * pas de compte, section 15/16 du CDC). Ne renvoie que les services et
 * informations de l'espace unique configuré (pas de liste multi-domaines).
 */
@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getEspace() {
    const config = await this.prisma.systemConfig.findFirst();
    if (!config?.isConfigured) throw new NotFoundException("L'espace n'est pas encore configuré.");

    // V1 : un seul professionnel "principal" par espace pour un domaine mono-praticien,
    // ou la liste des professionnels actifs si plusieurs partagent le même espace
    // (ex. cabinet à plusieurs praticiens).
    const professionnels = await this.prisma.professionnel.findMany({
      where: { user: { statutCompte: 'ACTIF' } },
      select: { id: true, nom: true, specialite: true, description: true, adresse: true, telephone: true, photoUrl: true },
    });

    return {
      platformName: config.platformName,
      slogan: config.slogan,
      description: config.description,
      domaine: config.domaine,
      logoUrl: config.logoUrl,
      address: config.address,
      phone: config.phone,
      email: config.email,
      joursOuvrables: config.joursOuvrables,
      horairesGeneraux: config.horairesGeneraux,
      professionnels,
    };
  }

  async getServices(professionnelId: string) {
    return this.prisma.service.findMany({
      where: { professionnelId, actif: true },
      include: { champsPersonnalises: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
