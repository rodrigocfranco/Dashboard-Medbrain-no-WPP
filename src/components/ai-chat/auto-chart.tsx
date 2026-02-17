'use client';

import TrendLine from '@/components/charts/trend-line';
import BarChartComponent from '@/components/charts/bar-chart';
import PieDonut from '@/components/charts/pie-donut';
import KPICard from '@/components/charts/kpi-card';

interface AutoChartProps {
  data: Record<string, unknown>[];
  chartType: string;
}

export default function AutoChart({ data, chartType }: AutoChartProps) {
  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]);

  if (chartType === 'kpi' && data.length === 1) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {keys.map((key) => (
          <KPICard
            key={key}
            title={key}
            value={String(data[0][key] ?? '—')}
          />
        ))}
      </div>
    );
  }

  if (chartType === 'line' && keys.length >= 2) {
    return (
      <TrendLine
        data={data.map((r) => ({
          date: String(r[keys[0]]),
          value: Number(r[keys[1]] || 0),
        }))}
      />
    );
  }

  if (chartType === 'bar' && keys.length >= 2) {
    return (
      <BarChartComponent
        data={data as Record<string, unknown>[]}
        xKey={keys[0]}
        yKey={keys[1]}
      />
    );
  }

  if (chartType === 'pie' && keys.length >= 2) {
    return (
      <PieDonut
        data={data.map((r) => ({
          name: String(r[keys[0]]),
          value: Number(r[keys[1]] || 0),
        }))}
      />
    );
  }

  return null;
}
