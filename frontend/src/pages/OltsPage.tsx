import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oltsApi } from '../services/api';
import { Olt } from '../types';

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';

const emptyForm = {
  nome: '', ip: '', marca: '', modelo: '',
  portaGerencia: '161', comunidadeSnmp: 'public', versaoSnmp: '2c',
  usuario: '', senha: '',
};

type FormData = typeof emptyForm;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function OltsPage() {
  const qc = useQueryClient();
  const { data: olts = [], isLoading } = useQuery<Olt[]>({
    queryKey: ['olts'],
    queryFn: oltsApi.getAll,
  });

  const [testResults, setTestResults] = useState<Record<string, { online: boolean; descr: string | null }>>({});
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Olt | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [erro, setErro] = useState('');

  const salvar = useMutation({
    mutationFn: () => {
      const payload: Record<string, any> = {
        nome: form.nome, ip: form.ip, marca: form.marca, modelo: form.modelo,
      };
      if (form.portaGerencia) payload.portaGerencia = parseInt(form.portaGerencia, 10);
      if (form.comunidadeSnmp) payload.comunidadeSnmp = form.comunidadeSnmp;
      if (form.versaoSnmp) payload.versaoSnmp = form.versaoSnmp;
      if (form.usuario) payload.usuario = form.usuario;
      if (form.senha) payload.senha = form.senha;
      return editing ? oltsApi.update(editing.id, payload) : oltsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['olts'] });
      fecharModal();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      setErro(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erro ao salvar'));
    },
  });

  const remover = useMutation({
    mutationFn: (id: string) => oltsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['olts'] }),
  });

  const testar = useMutation({
    mutationFn: (id: string) => oltsApi.testar(id),
    onSuccess: (data, id) => setTestResults((prev) => ({ ...prev, [id]: data })),
  });

  function abrirNovo() {
    setEditing(null);
    setForm({ ...emptyForm });
    setErro('');
    setShowModal(true);
  }

  function abrirEditar(o: Olt) {
    setEditing(o);
    setForm({
      nome: o.nome, ip: o.ip, marca: o.marca, modelo: o.modelo,
      portaGerencia: '161', comunidadeSnmp: 'public', versaoSnmp: '2c',
      usuario: '', senha: '',
    });
    setErro('');
    setShowModal(true);
  }

  function fecharModal() {
    setShowModal(false);
    setEditing(null);
    setErro('');
  }

  function set(field: keyof FormData, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">OLTs</h2>
        <button
          onClick={abrirNovo}
          className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          + Nova OLT
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Carregando OLTs...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {olts.map((olt) => {
            const result = testResults[olt.id];
            return (
              <div key={olt.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{olt.nome}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{olt.ip}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${olt.ativo ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {olt.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <p className="text-xs text-gray-500">{olt.marca} · {olt.modelo}</p>

                {result && (
                  <div className={`text-xs px-3 py-2 rounded-lg ${result.online ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                    {result.online ? `✓ ${result.descr ?? 'Online'}` : '✗ Sem resposta SNMP'}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => testar.mutate(olt.id)}
                    disabled={testar.isPending}
                    className="flex-1 text-xs py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Testar SNMP
                  </button>
                  <button
                    onClick={() => abrirEditar(olt)}
                    className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Remover ${olt.nome}?`)) remover.mutate(olt.id); }}
                    className="text-xs px-3 py-1.5 bg-red-900 text-red-300 rounded hover:bg-red-800 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={fecharModal}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg space-y-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{editing ? 'Editar OLT' : 'Nova OLT'}</h3>
              <button onClick={fecharModal} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome *">
                <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} className={inputCls} placeholder="OLT-01" />
              </Field>
              <Field label="IP *">
                <input type="text" value={form.ip} onChange={(e) => set('ip', e.target.value)} className={inputCls} placeholder="192.168.1.1" />
              </Field>
              <Field label="Marca *">
                <input type="text" value={form.marca} onChange={(e) => set('marca', e.target.value)} className={inputCls} placeholder="ZTE, Huawei..." />
              </Field>
              <Field label="Modelo *">
                <input type="text" value={form.modelo} onChange={(e) => set('modelo', e.target.value)} className={inputCls} placeholder="C300, MA5608T..." />
              </Field>
              <Field label="Porta SNMP">
                <input type="number" value={form.portaGerencia} onChange={(e) => set('portaGerencia', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Versão SNMP">
                <select value={form.versaoSnmp} onChange={(e) => set('versaoSnmp', e.target.value)} className={inputCls}>
                  <option>1</option>
                  <option>2c</option>
                  <option>3</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Comunidade SNMP">
                  <input type="text" value={form.comunidadeSnmp} onChange={(e) => set('comunidadeSnmp', e.target.value)} className={inputCls} placeholder="public" />
                </Field>
              </div>
              <Field label="Usuário SSH/Telnet">
                <input type="text" value={form.usuario} onChange={(e) => set('usuario', e.target.value)} className={inputCls} placeholder="admin" />
              </Field>
              <Field label="Senha SSH/Telnet">
                <input type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)} className={inputCls} />
              </Field>
            </div>

            {erro && <p className="text-xs text-red-400">{erro}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={fecharModal}
                className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => salvar.mutate()}
                disabled={!form.nome || !form.ip || !form.marca || !form.modelo || salvar.isPending}
                className="flex-1 text-sm py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {salvar.isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
