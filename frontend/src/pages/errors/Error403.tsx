import { ErrorPage } from './ErrorPage';

export default function Error403() {
  return <ErrorPage code="403" title="Accès refusé" message="Vous n'avez pas les permissions nécessaires pour accéder à cette page." />;
}
