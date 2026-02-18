'use client';

import { useState, useMemo } from 'react';
import DataTable from '@/components/ui/data-table';

interface NodeTiming {
  nome: string;
  tempoExecucao: string;
  inicio: string;
  status: string;
}

interface ExecutionDetailTableProps {
  data: Record<string, unknown>[];
}

export default function ExecutionDetailTable({ data }: ExecutionDetailTableProps) {
  const [nodeDetails, setNodeDetails] = useState<NodeTiming[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [minDuration, setMinDuration] = useState<number>(0);

  const filteredData = useMemo(() => {
    if (minDuration <= 0) return data;
    return data.filter((row) => {
      const raw = row.duracaoRaw;
      if (raw === null || raw === undefined) return false;
      return Number(raw) >= minDuration;
    });
  }, [data, minDuration]);

  const handleRowClick = async (row: Record<string, unknown>) => {
    const id = String(row.id);

    if (id === selectedId) {
      setNodeDetails(null);
      setSelectedId(null);
      return;
    }

    setLoadingDetail(true);
    setSelectedId(id);
    setNodeDetails(null);

    try {
      const res = await fetch(`/api/n8n/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const detail = await res.json();

      const runData = detail.data?.resultData?.runData;
      if (!runData || typeof runData !== 'object') {
        setNodeDetails([]);
        return;
      }

      const nodes: NodeTiming[] = Object.entries(runData).map(
        ([nodeName, executions]) => {
          const exec = Array.isArray(executions) ? executions[0] : null;
          return {
            nome: nodeName,
            tempoExecucao: exec?.executionTime != null
              ? `${exec.executionTime}ms`
              : '—',
            inicio: exec?.startTime
              ? new Date(exec.startTime).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                })
              : '—',
            status: exec?.executionStatus || '—',
          };
        }
      );

      nodes.sort((a, b) => {
        if (a.inicio === '—') return 1;
        if (b.inicio === '—') return -1;
        return a.inicio.localeCompare(b.inicio);
      });

      setNodeDetails(nodes);
    } catch {
      setNodeDetails([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500 whitespace-nowrap">
          Duração mínima (s):
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={minDuration}
          onChange={(e) => setMinDuration(Number(e.target.value) || 0)}
          className="w-20 border rounded px-2 py-1 text-sm"
        />
        {minDuration > 0 && (
          <span className="text-xs text-gray-400">
            {filteredData.length} de {data.length} execuções
          </span>
        )}
      </div>

      <DataTable
        data={filteredData}
        columns={[
          { key: 'data', label: 'Data/Hora', sortable: true },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'duracao', label: 'Duração', sortable: true },
          { key: 'erro', label: 'Detalhes do Erro' },
          { key: 'id', label: 'ID' },
        ]}
        searchable
        searchPlaceholder="Buscar por status, erro..."
        onRowClick={handleRowClick}
      />

      {loadingDetail && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      )}

      {nodeDetails && !loadingDetail && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              Detalhes por Nó — Execução #{selectedId}
            </h4>
            <button
              onClick={() => { setNodeDetails(null); setSelectedId(null); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>
          </div>
          {nodeDetails.length === 0 ? (
            <p className="text-xs text-gray-400">
              Nenhum dado de nó disponível para esta execução.
            </p>
          ) : (
            <DataTable
              data={nodeDetails}
              columns={[
                { key: 'nome', label: 'Nó', sortable: true },
                { key: 'tempoExecucao', label: 'Tempo de Execução', sortable: true },
                { key: 'inicio', label: 'Início', sortable: true },
                { key: 'status', label: 'Status', sortable: true },
              ]}
              pageSize={50}
            />
          )}
        </div>
      )}
    </div>
  );
}
