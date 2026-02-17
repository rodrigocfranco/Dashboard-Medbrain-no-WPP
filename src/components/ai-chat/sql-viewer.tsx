'use client';

import { useState } from 'react';

interface SQLViewerProps {
  sql: string;
}

export default function SQLViewer({ sql }: SQLViewerProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800">
        <span className="text-xs text-gray-400">SQL</span>
        <button
          onClick={copy}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className="p-3 text-xs text-green-400 overflow-x-auto">
        <code>{sql}</code>
      </pre>
    </div>
  );
}
