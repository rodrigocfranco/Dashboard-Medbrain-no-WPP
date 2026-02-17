import { query } from '@/lib/db';
import { parsePeriodFromParams, toSPIsoString, DAY_LABELS, safeFormatDate } from '@/lib/utils';
import { getPreviousPeriod } from '@/lib/delta';
import ChartWrapper from '@/components/charts/chart-wrapper';
import Heatmap from '@/components/charts/heatmap';
import BarChartComponent from '@/components/charts/bar-chart';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function PatternsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const prev = getPreviousPeriod(from, to);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);
  const prevFromStr = toSPIsoString(prev.from);
  const prevToStr = toSPIsoString(prev.to);

  const [segmentedHeatmap, weeklyData, currentVolume, prevVolume] = await Promise.all([
    query(`SELECT EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int as dia_semana, EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int as hora, "É aluno?", COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY dia_semana, hora, "É aluno?"`, [fromStr, toStr]),
    query(`SELECT EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int as dia_semana, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY dia_semana ORDER BY dia_semana`, [fromStr, toStr]),
    query(`SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as dia, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY dia ORDER BY dia`, [fromStr, toStr]),
    query(`SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as dia, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY dia ORDER BY dia`, [prevFromStr, prevToStr]),
  ]);

  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}h`);

  // Separate heatmaps for students vs non-students
  const alunoData = segmentedHeatmap.filter(r => r['É aluno?'] === true).map(r => ({ x: Number(r.hora), y: Number(r.dia_semana), value: Number(r.total) }));
  const naoAlunoData = segmentedHeatmap.filter(r => r['É aluno?'] !== true).map(r => ({ x: Number(r.hora), y: Number(r.dia_semana), value: Number(r.total) }));

  // Comparison data
  const compData = DAY_LABELS.map((label, i) => {
    const curr = weeklyData.find(r => Number(r.dia_semana) === i);
    return { dia: label, total: Number(curr?.total || 0) };
  });

  // Dual comparison
  const currentByDay = currentVolume.map(r => ({ dia: safeFormatDate(r.dia), total: Number(r.total) }));
  const prevByDay = prevVolume.map(r => ({ dia: safeFormatDate(r.dia), total: Number(r.total) }));

  return (
    <div>
      <Header title="Padrões Temporais" />
      <div className="p-6 space-y-6">
        <PeriodSelector />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartWrapper title="Heatmap — Alunos" description="Padrão de uso por dia/hora para alunos" chartId="patterns-heatmap-aluno">
            <Heatmap data={alunoData} xLabels={hourLabels} yLabels={DAY_LABELS} />
          </ChartWrapper>
          <ChartWrapper title="Heatmap — Não-Alunos" description="Padrão de uso por dia/hora para não-alunos" chartId="patterns-heatmap-nao-aluno">
            <Heatmap data={naoAlunoData} xLabels={hourLabels} yLabels={DAY_LABELS} />
          </ChartWrapper>
        </div>

        <ChartWrapper title="Volume por Dia da Semana" description="Volume agregado por dia da semana — identifica dias mais ativos" chartId="patterns-weekly">
          <BarChartComponent data={compData} xKey="dia" yKey="total" xLabel="Dia da semana" yLabel="Mensagens" />
        </ChartWrapper>

        <ChartWrapper title="Comparação: Período Atual vs Anterior" description="Comparação lado a lado do volume entre o período selecionado e o período anterior" chartId="patterns-comparison">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Período Atual</p>
              <BarChartComponent data={currentByDay} xKey="dia" yKey="total" color="#3b82f6" xLabel="Data" yLabel="Mensagens" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Período Anterior</p>
              <BarChartComponent data={prevByDay.length > 0 ? prevByDay : [{ dia: 'Sem dados', total: 0 }]} xKey="dia" yKey="total" color="#9ca3af" xLabel="Data" yLabel="Mensagens" />
            </div>
          </div>
        </ChartWrapper>
      </div>
    </div>
  );
}
