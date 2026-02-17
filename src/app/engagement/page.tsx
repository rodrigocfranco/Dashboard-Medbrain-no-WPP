import { query } from '@/lib/db';
import { parsePeriodFromParams, toSPIsoString, safeFormatDate } from '@/lib/utils';
import { getCohortData } from '@/lib/queries/cohort-retention';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import TrendLine from '@/components/charts/trend-line';
import Histogram from '@/components/charts/histogram';
import StackedArea from '@/components/charts/stacked-area';
import CohortHeatmap from '@/components/charts/cohort-heatmap';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function EngagementPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);

  const [sessionsData, freqData, cohortData, quarterData] = await Promise.all([
    query(`SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as dia, COUNT(DISTINCT session_id)::int as sessoes FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY dia ORDER BY dia`, [fromStr, toStr]),
    query(`SELECT CASE WHEN msg_count = 1 THEN '1' WHEN msg_count = 2 THEN '2' WHEN msg_count = 3 THEN '3' WHEN msg_count BETWEEN 4 AND 5 THEN '4-5' WHEN msg_count BETWEEN 6 AND 10 THEN '6-10' WHEN msg_count BETWEEN 11 AND 20 THEN '11-20' ELSE '20+' END as faixa, COUNT(*)::int as users, MIN(msg_count) as sort_order FROM (SELECT session_id, COUNT(*) as msg_count FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY session_id) sub GROUP BY faixa ORDER BY sort_order`, [fromStr, toStr]),
    getCohortData(),
    query(`WITH quarterly_counts AS (
      SELECT session_id, TO_CHAR(DATE_TRUNC('quarter', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY "Q"Q') as trimestre, COUNT(*) as msg_count
      FROM poc_medbrain_wpp GROUP BY session_id, trimestre
    )
    SELECT trimestre, CASE WHEN msg_count = 1 THEN '1' WHEN msg_count BETWEEN 2 AND 5 THEN '2-5' WHEN msg_count BETWEEN 6 AND 10 THEN '6-10' WHEN msg_count BETWEEN 11 AND 20 THEN '11-20' WHEN msg_count BETWEEN 21 AND 40 THEN '21-40' ELSE '40+' END as faixa, COUNT(*)::int as usuarios,
    MIN(CASE WHEN msg_count = 1 THEN 1 WHEN msg_count BETWEEN 2 AND 5 THEN 2 WHEN msg_count BETWEEN 6 AND 10 THEN 3 WHEN msg_count BETWEEN 11 AND 20 THEN 4 WHEN msg_count BETWEEN 21 AND 40 THEN 5 ELSE 6 END) as sort_order
    FROM quarterly_counts GROUP BY trimestre, faixa ORDER BY trimestre, sort_order`),
  ]);

  const totalSessions = sessionsData.reduce((sum, r) => sum + Number(r.sessoes), 0);

  // Pivot quarter data for stacked area
  const FAIXAS = ['1', '2-5', '6-10', '11-20', '21-40', '40+'];
  const quarterMap = new Map<string, Record<string, unknown>>();
  quarterData.forEach(r => {
    const tri = String(r.trimestre);
    if (!quarterMap.has(tri)) quarterMap.set(tri, { trimestre: tri });
    quarterMap.get(tri)![String(r.faixa)] = Number(r.usuarios);
  });
  const quarterChartData = Array.from(quarterMap.values()).sort((a, b) => String(a.trimestre).localeCompare(String(b.trimestre)));
  const QUARTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const quarterAreas = FAIXAS.map((f, i) => ({ key: f, color: QUARTER_COLORS[i], name: `${f} msg${f === '1' ? '' : 's'}` }));

  return (
    <div>
      <Header title="Engajamento & Retenção" />
      <div className="p-6 space-y-6">
        <PeriodSelector />
        <KPICard title="Total de Sessões Únicas" value={totalSessions.toLocaleString('pt-BR')} tooltip="Sessões únicas (por session_id) ao longo do tempo" />

        <ChartWrapper title="Sessões Ativas por Dia" description="Sessões únicas (por session_id) ao longo do tempo" chartId="engagement-sessions">
          <TrendLine data={sessionsData.map(r => ({ date: safeFormatDate(r.dia), value: Number(r.sessoes) }))} xKey="date" yKey="value" color="#10b981" xLabel="Data" yLabel="Sessões" />
        </ChartWrapper>

        <ChartWrapper title="Mensagens por Sessão" description="Quantas sessões enviaram 1, 2, 3... ou 20+ mensagens — mostra a profundidade de uso por sessão" chartId="engagement-freq">
          <Histogram data={freqData.map(r => ({ faixa: String(r.faixa), total: Number(r.users) }))} xLabel="Nº de mensagens" yLabel="Sessões" />
        </ChartWrapper>

        <ChartWrapper title="Distribuição de Usuários por Volume de Mensagens (Trimestral)" description="Quantidade de usuários por faixa de mensagens enviadas em cada trimestre — mostra a evolução do engajamento" chartId="engagement-quarter-dist">
          <StackedArea data={quarterChartData} xKey="trimestre" areas={quarterAreas} xLabel="Trimestre" yLabel="Usuários" />
        </ChartWrapper>

        <ChartWrapper title="Cohort de Retenção" description="Retenção semanal por cohort: % de usuários que retornaram N semanas após a primeira sessão" chartId="engagement-cohort">
          <CohortHeatmap data={cohortData.map(r => ({ cohort_week: r.cohort_week instanceof Date ? r.cohort_week.toISOString().split('T')[0] : String(r.cohort_week), weeks_after: Number(r.weeks_after), retention_pct: Number(r.retention_pct), active_users: Number(r.active_users), cohort_size: Number(r.cohort_size) }))} />
        </ChartWrapper>
      </div>
    </div>
  );
}
