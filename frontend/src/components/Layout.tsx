import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

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
  { to: '/ordens-servico', label: 'Ordens de Serviço', icon: '🔧' },
  { to: '/usuarios', label: 'Usuários', icon: '🔐' },
];

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showSenha, setShowSenha] = useState(false);
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function abrirModal() {
    setForm({ senhaAtual: '', novaSenha: '', confirmar: '' });
    setErro('');
    setOk(false);
    setShowSenha(true);
  }

  const alterar = useMutation({
    mutationFn: () => authApi.alterarSenha(form.senhaAtual, form.novaSenha),
    onSuccess: () => {
      setOk(true);
      setErro('');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      setErro(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erro ao alterar senha'));
    },
  });

  function submeter() {
    if (form.novaSenha.length < 6) { setErro('Nova senha deve ter pelo menos 6 caracteres'); return; }
    if (form.novaSenha !== form.confirmar) { setErro('As senhas não coincidem'); return; }
    setErro('');
    alterar.mutate();
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
        <div className="px-4 py-4 border-t border-gray-800 space-y-1">
          {user && (
            <div className="px-1 mb-2">
              <p className="text-xs font-medium text-gray-300 truncate">{user.nome}</p>
              <p className="text-xs text-gray-600 truncate">{user.role}</p>
            </div>
          )}
          <button
            onClick={abrirModal}
            className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            Alterar senha
          </button>
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

      {/* Modal alterar senha */}
      {showSenha && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowSenha(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Alterar Senha</h3>
              <button onClick={() => setShowSenha(false)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>

            {ok ? (
              <div className="text-center space-y-3 py-2">
                <p className="text-green-400 text-sm font-medium">Senha alterada com sucesso!</p>
                <button
                  onClick={() => setShowSenha(false)}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Senha atual</label>
                    <input
                      type="password"
                      value={form.senhaAtual}
                      onChange={(e) => setForm((p) => ({ ...p, senhaAtual: e.target.value }))}
                      className={inputCls}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Nova senha</label>
                    <input
                      type="password"
                      value={form.novaSenha}
                      onChange={(e) => setForm((p) => ({ ...p, novaSenha: e.target.value }))}
                      className={inputCls}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Confirmar nova senha</label>
                    <input
                      type="password"
                      value={form.confirmar}
                      onChange={(e) => setForm((p) => ({ ...p, confirmar: e.target.value }))}
                      className={inputCls}
                      onKeyDown={(e) => e.key === 'Enter' && submeter()}
                    />
                  </div>
                </div>

                {erro && <p className="text-xs text-red-400">{erro}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowSenha(false)}
                    className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submeter}
                    disabled={!form.senhaAtual || !form.novaSenha || !form.confirmar || alterar.isPending}
                    className="flex-1 text-sm py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
                  >
                    {alterar.isPending ? 'Salvando...' : 'Alterar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
