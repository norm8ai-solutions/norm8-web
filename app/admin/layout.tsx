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

import Link from 'next/link';
import type { ReactNode } from 'react';
import AdminLogo from '@/components/admin/AdminLogo';
import AdminNav from '@/components/admin/AdminNav';
import AdminTopbar from '@/components/admin/AdminTopbar';
import './admin.css';

type AdminLayoutProps = {
  children: ReactNode;
};

export const dynamic = 'force-dynamic';

/**
 * Renders the shared admin navigation shell.
 *
 * @param props Admin page children.
 * @returns Admin shell layout.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <AdminLogo caption="Control Center" />
          </div>

          <AdminNav />

          <div className="admin-sidebar-footer">
            <Link className="admin-secondary-link" href="/">
              Voltar ao site
            </Link>
            <div className="admin-system-state">
              <span>Internal</span>
              <span>v0.1</span>
            </div>
          </div>
        </aside>

        <div className="admin-main">
          <AdminTopbar />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
