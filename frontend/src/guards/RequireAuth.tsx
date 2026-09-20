import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { authApi } from '../api/auth.api';

/**
 * Vérifie qu'une session existe, puis la REVALIDE auprès du backend.
 *
 * Le token et le profil sont persistés dans le localStorage : sans cet appel,
 * un compte désactivé ou refusé par l'Admin garderait l'interface affichée
 * jusqu'à l'expiration du JWT. Le rôle réellement appliqué est celui renvoyé
 * par le serveur, jamais celui stocké dans le navigateur.
 */
export function RequireAuth() {
  const location = useLocation();
  const { accessToken, user, setSession, logout } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let annule = false;
    if (!accessToken) {
      setChecked(true);
      return;
    }
    authApi
      .me()
      .then((profil) => {
        if (annule) return;
        // Resynchronise le profil local sur la vérité du serveur.
        setSession(accessToken, { id: profil.id, email: profil.email, role: profil.role });
      })
      .catch(() => {
        if (!annule) logout();
      })
      .finally(() => {
        if (!annule) setChecked(true);
      });
    return () => {
      annule = true;
    };
    // Revalidé à chaque changement de page protégée.
  }, [accessToken, location.pathname]);

  if (!accessToken) return <Navigate to="/connexion" replace />;

  if (!checked && !user) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-sm font-semibold text-ink-soft">Vérification de votre session…</div>
      </div>
    );
  }

  return <Outlet />;
}
