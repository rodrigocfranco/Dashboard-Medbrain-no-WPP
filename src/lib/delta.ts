export interface DeltaResult {
  value: number;
  percentage: number | null;
  direction: 'up' | 'down' | 'neutral';
}

export function calculateDelta(
  currentValue: number,
  previousValue: number | null
): DeltaResult {
  if (previousValue === null || previousValue === 0) {
    return { value: currentValue, percentage: null, direction: 'neutral' };
  }

  const percentage = ((currentValue - previousValue) / previousValue) * 100;
  const direction =
    currentValue > previousValue
      ? 'up'
      : currentValue < previousValue
        ? 'down'
        : 'neutral';

  return {
    value: currentValue,
    percentage: Math.round(percentage * 10) / 10,
    direction,
  };
}

export function getPreviousPeriod(
  from: Date,
  to: Date
): { from: Date; to: Date } {
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1); // 1ms before current period start
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { from: prevFrom, to: prevTo };
}
