/**
 * ------------------------------------------------------------------
 * File: app/admin/logout/route.ts
 * Description: Logout endpoint for Norm8 Admin sessions.
 * Responsibilities:
 * - Revoke the current database-backed admin session.
 * - Clear the httpOnly session cookie.
 * - Redirect back to the secure login page.
 * ------------------------------------------------------------------
 */

import { redirect } from 'next/navigation';
import { revokeCurrentAdminSession } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  await revokeCurrentAdminSession();
  redirect('/admin/login');
}

export async function GET() {
  await revokeCurrentAdminSession();
  redirect('/admin/login');
}
