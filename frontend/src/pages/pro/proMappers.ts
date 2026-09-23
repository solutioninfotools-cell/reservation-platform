/**
 * Traduction entre les formes du backend et celles attendues par le moteur
 * d'affichage de l'Espace Professionnel.
 *
 * Le moteur (hérité, impératif) manipule des structures nommées en anglais et
 * en heures locales ; l'API parle en `dureeMinutes`, `prix` en centimes,
 * `actif`, dates ISO et `{nom, prenom}` séparés. Concentrer la conversion ici
 * permet de brancher les vraies données sans réécrire les fonctions de rendu.
 */

/* ---------------------------------------------------------------- Dates --- */

/** AAAA-MM-JJ dans le fuseau LOCAL (`toISOString()` décalerait d'un jour en UTC+1). */
export function isoLocalDate(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function heureLocale(d: Date): string {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** Combine une date (AAAA-MM-JJ) et une heure (HH:MM) locales en instant ISO. */
export function versISO(date: string, heure: string): string {
  const [a, m, j] = date.split('-').map(Number);
  const [h, min] = heure.split(':').map(Number);
  return new Date(a, m - 1, j, h, min, 0, 0).toISOString();
}

/* -------------------------------------------------------------- Statuts --- */

/** Les 6 statuts du CDC, avec leur rendu visuel. `cls` réutilise les classes CSS existantes. */
export const STATUTS: Record<string, { label: string; cls: string; color: string }> = {
  RESERVE: { label: 'Réservé', cls: 'st-reserve', color: '#8957FF' },
  CLIENT_ARRIVE: { label: 'Client arrivé', cls: 'st-arrive', color: '#2FA79D' },
  EN_COURS: { label: 'En cours', cls: 'st-encours', color: '#E2954A' },
  TERMINE: { label: 'Terminé', cls: 'st-termine', color: '#3FA65C' },
  ABSENT: { label: 'Absent', cls: 'st-absent', color: '#8A8496' },
  ANNULE: { label: 'Annulé', cls: 'st-annule', color: '#D9483C' },
};

/**
 * Transitions autorisées, identiques à `STATUT_SUIVANT` du backend.
 * Dupliquées ici uniquement pour n'afficher que les actions possibles : le
 * serveur reste l'autorité et rejette toute transition invalide en 400.
 */
export const TRANSITIONS: Record<string, string[]> = {
  RESERVE: ['CLIENT_ARRIVE', 'EN_COURS', 'TERMINE', 'ABSENT', 'ANNULE'],
  CLIENT_ARRIVE: ['EN_COURS', 'TERMINE', 'ANNULE'],
  EN_COURS: ['TERMINE', 'ANNULE'],
  TERMINE: [],
  ABSENT: [],
  ANNULE: [],
};

export const ORIGINES: Record<string, string> = {
  EN_LIGNE: 'en ligne',
  RECEPTIONNISTE: 'réceptionniste',
  PROFESSIONNEL: 'professionnel',
};

/* ------------------------------------------------------------- Services --- */

/** Types de champs : valeurs de l'UI ↔ enum Prisma `TypeChamp`. */
export const TYPE_CHAMP_VERS_UI: Record<string, string> = {
  TEXTE: 'texte_court',
  TEXTE_LONG: 'texte_long',
  NOMBRE: 'nombre',
  SELECTION: 'liste',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  SWITCH: 'switch',
  DATE: 'date',
  FICHIER: 'fichier',
};
export const TYPE_CHAMP_VERS_API: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_CHAMP_VERS_UI).map(([api, ui]) => [ui, api]),
);

export function champVersUI(c: any) {
  return {
    id: c.id,
    label: c.label,
    type: TYPE_CHAMP_VERS_UI[c.type] ?? 'texte_court',
    required: !!c.obligatoire,
    options: c.options ?? [],
    defaultValue: c.valeurParDefaut ?? '',
    helpText: c.texteAide ?? '',
    conditions: Array.isArray(c.conditions) ? c.conditions.map((x: any) => ({ fieldId: x.champId, value: x.valeur })) : [],
    conditionLogic: c.conditionLogique ?? 'ET',
    requiredIfCondition: !!c.requisSiCondition,
    ordre: c.ordre ?? 0,
  };
}

export function champVersAPI(f: any, serviceId?: string) {
  return {
    ...(serviceId ? { serviceId } : {}),
    label: f.label,
    type: TYPE_CHAMP_VERS_API[f.type] ?? 'TEXTE',
    options: f.options ?? [],
    obligatoire: !!f.required,
    ordre: f.ordre ?? 0,
    valeurParDefaut: f.defaultValue || undefined,
    texteAide: f.helpText || undefined,
    conditions: (f.conditions ?? []).map((c: any) => ({ champId: c.fieldId, valeur: String(c.value ?? '') })),
    conditionLogique: f.conditionLogic ?? 'ET',
    requisSiCondition: !!f.requiredIfCondition,
  };
}

