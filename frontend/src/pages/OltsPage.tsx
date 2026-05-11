import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oltsApi, clientesApi } from '../services/api';
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

function sinalCor(dbm: number | null): string {
  if (dbm === null) return 'text-gray-500';
  if (dbm >= -20) return 'text-green-400';
  if (dbm >= -24) return 'text-yellow-400';
  if (dbm >= -27) return 'text-orange-400';
  return 'text-red-400';
}

function sinalLabel(dbm: number | null): string {
  if (dbm === null) return '—';
  if (dbm >= -20) return 'Ótimo';
  if (dbm >= -24) return 'Bom';
  if (dbm >= -27) return 'Fraco';
  return 'Crítico';
}

function SinalBadge({ dbm }: { dbm: number | null }) {
  const cor = sinalCor(dbm);
  return (
    <div className="text-right">
      <p className={`font-mono font-semibold text-sm ${cor}`}>{dbm !== null ? `${Number(dbm).toFixed(1)} dBm` : '—'}</p>
      {dbm !== null && <p className={`text-xs ${cor}`}>{sinalLabel(dbm)}</p>}
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

  // Monitoramento de sinais
  const [oltSelecionada, setOltSelecionada] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: clientesResult, isFetching: buscando } = useQuery<{ data: any[]; total: number }>({
    queryKey: ['clientes-sinais', oltSelecionada, search],
    queryFn: () => clientesApi.getAll({
      oltId: oltSelecionada || undefined,
      search: search || undefined,
      limit: 50,
    }),
    enabled: oltSelecionada !== '' || search !== '',
  });

  const clientesSinais = clientesResult?.data ?? [];

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['olts'] }); fecharModal(); },
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

  function abrirNovo() { setEditing(null); setForm({ ...emptyForm }); setErro(''); setShowModal(true); }

  function abrirEditar(o: Olt) {
    setEditing(o);
    setForm({ nome: o.nome, ip: o.ip, marca: o.marca, modelo: o.modelo, portaGerencia: '161', comunidadeSnmp: 'public', versaoSnmp: '2c', usuario: '', senha: '' });
    setErro('');
    setShowModal(true);
  }

  function fecharModal() { setShowModal(false); setEditing(null); setErro(''); }
  function set(field: keyof FormData, value: string) { setForm((p) => ({ ...p, [field]: value })); }

  function selecionarOlt(id: string) {
    setOltSelecionada((prev) => prev === id ? '' : id);
    setSearch('');
    setSearchInput('');
  }

  function aplicarBusca() { setSearch(searchInput); }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">OLTs</h2>
          <p className="text-xs text-gray-500 mt-0.5">Equipamentos de linha óptica</p>
        </div>
        <button onClick={abrirNovo} className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
          + Nova OLT
        </button>
      </div>

      {/* Cards OLT */}
      {isLoading ? (
        <p className="text-gray-500 text-sm">Carregando OLTs...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {olts.map((olt) => {
            const result = testResults[olt.id];
            const selecionada = oltSelecionada === olt.id;
            return (
              <div
                key={olt.id}
                className={`bg-gray-900 border rounded-xl p-5 space-y-3 cursor-pointer transition-colors ${selecionada ? 'border-blue-500' : 'border-gray-800 hover:border-gray-700'}`}
                onClick={() => selecionarOlt(olt.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{olt.nome}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{olt.ip}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${olt.ativo ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {olt.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {selecionada && <span className="text-xs text-blue-400">● Selecionada</span>}
                  </div>
                </div>

                <p className="text-xs text-gray-500">{olt.marca} · {olt.modelo}</p>

                {result && (
                  <div className={`text-xs px-3 py-2 rounded-lg ${result.online ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                    {result.online ? `✓ ${result.descr ?? 'Online'}` : '✗ Sem resposta SNMP'}
                  </div>
                )}

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => testar.mutate(olt.id)} disabled={testar.isPending} className="flex-1 text-xs py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50">
                    Testar SNMP
                  </button>
                  <button onClick={() => abrirEditar(olt)} className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => { if (window.confirm(`Remover ${olt.nome}?`)) remover.mutate(olt.id); }} className="text-xs px-3 py-1.5 bg-red-900 text-red-300 rounded hover:bg-red-800 transition-colors">
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Seção de Monitoramento de Sinais */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Monitoramento de Sinais</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {oltSelecionada
                ? `Clientes da OLT: ${olts.find((o) => o.id === oltSelecionada)?.nome}`
                : 'Selecione uma OLT acima ou pesquise por cliente'}
            </p>
          </div>

          {/* Barra de pesquisa */}
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aplicarBusca()}
              placeholder="Pesquisar por nome, CPF ou PPPoE..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={aplicarBusca}
              className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex-shrink-0"
            >
              Buscar
            </button>
            {(search || oltSelecionada) && (
              <button
                onClick={() => { setSearch(''); setSearchInput(''); setOltSelecionada(''); }}
                className="text-xs px-2 py-2 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Legenda */}
        <div className="px-5 py-2 bg-gray-950 border-b border-gray-800 flex items-center gap-4 text-xs">
          <span className="text-gray-500">Legenda:</span>
          <span className="text-green-400">● Ótimo (≥ −20 dBm)</span>
          <span className="text-yellow-400">● Bom (−24 a −20)</span>
          <span className="text-orange-400">● Fraco (−27 a −24)</span>
          <span className="text-red-400">● Crítico (&lt; −27 dBm)</span>
        </div>

        {/* Tabela */}
        {!oltSelecionada && !search ? (
          <div className="px-5 py-12 text-center">
            <p className="text-gray-600 text-sm">Selecione uma OLT clicando no card acima, ou use a busca para encontrar um cliente.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-4 py-3">PPPoE / Plano</th>
                <th className="text-left px-4 py-3">CTO / Porta</th>
                <th className="text-left px-4 py-3">Status ONU</th>
                <th className="text-right px-4 py-3">Sinal RX (ONU)</th>
                <th className="text-right px-5 py-3">Sinal CTO (retorno)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {buscando && (
                <tr><td colSpan={6} className="text-center text-gray-500 text-sm py-8">Carregando...</td></tr>
              )}
              {!buscando && clientesSinais.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-600 text-sm py-8">Nenhum cliente encontrado</td></tr>
              )}
              {!buscando && clientesSinais.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{c.nome}</p>
                    <p className="text-xs text-gray-500">{c.cpfCnpj}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono text-gray-300">{c.usuarioPppoe}</p>
                    <p className="text-xs text-gray-500">{c.plano?.nome ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    {c.ctoPorta ? (
                      <>
                        <p className="text-xs text-gray-300">{c.ctoPorta.cto?.nome ?? '—'}</p>
                        <p className="text-xs text-gray-500">Porta {c.ctoPorta.numero}</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-600">Não alocado</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.statusOnu === 'ONLINE' ? 'bg-green-900 text-green-300'
                      : c.statusOnu === 'OFFLINE' ? 'bg-red-900 text-red-400'
                      : 'bg-yellow-900 text-yellow-300'
                    }`}>
                      {c.statusOnu}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <SinalBadge dbm={c.sinalOnu !== null && c.sinalOnu !== undefined ? Number(c.sinalOnu) : null} />
                  </td>
                  <td className="px-5 py-3">
                    <SinalBadge dbm={c.ctoPorta?.sinalDbm !== null && c.ctoPorta?.sinalDbm !== undefined ? Number(c.ctoPorta.sinalDbm) : null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {clientesResult && clientesResult.total > 50 && (
          <div className="px-5 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">Exibindo 50 de {clientesResult.total} clientes. Use a busca para refinar.</p>
          </div>
        )}
      </div>

      {/* Modal OLT */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={fecharModal}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
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
              <button onClick={fecharModal} className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
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
