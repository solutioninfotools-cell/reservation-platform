import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';

/**
 * Assistant IA — V2 : appel réel à Gemini, avec repli intégral sur le moteur
 * par mots-clés de la V1.
 *
 * Trois garanties tenues par ce fichier :
 *
 *  1. **L'assistant ne tombe jamais.** Clé absente, quota dépassé, modèle
 *     inconnu, réseau coupé, réponse vide : on retombe sur `fallbackPublic()` /
 *     `fallbackPro()`, qui interrogent la base et répondent quand même. Aucune
 *     de ces situations ne remonte une erreur au navigateur.
 *
 *  2. **Le contexte est toujours construit côté serveur**, à partir du
 *     `professionnelId` résolu par le contrôleur depuis la session. Le modèle
 *     ne reçoit que des données que l'appelant a déjà le droit de consulter, et
 *     la question de l'utilisateur ne peut pas élargir ce périmètre.
 *
 *  3. **Le modèle ne peut pas inventer** (CDC II.20) : la consigne système lui
 *     interdit de sortir du contexte fourni et l'invite à renvoyer vers
 *     l'établissement quand l'information manque.
 *
 * Confidentialité : en mode `pro`, le contexte envoyé à Google contient des
 * données réelles (noms de clients, téléphones, planning). C'est le prix d'un
 * assistant qui répond juste. Sans `GEMINI_API_KEY`, rien ne sort du serveur et
 * seul le moteur local répond.
 */
export type AssistantMode = 'public' | 'pro';

/**
 * Essayés dans l'ordre jusqu'à ce que l'un réponde. La liste existe parce que
 * la disponibilité d'un modèle dépend du compte Google AI Studio : un 404 sur
 * le premier ne doit pas priver l'utilisateur de l'assistant. `GEMINI_MODEL`
 * place un modèle en tête si vous en visez un précis.
 */
const MODELES_CANDIDATS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

