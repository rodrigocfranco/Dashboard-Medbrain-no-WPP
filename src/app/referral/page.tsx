import { query } from '@/lib/db';
import { safeFormatDate } from '@/lib/utils';
import { maskPhone } from '@/lib/phone-mask';
import KPICard from '@/components/charts/kpi-card';
import ChartWrapper from '@/components/charts/chart-wrapper';
import TrendLine from '@/components/charts/trend-line';
import DataTable from '@/components/ui/data-table';
import AlertBanner from '@/components/ui/alert-banner';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function ReferralPage() {
  const [referrers, referredGrowth, totalReferrers, totalReferred, avgReferrals] =
    await Promise.all([
      query(
        'SELECT referrer_phone, referrals_count, referral_code, created_at FROM referral_referrers ORDER BY referrals_count DESC LIMIT 20'
      ),
      query(
        'SELECT created_at_data as dia, COUNT(*)::int as novos FROM db_medbrain_referred GROUP BY dia ORDER BY dia'
      ),
      query('SELECT COUNT(*)::int as total FROM referral_referrers'),
      query('SELECT COUNT(*)::int as total FROM referral_referred'),
      query(
        'SELECT ROUND(AVG(referrals_count)::numeric, 1) as avg FROM referral_referrers'
      ),
    ]);

  const maskedReferrers = referrers.map((r) => ({
    ...r,
    referrer_phone: maskPhone(String(r.referrer_phone)),
  }));

  // Cumulative area data
  let cumulative = 0;
  const cumulativeData = referredGrowth.map((r) => {
    cumulative += Number(r.novos);
    return { date: safeFormatDate(r.dia), value: cumulative };
  });

  return (
    <div>
      <Header title="Referral" />
      <div className="p-6 space-y-6">
        <PeriodSelector disabled disabledMessage="Dados históricos — seletor de período não se aplica" />

        <AlertBanner
          type="info"
          message="O programa de referral está atualmente desabilitado. Os dados abaixo são históricos e não respondem ao seletor de período."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            title="Total de Indicadores"
            value={Number(totalReferrers[0]?.total || 0).toLocaleString('pt-BR')}
            tooltip="Total de usuários que indicaram outros"
          />
          <KPICard
            title="Total de Indicados"
            value={Number(totalReferred[0]?.total || 0).toLocaleString('pt-BR')}
            tooltip="Total de usuários que foram indicados"
          />
          <KPICard
            title="Média de Indicações"
            value={avgReferrals[0]?.avg != null ? String(avgReferrals[0].avg) : '—'}
            tooltip="Média de indicações por indicador"
          />
        </div>

        <ChartWrapper
          title="Crescimento de Indicados"
          description="Crescimento acumulado de novos usuários indicados ao longo do tempo"
          chartId="referral-growth"
        >
          <TrendLine data={cumulativeData} color="#10b981" xLabel="Data" yLabel="Indicados (acumulado)" />
        </ChartWrapper>

        <ChartWrapper
          title="Top Indicadores"
          description="Ranking dos maiores indicadores (phones mascarados por privacidade)"
          chartId="referral-top"
        >
          <DataTable
            data={maskedReferrers as Record<string, unknown>[]}
            columns={[
              { key: 'referrer_phone', label: 'Telefone', sortable: true },
              { key: 'referrals_count', label: 'Indicações', sortable: true },
              { key: 'referral_code', label: 'Código' },
              { key: 'created_at', label: 'Cadastro', sortable: true },
            ]}
          />
        </ChartWrapper>
      </div>
    </div>
  );
}
