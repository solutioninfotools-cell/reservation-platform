import { api } from './client';

export const publicApi = {
  getEspace: () => api.get('/public/espace').then((r) => r.data),
  getServices: (professionnelId: string) => api.get(`/public/professionnels/${professionnelId}/services`).then((r) => r.data),
  getSlots: (professionnelId: string, serviceId: string, date: string) =>
    api.get(`/public/professionnels/${professionnelId}/creneaux`, { params: { serviceId, date } }).then((r) => r.data),
  createRdv: (data: any) => api.post('/public/rendez-vous', data).then((r) => r.data),
  getByToken: (token: string) => api.get(`/public/rendez-vous/${token}`).then((r) => r.data),
  cancelByToken: (token: string) => api.post(`/public/rendez-vous/${token}/annuler`).then((r) => r.data),
};

/**
 * Assistant IA.
 *
 * Aucun `professionnelId` n'est transmis : le backend ne l'accepte plus depuis
 * le corps de la requête. `ask` s'adresse au visiteur et le serveur résout
 * lui-même le professionnel de l'espace ; `askPro` exige une session
 * professionnelle et le serveur déduit le périmètre du jeton.
 */
export const assistantApi = {
  ask: (question: string) => api.post('/assistant/ask', { question }).then((r) => r.data),
  askPro: (question: string) => api.post('/assistant/pro', { question }).then((r) => r.data),
};
