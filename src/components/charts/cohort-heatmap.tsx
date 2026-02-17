'use client';

interface CohortHeatmapProps {
  data: {
    cohort_week: string;
    weeks_after: number;
    retention_pct: number;
    active_users: number;
    cohort_size: number;
  }[];
}

function getRetentionColor(pct: number): string {
  if (pct >= 80) return 'bg-green-600 text-white';
  if (pct >= 60) return 'bg-green-400 text-white';
  if (pct >= 40) return 'bg-yellow-400';
  if (pct >= 20) return 'bg-orange-300';
  if (pct > 0) return 'bg-red-200';
  return 'bg-gray-100';
}

export default function CohortHeatmap({ data }: CohortHeatmapProps) {
  const cohorts = [...new Set(data.map(d => d.cohort_week))].sort();
  const maxWeek = Math.max(...data.map(d => d.weeks_after), 0);
  const weeks = Array.from({ length: maxWeek + 1 }, (_, i) => i);

  const grid = new Map<string, { pct: number; users: number; size: number }>();
  data.forEach(d => grid.set(`${d.cohort_week}-${d.weeks_after}`, {
    pct: Number(d.retention_pct),
    users: Number(d.active_users),
    size: Number(d.cohort_size),
  }));

  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-gray-500">Cohort</th>
            <th className="px-2 py-1 text-gray-500">Size</th>
            {weeks.map(w => (
              <th key={w} className="px-2 py-1 text-center text-gray-500">W{w}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(cohort => {
            const sizeEntry = grid.get(`${cohort}-0`);
            return (
              <tr key={cohort}>
                <td className="px-2 py-1 text-gray-600 whitespace-nowrap">{new Date(cohort).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                <td className="px-2 py-1 text-center text-gray-600">{sizeEntry?.size || '—'}</td>
                {weeks.map(w => {
                  const entry = grid.get(`${cohort}-${w}`);
                  return (
                    <td
                      key={w}
                      className={`px-2 py-1 text-center rounded-sm ${entry ? getRetentionColor(entry.pct) : 'bg-gray-50'}`}
                      title={entry ? `${entry.users}/${entry.size} users (${entry.pct}%)` : 'No data'}
                    >
                      {entry ? `${entry.pct}%` : ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
