import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ctosApi, clientesApi } from '../../services/api';
import { CtoDetail, CtoPorta, Cliente } from '../../types';

const statusColor: Record<CtoPorta['status'], string> = {
  LIVRE: 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700 hover:border-gray-500',
  OCUPADA: 'bg-green-900 border-green-700 text-green-300 hover:bg-green-800',
  RESERVADA: 'bg-yellow-900 border-yellow-700 text-yellow-300',
  DEFEITO: 'bg-red-900 border-red-700 text-red-300',
};

const sinalColor = (dbm: number | null) => {
  if (dbm === null) return 'text-gray-500';
  if (dbm >= -20) return 'text-green-400';
  if (dbm >= -25) return 'text-yellow-400';
  return 'text-red-400';
};

interface Props {
  ctoId: string;
  onClose: () => void;
}

export default function CtoModal({ ctoId, onClose }: Props) {
  const qc = useQueryClient();
  const [portaSelecionada, setPortaSelecionada] = useState<CtoPorta | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');

  const { data: cto, isLoading } = useQuery<CtoDetail>({
    queryKey: ['cto', ctoId],
    queryFn: () => ctosApi.getOne(ctoId),
  });

  const { data: diagnostico } = useQuery({
    queryKey: ['cto-diagnostico', ctoId],
    queryFn: () => ctosApi.getDiagnostico(ctoId),
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes-select'],
    queryFn: () => clientesApi.getAll({ limit: 500 }).then((r) => r.data ?? r),
    enabled: portaSelecionada?.status === 'LIVRE',
  });

  const associar = useMutation({
    mutationFn: (clienteId: string) => ctosApi.associarCliente(portaSelecionada!.id, clienteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cto', ctoId] });
      qc.invalidateQueries({ queryKey: ['ctos-mapa'] });
      setPortaSelecionada(null);
      setBuscaCliente('');
    },
  });

  const liberar = useMutation({
    mutationFn: (portaId: string) => ctosApi.liberarPorta(portaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cto', ctoId] });
      qc.invalidateQueries({ queryKey: ['ctos-mapa'] });
      setPortaSelecionada(null);
    },
  });

  function handleClickPorta(porta: CtoPorta) {
    if (porta.status === 'RESERVADA' || porta.status === 'DEFEITO') return;
    setPortaSelecionada(porta);
    setBuscaCliente('');
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
      c.usuarioPppoe.toLowerCase().includes(buscaCliente.toLowerCase()),
  );

  const cols = cto?.capacidade === 8 ? 4 : 8;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-white">{cto?.nome ?? 'Carregando...'}</h2>
            {cto && (
              <p className="text-xs text-gray-500">
                {cto.endereco} · OLT: {cto.olt?.nome}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Alerta corte de cabo */}
        {diagnostico?.alerta === 'CORTE_CABO' && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2">
            <span className="text-red-400">⚠️</span>
            <p className="text-sm text-red-300 font-medium">{diagnostico.mensagem}</p>
          </div>
        )}

        {/* Grid de portas */}
        <div className="p-6">
          {isLoading ? (
            <p className="text-gray-500 text-sm text-center py-8">Carregando portas...</p>
          ) : (
            <>
              {/* Legenda */}
              <div className="flex flex-wrap gap-3 mb-4 text-xs">
                {(Object.keys(statusColor) as CtoPorta['status'][]).map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded border ${statusColor[s].split(' ').slice(0, 2).join(' ')}`} />
                    <span className="text-gray-500 capitalize">{s.toLowerCase()}</span>
                  </div>
                ))}
                <span className="text-gray-600 ml-auto">Clique para associar / liberar</span>
              </div>

              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {cto?.portas.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleClickPorta(p)}
                    className={`border rounded-lg p-2 text-center transition-all cursor-pointer select-none ${statusColor[p.status]} ${portaSelecionada?.id === p.id ? 'ring-2 ring-blue-400 scale-105' : ''}`}
                    title={p.cliente?.nome ?? `Porta ${p.numero} — ${p.status}`}
                  >
                    <p className="text-xs font-bold">{p.numero}</p>
                    {p.cliente && (
                      <>
                        <p className="text-[10px] truncate mt-0.5">{p.cliente.nome.split(' ')[0]}</p>
                        <p className={`text-[10px] font-mono ${sinalColor(p.sinalDbm)}`}>
                          {p.sinalDbm ? `${p.sinalDbm}` : '--'}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Resumo */}
              {cto && (
                <div className="mt-4 flex gap-4 text-xs text-gray-500 border-t border-gray-800 pt-4">
                  <span>Total: <b className="text-white">{cto.capacidade}</b></span>
                  <span>Ocupadas: <b className="text-green-400">{cto.portas.filter(p => p.status === 'OCUPADA').length}</b></span>
                  <span>Livres: <b className="text-gray-400">{cto.portas.filter(p => p.status === 'LIVRE').length}</b></span>
                  <span>Defeito: <b className="text-red-400">{cto.portas.filter(p => p.status === 'DEFEITO').length}</b></span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Painel de ação — aparece ao selecionar porta */}
        {portaSelecionada && (
          <div className="border-t border-gray-800 px-6 py-4 bg-gray-950/60">
            {portaSelecionada.status === 'LIVRE' ? (
              <>
                <p className="text-sm font-medium text-white mb-3">
                  Porta {portaSelecionada.numero} — Associar cliente
                </p>
                <input
                  type="text"
                  placeholder="Buscar cliente por nome ou PPPoE..."
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 mb-2"
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {clientesFiltrados.slice(0, 20).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => associar.mutate(c.id)}
                      disabled={associar.isPending}
                      className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-white">{c.nome}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.usuarioPppoe}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.statusOnu === 'ONLINE' ? 'text-green-400' : 'text-red-400'}`}>
                        {c.statusOnu}
                      </span>
                    </button>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <p className="text-xs text-gray-600 text-center py-3">Nenhum cliente encontrado</p>
                  )}
                </div>
                <button
                  onClick={() => setPortaSelecionada(null)}
                  className="mt-2 text-xs text-gray-600 hover:text-gray-400"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-white mb-1">
                  Porta {portaSelecionada.numero} — {portaSelecionada.cliente?.nome}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Status ONU: <span className={portaSelecionada.cliente?.statusOnu === 'ONLINE' ? 'text-green-400' : 'text-red-400'}>
                    {portaSelecionada.cliente?.statusOnu ?? '—'}
                  </span>
                  {portaSelecionada.sinalDbm && (
                    <span className={`ml-3 ${sinalColor(portaSelecionada.sinalDbm)}`}>
                      {portaSelecionada.sinalDbm} dBm
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => liberar.mutate(portaSelecionada.id)}
                    disabled={liberar.isPending}
                    className="text-sm px-4 py-2 bg-red-900 text-red-300 rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50"
                  >
                    {liberar.isPending ? 'Liberando...' : 'Liberar porta'}
                  </button>
                  <button
                    onClick={() => setPortaSelecionada(null)}
                    className="text-sm px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
