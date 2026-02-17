import { NextRequest, NextResponse } from 'next/server';

// Parse DASHBOARD_USERS env var: "user1:pass1,user2:pass2"
function getValidCredentials(): Map<string, string> {
  const creds = new Map<string, string>();

  // Support multi-user format
  const usersEnv = process.env.DASHBOARD_USERS;
  if (usersEnv) {
    usersEnv.split(',').forEach((pair) => {
      const [u, ...pParts] = pair.trim().split(':');
      if (u && pParts.length > 0) {
        creds.set(u, pParts.join(':')); // password can contain ':'
      }
    });
  }

  // Also support legacy single-user format
  const singleUser = process.env.DASHBOARD_USER;
  const singlePass = process.env.DASHBOARD_PASSWORD;
  if (singleUser && singlePass) {
    creds.set(singleUser, singlePass);
  }

  return creds;
}

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
    const colonIdx = decoded.indexOf(':');
    if (colonIdx === -1) return unauthorized();

    const user = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);

    const validCreds = getValidCredentials();
    if (validCreds.has(user) && validCreds.get(user) === password) {
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
