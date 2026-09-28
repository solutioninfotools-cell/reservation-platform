export interface Plage {
  heureDebut: string; // "HH:mm"
  heureFin: string;   // "HH:mm"
}

/**
 * Fusionne les plages horaires d'une même journée : elles sont triées, et celles
 * qui se chevauchent ou se touchent deviennent une seule plage. Évite qu'un même
 * horaire soit compté (ou proposé) plusieurs fois quand la base contient des
 * disponibilités en doublon ou qui se recoupent.
 * Les "HH:mm" se comparent correctement comme du texte.
 */
export function fusionnerPlages(plages: Plage[]): Plage[] {
  const triees = plages
    .filter((p) => p.heureDebut < p.heureFin)
    .map((p) => ({ heureDebut: p.heureDebut, heureFin: p.heureFin }))
    .sort((a, b) => (a.heureDebut < b.heureDebut ? -1 : a.heureDebut > b.heureDebut ? 1 : 0));

  const resultat: Plage[] = [];
  for (const p of triees) {
    const derniere = resultat[resultat.length - 1];
    if (derniere && p.heureDebut <= derniere.heureFin) {
      if (p.heureFin > derniere.heureFin) derniere.heureFin = p.heureFin;
    } else {
      resultat.push(p);
    }
  }
  return resultat;
}