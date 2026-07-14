/**
 * ------------------------------------------------------------------
 * File: proxy.ts
 * Description: Lightweight routing guard for the internal Norm8 admin area.
 * Responsibilities:
 * - Redirect unauthenticated-looking /admin requests to /admin/login early.
 * - Pass the pathname to the server layout so /admin/login can bypass the shell.
 * - Leave authoritative session validation to server-side requireAdmin().
 * ------------------------------------------------------------------
 */

import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_SESSION_COOKIE = 'norm8_admin_session';

/**
 * TEMPORARY DEMO MODE:
 * Used only for local presentation demos. Do not enable in production.
 */
function isAdminAuthDisabledForDemo(): boolean {
  return (
    process.env.DISABLE_ADMIN_AUTH_FOR_DEMO === 'true' &&
    process.env.NODE_ENV !== 'production'
  );
}

export function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isLoginRoute = request.nextUrl.pathname === '/admin/login';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-norm8-pathname', request.nextUrl.pathname);

  if (!isAdminRoute || isAdminAuthDisabledForDemo()) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isLoginRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const hasSessionCookie = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (hasSessionCookie) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
