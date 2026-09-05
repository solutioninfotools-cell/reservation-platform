import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Assistant IA — V1 volontairement simple (section 25 du CDC) :
 * pas de clé API externe, pas de LLM réel, pas de RAG/pgvector.
 * Réponses basées sur mots-clés + informations réelles de l'espace configuré.
 * L'interface `answer()` est conçue pour être remplacée plus tard par un vrai
 * appel LLM sans changer le contrat de l'API (même signature d'entrée/sortie).
 */
@Injectable()
export class AssistantService {
  constructor(private prisma: PrismaService) {}

  async answer(question: string, professionnelId?: string) {
    const q = question.toLowerCase();
    const config = await this.prisma.systemConfig.findFirst();

    if (q.includes('horaire') || q.includes('ouvert')) {
      return { answer: `Nos horaires : ${config?.horairesGeneraux || 'non renseignés'} (${(config?.joursOuvrables || []).join(', ') || 'jours non renseignés'}).` };
    }
    if (q.includes('service') || q.includes('propos')) {
      const services = professionnelId
        ? await this.prisma.service.findMany({ where: { professionnelId, actif: true }, select: { nom: true } })
        : [];
      return { answer: services.length ? `Nos services : ${services.map((s) => s.nom).join(', ')}.` : "Consultez la page des services pour la liste complète." };
    }
    if (q.includes('rendez-vous') || q.includes('réserv') || q.includes('reserv')) {
      return { answer: 'Pour prendre rendez-vous, choisissez un service, puis une date et un créneau disponible, et renseignez vos coordonnées. Vous recevrez une confirmation immédiate.' };
    }
    if (q.includes('où') || q.includes('adresse') || q.includes('situ')) {
      return { answer: config?.address ? `Nous sommes situés au : ${config.address}.` : "L'adresse n'est pas encore renseignée." };
    }
    if (q.includes('annul')) {
      return { answer: "Vous pouvez annuler votre rendez-vous via le lien reçu lors de la confirmation, dans les délais autorisés." };
    }
    return { answer: "Je peux répondre à des questions sur les horaires, les services, la prise de rendez-vous ou notre adresse. Pouvez-vous reformuler ?" };
  }
}
