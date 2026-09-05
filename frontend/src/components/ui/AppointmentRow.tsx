import type { RendezVous } from '../../types';
import { fmtDateShort, fmtTime } from '../../utils/date';
import { StatusBadge } from './StatusBadge';

/**
 * Ligne de rendez-vous générique — utilisée par Professionnel, Réceptionniste
 * et Admin. `actions` permet à chaque espace d'ajouter ses propres boutons
 * (les actions elles-mêmes, avec leurs permissions, restent dans chaque page).
 */
export function AppointmentRow({ r, showDate, actions }: { r: RendezVous; showDate?: boolean; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-line last:border-b-0 text-sm">
      <div className="w-16 text-xs font-bold text-ink-soft shrink-0">{showDate ? fmtDateShort(r.dateDebut) : fmtTime(r.dateDebut)}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{r.client.prenom} {r.client.nom}</div>
        <div className="text-xs text-ink-soft truncate">{r.service.nom}</div>
      </div>
      <StatusBadge statut={r.statut} />
      {actions}
    </div>
  );
}
