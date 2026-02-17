'use client';

import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis } from 'recharts';

interface ScatterPlotProps {
  data: { x: number; y: number; label?: string }[];
  xLabel?: string;
  yLabel?: string;
}

export default function ScatterPlot({ data, xLabel = 'X', yLabel = 'Y' }: ScatterPlotProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" dataKey="x" name={xLabel} tick={{ fontSize: 11 }} />
        <YAxis type="number" dataKey="y" name={yLabel} tick={{ fontSize: 11 }} />
        <ZAxis range={[30, 30]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name="Data" data={data} fill="#3b82f6" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
