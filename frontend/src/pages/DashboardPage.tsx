import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import { DashboardSummary } from '../types';

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function AlarmeBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    CORTE_CABO: 'bg-red-900 text-red-300',
    OLT_OFFLINE: 'bg-orange-900 text-orange-300',
    SINAL_CRITICO: 'bg-yellow-900 text-yellow-300',
    ALTA_INADIMPLENCIA: 'bg-purple-900 text-purple-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[tipo] ?? 'bg-gray-800 text-gray-400'}`}>
      {tipo.replace('_', ' ')}
    </span>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Carregando dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Erro ao carregar dados. Verifique se o backend está rodando.
      </div>
    );
  }

  const onlinePct = data.clientes.total > 0
    ? Math.round((data.clientes.online / data.clientes.total) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-0.5">Visão geral do sistema em tempo real</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Clientes Online"
          value={data.clientes.online}
          sub={`${onlinePct}% do total`}
          color="text-green-400"
        />
        <StatCard
          label="Clientes Offline"
          value={data.clientes.offline}
          sub="conexão perdida"
          color="text-red-400"
        />
        <StatCard
          label="Inadimplentes"
          value={data.clientes.inadimplentes}
          sub="aguardando pagamento"
          color="text-yellow-400"
        />
        <StatCard
          label="Faturamento Hoje"
          value={`R$ ${Number(data.financeiro.faturamentoDia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          sub="pagamentos confirmados"
          color="text-blue-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status OLTs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Status das OLTs</h3>
          <div className="space-y-2">
            {data.olts.length === 0 && (
              <p className="text-sm text-gray-600">Nenhuma OLT cadastrada</p>
            )}
            {data.olts.map((olt) => (
              <div key={olt.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{olt.nome}</p>
                  <p className="text-xs text-gray-500">{olt.ip}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    olt.ativo ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                  }`}
                >
                  {olt.ativo ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alarmes ativos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Alarmes Ativos</h3>
          <div className="space-y-2">
            {data.alarmes.length === 0 && (
              <p className="text-sm text-gray-600">Nenhum alarme ativo</p>
            )}
            {data.alarmes.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                <AlarmeBadge tipo={a.tipo} />
                <p className="text-xs text-gray-400 flex-1">{a.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
