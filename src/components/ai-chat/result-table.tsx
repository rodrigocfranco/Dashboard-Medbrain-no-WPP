'use client';

interface ResultTableProps {
  data: Record<string, unknown>[];
}

export default function ResultTable({ data }: ResultTableProps) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-gray-400 mt-1">Sem resultados</p>;
  }

  const keys = Object.keys(data[0]);
  const display = data.slice(0, 100);

  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead className="sticky top-0">
          <tr className="bg-gray-100">
            {keys.map((key) => (
              <th
                key={key}
                className="px-2 py-1.5 text-left text-gray-600 font-medium"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {display.map((row, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              {keys.map((key) => (
                <td key={key} className="px-2 py-1 text-gray-700">
                  {String(row[key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 100 && (
        <p className="text-[10px] text-gray-400 text-center py-1">
          Mostrando 100 de {data.length} linhas
        </p>
      )}
    </div>
  );
}
