import { api } from './client';

export const adminApi = {
  listPros: (statut?: string) => api.get('/admin/professionnels', { params: { statut } }).then((r) => r.data),
  listRecs: (statut?: string) => api.get('/admin/receptionnistes', { params: { statut } }).then((r) => r.data),
  setStatut: (userId: string, statut: 'ACTIF' | 'REFUSE' | 'DESACTIVE') =>
    api.patch(`/admin/comptes/${userId}/statut`, { statut }).then((r) => r.data),
  affecter: (professionnelId: string, receptionnisteId: string) =>
    api.post('/admin/affectations', { professionnelId, receptionnisteId }).then((r) => r.data),
  getParams: () => api.get('/admin/params').then((r) => r.data),
  updateParams: (data: any) => api.patch('/admin/params', data).then((r) => r.data),
  stats: () => api.get('/admin/stats').then((r) => r.data),
  audit: (action?: string) => api.get('/admin/audit', { params: { action } }).then((r) => r.data),
};
