'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface HistogramProps {
  data: { faixa: string; total: number }[];
  color?: string;
  xLabel?: string;
  yLabel?: string;
}

export default function Histogram({ data, color = '#8b5cf6', xLabel, yLabel }: HistogramProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ bottom: xLabel ? 20 : 5, left: yLabel ? 10 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="faixa" tick={{ fontSize: 11 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, style: { fontSize: 11, fill: '#6b7280' } } : undefined} />
        <YAxis tick={{ fontSize: 11 }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280', textAnchor: 'middle' } } : undefined} />
        <Tooltip />
        <Bar dataKey="total" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
