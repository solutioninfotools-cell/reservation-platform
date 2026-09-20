import { ErrorPage } from './ErrorPage';

export default function Error500() {
  return <ErrorPage code="500" title="Erreur serveur" message="Une erreur inattendue est survenue de notre côté. Merci de réessayer dans quelques instants." />;
}
