import { api } from './client';

export const publicApi = {
  getEspace: () => api.get('/public/espace').then((r) => r.data),
  getServices: (professionnelId: string) => api.get(`/public/professionnels/${professionnelId}/services`).then((r) => r.data),
  getSlots: (professionnelId: string, serviceId: string, date: string) =>
    api.get(`/public/professionnels/${professionnelId}/creneaux`, { params: { serviceId, date } }).then((r) => r.data),
  createRdv: (data: any) => api.post('/public/rendez-vous', data).then((r) => r.data),
  getByToken: (token: string, email?: string) => api.get(`/public/rendez-vous/${token}`, { params: email ? { email } : {} }).then((r) => r.data),
  cancelByToken: (token: string) => api.post(`/public/rendez-vous/${token}/annuler`).then((r) => r.data),
  rescheduleByToken: (token: string, dateDebut: string) =>
    api.post(`/public/rendez-vous/${token}/modifier`, { dateDebut }).then((r) => r.data),
};

export const assistantApi = {
  // Le backend (ValidationPipe forbidNonWhitelisted) n'accepte que { question } :
  // tout autre champ (mode, professionnelId) provoque un 400.
  ask: (question: string) =>
    api.post('/assistant/ask', { question }).then((r) => r.data),
  // Assistant de l'espace Professionnel : le professionnel est déduit du JWT.
  askPro: (question: string) =>
    api.post('/assistant/pro', { question }).then((r) => r.data),
};