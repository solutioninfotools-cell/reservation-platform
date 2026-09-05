import type { StatutRdv } from '../../types';

export const STATUT_META: Record<StatutRdv, { label: string; cls: string }> = {
  RESERVE: { label: 'Réservé', cls: 'bg-primary-tint text-primary' },
  CLIENT_ARRIVE: { label: 'Client arrivé', cls: 'bg-teal-50 text-status-arrive' },
  EN_COURS: { label: 'En cours', cls: 'bg-orange-50 text-status-encours' },
  TERMINE: { label: 'Terminé', cls: 'bg-green-50 text-status-termine' },
  ABSENT: { label: 'Absent', cls: 'bg-gray-100 text-status-absent' },
  ANNULE: { label: 'Annulé', cls: 'bg-red-50 text-status-annule' },
};

/** Badge de statut générique — la seule source de vérité visuelle des statuts RDV. */
export function StatusBadge({ statut }: { statut: StatutRdv }) {
  const meta = STATUT_META[statut];
  return <span className={`status-pill ${meta.cls}`}>{meta.label}</span>;
}
