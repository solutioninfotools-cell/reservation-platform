import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';

/**
 * Assistant IA — V2 : appel réel à Gemini (Google AI Studio, gratuit).
 * Contexte injecté depuis Prisma (horaires, adresse, services, conditions,
 * procédures, stats pro). Si la clé Gemini est absente ou l'appel échoue,
 * on retombe automatiquement sur les réponses par mots-clés (fallbackAnswer)
 * — donc rien ne casse jamais.
 */
export type AssistantMode = 'public' | 'pro';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

  constructor(private prisma: PrismaService) {}

  async answer(question: string, professionnelId?: string, mode: AssistantMode = 'public') {
    const context = await this.buildContext(professionnelId, mode);

    if (this.genAI) {
      try {
        return { answer: await this.askGemini(question, context, mode) };
      } catch (err) {
        this.logger.error('Gemini indisponible, fallback mots-clés', err as Error);
      }
    }
    return { answer: this.fallbackAnswer(question, context) };
  }

  private async buildContext(professionnelId?: string, mode: AssistantMode = 'public') {
    const config = await this.prisma.systemConfig.findFirst();

    const professionnels = await this.prisma.professionnel.findMany({
      where: { user: { statutCompte: 'ACTIF' } },
      select: { id: true, nom: true, specialite: true, description: true },
    });

    const services = professionnelId
      ? await this.prisma.service.findMany({
          where: { professionnelId, actif: true },
          select: { nom: true, description: true, prix: true, dureeMinutes: true },
        })
      : await this.prisma.service.findMany({
          where: { actif: true, professionnel: { user: { statutCompte: 'ACTIF' } } },
          select: {
            nom: true,
            description: true,
            prix: true,
            dureeMinutes: true,
            professionnel: { select: { nom: true } },
          },
        });

    const base = {
      horaires: config?.horairesGeneraux || 'non renseignés',
      jours: (config?.joursOuvrables || []).join(', ') || 'non renseignés',
      adresse: config?.address || 'non renseignée',
      telephone: config?.phone || 'non renseigné',
      email: config?.email || 'non renseigné',
      professionnels: professionnels.map((p) => ({ nom: p.nom, specialite: p.specialite, description: p.description })),
      services,
      conditionsReservation:
        config?.conditionsReservation ||
        "La réservation se fait sans création de compte. Après confirmation, le client reçoit un code de gestion unique qui lui permet d'annuler ou de modifier son rendez-vous à tout moment. Un délai minimum avant le rendez-vous peut s'appliquer pour toute annulation ou modification.",
      procedureReservation:
        "Pour prendre rendez-vous : le client choisit un professionnel et un service sur le site, puis une date et un créneau horaire disponible dans le calendrier, renseigne ses coordonnées (nom, prénom, adresse, date de naissance, téléphone, e-mail vérifié par un code reçu par e-mail), accepte les conditions de réservation, puis confirme. Il reçoit immédiatement une confirmation et un code de gestion unique.",
      procedureGestionRdv:
        "Pour gérer un rendez-vous existant (l'annuler ou le modifier), le client clique sur « Gérer mon rendez-vous » sur le site, puis saisit son adresse e-mail et le code de gestion reçu lors de la confirmation. Il peut alors annuler le rendez-vous ou choisir un nouveau créneau, selon les délais autorisés.",
    };

    if (mode === 'pro' && professionnelId) {
      const [rdvAVenir, rdvTotal] = await Promise.all([
        this.prisma.rendezVous.count({
          where: { professionnelId, dateDebut: { gte: new Date() }, statut: { not: 'ANNULE' } },
        }),
        this.prisma.rendezVous.count({ where: { professionnelId } }),
      ]);
      return { ...base, stats: { rdvAVenir, rdvTotal } };
    }
    return base;
  }

  private async askGemini(question: string, context: any, mode: AssistantMode) {
const systemInstruction =
  mode === 'public'
    ? `Tu es l'assistant du site de réservation. Réponds UNIQUEMENT à partir du contexte ci-dessous, en français.
      Tu peux utiliser **...** pour mettre en gras les noms importants.
       RÈGLE STRICTE pour toute liste (services, professionnels, horaires par jour, etc.) :
       - Chaque élément DOIT commencer par un tiret suivi d'un espace "- " en tout début de ligne.
       - Les éléments d'une même liste se suivent SANS ligne vide entre eux (une seule ligne vide avant et après toute la liste, pas entre chaque élément).
        Exemple de format attendu pour une liste de services :
       Voici nos services :
       - **Consultation générale** (par **Dr. Ahmed Benali**) - Durée : 30 min, Prix : 3000 DA
       - **Service E2E** (par **Dr. Ahmed Benali**) - Durée : 30 min, Prix : 4500 DA

         Souhaitez-vous réserver un rendez-vous ?

        Si l'info manque vraiment du contexte, invite à contacter l'établissement.
        Contexte: ${JSON.stringify(context)}`
    : `Tu es l'assistant interne d'un professionnel sur la plateforme. Aide-le sur son activité, en français. Chaque élément de liste commence par "- " en début de ligne, sans ligne vide entre les éléments d'une même liste.\nContexte: ${JSON.stringify(context)}`;
    const result = await this.genAI!.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `${systemInstruction}\n\nQuestion: ${question}`,
    });
    return (result.text ?? '').trim() || "Désolé, je n'ai pas pu générer de réponse.";
  }

  private fallbackAnswer(question: string, context: any) {
    const q = question.toLowerCase();
    if (q.includes('horaire') || q.includes('ouvert')) return `Nos horaires : ${context.horaires} (${context.jours}).`;
    if (q.includes('service') || q.includes('propos'))
      return context.services?.length ? `Nos services : ${context.services.map((s: any) => s.nom).join(', ')}.` : 'Consultez la page des services.';
    if (q.includes('rendez-vous') || q.includes('réserv') || q.includes('reserv'))
      return context.procedureReservation || 'Choisissez un service, une date et un créneau, puis renseignez vos coordonnées.';
    if (q.includes('où') || q.includes('adresse') || q.includes('situ')) return `Nous sommes situés au : ${context.adresse}.`;
    if (q.includes('annul') || q.includes('gérer') || q.includes('gerer') || q.includes('modifier'))
      return context.procedureGestionRdv || "Vous pouvez annuler votre rendez-vous via le lien reçu lors de la confirmation, dans les délais autorisés.";
    if (q.includes('condition')) return context.conditionsReservation || "Consultez les conditions de réservation sur le site.";
    return "Je peux répondre sur les horaires, services, rendez-vous, conditions de réservation ou l'adresse. Pouvez-vous reformuler ?";
  }
}