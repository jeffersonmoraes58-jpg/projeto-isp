import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contratosApi, planosApi } from '../services/api';
import { Contrato, Cliente, Plano } from '../types';

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';

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
  apelido: '',
  usuarioPppoe: '', senhaPppoe: '',
  serialOnu: '', macOnu: '', modeloOnu: '', ipFixo: '',
  logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
  planoId: '', diaVencimento: '10',
};

type FormData = typeof emptyForm;
type Tab = 'pppoe' | 'endereco' | 'onu';

interface Props {
  cliente: Cliente;
  onClose: () => void;
}

export default function ContratosModal({ cliente, onClose }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [tab, setTab] = useState<Tab>('pppoe');
  const [erro, setErro] = useState('');

  const { data: contratos = [], isLoading } = useQuery<Contrato[]>({
    queryKey: ['contratos', cliente.id],
    queryFn: () => contratosApi.getByCliente(cliente.id),
  });

  const { data: planos = [] } = useQuery<Plano[]>({
    queryKey: ['planos'],
    queryFn: planosApi.getAll,
    enabled: showForm,
  });

  const salvar = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = { clienteId: cliente.id };
      if (form.apelido) body.apelido = form.apelido;
      body.usuarioPppoe = form.usuarioPppoe;
      body.senhaPppoe = form.senhaPppoe;
      if (form.serialOnu) body.serialOnu = form.serialOnu;
      if (form.macOnu) body.macOnu = form.macOnu;
      if (form.modeloOnu) body.modeloOnu = form.modeloOnu;
      if (form.ipFixo) body.ipFixo = form.ipFixo;
      if (form.logradouro) body.logradouro = form.logradouro;
      if (form.numero) body.numero = form.numero;
      if (form.complemento) body.complemento = form.complemento;
      if (form.bairro) body.bairro = form.bairro;
      if (form.cidade) body.cidade = form.cidade;
      if (form.uf) body.uf = form.uf;
      if (form.cep) body.cep = form.cep;
      if (form.planoId) body.planoId = form.planoId;
      if (form.diaVencimento) body.diaVencimento = parseInt(form.diaVencimento, 10);
      return editing
        ? contratosApi.update(editing.id, body)
        : contratosApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contratos', cliente.id] });
      fecharForm();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      setErro(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erro ao salvar'));
    },
  });

  const remover = useMutation({
    mutationFn: (id: string) => contratosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contratos', cliente.id] }),
  });

  const bloquear = useMutation({
    mutationFn: (id: string) => contratosApi.bloquear(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contratos', cliente.id] }),
  });

  const desbloquear = useMutation({
    mutationFn: (id: string) => contratosApi.desbloquear(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contratos', cliente.id] }),
  });

  function abrirNovo() {
    setEditing(null);
    setForm({ ...emptyForm });
    setTab('pppoe');
    setErro('');
    setShowForm(true);
  }

  function abrirEditar(c: Contrato) {
    setEditing(c);
    setForm({
      apelido: c.apelido ?? '',
      usuarioPppoe: c.usuarioPppoe,
      senhaPppoe: '',
      serialOnu: c.serialOnu ?? '',
      macOnu: c.macOnu ?? '',
      modeloOnu: c.modeloOnu ?? '',
      ipFixo: c.ipFixo ?? '',
      logradouro: c.logradouro ?? '',
      numero: c.numero ?? '',
      complemento: c.complemento ?? '',
      bairro: c.bairro ?? '',
      cidade: c.cidade ?? '',
      uf: c.uf ?? '',
      cep: c.cep ?? '',
      planoId: c.planoId ?? '',
      diaVencimento: String(c.diaVencimento),
    });
    setTab('pppoe');
    setErro('');
    setShowForm(true);
  }

  function fecharForm() { setShowForm(false); setEditing(null); setErro(''); }
  function set(field: keyof FormData, value: string) { setForm((p) => ({ ...p, [field]: value })); }

  function enderecoResumo(c: Contrato) {
    const partes = [c.logradouro, c.numero, c.bairro, c.cidade && c.uf ? `${c.cidade}/${c.uf}` : c.cidade].filter(Boolean);
    return partes.length > 0 ? partes.join(', ') : 'Sem endereço';
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="text-white font-semibold">Contratos — {cliente.nome}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{cliente.cpfCnpj}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={abrirNovo} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
              + Novo Contrato
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
          </div>
        </div>

        {/* Lista de contratos */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoading && <p className="text-gray-500 text-sm text-center py-4">Carregando...</p>}

          {/* Contrato principal (dados do próprio Cliente) */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full font-medium">Principal</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPppoeColor[cliente.statusPppoe]}`}>{cliente.statusPppoe}</span>
                </div>
                <p className="font-mono text-sm text-white mt-1">{cliente.usuarioPppoe}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {[cliente as any].map((c) => {
                    const partes = [c.logradouro, c.numero, c.bairro, c.cidade && c.uf ? `${c.cidade}/${c.uf}` : c.cidade].filter(Boolean);
                    return partes.length > 0 ? partes.join(', ') : 'Sem endereço';
                  })[0]}
                </p>
                {(cliente as any).plano && <p className="text-xs text-gray-500 mt-0.5">Plano: {(cliente as any).plano.nome}</p>}
              </div>
              <div className="text-right">
                <p className={`text-xs font-medium ${statusOnuColor[cliente.statusOnu]}`}>{cliente.statusOnu}</p>
                {cliente.sinalOnu && <p className="text-xs font-mono text-gray-400">{Number(cliente.sinalOnu).toFixed(1)} dBm</p>}
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Para editar o contrato principal, use "Editar Cliente".</p>
          </div>

          {/* Contratos adicionais */}
          {contratos.length === 0 && !isLoading && (
            <p className="text-xs text-gray-600 text-center py-4">Nenhum contrato adicional. Clique em "+ Novo Contrato" para adicionar.</p>
          )}

          {contratos.map((c) => (
            <div key={c.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.apelido && <span className="text-xs font-medium text-gray-300 bg-gray-700 px-2 py-0.5 rounded">{c.apelido}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPppoeColor[c.statusPppoe]}`}>{c.statusPppoe}</span>
                    <span className={`text-xs font-medium ${statusOnuColor[c.statusOnu]}`}>{c.statusOnu}</span>
                    {c.sinalOnu && <span className="text-xs font-mono text-gray-400">{Number(c.sinalOnu).toFixed(1)} dBm</span>}
                  </div>
                  <p className="font-mono text-sm text-white mt-1">{c.usuarioPppoe}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{enderecoResumo(c)}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {c.plano && <span>Plano: {c.plano.nome}</span>}
                    {c.ctoPorta && <span>CTO: {c.ctoPorta.cto?.nome} · Porta {c.ctoPorta.numero}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 ml-3 flex-shrink-0">
                  <button onClick={() => abrirEditar(c)} className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">Editar</button>
                  {c.statusPppoe === 'ATIVO' ? (
                    <button onClick={() => bloquear.mutate(c.id)} className="text-xs px-2 py-1 bg-red-900 text-red-300 rounded hover:bg-red-800 transition-colors">Bloquear</button>
                  ) : c.statusPppoe === 'BLOQUEADO' ? (
                    <button onClick={() => desbloquear.mutate(c.id)} className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded hover:bg-green-800 transition-colors">Ativar</button>
                  ) : null}
                  <button onClick={() => { if (window.confirm(`Remover contrato ${c.usuarioPppoe}?`)) remover.mutate(c.id); }} className="text-xs px-2 py-1 bg-red-950 text-red-500 rounded hover:bg-red-900 transition-colors">Remover</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Formulário inline */}
        {showForm && (
          <div className="border-t border-gray-700 bg-gray-950 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">{editing ? `Editar — ${editing.usuarioPppoe}` : 'Novo Contrato'}</h4>
              <button onClick={fecharForm} className="text-gray-500 hover:text-gray-300 text-xs">✕ Cancelar</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-3 border-b border-gray-800">
              {(['pppoe', 'endereco', 'onu'] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                  {t === 'pppoe' ? 'PPPoE / Plano' : t === 'endereco' ? 'Endereço' : 'ONU'}
                </button>
              ))}
            </div>

            {tab === 'pppoe' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Apelido (ex: Casa, Escritório)</label>
                  <input type="text" value={form.apelido} onChange={(e) => set('apelido', e.target.value)} className={inputCls} placeholder="Identificação do local" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Usuário PPPoE *</label>
                  <input type="text" value={form.usuarioPppoe} onChange={(e) => set('usuarioPppoe', e.target.value)} className={inputCls} placeholder="cliente.local01" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{editing ? 'Nova Senha (vazio = manter)' : 'Senha PPPoE *'}</label>
                  <input type="text" value={form.senhaPppoe} onChange={(e) => set('senhaPppoe', e.target.value)} className={inputCls} placeholder="senha123" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Plano</label>
                  <select value={form.planoId} onChange={(e) => set('planoId', e.target.value)} className={inputCls}>
                    <option value="">Selecione...</option>
                    {(planos as Plano[]).filter((p) => p.ativo).map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} — {p.velocidadeDn}M</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Dia de Vencimento</label>
                  <input type="number" min={1} max={31} value={form.diaVencimento} onChange={(e) => set('diaVencimento', e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            {tab === 'endereco' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">CEP</label>
                  <input type="text" value={form.cep} onChange={(e) => set('cep', e.target.value)} className={inputCls} placeholder="00000-000" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Número</label>
                  <input type="text" value={form.numero} onChange={(e) => set('numero', e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Logradouro</label>
                  <input type="text" value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} className={inputCls} placeholder="Rua, Avenida..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Bairro</label>
                  <input type="text" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Complemento</label>
                  <input type="text" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Cidade</label>
                  <input type="text" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">UF</label>
                  <input type="text" maxLength={2} value={form.uf} onChange={(e) => set('uf', e.target.value.toUpperCase())} className={inputCls} placeholder="SP" />
                </div>
              </div>
            )}

            {tab === 'onu' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Serial ONU</label>
                  <input type="text" value={form.serialOnu} onChange={(e) => set('serialOnu', e.target.value)} className={inputCls} placeholder="ZTEG12345678" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">MAC ONU</label>
                  <input type="text" value={form.macOnu} onChange={(e) => set('macOnu', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Modelo ONU</label>
                  <input type="text" value={form.modeloOnu} onChange={(e) => set('modeloOnu', e.target.value)} className={inputCls} placeholder="ZTE F660" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">IP Fixo</label>
                  <input type="text" value={form.ipFixo} onChange={(e) => set('ipFixo', e.target.value)} className={inputCls} placeholder="192.168.0.1" />
                </div>
              </div>
            )}

            {erro && <p className="text-xs text-red-400 mt-2">{erro}</p>}

            <div className="flex gap-2 mt-3">
              <button onClick={fecharForm} className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
              <button
                onClick={() => salvar.mutate()}
                disabled={!form.usuarioPppoe || (!editing && !form.senhaPppoe) || salvar.isPending}
                className="flex-1 text-sm py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {salvar.isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
