'use client';

interface HeatmapProps {
  data: { x: number; y: number; value: number }[];
  xLabels: string[];
  yLabels: string[];
}

function getColor(value: number, max: number): string {
  if (max === 0) return 'bg-gray-100';
  const intensity = value / max;
  if (intensity < 0.2) return 'bg-blue-100';
  if (intensity < 0.4) return 'bg-blue-200';
  if (intensity < 0.6) return 'bg-blue-300';
  if (intensity < 0.8) return 'bg-blue-400';
  return 'bg-blue-600 text-white';
}

export default function Heatmap({ data, xLabels, yLabels }: HeatmapProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const grid = new Map<string, number>();
  data.forEach(d => grid.set(`${d.x}-${d.y}`, d.value));

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="flex">
          <div className="w-10" />
          {xLabels.map((label, i) => (
            <div key={i} className="w-10 text-center text-[10px] text-gray-500 mb-1">{label}</div>
          ))}
        </div>
        {yLabels.map((yLabel, y) => (
          <div key={y} className="flex items-center">
            <div className="w-10 text-right text-[10px] text-gray-500 pr-1">{yLabel}</div>
            {xLabels.map((_, x) => {
              const val = grid.get(`${x}-${y}`) || 0;
              return (
                <div
                  key={x}
                  className={`w-10 h-8 flex items-center justify-center text-[9px] border border-white rounded-sm ${getColor(val, max)}`}
                  title={`${yLabel} ${xLabels[x]}: ${val}`}
                >
                  {val > 0 ? val : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
