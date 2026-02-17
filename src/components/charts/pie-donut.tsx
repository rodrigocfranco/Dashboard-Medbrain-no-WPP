'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface PieDonutProps {
  data: { name: string; value: number }[];
  innerRadius?: number;
}

export default function PieDonut({ data, innerRadius = 60 }: PieDonutProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={100} paddingAngle={2} dataKey="value" nameKey="name" label={((props: Record<string, unknown>) => `${props.name} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`) as any}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
