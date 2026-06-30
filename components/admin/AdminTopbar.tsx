/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminTopbar.tsx
 * Description: Route-aware topbar for the Norm8 admin dashboard.
 * Responsibilities:
 * - Show the current admin page title and operational context.
 * - Provide quick access back to the public website.
 * - Keep client-only pathname logic out of server layouts.
 * ------------------------------------------------------------------
 */

'use client';

import { CalendarDays, ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminCommandBar from './AdminCommandBar';

type TopbarCopy = {
  title: string;
  subtitle: string;
};

const copyByRoute: Array<{ prefix: string; copy: TopbarCopy }> = [
  {
    prefix: '/admin/leads',
    copy: {
      title: 'Leads',
      subtitle: 'Qualificação, prioridade e histórico comercial.',
    },
  },
  {
    prefix: '/admin/submissions',
    copy: {
      title: 'Submissões',
      subtitle: 'Pedidos recebidos no website Norm8.',
    },
  },
  {
    prefix: '/admin/meetings',
    copy: {
      title: 'Reuniões',
      subtitle: 'Pedidos e confirmações ligadas ao Google Calendar.',
    },
  },
  {
    prefix: '/admin/emails',
    copy: {
      title: 'Emails',
      subtitle: 'Logs transacionais e estado de entrega.',
    },
  },
  {
    prefix: '/admin/notifications',
    copy: {
      title: 'Notificações',
      subtitle: 'Alertas internos gerados pelas submissões.',
    },
  },
];

/**
 * Resolves the topbar title and subtitle for the current admin route.
 *
 * @param pathname Current browser pathname.
 * @returns Route-specific title copy.
 */
function getTopbarCopy(pathname: string): TopbarCopy {
  const route = copyByRoute.find((item) => pathname.startsWith(item.prefix));

  return (
    route?.copy ?? {
      title: 'Overview',
      subtitle: 'Visão operacional do funil comercial.',
    }
  );
}

/**
 * Renders the premium admin topbar.
 *
 * @returns Route-aware admin topbar.
 */
export default function AdminTopbar() {
  const pathname = usePathname();
  const copy = getTopbarCopy(pathname);
  const today = new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="admin-topbar">
      <div>
        <p className="admin-topbar-eyebrow">Área interna</p>
        <h1 className="admin-topbar-title">{copy.title}</h1>
        <p className="admin-topbar-subtitle">{copy.subtitle}</p>
      </div>
      <div className="admin-topbar-actions">
        <AdminCommandBar />
        <span className="admin-pill">
          <ShieldCheck size={14} />
          Internal
        </span>
        <span className="admin-pill">
          <CalendarDays size={14} />
          {today}
        </span>
        <Link className="admin-button admin-button-muted" href="/">
          <ExternalLink size={14} />
          Voltar ao site
        </Link>
      </div>
    </header>
  );
}
