import { useEffect, useState } from 'react';
import { api } from '../../api/client';

/**
 * Cloche de notifications générique — même comportement (compteur, liste, tout
 * marquer comme lu) dans les 3 espaces authentifiés, car l'endpoint
 * `/notifications` est commun. Le contenu métier des messages reste défini côté
 * backend, propre à chaque action (RDV créé, annulé, compte validé, etc.).
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    const list = await api.get('/notifications').then((r) => r.data);
    setItems(list);
    setUnread(list.filter((n: any) => !n.lu).length);
  }
  useEffect(() => { load(); }, []);

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    load();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative w-9 h-9 rounded-lg border border-line bg-white flex items-center justify-center text-ink-soft hover:bg-paper">
        🔔
        {unread > 0 && <span className="absolute -top-1.5 -right-1.5 bg-status-annule text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1 border-2 border-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-line rounded-xl shadow-xl z-30 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="font-bold text-sm">Notifications</div>
            <button onClick={markAllRead} className="text-xs font-bold text-primary hover:underline">Tout marquer lu</button>
          </div>
          {items.length === 0 && <div className="p-6 text-center text-xs text-ink-soft">Aucune notification</div>}
          {items.map((n) => (
            <div key={n.id} className={`px-4 py-3 border-b border-line last:border-b-0 text-xs ${!n.lu ? 'bg-primary-tint/30' : ''}`}>
              <div className="mb-1">{n.message}</div>
              <div className="text-[10px] text-ink-soft">{new Date(n.createdAt).toLocaleString('fr-FR')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
