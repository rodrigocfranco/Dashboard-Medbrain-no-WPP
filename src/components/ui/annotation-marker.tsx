'use client';

import { useState, useEffect } from 'react';

interface AnnotationMarkerProps {
  chartId: string;
}

export default function AnnotationMarker({ chartId }: AnnotationMarkerProps) {
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`annotation-${chartId}`);
    if (saved) setNote(saved);
  }, [chartId]);

  const save = (text: string) => {
    setNote(text);
    localStorage.setItem(`annotation-${chartId}`, text);
    setEditing(false);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <button onClick={() => setEditing(!editing)} className="text-gray-400 hover:text-yellow-500" title={note || 'Adicionar nota'}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      </button>
      {editing && (
        <input
          type="text"
          defaultValue={note}
          placeholder="Nota..."
          className="text-xs border rounded px-2 py-0.5 w-40"
          onKeyDown={(e) => {
            if (e.key === 'Enter') save((e.target as HTMLInputElement).value);
            if (e.key === 'Escape') setEditing(false);
          }}
          autoFocus
        />
      )}
      {note && !editing && (
        <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">{note}</span>
      )}
    </div>
  );
}
