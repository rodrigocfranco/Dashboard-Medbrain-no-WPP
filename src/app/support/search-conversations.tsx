'use client';

import { useState } from 'react';
import DataTable from '@/components/ui/data-table';

function formatDateBR(val: unknown): string {
  if (!val) return '—';
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

interface SearchProps {
  fromStr: string;
  toStr: string;
}

export default function SearchConversations({ fromStr, toStr }: SearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<Record<string, unknown>[] | null>(
    null
  );

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setTimeline(null);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `SELECT created_at, session_id, "Pergunta_do_aluno", LEFT(message, 300) as resposta_preview, categoria, subcategoria, execution_time, CASE WHEN "É aluno?" = true THEN 'Aluno' WHEN "É aluno?" = false THEN 'Não-Aluno' ELSE '—' END as tipo_usuario FROM poc_medbrain_wpp WHERE (session_id = $1 OR message ILIKE $2 OR "Pergunta_do_aluno" ILIKE $2) AND created_at BETWEEN $3 AND $4 ORDER BY created_at DESC LIMIT 100`,
          params: [searchTerm, `%${searchTerm}%`, fromStr, toStr],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const rows = (json.data || []).map((r: Record<string, unknown>) => ({
          ...r,
          created_at: formatDateBR(r.created_at),
        }));
        setResults(rows);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const showTimeline = async (sessionId: string) => {
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `SELECT created_at, "Pergunta_do_aluno", message, execution_time, categoria, subcategoria FROM poc_medbrain_wpp WHERE session_id = $1 ORDER BY created_at ASC`,
          params: [sessionId],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const rows = (json.data || []).map((r: Record<string, unknown>) => ({
          ...r,
          created_at: formatDateBR(r.created_at),
        }));
        setTimeline(rows);
      }
    } catch {
      // Handle error
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar por session_id, telefone ou texto..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {results.length > 0 && (
        <DataTable
          data={results}
          columns={[
            { key: 'created_at', label: 'Data/Hora', sortable: true },
            { key: 'tipo_usuario', label: 'Tipo', sortable: true },
            { key: 'Pergunta_do_aluno', label: 'Pergunta' },
            { key: 'resposta_preview', label: 'Resposta' },
            { key: 'categoria', label: 'Categoria', sortable: true },
            { key: 'subcategoria', label: 'Subcategoria', sortable: true },
            { key: 'execution_time', label: 'Tempo (s)', sortable: true },
            { key: 'session_id', label: 'Sessão' },
          ]}
          searchable
          searchPlaceholder="Filtrar resultados..."
          onRowClick={(row) => showTimeline(String(row.session_id))}
        />
      )}

      {timeline && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              Timeline da Sessão
            </h4>
            <button
              onClick={() => setTimeline(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>
          </div>
          <div className="space-y-3">
            {timeline.map((msg, i) => (
              <div key={i} className="border-l-2 border-blue-300 pl-3">
                <p className="text-[10px] text-gray-400">
                  {String(msg.created_at)} | {String(msg.categoria || '—')}{msg.subcategoria ? ` > ${String(msg.subcategoria)}` : ''} |{' '}
                  {msg.execution_time ? `${msg.execution_time}s` : '—'}
                </p>
                <p className="text-xs text-blue-700 font-medium mt-0.5">
                  {String(msg.Pergunta_do_aluno || '—')}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {String(msg.message || '').slice(0, 300)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
