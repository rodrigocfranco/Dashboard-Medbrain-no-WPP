'use client';

import { ResponsiveContainer, BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface BarChartComponentProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  horizontal?: boolean;
  xLabel?: string;
  yLabel?: string;
}

export default function BarChartComponent({ data, xKey, yKey, color = '#3b82f6', horizontal, xLabel, yLabel }: BarChartComponentProps) {
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(250, data.length * 35)}>
        <RechartsBar data={data} layout="vertical" margin={{ bottom: xLabel ? 20 : 5, left: yLabel ? 10 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 11 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, style: { fontSize: 11, fill: '#6b7280' } } : undefined} />
          <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11 }} width={120} />
          <Tooltip />
          <Bar dataKey={yKey} fill={color} radius={[0, 4, 4, 0]} />
        </RechartsBar>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RechartsBar data={data} margin={{ bottom: xLabel ? 20 : 5, left: yLabel ? 10 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, style: { fontSize: 11, fill: '#6b7280' } } : undefined} />
        <YAxis tick={{ fontSize: 11 }} label={yLabel ? { value: yLabel, position: 'insideLeft', angle: -90, style: { fontSize: 11, fill: '#6b7280', textAnchor: 'middle' } } : undefined} />
        <Tooltip />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </RechartsBar>
    </ResponsiveContainer>
  );
}
