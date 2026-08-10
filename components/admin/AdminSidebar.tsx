/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminSidebar.tsx
 * Description: Collapsible sidebar shell for the Norm8 admin dashboard.
 * Responsibilities:
 * - Persist sidebar collapsed state in localStorage.
 * - Keep Admin layout route/auth logic on the server.
 * - Render compact and expanded navigation states accessibly.
 * ------------------------------------------------------------------
 */

'use client';

import { ExternalLink, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLogo from './AdminLogo';
import AdminNav from './AdminNav';

const storageKey = 'norm8-admin-sidebar-collapsed';

/**
 * Renders the collapsible Admin sidebar and persists user preference.
 *
 * @returns Admin sidebar.
 */
export default function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (stored === 'true' || stored === 'false') {
      setIsCollapsed(stored === 'true');
      return;
    }

    if (window.matchMedia('(max-width: 980px)').matches) {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapsed = (): void => {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    });
  };

  const toggleLabel = isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar';
  const footerIconSize = 15;
  const toggleIconSize = 16;

  return (
    <aside
      className={`admin-sidebar${isCollapsed ? ' admin-sidebar-collapsed' : ''}`}
      data-collapsed={isCollapsed}
    >
      <div className="admin-brand">
        <AdminLogo caption="Control Center" compact={isCollapsed} />
      </div>

      <AdminNav isCollapsed={isCollapsed} />

      <div className="admin-sidebar-footer">
        <Link
          aria-label="Voltar ao site"
          className="admin-secondary-link"
          href="/"
          title={isCollapsed ? 'Voltar ao site' : undefined}
        >
          <ExternalLink aria-hidden="true" size={footerIconSize} />
          <span aria-hidden={isCollapsed} className="admin-sidebar-label">
            Voltar ao site
          </span>
        </Link>
        <button
          aria-label={toggleLabel}
          className="admin-sidebar-toggle"
          onClick={toggleCollapsed}
          title={toggleLabel}
          type="button"
        >
          {isCollapsed ? (
            <PanelLeftOpen aria-hidden="true" size={toggleIconSize} />
          ) : (
            <PanelLeftClose aria-hidden="true" size={toggleIconSize} />
          )}
          <span aria-hidden={isCollapsed} className="admin-sidebar-label">
            {toggleLabel}
          </span>
        </button>
        <div className="admin-system-state" title={isCollapsed ? 'Internal · v0.1' : undefined}>
          <span aria-hidden={isCollapsed} className="admin-sidebar-label">
            Internal
          </span>
          <span aria-hidden={isCollapsed} className="admin-sidebar-label">
            v0.1
          </span>
          <span className="admin-system-state-dot" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}
