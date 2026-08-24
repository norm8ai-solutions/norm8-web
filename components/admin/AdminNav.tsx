/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminNav.tsx
 * Description: Sidebar navigation for the Norm8 admin dashboard.
 * Responsibilities:
 * - Render grouped admin navigation links with consistent iconography.
 * - Highlight active routes while keeping future modules visibly reserved.
 * - Support expanded and collapsed sidebar states.
 * ------------------------------------------------------------------
 */

'use client';

import {
  Bell,
  CalendarClock,
  FileSignature,
  Gauge,
  Inbox,
  Mail,
  Receipt,
  PanelsTopLeft,
  Plug,
  Settings,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';

type NavItem = {
  href?: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  disabled?: boolean;
};

type AdminNavProps = {
  isCollapsed?: boolean;
};

const navSections: Array<{ label?: string; items: NavItem[] }> = [
  {
    items: [
      { href: '/admin', label: 'Overview', icon: Gauge },
      { label: 'Sales', icon: TrendingUp, disabled: true },
      { href: '/admin/leads', label: 'Leads', icon: Users },
      { href: '/admin/submissions', label: 'Pipeline', icon: Inbox },
      { href: '/admin/contracts', label: 'Contratos', icon: FileSignature },
      { href: '/admin/projects', label: 'Projetos', icon: PanelsTopLeft },
      { href: '/admin/finance', label: 'Finance', icon: Receipt },
    ],
  },
  {
    items: [
      { href: '/admin/meetings', label: 'Meetings', icon: CalendarClock },
      { href: '/admin/emails', label: 'Emails', icon: Mail },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    items: [
      { href: '/admin/settings/company/legal', label: 'Settings', icon: Settings },
      { label: 'Users', icon: UserCog, disabled: true },
      { label: 'Integrations', icon: Plug, disabled: true },
    ],
  },
];

/**
 * Renders route-aware admin navigation.
 *
 * @param props Sidebar collapsed state.
 * @returns Admin sidebar nav.
 */
export default function AdminNav({ isCollapsed = false }: AdminNavProps) {
  const pathname = usePathname();
  const iconSize = 16;

  return (
    <nav className="admin-nav" aria-label="NavegaÃ§Ã£o principal do Admin">
      {navSections.map((section, sectionIndex) => (
        <div className="admin-nav-section" key={sectionIndex}>
          {section.items.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/admin'
                ? pathname === item.href
                : Boolean(item.href && pathname.startsWith(item.href));

            if (item.disabled || !item.href) {
              return (
                <span
                  aria-label={`${item.label} â€” em breve`}
                  className="admin-nav-link admin-nav-link-disabled"
                  key={item.label}
                  title={isCollapsed ? `${item.label} â€” em breve` : undefined}
                >
                  <Icon aria-hidden="true" size={iconSize} />
                  <span aria-hidden={isCollapsed} className="admin-nav-label">
                    {item.label}
                  </span>
                  <small aria-hidden={isCollapsed}>soon</small>
                </span>
              );
            }

            return (
              <Link
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                className={`admin-nav-link${active ? ' admin-nav-link-active' : ''}`}
                href={item.href}
                key={item.href}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon aria-hidden="true" size={iconSize} />
                <span aria-hidden={isCollapsed} className="admin-nav-label">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
