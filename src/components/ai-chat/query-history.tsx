'use client';

interface QueryHistoryProps {
  queries: { message: string; sql: string }[];
  onSelect: (q: { message: string; sql: string }) => void;
  onClose: () => void;
}

export default function QueryHistory({
  queries,
  onSelect,
  onClose,
}: QueryHistoryProps) {
  return (
    <div className="w-72 bg-white rounded-lg shadow flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h4 className="text-sm font-semibold text-gray-700">
          Histórico de Queries
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          Fechar
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {queries.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            Nenhuma query ainda
          </p>
        ) : (
          queries.map((q, i) => (
            <button
              key={i}
              onClick={() => onSelect(q)}
              className="w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-50 transition-colors border"
            >
              <p className="text-gray-700 truncate">{q.message}</p>
              <p className="text-gray-400 truncate mt-0.5 font-mono text-[10px]">
                {q.sql.slice(0, 60)}...
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
