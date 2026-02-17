import { NextRequest, NextResponse } from 'next/server';

export function setCorsHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // If no Origin header, it's same-origin (browser doesn't send Origin for same-origin)
  if (!origin) {
    return response;
  }

  // Check if origin matches host (same-origin)
  const originUrl = new URL(origin);
  const isSameOrigin = originUrl.host === host;

  if (isSameOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
  }
  // Cross-origin: no CORS headers → browser blocks

  return response;
}

export function handlePreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin) {
    return new NextResponse(null, { status: 204 });
  }

  const originUrl = new URL(origin);
  const isSameOrigin = originUrl.host === host;

  if (!isSameOrigin) {
    return new NextResponse(null, { status: 403 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}
