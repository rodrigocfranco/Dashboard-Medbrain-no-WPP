import { query } from '@/lib/db';
import { parsePeriodFromParams, toSPIsoString, safeFormatDate } from '@/lib/utils';
import { maskPhone } from '@/lib/phone-mask';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import StackedArea from '@/components/charts/stacked-area';
import PieDonut from '@/components/charts/pie-donut';
import TrendLine from '@/components/charts/trend-line';
import DataTable from '@/components/ui/data-table';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);

  const [newUsers, totalPerDay, studentDist, topUsers, pctData] = await Promise.all([
    query(`SELECT create_at_data as dia, COUNT(*)::int as novos FROM poc_medbrain_first_session WHERE create_at_data BETWEEN $1 AND $2 GROUP BY dia ORDER BY dia`, [fromStr, toStr]),
    query(`SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as dia, COUNT(DISTINCT session_id)::int as total FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY dia ORDER BY dia`, [fromStr, toStr]),
    query(`SELECT "É aluno?", COUNT(DISTINCT session_id)::int as users FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY "É aluno?"`, [fromStr, toStr]),
    query(`SELECT session_id, COUNT(*)::int as total_msgs, MIN(created_at) as primeira, MAX(created_at) as ultima, COUNT(DISTINCT categoria)::int as categorias FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 GROUP BY session_id ORDER BY total_msgs DESC LIMIT 20`, [fromStr, toStr]),
    query(`SELECT data, percentual_com_3_entradas FROM db_medbrain_pct_nao_alunos_3_entradas WHERE data BETWEEN $1 AND $2 ORDER BY data`, [fromStr, toStr]),
  ]);

  // Build new vs returning data
  const newMap = new Map(newUsers.map(r => [safeFormatDate(r.dia), Number(r.novos)]));
  const stackedData = totalPerDay.map(r => {
    const dia = safeFormatDate(r.dia);
    const total = Number(r.total);
    const novos = newMap.get(dia) || 0;
    const retornando = Math.max(0, total - novos);
    return { dia, Novos: novos, Retornando: retornando };
  });

  const pieData = studentDist.map(r => ({
    name: r['É aluno?'] === true ? 'Alunos' : r['É aluno?'] === false ? 'Não-Alunos' : 'Indefinido',
    value: Number(r.users),
  }));

  // Mask phone numbers in top users
  const maskedTopUsers = topUsers.map(r => ({
    ...r,
    session_id: /^\d{10,13}$/.test(String(r.session_id)) ? maskPhone(String(r.session_id)) : r.session_id,
  }));

  const latestPct = pctData.length > 0 ? `${pctData[pctData.length - 1].percentual_com_3_entradas}%` : '—';

  return (
    <div>
      <Header title="Usuários" />
      <div className="p-6 space-y-6">
        <PeriodSelector />
        <KPICard title="% Não-Alunos com 3+ Entradas" value={latestPct} tooltip="Percentual de não-alunos que retornaram 3 ou mais vezes — indicador de engajamento orgânico" />

        <ChartWrapper title="Novos vs Retornando" description="Proporção de usuários novos (primeira vez) vs retornando (já utilizaram antes)" chartId="users-new-ret">
          <StackedArea data={stackedData} xKey="dia" areas={[{ key: 'Novos', color: '#3b82f6', name: 'Novos' }, { key: 'Retornando', color: '#10b981', name: 'Retornando' }]} xLabel="Data" yLabel="Usuários" />
        </ChartWrapper>

        <ChartWrapper title="Alunos vs Não-Alunos" description="Segmentação de usuários únicos por status de aluno" chartId="users-student-dist">
          <PieDonut data={pieData} />
        </ChartWrapper>

        <ChartWrapper title="% Não-Alunos 3+ Entradas (Evolução)" description="Evolução do percentual ao longo do tempo" chartId="users-pct-trend">
          <TrendLine data={pctData.map(r => ({ date: safeFormatDate(r.data), value: Number(r.percentual_com_3_entradas) }))} color="#f59e0b" xLabel="Data" yLabel="%" />
        </ChartWrapper>

        <ChartWrapper title="Top 20 Sessões por Mensagens" description="Sessões mais ativas no período (phones mascarados por privacidade)" chartId="users-top">
          <DataTable
            data={maskedTopUsers as Record<string, unknown>[]}
            columns={[
              { key: 'session_id', label: 'Sessão', sortable: true },
              { key: 'total_msgs', label: 'Mensagens', sortable: true },
              { key: 'categorias', label: 'Categorias', sortable: true },
            ]}
          />
        </ChartWrapper>
      </div>
    </div>
  );
}
