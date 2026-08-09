import {
  ArrowLeft,
  CalendarClock,
  FileSignature,
  LayoutDashboard,
  Mail,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { BackButton } from '@/components/navigation/BackButton';

type SecondaryAction = {
  href: string;
  icon: ComponentType<{ size?: number }>;
  label: string;
};

type AdminNotFoundContentProps = {
  pathname?: string;
};

function getSecondaryAction(pathname = ''): SecondaryAction {
  if (pathname.startsWith('/admin/contracts')) {
    return {
      href: '/admin/contracts',
      icon: FileSignature,
      label: 'Ver Contratos',
    };
  }

  if (pathname.startsWith('/admin/meetings')) {
    return {
      href: '/admin/meetings',
      icon: CalendarClock,
      label: 'Ver Reuniões',
    };
  }

  if (pathname.startsWith('/admin/emails')) {
    return {
      href: '/admin/emails',
      icon: Mail,
      label: 'Ver Emails',
    };
  }

  return {
    href: '/admin/leads',
    icon: Users,
    label: 'Ver Leads',
  };
}

export function AdminNotFoundContent({ pathname }: AdminNotFoundContentProps) {
  const secondaryAction = getSecondaryAction(pathname);
  const SecondaryIcon = secondaryAction.icon;

  return (
    <section className="admin-page-grid">
      <div className="admin-panel">
        <div className="admin-panel-body">
          <div className="grid min-h-[58vh] place-items-center py-12">
            <div className="w-full max-w-2xl">
              <span className="admin-pill">Erro 404</span>
              <h1 className="mt-6 text-4xl font-semibold tracking-normal text-white">
                Página interna não encontrada
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#8FA2C4] sm:text-base">
                Não encontrámos esta página na área interna da Norm8.
              </p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-[#8FA2C4] sm:text-base">
                Verifique o link ou volte ao Control Center.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a className="admin-button" href="/admin">
                  <LayoutDashboard size={15} />
                  Voltar ao Control Center
                </a>
                <a className="admin-button admin-button-muted" href={secondaryAction.href}>
                  <SecondaryIcon size={15} />
                  {secondaryAction.label}
                </a>
                <BackButton className="admin-button admin-button-muted" fallbackHref="/admin">
                  <ArrowLeft size={15} />
                  Voltar atrás
                </BackButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}