import { NextRequest, NextResponse } from 'next/server';
import { generateSQL, AIUnavailableError, type AIMessage } from '@/lib/ai';
import { validateSQL } from '@/lib/sql-validator';
import { query } from '@/lib/db';
import { checkRateLimit, extractIP } from '@/lib/rate-limiter';
import { maskPhoneColumns } from '@/lib/phone-mask';
import { handlePreflight } from '@/lib/cors';

const MAX_ROWS = 1000;
const MAX_RETRIES = 2;

function suggestChart(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return 'table';
  const keys = Object.keys(rows[0]);
  if (keys.length === 1) return 'table';

  // 2 columns heuristics
  if (keys.length === 2) {
    const first = rows[0][keys[0]];
    const second = rows[0][keys[1]];
    const firstIsDate = typeof first === 'string' && /^\d{4}-\d{2}/.test(first);
    const secondIsNum = typeof second === 'number' || !isNaN(Number(second));

    if (firstIsDate && secondIsNum) return 'line';
    if (typeof first === 'string' && secondIsNum) return 'bar';
  }

  if (rows.length === 1 && keys.length <= 3) return 'kpi';
  return 'table';
}

export async function POST(request: NextRequest) {
  const ip = extractIP(request);
  const rateCheck = checkRateLimit(ip, '/api/ai/chat');
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
    const { message, history = [] } = body as {
      message: string;
      history?: AIMessage[];
    };

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    let lastError = '';
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const prompt =
        attempt > 0
          ? `${message}\n\nNOTA: A query anterior foi rejeitada pelo validator: "${lastError}". Gere uma nova query que não use CTEs, DML, ou tabelas fora da whitelist.`
          : message;

      const result = await generateSQL(prompt, history);

      if (!result.sql) {
        return NextResponse.json({
          sql: null,
          explanation: result.explanation,
          results: null,
          suggestedChart: null,
        });
      }

      const validation = validateSQL(result.sql);
      if (!validation.valid) {
        lastError = validation.error || 'Query inválida';
        if (attempt < MAX_RETRIES - 1) continue;
        return NextResponse.json({
          sql: result.sql,
          explanation: `Query rejeitada pelo validator: ${validation.error}`,
          results: null,
          suggestedChart: null,
        });
      }

      // Execute
      const rows = await query(result.sql, result.params);
      const limited = rows.slice(0, MAX_ROWS);
      const masked = maskPhoneColumns(limited);

      return NextResponse.json({
        sql: result.sql,
        explanation: result.explanation,
        results: masked,
        rowCount: rows.length,
        suggestedChart: suggestChart(masked),
      });
    }

    return NextResponse.json(
      { error: 'Não foi possível gerar uma query válida' },
      { status: 422 }
    );
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('[API /ai/chat] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}
