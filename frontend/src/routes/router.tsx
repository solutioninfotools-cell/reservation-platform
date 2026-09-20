import { createBrowserRouter } from 'react-router-dom';
import InitialSetup from '../pages/setup/InitialSetup';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import VerifyEmail from '../pages/auth/VerifyEmail';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import CrenoPagePublique from '../pages/CrenoPagePublique';
import ClientManageRdv from '../pages/client/ClientManageRdv';
import AdminDashboard from '../pages/AdminDashboard';
import ProfessionnelDashboard from '../pages/ProfessionnelDashboard';
import ReceptionnisteDashboard from '../pages/ReceptionnisteDashboard';
import Error401 from '../pages/errors/Error401';
import Error403 from '../pages/errors/Error403';
import Error404 from '../pages/errors/Error404';
import Error500 from '../pages/errors/Error500';
import ErrorNetwork from '../pages/errors/ErrorNetwork';
import { RequireAuth } from '../guards/RequireAuth';
import { RequireRole } from '../guards/RequireRole';

export const router = createBrowserRouter([
  { path: '/', element: <CrenoPagePublique /> },
  { path: '/rdv/:token', element: <ClientManageRdv /> },
  { path: '/configuration', element: <InitialSetup /> },
  { path: '/connexion', element: <Login /> },
  { path: '/inscription', element: <Register /> },
  { path: '/verification-email', element: <VerifyEmail /> },
  { path: '/mot-de-passe-oublie', element: <ForgotPassword /> },
  { path: '/reinitialiser-mot-de-passe', element: <ResetPassword /> },

  {
    element: <RequireAuth />,
    children: [
      { element: <RequireRole role="ADMIN" />, children: [{ path: '/admin', element: <AdminDashboard /> }] },
      // Segment optionnel : une seule définition de route, donc une seule
      // instance du composant. Deux `path` distincts provoqueraient un
      // démontage/remontage à chaque changement d'onglet, ce qui relancerait le
      // moteur d'affichage et réinitialiserait l'état de l'espace.
      { element: <RequireRole role="PROFESSIONNEL" />, children: [{ path: '/professionnel/:page?', element: <ProfessionnelDashboard /> }] },
      { element: <RequireRole role="RECEPTIONNISTE" />, children: [{ path: '/receptionniste', element: <ReceptionnisteDashboard /> }] },
    ],
  },

  { path: '/erreur/401', element: <Error401 /> },
  { path: '/erreur/403', element: <Error403 /> },
  { path: '/erreur/404', element: <Error404 /> },
  { path: '/erreur/500', element: <Error500 /> },
  { path: '/erreur/reseau', element: <ErrorNetwork /> },
  { path: '*', element: <Error404 /> },
]);
