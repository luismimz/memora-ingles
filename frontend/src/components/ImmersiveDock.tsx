import { Link, useLocation } from 'react-router-dom';

const DESTINATIONS = [
  { to: '/descubrir', icon: 'bolt', label: 'Misión', tone: 'mission', match: (path: string) => path === '/' || path.startsWith('/descubrir') || path.startsWith('/constructor-frases') },
  { to: '/arcade', icon: 'arcade', label: 'Arcade', tone: 'arcade', match: (path: string) => path.startsWith('/arcade') },
  { to: '/galeria', icon: 'cards', label: 'Colección', tone: 'collection', match: (path: string) => path.startsWith('/galeria') },
];

type DockIconName = 'bolt' | 'arcade' | 'cards' | 'settings';

function DockIcon({ name }: { name: DockIconName }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'bolt') return <svg {...common}><path d="M13.2 2.5 5.8 13h5.1l-.8 8.5L18.2 11h-5.1l.1-8.5Z" /></svg>;
  if (name === 'arcade') return <svg {...common}><path d="m7.2 8.5-2.1.8a3.8 3.8 0 0 0-2.4 4.8l1 3a2.8 2.8 0 0 0 4.4 1.3l2.2-1.7h3.4l2.2 1.7a2.8 2.8 0 0 0 4.4-1.3l1-3a3.8 3.8 0 0 0-2.4-4.8l-2.1-.8a13 13 0 0 0-9.6 0Z" /><path d="M8 12v3M6.5 13.5h3M16.5 13.2h.01M18.5 11.8h.01" /></svg>;
  if (name === 'cards') return <svg {...common}><rect x="5" y="3.5" width="13" height="17" rx="2" /><path d="M8.5 7.5h6M8.5 11.5h4M8.5 15.5h6" /><path d="M3.5 6.5v12a2 2 0 0 0 2 2h10" /></svg>;
  return <svg {...common}><path d="M12 3.5 13.1 5a7.5 7.5 0 0 1 1.8.8l1.8-.5 1.5 1.5-.5 1.8c.3.6.6 1.2.8 1.8l1.5 1.1v2l-1.5 1.1a7.5 7.5 0 0 1-.8 1.8l.5 1.8-1.5 1.5-1.8-.5a7.5 7.5 0 0 1-1.8.8L12 20.5l-2-1.1a7.5 7.5 0 0 1-1.8-.8l-1.8.5-1.5-1.5.5-1.8a7.5 7.5 0 0 1-.8-1.8L3.1 13V11l1.5-1.1a7.5 7.5 0 0 1 .8-1.8l-.5-1.8 1.5-1.5 1.8.5a7.5 7.5 0 0 1 1.8-.8L10 3.5Z" /><circle cx="12" cy="12" r="2.8" /></svg>;
}

/**
 * Navegación persistente de la aplicación. Las pantallas inmersivas quedan
 * por debajo de este Dock para que el usuario siempre pueda salir o cambiar
 * de modo, también durante el sobre de recompensa y el constructor.
 */
export function ImmersiveDock() {
  const { pathname } = useLocation();

  return (
    <nav className="immersive-dock" aria-label="Navegación principal">
      <Link to="/" className="immersive-dock-brand" aria-label="Inicio · Hoy">
        <span className="immersive-dock-mark">M</span>
        <span className="immersive-dock-brand-copy"><b>Memora</b><small>English by memory</small></span>
      </Link>
      <div className="immersive-dock-links">
        {DESTINATIONS.map((destination) => {
          const active = destination.match(pathname);
          return (
            <Link
              key={destination.to}
              to={destination.to}
              className={`immersive-dock-link mode-${destination.tone} ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="immersive-dock-icon"><DockIcon name={destination.icon as DockIconName} /></span>
              <small>{destination.label}</small>
            </Link>
          );
        })}
      </div>
      <Link to="/ajustes" className={`immersive-dock-settings ${pathname.startsWith('/ajustes') ? 'is-active' : ''}`} aria-label="Ajustes">
        <span className="immersive-dock-icon"><DockIcon name="settings" /></span>
        <small>Ajustes</small>
      </Link>
    </nav>
  );
}
