import { query } from '@/lib/db';
import { calculateDelta, getPreviousPeriod } from '@/lib/delta';
import { parsePeriodFromParams, toSPIsoString, safeFormatDate } from '@/lib/utils';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import TrendLine from '@/components/charts/trend-line';
import Histogram from '@/components/charts/histogram';
import BarChartComponent from '@/components/charts/bar-chart';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const prev = getPreviousPeriod(from, to);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);
  const prevFromStr = toSPIsoString(prev.from);
  const prevToStr = toSPIsoString(prev.to);

  const [avgTime, p95Time, pctFast, prevAvg, prevP95, prevPctFast, dailyPerf, histData, catPerf] = await Promise.all([
    query('SELECT ROUND(AVG(execution_time)::numeric, 1) as avg FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time)::numeric, 1) as p95 FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT ROUND((COUNT(*) FILTER (WHERE execution_time < 10) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 1) as pct FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT ROUND(AVG(execution_time)::numeric, 1) as avg FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query('SELECT ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time)::numeric, 1) as p95 FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query('SELECT ROUND((COUNT(*) FILTER (WHERE execution_time < 10) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 1) as pct FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query(`SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as dia, ROUND(AVG(execution_time)::numeric, 1) as media FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY dia ORDER BY dia`, [fromStr, toStr]),
    query(`SELECT CASE WHEN execution_time < 5 THEN '0-5s' WHEN execution_time < 10 THEN '5-10s' WHEN execution_time < 20 THEN '10-20s' WHEN execution_time < 30 THEN '20-30s' ELSE '30s+' END as faixa, CASE WHEN execution_time < 5 THEN 1 WHEN execution_time < 10 THEN 2 WHEN execution_time < 20 THEN 3 WHEN execution_time < 30 THEN 4 ELSE 5 END as sort_order, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY faixa, sort_order ORDER BY sort_order`, [fromStr, toStr]),
    query(`SELECT categoria, ROUND(AVG(execution_time)::numeric, 1) as media, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND categoria IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY categoria ORDER BY media DESC LIMIT 10`, [fromStr, toStr]),
  ]);

  const avgDelta = calculateDelta(Number(avgTime[0]?.avg || 0), prevAvg[0]?.avg != null ? Number(prevAvg[0].avg) : null);
  const p95Delta = calculateDelta(Number(p95Time[0]?.p95 || 0), prevP95[0]?.p95 != null ? Number(prevP95[0].p95) : null);
  const pctDelta = calculateDelta(Number(pctFast[0]?.pct || 0), prevPctFast[0]?.pct != null ? Number(prevPctFast[0].pct) : null);

  const p95Val = Number(p95Time[0]?.p95 || 0);

  return (
    <div>
      <Header title="Performance" />
      <div className="p-6 space-y-6">
        <PeriodSelector />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Tempo Médio" value={`${avgTime[0]?.avg || '—'}s`} delta={avgDelta} invertColors tooltip="Tempo médio de resposta (segundos)" />
          <KPICard title="P95 Tempo" value={<span className={p95Val > 30 ? 'text-red-600' : ''}>{`${p95Val}s`}</span> as any} delta={p95Delta} invertColors tooltip="95% das respostas foram mais rápidas que este valor" />
          <KPICard title="% < 10s" value={`${pctFast[0]?.pct || '—'}%`} delta={pctDelta} tooltip="Percentual de respostas em menos de 10 segundos" />
        </div>

        <ChartWrapper title="Evolução do Tempo de Resposta" description="Evolução do tempo de resposta: média diária" chartId="perf-trend">
          <TrendLine data={dailyPerf.map(r => ({ date: safeFormatDate(r.dia), value: Number(r.media) }))} color="#ef4444" xLabel="Data" yLabel="Segundos" />
        </ChartWrapper>

        <ChartWrapper title="Distribuição de Tempos" description="Distribuição dos tempos de resposta em faixas" chartId="perf-hist">
          <Histogram data={histData.map(r => ({ faixa: String(r.faixa), total: Number(r.total) }))} xLabel="Faixa de tempo" yLabel="Quantidade" />
        </ChartWrapper>

        <ChartWrapper title="Tempo por Categoria" description="Tempo médio de resposta por categoria — identifica categorias mais lentas" chartId="perf-cat">
          <BarChartComponent data={catPerf.map(r => ({ categoria: String(r.categoria), media: Number(r.media) }))} xKey="categoria" yKey="media" horizontal color="#ef4444" xLabel="Segundos" />
        </ChartWrapper>
      </div>
    </div>
  );
}
