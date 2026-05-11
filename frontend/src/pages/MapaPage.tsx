import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { ctosApi } from '../services/api';
import { CtoMapItem } from '../types';
import CtoModal from '../components/CTO/CtoModal';

import 'leaflet/dist/leaflet.css';

const markerColor = (pct: number, sinal: string | null) => {
  if (sinal && parseFloat(sinal) < -28) return '#ef4444'; // sinal crítico
  if (pct >= 90) return '#f97316'; // quase cheio
  if (pct >= 50) return '#eab308'; // médio
  return '#22c55e'; // livre
};

export default function MapaPage() {
  const [selectedCto, setSelectedCto] = useState<string | null>(null);
  const [filtroSinal, setFiltroSinal] = useState<'todos' | 'critico' | 'cheio'>('todos');

  const { data: ctos = [], isLoading } = useQuery<CtoMapItem[]>({
    queryKey: ['ctos-mapa'],
    queryFn: ctosApi.getMapSummary,
    refetchInterval: 60_000,
  });

  const ctosFiltradas = ctos.filter((c) => {
    if (filtroSinal === 'critico') return c.sinalMedioDbm && parseFloat(c.sinalMedioDbm) < -28;
    if (filtroSinal === 'cheio') return c.ocupacaoPct >= 90;
    return true;
  });

  const center: [number, number] = ctos.length > 0
    ? [ctos[0].lat, ctos[0].lng]
    : [-15.78, -47.93]; // Brasília default

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex items-center gap-4">
        <h2 className="text-sm font-semibold text-white">Mapa de CTOs</h2>
        <div className="flex gap-2 ml-auto">
          {(['todos', 'critico', 'cheio'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroSinal(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filtroSinal === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f === 'todos' ? 'Todas' : f === 'critico' ? 'Sinal Crítico' : 'Quase Cheias'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{ctosFiltradas.length} CTOs</span>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-10">
            <p className="text-gray-400 text-sm">Carregando CTOs...</p>
          </div>
        )}
        <MapContainer center={center} zoom={13} className="w-full h-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {ctosFiltradas.map((cto) => (
            <CircleMarker
              key={cto.id}
              center={[cto.lat, cto.lng]}
              radius={14}
              pathOptions={{
                fillColor: markerColor(cto.ocupacaoPct, cto.sinalMedioDbm),
                fillOpacity: 0.85,
                color: '#fff',
                weight: 1.5,
              }}
              eventHandlers={{ click: () => setSelectedCto(cto.id) }}
            >
              <Tooltip>
                <div className="text-xs">
                  <p className="font-bold">{cto.nome}</p>
                  <p>Ocupação: {cto.ocupacaoPct}% ({cto.ocupadas}/{cto.capacidade})</p>
                  {cto.sinalMedioDbm && <p>Sinal médio: {cto.sinalMedioDbm} dBm</p>}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Modal CTO */}
      {selectedCto && (
        <CtoModal ctoId={selectedCto} onClose={() => setSelectedCto(null)} />
      )}
    </div>
  );
}
