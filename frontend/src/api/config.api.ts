import { api } from './client';

export const configApi = {
  getPublicConfig: () => api.get('/config').then((r) => r.data),
  initialSetup: (data: any) => api.post('/config/initial-setup', data).then((r) => r.data),
  resetSupervisor: (data: { nouveauMode: 'ADMIN' | 'PRESTATAIRE'; password: string }) =>
    api.patch('/config/reset-supervisor', data).then((r) => r.data),
};
