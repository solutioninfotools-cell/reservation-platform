import { api } from './client';

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (data: { email: string; password: string; role: 'PROFESSIONNEL' | 'RECEPTIONNISTE'; nom: string; specialite?: string; telephone?: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  verifyEmail: (email: string, code: string) => api.post('/auth/verify-email', { email, code }).then((r) => r.data),
};
