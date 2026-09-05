import { ReactNode } from 'react';

/** Modale générique réutilisée par toutes les interfaces. */
export function Modal({ open, onClose, title, subtitle, children, wide }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-5" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'} max-h-[88vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6`}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-lg font-extrabold">{title}</div>
            {subtitle && <div className="text-xs text-ink-soft">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-paper text-ink-soft hover:bg-line flex items-center justify-center">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
