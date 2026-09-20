import { api } from './client';

/**
 * Flux de notifications du compte connecté (tous rôles).
 * Le backend filtre déjà sur le destinataire : aucun filtrage côté client.
 */
export const notificationsApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
};
