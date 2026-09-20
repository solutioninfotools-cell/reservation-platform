import { api } from './client';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  register: (data: {
    email: string;
    password: string;
    role: 'PROFESSIONNEL' | 'RECEPTIONNISTE';
    nom: string;
    specialite?: string;
    telephone?: string;
  }) => api.post('/auth/register', data).then((r) => r.data),

  verifyEmail: (email: string, code: string) =>
    api.post('/auth/verify-email', { email, code }).then((r) => r.data),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }).then((r) => r.data),

  /**
   * Profil de la session, relu côté serveur. Sert à revalider une session
   * persistée : le rôle et le statut ne sont jamais repris du localStorage.
   */
  me: () => api.get('/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (email: string, code: string, password: string) =>
    api.post('/auth/reset-password', { email, code, password }).then((r) => r.data),
};
