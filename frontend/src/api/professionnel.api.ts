import { api } from './client';

/**
 * Espace Professionnel — toutes ces routes sont scopées côté serveur au
 * professionnel authentifié : aucun `professionnelId` n'est transmis depuis le
 * navigateur.
 */
export const professionnelApi = {
  /**
   * Téléverse une image et renvoie son chemin relatif (`/uploads/…`).
   * Axios pose lui-même la frontière multipart : on ne fixe surtout pas
   * Content-Type à la main, sinon le boundary manque et le serveur refuse.
   */
  uploadImage: (fichier: File) => {
    const corps = new FormData();
    corps.append('file', fichier);
    return api.post('/uploads/image', corps).then((r) => r.data as { url: string });
  },

  moi: () => api.get('/professionnel/moi').then((r) => r.data),
  updateProfil: (data: any) => api.patch('/professionnel/profil', data).then((r) => r.data),

  listServices: () => api.get('/professionnel/services').then((r) => r.data),
  createService: (data: any) => api.post('/professionnel/services', data).then((r) => r.data),
  updateService: (id: string, data: any) => api.patch(`/professionnel/services/${id}`, data).then((r) => r.data),
  deleteService: (id: string) => api.delete(`/professionnel/services/${id}`).then((r) => r.data),

  // Champs personnalisés (constructeur de formulaire par service)
  listChamps: (serviceId?: string) =>
    api.get('/professionnel/champs-personnalises', { params: { serviceId } }).then((r) => r.data),
  createChamp: (data: any) => api.post('/professionnel/champs-personnalises', data).then((r) => r.data),
  updateChamp: (id: string, data: any) => api.patch(`/professionnel/champs-personnalises/${id}`, data).then((r) => r.data),
  deleteChamp: (id: string) => api.delete(`/professionnel/champs-personnalises/${id}`).then((r) => r.data),

  listDisponibilites: () => api.get('/professionnel/disponibilites').then((r) => r.data),
  addDisponibilite: (data: any) => api.post('/professionnel/disponibilites', data).then((r) => r.data),
  updateDisponibilite: (id: string, data: any) => api.patch(`/professionnel/disponibilites/${id}`, data).then((r) => r.data),
  removeDisponibilite: (id: string) => api.delete(`/professionnel/disponibilites/${id}`).then((r) => r.data),

  listIndisponibilites: () => api.get('/professionnel/indisponibilites').then((r) => r.data),
  addIndisponibilite: (data: any) => api.post('/professionnel/indisponibilites', data).then((r) => r.data),
  removeIndisponibilite: (id: string) => api.delete(`/professionnel/indisponibilites/${id}`).then((r) => r.data),
  notifierIndisponibilite: (id: string) => api.post(`/professionnel/indisponibilites/${id}/notifier`).then((r) => r.data),

  // Agenda
  listRendezVous: (params?: Record<string, string | undefined>) =>
    api.get('/professionnel/rendez-vous', { params }).then((r) => r.data),
  creerRendezVous: (data: any) => api.post('/professionnel/rendez-vous', data).then((r) => r.data),
  creneaux: (serviceId: string, date: string) =>
    api.get('/professionnel/creneaux', { params: { serviceId, date } }).then((r) => r.data),

  // Clients + notes internes
  listClients: (search?: string) => api.get('/professionnel/clients', { params: { search } }).then((r) => r.data),
  updateClient: (id: string, data: any) => api.patch(`/professionnel/clients/${id}`, data).then((r) => r.data),
  detectClient: (params: { telephone?: string; nom?: string; prenom?: string; dateNaissance?: string }) =>
    api.get('/professionnel/detect-client', { params }).then((r) => r.data),
  listNotes: (clientId: string) => api.get(`/professionnel/clients/${clientId}/notes`).then((r) => r.data),
  addNote: (clientId: string, texte: string) =>
    api.post(`/professionnel/clients/${clientId}/notes`, { texte }).then((r) => r.data),
  updateNote: (noteId: string, texte: string) => api.patch(`/professionnel/notes/${noteId}`, { texte }).then((r) => r.data),
  deleteNote: (noteId: string) => api.delete(`/professionnel/notes/${noteId}`).then((r) => r.data),

  // Équipe
  listReceptionnistes: () => api.get('/professionnel/receptionnistes').then((r) => r.data),
  updatePermissions: (affectationId: string, data: any) =>
    api.patch(`/professionnel/receptionnistes/${affectationId}/permissions`, data).then((r) => r.data),
  setReceptionnisteActive: (affectationId: string, actif: boolean) =>
    api.patch(`/professionnel/receptionnistes/${affectationId}/actif`, { actif }).then((r) => r.data),
  retirerReceptionniste: (affectationId: string) =>
    api.delete(`/professionnel/receptionnistes/${affectationId}`).then((r) => r.data),

  // Paramètres de réservation
  getParametres: () => api.get('/professionnel/parametres').then((r) => r.data),
  updateParametres: (data: any) => api.patch('/professionnel/parametres', data).then((r) => r.data),

  historique: (params?: { action?: string; take?: number }) =>
    api.get('/professionnel/historique', { params }).then((r) => r.data),

  stats: (params?: { periode?: string; du?: string; au?: string }) =>
    api.get('/professionnel/stats', { params }).then((r) => r.data),

  assistant: (question: string) => api.post('/assistant/pro', { question }).then((r) => r.data),
};

export const notificationsApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
};

export const appointmentsApi = {
  list: (params: Record<string, string | undefined>) => api.get('/appointments', { params }).then((r) => r.data),
  findOne: (id: string) => api.get(`/appointments/${id}`).then((r) => r.data),
  updateStatus: (id: string, statut: string, motif?: string) =>
    api.patch(`/appointments/${id}/status`, { statut, motif }).then((r) => r.data),
  reschedule: (id: string, dateDebut: string) =>
    api.patch(`/appointments/${id}/reschedule`, { dateDebut }).then((r) => r.data),
};
