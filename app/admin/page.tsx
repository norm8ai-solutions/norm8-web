/**
 * ------------------------------------------------------------------
 * File: app/admin/page.tsx
 * Description: Overview page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Show lead, submission, meeting, and email KPIs.
 * - Surface latest submissions, upcoming meetings, notifications, and funnel state.
 * - Provide a compact operational starting point for internal users.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import type { LeadActionStatus } from '@/app/generated/prisma/client';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarCheck,
  CalendarX,
  ClipboardCheck,
  Clock,
  ExternalLink,
  MailCheck,
  MailX,
  Target,
  Users,
} from 'lucide-react';
import {
  LeadActionStatusBadge,
  LeadActionTypeBadge,
  LeadPriorityBadge,
  LeadStatusBadge,
  MeetingStatusBadge,
  SubmissionTypeBadge,
} from '@/components/admin/AdminBadge';
import { SubmissionsByDateChart } from '@/components/admin/SubmissionsByDateChart';
import {
  AdminEmptyState,
  AdminPanel,
  AdminRow,
  AdminStatCard,
} from '@/components/admin/AdminPrimitives';
import { getAdminOverview } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import {
  formatDatePt,
  formatMeetingDate,
  formatTimeRangePt,
  getSubmissionDisplayData,
} from '@/lib/admin/formatters';

type OverviewLeadActionGroup = Awaited<ReturnType<typeof getAdminOverview>>['overdueLeadActions'];
type OverviewLeadAction = OverviewLeadActionGroup['items'][number];


function OverviewActionsPanel({
  overdueActions,
  todayActions,
}: {
  overdueActions: OverviewLeadActionGroup;
  todayActions: OverviewLeadActionGroup;
}) {
  return (
    <AdminPanel
      title="Ações comerciais"
      subtitle="Follow-ups que precisam de atenção hoje."
      action={
        overdueActions.items.length > 0 ? (
          <span className="admin-pill admin-pill-alert">
            <AlertTriangle size={14} />
            {overdueActions.items.length} atrasada{overdueActions.items.length === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="admin-pill">Operacional</span>
        )
      }
    >
      <div className="admin-overview-actions-grid">
        <OverviewActionGroup
          actions={overdueActions.items}
          emptyMessage="Sem ações atrasadas."
          remainingCount={overdueActions.remainingCount}
          title="Atrasadas"
          variant="overdue"
        />
        <OverviewActionGroup
          actions={todayActions.items}
          emptyMessage="Sem ações para hoje."
          remainingCount={todayActions.remainingCount}
          title="Hoje"
          variant="today"
        />
      </div>
    </AdminPanel>
  );
}

function OverviewActionGroup({
  actions,
  emptyMessage,
  remainingCount,
  title,
  variant,
}: {
  actions: OverviewLeadAction[];
  emptyMessage: string;
  remainingCount: number;
  title: string;
  variant: 'overdue' | 'today';
}) {
  return (
    <section className={`admin-overview-action-group admin-overview-action-group-${variant}`}>
      <div className="admin-overview-action-group-header">
        <h3>{title}</h3>
        {remainingCount > 0 ? (
          <span className="admin-overview-action-more">+{remainingCount} restantes</span>
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="admin-overview-action-list">
          {actions.map((action) => (
            <OverviewActionItem action={action} key={action.id} variant={variant} />
          ))}
        </div>
      ) : (
        <div className="admin-overview-action-empty">{emptyMessage}</div>
      )}
    </section>
  );
}

function OverviewActionItem({
  action,
  variant,
}: {
  action: OverviewLeadAction;
  variant: 'overdue' | 'today';
}) {
  return (
    <article className={`admin-overview-action-item admin-overview-action-item-${variant}`}>
      <div className="admin-overview-action-topline">
        <LeadActionTypeBadge type={action.type} />
        <LeadActionStatusBadge status={getOverviewActionStatus(action)} />
      </div>
      <div>
        <p className="admin-rich-title">{action.title}</p>
        <p className="admin-rich-meta">{formatOverviewLeadIdentity(action)}</p>
      </div>
      <div className="admin-overview-action-meta-row">
        <span>{action.dueAt ? formatOverviewActionDueAt(action.dueAt, variant) : 'Sem data limite'}</span>
        <LeadPriorityBadge priority={action.lead.priority} />
      </div>
      <div className="admin-rich-item-bottom">
        <LeadStatusBadge status={action.lead.status} />
        <Link className="admin-rich-action" href={`/admin/leads/${action.leadId}`}>
          Abrir lead <ArrowRight size={13} />
        </Link>
      </div>
    </article>
  );
}

function getOverviewActionStatus(action: OverviewLeadAction): LeadActionStatus {
  if (action.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (action.status === 'OVERDUE' || (action.dueAt && action.dueAt < new Date())) {
    return 'OVERDUE';
  }

  return action.status;
}

function formatOverviewLeadIdentity(action: OverviewLeadAction): string {
  const company = action.lead.company ?? 'Sem empresa';
  const name = action.lead.name ?? 'Sem nome';

  return `${company} · ${name}`;
}

function formatOverviewActionDueAt(
  dueAt: Date,
  variant: 'overdue' | 'today',
): string {
  if (variant === 'today') {
    return `Hoje, ${dueAt.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return formatDatePt(dueAt);
}

/**
 * Formats recent dates into compact CRM-friendly copy.
 *
 * @param date Date to format.
 * @returns Relative or short absolute date label.
 */
function formatRelativeAdminDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const time = date.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffMs >= 0 && diffMs < dayMs) {
    return `Hoje · ${time}`;
  }

  if (diffMs >= dayMs && diffMs < dayMs * 2) {
    return `Ontem · ${time}`;
  }

  return formatDatePt(date);
}

/**
 * Calculates a human-readable meeting duration.
 *
 * @param startsAt Meeting start.
 * @param endsAt Meeting end.
 * @returns Duration in minutes.
 */
function formatDurationMinutes(startsAt: Date, endsAt: Date): string {
  const minutes = Math.max(
    1,
    Math.round((endsAt.getTime() - startsAt.getTime()) / 60000),
  );

  return `${minutes} min`;
}

/**
 * Formats a meeting start time in the meeting timezone.
 *
 * @param startsAt Meeting start.
 * @param timezone IANA timezone.
 * @returns Short time label.
 */
function formatMeetingTime(startsAt: Date, timezone: string): string {
  return startsAt.toLocaleTimeString('pt-PT', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Renders the admin overview dashboard.
 *
 * @returns Admin overview page.
 */
export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();
  const metrics = [
    {
      icon: <Users size={16} />,
      label: 'Leads',
      value: overview.metrics.totalLeads,
      context: 'Total captado',
      trend: overview.metrics.trends.totalLeads,
    },
    {
      icon: <Target size={16} />,
      label: 'Novos',
      value: overview.metrics.newLeads,
      context: 'Por qualificar',
      trend: overview.metrics.trends.newLeads,
    },
    {
      icon: <ClipboardCheck size={16} />,
      label: 'Submissões',
      value: overview.metrics.totalSubmissions,
      context: 'Pedidos recebidos',
      trend: overview.metrics.trends.totalSubmissions,
    },
    {
      icon: <ClipboardCheck size={16} />,
      label: 'Auditorias',
      value: overview.metrics.auditRequests,
      context: 'Auditoria Inteligente',
      trend: overview.metrics.trends.auditRequests,
    },
    {
      icon: <Bot size={16} />,
      label: 'Automações',
      value: overview.metrics.automationRequests,
      context: 'Pedidos custom',
      trend: overview.metrics.trends.automationRequests,
    },
    {
      icon: <CalendarCheck size={16} />,
      label: 'Confirmadas',
      value: overview.metrics.confirmedMeetings,
      context: 'Reuniões',
      trend: overview.metrics.trends.confirmedMeetings,
    },
    {
      icon: <CalendarX size={16} />,
      label: 'Falhadas',
      value: overview.metrics.failedMeetings,
      context: 'Reuniões',
      trend: overview.metrics.trends.failedMeetings,
    },
    {
      icon: <MailCheck size={16} />,
      label: 'Enviados',
      value: overview.metrics.sentEmails,
      context: 'Emails',
      trend: overview.metrics.trends.sentEmails,
    },
    {
      icon: <MailX size={16} />,
      label: 'Falhados',
      value: overview.metrics.failedEmails,
      context: 'Emails',
      trend: overview.metrics.trends.failedEmails,
    },
  ];

  const funnelItems = [
    ['Novos leads', overview.metrics.newLeads],
    ['Auditorias', overview.metrics.auditRequests],
    ['Automações', overview.metrics.automationRequests],
    ['Reuniões confirmadas', overview.metrics.confirmedMeetings],
  ] as const;

  return (
    <div className="admin-page-grid">
      <section className="admin-kpi-grid">
        {metrics.map((metric) => (
          <AdminStatCard key={metric.label} {...metric} />
        ))}
      </section>

      <AdminPanel
        title="Submissões por data"
        subtitle="Evolução diária dos pedidos recebidos nos últimos 30 dias."
      >
        <SubmissionsByDateChart data={overview.submissionsByDate} />
      </AdminPanel>

      <OverviewActionsPanel
        overdueActions={overview.overdueLeadActions}
        todayActions={overview.dueTodayLeadActions}
      />

      <section className="admin-grid-2">
        <AdminPanel title="Últimas submissões" subtitle="Atividade comercial recente.">
          {overview.latestSubmissions.length > 0 ? (
            <div className="admin-rich-list">
              {overview.latestSubmissions.map((submission) => {
                const display = getSubmissionDisplayData(submission);

                return (
                  <article className="admin-rich-item" key={submission.id}>
                    <div className="admin-rich-item-top">
                      <div style={{ alignItems: 'center', display: 'flex', gap: 9 }}>
                        <span className="admin-rich-dot" />
                        <SubmissionTypeBadge type={submission.type} />
                      </div>
                      <LeadPriorityBadge priority={submission.lead.priority} />
                    </div>
                    <div>
                      <p className="admin-rich-title">{display.company ?? 'Sem empresa'}</p>
                      <p className="admin-rich-meta">
                        {display.name ?? 'Sem nome'} ·{' '}
                        {formatRelativeAdminDate(submission.createdAt)}
                      </p>
                    </div>
                    <div className="admin-rich-item-bottom">
                      <span className="admin-rich-meta">Pipeline</span>
                      <Link
                        className="admin-rich-action"
                        href={`/admin/submissions/${submission.id}`}
                      >
                        Abrir <ArrowRight size={13} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <AdminEmptyState>Ainda não existem submissões.</AdminEmptyState>
          )}
        </AdminPanel>

        <AdminPanel title="Próximas reuniões" subtitle="Agenda comercial.">
          {overview.upcomingMeetings.length > 0 ? (
            <div className="admin-rich-list">
              {overview.upcomingMeetings.map((meeting) => (
                <article className="admin-rich-item" key={meeting.id}>
                  <div className="admin-meeting-layout">
                    <div className="admin-meeting-time">
                      {formatMeetingTime(meeting.startsAt, meeting.timezone)}
                    </div>
                    <div>
                      <div className="admin-rich-item-top">
                        <div>
                          <p className="admin-rich-title">Discovery Call</p>
                          <p className="admin-rich-meta">{meeting.attendeeCompany}</p>
                        </div>
                        <MeetingStatusBadge status={meeting.status} />
                      </div>
                      <div className="admin-rich-item-bottom" style={{ marginTop: 10 }}>
                        <span className="admin-rich-meta">
                          <Clock size={12} />{' '}
                          {formatDurationMinutes(meeting.startsAt, meeting.endsAt)} ·{' '}
                          {formatMeetingDate(meeting.startsAt, meeting.timezone)}
                        </span>
                        {meeting.googleEventHtmlLink ? (
                          <a className="admin-rich-action" href={meeting.googleEventHtmlLink}>
                            Calendar <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="admin-rich-meta">
                            {formatTimeRangePt(
                              meeting.startsAt,
                              meeting.endsAt,
                              meeting.timezone,
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState>Sem reuniões futuras registadas.</AdminEmptyState>
          )}
        </AdminPanel>
      </section>
      <section className="admin-grid-2">
        <AdminPanel title="Notificações recentes" subtitle="Sinais internos do sistema.">
          {overview.latestNotifications.length > 0 ? (
            <div className="admin-row-list">
              {overview.latestNotifications.map((notification) => (
                <AdminRow
                  key={notification.id}
                  title={notification.title}
                  meta={formatRelativeAdminDate(notification.createdAt)}
                >
                  {notification.message}
                </AdminRow>
              ))}
            </div>
          ) : (
            <AdminEmptyState>Sem notificações recentes.</AdminEmptyState>
          )}
        </AdminPanel>

        <AdminPanel
          title="Estado do funil"
          subtitle="Resumo para priorização."
          action={
            overview.metrics.failedEmails > 0 || overview.metrics.failedMeetings > 0 ? (
              <span className="admin-pill">
                <AlertTriangle size={14} />
                Rever falhas
              </span>
            ) : (
              <span className="admin-pill">Operacional</span>
            )
          }
        >
          <div className="admin-row-list">
            {funnelItems.map(([label, value]) => (
              <AdminRow key={label} title={label} meta={`${value} registos`} />
            ))}
          </div>
        </AdminPanel>
      </section>
    </div>
  );
}
