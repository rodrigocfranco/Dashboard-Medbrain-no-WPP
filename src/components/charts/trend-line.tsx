'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface TrendLineProps {
  data: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
}

export default function TrendLine({ data, xKey = 'date', yKey = 'value', color = '#3b82f6', xLabel, yLabel }: TrendLineProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ bottom: xLabel ? 20 : 5, left: yLabel ? 10 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, style: { fontSize: 11, fill: '#6b7280' } } : undefined} />
        <YAxis tick={{ fontSize: 11 }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280', textAnchor: 'middle' } } : undefined} />
        <Tooltip />
        <Line type="monotone" dataKey={yKey} name="Valor" stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
