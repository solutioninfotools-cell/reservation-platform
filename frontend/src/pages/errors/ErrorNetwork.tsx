import { ErrorPage } from './ErrorPage';

export default function ErrorNetwork() {
  return <ErrorPage code="⚡" title="Impossible de contacter le serveur" message="Vérifiez votre connexion internet, ou réessayez dans quelques instants." />;
}
