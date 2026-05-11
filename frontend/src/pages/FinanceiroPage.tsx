import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroApi, clientesApi } from '../services/api';
import { Fatura, Cliente } from '../types';
import Pagination from '../components/Pagination';
import { downloadBlob } from '../utils/download';

const statusColor: Record<string, string> = {
  PENDENTE: 'bg-yellow-900 text-yellow-400',
  PAGA: 'bg-green-900 text-green-400',
  VENCIDA: 'bg-red-900 text-red-400',
  CANCELADA: 'bg-gray-800 text-gray-500',
};

const FILTROS = ['TODAS', 'PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA'] as const;

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function FinanceiroPage() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<string>('TODAS');
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const [qrFatura, setQrFatura] = useState<Fatura | null>(null);
  const [showNovaFatura, setShowNovaFatura] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [form, setForm] = useState({ clienteId: '', valor: '', vencimento: '' });
  const [reguaResult, setReguaResult] = useState<{ avisos: number; bloqueados: number } | null>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [clienteNome, setClienteNome] = useState('');

  const { data: resultado, isLoading } = useQuery<{ data: Fatura[]; total: number; totalPages: number; page: number }>({
    queryKey: ['faturas', filtro, page],
    queryFn: () => financeiroApi.getFaturas({ status: filtro === 'TODAS' ? undefined : filtro, page, limit: LIMIT }),
  });
  const faturas = resultado?.data ?? [];

  async function exportarCsv() {
    setExportando(true);
    try {
      const blob = await financeiroApi.exportarCsv(filtro === 'TODAS' ? undefined : filtro);
      downloadBlob(blob, 'faturas.csv');
    } finally {
      setExportando(false);
    }
  }

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes-select'],
    queryFn: () => clientesApi.getAll({ limit: 500 }).then((r) => r.data ?? r),
    enabled: showNovaFatura,
  });

  const clientesFiltrados = clienteSearch.length >= 1
    ? clientes.filter((c) => {
        const q = clienteSearch.toLowerCase();
        return c.nome.toLowerCase().includes(q) || c.cpfCnpj.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
      }).slice(0, 8)
    : [];

  function abrirNovaFatura() {
    setForm({ clienteId: '', valor: '', vencimento: '' });
    setClienteNome('');
    setClienteSearch('');
    setClienteDropdown(false);
    setShowNovaFatura(true);
  }

  function selecionarCliente(c: Cliente) {
    setForm((p) => ({ ...p, clienteId: c.id }));
    setClienteNome(c.nome);
    setClienteSearch('');
    setClienteDropdown(false);
  }

  function limparCliente() {
    setForm((p) => ({ ...p, clienteId: '' }));
    setClienteNome('');
    setClienteSearch('');
  }

  const gerarFatura = useMutation({
    mutationFn: () =>
      financeiroApi.gerarFatura({
        clienteId: form.clienteId,
        valor: parseFloat(form.valor),
        vencimento: form.vencimento,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faturas'] });
      setShowNovaFatura(false);
      setForm({ clienteId: '', valor: '', vencimento: '' });
    },
  });

  const regua = useMutation({
    mutationFn: financeiroApi.executarReguaCobranca,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['faturas'] });
      setReguaResult(data);
    },
  });

  const totalPendente = faturas
    .filter((f) => f.status === 'PENDENTE')
    .reduce((s, f) => s + Number(f.valor), 0);

  const hoje = new Date();
  const totalPagoMes = faturas
    .filter(
      (f) =>
        f.status === 'PAGA' &&
        f.dataPagamento &&
        new Date(f.dataPagamento).getMonth() === hoje.getMonth() &&
        new Date(f.dataPagamento).getFullYear() === hoje.getFullYear(),
    )
    .reduce((s, f) => s + Number(f.valorPago ?? f.valor), 0);

  const qtdVencidas = faturas.filter((f) => f.status === 'VENCIDA').length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Financeiro</h2>
        <div className="flex gap-2">
          <button
            onClick={() => regua.mutate()}
            disabled={regua.isPending}
            className="text-sm px-3 py-2 bg-orange-900 text-orange-300 rounded-lg hover:bg-orange-800 transition-colors disabled:opacity-50"
          >
            {regua.isPending ? 'Executando...' : 'Executar Régua de Cobrança'}
          </button>
          <button
            onClick={abrirNovaFatura}
            className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            + Nova Fatura
          </button>
        </div>
      </div>

      {/* Resultado da régua */}
      {reguaResult && (
        <div className="bg-orange-950 border border-orange-800 rounded-lg px-4 py-3 text-sm text-orange-300 flex items-center justify-between">
          <span>
            Régua executada: <strong>{reguaResult.avisos}</strong> avisos enviados,{' '}
            <strong>{reguaResult.bloqueados}</strong> clientes bloqueados.
          </span>
          <button onClick={() => setReguaResult(null)} className="text-orange-500 hover:text-orange-300">
            ✕
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Pendente</p>
          <p className="text-2xl font-bold text-yellow-400">{fmt(totalPendente)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pago Este Mês</p>
          <p className="text-2xl font-bold text-green-400">{fmt(totalPagoMes)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Faturas Vencidas</p>
          <p className="text-2xl font-bold text-red-400">{qtdVencidas}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => { setFiltro(f); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filtro === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={exportarCsv}
          disabled={exportando}
          className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 ml-auto"
        >
          {exportando ? 'Exportando...' : 'CSV'}
        </button>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <p className="text-gray-500 text-sm text-center py-8">Carregando faturas...</p>
      ) : faturas.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-8">Nenhuma fatura encontrada.</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">

            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Valor</th>
                <th className="text-left px-4 py-3">Vencimento</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Pgto</th>
                <th className="text-left px-4 py-3">Pix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {faturas.map((f) => (
                <tr key={f.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{f.cliente.nome}</p>
                    <p className="text-xs text-gray-500">{f.cliente.cpfCnpj}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-300">{fmt(Number(f.valor))}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtData(f.vencimento)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[f.status]}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {f.dataPagamento ? fmtData(f.dataPagamento) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {f.pixQrCode ? (
                      <button
                        onClick={() => setQrFatura(f)}
                        className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded hover:bg-blue-800 transition-colors"
                      >
                        Ver QR
                      </button>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resultado && (
            <div className="px-4 pb-3">
              <Pagination
                page={resultado.page}
                totalPages={resultado.totalPages}
                total={resultado.total}
                limit={LIMIT}
                onChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal QR Code Pix */}
      {qrFatura && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setQrFatura(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Pix — {qrFatura.cliente.nome}</h3>
              <button onClick={() => setQrFatura(null)} className="text-gray-500 hover:text-gray-300">
                ✕
              </button>
            </div>
            <div className="text-center">
              <img
                src={qrFatura.pixQrCode!}
                alt="QR Code Pix"
                className="mx-auto w-48 h-48 rounded-lg"
              />
              <p className="text-2xl font-bold text-green-400 mt-3">{fmt(Number(qrFatura.valor))}</p>
              <p className="text-xs text-gray-500 mt-1">Vence em {fmtData(qrFatura.vencimento)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Fatura */}
      {showNovaFatura && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowNovaFatura(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-96 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Nova Fatura</h3>
              <button onClick={() => setShowNovaFatura(false)} className="text-gray-500 hover:text-gray-300">
                ✕
              </button>
            </div>

            <div className="space-y-3">
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
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
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
                <label className="text-xs text-gray-500 block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Vencimento</label>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm((p) => ({ ...p, vencimento: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowNovaFatura(false)}
                className="flex-1 text-sm py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => gerarFatura.mutate()}
                disabled={!form.clienteId || !form.valor || !form.vencimento || gerarFatura.isPending}
                className="flex-1 text-sm py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {gerarFatura.isPending ? 'Gerando...' : 'Gerar Fatura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
