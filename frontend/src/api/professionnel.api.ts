import { api } from './client';

/**
 * Espace Professionnel. Toutes les routes sont scopées côté serveur au
 * professionnel authentifié : aucun identifiant de propriétaire n'est envoyé
 * depuis le frontend, et le backend reste l'unique autorité.
 */
export const professionnelApi = {
  moi: () => api.get('/professionnel/moi').then((r) => r.data),
  updateProfil: (data: Partial<{ nom: string; specialite: string; description: string; adresse: string; telephone: string; photoUrl: string }>) =>
    api.patch('/professionnel/profil', data).then((r) => r.data),

  // ---- Services (actif = publié, statut = disponibilité affichée au client) ----
  listServices: () => api.get('/professionnel/services').then((r) => r.data),
  createService: (data: { nom: string; description?: string; dureeMinutes: number; prix?: number }) =>
    api.post('/professionnel/services', data).then((r) => r.data),
  updateService: (
    id: string,
    data: Partial<{ nom: string; description: string; dureeMinutes: number; prix: number; actif: boolean; statut: 'DISPONIBLE' | 'COMPLET' | 'INDISPONIBLE' }>,
  ) => api.patch(`/professionnel/services/${id}`, data).then((r) => r.data),
  deleteService: (id: string) => api.delete(`/professionnel/services/${id}`).then((r) => r.data),

  // ---- Champs personnalisés d'un service ----
  listChamps: (serviceId?: string) => api.get('/professionnel/champs', { params: { serviceId } }).then((r) => r.data),
  createChamp: (data: Record<string, unknown>) => api.post('/professionnel/champs', data).then((r) => r.data),
  updateChamp: (id: string, data: Record<string, unknown>) => api.patch(`/professionnel/champs/${id}`, data).then((r) => r.data),
  deleteChamp: (id: string) => api.delete(`/professionnel/champs/${id}`).then((r) => r.data),

  // ---- Disponibilités hebdomadaires (jourSemaine : 0 = lundi … 6 = dimanche) ----
  listDisponibilites: () => api.get('/professionnel/disponibilites').then((r) => r.data),
  addDisponibilite: (data: { jourSemaine: number; heureDebut: string; heureFin: string }) =>
    api.post('/professionnel/disponibilites', data).then((r) => r.data),
  removeDisponibilite: (id: string) => api.delete(`/professionnel/disponibilites/${id}`).then((r) => r.data),

  // ---- Absences et fermetures ----
  listIndisponibilites: () => api.get('/professionnel/indisponibilites').then((r) => r.data),
  addIndisponibilite: (data: { type: 'CRENEAU' | 'JOURNEE' | 'PERIODE'; dateDebut: string; dateFin: string; motif?: string }) =>
    api.post('/professionnel/indisponibilites', data).then((r) => r.data),
  removeIndisponibilite: (id: string) => api.delete(`/professionnel/indisponibilites/${id}`).then((r) => r.data),

  // ---- Clients et notes internes ----
  listClients: (search?: string) => api.get('/professionnel/clients', { params: { search } }).then((r) => r.data),
  listNotes: (clientId?: string) => api.get('/professionnel/notes', { params: { clientId } }).then((r) => r.data),
  createNote: (clientId: string, texte: string) => api.post('/professionnel/notes', { clientId, texte }).then((r) => r.data),
  updateNote: (id: string, texte: string) => api.patch(`/professionnel/notes/${id}`, { texte }).then((r) => r.data),
  deleteNote: (id: string) => api.delete(`/professionnel/notes/${id}`).then((r) => r.data),

  // ---- Règles de réservation appliquées par le moteur de créneaux ----
  getParametres: () => api.get('/professionnel/parametres').then((r) => r.data),
  updateParametres: (
    data: Partial<{ intervalleMinutes: number; delaiMinHeures: number; delaiMaxJours: number; seuilAbsences: number; maxRdvParClientParJour: number }>,
  ) => api.patch('/professionnel/parametres', data).then((r) => r.data),

  // ---- Réceptionnistes affectées et leurs autorisations sur cet espace ----
  listReceptionnistes: () => api.get('/professionnel/receptionnistes').then((r) => r.data),
  updatePermissions: (
    affectationId: string,
    data: Partial<{ peutConsulterAgenda: boolean; peutGererRdv: boolean; peutGererPlanning: boolean; peutGererParametres: boolean; actif: boolean }>,
  ) => api.patch(`/professionnel/receptionnistes/${affectationId}/permissions`, data).then((r) => r.data),

  stats: () => api.get('/professionnel/stats').then((r) => r.data),
};

export const appointmentsApi = {
  list: (params: Record<string, string | undefined>) => api.get('/appointments', { params }).then((r) => r.data),
  findOne: (id: string) => api.get(`/appointments/${id}`).then((r) => r.data),
  updateStatus: (id: string, statut: string, motif?: string) =>
    api.patch(`/appointments/${id}/status`, { statut, motif }).then((r) => r.data),
  reschedule: (id: string, dateDebut: string) => api.patch(`/appointments/${id}/reschedule`, { dateDebut }).then((r) => r.data),
};
