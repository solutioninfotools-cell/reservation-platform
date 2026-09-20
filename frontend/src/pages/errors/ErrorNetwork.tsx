import { ErrorPage } from './ErrorPage';

/** Page mémorisée avant la redirection, pour y revenir après un nouvel essai. */
const CLE_RETOUR = 'rendezvousapp-retour';

export default function ErrorNetwork() {
  /**
   * Le message invite à réessayer : encore faut-il pouvoir le faire.
   * On recharge complètement la page d'origine — un simple `navigate` ne
   * relancerait pas les requêtes déjà en échec dans les composants montés.
   */
  function reessayer() {
    let destination = '/';
    try {
      destination = sessionStorage.getItem(CLE_RETOUR) || '/';
      sessionStorage.removeItem(CLE_RETOUR);
    } catch {
      /* stockage indisponible : on repart de l'accueil */
    }
    window.location.href = destination;
  }

  return (
    <ErrorPage
      code="⚡"
      title="Impossible de contacter le serveur"
      message="Vérifiez votre connexion internet, ou réessayez dans quelques instants."
      action={{ label: 'Réessayer', onClick: reessayer }}
    />
  );
}
