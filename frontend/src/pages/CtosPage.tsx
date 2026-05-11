import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ctosApi, oltsApi } from '../services/api';
import { Cto, Olt } from '../types';
import CtoModal from '../components/CTO/CtoModal';

interface CtoForm {
  nome: string;
  endereco: string;
  latitude: string;
  longitude: string;
  capacidade: string;
  oltId: string;
  observacao: string;
}

const emptyForm: CtoForm = {
  nome: '',
  endereco: '',
  latitude: '',
  longitude: '',
  capacidade: '16',
  oltId: '',
  observacao: '',
};

export default function CtosPage() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Cto | null>(null);
  const [portasCtoId, setPortasCtoId] = useState<string | null>(null);
  const [form, setForm] = useState<CtoForm>(emptyForm);

  const { data: ctos = [], isLoading } = useQuery<Cto[]>({
    queryKey: ['ctos-list'],
    queryFn: () => ctosApi.getAll(),
  });

  const { data: olts = [] } = useQuery<Olt[]>({
    queryKey: ['olts'],
    queryFn: () => oltsApi.getAll(),
  });

  const criar = useMutation({
    mutationFn: () =>
      ctosApi.create({
        nome: form.nome,
        endereco: form.endereco || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        capacidade: Number(form.capacidade),
        oltId: form.oltId,
        observacao: form.observacao || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ctos-list'] });
      closeModal();
    },
  });

  const atualizar = useMutation({
    mutationFn: () =>
      ctosApi.update(editing!.id, {
        nome: form.nome,
        endereco: form.endereco || undefined,
        observacao: form.observacao || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ctos-list'] });
      closeModal();
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(c: Cto) {
    setEditing(c);
    setForm({
      nome: c.nome,
      endereco: c.endereco ?? '',
      latitude: String(c.latitude),
      longitude: String(c.longitude),
      capacidade: String(c.capacidade),
      oltId: c.olt ? '' : '',
      observacao: c.observacao ?? '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    editing ? atualizar.mutate() : criar.mutate();
  }

  const filtrados = ctos.filter(
    (c) =>
      c.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      (c.endereco ?? '').toLowerCase().includes(filtro.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">CTOs</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors"
        >
          + Nova CTO
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome ou endereço..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
      />

      {isLoading ? (
        <p className="text-gray-500 text-sm text-center py-8">Carregando CTOs...</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Endereço</th>
                <th className="text-left px-4 py-3">OLT</th>
                <th className="text-left px-4 py-3">Capacidade</th>
                <th className="text-left px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtrados.map((c) => (
                <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{c.nome}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.endereco ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {c.olt ? `${c.olt.nome} (${c.olt.ip})` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.capacidade} portas</td>
                  <td className="px-4 py-3 flex items-center gap-1">
                    <button
                      onClick={() => setPortasCtoId(c.id)}
                      className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded hover:bg-blue-800 transition-colors"
                    >
                      Ver Portas
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {portasCtoId && (
        <CtoModal ctoId={portasCtoId} onClose={() => setPortasCtoId(null)} />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold text-white">
              {editing ? 'Editar CTO' : 'Nova CTO'}
            </h3>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nome</label>
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Endereço</label>
                <input
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              {!editing && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Latitude</label>
                      <input
                        required
                        type="number"
                        step="any"
                        value={form.latitude}
                        onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Longitude</label>
                      <input
                        required
                        type="number"
                        step="any"
                        value={form.longitude}
                        onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Capacidade</label>
                      <select
                        value={form.capacidade}
                        onChange={(e) => setForm({ ...form, capacidade: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="8">8 portas</option>
                        <option value="16">16 portas</option>
                        <option value="32">32 portas</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">OLT</label>
                      <select
                        required
                        value={form.oltId}
                        onChange={(e) => setForm({ ...form, oltId: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Selecione...</option>
                        {olts.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criar.isPending || atualizar.isPending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
