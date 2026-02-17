import { query } from '@/lib/db';
import { calculateDelta, getPreviousPeriod } from '@/lib/delta';
import { parsePeriodFromParams, toSPIsoString, DAY_LABELS, safeFormatDate } from '@/lib/utils';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import BarChartComponent from '@/components/charts/bar-chart';
import Heatmap from '@/components/charts/heatmap';
import PieDonut from '@/components/charts/pie-donut';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function VolumePage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const prev = getPreviousPeriod(from, to);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);
  const prevFromStr = toSPIsoString(prev.from);
  const prevToStr = toSPIsoString(prev.to);

  const [totalMsgs, prevTotalMsgs, dailyData, heatmapData, distData] = await Promise.all([
    query('SELECT COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query(`SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as periodo, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY periodo ORDER BY periodo`, [fromStr, toStr]),
    query(`SELECT EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int as dia_semana, EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int as hora, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY dia_semana, hora`, [fromStr, toStr]),
    query(`SELECT COALESCE(categoria, 'Sem categoria') as tipo, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY tipo ORDER BY total DESC LIMIT 10`, [fromStr, toStr]),
  ]);

  const total = Number(totalMsgs[0]?.total || 0);
  const days = dailyData.length || 1;
  const avgDaily = Math.round(total / days);
  const busiest = dailyData.reduce((max, r) => Number(r.total) > Number(max.total) ? r : max, dailyData[0] || { periodo: '—', total: 0 });

  const totalDelta = calculateDelta(total, prevTotalMsgs[0]?.total != null ? Number(prevTotalMsgs[0].total) : null);

  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}h`);
  const heatmapFormatted = heatmapData.map(r => ({ x: Number(r.hora), y: Number(r.dia_semana), value: Number(r.total) }));

  return (
    <div>
      <Header title="Volume & Métricas" />
      <div className="p-6 space-y-6">
        <PeriodSelector />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Total de Mensagens" value={total.toLocaleString('pt-BR')} delta={totalDelta} tooltip="Total de mensagens no período selecionado" />
          <KPICard title="Média Diária" value={avgDaily.toLocaleString('pt-BR')} tooltip="Média de mensagens por dia no período" />
          <KPICard title="Dia Mais Ativo" value={`${safeFormatDate(busiest.periodo)} (${Number(busiest.total).toLocaleString('pt-BR')})`} tooltip="Dia com maior volume de mensagens" />
        </div>

        <ChartWrapper title="Mensagens por Dia" description="Volume de mensagens agrupado por dia" chartId="volume-daily">
          <BarChartComponent data={dailyData.map(r => ({ dia: safeFormatDate(r.periodo), total: Number(r.total) }))} xKey="dia" yKey="total" xLabel="Data" yLabel="Mensagens" />
        </ChartWrapper>

        <ChartWrapper title="Horário de Pico" description="Mapa de calor mostrando quando os usuários mais interagem com o Medbrain" chartId="volume-heatmap">
          <Heatmap data={heatmapFormatted} xLabels={hourLabels} yLabels={DAY_LABELS} />
        </ChartWrapper>

        <ChartWrapper title="Distribuição por Categoria" description="Distribuição das mensagens pelas 10 categorias mais frequentes" chartId="volume-dist">
          <PieDonut data={distData.map(r => ({ name: String(r.tipo), value: Number(r.total) }))} />
        </ChartWrapper>
      </div>
    </div>
  );
}
