import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../api/client';

/**
 * Accès à l'espace Admin : compte Admin, ou professionnel superviseur (mode Prestataire).
 * Le droit réel est revérifié auprès du backend (état relu en base) : un ancien admin
 * désactivé, ou un professionnel qui n'est plus superviseur, est refusé même si sa
 * session locale est encore valide.
 */
export function RequireAdminSpace() {
  const { user } = useAuthStore();
  const [etat, setEtat] = useState<'verification' | 'ok' | 'refuse'>('verification');
  const autorise = !!user && (user.role === 'ADMIN' || user.role === 'PROFESSIONNEL');

  useEffect(() => {
    if (!autorise) return;
    let annule = false;
    api.get('/admin/acces').then(() => { if (!annule) setEtat('ok'); }).catch(() => { if (!annule) setEtat('refuse'); });
    return () => { annule = true; };
  }, [autorise]);

  if (!autorise || etat === 'refuse') return <Navigate to="/erreur/403" replace />;
  if (etat === 'verification') {
    return <div className="min-h-screen bg-paper flex items-center justify-center text-sm text-ink-soft">Vérification des droits…</div>;
  }
  return <Outlet />;
}