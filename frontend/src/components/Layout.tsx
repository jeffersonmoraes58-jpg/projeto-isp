import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/mapa', label: 'Mapa CTOs', icon: '🗺️' },
  { to: '/ctos', label: 'CTOs', icon: '📡' },
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/olts', label: 'OLTs', icon: '🔌' },
  { to: '/planos', label: 'Planos', icon: '📋' },
  { to: '/financeiro', label: 'Financeiro', icon: '💰' },
  { to: '/alarmes', label: 'Alarmes', icon: '🔔' },
  { to: '/notificacoes', label: 'Notificações', icon: '📨' },
  { to: '/usuarios', label: 'Usuários', icon: '🔐' },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <h1 className="text-lg font-bold text-blue-400">ISP Manager</h1>
          <p className="text-xs text-gray-500 mt-0.5">Sistema de Gestão</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-800 space-y-2">
          {user && (
            <div className="px-1">
              <p className="text-xs font-medium text-gray-300 truncate">{user.nome}</p>
              <p className="text-xs text-gray-600 truncate">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
