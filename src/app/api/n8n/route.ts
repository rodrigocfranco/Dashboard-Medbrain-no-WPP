import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, extractIP } from '@/lib/rate-limiter';
import { handlePreflight } from '@/lib/cors';

export async function GET(request: NextRequest) {
  const ip = extractIP(request);
  const rateCheck = checkRateLimit(ip, '/api/n8n');
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
    const baseUrl = process.env.N8N_API_URL;
    const apiKey = process.env.N8N_API_KEY;

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: 'N8N not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const workflowId = searchParams.get('workflowId') || '7tp9fz1NxbfamadU';
    const limit = searchParams.get('limit') || '250';

    const params = new URLSearchParams({
      workflowId,
      limit,
    });
    if (status) params.set('status', status);

    const res = await fetch(`${baseUrl}/executions?${params}`, {
      headers: { 'X-N8N-API-KEY': apiKey },
    });

    if (!res.ok) {
      throw new Error(`N8N API: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /n8n] Error:', error);
    return NextResponse.json(
      { error: 'Não foi possível conectar à API do N8N' },
      { status: 502 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}
