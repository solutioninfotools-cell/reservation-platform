import { useNavigate } from 'react-router-dom';

/** Action supplémentaire mise en avant sur la page (ex. « Réessayer »). */
export interface ErrorAction {
  label: string;
  onClick: () => void;
}

/**
 * Composant de base réutilisé par les 5 pages d'erreur (section 28 du CDC).
 * Chaque page d'erreur reste un fichier indépendant ; ce composant ne contient
 * que la mise en page commune (icône, code, message, boutons).
 */
export function ErrorPage({
  code,
  title,
  message,
  action,
}: {
  code: string;
  title: string;
  message: string;
  action?: ErrorAction;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary-tint text-primary flex items-center justify-center mx-auto mb-6 text-3xl font-extrabold">
          {code}
        </div>
        <h1 className="text-2xl font-extrabold text-ink mb-2">{title}</h1>
        <p className="text-ink-soft text-sm mb-8">{message}</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border border-line bg-white text-ink text-sm font-semibold hover:bg-paper transition"
          >
            Retour
          </button>
          <button
            onClick={() => navigate('/')}
            className={
              action
                ? 'px-5 py-2.5 rounded-xl border border-line bg-white text-ink text-sm font-semibold hover:bg-paper transition'
                : 'px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition'
            }
          >
            Accueil
          </button>
          {/* L'action principale, quand elle existe, prend la couleur d'accent. */}
          {action && (
            <button
              onClick={action.onClick}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
