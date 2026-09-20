export type Role = 'ADMIN' | 'PROFESSIONNEL' | 'RECEPTIONNISTE';

export type StatutCompte = 'EN_ATTENTE' | 'ACTIF' | 'REFUSE' | 'DESACTIVE';

export type StatutRdv = 'RESERVE' | 'CLIENT_ARRIVE' | 'EN_COURS' | 'TERMINE' | 'ABSENT' | 'ANNULE';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface Service {
  id: string;
  nom: string;
  description?: string | null;
  dureeMinutes: number;
  prix?: number | null;
  actif: boolean;
}

export interface RendezVous {
  id: string;
  professionnelId: string;
  serviceId: string;
  clientId: string;
  dateDebut: string;
  dateFin: string;
  statut: StatutRdv;
  remarque?: string | null;
  client: { nom: string; prenom: string; telephone: string; email?: string | null };
  service: { nom: string; dureeMinutes: number; prix?: number | null };
}

export interface Disponibilite {
  id: string;
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
}

export interface Affectation {
  id: string;
  professionnelId: string;
  peutConsulterAgenda: boolean;
  peutGererRdv: boolean;
  peutGererPlanning: boolean;
  peutGererParametres: boolean;
  receptionniste?: { nom: string; user: { email: string; statutCompte: StatutCompte } };
  professionnel?: { nom: string };
}
