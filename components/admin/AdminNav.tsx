/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminNav.tsx
 * Description: Sidebar navigation for the Norm8 admin dashboard.
 * Responsibilities:
 * - Render grouped admin navigation links with consistent iconography.
 * - Highlight active routes while keeping future modules visibly reserved.
 * - Keep route-awareness out of the server layout.
 * ------------------------------------------------------------------
 */

'use client';

import {
  Bell,
  CalendarClock,
  Gauge,
  Inbox,
  Mail,
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

const navSections: Array<{ label?: string; items: NavItem[] }> = [
  {
    items: [
      { href: '/admin', label: 'Overview', icon: Gauge },
      { label: 'Sales', icon: TrendingUp, disabled: true },
      { href: '/admin/leads', label: 'Leads', icon: Users },
      { href: '/admin/submissions', label: 'Pipeline', icon: Inbox },
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
      { label: 'Settings', icon: Settings, disabled: true },
      { label: 'Users', icon: UserCog, disabled: true },
      { label: 'Integrations', icon: Plug, disabled: true },
    ],
  },
];

/**
 * Renders route-aware admin navigation.
 *
 * @returns Admin sidebar nav.
 */
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
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
                <span className="admin-nav-link admin-nav-link-disabled" key={item.label}>
                  <Icon size={16} />
                  {item.label}
                  <small>soon</small>
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                className={`admin-nav-link${active ? ' admin-nav-link-active' : ''}`}
                href={item.href}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
