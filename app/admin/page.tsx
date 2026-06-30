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
  LeadPriorityBadge,
  MeetingStatusBadge,
  SubmissionTypeBadge,
} from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminPanel,
  AdminRow,
  AdminStatCard,
} from '@/components/admin/AdminPrimitives';
import { getAdminOverview } from '@/lib/admin/queries';
import {
  formatDatePt,
  formatMeetingDate,
  formatTimeRangePt,
} from '@/lib/admin/formatters';

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
      trend: '+0%',
    },
    {
      icon: <Target size={16} />,
      label: 'Novos',
      value: overview.metrics.newLeads,
      context: 'Por qualificar',
      trend: '+0%',
    },
    {
      icon: <ClipboardCheck size={16} />,
      label: 'Submissões',
      value: overview.metrics.totalSubmissions,
      context: 'Pedidos recebidos',
      trend: '+0%',
    },
    {
      icon: <ClipboardCheck size={16} />,
      label: 'Auditorias',
      value: overview.metrics.auditRequests,
      context: 'Auditoria Inteligente',
      trend: '+0%',
    },
    {
      icon: <Bot size={16} />,
      label: 'Automações',
      value: overview.metrics.automationRequests,
      context: 'Pedidos custom',
      trend: '+0%',
    },
    {
      icon: <CalendarCheck size={16} />,
      label: 'Confirmadas',
      value: overview.metrics.confirmedMeetings,
      context: 'Reuniões',
      trend: '+0%',
    },
    {
      icon: <CalendarX size={16} />,
      label: 'Falhadas',
      value: overview.metrics.failedMeetings,
      context: 'Reuniões',
      trend: overview.metrics.failedMeetings > 0 ? 'Rever' : '0',
    },
    {
      icon: <MailCheck size={16} />,
      label: 'Enviados',
      value: overview.metrics.sentEmails,
      context: 'Emails',
      trend: '+0%',
    },
    {
      icon: <MailX size={16} />,
      label: 'Falhados',
      value: overview.metrics.failedEmails,
      context: 'Emails',
      trend: overview.metrics.failedEmails > 0 ? 'Rever' : '0',
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

      <section className="admin-grid-2">
        <AdminPanel title="Últimas submissões" subtitle="Atividade comercial recente.">
          {overview.latestSubmissions.length > 0 ? (
            <div className="admin-rich-list">
              {overview.latestSubmissions.map((submission) => (
                <article className="admin-rich-item" key={submission.id}>
                  <div className="admin-rich-item-top">
                    <div style={{ alignItems: 'center', display: 'flex', gap: 9 }}>
                      <span className="admin-rich-dot" />
                      <SubmissionTypeBadge type={submission.type} />
                    </div>
                    <LeadPriorityBadge priority={submission.lead.priority} />
                  </div>
                  <div>
                    <p className="admin-rich-title">{submission.lead.company}</p>
                    <p className="admin-rich-meta">
                      {submission.lead.name ?? 'Sem nome'} ·{' '}
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
              ))}
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
