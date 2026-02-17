'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface StackedBarProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; color: string; name: string }[];
  xLabel?: string;
  yLabel?: string;
}

export default function StackedBar({ data, xKey, bars, xLabel, yLabel }: StackedBarProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ bottom: xLabel ? 20 : 5, left: yLabel ? 10 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, style: { fontSize: 11, fill: '#6b7280' } } : undefined} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280', textAnchor: 'middle' } } : undefined} />
        <Tooltip formatter={(value) => `${value}%`} />
        <Legend />
        {bars.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} stackId="stack" fill={bar.color} name={bar.name} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
