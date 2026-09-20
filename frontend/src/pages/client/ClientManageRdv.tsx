import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../../api/public.api';
import { Button } from '../../components/ui/Button';

/** Page indépendante — gestion d'un rendez-vous par le client via son lien unique (sans compte). */
export default function ClientManageRdv() {
  const { token } = useParams();
  const [rdv, setRdv] = useState<any>(null);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (token) publicApi.getByToken(token).then(setRdv).catch(() => setError('Rendez-vous introuvable.'));
  }, [token]);

  async function cancel() {
    if (!token || !confirm('Confirmer l\'annulation de ce rendez-vous ?')) return;
    try {
      await publicApi.cancelByToken(token);
      setCancelled(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Impossible d'annuler ce rendez-vous.");
    }
  }

  if (error) return <div className="min-h-screen bg-paper flex items-center justify-center text-sm text-status-annule">{error}</div>;
  if (!rdv) return <div className="min-h-screen bg-paper flex items-center justify-center text-sm text-ink-soft">Chargement…</div>;

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white border border-line rounded-xl2 shadow-xl p-8 text-center">
        <h1 className="text-lg font-extrabold mb-2">Votre rendez-vous</h1>
        <p className="text-sm text-ink-soft mb-1">{rdv.service?.nom}</p>
        <p className="text-sm font-bold mb-6">
          {new Date(rdv.dateDebut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {new Date(rdv.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {cancelled || rdv.statut === 'ANNULE' ? (
          <div className="text-status-annule text-sm font-bold">Ce rendez-vous est annulé.</div>
        ) : rdv.statut === 'RESERVE' ? (
          <Button variant="danger" onClick={cancel} className="w-full justify-center">Annuler le rendez-vous</Button>
        ) : (
          <div className="text-xs text-ink-soft">Ce rendez-vous ne peut plus être modifié (statut : {rdv.statut}).</div>
        )}
      </div>
    </div>
  );
}
