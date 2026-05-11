import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordensServicoApi, clientesApi, authApi } from '../services/api';
import { OrdemServico, TipoOS, PrioridadeOS, Cliente, User } from '../types';
import Pagination from '../components/Pagination';

// ─── Helpers de cor ──────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  ABERTA: 'bg-blue-900 text-blue-300',
  EM_ANDAMENTO: 'bg-yellow-900 text-yellow-300',
  CONCLUIDA: 'bg-green-900 text-green-300',
  CANCELADA: 'bg-gray-800 text-gray-500',
};

const prioridadeColor: Record<string, string> = {
  BAIXA: 'text-gray-400',
  MEDIA: 'text-blue-400',
  ALTA: 'text-orange-400',
  URGENTE: 'text-red-400',
};

const tipoLabel: Record<TipoOS, string> = {
  INSTALACAO: 'Instalação',
  MANUTENCAO: 'Manutenção',
  SUPORTE: 'Suporte',
  RETIRADA: 'Retirada',
  VISITA: 'Visita',
};

const TIPOS: TipoOS[] = ['INSTALACAO', 'MANUTENCAO', 'SUPORTE', 'RETIRADA', 'VISITA'];
const PRIORIDADES: PrioridadeOS[] = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];
const STATUS_FILTROS = ['TODAS', 'ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';

const emptyForm = {
  tipo: 'INSTALACAO' as TipoOS,
  prioridade: 'MEDIA' as PrioridadeOS,
  titulo: '',
  descricao: '',
  clienteId: '',
  tecnicoId: '',
  endereco: '',
  agendadoPara: '',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OrdensServicoPage() {
  const qc = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState('TODAS');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OrdemServico | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [showConcluir, setShowConcluir] = useState<OrdemServico | null>(null);
  const [obsConclui, setObsConclui] = useState('');

  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [clienteNome, setClienteNome] = useState('');

  const { data: resultado } = useQuery<{ data: OrdemServico[]; total: number; totalPages: number; page: number; limit: number }>({
    queryKey: ['ordens-servico', filtroStatus, page],
    queryFn: () => ordensServicoApi.getAll({
      status: filtroStatus === 'TODAS' ? undefined : filtroStatus,
      page, limit: LIMIT,
    }),
  });

  const { data: stats } = useQuery<{ abertas: number; emAndamento: number; concluidasHoje: number; canceladas: number }>({
    queryKey: ['ordens-servico-stats'],
    queryFn: ordensServicoApi.getStats,
    refetchInterval: 30_000,
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes-select'],
    queryFn: () => clientesApi.getAll({ limit: 500 }).then((r) => r.data ?? r),
    enabled: showModal,
  });

  const { data: tecnicos = [] } = useQuery<User[]>({
    queryKey: ['usuarios'],
    queryFn: authApi.listarUsuarios,
    enabled: showModal,
  });

  const salvar = useMutation({
    mutationFn: () => editing
      ? ordensServicoApi.update(editing.id, { ...form, clienteId: form.clienteId || undefined, tecnicoId: form.tecnicoId || undefined, agendadoPara: form.agendadoPara || undefined })
      : ordensServicoApi.create({ ...form, clienteId: form.clienteId || undefined, tecnicoId: form.tecnicoId || undefined, agendadoPara: form.agendadoPara || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens-servico'] }); qc.invalidateQueries({ queryKey: ['ordens-servico-stats'] }); fecharModal(); },
  });

  const iniciar = useMutation({
    mutationFn: (id: string) => ordensServicoApi.iniciar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens-servico'] }); qc.invalidateQueries({ queryKey: ['ordens-servico-stats'] }); },
  });

  const concluir = useMutation({
    mutationFn: () => ordensServicoApi.concluir(showConcluir!.id, obsConclui),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens-servico'] }); qc.invalidateQueries({ queryKey: ['ordens-servico-stats'] }); setShowConcluir(null); setObsConclui(''); },
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => ordensServicoApi.cancelar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens-servico'] }); qc.invalidateQueries({ queryKey: ['ordens-servico-stats'] }); },
  });

  function abrirNova() {
    setEditing(null);
    setForm({ ...emptyForm });
    setClienteSearch('');
    setClienteNome('');
    setClienteDropdown(false);
    setShowModal(true);
  }

  function abrirEditar(os: OrdemServico) {
    setEditing(os);
    setForm({
      tipo: os.tipo, prioridade: os.prioridade, titulo: os.titulo,
      descricao: os.descricao ?? '', clienteId: os.clienteId ?? '',
      tecnicoId: os.tecnicoId ?? '', endereco: os.endereco ?? '',
      agendadoPara: os.agendadoPara ? os.agendadoPara.slice(0, 16) : '',
    });
    setClienteSearch('');
    setClienteNome(os.cliente?.nome ?? '');
    setClienteDropdown(false);
    setShowModal(true);
  }

  async function selecionarCliente(c: Cliente) {
    setClienteNome(c.nome);
    setClienteSearch('');
    setClienteDropdown(false);
    setForm((p) => ({ ...p, clienteId: c.id }));
    try {
      const detalhe = await clientesApi.getOne(c.id);
      const partes = [detalhe.logradouro, detalhe.numero, detalhe.bairro, detalhe.cidade && detalhe.uf ? `${detalhe.cidade}/${detalhe.uf}` : detalhe.cidade].filter(Boolean);
      if (partes.length > 0) setForm((p) => ({ ...p, clienteId: c.id, endereco: partes.join(', ') }));
    } catch { /* endereço não crítico */ }
  }

  function limparCliente() {
    setClienteNome('');
    setClienteSearch('');
    setForm((p) => ({ ...p, clienteId: '', endereco: '' }));
  }

  function fecharModal() { setShowModal(false); setEditing(null); }
  function set(field: keyof typeof emptyForm, value: string) { setForm((p) => ({ ...p, [field]: value })); }

  const ordens = resultado?.data ?? [];

  const clientesFiltrados = clienteSearch.length >= 1
    ? clientes.filter((c) => {
        const q = clienteSearch.toLowerCase();
        return c.nome.toLowerCase().includes(q) || c.cpfCnpj.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
      }).slice(0, 8)
    : [];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Ordens de Serviço</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gestão de chamados e atendimentos técnicos</p>
        </div>
        <button onClick={abrirNova} className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
          + Nova OS
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Abertas', value: stats.abertas, color: 'text-blue-400' },
            { label: 'Em Andamento', value: stats.emAndamento, color: 'text-yellow-400' },
            { label: 'Concluídas Hoje', value: stats.concluidasHoje, color: 'text-green-400' },
            { label: 'Canceladas', value: stats.canceladas, color: 'text-gray-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTROS.map((s) => (
          <button
            key={s}
            onClick={() => { setFiltroStatus(s); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filtroStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {s === 'TODAS' ? 'Todas' : s === 'EM_ANDAMENTO' ? 'Em Andamento' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        <span className="text-xs text-gray-500 self-center ml-2">{resultado?.total ?? 0} registros</span>
      </div>

      {/* Tabela */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-3">Nº / Tipo</th>
              <th className="text-left px-4 py-3">Título</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Técnico</th>
              <th className="text-left px-4 py-3">Agendado</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {ordens.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-600 text-sm py-8">Nenhuma OS encontrada</td></tr>
            )}
            {ordens.map((os) => (
              <tr key={os.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-gray-400">#{os.numero}</p>
                  <p className="text-xs font-medium text-gray-300">{tipoLabel[os.tipo]}</p>
                  <p className={`text-xs font-semibold ${prioridadeColor[os.prioridade]}`}>{os.prioridade}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{os.titulo}</p>
                  {os.descricao && <p className="text-xs text-gray-500 truncate max-w-xs">{os.descricao}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{os.cliente?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{os.tecnico?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{fmt(os.agendadoPara)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[os.status]}`}>
                    {os.status === 'EM_ANDAMENTO' ? 'Em Andamento' : os.status.charAt(0) + os.status.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => abrirEditar(os)} className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">Editar</button>
                    {os.status === 'ABERTA' && (
                      <button onClick={() => iniciar.mutate(os.id)} disabled={iniciar.isPending} className="text-xs px-2 py-1 bg-yellow-900 text-yellow-300 rounded hover:bg-yellow-800 transition-colors disabled:opacity-50">Iniciar</button>
                    )}
                    {(os.status === 'ABERTA' || os.status === 'EM_ANDAMENTO') && (
                      <button onClick={() => { setShowConcluir(os); setObsConclui(''); }} className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded hover:bg-green-800 transition-colors">Concluir</button>
                    )}
                    {os.status !== 'CONCLUIDA' && os.status !== 'CANCELADA' && (
                      <button onClick={() => { if (window.confirm('Cancelar esta OS?')) cancelar.mutate(os.id); }} className="text-xs px-2 py-1 bg-red-900 text-red-300 rounded hover:bg-red-800 transition-colors">Cancelar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resultado && (
          <div className="px-4 pb-3">
            <Pagination page={resultado.page} totalPages={resultado.totalPages} total={resultado.total} limit={LIMIT} onChange={setPage} />
          </div>
        )}
      </div>

      {/* Modal criar/editar OS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={fecharModal}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{editing ? `Editar OS #${editing.numero}` : 'Nova Ordem de Serviço'}</h3>
              <button onClick={fecharModal} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tipo *</label>
                <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)} className={inputCls}>
                  {TIPOS.map((t) => <option key={t} value={t}>{tipoLabel[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Prioridade</label>
                <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value)} className={inputCls}>
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Título *</label>
                <input type="text" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} className={inputCls} placeholder="Descrição resumida" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="Detalhes do problema ou serviço" />
              </div>
              <div className="relative">
                <label className="text-xs text-gray-500 block mb-1">Cliente</label>
                {clienteNome ? (
                  <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm text-white truncate">{clienteNome}</span>
                    <button type="button" onClick={limparCliente} className="text-gray-500 hover:text-gray-300 text-xs flex-shrink-0">✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={clienteSearch}
                      onChange={(e) => { setClienteSearch(e.target.value); setClienteDropdown(true); }}
                      onFocus={() => setClienteDropdown(true)}
                      onBlur={() => setTimeout(() => setClienteDropdown(false), 150)}
                      className={inputCls}
                      placeholder="Digite nome ou CPF/CNPJ..."
                      autoComplete="off"
                    />
                    {clienteDropdown && clientesFiltrados.length > 0 && (
                      <div className="absolute z-10 top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                        {clientesFiltrados.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => selecionarCliente(c)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-0"
                          >
                            <p className="text-sm text-white">{c.nome}</p>
                            <p className="text-xs text-gray-500">{c.cpfCnpj}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {clienteDropdown && clienteSearch.length >= 1 && clientesFiltrados.length === 0 && (
                      <div className="absolute z-10 top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500">Nenhum cliente encontrado</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Técnico</label>
                <select value={form.tecnicoId} onChange={(e) => set('tecnicoId', e.target.value)} className={inputCls}>
                  <option value="">Selecione...</option>
                  {tecnicos.filter((u) => u.ativo).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Endereço</label>
                <input type="text" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} className={inputCls} placeholder="Rua, número, bairro" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Agendado para</label>
                <input type="datetime-local" value={form.agendadoPara} onChange={(e) => set('agendadoPara', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={fecharModal} className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
              <button
                onClick={() => salvar.mutate()}
                disabled={!form.titulo || !form.tipo || salvar.isPending}
                className="flex-1 text-sm py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {salvar.isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal concluir */}
      {showConcluir && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowConcluir(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Concluir OS #{showConcluir.numero}</h3>
              <button onClick={() => setShowConcluir(null)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Observação do técnico</label>
              <textarea
                value={obsConclui}
                onChange={(e) => setObsConclui(e.target.value)}
                rows={3}
                placeholder="Descreva o que foi feito..."
                className={inputCls + ' resize-none'}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConcluir(null)} className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
              <button
                onClick={() => concluir.mutate()}
                disabled={concluir.isPending}
                className="flex-1 text-sm py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
              >
                {concluir.isPending ? 'Concluindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
