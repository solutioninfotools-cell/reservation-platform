import { useEffect, useRef, useState } from 'react';
import { useAssistant } from '../../hooks/useAssistant';

type Props = {
  mode?: 'public' | 'pro';
  title?: string;
  /** Message d'accueil ; à défaut, celui du mode. */
  greeting?: string;
  /** Questions proposées d'un clic, sous la conversation. */
  suggestions?: string[];
  /** Pictogramme de la pastille et des messages. */
  icone?: 'chat' | 'robot';
};

/**
 * Bulle de discussion avec l'Assistant IA, partagée par l'espace public et
 * l'Espace Professionnel.
 *
 * Le composant ne porte aucune couleur : il expose des classes stables
 * (`assistant-fab`, `assistant-panel`, `assistant-msg-bubble`…) que chaque page
 * habille à sa main. C'est ce qui permet à la même discussion d'être une
 * étiquette accueillante sur le site public et une pastille ronde dans
 * l'Espace Professionnel, sans dupliquer la logique.
 *
 * Le rendu du texte est volontairement minimal — gras `**…**` et listes `- ` —
 * parce que c'est exactement le format imposé au modèle par la consigne système
 * du backend. Tout est inséré comme **texte** par React : une réponse du modèle,
 * ou un nom de client venu de la base, ne peut pas injecter de balise.
 *
 * La page peut ouvrir le panneau à distance en émettant `assistant:ouvrir` sur
 * `window` — c'est ce qui permet à une URL (`/professionnel/assistant`) ou à un
 * bouton situé ailleurs dans la page de déclencher la même discussion.
 */

const ICONE_CHAT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const ICONE_ROBOT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 8V4" />
    <circle cx="12" cy="3" r="1.4" />
    <circle cx="9" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
    <path d="M9.5 17h5" />
    <path d="M2 12.5v3" />
    <path d="M22 12.5v3" />
  </svg>
);

const CROIX = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CORBEILLE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
  </svg>
);

/** Découpe `**gras**` sans jamais passer par `innerHTML`. */
function rendreEnLigne(texte: string, cle: number) {
  const morceaux = texte.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span key={cle}>
      {morceaux.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
      )}
    </span>
  );
}

function rendreMessage(contenu: string) {
  return contenu.split(/\n\s*\n/).map((bloc, i) => {
    const lignes = bloc.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lignes.length) return null;

    const estListe = lignes.every((l) => l.startsWith('- ') || l.startsWith('• '));
    if (estListe) {
      return (
        <ul className="assistant-msg-list" key={i}>
          {lignes.map((l, j) => (
            <li key={j}>{rendreEnLigne(l.replace(/^[-•]\s*/, ''), j)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p className="assistant-msg-para" key={i}>
        {lignes.map((l, j) => (
          <span key={j}>
            {rendreEnLigne(l, j)}
            {j < lignes.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

export function AssistantWidget({
  mode = 'public',
  title = 'Assistant IA',
  greeting,
  suggestions,
  icone = 'chat',
}: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState('');
  const { messages, send, reset, loading } = useAssistant(mode, greeting);
  const corps = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);

  const PICTO = icone === 'robot' ? ICONE_ROBOT : ICONE_CHAT;

  // Ouverture déclenchée depuis un autre endroit de la page (URL, bouton…).
  useEffect(() => {
    const ouvrir = () => setOuvert(true);
    window.addEventListener('assistant:ouvrir', ouvrir);
    return () => window.removeEventListener('assistant:ouvrir', ouvrir);
  }, []);

  // Échap ferme, comme toute surcouche de la plateforme.
  useEffect(() => {
    if (!ouvert) return;
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    window.addEventListener('keydown', auClavier);
    champ.current?.focus();
    return () => window.removeEventListener('keydown', auClavier);
  }, [ouvert]);

  // La conversation suit toujours le dernier message.
  useEffect(() => {
    if (corps.current) corps.current.scrollTop = corps.current.scrollHeight;
  }, [messages, loading]);

  const envoyer = (texte: string) => {
    setSaisie('');
    send(texte);
    champ.current?.focus();
  };

  return (
    <>
      <button
        className={`assistant-fab${ouvert ? ' est-ouvert' : ''}`}
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-label={ouvert ? "Fermer l'assistant IA" : `Discuter avec ${title}`}
        title={`Parler à ${title}`}
      >
        <span className="assistant-fab-avatar">{ouvert ? CROIX : PICTO}</span>
        <span className="assistant-fab-label">
          <span className="assistant-fab-label-top">Besoin d'aide ?</span>
          <span className="assistant-fab-label-sub">Discuter avec {title}</span>
        </span>
        {!ouvert && <span className="assistant-fab-badge" aria-hidden="true" />}
      </button>

      {ouvert && (
        <div className="assistant-panel" role="dialog" aria-label={title}>
          <div className="assistant-panel-header">
            <div className="assistant-panel-avatar">{PICTO}</div>
            <div className="assistant-panel-ident">
              <p className="assistant-panel-title">{title}</p>
              <p className="assistant-panel-subtitle">Je réponds à partir de vos données réelles.</p>
            </div>
            <button
              type="button"
              className="assistant-panel-action"
              onClick={reset}
              aria-label="Effacer la conversation"
              title="Effacer la conversation"
            >
              {CORBEILLE}
            </button>
            <button
              type="button"
              className="assistant-panel-close"
              onClick={() => setOuvert(false)}
              aria-label="Fermer"
              title="Fermer"
            >
              {CROIX}
            </button>
          </div>

          <div className="assistant-panel-body" ref={corps} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg-row${m.role === 'user' ? ' assistant-msg-row-user' : ''}`}>
                {m.role === 'assistant' && <span className="assistant-msg-avatar">{PICTO}</span>}
                <div className={`assistant-msg-bubble${m.role === 'user' ? ' assistant-msg-user' : ''}`}>
                  {rendreMessage(m.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="assistant-msg-row">
                <span className="assistant-msg-avatar">{PICTO}</span>
                <div className="assistant-msg-bubble assistant-msg-attente">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {suggestions && suggestions.length > 0 && (
            <div className="assistant-suggestions">
              {suggestions.map((q) => (
                <button key={q} type="button" onClick={() => envoyer(q)} disabled={loading}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            className="assistant-panel-input"
            onSubmit={(e) => { e.preventDefault(); envoyer(saisie); }}
          >
            <input
              ref={champ}
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Posez votre question…"
              aria-label="Votre question"
            />
            <button type="submit" aria-label="Envoyer" disabled={loading || !saisie.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
