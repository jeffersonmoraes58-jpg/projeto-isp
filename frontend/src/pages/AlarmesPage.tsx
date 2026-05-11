import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alarmesApi } from '../services/api';
import { Alarme } from '../types';

const tipoLabel: Record<string, string> = {
  CORTE_CABO: 'Corte de Cabo',
  OLT_OFFLINE: 'OLT Offline',
  SINAL_CRITICO: 'Sinal Crítico',
  ALTA_INADIMPLENCIA: 'Alta Inadimplência',
};

const tipoCor: Record<string, string> = {
  CORTE_CABO: 'bg-red-900 text-red-400',
  OLT_OFFLINE: 'bg-orange-900 text-orange-400',
  SINAL_CRITICO: 'bg-yellow-900 text-yellow-400',
  ALTA_INADIMPLENCIA: 'bg-purple-900 text-purple-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AlarmesPage() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<'ativos' | 'todos'>('ativos');

  const { data: alarmes = [], isLoading } = useQuery<Alarme[]>({
    queryKey: ['alarmes', filtro],
    queryFn: () => alarmesApi.getAll(filtro === 'ativos' ? false : undefined),
  });

  const resolver = useMutation({
    mutationFn: (id: string) => alarmesApi.resolver(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alarmes'] }),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Alarmes</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFiltro('ativos')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filtro === 'ativos'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setFiltro('todos')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filtro === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm text-center py-8">Carregando alarmes...</p>
      ) : alarmes.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">✓</p>
          <p className="text-sm">Nenhum alarme ativo no momento.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3">Criado em</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {alarmes.map((a) => (
                <tr key={a.id} className={`hover:bg-gray-800/50 transition-colors ${a.resolvido ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoCor[a.tipo]}`}>
                      {tipoLabel[a.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{a.descricao}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    {a.resolvido ? (
                      <span className="text-xs text-gray-500">
                        Resolvido {a.resolvidoEm ? formatDate(a.resolvidoEm) : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-red-400 font-medium animate-pulse">Ativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!a.resolvido && (
                      <button
                        onClick={() => resolver.mutate(a.id)}
                        disabled={resolver.isPending}
                        className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded hover:bg-green-800 transition-colors disabled:opacity-50"
                      >
                        Resolver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
