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

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (!error.response) {
      // Erreur réseau — page dédiée (section 28 du CDC)
      window.location.href = '/erreur/reseau';
    } else if (error.response.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/erreur/401';
    } else if (error.response.status === 403) {
      window.location.href = '/erreur/403';
    } else if (error.response.status === 500) {
      window.location.href = '/erreur/500';
    }
    return Promise.reject(error);
  },
);
