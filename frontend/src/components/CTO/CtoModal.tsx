import { useQuery } from '@tanstack/react-query';
import { ctosApi } from '../../services/api';
import { CtoDetail, CtoPorta } from '../../types';

const statusColor: Record<CtoPorta['status'], string> = {
  LIVRE: 'bg-gray-700 border-gray-600 text-gray-400',
  OCUPADA: 'bg-green-900 border-green-700 text-green-300',
  RESERVADA: 'bg-yellow-900 border-yellow-700 text-yellow-300',
  DEFEITO: 'bg-red-900 border-red-700 text-red-300',
};

const sinalColor = (dbm: number | null) => {
  if (dbm === null) return 'text-gray-500';
  if (dbm >= -20) return 'text-green-400';
  if (dbm >= -25) return 'text-yellow-400';
  return 'text-red-400';
};

function PortaCard({ porta }: { porta: CtoPorta }) {
  return (
    <div
      className={`border rounded-lg p-2 text-center cursor-pointer transition-transform hover:scale-105 ${statusColor[porta.status]}`}
      title={porta.cliente?.nome ?? `Porta ${porta.numero} — ${porta.status}`}
    >
      <p className="text-xs font-bold">{porta.numero}</p>
      {porta.cliente && (
        <>
          <p className="text-[10px] truncate max-w-full mt-0.5">{porta.cliente.nome.split(' ')[0]}</p>
          <p className={`text-[10px] font-mono ${sinalColor(porta.sinalDbm)}`}>
            {porta.sinalDbm ? `${porta.sinalDbm} dBm` : '--'}
          </p>
        </>
      )}
    </div>
  );
}

interface Props {
  ctoId: string;
  onClose: () => void;
}

export default function CtoModal({ ctoId, onClose }: Props) {
  const { data: cto, isLoading } = useQuery<CtoDetail>({
    queryKey: ['cto', ctoId],
    queryFn: () => ctosApi.getOne(ctoId),
  });

  const { data: diagnostico } = useQuery({
    queryKey: ['cto-diagnostico', ctoId],
    queryFn: () => ctosApi.getDiagnostico(ctoId),
  });

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
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Alerta corte de cabo */}
        {diagnostico?.alerta === 'CORTE_CABO' && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2">
            <span className="text-red-400 text-lg">⚠️</span>
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
                {Object.entries(statusColor).map(([s, cls]) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded border ${cls}`} />
                    <span className="text-gray-500 capitalize">{s.toLowerCase()}</span>
                  </div>
                ))}
              </div>

              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${cto?.capacidade === 8 ? 4 : cto?.capacidade === 16 ? 8 : 8}, minmax(0, 1fr))` }}
              >
                {cto?.portas.map((p) => <PortaCard key={p.id} porta={p} />)}
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
      </div>
    </div>
  );
}
