import { ErrorPage } from './ErrorPage';

export default function Error404() {
  return <ErrorPage code="404" title="Page introuvable" message="La page que vous cherchez n'existe pas ou a été déplacée." />;
}
