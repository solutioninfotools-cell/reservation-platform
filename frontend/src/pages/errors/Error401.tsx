import { ErrorPage } from './ErrorPage';

export default function Error401() {
  return <ErrorPage code="401" title="Non authentifié" message="Votre session a expiré ou vous n'êtes pas connecté. Merci de vous reconnecter pour continuer." />;
}
