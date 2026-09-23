/**
 * Graphiques de l'Espace Professionnel — SVG écrit à la main, sans dépendance.
 *
 * Choix de formes (CDC II.18) :
 *   · compteurs (rendez-vous, terminés, annulés…)  → tuiles, pas de graphique ;
 *   · évolution dans le temps                      → aire, une seule série ;
 *   · services les plus réservés                   → barres horizontales, une teinte ;
 *   · taux d'occupation                            → jauge (ratio contre une limite).
 *
 * Toutes les formes sont MONOCHROMES à dessein. Les six couleurs de statut de
 * l'application échouent au test de séparation pour daltonisme lorsqu'elles se
 * touchent (vert « Terminé » contre orange « En cours » : ΔE 2,5 en protanopie).
 * Le sens ne repose donc jamais sur la teinte : les libellés, les valeurs
 * affichées et le tableau de données portent l'information.
 */

const ENCRE = 'var(--ink)';
const ENCRE_DOUCE = 'var(--ink-soft)';
const TRAIT = 'var(--line)';
const ACCENT = 'var(--primary)';
const SURFACE = 'var(--card)';

/** Échappe le texte venu de l'API avant insertion dans le SVG. */
export function esc(v: unknown): string {
  const table: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return String(v ?? '').replace(/[&<>"']/g, (c) => table[c]);
}

/** Graduations « rondes » et hauteur d'échelle associée. */
function graduations(max: number, nb = 4): { ticks: number[]; haut: number } {
  if (max <= 0) return { ticks: [0, 1], haut: 1 };
  const brut = max / nb;
  const magnitude = Math.pow(10, Math.floor(Math.log10(brut)));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((v) => v >= brut) ?? magnitude * 10;
  const haut = Math.ceil(max / pas) * pas;
  const ticks: number[] = [];
  for (let v = 0; v <= haut + 1e-9; v += pas) ticks.push(Math.round(v * 100) / 100);
  return { ticks, haut };
}

export function libelleDate(cle: string, pas: string): string {
  if (pas === 'mois') {
    const [a, m] = cle.split('-').map(Number);
    return new Date(a, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
  }
  const [a, m, j] = cle.split('-').map(Number);
  return new Date(a, m - 1, j).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/* ------------------------------------------------------------------ Aire --- */

export interface PointSerie { date: string; total: number; termines: number }

/**
 * Évolution des rendez-vous. Une seule série, donc aucune légende : le titre du
 * bloc nomme déjà ce qui est tracé. Le survol passe par des bandes larges — le
 * lecteur vise une date, jamais un trait de 2 px.
 */
export function aireEvolution(points: PointSerie[], pas: string): string {
  if (!points.length) return '<div class="table-empty">Aucune donnée sur cette période</div>';

  const L = 1040, H = 250;
  const mG = 44, mD = 16, mH = 18, mB = 30;
  const pl = L - mG - mD, ph = H - mH - mB;
  const max = Math.max(...points.map((p) => p.total));
  const { ticks, haut } = graduations(max);

  const x = (i: number) => mG + (points.length === 1 ? pl / 2 : (i / (points.length - 1)) * pl);
  const y = (v: number) => mH + ph - (v / haut) * ph;

  const ligne = points.map((p, i) => `${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
  const aire = `${mG},${mH + ph} ${ligne} ${x(points.length - 1).toFixed(1)},${mH + ph}`;

  const grille = ticks.map((t) => {
    const yy = y(t).toFixed(1);
    return `<line x1="${mG}" y1="${yy}" x2="${L - mD}" y2="${yy}" stroke="${TRAIT}" stroke-width="1"/>`
      + `<text x="${mG - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${ENCRE_DOUCE}"`
      + ` style="font-variant-numeric:tabular-nums">${t}</text>`;
  }).join('');

  // Une graduation sur n : l'axe respire, il ne porte jamais toutes les dates.
  // La dernière n'est posée que si elle ne chevauche pas la précédente.
  const saut = Math.max(1, Math.ceil(points.length / 8));
  const dernierIndex = points.length - 1;
  const dernierMarque = Math.floor(dernierIndex / saut) * saut;
  const placeLibre = x(dernierIndex) - x(dernierMarque) > 46;
  const absc = points.map((p, i) => {
    const marque = i % saut === 0 ? i !== dernierIndex || placeLibre : i === dernierIndex && placeLibre;
    if (!marque) return '';
    return `<text x="${x(i).toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="11" fill="${ENCRE_DOUCE}">${esc(libelleDate(p.date, pas))}</text>`;
  }).join('');

  // Zones de survol : une bande par point, bien plus large que la marque.
  const larg = points.length === 1 ? pl : pl / (points.length - 1);
  const zones = points.map((p, i) => {
    const info = `${libelleDate(p.date, pas)}|${p.total}|${p.termines}`;
    return `<rect class="gr-zone" x="${(x(i) - larg / 2).toFixed(1)}" y="${mH}" width="${larg.toFixed(1)}" height="${ph}"`
      + ` fill="transparent" tabindex="0" role="img"`
      + ` data-x="${x(i).toFixed(1)}" data-y="${y(p.total).toFixed(1)}"`
      + ` aria-label="${esc(libelleDate(p.date, pas))} : ${p.total} rendez-vous, dont ${p.termines} terminés"`
      + ` data-info="${esc(info)}"></rect>`;
  }).join('');

  const d = points.length - 1;

  return `
    <div class="gr-wrap" data-graphique="evolution">
      <svg viewBox="0 0 ${L} ${H}" class="gr-svg" role="img" aria-label="Évolution des rendez-vous sur la période">
        ${grille}
        <polygon points="${aire}" fill="${ACCENT}" opacity="0.10"/>
        <polyline points="${ligne}" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <line class="gr-repere" x1="0" y1="${mH}" x2="0" y2="${mH + ph}" stroke="${ACCENT}" stroke-width="1" opacity="0"/>
        <circle class="gr-point" r="4.5" fill="${ACCENT}" stroke="${SURFACE}" stroke-width="2" opacity="0"/>
        <circle cx="${x(d).toFixed(1)}" cy="${y(points[d].total).toFixed(1)}" r="4.5" fill="${ACCENT}" stroke="${SURFACE}" stroke-width="2"/>
        <text x="${(x(d) - 8).toFixed(1)}" y="${(y(points[d].total) - 10).toFixed(1)}" text-anchor="end"
              font-size="12" font-weight="700" fill="${ENCRE}">${points[d].total}</text>
        ${absc}${zones}
      </svg>
      <div class="gr-tooltip" hidden></div>
    </div>`;
}

/* ---------------------------------------------------------------- Barres --- */

export interface BarreService { nom: string; count: number }

/**
 * Services les plus réservés : magnitude comparée sur des catégories nommées.
 * Une seule teinte pour toutes les barres — un dégradé selon la valeur
 * ré-encoderait la longueur en couleur sans rien apprendre de plus.
 *
 * Rendu en HTML plutôt qu'en SVG : un viewBox mis à l'échelle grossissait
 * l'épaisseur des barres et la typographie avec la largeur du conteneur. Ici
 * les 20 px de barre restent 20 px, quelle que soit la taille de l'écran.
 */
export function barresServices(items: BarreService[]): string {
  if (!items.length) return '<div class="table-empty">Aucune réservation sur cette période</div>';

  const top = items.slice(0, 8);
  const max = Math.max(...top.map((s) => s.count));

  const barres = top
    .map((s) => {
      const pct = Math.max(2, (s.count / max) * 100);
      return `
        <div class="gr-bar" tabindex="0" role="img"
             aria-label="${esc(s.nom)} : ${s.count} réservations"
             data-info="${esc(s.nom + '|' + s.count)}">
          <span class="gr-bar-nom" title="${esc(s.nom)}">${esc(s.nom)}</span>
          <span class="gr-bar-piste"><span class="gr-bar-marque" style="width:${pct.toFixed(1)}%"></span></span>
          <span class="gr-bar-val">${s.count}</span>
        </div>`;
    })
    .join('');

  return `
    <div class="gr-wrap gr-bars" data-graphique="services">
      ${barres}
      <div class="gr-tooltip" hidden></div>
    </div>`;
}

/* ---------------------------------------------------------------- Jauge --- */

/**
 * Taux d'occupation : un ratio unique face à une limite. La piste non remplie
 * est une teinte claire de la même rampe, pour que l'état se lise sur toute la
 * barre — et non un camembert à deux parts.
 */
export function jaugeOccupation(taux: number): string {
  const t = Math.max(0, Math.min(100, Math.round(taux)));
  return `
    <div class="gr-jauge">
      <div class="gr-jauge-tete">
        <span class="gr-jauge-valeur">${t}<span class="gr-jauge-unite">%</span></span>
        <span class="gr-jauge-legende">des heures ouvertes sont réservées</span>
      </div>
      <div class="gr-jauge-piste" role="meter" aria-valuenow="${t}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Taux d'occupation des disponibilités">
        <div class="gr-jauge-remplissage" style="width:${t}%"></div>
      </div>
    </div>`;
}

/* -------------------------------------------------- Tableau équivalent --- */

/** Jumeau textuel d'un graphique : aucune valeur n'est accessible au seul survol. */
export function tableauDonnees(entetes: string[], lignes: (string | number)[][]): string {
  if (!lignes.length) return '';
  const th = entetes.map((h) => `<th>${esc(h)}</th>`).join('');
  const tr = lignes
    .map((l) => `<tr>${l.map((c) => `<td style="font-variant-numeric:tabular-nums">${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `
    <details class="gr-tableau">
      <summary>Voir les données</summary>
      <table class="data-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>
    </details>`;
}
