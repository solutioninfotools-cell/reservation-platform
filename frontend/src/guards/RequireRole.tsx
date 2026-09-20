import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import type { Role } from '../types';

/** Tableau de bord correspondant à chaque rôle. */
const ACCUEIL_PAR_ROLE: Record<Role, string> = {
  ADMIN: '/admin',
  PROFESSIONNEL: '/professionnel',
  RECEPTIONNISTE: '/receptionniste',
};

/**
 * Vérification de rôle côté frontend : améliore l'UX (masque les routes
 * interdites) mais ne remplace jamais la vérification côté backend, qui reste
 * l'autorité finale (section 9 du CDC).
 *
 * Un utilisateur connecté avec un autre rôle est renvoyé vers SON espace plutôt
 * que vers une page 403 sans issue. La 403 est réservée au cas où le rôle reçu
 * ne correspond à aucun espace connu — signe d'une incohérence de session ou
 * d'une API qui ne renvoie pas les rôles attendus.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/connexion" replace />;
  if (user.role === role) return <Outlet />;

  const accueil = ACCUEIL_PAR_ROLE[user.role];
  return <Navigate to={accueil ?? '/erreur/403'} replace />;
}
