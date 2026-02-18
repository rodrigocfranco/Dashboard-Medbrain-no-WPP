import { parsePeriodFromParams, safeFormatDate } from '@/lib/utils';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import TrendLine from '@/components/charts/trend-line';
import BarChartComponent from '@/components/charts/bar-chart';
import EmptyState from '@/components/ui/empty-state';
import ExecutionDetailTable from './execution-detail-table';
import AlertBanner from '@/components/ui/alert-banner';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

interface N8NExecution {
  id: string;
  status: string;
  startedAt: string;
  stoppedAt: string | null;
}


async function fetchN8NExecutions(rangeFrom: Date): Promise<{
  executions: N8NExecution[];
  error: string | null;
}> {
  try {
    const baseUrl = process.env.N8N_API_URL;
    const apiKey = process.env.N8N_API_KEY;

    if (!baseUrl || !apiKey) {
      return { executions: [], error: 'N8N não configurado. Verifique as variáveis N8N_API_URL e N8N_API_KEY no .env' };
    }

    const allExecutions: N8NExecution[] = [];
    let cursor: string | undefined;
    const MAX_PAGES = 10; // Safety limit: 10 pages × 250 = up to 2500 executions

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(`${baseUrl}/executions`);
      url.searchParams.set('workflowId', '7tp9fz1NxbfamadU');
      url.searchParams.set('limit', '250');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString(), {
        headers: { 'X-N8N-API-KEY': apiKey },
        next: { revalidate: 60 },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const pageExecutions: N8NExecution[] = data.data || [];

      if (pageExecutions.length === 0) break;
      allExecutions.push(...pageExecutions);

      // Check if the oldest execution in this page is older than our range
      const oldest = new Date(pageExecutions[pageExecutions.length - 1].startedAt);
      if (oldest < rangeFrom) break;

      // Check if there's a next page
      cursor = data.nextCursor;
      if (!cursor) break;
    }

    return { executions: allExecutions, error: null };
  } catch {
    return {
      executions: [],
      error: 'Não foi possível conectar à API do N8N. Verifique se o serviço está online.',
    };
  }
}

async function fetchErrorDetails(errorIds: string[]): Promise<Map<string, { message: string; node: string }>> {
  const details = new Map<string, { message: string; node: string }>();
  const baseUrl = process.env.N8N_API_URL;
  const apiKey = process.env.N8N_API_KEY;
  if (!baseUrl || !apiKey) return details;

  // Fetch details for up to 30 most recent errors
  const ids = errorIds.slice(0, 30);
  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`${baseUrl}/executions/${id}`, {
          headers: { 'X-N8N-API-KEY': apiKey },
          next: { revalidate: 300 },
        });
        if (!res.ok) return;
        const detail = await res.json();
        const resultData = detail.data?.resultData;
        const err = resultData?.error;
        const lastNode = resultData?.lastNodeExecuted;

        // N8N puts node name in lastNodeExecuted, not in error.node
        const nodeName = typeof lastNode === 'string' ? lastNode
          : typeof err?.node === 'string' ? err.node
          : typeof err?.node?.name === 'string' ? err.node.name
          : '—';
        const message = err?.message || err?.description || 'Erro desconhecido';

        details.set(id, { message, node: nodeName });
      } catch {
        // Silently ignore individual fetch errors
      }
    })
  );
  return details;
}

export const dynamic = 'force-dynamic';

