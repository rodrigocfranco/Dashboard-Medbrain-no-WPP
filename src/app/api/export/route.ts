import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateSQL } from '@/lib/sql-validator';
import { checkRateLimit, extractIP } from '@/lib/rate-limiter';
import { maskPhoneColumns } from '@/lib/phone-mask';
import { handlePreflight } from '@/lib/cors';

// NOTE: rows loaded in memory from pg, then streamed as CSV. 10k limit prevents memory issues.
const MAX_EXPORT_ROWS = 10000;

function rowsToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  const ip = extractIP(request);
  const rateCheck = checkRateLimit(ip, '/api/export');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfter) },
      }
    );
  }

  try {
    const body = await request.json();
    const { sql, params = [] } = body as {
      sql: string;
      params?: unknown[];
    };

    if (!sql) {
      return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
    }

    const validation = validateSQL(sql);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const rows = await query(sql, params);

    if (rows.length > MAX_EXPORT_ROWS) {
      return NextResponse.json(
        {
          error: `Resultado excede limite de ${MAX_EXPORT_ROWS.toLocaleString()} linhas. Adicione filtros à query.`,
        },
        { status: 400 }
      );
    }

    const masked = maskPhoneColumns(rows);
    const csv = rowsToCSV(masked);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('[API /export] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}
