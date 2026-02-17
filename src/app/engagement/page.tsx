import { query } from '@/lib/db';
import { parsePeriodFromParams, toSPIsoString, safeFormatDate } from '@/lib/utils';
import { getCohortData } from '@/lib/queries/cohort-retention';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import TrendLine from '@/components/charts/trend-line';
import Histogram from '@/components/charts/histogram';
import StackedBar from '@/components/charts/stacked-bar';
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

  // Pivot monthly data for stacked bar (% da base) — sequential keys to guarantee order
  const FAIXA_MAP: Record<string, string> = { '01': 'f1', '02-05': 'f2', '06-10': 'f3', '11-20': 'f4', '21-40': 'f5', '40+': 'f6' };
  const FAIXA_KEYS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'];
  const monthlyRaw = new Map<string, Record<string, number>>();
  monthlyData.forEach(r => {
    const mes = String(r.mes);
    if (!monthlyRaw.has(mes)) monthlyRaw.set(mes, {});
    const seqKey = FAIXA_MAP[String(r.faixa)];
    if (seqKey) monthlyRaw.get(mes)![seqKey] = Number(r.usuarios);
  });
  const monthlyChartData = Array.from(monthlyRaw.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, counts]) => {
      const total = Object.values(counts).reduce((s, v) => s + v, 0);
      if (total === 0) return { mes: formatMonth(mes), f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0 };
      // Largest-remainder rounding to guarantee sum = 100.0
      const raw = FAIXA_KEYS.map(k => ((counts[k] || 0) / total) * 100);
      const floored = raw.map(v => Math.floor(v * 10) / 10);
      const remainders = raw.map((v, i) => ({ i, r: v * 10 - Math.floor(v * 10) })).sort((a, b) => b.r - a.r);
      let gap = Math.round((100 - floored.reduce((s, v) => s + v, 0)) * 10);
      for (let j = 0; j < gap && j < remainders.length; j++) {
        floored[remainders[j].i] = Math.round((floored[remainders[j].i] + 0.1) * 10) / 10;
      }
      const pct: Record<string, unknown> = { mes: formatMonth(mes) };
      let cum = 0;
      FAIXA_KEYS.forEach((k, i) => { pct[k] = floored[i]; cum += floored[i]; pct[`c${i + 1}`] = Math.round(cum * 10) / 10; });
      return pct;
    });
  const monthlyBars = [
    { key: 'f1', color: '#3b82f6', name: '1 msg' },
    { key: 'f2', color: '#10b981', name: '2-5 msgs' },
    { key: 'f3', color: '#f59e0b', name: '6-10 msgs' },
    { key: 'f4', color: '#ef4444', name: '11-20 msgs' },
    { key: 'f5', color: '#8b5cf6', name: '21-40 msgs' },
    { key: 'f6', color: '#ec4899', name: '40+ msgs' },
  ];

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

        <ChartWrapper title="Distribuição de Usuários por Volume de Mensagens (Mensal)" description="% da base de usuários em cada faixa de mensagens por mês. Cada barra soma 100%, permitindo comparar a composição mesmo com crescimento da base." chartId="engagement-monthly-dist">
          <StackedBar data={monthlyChartData} xKey="mes" bars={monthlyBars} xLabel="Mês" yLabel="% da base" />
        </ChartWrapper>

        <ChartWrapper title="Retenção por Cohort Semanal" description="Cada linha representa um grupo de usuários que usaram o bot pela primeira vez na mesma semana. As colunas mostram qual % desses usuários voltou a usar 1, 2, 3... semanas depois. Verde = boa retenção, vermelho = perda de usuários." chartId="engagement-cohort">
          <CohortHeatmap data={cohortData.map(r => ({ cohort_week: r.cohort_week instanceof Date ? r.cohort_week.toISOString().split('T')[0] : String(r.cohort_week), weeks_after: Number(r.weeks_after), retention_pct: Number(r.retention_pct), active_users: Number(r.active_users), cohort_size: Number(r.cohort_size) }))} />
        </ChartWrapper>
      </div>
    </div>
  );
}
