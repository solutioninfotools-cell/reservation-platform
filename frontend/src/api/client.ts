import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

/**
 * Client API central. Le backend est toujours l'autorité finale (section 9 du CDC) :
 * ce client ne fait qu'attacher le token JWT et rediriger proprement en cas
 * d'erreur d'authentification/autorisation — aucune règle métier ici.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

/** Routes d'authentification : leurs erreurs sont affichées dans le formulaire. */
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/me',
];

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url ?? '';
    const isAuthRoute = AUTH_ROUTES.some((r) => url.includes(r));

    if (!error.response) {
      // Une requête annulée (navigation, démontage d'un composant) n'est pas une
      // panne réseau : la traiter comme telle éjecterait l'utilisateur à tort.
      if (error.code === 'ERR_CANCELED') return Promise.reject(error);

      // Erreur réseau — page dédiée (section 28 du CDC). On mémorise la page en
      // cours pour que le bouton « Réessayer » y ramène plutôt qu'à l'accueil.
      if (window.location.pathname !== '/erreur/reseau') {
        try {
          sessionStorage.setItem('rendezvousapp-retour', window.location.pathname + window.location.search);
        } catch {
          /* stockage indisponible : le retour se fera vers l'accueil */
        }
        window.location.href = '/erreur/reseau';
      }
    } else if (error.response.status === 401) {
      // Une 401 sur une route d'authentification est un retour normal du
      // formulaire (identifiants invalides, compte en attente, code expiré…) :
      // elle doit être affichée à l'utilisateur, pas déclencher une redirection.
      if (!isAuthRoute) {
        // Session expirée ou compte désactivé entre-temps par l'Admin :
        // on nettoie la session et on renvoie vers la connexion.
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/connexion') {
          window.location.href = '/connexion';
        }
      }
    } else if (error.response.status === 403 && !isAuthRoute) {
      window.location.href = '/erreur/403';
    } else if (error.response.status === 500) {
      window.location.href = '/erreur/500';
    }
    return Promise.reject(error);
  },
);
