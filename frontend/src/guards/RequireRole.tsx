import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import type { Role } from '../types';

/**
 * Vérification de rôle côté frontend : améliore l'UX (masque les routes
 * interdites) mais ne remplace jamais la vérification côté backend, qui reste
 * l'autorité finale (section 9 du CDC).
 */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuthStore();
  if (!user || user.role !== role) return <Navigate to="/erreur/403" replace />;
  return <Outlet />;
}