/** `prix` est stocké en centimes ; l'UI raisonne en dinars entiers. */
export function serviceVersUI(s: any) {
  return {
    id: s.id,
    name: s.nom,
    desc: s.description ?? '',
    duration: s.dureeMinutes,
    price: s.prix != null ? s.prix : 0,
    status: s.actif ? 'active' : 'inactive',
    imageUrl: s.imageUrl ?? '',
    customFields: (s.champsPersonnalises ?? []).map(champVersUI),
  };
}

export function serviceVersAPI(data: any) {
  return {
    nom: data.name,
    description: data.desc || undefined,
    dureeMinutes: data.duration,
    prix: data.price ? Math.round(data.price) : undefined,
    imageUrl: data.imageUrl || undefined,
    actif: data.status === 'active',
  };
}

/* --------------------------------------------------------- Rendez-vous --- */

export function rdvVersUI(r: any) {
  const debut = new Date(r.dateDebut);
  const fin = new Date(r.dateFin);
  return {
    id: r.id,
    clientId: r.clientId,
    client: `${r.client?.prenom ?? ''} ${r.client?.nom ?? ''}`.trim(),
    phone: r.client?.telephone ?? '',
    email: r.client?.email ?? '',
    dob: r.client?.dateNaissance ? isoLocalDate(new Date(r.client.dateNaissance)) : '',
    serviceId: r.serviceId,
    service: r.service?.nom ?? '',
    date: isoLocalDate(debut),
    start: heureLocale(debut),
    end: heureLocale(fin),
    status: r.statut,
    remark: r.motifAnnulation || r.remarque || '',
    createdAt: r.createdAt ? isoLocalDate(new Date(r.createdAt)) : '',
    source: ORIGINES[r.origine] ?? 'en ligne',
  };
}

/* ------------------------------------------------------ Disponibilités --- */

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/**
 * Le backend stocke une ligne par plage (`jourSemaine` 0 = lundi) ; le moteur
 * attend un objet par nom de jour. On conserve les ids pour pouvoir supprimer
 * ou modifier chaque plage individuellement.
 */
