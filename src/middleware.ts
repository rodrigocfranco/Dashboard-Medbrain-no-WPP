import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip auth for health check
  if (request.nextUrl.pathname === '/api/health') {
    return addSecurityHeaders(NextResponse.next());
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return unauthorized();
  }

  try {
    const base64 = authHeader.split(' ')[1];
    const decoded = atob(base64);
    const [user, password] = decoded.split(':');

    if (
      user === process.env.DASHBOARD_USER &&
      password === process.env.DASHBOARD_PASSWORD
    ) {
      return addSecurityHeaders(NextResponse.next());
    }
  } catch {
    // Invalid base64
  }

  return unauthorized();
}

function unauthorized(): NextResponse {
  const response = new NextResponse('Unauthorized', { status: 401 });
  response.headers.set(
    'WWW-Authenticate',
    'Basic realm="Medbrain Dashboard"'
  );
  return addSecurityHeaders(response);
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'"
  );
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
