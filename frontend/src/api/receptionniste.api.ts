import { api } from './client';

export const receptionnisteApi = {
  affectations: () => api.get('/receptionniste/affectations').then((r) => r.data),
  detectClient: (params: { telephone?: string; nom?: string; dateNaissance?: string }) =>
    api.get('/receptionniste/detect-client', { params }).then((r) => r.data),
  creerRdv: (data: any) => api.post('/receptionniste/rendez-vous', data).then((r) => r.data),
  clients: (professionnelId: string, search?: string) =>
    api.get('/receptionniste/clients', { params: { professionnelId, search } }).then((r) => r.data),
};
