import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export function RequireAuth() {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/connexion" replace />;
  return <Outlet />;
}
