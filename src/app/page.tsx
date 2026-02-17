import { query } from '@/lib/db';
import { calculateDelta, getPreviousPeriod } from '@/lib/delta';
import { parsePeriodFromParams, toSPIsoString, safeFormatDate } from '@/lib/utils';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import TrendLine from '@/components/charts/trend-line';
import PieDonut from '@/components/charts/pie-donut';
import BarChartComponent from '@/components/charts/bar-chart';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const prev = getPreviousPeriod(from, to);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);
  const prevFromStr = toSPIsoString(prev.from);
  const prevToStr = toSPIsoString(prev.to);

  // KPI queries - current period
  const [totalConversas, uniqueUsers, csatAvg, avgTime] = await Promise.all([
    query('SELECT COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT COUNT(DISTINCT session_id)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT ROUND(AVG(response_stars)::numeric, 1) as avg FROM survey_responses WHERE created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT ROUND(AVG(execution_time)::numeric, 1) as avg FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [fromStr, toStr]),
  ]);

  // KPI queries - previous period
  const [prevConversas, prevUsers, prevCsat, prevTime] = await Promise.all([
    query('SELECT COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query('SELECT COUNT(DISTINCT session_id)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query('SELECT ROUND(AVG(response_stars)::numeric, 1) as avg FROM survey_responses WHERE created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query('SELECT ROUND(AVG(execution_time)::numeric, 1) as avg FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
  ]);

  // Trend line data
  const trendData = await query(
    "SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as dia, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY dia ORDER BY dia",
    [fromStr, toStr]
  );

  // Distribution alunos vs não-alunos
  const distData = await query(
    `SELECT "É aluno?", COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY "É aluno?"`,
    [fromStr, toStr]
  );

  // Top 5 categories
  const topCats = await query(
    'SELECT categoria, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE categoria IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY categoria ORDER BY total DESC LIMIT 5',
    [fromStr, toStr]
  );

  const conversasDelta = calculateDelta(Number(totalConversas[0]?.total || 0), prevConversas[0]?.total != null ? Number(prevConversas[0].total) : null);
  const usersDelta = calculateDelta(Number(uniqueUsers[0]?.total || 0), prevUsers[0]?.total != null ? Number(prevUsers[0].total) : null);
  const csatDelta = calculateDelta(Number(csatAvg[0]?.avg || 0), prevCsat[0]?.avg != null ? Number(prevCsat[0].avg) : null);
  const timeDelta = calculateDelta(Number(avgTime[0]?.avg || 0), prevTime[0]?.avg != null ? Number(prevTime[0].avg) : null);

  const pieData = distData.map(r => ({
    name: r['É aluno?'] === true ? 'Alunos' : r['É aluno?'] === false ? 'Não-Alunos' : 'Indefinido',
    value: Number(r.total),
  }));

  return (
    <div>
      <Header title="Overview Executivo" />
      <div className="p-6 space-y-6">
        <PeriodSelector />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total de Conversas" value={Number(totalConversas[0]?.total || 0).toLocaleString('pt-BR')} delta={conversasDelta} tooltip="Total de mensagens registradas no período" />
          <KPICard title="Usuários Únicos" value={Number(uniqueUsers[0]?.total || 0).toLocaleString('pt-BR')} delta={usersDelta} tooltip="Sessões únicas (por session_id) no período" />
          <KPICard title="CSAT Médio" value={csatAvg[0]?.avg != null ? String(csatAvg[0].avg) : '—'} delta={csatDelta} tooltip="Média das avaliações em estrelas (1-5)" />
          <KPICard title="Tempo Médio Resposta" value={avgTime[0]?.avg != null ? `${avgTime[0].avg}s` : '—'} delta={timeDelta} invertColors tooltip="Tempo médio de resposta do sistema em segundos" />
        </div>

        <ChartWrapper title="Conversas por Dia" description="Evolução diária do volume de conversas no período selecionado" chartId="overview-trend">
          <TrendLine data={trendData.map(r => ({ date: safeFormatDate(r.dia), value: Number(r.total) }))} xKey="date" yKey="value" xLabel="Data" yLabel="Conversas" />
        </ChartWrapper>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartWrapper title="Alunos vs Não-Alunos" description="Proporção entre mensagens de alunos e não-alunos" chartId="overview-dist">
            <PieDonut data={pieData} />
          </ChartWrapper>

          <ChartWrapper title="Top 5 Categorias" description="As 5 categorias médicas mais consultadas no período" chartId="overview-top-cats">
            <BarChartComponent data={topCats.map(r => ({ categoria: String(r.categoria), total: Number(r.total) }))} xKey="categoria" yKey="total" horizontal xLabel="Total" />
          </ChartWrapper>
        </div>
      </div>
    </div>
  );
}
