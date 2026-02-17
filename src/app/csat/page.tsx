import { query } from '@/lib/db';
import { calculateDelta, getPreviousPeriod } from '@/lib/delta';
import { parsePeriodFromParams, toSPIsoString, safeFormatDate } from '@/lib/utils';
import { maskPhone } from '@/lib/phone-mask';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import BarChartComponent from '@/components/charts/bar-chart';
import TrendLine from '@/components/charts/trend-line';
import ScatterPlot from '@/components/charts/scatter-plot';
import DataTable from '@/components/ui/data-table';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function CSATPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const prev = getPreviousPeriod(from, to);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);
  const prevFromStr = toSPIsoString(prev.from);
  const prevToStr = toSPIsoString(prev.to);

  const [starsDist, csatTrend, feedbacks, scatterData, csatAvg, prevCsatAvg, feedbackRate, prevFeedbackRate, totalEvals, prevTotalEvals] = await Promise.all([
    query('SELECT response_stars, response_emoji, COUNT(*)::int as total FROM survey_responses WHERE response_stars IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY response_stars, response_emoji ORDER BY response_stars', [fromStr, toStr]),
    query(`SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as dia, ROUND(AVG(response_stars)::numeric, 2) as csat_medio, COUNT(*)::int as total_avaliacoes FROM survey_responses WHERE response_stars IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY dia ORDER BY dia`, [fromStr, toStr]),
    query(`SELECT feedback_timestamp, estrelas, emoji, feedback_text, sentimento_detectado, telefone_usuario FROM vw_feedbacks_textuais WHERE feedback_text IS NOT NULL AND feedback_timestamp BETWEEN $1 AND $2 ORDER BY feedback_timestamp DESC`, [fromStr, toStr]),
    query(`SELECT sr.response_stars, p.execution_time FROM survey_responses sr LEFT JOIN poc_medbrain_wpp p ON sr.conversation_id = p.id WHERE sr.response_stars IS NOT NULL AND p.execution_time IS NOT NULL AND sr.created_at BETWEEN $1 AND $2 LIMIT 2000`, [fromStr, toStr]),
    query('SELECT ROUND(AVG(response_stars)::numeric, 2) as avg FROM survey_responses WHERE response_stars IS NOT NULL AND created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT ROUND(AVG(response_stars)::numeric, 2) as avg FROM survey_responses WHERE response_stars IS NOT NULL AND created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query('SELECT ROUND((COUNT(*) FILTER (WHERE has_feedback = true) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 1) as rate FROM survey_responses WHERE created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT ROUND((COUNT(*) FILTER (WHERE has_feedback = true) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 1) as rate FROM survey_responses WHERE created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query('SELECT COUNT(*)::int as total FROM survey_responses WHERE created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT COUNT(*)::int as total FROM survey_responses WHERE created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
  ]);

  const csatDelta = calculateDelta(Number(csatAvg[0]?.avg || 0), prevCsatAvg[0]?.avg != null ? Number(prevCsatAvg[0].avg) : null);
  const rateDelta = calculateDelta(Number(feedbackRate[0]?.rate || 0), prevFeedbackRate[0]?.rate != null ? Number(prevFeedbackRate[0].rate) : null);
  const evalsDelta = calculateDelta(Number(totalEvals[0]?.total || 0), prevTotalEvals[0]?.total != null ? Number(prevTotalEvals[0].total) : null);

  const maskedFeedbacks = feedbacks.map(r => ({
    ...r,
    telefone_usuario: r.telefone_usuario ? maskPhone(String(r.telefone_usuario)) : '—',
  }));

  return (
    <div>
      <Header title="CSAT & Satisfação" />
      <div className="p-6 space-y-6">
        <PeriodSelector />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="CSAT Médio" value={csatAvg[0]?.avg != null ? String(csatAvg[0].avg) : '—'} delta={csatDelta} tooltip="Média das avaliações em estrelas" />
          <KPICard title="Taxa de Feedback" value={`${feedbackRate[0]?.rate || '—'}%`} delta={rateDelta} tooltip="% de avaliações que incluem feedback textual" />
          <KPICard title="Total de Avaliações" value={Number(totalEvals[0]?.total || 0).toLocaleString('pt-BR')} delta={evalsDelta} tooltip="Total de avaliações CSAT no período" />
        </div>

        <ChartWrapper title="Distribuição de Estrelas" description="Distribuição das avaliações por número de estrelas" chartId="csat-stars">
          <BarChartComponent data={starsDist.map(r => ({ estrelas: `${r.response_stars} ${r.response_emoji || ''}`, total: Number(r.total) }))} xKey="estrelas" yKey="total" color="#f59e0b" xLabel="Estrelas" yLabel="Avaliações" />
        </ChartWrapper>

        <ChartWrapper title="Evolução CSAT" description="Evolução diária do CSAT médio. Linha de referência: meta 4.0 estrelas" chartId="csat-trend">
          <TrendLine data={csatTrend.map(r => ({ date: safeFormatDate(r.dia), value: Number(r.csat_medio) }))} color="#f59e0b" xLabel="Data" yLabel="Estrelas" />
        </ChartWrapper>

        <ChartWrapper title="CSAT vs Tempo de Resposta" description="Relação entre tempo de resposta e satisfação do usuário" chartId="csat-scatter">
          <ScatterPlot data={scatterData.map(r => ({ x: Number(r.execution_time), y: Number(r.response_stars) }))} xLabel="Tempo (s)" yLabel="Estrelas" />
        </ChartWrapper>

        <ChartWrapper title="Feedbacks Textuais" description="Feedbacks textuais com sentimento detectado" chartId="csat-feedbacks">
          <DataTable
            data={maskedFeedbacks as Record<string, unknown>[]}
            columns={[
              { key: 'estrelas', label: 'Estrelas', sortable: true },
              { key: 'emoji', label: 'Emoji' },
              { key: 'feedback_text', label: 'Feedback', sortable: true },
              { key: 'sentimento_detectado', label: 'Sentimento', sortable: true },
              { key: 'telefone_usuario', label: 'Telefone' },
            ]}
            searchable
            searchPlaceholder="Buscar feedbacks..."
          />
        </ChartWrapper>
      </div>
    </div>
  );
}
