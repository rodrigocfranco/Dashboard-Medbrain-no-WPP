'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/ui/data-table';

function formatDateBR(val: unknown): string {
  if (!val) return '—';
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

const RECENT_QUERY = `SELECT created_at, session_id, "Pergunta_do_aluno", LEFT(message, 300) as resposta_preview, categoria, subcategoria, execution_time, CASE WHEN "É aluno?" = true THEN 'Aluno' WHEN "É aluno?" = false THEN 'Não-Aluno' ELSE '—' END as tipo_usuario FROM poc_medbrain_wpp WHERE created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 50`;

export default function RecentConversations() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: RECENT_QUERY, params: [] }),
        });
        if (res.ok) {
          const json = await res.json();
          const rows = (json.data || []).map((r: Record<string, unknown>) => ({
            ...r,
            created_at: formatDateBR(r.created_at),
          }));
          setData(rows);
        }
      } catch {
        // Silently fail on refresh
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
    const interval = setInterval(fetchRecent, 120000); // 2 min
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  return (
    <DataTable
      data={data}
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
      searchPlaceholder="Filtrar por pergunta, categoria, tipo..."
    />
  );
}
