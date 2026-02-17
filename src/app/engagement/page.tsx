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

  const [sessionsData, freqData, cohortData, monthlyData] = await Promise.all([
    query(`SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as dia, COUNT(DISTINCT session_id)::int as sessoes FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY dia ORDER BY dia`, [fromStr, toStr]),
    query(`SELECT CASE WHEN msg_count = 1 THEN '01' WHEN msg_count = 2 THEN '02' WHEN msg_count = 3 THEN '03' WHEN msg_count BETWEEN 4 AND 5 THEN '04-05' WHEN msg_count BETWEEN 6 AND 10 THEN '06-10' WHEN msg_count BETWEEN 11 AND 20 THEN '11-20' ELSE '20+' END as faixa, COUNT(*)::int as users, MIN(msg_count) as sort_order FROM (SELECT session_id, COUNT(*) as msg_count FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY session_id) sub GROUP BY faixa ORDER BY sort_order`, [fromStr, toStr]),
    getCohortData(),
    query(`WITH monthly_counts AS (
      SELECT session_id, TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM') as mes, COUNT(*) as msg_count
      FROM poc_medbrain_wpp GROUP BY session_id, mes
    )
    SELECT mes, CASE WHEN msg_count = 1 THEN '01' WHEN msg_count BETWEEN 2 AND 5 THEN '02-05' WHEN msg_count BETWEEN 6 AND 10 THEN '06-10' WHEN msg_count BETWEEN 11 AND 20 THEN '11-20' WHEN msg_count BETWEEN 21 AND 40 THEN '21-40' ELSE '40+' END as faixa, COUNT(*)::int as usuarios,
    MIN(CASE WHEN msg_count = 1 THEN 1 WHEN msg_count BETWEEN 2 AND 5 THEN 2 WHEN msg_count BETWEEN 6 AND 10 THEN 3 WHEN msg_count BETWEEN 11 AND 20 THEN 4 WHEN msg_count BETWEEN 21 AND 40 THEN 5 ELSE 6 END) as sort_order
    FROM monthly_counts GROUP BY mes, faixa ORDER BY mes, sort_order`),
  ]);

  const totalSessions = sessionsData.reduce((sum, r) => sum + Number(r.sessoes), 0);

  // Format YYYY-MM to readable month labels
  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  function formatMonth(yyyyMm: string): string {
    const [y, m] = yyyyMm.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1]}/${y.slice(2)}`;
  }

  // Pivot monthly data for stacked area
  const FAIXAS = ['01', '02-05', '06-10', '11-20', '21-40', '40+'];
  const monthlyMap = new Map<string, Record<string, unknown>>();
  monthlyData.forEach(r => {
    const mes = String(r.mes);
    if (!monthlyMap.has(mes)) monthlyMap.set(mes, { mes: formatMonth(mes), _sort: mes });
    monthlyMap.get(mes)![String(r.faixa)] = Number(r.usuarios);
  });
  const monthlyChartData = Array.from(monthlyMap.values()).sort((a, b) => String(a._sort).localeCompare(String(b._sort)));
  const FAIXA_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const FAIXA_LABELS: Record<string, string> = { '01': '1 msg', '02-05': '2-5 msgs', '06-10': '6-10 msgs', '11-20': '11-20 msgs', '21-40': '21-40 msgs', '40+': '40+ msgs' };
  const monthlyAreas = FAIXAS.map((f, i) => ({ key: f, color: FAIXA_COLORS[i], name: FAIXA_LABELS[f] }));

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

        <ChartWrapper title="Distribuição de Usuários por Volume de Mensagens (Mensal)" description="Quantidade de usuários por faixa de mensagens enviadas em cada mês — mostra a evolução do engajamento ao longo do tempo" chartId="engagement-monthly-dist">
          <StackedArea data={monthlyChartData} xKey="mes" areas={monthlyAreas} xLabel="Mês" yLabel="Usuários" />
        </ChartWrapper>

        <ChartWrapper title="Retenção por Cohort Semanal" description="Cada linha representa um grupo de usuários que usaram o bot pela primeira vez na mesma semana. As colunas mostram qual % desses usuários voltou a usar 1, 2, 3... semanas depois. Verde = boa retenção, vermelho = perda de usuários." chartId="engagement-cohort">
          <CohortHeatmap data={cohortData.map(r => ({ cohort_week: r.cohort_week instanceof Date ? r.cohort_week.toISOString().split('T')[0] : String(r.cohort_week), weeks_after: Number(r.weeks_after), retention_pct: Number(r.retention_pct), active_users: Number(r.active_users), cohort_size: Number(r.cohort_size) }))} />
        </ChartWrapper>
      </div>
    </div>
  );
}
