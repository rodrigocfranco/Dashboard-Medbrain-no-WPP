import { format } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TZ = 'America/Sao_Paulo';

export function formatDateBR(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

/** Safe date formatter: handles Date objects, ISO strings, and invalid values from pg driver */
export function safeFormatDate(value: unknown): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy');
}

export function formatDateTimeBR(date: Date): string {
  return format(date, 'dd/MM/yyyy HH:mm');
}

export function toSaoPauloTz(date: Date): Date {
  return toZonedTime(date, TZ);
}

export function toSPIsoString(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

export type PeriodPreset = '7d' | '30d' | '90d';

export interface DateRange {
  from: Date;
  to: Date;
}

export function getPeriodDates(
  period: PeriodPreset | DateRange
): { from: Date; to: Date } {
  if (typeof period !== 'string') {
    return period;
  }

  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  switch (period) {
    case '7d':
      from.setDate(from.getDate() - 6);
      break;
    case '30d':
      from.setDate(from.getDate() - 29);
      break;
    case '90d':
      from.setDate(from.getDate() - 89);
      break;
  }

  return { from, to };
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatSeconds(value: number): string {
  return `${value.toFixed(1)}s`;
}

// Parse period from URL searchParams
export function parsePeriodFromParams(searchParams: {
  period?: string;
  from?: string;
  to?: string;
}): { from: Date; to: Date } {
  if (searchParams.from && searchParams.to) {
    return {
      from: new Date(searchParams.from),
      to: new Date(searchParams.to),
    };
  }

  const preset = (searchParams.period || '30d') as PeriodPreset;
  return getPeriodDates(preset);
}

// PT-BR day-of-week labels
export const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// PT-BR stopwords for word cloud
export const STOPWORDS_PT = new Set([
  'a', 'o', 'e', 'é', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na',
  'nos', 'nas', 'um', 'uma', 'uns', 'umas', 'para', 'por', 'com', 'sem',
  'que', 'se', 'não', 'mais', 'muito', 'como', 'mas', 'ou', 'ao', 'aos',
  'à', 'às', 'já', 'eu', 'ele', 'ela', 'nós', 'eles', 'elas', 'você',
  'vocês', 'me', 'te', 'lhe', 'nos', 'vos', 'lhes', 'meu', 'minha',
  'seu', 'sua', 'nosso', 'nossa', 'este', 'esta', 'esse', 'essa', 'aquele',
  'aquela', 'isto', 'isso', 'aquilo', 'qual', 'quais', 'quanto', 'quanta',
  'quando', 'onde', 'quem', 'ser', 'estar', 'ter', 'haver', 'ir', 'poder',
  'dever', 'fazer', 'sobre', 'entre', 'até', 'depois', 'antes', 'foi',
  'são', 'tem', 'pode', 'vai', 'está', 'era',
  'olá', 'oi', 'obrigado', 'obrigada', 'por favor', 'bom', 'dia', 'boa',
  'tarde', 'noite', 'sim', 'ok', 'tudo', 'bem', 'favor',
]);
