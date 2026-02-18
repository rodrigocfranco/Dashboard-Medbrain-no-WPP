import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, extractIP } from '@/lib/rate-limiter';
import { handlePreflight } from '@/lib/cors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = extractIP(request);
  const rateCheck = checkRateLimit(ip, '/api/n8n');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
    );
  }

  const { id } = await params;

  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json(
      { error: 'ID de execução inválido' },
      { status: 400 }
    );
  }

  try {
    const baseUrl = process.env.N8N_API_URL;
    const apiKey = process.env.N8N_API_KEY;

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: 'N8N not configured' },
        { status: 503 }
      );
    }

    const res = await fetch(
      `${baseUrl}/executions/${encodeURIComponent(id)}?includeData=true`,
      { headers: { 'X-N8N-API-KEY': apiKey } }
    );

    if (!res.ok) {
      throw new Error(`N8N API: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API /n8n/${id}] Error:`, error);
    return NextResponse.json(
      { error: 'Não foi possível buscar detalhes da execução' },
      { status: 502 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}
