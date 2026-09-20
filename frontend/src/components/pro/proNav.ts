/**
 * Source unique de vérité de la navigation de l'Espace Professionnel.
 *
 * Le moteur d'affichage historique raisonne en « clés de page »
 * (`agenda`, `clients`, `receptionnistes`…) qui correspondent aux `<section id="page-…">`.
 * La navbar et le routeur raisonnent, eux, en URLs. Ce fichier fait le pont
 * entre les deux dans les deux sens, pour qu'aucun des deux mondes n'ait à
 * connaître les conventions de l'autre.
 */

/** Clés de page comprises par le moteur d'affichage (`renderPage`). */
export type PageKey =
  | 'agenda'
  | 'clients'
  | 'services'
  | 'receptionnistes'
  | 'stats'
  | 'historique'
  | 'params'
  | 'notifs'
  | 'profil';

/** Mode d'ouverture demandé à l'Agenda par une URL alias. */
export interface AgendaIntent {
  mode?: 'calendrier' | 'liste';
  dispoPanel?: boolean;
}

interface RouteDef {
  /** Segment d'URL après `/professionnel`. Vide = page d'accueil de l'espace. */
  slug: string;
  page: PageKey;
  /** Intention transmise à l'Agenda pour les URLs alias (§20 du CDC). */
  agenda?: AgendaIntent;
  /** Ouvre la bulle Assistant IA par-dessus la page. */
  assistant?: boolean;
}

/**
 * `reservations` et `disponibilites` sont des alias : ils préservent les points
 * d'entrée des anciennes pages « Réservations » et « Disponibilités », désormais
 * fusionnées dans l'Agenda, sans dupliquer d'entrée dans la navbar.
 */
const ROUTES: RouteDef[] = [
  // L'Agenda est l'écran d'accueil : le professionnel arrive sur son planning.
  { slug: '', page: 'agenda' },
  { slug: 'agenda', page: 'agenda' },
  { slug: 'clients', page: 'clients' },
  { slug: 'services', page: 'services' },
  { slug: 'equipe', page: 'receptionnistes' },
  { slug: 'statistiques', page: 'stats' },
  { slug: 'historique', page: 'historique' },
  { slug: 'parametres', page: 'params' },
  // L'assistant est une bulle flottante, pas une page : l'URL historique est
  // conservée et ouvre le panneau par-dessus le tableau de bord.
  { slug: 'assistant', page: 'agenda', assistant: true },
  { slug: 'notifications', page: 'notifs' },
  { slug: 'profil', page: 'profil' },
  { slug: 'reservations', page: 'agenda', agenda: { mode: 'liste' } },
  { slug: 'disponibilites', page: 'agenda', agenda: { dispoPanel: true } },
];

export const PRO_BASE_PATH = '/professionnel';

/** Construit l'URL complète correspondant à un segment. */
export function proPath(slug: string): string {
  return slug ? `${PRO_BASE_PATH}/${slug}` : PRO_BASE_PATH;
}

/** Résout un segment d'URL. Renvoie `null` si le segment est inconnu. */
export function resolveSlug(slug: string | undefined): RouteDef | null {
  return ROUTES.find((r) => r.slug === (slug ?? '')) ?? null;
}

/**
 * Chemin canonique d'une clé de page — utilisé par `goToPage()` pour que les
 * `onclick="goToPage('…')"` déjà présents dans le HTML généré changent bien
 * l'URL. On prend la première définition, donc jamais un alias.
 */
export function pathForPage(page: PageKey): string {
  const def = ROUTES.find((r) => r.page === page);
  return proPath(def ? def.slug : '');
}

export interface NavEntry {
  slug: string;
  label: string;
  /** Contenu SVG (attributs `viewBox="0 0 24 24"`, `stroke="currentColor"`). */
  icon: string;
}

/** Entrées principales de la navbar — volontairement limitées à six. */
export const PRIMARY_NAV: NavEntry[] = [
  {
    slug: '',
    label: 'Agenda',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  },
  {
    slug: 'clients',
    label: 'Clients',
    icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  },
  {
    slug: 'services',
    label: 'Services',
    icon: '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  },
  {
    slug: 'equipe',
    label: 'Équipe',
    icon: '<path d="M20.5 14.9A9 9 0 1 0 9.1 3.5"/><path d="M12 8v4l3 3"/><circle cx="6" cy="16" r="2.5"/>',
  },
];

/** Menu « Plus » — fonctionnalités secondaires, pour ne pas surcharger la navbar. */
export const SECONDARY_NAV: NavEntry[] = [
  {
    slug: 'statistiques',
    label: 'Statistiques',
    icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  },
  {
    slug: 'historique',
    label: 'Historique',
    icon: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3.5 2"/>',
  },
  {
    slug: 'parametres',
    label: 'Paramètres de réservation',
    icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  },
];

/** Menu du compte, à droite de la navbar. */
export const ACCOUNT_NAV: NavEntry[] = [
  {
    slug: 'profil',
    label: 'Mon profil',
    icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  },
  {
    slug: 'parametres',
    label: 'Paramètres',
    icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  },
];

/** Initiales affichées dans l'avatar (2 lettres max). */
export function initialsOf(name: string): string {
  return name
    .replace(/^(Dr\.?|M\.|Mme|Mlle)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