/** Au-delà, on n'attend plus : mieux vaut une réponse locale qu'une bulle figée. */
const DELAI_MAX_MS = 12000;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

  /** Modèle validé au premier appel réussi : on ne refait pas la recherche. */
  private modeleRetenu: string | null = null;

  constructor(private prisma: PrismaService) {
    if (!this.genAI) {
      this.logger.warn('GEMINI_API_KEY absente — assistant en mode mots-clés (aucun appel externe).');
    }
  }

  /** Assistant public (CDC IV.4). `professionnelId` vient du contrôleur, jamais du corps. */
  async answer(question: string, professionnelId?: string) {
    const ia = await this.viaGemini(question, 'public', () => this.contextePublic(professionnelId));
    return ia ? { answer: ia } : this.fallbackPublic(question, professionnelId);
  }

  /** Assistant de l'espace Professionnel (CDC II.20). `professionnelId` vient de la session. */
  async answerForProfessionnel(question: string, professionnelId: string) {
    const ia = await this.viaGemini(question, 'pro', () => this.contextePro(professionnelId));
    return ia ? { answer: ia } : this.fallbackPro(question, professionnelId);
  }

  /* ------------------------------------------------------------ Gemini --- */

  /**
   * Renvoie la réponse du modèle, ou `null` pour dire « passe au repli ».
   * Le contexte est construit paresseusement : sans clé API, on ne déclenche
   * même pas les requêtes Prisma qui l'alimentent.
   */
  private async viaGemini(
    question: string,
    mode: AssistantMode,
    contexte: () => Promise<unknown>,
  ): Promise<string | null> {
    if (!this.genAI) return null;
    try {
      const consigne = this.consigneSysteme(await contexte(), mode);
      const texte = await this.avecDelai(this.generer(consigne, question), DELAI_MAX_MS);
      const propre = (texte ?? '').trim();
      return propre || null;
    } catch (err) {
      this.logger.error(
        `Gemini indisponible (mode ${mode}), repli sur le moteur local : ${(err as Error).message}`,
      );
      return null;
    }
  }

  /** Essaie les modèles dans l'ordre ; un modèle introuvable n'est pas une panne. */
  private async generer(consigne: string, question: string): Promise<string> {
    const candidats: string[] = this.modeleRetenu
      ? [this.modeleRetenu]
      : [process.env.GEMINI_MODEL, ...MODELES_CANDIDATS].filter((m): m is string => !!m);

    let derniere: Error | null = null;
    for (const model of candidats) {
      try {
        const res = await this.genAI!.models.generateContent({
          model,
          contents: consigne + '\n\nQuestion : ' + question,
        });
        if (this.modeleRetenu !== model) {
          this.modeleRetenu = model;
          this.logger.log(`Assistant IA : modèle « ${model} » retenu.`);
        }
        return res.text ?? '';
      } catch (err) {
        derniere = err as Error;
        if (!this.modeleIntrouvable(derniere)) throw derniere;
        this.logger.warn(`Modèle « ${model} » indisponible sur ce compte, essai suivant.`);
      }
    }
    throw derniere ?? new Error('Aucun modèle Gemini disponible.');
  }

  private modeleIntrouvable(err: Error): boolean {
    const m = String(err?.message ?? '').toLowerCase();
    return m.includes('404') || m.includes('not_found') || m.includes('not found') || m.includes('is not supported');
  }

  private avecDelai<T>(promesse: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const minuteur = setTimeout(() => reject(new Error(`délai de ${ms} ms dépassé`)), ms);
      promesse.then(
        (v) => { clearTimeout(minuteur); resolve(v); },
        (e) => { clearTimeout(minuteur); reject(e); },
      );
    });
  }

  private consigneSysteme(contexte: unknown, mode: AssistantMode): string {
    const format =
      'RÈGLES DE FORMAT — à respecter strictement :\n' +
      '- Réponds en français, de façon brève et directe.\n' +
      '- Mets en gras avec **…** les noms de services, de clients et les valeurs importantes.\n' +
      '- Toute énumération est une liste : chaque élément commence par "- " en tout début de ligne.\n' +
      "- Les éléments d'une même liste se suivent sans ligne vide entre eux.\n" +
      '- Ne produis ni tableau, ni titre, ni bloc de code.';

    if (mode === 'public') {
      return (
        "Tu es l'assistant du site de réservation, tu t'adresses à un visiteur.\n" +
        'Réponds UNIQUEMENT à partir du contexte JSON ci-dessous. ' +
        "N'invente aucun horaire, prix, service ni disponibilité. " +
        "Si l'information ne figure pas dans le contexte, dis-le et invite à contacter l'établissement.\n" +
        'Les prix du contexte sont en centimes : divise-les par 100 et affiche-les en DA.\n' +
        format + '\n\nContexte : ' + JSON.stringify(contexte)
      );
    }

    return (
      "Tu es l'assistant interne du professionnel connecté. Tu l'aides à piloter son activité.\n" +
      'Réponds UNIQUEMENT à partir du contexte JSON ci-dessous, qui contient ses propres données. ' +
      "N'invente aucun rendez-vous, client, chiffre ni créneau : si la donnée est absente du contexte, dis-le simplement. " +
      "Ne suggère jamais d'action sur les données d'un autre professionnel.\n" +
      'Les prix du contexte sont en centimes : divise-les par 100 et affiche-les en DA.\n' +
      format + '\n\nContexte : ' + JSON.stringify(contexte)
    );
  }

  /* ----------------------------------------------------------- Contexte --- */

  /** Contexte du visiteur : ce que le site publie déjà, rien de plus. */
  private async contextePublic(professionnelId?: string) {
    const [config, professionnels, services] = await Promise.all([
      this.prisma.systemConfig.findFirst(),
      this.prisma.professionnel.findMany({
        where: { user: { statutCompte: 'ACTIF' } },
        select: { nom: true, specialite: true, description: true, adresse: true, telephone: true },
      }),
      this.prisma.service.findMany({
        where: professionnelId
          ? { professionnelId, actif: true }
          : { actif: true, professionnel: { user: { statutCompte: 'ACTIF' } } },
        select: {
          nom: true,
          description: true,
          prix: true,
          dureeMinutes: true,
          professionnel: { select: { nom: true } },
        },
        take: 50,
      }),
    ]);

    return {
      horaires: config?.horairesGeneraux || 'non renseignés',
      joursOuvrables: (config?.joursOuvrables || []).join(', ') || 'non renseignés',
      adresse: config?.address || 'non renseignée',
      telephone: config?.phone || 'non renseigné',
      email: config?.email || 'non renseigné',
      professionnels,
      services,
      conditionsReservation:
        config?.conditions ||
        "La réservation se fait sans création de compte. Après confirmation, le client reçoit un code de gestion unique qui lui permet d'annuler ou de modifier son rendez-vous. Un délai minimum avant le rendez-vous peut s'appliquer.",
      procedureReservation:
        "Pour prendre rendez-vous : choisir un service, puis une date et un créneau disponible, renseigner ses coordonnées (nom, prénom, téléphone, e-mail), accepter les conditions et confirmer. Un code de gestion est envoyé immédiatement.",
      procedureGestionRdv:
        "Pour annuler ou modifier un rendez-vous : cliquer sur « Gérer mon rendez-vous », puis saisir le code de gestion reçu à la confirmation.",
    };
  }

  /**
   * Contexte du professionnel : son activité réelle, bornée. On envoie ce qui
   * permet de répondre aux questions courantes, pas la base entière — un
   * contexte qui enfle coûte des jetons et dilue la réponse.
   */
  private async contextePro(professionnelId: string) {
    const maintenant = new Date();
    const debutJour = new Date(maintenant); debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date(maintenant); finJour.setHours(23, 59, 59, 999);
    const finSemaine = new Date(debutJour.getTime() + 7 * 86400000);

    const rdvChamps = {
      dateDebut: true,
      dateFin: true,
      statut: true,
      client: { select: { nom: true, prenom: true, telephone: true } },
      service: { select: { nom: true } },
    };
    const aplatir = (r: any) => ({
      date: r.dateDebut.toLocaleDateString('fr-FR'),
      heure: r.dateDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      client: `${r.client.prenom} ${r.client.nom}`,
      telephone: r.client.telephone,
      service: r.service.nom,
      statut: r.statut,
    });

    const [pro, services, dispos, indispos, duJour, semaine, prochains, parStatut, clients, absences, params] =
      await Promise.all([
        this.prisma.professionnel.findUnique({
          where: { id: professionnelId },
          select: { nom: true, specialite: true, adresse: true, telephone: true },
        }),
        this.prisma.service.findMany({
          where: { professionnelId },
          select: { nom: true, prix: true, dureeMinutes: true, actif: true },
          orderBy: { nom: 'asc' },
        }),
        this.prisma.disponibilite.findMany({
          where: { professionnelId },
          select: { jourSemaine: true, heureDebut: true, heureFin: true },
          orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
        }),
        this.prisma.indisponibilite.findMany({
          where: { professionnelId, dateFin: { gte: debutJour } },
          select: { dateDebut: true, dateFin: true, motif: true },
          orderBy: { dateDebut: 'asc' },
          take: 10,
        }),
        this.prisma.rendezVous.findMany({
          where: { professionnelId, statut: { not: 'ANNULE' }, dateDebut: { gte: debutJour, lte: finJour } },
          select: rdvChamps,
          orderBy: { dateDebut: 'asc' },
        }),
        this.prisma.rendezVous.findMany({
          where: { professionnelId, statut: { not: 'ANNULE' }, dateDebut: { gte: debutJour, lt: finSemaine } },
          select: rdvChamps,
          orderBy: { dateDebut: 'asc' },
          take: 40,
        }),
        this.prisma.rendezVous.findMany({
          where: { professionnelId, statut: 'RESERVE', dateDebut: { gt: maintenant } },
          select: rdvChamps,
          orderBy: { dateDebut: 'asc' },
          take: 10,
        }),
        this.prisma.rendezVous.groupBy({ by: ['statut'], where: { professionnelId }, _count: { _all: true } }),
        this.prisma.rendezVous.groupBy({ by: ['clientId'], where: { professionnelId } }),
        this.prisma.rendezVous.groupBy({
          by: ['clientId'],
          where: { professionnelId, statut: 'ABSENT' },
          _count: { _all: true },
        }),
        this.prisma.parametresReservation.findUnique({ where: { professionnelId } }),
      ]);

    // Le classement des services se fait en mémoire : les rendez-vous sont déjà chargés.
    const parService = new Map<string, number>();
    for (const r of semaine) parService.set(r.service.nom, (parService.get(r.service.nom) ?? 0) + 1);

    const seuil = params?.seuilAbsences ?? 2;
    const idsAbsents = absences.filter((a) => a._count._all >= seuil).map((a) => a.clientId);
    const clientsAbsents = idsAbsents.length
      ? await this.prisma.client.findMany({
          where: { id: { in: idsAbsents } },
          select: { id: true, nom: true, prenom: true, telephone: true },
        })
      : [];

    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    return {
      dateDuJour: maintenant.toLocaleDateString('fr-FR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      }),
      heureActuelle: maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      profil: pro,
      services,
      disponibilitesHebdomadaires: dispos.map((d) => ({
        jour: jours[d.jourSemaine] ?? `jour ${d.jourSemaine}`,
        de: d.heureDebut,
        a: d.heureFin,
      })),
      indisponibilitesAVenir: indispos.map((i) => ({
        du: i.dateDebut.toLocaleDateString('fr-FR'),
        au: i.dateFin.toLocaleDateString('fr-FR'),
        motif: i.motif,
      })),
      rendezVousDuJour: duJour.map(aplatir),
      rendezVousDes7Jours: semaine.map(aplatir),
      prochainsRendezVous: prochains.map(aplatir),
      totauxParStatut: Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all])),
      nombreDeClientsSuivis: clients.length,
      servicesLesPlusReservesCetteSemaine: [...parService.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([nom, n]) => ({ nom, reservations: n })),
      seuilAbsences: seuil,
      clientsAuDelaDuSeuilDAbsences: clientsAbsents.map((c) => ({
        client: `${c.prenom} ${c.nom}`,
        telephone: c.telephone,
        absences: absences.find((a) => a.clientId === c.id)?._count._all ?? 0,
      })),
      parametresReservation: params,
    };
  }

  private async fallbackPublic(question: string, professionnelId?: string) {
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

  // ============================================================
  // MODE PROFESSIONNEL (section II.20 du CDC)
  //
  // Assistant personnalisé selon l'activité, les services, le planning et les
  // clients du professionnel connecté. Le `professionnelId` provient toujours
  // de la session — jamais de la requête — et toutes les données renvoyées
  // proviennent de la base : l'assistant ne doit rien inventer.
  // ============================================================
  private async fallbackPro(question: string, professionnelId: string) {
    const q = (question || '').toLowerCase();
    const now = new Date();
    const debutJour = new Date(now); debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date(now); finJour.setHours(23, 59, 59, 999);

    const fmtHeure = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nomClient = (r: any) => `${r.client.prenom} ${r.client.nom}`;

    // --- Rendez-vous du jour ---
    if (q.includes("aujourd") || (q.includes('jour') && !q.includes('semaine'))) {
      const rdvs = await this.prisma.rendezVous.findMany({
        where: { professionnelId, statut: { not: 'ANNULE' }, dateDebut: { gte: debutJour, lte: finJour } },
        include: { client: true, service: true },
        orderBy: { dateDebut: 'asc' },
      });
      if (!rdvs.length) return { answer: "Vous n'avez aucun rendez-vous aujourd'hui." };
      return {
        answer:
          `Vous avez ${rdvs.length} rendez-vous aujourd'hui : ` +
          rdvs.map((r) => `${fmtHeure(r.dateDebut)} ${nomClient(r)} (${r.service.nom})`).join(' · '),
      };
    }

    // --- Rendez-vous de la semaine ---
    if (q.includes('semaine')) {
      const finSemaine = new Date(debutJour.getTime() + 7 * 86400000);
      const rdvs = await this.prisma.rendezVous.findMany({
        where: { professionnelId, statut: { not: 'ANNULE' }, dateDebut: { gte: debutJour, lt: finSemaine } },
        include: { client: true, service: true },
        orderBy: { dateDebut: 'asc' },
      });
      if (!rdvs.length) return { answer: 'Aucun rendez-vous prévu dans les 7 prochains jours.' };
      return {
        answer:
          `${rdvs.length} rendez-vous sur les 7 prochains jours : ` +
          rdvs.slice(0, 10).map((r) => `${fmtDate(r.dateDebut)} ${fmtHeure(r.dateDebut)} — ${nomClient(r)}`).join(' · '),
      };
    }

    // --- Prochains rendez-vous ---
    if (q.includes('prochain') || q.includes('venir') || q.includes('suivant')) {
      const rdvs = await this.prisma.rendezVous.findMany({
        where: { professionnelId, statut: 'RESERVE', dateDebut: { gt: now } },
        include: { client: true, service: true },
        orderBy: { dateDebut: 'asc' },
        take: 5,
      });
      if (!rdvs.length) return { answer: 'Aucun rendez-vous à venir programmé.' };
      return {
        answer:
          'Vos prochains rendez-vous : ' +
          rdvs.map((r) => `${fmtDate(r.dateDebut)} à ${fmtHeure(r.dateDebut)} — ${nomClient(r)} (${r.service.nom})`).join(' · '),
      };
    }

    // --- Créneaux disponibles ---
    if (q.includes('créneau') || q.includes('creneau') || q.includes('disponib') || q.includes('libre')) {
      const dispos = await this.prisma.disponibilite.findMany({ where: { professionnelId }, orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }] });
      if (!dispos.length) return { answer: "Vous n'avez encore défini aucune disponibilité. Ajoutez-en depuis l'Agenda." };
      const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      const parJour = new Map<number, string[]>();
      for (const d of dispos) {
        if (!parJour.has(d.jourSemaine)) parJour.set(d.jourSemaine, []);
        parJour.get(d.jourSemaine)!.push(`${d.heureDebut}–${d.heureFin}`);
      }
      return {
        answer:
          'Vos disponibilités hebdomadaires : ' +
          [...parJour.entries()].map(([j, plages]) => `${jours[j]} ${plages.join(', ')}`).join(' · '),
      };
    }

    // --- Services ---
    if (q.includes('service') || q.includes('prestation') || q.includes('tarif') || q.includes('prix')) {
      const services = await this.prisma.service.findMany({ where: { professionnelId }, orderBy: { nom: 'asc' } });
      if (!services.length) return { answer: "Vous n'avez encore créé aucun service." };
      const compte = await this.prisma.rendezVous.groupBy({
        by: ['serviceId'],
        where: { professionnelId, statut: { not: 'ANNULE' } },
        _count: { _all: true },
      });
      const top = compte.sort((a, b) => b._count._all - a._count._all)[0];
      const topNom = top ? services.find((s) => s.id === top.serviceId)?.nom : null;
      const liste = services
        .map((s) => `${s.nom} (${s.dureeMinutes} min${s.prix != null ? `, ${(s.prix / 100).toLocaleString('fr-FR')} DA` : ''}${s.actif ? '' : ' — inactif'})`)
        .join(' · ');
      return {
        answer:
          `Vous proposez ${services.length} service(s) : ${liste}.` +
          (topNom ? ` Le plus réservé est « ${topNom} » avec ${top._count._all} rendez-vous.` : ''),
      };
    }

    // --- Absences répétées ---
    if (q.includes('absen') || q.includes('no-show') || q.includes('no show')) {
      const params = await this.prisma.parametresReservation.findUnique({ where: { professionnelId } });
      const seuil = params?.seuilAbsences ?? 2;
      const absences = await this.prisma.rendezVous.groupBy({
        by: ['clientId'],
        where: { professionnelId, statut: 'ABSENT' },
        _count: { _all: true },
      });
      const concernes = absences.filter((a) => a._count._all >= seuil);
      if (!concernes.length) return { answer: `Aucun client n'a atteint le seuil de ${seuil} absence(s).` };
      const clients = await this.prisma.client.findMany({ where: { id: { in: concernes.map((c) => c.clientId) } } });
      return {
        answer:
          `${concernes.length} client(s) au-delà du seuil de ${seuil} absence(s) : ` +
          concernes
            .map((c) => {
              const cl = clients.find((x) => x.id === c.clientId);
              return `${cl ? `${cl.prenom} ${cl.nom}` : 'client inconnu'} (${c._count._all})`;
            })
            .join(' · '),
      };
    }

    // --- Annulations ---
    if (q.includes('annul')) {
      const n = await this.prisma.rendezVous.count({ where: { professionnelId, statut: 'ANNULE' } });
      return { answer: `${n} rendez-vous ont été annulés au total.` };
    }

    // --- Terminés / activité ---
    if (q.includes('termin') || q.includes('activit') || q.includes('bilan') || q.includes('résum') || q.includes('resum') || q.includes('statis')) {
      const [total, termines, annules, clients] = await Promise.all([
        this.prisma.rendezVous.count({ where: { professionnelId } }),
        this.prisma.rendezVous.count({ where: { professionnelId, statut: 'TERMINE' } }),
        this.prisma.rendezVous.count({ where: { professionnelId, statut: 'ANNULE' } }),
        this.prisma.rendezVous.groupBy({ by: ['clientId'], where: { professionnelId } }),
      ]);
      return {
        answer: `Votre activité : ${total} rendez-vous au total, dont ${termines} terminé(s) et ${annules} annulé(s), pour ${clients.length} client(s) suivi(s).`,
      };
    }

    // --- Recherche d'un client par nom ---
    if (q.includes('client')) {
      const motsVides = new Set(['client', 'clients', 'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'mes', 'sur', 'pour', 'combien', 'quel', 'quels', 'qui', 'est', 'a', 'ai', 'je', 'ma', 'mon']);
      const termes = q.replace(/[?!.,]/g, ' ').split(/\s+/).filter((m) => m.length > 2 && !motsVides.has(m));
      if (termes.length) {
        const trouves = await this.prisma.rendezVous.findMany({
          where: {
            professionnelId,
            client: { OR: termes.flatMap((t) => [{ nom: { contains: t, mode: 'insensitive' as const } }, { prenom: { contains: t, mode: 'insensitive' as const } }]) },
          },
          include: { client: true, service: true },
          orderBy: { dateDebut: 'desc' },
          take: 5,
        });
        if (trouves.length) {
          const c = trouves[0].client;
          return {
            answer:
              `${c.prenom} ${c.nom} — ${c.telephone}${c.email ? ` · ${c.email}` : ''}. ` +
              `${trouves.length} rendez-vous trouvé(s) : ` +
              trouves.map((r) => `${fmtDate(r.dateDebut)} ${r.service.nom} (${r.statut})`).join(' · '),
          };
        }
      }
      const clients = await this.prisma.rendezVous.groupBy({ by: ['clientId'], where: { professionnelId } });
      return { answer: `Vous suivez actuellement ${clients.length} client(s). Précisez un nom pour consulter une fiche.` };
    }

    return {
      answer:
        "Je peux vous renseigner sur vos rendez-vous (aujourd'hui, cette semaine, à venir), vos créneaux et disponibilités, " +
        'vos services, vos clients, les absences répétées ou un bilan de votre activité. Que souhaitez-vous savoir ?',
    };
  }
}


