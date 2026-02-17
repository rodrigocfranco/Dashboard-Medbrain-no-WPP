'use client';

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getPeriodDates, type PeriodPreset } from '@/lib/utils';
import { getPreviousPeriod } from '@/lib/delta';

interface PeriodContextValue {
  period: string;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  fromISO: string;
  toISO: string;
  previousFromISO: string;
  previousToISO: string;
  setPeriod: (period: PeriodPreset) => void;
  setCustomRange: (from: string, to: string) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const period = searchParams.get('period') || '30d';
  const customFrom = searchParams.get('from');
  const customTo = searchParams.get('to');

  const dates = useMemo(() => {
    if (customFrom && customTo) {
      return {
        from: new Date(customFrom),
        to: new Date(customTo),
      };
    }
    return getPeriodDates(period as PeriodPreset);
  }, [period, customFrom, customTo]);

  const previous = useMemo(
    () => getPreviousPeriod(dates.from, dates.to),
    [dates]
  );

  const setPeriod = useCallback(
    (p: PeriodPreset) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('period', p);
      params.delete('from');
      params.delete('to');
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const setCustomRange = useCallback(
    (from: string, to: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('period');
      params.set('from', from);
      params.set('to', to);
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const value = useMemo(
    () => ({
      period,
      from: dates.from,
      to: dates.to,
      previousFrom: previous.from,
      previousTo: previous.to,
      fromISO: dates.from.toISOString(),
      toISO: dates.to.toISOString(),
      previousFromISO: previous.from.toISOString(),
      previousToISO: previous.to.toISOString(),
      setPeriod,
      setCustomRange,
    }),
    [period, dates, previous, setPeriod, setCustomRange]
  );

  return (
    <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return ctx;
}
