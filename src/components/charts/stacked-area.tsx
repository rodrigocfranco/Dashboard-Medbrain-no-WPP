'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface StackedAreaProps {
  data: Record<string, unknown>[];
  xKey: string;
  areas: { key: string; color: string; name: string }[];
  xLabel?: string;
  yLabel?: string;
}

export default function StackedArea({ data, xKey, areas, xLabel, yLabel }: StackedAreaProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ bottom: xLabel ? 20 : 5, left: yLabel ? 10 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, style: { fontSize: 11, fill: '#6b7280' } } : undefined} />
        <YAxis tick={{ fontSize: 11 }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280', textAnchor: 'middle' } } : undefined} />
        <Tooltip />
        <Legend />
        {areas.map((area) => (
          <Area key={area.key} type="monotone" dataKey={area.key} stackId="1" stroke={area.color} fill={area.color} fillOpacity={0.6} name={area.name} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
