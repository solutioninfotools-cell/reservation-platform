import { useState } from 'react';
import { useAssistant } from '../../hooks/useAssistant';

type Props = { professionnelId?: string; mode?: 'public' | 'pro'; title?: string };

const CHAT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

function renderInline(text: string, key: number) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span key={key}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
      )}
    </span>
  );
}

function renderMessageContent(content: string) {
  const blocks = content.split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const isList = lines.length > 0 && lines.every((l) => l.startsWith('- ') || l.startsWith('• '));
    if (isList) {
      return (
        <ul className="assistant-msg-list" key={i}>
          {lines.map((l, j) => (
            <li key={j}>{renderInline(l.replace(/^[-•]\s*/, ''), j)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p className="assistant-msg-para" key={i}>
        {lines.map((l, j) => (
          <span key={j}>
            {renderInline(l, j)}
            {j < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

export function AssistantWidget({ professionnelId, mode = 'public', title = 'Assistant IA' }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, send, loading } = useAssistant(professionnelId, mode);

  return (
    <>
      <button className="assistant-fab" onClick={() => setOpen(!open)} aria-label="Discuter avec l'assistant IA">
        <span className="assistant-fab-avatar">{CHAT_ICON}</span>
        <span className="assistant-fab-label">
          <span className="assistant-fab-label-top">Besoin d'aide ?</span>
          <span className="assistant-fab-label-sub">Discuter avec {title}</span>
        </span>
      </button>
      {open && (
        <div className="assistant-panel">
          <div className="assistant-panel-header">
            <div className="assistant-panel-avatar">{CHAT_ICON}</div>
            <div>
              <p className="assistant-panel-title">{title}</p>
              <p className="assistant-panel-subtitle">Je suis là pour répondre à vos questions !</p>
            </div>
            <button type="button" className="assistant-panel-close" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
          </div>
          <div className="assistant-panel-body">
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg-row${m.role === 'user' ? ' assistant-msg-row-user' : ''}`}>
                {m.role === 'assistant' && <span className="assistant-msg-avatar">{CHAT_ICON}</span>}
                <div className={`assistant-msg-bubble${m.role === 'user' ? ' assistant-msg-user' : ''}`}>
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="assistant-msg-row">
                <span className="assistant-msg-avatar">{CHAT_ICON}</span>
                <div className="assistant-msg-bubble">…</div>
              </div>
            )}
          </div>
          <form className="assistant-panel-input" onSubmit={(e) => { e.preventDefault(); const v = input; setInput(''); send(v); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écrivez votre message..." />
            <button type="submit" aria-label="Envoyer">
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