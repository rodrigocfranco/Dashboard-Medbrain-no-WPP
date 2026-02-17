'use client';

import React, { useState } from 'react';

class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[200px] text-gray-400 text-sm">
          Não foi possível renderizar este gráfico
        </div>
      );
    }
    return this.props.children;
  }
}

interface ChartWrapperProps {
  title: string;
  description: string;
  chartId: string;
  children: React.ReactNode;
}

export default function ChartWrapper({ title, description, chartId, children }: ChartWrapperProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [note, setNote] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`annotation-${chartId}`) || '';
    }
    return '';
  });
  const [editingNote, setEditingNote] = useState(false);

  const saveNote = (text: string) => {
    setNote(text);
    localStorage.setItem(`annotation-${chartId}`, text);
    setEditingNote(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 relative" aria-label={title}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="flex items-center gap-2">
          {/* Annotation */}
          <button
            onClick={() => setEditingNote(!editingNote)}
            className="text-gray-400 hover:text-yellow-500 transition-colors"
            title={note || 'Adicionar nota'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          </button>
          {/* Info tooltip */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-6 z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 w-64 shadow-lg">
                {description}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Annotation editor */}
      {editingNote && (
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            defaultValue={note}
            placeholder="Adicionar nota..."
            className="flex-1 text-xs border rounded px-2 py-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveNote((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditingNote(false);
            }}
            autoFocus
          />
          <button
            onClick={(e) => {
              const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
              saveNote(input?.value || '');
            }}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
          >
            Salvar
          </button>
        </div>
      )}
      {note && !editingNote && (
        <div className="mb-2 bg-yellow-50 text-yellow-800 text-xs px-2 py-1 rounded">
          📝 {note}
        </div>
      )}
      {/* Chart content */}
      <div className="min-h-[200px]">
        <ChartErrorBoundary>{children}</ChartErrorBoundary>
      </div>
    </div>
  );
}
