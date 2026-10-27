import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

type NavItem = { to: string; label: string; icon: string; end?: boolean };

const NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/blogs', label: 'Blogs', icon: 'posts' },
  { to: '/cursos', label: 'Cursos', icon: 'courses' },
  { to: '/proyectos', label: 'Proyectos', icon: 'projects' },
  { to: '/mensajes', label: 'Mensajes', icon: 'messages' },
  { to: '/multimedia', label: 'Multimedia', icon: 'media' },
  { to: '/ajustes', label: 'Ajustes del sitio', icon: 'settings' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const location = useLocation();

  const titulo =
    NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
      ?.label ?? 'Gestor';

  return (
    <div className="min-h-screen lg:flex">
      {/* Fondo oscuro del menú en móvil */}
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-30 bg-brand-950/50 lg:hidden"
        />
      )}

      {/* ── Barra lateral ── */}
      <aside
        // Fija a la altura de la pantalla (también en escritorio): el menú y el
        // bloque de sesión nunca se desplazan con el contenido
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col bg-brand-900 transition-transform lg:sticky lg:top-0 lg:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img
            src="/logo-icgc.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Gestor ICGC</p>
            <p className="text-[0.7rem] text-brand-300">Panel de administración</p>
          </div>
        </div>

        <nav aria-label="Navegación del gestor" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="truncate text-xs text-brand-300">{user?.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-silver-200 bg-white px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-silver-300 lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <h1 className="text-lg font-bold text-brand-900">{titulo}</h1>

          <a
            href={import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000'}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm font-medium text-brand-600 hover:text-brand-800"
          >
            Ver la web pública ↗
          </a>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </>
    ),
    courses: (
      <>
        <path d="M22 10 12 5 2 10l10 5 10-5z" />
        <path d="M6 12v5c3 2 9 2 12 0v-5" />
      </>
    ),
    projects: (
      <>
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
    posts: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h4" />
      </>
    ),
    messages: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </>
    ),
    media: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-4.5-4.5L9 18" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  };

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {paths[name]}
    </svg>
  );
}