export default async function ErrorsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);

  const { executions: allExecutions, error } = await fetchN8NExecutions(from);

  if (error) {
    return (
      <div>
        <Header title="Monitoramento N8N" />
        <div className="p-6 space-y-6">
          <PeriodSelector />
          <EmptyState message={error} />
        </div>
      </div>
    );
  }

  // Filter by selected date range
  const executions = allExecutions.filter((e) => {
    const d = new Date(e.startedAt);
    return d >= from && d <= to;
  });

  const errors = executions.filter((e) => e.status === 'error');
  const successes = executions.filter((e) => e.status === 'success');
  const totalExecs = executions.length;
  const totalErrors = errors.length;
  const successRate =
    totalExecs > 0
      ? ((successes.length / totalExecs) * 100).toFixed(1)
      : '—';

  // Fetch error details if there are errors
  const errorDetails = totalErrors > 0
    ? await fetchErrorDetails(errors.map((e) => e.id))
    : new Map<string, { message: string; node: string }>();

  // All executions by day
  const allDayMap = new Map<string, { total: number; erros: number }>();
  executions.forEach((e) => {
    const day = safeFormatDate(e.startedAt);
    if (!allDayMap.has(day)) allDayMap.set(day, { total: 0, erros: 0 });
    const entry = allDayMap.get(day)!;
    entry.total++;
    if (e.status === 'error') entry.erros++;
  });
  const timelineData = Array.from(allDayMap.entries())
    .map(([date, counts]) => ({ date, total: counts.total, erros: counts.erros }))
    .reverse();

  // Status distribution for bar chart
  const statusMap = new Map<string, number>();
  executions.forEach((e) => {
    const s = e.status === 'success' ? 'Sucesso' : e.status === 'error' ? 'Erro' : e.status;
    statusMap.set(s, (statusMap.get(s) || 0) + 1);
  });
  const statusData = Array.from(statusMap.entries()).map(([status, total]) => ({ status, total }));

  // All executions formatted for table
  const tableData = executions.slice(0, 100).map((e) => {
    const detail = errorDetails.get(e.id);
    const duracaoSeg = e.stoppedAt
      ? (new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime()) / 1000
      : null;
    return {
      id: e.id,
      data: new Date(e.startedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      status: e.status === 'success' ? 'Sucesso' : e.status === 'error' ? 'Erro' : e.status,
      duracao: duracaoSeg !== null ? `${duracaoSeg.toFixed(1)}s` : '—',
      duracaoRaw: duracaoSeg,
      erro: detail ? `[${detail.node}] ${detail.message}` : '',
    };
  });

  // Avg duration
  const durations = executions
    .filter((e) => e.stoppedAt)
    .map((e) => (new Date(e.stoppedAt!).getTime() - new Date(e.startedAt).getTime()) / 1000);
  const avgDuration = durations.length > 0
    ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
    : '—';

  return (
    <div>
      <Header title="Monitoramento N8N" />
      <div className="p-6 space-y-6">
        <PeriodSelector />

        {totalExecs === 0 && (
          <AlertBanner
            type="info"
            message="Nenhuma execução encontrada no período selecionado. Tente aumentar o período."
          />
        )}

        {totalExecs > 0 && totalErrors === 0 && (
          <AlertBanner
            type="info"
            message={`Todas as ${totalExecs} execuções no período foram bem-sucedidas. Nenhum erro detectado.`}
          />
        )}

        {totalErrors > 0 && (
          <AlertBanner
            type="info"
            message={`${totalErrors} erro(s) detectado(s) de ${totalExecs} execuções no período (${((totalErrors / totalExecs) * 100).toFixed(1)}% de falha).`}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total de Execuções"
            value={totalExecs}
            tooltip="Execuções do workflow no período selecionado"
          />
          <KPICard
            title="Taxa de Sucesso"
            value={successRate !== '—' ? `${successRate}%` : '—'}
            tooltip="Percentual de execuções bem-sucedidas"
          />
          <KPICard
            title="Total de Erros"
            value={totalErrors}
            tooltip="Execuções com erro no período"
          />
          <KPICard
            title="Duração Média"
            value={avgDuration !== '—' ? `${avgDuration}s` : '—'}
            tooltip="Tempo médio de execução do workflow"
          />
        </div>

        <ChartWrapper
          title="Execuções por Dia"
          description="Volume de execuções do workflow ao longo do tempo"
          chartId="n8n-timeline"
        >
          {timelineData.length > 0 ? (
            <TrendLine data={timelineData} xKey="date" yKey="total" color="#3b82f6" xLabel="Data" yLabel="Execuções" />
          ) : (
            <EmptyState message="Sem dados de execuções no período" />
          )}
        </ChartWrapper>

        {statusData.length > 0 && (
          <ChartWrapper
            title="Distribuição por Status"
            description="Distribuição das execuções por status (sucesso/erro)"
            chartId="n8n-status"
          >
            <BarChartComponent data={statusData} xKey="status" yKey="total" xLabel="Status" yLabel="Execuções" color="#10b981" />
          </ChartWrapper>
        )}

        <ChartWrapper
          title="Execuções Recentes"
          description="Clique em uma linha para ver detalhes por nó"
          chartId="n8n-list"
        >
          {tableData.length > 0 ? (
            <ExecutionDetailTable data={tableData} />
          ) : (
            <EmptyState message="Nenhuma execução no período selecionado" />
          )}
        </ChartWrapper>
      </div>
    </div>
  );
}
