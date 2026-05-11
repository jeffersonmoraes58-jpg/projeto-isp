import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { User } from '../types';

const ROLES = ['ADMIN', 'OPERADOR', 'TECNICO'] as const;

const roleColor: Record<string, string> = {
  ADMIN: 'bg-purple-900 text-purple-300',
  OPERADOR: 'bg-blue-900 text-blue-300',
  TECNICO: 'bg-yellow-900 text-yellow-300',
};

const emptyForm = { nome: '', email: '', senha: '', role: 'OPERADOR' as const };

export default function UsuariosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [erro, setErro] = useState('');

  const { data: usuarios = [], isLoading } = useQuery<User[]>({
    queryKey: ['usuarios'],
    queryFn: authApi.listarUsuarios,
  });

  const criar = useMutation({
    mutationFn: () => authApi.criarUsuario(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      setShowModal(false);
      setForm({ ...emptyForm });
      setErro('');
    },
    onError: (e: any) => {
      setErro(e?.response?.data?.message ?? 'Erro ao criar usuário');
    },
  });

  const toggle = useMutation({
    mutationFn: (id: string) => authApi.toggleUsuario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Usuários</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gestão de acesso ao sistema</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setErro(''); }}
          className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          + Novo Usuário
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm text-center py-8">Carregando...</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">E-mail</th>
                <th className="text-left px-4 py-3">Perfil</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Criado em</th>
                <th className="text-left px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{u.nome}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[u.role] ?? 'bg-gray-800 text-gray-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.ativo ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle.mutate(u.id)}
                      disabled={toggle.isPending}
                      className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                        u.ativo
                          ? 'bg-red-900 text-red-300 hover:bg-red-800'
                          : 'bg-green-900 text-green-300 hover:bg-green-800'
                      }`}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-96 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Novo Usuário</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>

            <div className="space-y-3">
              <Field label="Nome">
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  placeholder="João da Silva"
                />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  placeholder="joao@empresa.com"
                />
              </Field>
              <Field label="Senha">
                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </Field>
              <Field label="Perfil">
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as any }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            {erro && <p className="text-xs text-red-400">{erro}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => criar.mutate()}
                disabled={!form.nome || !form.email || !form.senha || criar.isPending}
                className="flex-1 text-sm py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {criar.isPending ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}
