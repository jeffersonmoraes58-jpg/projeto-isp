import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { oltsApi } from '../services/api';
import { Olt } from '../types';

export default function OltsPage() {
  const { data: olts = [], isLoading } = useQuery<Olt[]>({
    queryKey: ['olts'],
    queryFn: oltsApi.getAll,
  });

  const [testResults, setTestResults] = useState<Record<string, { online: boolean; descr: string | null }>>({});

  const testar = useMutation({
    mutationFn: (id: string) => oltsApi.testar(id),
    onSuccess: (data, id) => setTestResults((prev) => ({ ...prev, [id]: data })),
  });

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">OLTs</h2>

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

                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>{olt.marca} · {olt.modelo}</p>
                </div>

                {result && (
                  <div className={`text-xs px-3 py-2 rounded-lg ${result.online ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                    {result.online ? `✓ ${result.descr ?? 'Online'}` : '✗ Sem resposta SNMP'}
                  </div>
                )}

                <button
                  onClick={() => testar.mutate(olt.id)}
                  disabled={testar.isPending}
                  className="w-full text-xs py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Testar Conexão SNMP
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
