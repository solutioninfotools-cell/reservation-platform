import { api } from './client';

/**
 * Espace Administrateur — toutes les fonctionnalités du cahier des charges :
 * gestion des comptes, affectations, clients, réservations, services, agendas,
 * paramètres généraux, domaines d'activité, statistiques, journal d'audit, exports.
 * Le backend reste l'unique autorité (rôles vérifiés côté serveur).
 */
export const adminApi = {
  // ---- Professionnels ----
  listPros: (params?: { statut?: string; search?: string; domaineId?: string }) =>
    api.get('/admin/professionnels', { params }).then((r) => r.data),
  getPro: (id: string) => api.get(`/admin/professionnels/${id}`).then((r) => r.data),
  updatePro: (
    id: string,
    data: Partial<{ nom: string; specialite: string; telephone: string; adresse: string; description: string; photoUrl: string }>,
  ) => api.patch(`/admin/professionnels/${id}`, data).then((r) => r.data),

  // `null` détache le professionnel de tout domaine.
  setProDomaine: (id: string, domaineId: string | null) =>
    api.patch(`/admin/professionnels/${id}/domaine`, { domaineId }).then((r) => r.data),

  // ---- Réceptionnistes ----
  listRecs: (params?: { statut?: string; search?: string }) =>
    api.get('/admin/receptionnistes', { params }).then((r) => r.data),
  getRec: (id: string) => api.get(`/admin/receptionnistes/${id}`).then((r) => r.data),
  updateRec: (id: string, data: Partial<{ nom: string; telephone: string }>) =>
    api.patch(`/admin/receptionnistes/${id}`, data).then((r) => r.data),
  setAffectations: (receptionnisteId: string, professionnelIds: string[]) =>
    api.put(`/admin/receptionnistes/${receptionnisteId}/affectations`, { professionnelIds }).then((r) => r.data),

  // ---- Comptes ----
  setStatut: (userId: string, statut: 'EN_ATTENTE' | 'ACTIF' | 'REFUSE' | 'DESACTIVE') =>
    api.patch(`/admin/comptes/${userId}/statut`, { statut }).then((r) => r.data),
  setStatutGroupe: (userIds: string[], statut: 'EN_ATTENTE' | 'ACTIF' | 'REFUSE' | 'DESACTIVE') =>
    api.patch('/admin/comptes/statut-groupe', { userIds, statut }).then((r) => r.data),
  createCompte: (data: {
    email: string;
    password: string;
    role: 'PROFESSIONNEL' | 'RECEPTIONNISTE' | 'ADMIN';
    nom: string;
    telephone?: string;
    specialite?: string;
    domaineId?: string;
  }) => api.post('/admin/comptes', data).then((r) => r.data),
  resetPassword: (userId: string, password: string) =>
    api.patch(`/admin/comptes/${userId}/mot-de-passe`, { password }).then((r) => r.data),
  updateEmail: (userId: string, email: string) =>
    api.patch(`/admin/comptes/${userId}/email`, { email }).then((r) => r.data),
  deleteCompte: (userId: string) => api.delete(`/admin/comptes/${userId}`).then((r) => r.data),
  listUsers: (params?: { role?: string; search?: string }) =>
    api.get('/admin/users', { params }).then((r) => r.data),

  // ---- Affectations ----
  affecter: (professionnelId: string, receptionnisteId: string) =>
    api.post('/admin/affectations', { professionnelId, receptionnisteId }).then((r) => r.data),
  desaffecter: (professionnelId: string, receptionnisteId: string) =>
    api.delete('/admin/affectations', { data: { professionnelId, receptionnisteId } }).then((r) => r.data),
  updatePermissions: (
    affectationId: string,
    permissions: Partial<{
      peutConsulterAgenda: boolean;
      peutGererRdv: boolean;
      peutGererPlanning: boolean;
      peutGererParametres: boolean;
    }>,
  ) => api.patch(`/admin/affectations/${affectationId}/permissions`, permissions).then((r) => r.data),

  // ---- Domaines d'activité ----
  listDomaines: () => api.get('/admin/domaines').then((r) => r.data),
  createDomaine: (data: { nom: string; description?: string; actif?: boolean; ordre?: number }) =>
    api.post('/admin/domaines', data).then((r) => r.data),
  updateDomaine: (id: string, data: Partial<{ nom: string; description: string; actif: boolean; ordre: number }>) =>
    api.patch(`/admin/domaines/${id}`, data).then((r) => r.data),
  deleteDomaine: (id: string) => api.delete(`/admin/domaines/${id}`).then((r) => r.data),

  // ---- Annonces (notification interne diffusée par l'Admin) ----
  envoyerAnnonce: (data: {
    cible: 'TOUS' | 'PROFESSIONNELS' | 'RECEPTIONNISTES' | 'SELECTION';
    message: string;
    userIds?: string[];
  }) => api.post('/admin/annonces', data).then((r) => r.data),

  // ---- Clients ----
  listClients: (search?: string) => api.get('/admin/clients', { params: { search } }).then((r) => r.data),
  getClient: (id: string) => api.get(`/admin/clients/${id}`).then((r) => r.data),
  updateClient: (
    id: string,
    data: Partial<{ nom: string; prenom: string; telephone: string; email: string; adresse: string; dateNaissance: string }>,
  ) => api.patch(`/admin/clients/${id}`, data).then((r) => r.data),
  deleteClient: (id: string) => api.delete(`/admin/clients/${id}`).then((r) => r.data),

  // ---- Réservations ----
  listRdv: (params?: {
    statut?: string;
    professionnelId?: string;
    serviceId?: string;
    from?: string;
    to?: string;
    search?: string;
    take?: number;
    skip?: number;
  }) => api.get('/admin/rendez-vous', { params }).then((r) => r.data),
  getRdv: (id: string) => api.get(`/admin/rendez-vous/${id}`).then((r) => r.data),
  annulerRdv: (id: string, motif?: string) =>
    api.patch(`/admin/rendez-vous/${id}/annuler`, { motif }).then((r) => r.data),
  deplacerRdv: (id: string, dateDebut: string) =>
    api.patch(`/admin/rendez-vous/${id}/deplacer`, { dateDebut }).then((r) => r.data),

  // ---- Services ---- (actif = publié, statut = disponibilité affichée au client)
  listServices: (params?: { search?: string; professionnelId?: string; actif?: string; statut?: string }) =>
    api.get('/admin/services', { params }).then((r) => r.data),
  setServiceActif: (id: string, actif: boolean) =>
    api.patch(`/admin/services/${id}/actif`, { actif }).then((r) => r.data),
  setServiceStatut: (id: string, statut: 'DISPONIBLE' | 'COMPLET' | 'INDISPONIBLE') =>
    api.patch(`/admin/services/${id}/statut`, { statut }).then((r) => r.data),
  deleteService: (id: string) => api.delete(`/admin/services/${id}`).then((r) => r.data),

  // ---- Agendas ----
  listAgendas: () => api.get('/admin/agendas').then((r) => r.data),
  getAgenda: (professionnelId: string, date?: string) =>
    api.get(`/admin/agendas/${professionnelId}`, { params: { date } }).then((r) => r.data),

  // ---- Absences et indisponibilités (tous professionnels) ----
  listIndisponibilites: (params?: { professionnelId?: string; from?: string; to?: string; type?: string }) =>
    api.get('/admin/indisponibilites', { params }).then((r) => r.data),

  // ---- Paramètres généraux ----
  getParams: () => api.get('/admin/params').then((r) => r.data),
  updateParams: (data: Record<string, unknown>) => api.patch('/admin/params', data).then((r) => r.data),

  // ---- Statistiques & audit ----
  stats: () => api.get('/admin/stats').then((r) => r.data),
  audit: (params?: {
    action?: string;
    userId?: string;
    professionnelId?: string;
    from?: string;
    to?: string;
    take?: number;
    skip?: number;
  }) => api.get('/admin/audit', { params }).then((r) => r.data),

  // ---- Notifications (flux générique du compte connecté) ----
  notifications: () => api.get('/notifications').then((r) => r.data),
  markNotificationsRead: () => api.patch('/notifications/read-all').then((r) => r.data),

  // ---- Exports CSV ----
  // `params` reprend les filtres affichés : l'export porte sur ce que l'on voit.
  downloadExport: async (entity: string, filename: string, params?: Record<string, unknown>) => {
    const res = await api.get(`/admin/export/${entity}`, { responseType: 'blob', params });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
