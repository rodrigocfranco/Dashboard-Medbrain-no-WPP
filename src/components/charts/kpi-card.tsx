'use client';

import { useState } from 'react';
import type { DeltaResult } from '@/lib/delta';

interface KPICardProps {
  title: string;
  value: string | number;
  delta?: DeltaResult;
  format?: 'number' | 'percentage' | 'seconds' | 'currency';
  tooltip?: string;
  invertColors?: boolean;
}

export default function KPICard({ title, value, delta, tooltip, invertColors }: KPICardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getDeltaColor = () => {
    if (!delta || delta.direction === 'neutral') return 'text-gray-500';
    const isPositive = delta.direction === 'up';
    if (invertColors) return isPositive ? 'text-red-600' : 'text-green-600';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getDeltaIcon = () => {
    if (!delta || delta.direction === 'neutral') return '—';
    return delta.direction === 'up' ? '↑' : '↓';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 relative" aria-label={`${title}: ${value}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        {tooltip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-400 hover:text-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-5 z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 w-56 shadow-lg">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {delta && (
        <p className={`text-sm mt-1 ${getDeltaColor()}`}>
          {getDeltaIcon()}{' '}
          {delta.percentage !== null ? `${delta.percentage > 0 ? '+' : ''}${delta.percentage}%` : '—'}
        </p>
      )}
    </div>
  );
}
