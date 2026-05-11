import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planosApi } from '../services/api';
import { Plano } from '../types';

interface PlanoForm {
  nome: string;
  velocidadeUp: string;
  velocidadeDn: string;
  valor: string;
}

const emptyForm: PlanoForm = { nome: '', velocidadeUp: '', velocidadeDn: '', valor: '' };

export default function PlanosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plano | null>(null);
  const [form, setForm] = useState<PlanoForm>(emptyForm);

  const { data: planos = [], isLoading } = useQuery<Plano[]>({
    queryKey: ['planos'],
    queryFn: () => planosApi.getAll(),
  });

  const criar = useMutation({
    mutationFn: () =>
      planosApi.create({
        nome: form.nome,
        velocidadeUp: Number(form.velocidadeUp),
        velocidadeDn: Number(form.velocidadeDn),
        valor: Number(form.valor),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planos'] });
      closeModal();
    },
  });

  const atualizar = useMutation({
    mutationFn: () =>
      planosApi.update(editing!.id, {
        nome: form.nome,
        velocidadeUp: Number(form.velocidadeUp),
        velocidadeDn: Number(form.velocidadeDn),
        valor: Number(form.valor),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planos'] });
      closeModal();
    },
  });

  const toggle = useMutation({
    mutationFn: (id: string) => planosApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planos'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(p: Plano) {
    setEditing(p);
    setForm({
      nome: p.nome,
      velocidadeUp: String(p.velocidadeUp),
      velocidadeDn: String(p.velocidadeDn),
      valor: String(p.valor),
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Planos de Internet</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors"
        >
          + Novo Plano
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm text-center py-8">Carregando planos...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {planos.map((p) => (
            <div
              key={p.id}
              className={`bg-gray-900 border rounded-xl p-5 space-y-3 ${
                p.ativo ? 'border-gray-800' : 'border-gray-800 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{p.nome}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{p._count.clientes} clientes</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.ativo ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Download</p>
                  <p className="font-mono text-blue-400">{p.velocidadeDn} Mbps</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Upload</p>
                  <p className="font-mono text-blue-400">{p.velocidadeUp} Mbps</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                <span className="text-lg font-bold text-white">
                  R$ {Number(p.valor).toFixed(2)}
                  <span className="text-xs text-gray-500 font-normal">/mês</span>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggle.mutate(p.id)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      p.ativo
                        ? 'bg-red-900 text-red-300 hover:bg-red-800'
                        : 'bg-green-900 text-green-300 hover:bg-green-800'
                    }`}
                  >
                    {p.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-white">
              {editing ? 'Editar Plano' : 'Novo Plano'}
            </h3>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nome do plano</label>
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Fibra 100M"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Download (Mbps)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.velocidadeDn}
                    onChange={(e) => setForm({ ...form, velocidadeDn: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Upload (Mbps)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.velocidadeUp}
                    onChange={(e) => setForm({ ...form, velocidadeUp: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Valor mensal (R$)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
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