export function disposVersUI(list: any[]) {
  const out: Record<string, { on: boolean; ranges: { id: string; start: string; end: string }[] }> = {};
  for (const nom of JOURS) out[nom] = { on: false, ranges: [] };
  for (const d of list ?? []) {
    const nom = JOURS[d.jourSemaine];
    if (!nom) continue;
    out[nom].on = true;
    out[nom].ranges.push({ id: d.id, start: d.heureDebut, end: d.heureFin });
  }
  for (const nom of JOURS) out[nom].ranges.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

export function indispoVersUI(i: any) {
  return {
    id: i.id,
    type: (i.type ?? '').toLowerCase(),
    start: isoLocalDate(new Date(i.dateDebut)),
    end: isoLocalDate(new Date(i.dateFin)),
    motif: i.motif ?? '',
    notified: !!i.clientsNotifies,
  };
}

/* -------------------------------------------------------------- Équipe --- */

export function affectationVersUI(a: any) {
  return {
    id: a.id,
    name: a.receptionniste?.nom ?? '—',
    email: a.receptionniste?.user?.email ?? '',
    phone: a.receptionniste?.telephone ?? '',
    active: !!a.actif,
    statutCompte: a.receptionniste?.user?.statutCompte ?? 'ACTIF',
    perms: {
      agenda: !!a.peutConsulterAgenda,
      gererRdv: !!a.peutGererRdv,
      gererPlanning: !!a.peutGererPlanning,
      gererParametres: !!a.peutGererParametres,
    },
  };
}

export const PERM_VERS_API: Record<string, string> = {
  agenda: 'peutConsulterAgenda',
  gererRdv: 'peutGererRdv',
  gererPlanning: 'peutGererPlanning',
  gererParametres: 'peutGererParametres',
};

/* ------------------------------------------------------- Notifications --- */

/** Rapproche les types backend des pictogrammes déjà définis dans le moteur. */
export const NOTIF_TYPE_VERS_UI: Record<string, string> = {
  NOUVELLE_RESERVATION: 'new',
  ANNULATION: 'cancel',
  MODIFICATION: 'agenda',
  CHANGEMENT_STATUT: 'agenda',
  PROFESSIONNEL_ABSENT: 'agenda',
  RAPPEL: 'agenda',
  CONFLIT_PLANNING: 'cancel',
  COMPTE_VALIDE: 'receptionniste',
  COMPTE_REFUSE: 'cancel',
  AFFECTATION: 'receptionniste',
  AUTORISATIONS_MODIFIEES: 'perms',
};

/** « Il y a 20 min », « Hier »… à partir d'une date absolue. */
export function tempsRelatif(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j === 1) return 'Hier';
  if (j < 7) return `Il y a ${j} jours`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function notifVersUI(n: any) {
  return {
    id: n.id,
    type: NOTIF_TYPE_VERS_UI[n.type] ?? 'agenda',
    text: n.message,
    time: tempsRelatif(n.createdAt),
    unread: !n.lu,
  };
}

/* ----------------------------------------------------------- Paramètres --- */

export function parametresVersUI(p: any) {
  return {
    minGap: p?.intervalleMinutes ?? 10,
    minLead: p?.delaiMinHeures ?? 2,
    maxLead: p?.delaiMaxJours ?? 90,
    absenceThreshold: p?.seuilAbsences ?? 2,
    maxRdvPerClientDay: p?.maxRdvParClientParJour ?? 1,
  };
}

export function parametresVersAPI(p: any) {
  return {
    intervalleMinutes: p.minGap,
    delaiMinHeures: p.minLead,
    delaiMaxJours: p.maxLead,
    seuilAbsences: p.absenceThreshold,
    maxRdvParClientParJour: p.maxRdvPerClientDay,
  };
}

/* --------------------------------------------------------- Historique --- */

/** Libellés lisibles des actions journalisées (CDC II.17). */
export const LIBELLE_ACTION: Record<string, string> = {
  RDV_CREATED: 'Création d’une réservation',
  RDV_STATUS_CHANGED: 'Changement de statut',
  RDV_CANCELLED: 'Annulation d’une réservation',
  RDV_RESCHEDULED: 'Déplacement d’un rendez-vous',
  RDV_AUTO_CANCELLED_INDISPO: 'Annulations suite à une fermeture',
  SERVICE_CREATED: 'Création d’un service',
  SERVICE_UPDATED: 'Modification d’un service',
  SERVICE_TOGGLED: 'Activation/désactivation d’un service',
  SERVICE_DELETED: 'Suppression d’un service',
  SERVICE_ARCHIVED: 'Archivage d’un service',
  CHAMP_CREATED: 'Ajout d’un champ personnalisé',
  CHAMP_UPDATED: 'Modification d’un champ personnalisé',
  CHAMP_DELETED: 'Suppression d’un champ personnalisé',
  CRENEAU_CREATED: 'Ajout d’un créneau',
  CRENEAU_UPDATED: 'Modification d’un créneau',
  CRENEAU_DELETED: 'Suppression d’un créneau',
  INDISPO_CREATED: 'Fermeture d’une période',
  INDISPO_DELETED: 'Réouverture d’une période',
  INDISPO_CLIENTS_NOTIFIED: 'Notification des clients',
  PERMISSIONS_UPDATED: 'Modification des autorisations',
  RECEPTIONNISTE_ACTIVATED: 'Activation d’une réceptionniste',
  RECEPTIONNISTE_DEACTIVATED: 'Désactivation d’une réceptionniste',
  RECEPTIONNISTE_REMOVED: 'Retrait d’une réceptionniste',
  CLIENT_UPDATED: 'Modification d’un client',
  NOTE_CREATED: 'Ajout d’une note interne',
  NOTE_UPDATED: 'Modification d’une note interne',
  NOTE_DELETED: 'Suppression d’une note interne',
  PARAMETRES_UPDATED: 'Modification des paramètres de réservation',
  PROFIL_UPDATED: 'Modification du profil',
};

/* ---------------------------------------------------------- Erreurs API --- */

/** Message d'erreur exploitable à partir d'une erreur Axios. */
export function messageErreur(err: any, defaut = 'Une erreur est survenue.'): string {
  const data = err?.response?.data;
  if (!data) return defaut;
  if (Array.isArray(data.message)) return data.message.join(' · ');
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.error)) return data.error.join(' · ');
  if (typeof data.error === 'string') return data.error;
  return defaut;
}

/**
 * Résout l'adresse d'une image renvoyée par l'API.
 *
 * Une adresse déjà complète (image hébergée ailleurs, `data:`) passe telle
 * quelle. Les anciens chemins relatifs sont résolus contre l'origine de l'API.
 */
export function urlImage(chemin?: string | null): string {
  const v = (chemin ?? '').trim();
  if (!v) return '';
  if (/^(https?:)?\/\//i.test(v) || v.startsWith('data:')) return v;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
  return base + (v.startsWith('/') ? v : '/' + v);
}
