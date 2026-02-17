'use client';

import { usePeriod } from '@/contexts/period-context';
import { useState } from 'react';

interface PeriodSelectorProps {
  disabled?: boolean;
  disabledMessage?: string;
}

const PRESETS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
] as const;

export default function PeriodSelector({ disabled, disabledMessage }: PeriodSelectorProps) {
  const { period, setPeriod, setCustomRange, from, to } = usePeriod();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  if (disabled) {
    return (
      <div className="flex items-center gap-2 opacity-50" title={disabledMessage || 'Desabilitado'}>
        {PRESETS.map((p) => (
          <button key={p.value} disabled className="px-3 py-1.5 text-xs rounded-full bg-gray-200 text-gray-400 cursor-not-allowed">
            {p.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => { setPeriod(p.value); setShowCustom(false); }}
          className={`px-3 py-1.5 text-xs rounded-full transition-colors ${period === p.value && !showCustom ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${showCustom ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        Personalizado
      </button>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          />
          <span className="text-xs text-gray-400">até</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          />
          <button
            onClick={() => { if (customFrom && customTo) setCustomRange(customFrom, customTo); }}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded"
          >
            Aplicar
          </button>
        </div>
      )}
      <span className="text-xs text-gray-400 ml-2">
        {from.toLocaleDateString('pt-BR')} — {to.toLocaleDateString('pt-BR')}
      </span>
    </div>
  );
}
