'use client';

import { CalendarDays, ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminCommandBar from './AdminCommandBar';

type TopbarCopy = {
  title: string;
  subtitle: string;
};

const overviewCopy: TopbarCopy = {
  title: 'Overview',
  subtitle: 'Vis\u00e3o operacional do funil comercial.',
};

const internalNotFoundCopy: TopbarCopy = {
  title: 'P\u00e1gina interna n\u00e3o encontrada',
  subtitle: 'A rota que tentou aceder n\u00e3o existe na \u00e1rea interna da Norm8.',
};

const copyByRoute: Array<{ prefix: string; copy: TopbarCopy }> = [
  {
    prefix: '/admin/projects',
    copy: {
      title: 'Projetos',
      subtitle: 'Gest\u00e3o operacional, progresso e rentabilidade das implementa\u00e7\u00f5es da Norm8.',
    },
  },
  {
    prefix: '/admin/finance',
    copy: {
      title: 'Finance',
      subtitle: 'Gest\u00e3o interna de entradas, despesas, lucro e transa\u00e7\u00f5es da Norm8.',
    },
  },
  {
    prefix: '/admin/proposals',
    copy: {
      title: 'Proposta Final',
      subtitle: 'Resumo comercial, contexto de origem e documento PDF associado \u00e0 proposta.',
    },
  },
  {
    prefix: '/admin/contracts',
    copy: {
      title: 'Contratos',
      subtitle: 'Cria\u00e7\u00e3o, revis\u00e3o e gest\u00e3o de contratos comerciais da Norm8.',
    },
  },
  {
    prefix: '/admin/leads',
    copy: {
      title: 'Leads',
      subtitle: 'Qualifica\u00e7\u00e3o, prioridade e hist\u00f3rico comercial.',
    },
  },
  {
    prefix: '/admin/submissions',
    copy: {
      title: 'Submiss\u00f5es',
      subtitle: 'Pedidos recebidos no website Norm8.',
    },
  },
  {
    prefix: '/admin/meetings',
    copy: {
      title: 'Reuni\u00f5es',
      subtitle: 'Pedidos e confirma\u00e7\u00f5es ligadas ao Google Calendar.',
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
      title: 'Notifica\u00e7\u00f5es',
      subtitle: 'Alertas internos gerados pelas submiss\u00f5es.',
    },
  },
  {
    prefix: '/admin/settings',
    copy: {
      title: 'Settings',
      subtitle: 'Configura\u00e7\u00e3o legal e operacional da \u00e1rea interna.',
    },
  },
];

function getTopbarCopy(pathname: string): TopbarCopy {
  if (pathname === '/admin') return overviewCopy;
  const route = copyByRoute.find((item) => pathname.startsWith(item.prefix));
  return route?.copy ?? internalNotFoundCopy;
}

type AdminTopbarProps = {
  adminEmail: string;
  adminName: string | null;
  isDemoMode?: boolean;
};

export default function AdminTopbar({ adminEmail, adminName, isDemoMode = false }: AdminTopbarProps) {
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
        <p className="admin-topbar-eyebrow">{'\u00c1rea interna'}</p>
        <h1 className="admin-topbar-title">{copy.title}</h1>
        <p className="admin-topbar-subtitle">{copy.subtitle}</p>
      </div>
      <div className="admin-topbar-actions">
        <AdminCommandBar />
        {isDemoMode && <span className="admin-pill admin-pill-alert">{'Modo demo \u2014 autentica\u00e7\u00e3o desativada'}</span>}
        <span className="admin-pill" title={adminEmail}>
          <ShieldCheck size={14} />
          {adminName ?? adminEmail}
        </span>
        <span className="admin-pill">
          <CalendarDays size={14} />
          {today}
        </span>
        <Link className="admin-button admin-button-muted" href="/">
          <ExternalLink size={14} />
          Voltar ao site
        </Link>
        <form action="/admin/logout" method="post">
          <button className="admin-button admin-button-muted" type="submit">
            <LogOut size={14} />
            {'Terminar sess\u00e3o'}
          </button>
        </form>
      </div>
    </header>
  );
}