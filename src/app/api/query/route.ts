import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateSQL } from '@/lib/sql-validator';
import { checkRateLimit, extractIP } from '@/lib/rate-limiter';
import { maskPhoneColumns } from '@/lib/phone-mask';
import { handlePreflight } from '@/lib/cors';

const MAX_ROWS = 5000;

export async function POST(request: NextRequest) {
  const ip = extractIP(request);
  const rateCheck = checkRateLimit(ip, '/api/query');
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
    const { sql, params = [] } = body as { sql: string; params?: unknown[] };

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

    const truncated = rows.length > MAX_ROWS;
    const limited = truncated ? rows.slice(0, MAX_ROWS) : rows;
    const masked = maskPhoneColumns(limited);

    return NextResponse.json({
      data: masked,
      rowCount: rows.length,
      truncated,
    });
  } catch (error) {
    console.error('[API /query] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}
