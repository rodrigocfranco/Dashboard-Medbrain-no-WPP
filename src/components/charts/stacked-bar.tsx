'use client';

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface BarConfig {
  key: string;
  color: string;
  name: string;
}

interface StackedBarProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: BarConfig[];
  xLabel?: string;
  yLabel?: string;
}

// Safe rounding helper — avoids floating point artifacts
function pct(v: unknown): string {
  return parseFloat(Number(v).toFixed(1)).toString();
}

// Custom label inside bars — show if segment >= 2% and tall enough
function BarLabel(props: Record<string, unknown>) {
  const { x, y, width, height, value } = props as { x: number; y: number; width: number; height: number; value: number };
  const num = Number(value);
  if (!num || num < 2 || height < 14) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={num < 5 ? 8 : 10}
      fontWeight={600}
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
    >
      {pct(num)}%
    </text>
  );
}

// Custom tooltip that respects bar order
function CustomTooltip({ active, payload, label, bars }: Record<string, unknown> & { bars: BarConfig[] }) {
  if (!active || !payload) return null;
  const items = payload as { dataKey: string; value: number; color: string; name: string }[];
  const ordered = bars
    .map(b => items.find(it => it.dataKey === b.key))
    .filter(Boolean) as typeof items;
  return (
    <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{String(label)}</p>
      {ordered.map(it => (
        <div key={it.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: it.color }} />
          <span className="text-gray-600">{it.name}:</span>
          <span className="font-medium">{pct(it.value)}%</span>
        </div>
      ))}
    </div>
  );
}

// Custom legend rendered manually (avoids Recharts Legend type issues)
function OrderedLegend({ bars }: { bars: BarConfig[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs">
      {bars.map(bar => (
        <div key={bar.key} className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: bar.color }} />
          <span className="text-gray-600">{bar.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function StackedBar({ data, xKey, bars, xLabel, yLabel }: StackedBarProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart data={data} margin={{ bottom: xLabel ? 20 : 5, left: yLabel ? 10 : 0, top: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, style: { fontSize: 11, fill: '#6b7280' } } : undefined} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${Number(v)}%`} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280', textAnchor: 'middle' } } : undefined} />
          <Tooltip content={(props) => <CustomTooltip {...props} bars={bars} />} />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              stackId="stack"
              fill={bar.color}
              name={bar.name}
              label={<BarLabel />}
            />
          ))}
          {/* Trend lines at cumulative boundaries */}
          {bars.slice(0, -1).map((bar, i) => (
            <Line
              key={`c${i + 1}`}
              dataKey={`c${i + 1}`}
              type="monotone"
              stroke={bar.color}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              strokeOpacity={0.6}
              dot={false}
              activeDot={false}
              legendType="none"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <OrderedLegend bars={bars} />
    </div>
  );
}
