import { NextResponse } from 'next/server';
import { COOKIE_NAME, verifyToken } from './lib/auth.js';

// Paths that do NOT require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

// Paths that require the admin role
const ADMIN_PATHS = ['/admin', '/api/admin', '/api/logs'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return redirectOrUnauthorized(request, pathname);
  }

  const session = await verifyToken(token);

  if (!session) {
    return redirectOrUnauthorized(request, pathname);
  }

  // Admin-only paths
  if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (session.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Forward user identity to API route handlers via request headers
  // (avoids re-verifying the JWT inside every API route)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', String(session.userId));
  requestHeaders.set('x-username', String(session.username));
  requestHeaders.set('x-user-role', String(session.role));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

function redirectOrUnauthorized(request, pathname) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on every request except static assets handled by Next.js
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
