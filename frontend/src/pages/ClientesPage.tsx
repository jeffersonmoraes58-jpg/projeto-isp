import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesApi, planosApi } from '../services/api';
import { Cliente, Plano } from '../types';
import Pagination from '../components/Pagination';
import { downloadBlob } from '../utils/download';

const statusPppoeColor: Record<string, string> = {
  ATIVO: 'bg-green-900 text-green-400',
  BLOQUEADO: 'bg-red-900 text-red-400',
  CANCELADO: 'bg-gray-800 text-gray-500',
};

const statusOnuColor: Record<string, string> = {
  ONLINE: 'text-green-400',
  OFFLINE: 'text-red-400',
  PROVISIONANDO: 'text-yellow-400',
};

const emptyForm = {
  nome: '', cpfCnpj: '', email: '', celular: '',
  usuarioPppoe: '', senhaPppoe: '',
  logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
  planoId: '', diaVencimento: '10',
  serialOnu: '', macOnu: '', modeloOnu: '',
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

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';

export default function ClientesPage() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState('');
  const [soInadimplentes, setSoInadimplentes] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [tab, setTab] = useState<'dados' | 'endereco' | 'onu'>('dados');
  const [erro, setErro] = useState('');

  const { data: resultado, isLoading } = useQuery<{ data: Cliente[]; total: number; totalPages: number; page: number; limit: number }>({
    queryKey: ['clientes', soInadimplentes, page],
    queryFn: () => clientesApi.getAll({ inadimplente: soInadimplentes || undefined, page, limit: LIMIT }),
  });
  const clientes = resultado?.data ?? [];

  const [roteador, setRoteador] = useState<{ cliente: Cliente; ip: string; porta: string; protocolo: 'http' | 'https' } | null>(null);

  function abrirRoteador(c: Cliente) {
    setRoteador({ cliente: c, ip: c.ipFixo ?? '', porta: '80', protocolo: 'http' });
  }

  function acessarRoteador() {
    if (!roteador || !roteador.ip || !roteador.porta) return;
    window.open(`${roteador.protocolo}://${roteador.ip}:${roteador.porta}`, '_blank', 'noopener,noreferrer');
  }

  const [exportando, setExportando] = useState(false);
  async function exportarCsv() {
    setExportando(true);
    try {
      const blob = await clientesApi.exportarCsv(soInadimplentes ? { inadimplente: true } : undefined);
      downloadBlob(blob, 'clientes.csv');
    } finally {
      setExportando(false);
    }
  }

  const { data: planos = [] } = useQuery<Plano[]>({
    queryKey: ['planos'],
    queryFn: planosApi.getAll,
    enabled: showModal,
  });

  const salvar = useMutation({
    mutationFn: () =>
      editing
        ? clientesApi.update(editing.id, buildPayload())
        : clientesApi.create(buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      fecharModal();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      setErro(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erro ao salvar'));
    },
  });

  const bloquear = useMutation({
    mutationFn: (id: string) => clientesApi.bloquear(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });

  const desbloquear = useMutation({
    mutationFn: (id: string) => clientesApi.desbloquear(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });

  function buildPayload() {
    const p: Record<string, any> = {
      nome: form.nome,
      cpfCnpj: form.cpfCnpj,
      usuarioPppoe: form.usuarioPppoe,
    };
    if (form.email) p.email = form.email;
    if (form.celular) p.celular = form.celular;
    if (!editing && form.senhaPppoe) p.senhaPppoe = form.senhaPppoe;
    if (form.logradouro) p.logradouro = form.logradouro;
    if (form.numero) p.numero = form.numero;
    if (form.complemento) p.complemento = form.complemento;
    if (form.bairro) p.bairro = form.bairro;
    if (form.cidade) p.cidade = form.cidade;
    if (form.uf) p.uf = form.uf;
    if (form.cep) p.cep = form.cep;
    if (form.planoId) p.planoId = form.planoId;
    if (form.diaVencimento) p.diaVencimento = parseInt(form.diaVencimento, 10);
    if (form.serialOnu) p.serialOnu = form.serialOnu;
    if (form.macOnu) p.macOnu = form.macOnu;
    if (form.modeloOnu) p.modeloOnu = form.modeloOnu;
    return p;
  }

  function abrirNovo() {
    setEditing(null);
    setForm({ ...emptyForm });
    setTab('dados');
    setErro('');
    setShowModal(true);
  }

  function abrirEditar(c: Cliente) {
    setEditing(c);
    setForm({
      nome: c.nome,
      cpfCnpj: c.cpfCnpj,
      email: c.email ?? '',
      celular: c.celular ?? '',
      usuarioPppoe: c.usuarioPppoe,
      senhaPppoe: '',
      logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
      planoId: '',
      diaVencimento: '10',
      serialOnu: '', macOnu: '', modeloOnu: '',
    });
    setTab('dados');
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

  const filtrados = filtro
    ? clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(filtro.toLowerCase()) ||
          c.usuarioPppoe.toLowerCase().includes(filtro.toLowerCase()) ||
          c.cpfCnpj.includes(filtro),
      )
    : clientes;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Clientes</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSoInadimplentes(false); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${!soInadimplentes ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Todos
          </button>
          <button
            onClick={() => { setSoInadimplentes(true); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${soInadimplentes ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Inadimplentes
          </button>
          <span className="text-sm text-gray-500 ml-1">{resultado?.total ?? 0}</span>
          <button
            onClick={exportarCsv}
            disabled={exportando}
            className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 ml-1"
          >
            {exportando ? 'Exportando...' : 'CSV'}
          </button>
          <button
            onClick={abrirNovo}
            className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors ml-1"
          >
            + Novo Cliente
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome, PPPoE ou CPF..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
      />

      {isLoading ? (
        <p className="text-gray-500 text-sm text-center py-8">Carregando clientes...</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">PPPoE</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">ONU</th>
                <th className="text-left px-4 py-3">Sinal</th>
                <th className="text-left px-4 py-3">Plano</th>
                <th className="text-left px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtrados.map((c) => (
                <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{c.nome}</p>
                    <p className="text-xs text-gray-500">{c.cpfCnpj}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.usuarioPppoe}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPppoeColor[c.statusPppoe]}`}>
                      {c.statusPppoe}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${statusOnuColor[c.statusOnu]}`}>
                    {c.statusOnu}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {c.sinalOnu ? `${c.sinalOnu} dBm` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {c.plano ? `${c.plano.nome} (${c.plano.velocidadeDn}M)` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => abrirRoteador(c)}
                        className="text-xs px-2 py-1 bg-indigo-900 text-indigo-300 rounded hover:bg-indigo-800 transition-colors"
                        title="Acesso remoto ao roteador do cliente"
                      >
                        Roteador
                      </button>
                      {c.statusPppoe === 'ATIVO' ? (
                        <button
                          onClick={() => bloquear.mutate(c.id)}
                          className="text-xs px-2 py-1 bg-red-900 text-red-300 rounded hover:bg-red-800 transition-colors"
                        >
                          Bloquear
                        </button>
                      ) : c.statusPppoe === 'BLOQUEADO' ? (
                        <button
                          onClick={() => desbloquear.mutate(c.id)}
                          className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded hover:bg-green-800 transition-colors"
                        >
                          Desbloquear
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resultado && (
            <Pagination
              page={resultado.page}
              totalPages={resultado.totalPages}
              total={resultado.total}
              limit={LIMIT}
              onChange={(p) => setPage(p)}
            />
          )}
        </div>
      )}

      {/* Modal Roteador */}
      {roteador && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setRoteador(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">Gerenciar Roteador</h3>
                <p className="text-xs text-gray-500 mt-0.5">{roteador.cliente.nome}</p>
              </div>
              <button onClick={() => setRoteador(null)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>

            <div className="space-y-3">
              {/* Protocolo */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Protocolo</label>
                <div className="flex gap-2">
                  {(['http', 'https'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setRoteador((r) => r ? { ...r, protocolo: p } : r)}
                      className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${roteador.protocolo === p ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* IP */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Endereço IP
                  {roteador.cliente.ipFixo && (
                    <span className="ml-2 text-green-500">● do cadastro</span>
                  )}
                </label>
                <input
                  type="text"
                  value={roteador.ip}
                  onChange={(e) => setRoteador((r) => r ? { ...r, ip: e.target.value } : r)}
                  className={inputCls}
                  placeholder="192.168.0.1"
                />
                {!roteador.cliente.ipFixo && (
                  <p className="text-xs text-yellow-600 mt-1">⚠ IP fixo não cadastrado. Digite o IP manualmente.</p>
                )}
              </div>

              {/* Porta */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Porta de acesso</label>
                <input
                  type="number"
                  value={roteador.porta}
                  onChange={(e) => setRoteador((r) => r ? { ...r, porta: e.target.value } : r)}
                  className={inputCls}
                  placeholder="80"
                  onKeyDown={(e) => e.key === 'Enter' && acessarRoteador()}
                  autoFocus
                />
                <div className="flex gap-1 mt-1.5">
                  {['80', '8080', '443', '8443'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setRoteador((r) => r ? { ...r, porta: p, protocolo: (p === '443' || p === '8443') ? 'https' : r.protocolo } : r)}
                      className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview da URL */}
              {roteador.ip && roteador.porta && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-0.5">URL de acesso</p>
                  <p className="text-xs font-mono text-blue-400 break-all">
                    {roteador.protocolo}://{roteador.ip}:{roteador.porta}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setRoteador(null)} className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button
                onClick={acessarRoteador}
                disabled={!roteador.ip || !roteador.porta}
                className="flex-1 text-sm py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                Acessar →
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={fecharModal}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={fecharModal} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 px-6">
              {(['dados', 'endereco', 'onu'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors ${
                    tab === t
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t === 'dados' ? 'Dados Pessoais' : t === 'endereco' ? 'Endereço' : 'ONU / PPPoE'}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {tab === 'dados' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nome *">
                      <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} className={inputCls} placeholder="Nome completo" />
                    </Field>
                    <Field label="CPF / CNPJ *">
                      <input type="text" value={form.cpfCnpj} onChange={(e) => set('cpfCnpj', e.target.value)} className={inputCls} placeholder="000.000.000-00" />
                    </Field>
                    <Field label="E-mail">
                      <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} placeholder="email@exemplo.com" />
                    </Field>
                    <Field label="Celular">
                      <input type="text" value={form.celular} onChange={(e) => set('celular', e.target.value)} className={inputCls} placeholder="(11) 99999-9999" />
                    </Field>
                    <Field label="Plano">
                      <select value={form.planoId} onChange={(e) => set('planoId', e.target.value)} className={inputCls}>
                        <option value="">Selecione...</option>
                        {planos.filter((p) => p.ativo).map((p) => (
                          <option key={p.id} value={p.id}>{p.nome} — {p.velocidadeDn}M — R$ {Number(p.valor).toFixed(2)}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Dia de Vencimento">
                      <input type="number" min={1} max={31} value={form.diaVencimento} onChange={(e) => set('diaVencimento', e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                </>
              )}

              {tab === 'endereco' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CEP">
                    <input type="text" value={form.cep} onChange={(e) => set('cep', e.target.value)} className={inputCls} placeholder="00000-000" />
                  </Field>
                  <Field label="Número">
                    <input type="text" value={form.numero} onChange={(e) => set('numero', e.target.value)} className={inputCls} placeholder="123" />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Logradouro">
                      <input type="text" value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} className={inputCls} placeholder="Rua, Avenida..." />
                    </Field>
                  </div>
                  <Field label="Complemento">
                    <input type="text" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} className={inputCls} placeholder="Apto, Bloco..." />
                  </Field>
                  <Field label="Bairro">
                    <input type="text" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} className={inputCls} placeholder="Bairro" />
                  </Field>
                  <Field label="Cidade">
                    <input type="text" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} className={inputCls} placeholder="Cidade" />
                  </Field>
                  <Field label="UF">
                    <input type="text" maxLength={2} value={form.uf} onChange={(e) => set('uf', e.target.value.toUpperCase())} className={inputCls} placeholder="SP" />
                  </Field>
                </div>
              )}

              {tab === 'onu' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Usuário PPPoE *">
                    <input type="text" value={form.usuarioPppoe} onChange={(e) => set('usuarioPppoe', e.target.value)} className={inputCls} placeholder="cliente01" />
                  </Field>
                  <Field label={editing ? 'Nova Senha PPPoE (vazio = não alterar)' : 'Senha PPPoE *'}>
                    <input type="text" value={form.senhaPppoe} onChange={(e) => set('senhaPppoe', e.target.value)} className={inputCls} placeholder="senha123" />
                  </Field>
                  <Field label="Serial ONU">
                    <input type="text" value={form.serialOnu} onChange={(e) => set('serialOnu', e.target.value)} className={inputCls} placeholder="ZTEG12345678" />
                  </Field>
                  <Field label="MAC ONU">
                    <input type="text" value={form.macOnu} onChange={(e) => set('macOnu', e.target.value)} className={inputCls} placeholder="AA:BB:CC:DD:EE:FF" />
                  </Field>
                  <Field label="Modelo ONU">
                    <input type="text" value={form.modeloOnu} onChange={(e) => set('modeloOnu', e.target.value)} className={inputCls} placeholder="ZTE F660" />
                  </Field>
                </div>
              )}
            </div>

            {/* Footer */}
            {erro && <p className="px-6 text-xs text-red-400">{erro}</p>}
            <div className="flex gap-2 px-6 py-4 border-t border-gray-800">
              <button
                onClick={fecharModal}
                className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => salvar.mutate()}
                disabled={!form.nome || !form.cpfCnpj || !form.usuarioPppoe || (!editing && !form.senhaPppoe) || salvar.isPending}
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
