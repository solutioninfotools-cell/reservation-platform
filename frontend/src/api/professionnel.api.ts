import { api } from './client';

export const professionnelApi = {
  moi: () => api.get('/professionnel/moi').then((r) => r.data),
  updateProfil: (data: any) => api.patch('/professionnel/profil', data).then((r) => r.data),

  listServices: () => api.get('/professionnel/services').then((r) => r.data),
  createService: (data: any) => api.post('/professionnel/services', data).then((r) => r.data),
  updateService: (id: string, data: any) => api.patch(`/professionnel/services/${id}`, data).then((r) => r.data),
  deleteService: (id: string) => api.delete(`/professionnel/services/${id}`).then((r) => r.data),

  listDisponibilites: () => api.get('/professionnel/disponibilites').then((r) => r.data),
  addDisponibilite: (data: any) => api.post('/professionnel/disponibilites', data).then((r) => r.data),
  removeDisponibilite: (id: string) => api.delete(`/professionnel/disponibilites/${id}`).then((r) => r.data),

  listIndisponibilites: () => api.get('/professionnel/indisponibilites').then((r) => r.data),
  addIndisponibilite: (data: any) => api.post('/professionnel/indisponibilites', data).then((r) => r.data),

  listReceptionnistes: () => api.get('/professionnel/receptionnistes').then((r) => r.data),
  updatePermissions: (affectationId: string, data: any) =>
    api.patch(`/professionnel/receptionnistes/${affectationId}/permissions`, data).then((r) => r.data),

  stats: () => api.get('/professionnel/stats').then((r) => r.data),
};

export const appointmentsApi = {
  list: (params: Record<string, string | undefined>) => api.get('/appointments', { params }).then((r) => r.data),
  findOne: (id: string) => api.get(`/appointments/${id}`).then((r) => r.data),
  updateStatus: (id: string, statut: string, motif?: string) => api.patch(`/appointments/${id}/status`, { statut, motif }).then((r) => r.data),
  reschedule: (id: string, dateDebut: string) => api.patch(`/appointments/${id}/reschedule`, { dateDebut }).then((r) => r.data),
};
