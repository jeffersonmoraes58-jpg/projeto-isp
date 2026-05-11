import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../services/api';
import { Cliente } from '../types';

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

export default function ClientesPage() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState('');

  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: () => clientesApi.getAll(),
  });

  const bloquear = useMutation({
    mutationFn: (id: string) => clientesApi.bloquear(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });

  const desbloquear = useMutation({
    mutationFn: (id: string) => clientesApi.desbloquear(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });

  const filtrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      c.usuarioPppoe.toLowerCase().includes(filtro.toLowerCase()) ||
      c.cpfCnpj.includes(filtro),
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Clientes</h2>
        <span className="text-sm text-gray-500">{filtrados.length} registros</span>
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
