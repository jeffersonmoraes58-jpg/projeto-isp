import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacoesApi } from '../services/api';
import { Notificacao } from '../types';

const tipoLabel: Record<string, string> = {
  AVISO_VENCIMENTO: 'Aviso Vencimento',
  BOLETO_GERADO: 'Boleto Gerado',
  PAGAMENTO_CONFIRMADO: 'Pagamento Confirmado',
  BLOQUEIO: 'Bloqueio',
  CORTE_CABO: 'Corte de Cabo',
};

const canalIcon: Record<string, string> = {
  EMAIL: '✉️',
  WHATSAPP: '💬',
  SMS: '📱',
};

const canalCor: Record<string, string> = {
  EMAIL: 'bg-blue-900 text-blue-400',
  WHATSAPP: 'bg-green-900 text-green-400',
  SMS: 'bg-yellow-900 text-yellow-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function NotificacoesPage() {
  const qc = useQueryClient();
  const [filtroEnviado, setFiltroEnviado] = useState<'todos' | 'enviados' | 'pendentes'>('todos');

  const params =
    filtroEnviado === 'enviados' ? { enviado: true }
    : filtroEnviado === 'pendentes' ? { enviado: false }
    : undefined;

  const { data: notificacoes = [], isLoading } = useQuery<Notificacao[]>({
    queryKey: ['notificacoes', filtroEnviado],
    queryFn: () => notificacoesApi.getAll(params),
  });

  const reenviar = useMutation({
    mutationFn: (id: string) => notificacoesApi.reenviar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const processar = useMutation({
    mutationFn: () => notificacoesApi.processar(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const pendentes = notificacoes.filter((n) => !n.enviado).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Notificações</h2>
          {pendentes > 0 && (
            <span className="text-xs px-2 py-0.5 bg-yellow-900 text-yellow-400 rounded-full font-medium">
              {pendentes} pendente{pendentes > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {(['todos', 'enviados', 'pendentes'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroEnviado(f)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                filtroEnviado === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={() => processar.mutate()}
            disabled={processar.isPending}
            className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 hover:text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {processar.isPending ? 'Processando...' : 'Processar agora'}
          </button>
        </div>
      </div>

      {processar.data && (
        <div className="text-xs text-gray-500 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2">
          Resultado: {processar.data.enviadas} enviadas, {processar.data.falhas} falhas de {processar.data.processadas} processadas
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500 text-sm text-center py-8">Carregando...</p>
      ) : notificacoes.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm">Nenhuma notificação encontrada.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Canal</th>
                <th className="text-left px-4 py-3 max-w-xs">Mensagem</th>
                <th className="text-left px-4 py-3">Criado</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {notificacoes.map((n) => (
                <tr key={n.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-gray-300 text-xs">{n.cliente?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{tipoLabel[n.tipo] ?? n.tipo}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${canalCor[n.canal]}`}>
                      {canalIcon[n.canal]} {n.canal}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {n.mensagem}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {formatDate(n.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {n.enviado ? (
                      <span className="text-xs text-green-400">
                        ✓ {n.enviadoEm ? formatDate(n.enviadoEm) : 'Enviado'}
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-400 animate-pulse">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {n.enviado && (
                      <button
                        onClick={() => reenviar.mutate(n.id)}
                        disabled={reenviar.isPending}
                        className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        Reenviar
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
