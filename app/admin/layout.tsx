/**
 * ------------------------------------------------------------------
 * File: app/admin/layout.tsx
 * Description: Internal shell layout for the Norm8 admin dashboard.
 * Responsibilities:
 * - Provide sidebar and topbar navigation for admin pages.
 * - Apply the scoped premium admin visual system.
 * - Prepare the area for future enterprise authentication.
 * ------------------------------------------------------------------
 */

import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { isAdminAuthDisabledForDemo, requireAdmin } from '@/lib/admin/auth';
import './admin.css';

type AdminLayoutProps = {
  children: ReactNode;
};

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Renders the shared admin navigation shell.
 *
 * @param props Admin page children.
 * @returns Admin shell layout.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const headerStore = await headers();
  const pathname = headerStore.get('x-norm8-pathname') ?? '';

  if (pathname === '/admin/login') {
    return children;
  }

  const admin = await requireAdmin();
  const demoMode = isAdminAuthDisabledForDemo();

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <AdminSidebar />

        <div className="admin-main">
          <AdminTopbar adminEmail={admin.email} adminName={admin.name} isDemoMode={demoMode} />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
