/**
 * ------------------------------------------------------------------
 * File: proxy.ts
 * Description: Temporary access guard for the internal Norm8 admin area.
 * Responsibilities:
 * - Protect /admin routes with a simple cookie when ADMIN_ACCESS_KEY is set.
 * - Allow /admin/login so the access key can be entered.
 * - Keep the implementation easy to replace with Clerk/Auth later.
 * ------------------------------------------------------------------
 */

import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_COOKIE_NAME = 'norm8_admin_access';

/**
 * Protects admin routes with a temporary key-based cookie.
 *
 * @param request Incoming Next.js request.
 * @returns Redirect response or pass-through response.
 */
export function proxy(request: NextRequest) {
  const accessKey = process.env.ADMIN_ACCESS_KEY;
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isLoginRoute = request.nextUrl.pathname === '/admin/login';

  if (!isAdminRoute || isLoginRoute || !accessKey) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (cookieValue === accessKey) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.searchParams.set('next', request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
