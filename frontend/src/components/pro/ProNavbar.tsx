import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
  ACCOUNT_NAV,
  PRIMARY_NAV,
  SECONDARY_NAV,
  initialsOf,
  proPath,
  type NavEntry,
} from './proNav';

/**
 * Navbar horizontale de l'Espace Professionnel — remplace l'ancienne sidebar.
 *
 * Composant React à part entière (état local pour les menus, `NavLink` pour
 * l'état actif). Le moteur d'affichage historique, resté impératif, ne peut pas
 * écrire ici : un re-rendu React écraserait tout `innerHTML` posé à la main.
 * Les deux seules valeurs qu'il doit faire remonter (compteur de notifications
 * et identité du professionnel) transitent donc par des `CustomEvent`.
 */

function Icon({ path, size = 16 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

/** Un item de menu déroulant ou de panneau mobile. */
function MenuLink({ entry, onNavigate }: { entry: NavEntry; onNavigate: () => void }) {
  return (
    <NavLink
      to={proPath(entry.slug)}
      end={entry.slug === ''}
      onClick={onNavigate}
      className={({ isActive }) => `pro-menu-item${isActive ? ' active' : ''}`}
    >
      <Icon path={entry.icon} />
      <span>{entry.label}</span>
    </NavLink>
  );
}

export function ProNavbar() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const email = useAuthStore((s) => s.user?.email);

  const [openMenu, setOpenMenu] = useState<'plus' | 'compte' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [profile, setProfile] = useState({
    name: '',
    role: 'Professionnel',
    estSuperviseur: false,
    profilComplet: true,
  });
  const navRef = useRef<HTMLElement | null>(null);

  // Pont moteur -> React. Le moteur émet ces événements à l'init puis à chaque
  // changement (marquer comme lu, enregistrement du profil).
  useEffect(() => {
    const onCount = (e: Event) => setUnread((e as CustomEvent<number>).detail ?? 0);
    const onProfile = (e: Event) => {
      const d = (e as CustomEvent<{ name?: string; role?: string; estSuperviseur?: boolean; profilComplet?: boolean }>).detail;
      if (d) {
        setProfile((p) => ({
          name: d.name ?? p.name,
          role: d.role ?? p.role,
          estSuperviseur: d.estSuperviseur ?? p.estSuperviseur,
          profilComplet: d.profilComplet ?? p.profilComplet,
        }));
      }
    };
    window.addEventListener('pro:notif-count', onCount);
    window.addEventListener('pro:profile', onProfile);
    return () => {
      window.removeEventListener('pro:notif-count', onCount);
      window.removeEventListener('pro:profile', onProfile);
    };
  }, []);

  // Fermeture des menus au clic extérieur et à la touche Échap.
  useEffect(() => {
    if (!openMenu && !mobileOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu, mobileOpen]);

  const displayName = profile.name || email || 'Professionnel';
  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  // Reprend exactement la logique de déconnexion de l'ancien bouton de sidebar.
  function handleLogout() {
    closeAll();
    logout();
    navigate('/connexion');
  }

  return (
    <header className="pro-navbar" ref={navRef}>
      <div className="pro-navbar-inner">
        <NavLink to={proPath('')} end className="pro-brand" onClick={closeAll}>
          <span className="pro-brand-logo">R</span>
          <span className="pro-brand-text">RendezVousApp</span>
        </NavLink>

        <button
          type="button"
          className="pro-burger"
          aria-label="Ouvrir le menu"
          aria-expanded={mobileOpen}
          onClick={() => {
            setOpenMenu(null);
            setMobileOpen((o) => !o);
          }}
        >
          <Icon
            path={
              mobileOpen
                ? '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
                : '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>'
            }
            size={20}
          />
        </button>

        <nav className="pro-nav-links">
          {PRIMARY_NAV.map((entry) => (
            <NavLink
              key={entry.slug}
              to={proPath(entry.slug)}
              end={entry.slug === ''}
              onClick={closeAll}
              className={({ isActive }) => `pro-nav-link${isActive ? ' active' : ''}`}
            >
              <Icon path={entry.icon} />
              <span>{entry.label}</span>
            </NavLink>
          ))}

          <div className="pro-dropdown">
            <button
              type="button"
              className={`pro-nav-link${openMenu === 'plus' ? ' open' : ''}`}
              aria-expanded={openMenu === 'plus'}
              onClick={() => setOpenMenu((m) => (m === 'plus' ? null : 'plus'))}
            >
              <span>Plus</span>
              <Icon path='<polyline points="6 9 12 15 18 9"/>' size={13} />
            </button>
            {openMenu === 'plus' && (
              <div className="pro-menu">
                {SECONDARY_NAV.map((entry) => (
                  <MenuLink key={entry.slug} entry={entry} onNavigate={closeAll} />
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="pro-navbar-right">
          <div className="pro-search">
            <Icon path='<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' size={15} />
            <input type="text" id="globalSearch" placeholder="Rechercher un client, une réservation…" />
          </div>

          <NavLink
            to={proPath('notifications')}
            onClick={closeAll}
            className={({ isActive }) => `pro-icon-btn${isActive ? ' active' : ''}`}
            aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
            title="Notifications"
          >
            <Icon path='<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' size={17} />
            {unread > 0 && <span className="pro-icon-badge">{unread}</span>}
          </NavLink>

          <div className="pro-dropdown">
            <button
              type="button"
              className={`pro-user-btn${openMenu === 'compte' ? ' open' : ''}`}
              aria-expanded={openMenu === 'compte'}
              onClick={() => setOpenMenu((m) => (m === 'compte' ? null : 'compte'))}
            >
              <span className="pro-avatar">
                {initialsOf(displayName)}
                {/* Profil incomplet (CDC II.4) : rappel discret, sans bloquer l'usage. */}
                {!profile.profilComplet && <span className="pro-avatar-alerte" title="Profil incomplet" />}
              </span>
              <span className="pro-user-text">
                <span className="pro-user-name">{displayName}</span>
                <span className="pro-user-role">{profile.role}</span>
              </span>
              <Icon path='<polyline points="6 9 12 15 18 9"/>' size={13} />
            </button>
            {openMenu === 'compte' && (
              <div className="pro-menu pro-menu-right">
                <div className="pro-menu-head">
                  <div className="pro-menu-head-name">{displayName}</div>
                  {email && <div className="pro-menu-head-mail">{email}</div>}
                </div>
                {/* Mode Prestataire : le compte cumule Professionnel et Admin (CDC II.2). */}
                {profile.estSuperviseur && (
                  <NavLink to="/admin" onClick={closeAll} className="pro-menu-item">
                    <Icon path='<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' />
                    <span>Espace Administrateur</span>
                  </NavLink>
                )}
                {ACCOUNT_NAV.map((entry) => (
                  <MenuLink key={entry.slug} entry={entry} onNavigate={closeAll} />
                ))}
                <button type="button" className="pro-menu-item danger" onClick={handleLogout}>
                  <Icon path='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="pro-mobile-panel">
          <div className="pro-menu-section">Navigation</div>
          {PRIMARY_NAV.map((entry) => (
            <MenuLink key={entry.slug} entry={entry} onNavigate={closeAll} />
          ))}
          <div className="pro-menu-section">Plus</div>
          {SECONDARY_NAV.map((entry) => (
            <MenuLink key={entry.slug} entry={entry} onNavigate={closeAll} />
          ))}
          <div className="pro-menu-section">Compte</div>
          <NavLink to={proPath('notifications')} onClick={closeAll} className="pro-menu-item">
            <Icon path='<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' />
            <span>Notifications</span>
            {unread > 0 && <span className="pro-menu-badge">{unread}</span>}
          </NavLink>
          {ACCOUNT_NAV.map((entry) => (
            <MenuLink key={entry.slug} entry={entry} onNavigate={closeAll} />
          ))}
          <button type="button" className="pro-menu-item danger" onClick={handleLogout}>
            <Icon path='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' />
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </header>
  );
}
