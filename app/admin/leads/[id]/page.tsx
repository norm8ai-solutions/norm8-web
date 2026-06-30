/**
 * ------------------------------------------------------------------
 * File: app/admin/leads/[id]/page.tsx
 * Description: Lead detail page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Show lead profile, related submissions, meetings, emails, activities, and notifications.
 * - Allow status and priority updates.
 * - Allow internal notes through LeadActivity records.
 * ------------------------------------------------------------------
 */

import { notFound } from 'next/navigation';
import {
  LeadPriorityBadge,
  LeadStatusBadge,
  MeetingStatusBadge,
  NotificationStatusBadge,
  SubmissionTypeBadge,
} from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminField,
  AdminPanel,
  AdminRow,
} from '@/components/admin/AdminPrimitives';
import {
  addLeadNote,
  updateLeadPriority,
  updateLeadStatus,
} from '@/lib/admin/actions';
import {
  formatDatePt,
  formatMeetingDate,
  formatTimeRangePt,
} from '@/lib/admin/formatters';
import { getLeadById } from '@/lib/admin/queries';

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

const leadStatuses = ['NEW', 'QUALIFIED', 'CONTACTED', 'CONVERTED', 'LOST'] as const;
const leadPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

/**
 * Renders lead detail and lightweight admin management controls.
 *
 * @param props Route params with lead id.
 * @returns Lead detail page.
 */
export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title={lead.name ?? 'Lead sem nome'}
        subtitle={`${lead.company} · ${lead.email}`}
        action={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <LeadStatusBadge status={lead.status} />
            <LeadPriorityBadge priority={lead.priority} />
          </div>
        }
      >
        <div className="admin-filters">
          <form action={updateLeadStatus} className="admin-filters">
            <input name="leadId" type="hidden" value={lead.id} />
            <select className="admin-select" defaultValue={lead.status} name="status">
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button className="admin-button" type="submit">
              Atualizar estado
            </button>
          </form>

          <form action={updateLeadPriority} className="admin-filters">
            <input name="leadId" type="hidden" value={lead.id} />
            <select
              className="admin-select"
              defaultValue={lead.priority}
              name="priority"
            >
              {leadPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            <button className="admin-button admin-button-muted" type="submit">
              Atualizar prioridade
            </button>
          </form>
        </div>
      </AdminPanel>

      <section className="admin-grid-main-aside">
        <div className="admin-page-grid">
          <AdminPanel title="Nota interna" subtitle="Regista contexto comercial para a equipa.">
            <form action={addLeadNote} style={{ display: 'grid', gap: 12 }}>
              <input name="leadId" type="hidden" value={lead.id} />
              <textarea
                className="admin-textarea"
                name="message"
                placeholder="Adicionar nota..."
              />
              <button className="admin-button" style={{ width: 180 }} type="submit">
                Guardar nota
              </button>
            </form>
          </AdminPanel>

          <AdminPanel title="Submissões" subtitle="Pedidos associados ao lead.">
            {lead.submissions.length > 0 ? (
              <div className="admin-row-list">
                {lead.submissions.map((submission) => (
                  <AdminRow
                    key={submission.id}
                    title={<SubmissionTypeBadge type={submission.type} />}
                    meta={formatDatePt(submission.createdAt)}
                  />
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem submissões associadas.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Timeline de atividades" subtitle="Histórico operacional do lead.">
            {lead.activities.length > 0 ? (
              <div className="admin-timeline">
                {lead.activities.map((activity) => (
                  <div className="admin-timeline-item" key={activity.id}>
                    <p className="admin-row-title">{activity.type}</p>
                    <p className="admin-row-text">{activity.message}</p>
                    <p className="admin-row-meta">{formatDatePt(activity.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem atividades registadas.</AdminEmptyState>
            )}
          </AdminPanel>
        </div>

        <aside className="admin-page-grid">
          <AdminPanel title="Dados do lead">
            <div className="admin-field-grid">
              <AdminField label="Nome" value={lead.name} />
              <AdminField label="Empresa" value={lead.company} />
              <AdminField label="Email" value={lead.email} />
              <AdminField label="Telefone" value={lead.phone} />
              <AdminField label="Website" value={lead.website} />
              <AdminField label="Origem" value={lead.source} />
              <AdminField label="Criado em" value={formatDatePt(lead.createdAt)} />
              <AdminField label="Atualizado" value={formatDatePt(lead.updatedAt)} />
            </div>
          </AdminPanel>

          <AdminPanel title="Reuniões">
            {lead.meetingBookings.length > 0 ? (
              <div className="admin-row-list">
                {lead.meetingBookings.map((meeting) => (
                  <AdminRow
                    key={meeting.id}
                    title={formatMeetingDate(meeting.startsAt, meeting.timezone)}
                    meta={formatTimeRangePt(
                      meeting.startsAt,
                      meeting.endsAt,
                      meeting.timezone,
                    )}
                  >
                    <MeetingStatusBadge status={meeting.status} />
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem reuniões registadas.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Emails">
            {lead.emailLogs.length > 0 ? (
              <div className="admin-row-list">
                {lead.emailLogs.map((email) => (
                  <AdminRow
                    key={email.id}
                    title={email.subject}
                    meta={`${email.status} · ${formatDatePt(email.createdAt)}`}
                  />
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem emails registados.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Notificações">
            {lead.notifications.length > 0 ? (
              <div className="admin-row-list">
                {lead.notifications.map((notification) => (
                  <AdminRow
                    key={notification.id}
                    title={
                      <>
                        {notification.title}{' '}
                        <NotificationStatusBadge status={notification.status} />
                      </>
                    }
                    meta={formatDatePt(notification.createdAt)}
                  />
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem notificações associadas.</AdminEmptyState>
            )}
          </AdminPanel>
        </aside>
      </section>
    </div>
  );
}
