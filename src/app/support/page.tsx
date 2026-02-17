import { query } from '@/lib/db';
import { calculateDelta, getPreviousPeriod } from '@/lib/delta';
import { parsePeriodFromParams, toSPIsoString, safeFormatDate } from '@/lib/utils';
import { maskPhone } from '@/lib/phone-mask';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import DataTable from '@/components/ui/data-table';
import AlertBanner from '@/components/ui/alert-banner';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';
import RecentConversations from './recent-conversations';
import SearchConversations from './search-conversations';

export const dynamic = 'force-dynamic';

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const prev = getPreviousPeriod(from, to);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);
  const prevFromStr = toSPIsoString(prev.from);
  const prevToStr = toSPIsoString(prev.to);

  const [
    csatCurr, csatPrev, timeCurr, timePrev, topCatCurr, topCatPrev,
    totalConversas, lowCsatConversas, negativeFeedbacks,
  ] = await Promise.all([
    query('SELECT AVG(response_stars) as avg FROM survey_responses WHERE created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT AVG(response_stars) as avg FROM survey_responses WHERE created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query('SELECT AVG(execution_time) as avg FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query('SELECT AVG(execution_time) as avg FROM poc_medbrain_wpp WHERE execution_time IS NOT NULL AND created_at BETWEEN $1 AND $2', [prevFromStr, prevToStr]),
    query('SELECT categoria FROM poc_medbrain_wpp WHERE categoria IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY categoria ORDER BY COUNT(*) DESC LIMIT 1', [fromStr, toStr]),
    query('SELECT categoria FROM poc_medbrain_wpp WHERE categoria IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY categoria ORDER BY COUNT(*) DESC LIMIT 1', [prevFromStr, prevToStr]),
    query('SELECT COUNT(*)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2', [fromStr, toStr]),
    query(`SELECT sr.created_at, sr.response_stars, sr.has_feedback,
        p.session_id, p."Pergunta_do_aluno", LEFT(p.message, 300) as resposta,
        p.categoria, p.subcategoria, p.execution_time, p."É aluno?"
      FROM survey_responses sr
      LEFT JOIN poc_medbrain_wpp p ON sr.conversation_id = p.id
      WHERE sr.response_stars <= 2 AND sr.created_at BETWEEN $1 AND $2
      ORDER BY sr.created_at DESC LIMIT 50`, [fromStr, toStr]),
    query(`SELECT feedback_timestamp, feedback_text, estrelas, sentimento_detectado, telefone_usuario
      FROM vw_feedbacks_textuais
      WHERE sentimento_detectado = 'Negativo' AND feedback_text IS NOT NULL AND feedback_timestamp BETWEEN $1 AND $2
      ORDER BY feedback_timestamp DESC LIMIT 30`, [fromStr, toStr]),
  ]);

  // Build alerts
  const alerts: { type: 'error' | 'warning' | 'success'; message: string }[] = [];

  if (csatCurr[0]?.avg != null && csatPrev[0]?.avg != null) {
    const delta = calculateDelta(Number(csatCurr[0].avg), Number(csatPrev[0].avg));
    if (delta.percentage !== null && Math.abs(delta.percentage) > 15) {
      alerts.push({
        type: delta.direction === 'down' ? 'error' : 'success',
        message: `CSAT ${delta.direction === 'down' ? 'caiu' : 'subiu'} ${Math.abs(delta.percentage).toFixed(1)}% vs período anterior (${Number(csatPrev[0].avg).toFixed(2)} → ${Number(csatCurr[0].avg).toFixed(2)})`,
      });
    }
  }

  if (timeCurr[0]?.avg != null && timePrev[0]?.avg != null) {
    const delta = calculateDelta(Number(timeCurr[0].avg), Number(timePrev[0].avg));
    if (delta.percentage !== null && Math.abs(delta.percentage) > 15) {
      alerts.push({
        type: delta.direction === 'up' ? 'error' : 'success',
        message: `Tempo de resposta ${delta.direction === 'up' ? 'aumentou' : 'diminuiu'} ${Math.abs(delta.percentage).toFixed(1)}% vs período anterior (${Number(timePrev[0].avg).toFixed(1)}s → ${Number(timeCurr[0].avg).toFixed(1)}s)`,
      });
    }
  }

  if (topCatCurr[0] && topCatPrev[0]) {
    const curr = String(topCatCurr[0].categoria);
    const prevCat = String(topCatPrev[0].categoria);
    if (curr !== prevCat) {
      alerts.push({
        type: 'warning',
        message: `Categoria mais consultada mudou: "${prevCat}" → "${curr}"`,
      });
    }
  }

  // KPI values
  const totalConvCount = Number(totalConversas[0]?.total || 0);
  const csatAvgVal = csatCurr[0]?.avg != null ? Number(csatCurr[0].avg).toFixed(2) : '—';
  const timeAvgVal = timeCurr[0]?.avg != null ? `${Number(timeCurr[0].avg).toFixed(1)}s` : '—';
  const lowCsatCount = lowCsatConversas.length;

  // Format low CSAT data with more detail
  const lowCsatTable = lowCsatConversas.map(r => ({
    data: safeFormatDate(r.created_at),
    estrelas: `${r.response_stars}`,
    tipo_usuario: r['É aluno?'] === true ? 'Aluno' : r['É aluno?'] === false ? 'Não-Aluno' : '—',
    sessao: /^\d{10,13}$/.test(String(r.session_id)) ? maskPhone(String(r.session_id)) : r.session_id,
    pergunta: r.Pergunta_do_aluno || '—',
    resposta: r.resposta || '—',
    categoria: r.categoria || '—',
    subcategoria: r.subcategoria || '—',
    tempo: r.execution_time ? `${Number(r.execution_time).toFixed(1)}s` : '—',
  }));

  // Format negative feedbacks with more detail
  const negFeedbackTable = negativeFeedbacks.map(r => ({
    data: safeFormatDate(r.feedback_timestamp),
    estrelas: r.estrelas ? `${r.estrelas}` : '—',
    feedback: r.feedback_text || '—',
    sentimento: r.sentimento_detectado || '—',
    telefone: r.telefone_usuario ? maskPhone(String(r.telefone_usuario)) : '—',
  }));

  return (
    <div>
      <Header title="Ferramentas de Suporte" />
      <div className="p-6 space-y-6">
        <PeriodSelector />

        {/* Anomaly Alerts */}
        {alerts.length > 0 ? (
          alerts.map((alert, i) => (
            <AlertBanner key={i} type={alert.type} message={alert.message} />
          ))
        ) : (
          <AlertBanner
            type="info"
            message={
              csatPrev[0]?.avg == null
                ? 'Dados insuficientes para comparação com período anterior'
                : 'Nenhuma anomalia detectada no período'
            }
          />
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total de Conversas"
            value={totalConvCount.toLocaleString('pt-BR')}
            tooltip="Total de mensagens no período selecionado"
          />
          <KPICard
            title="CSAT Médio"
            value={csatAvgVal}
            tooltip="Média das avaliações em estrelas no período"
          />
          <KPICard
            title="Tempo Médio Resposta"
            value={timeAvgVal}
            tooltip="Tempo médio de resposta do sistema"
          />
          <KPICard
            title="Avaliações Baixas (1-2)"
            value={lowCsatCount}
            tooltip="Conversas com avaliação 1 ou 2 estrelas no período"
          />
        </div>

        {/* Low CSAT Conversations */}
        {lowCsatTable.length > 0 && (
          <ChartWrapper
            title="Conversas com CSAT Baixo (1-2 estrelas)"
            description="Conversas que receberam avaliação baixa — investigue para identificar problemas"
            chartId="support-low-csat"
          >
            <DataTable
              data={lowCsatTable}
              columns={[
                { key: 'data', label: 'Data', sortable: true },
                { key: 'estrelas', label: 'CSAT', sortable: true },
                { key: 'tipo_usuario', label: 'Tipo', sortable: true },
                { key: 'pergunta', label: 'Pergunta' },
                { key: 'resposta', label: 'Resposta' },
                { key: 'categoria', label: 'Categoria', sortable: true },
                { key: 'subcategoria', label: 'Subcategoria', sortable: true },
                { key: 'tempo', label: 'Tempo (s)', sortable: true },
                { key: 'sessao', label: 'Sessão' },
              ]}
              searchable
              searchPlaceholder="Filtrar por pergunta, categoria, tipo de usuário..."
            />
          </ChartWrapper>
        )}

        {/* Negative Feedbacks */}
        {negFeedbackTable.length > 0 && (
          <ChartWrapper
            title="Feedbacks Negativos"
            description="Feedbacks textuais com sentimento negativo detectado"
            chartId="support-neg-feedback"
          >
            <DataTable
              data={negFeedbackTable}
              columns={[
                { key: 'data', label: 'Data', sortable: true },
                { key: 'estrelas', label: 'CSAT', sortable: true },
                { key: 'feedback', label: 'Feedback' },
                { key: 'sentimento', label: 'Sentimento', sortable: true },
                { key: 'telefone', label: 'Telefone' },
              ]}
              searchable
              searchPlaceholder="Filtrar feedbacks..."
            />
          </ChartWrapper>
        )}

        {/* Search */}
        <ChartWrapper
          title="Busca de Conversas"
          description="Busque conversas por session_id, telefone ou texto da pergunta"
          chartId="support-search"
        >
          <SearchConversations fromStr={fromStr} toStr={toStr} />
        </ChartWrapper>

        {/* Recent conversations (client component with auto-refresh) */}
        <ChartWrapper
          title="Conversas Recentes"
          description="Últimas 50 conversas (atualização automática a cada 2 minutos)"
          chartId="support-recent"
        >
          <RecentConversations />
        </ChartWrapper>
      </div>
    </div>
  );
}
