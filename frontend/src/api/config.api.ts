import { api } from './client';

export const configApi = {
  getPublicConfig: () => api.get('/config').then((r) => r.data),
  initialSetup: (data: any) => api.post('/config/initial-setup', data).then((r) => r.data),

  // Mode de supervision (Admin ou professionnel superviseur)
  getSupervision: () => api.get('/config/supervision').then((r) => r.data),
  versPrestataire: (data: { professionnelUserId: string; password: string }) =>
    api.post('/config/supervision/vers-prestataire', data).then((r) => r.data),
  versAdmin: (data: { nom?: string; email?: string; motDePasseAdmin?: string; password: string }) =>
    api.post('/config/supervision/vers-admin', data).then((r) => r.data),
  reinitialisationTotale: (data: { password: string; confirmation: string }) =>
    api.post('/config/reinitialisation-totale', data).then((r) => r.data),
};