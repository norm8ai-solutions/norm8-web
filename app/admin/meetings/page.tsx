/**
 * ------------------------------------------------------------------
 * File: app/admin/meetings/page.tsx
 * Description: Meeting bookings page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Display meeting bookings with Portuguese dates and statuses.
 * - Filter by confirmation state and time position.
 * - Link operators to Google Calendar events when available.
 * ------------------------------------------------------------------
 */

import { ExternalLink, Filter } from 'lucide-react';
import { MeetingStatusBadge } from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminPanel,
  AdminTable,
} from '@/components/admin/AdminPrimitives';
import type { MeetingFilter } from '@/lib/admin/types';
import {
  formatMeetingDate,
  formatTimeRangePt,
} from '@/lib/admin/formatters';
import { getMeetings } from '@/lib/admin/queries';

type AdminMeetingsPageProps = {
  searchParams?: Promise<{ filter?: MeetingFilter }>;
};

const meetingFilters: Array<{ value: MeetingFilter; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'FAILED', label: 'Falhadas' },
  { value: 'UPCOMING', label: 'Próximas' },
  { value: 'PAST', label: 'Passadas' },
];

/**
 * Renders the meetings admin table.
 *
 * @param props Search params with optional filter.
 * @returns Meetings page.
 */
export default async function AdminMeetingsPage({
  searchParams,
}: AdminMeetingsPageProps) {
  const params = await searchParams;
  const filter = params?.filter ?? 'ALL';
  const meetings = await getMeetings(filter);

  return (
    <div className="admin-page-grid">
      <AdminPanel title="Reuniões" subtitle={`${meetings.length} marcações encontradas`}>
        <form action="/admin/meetings" className="admin-filters">
          <select className="admin-select" defaultValue={filter} name="filter">
            {meetingFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button className="admin-filter-button" type="submit">
            <Filter size={14} />
            Filtrar
          </button>
        </form>
      </AdminPanel>

      <AdminPanel>
        {meetings.length > 0 ? (
          <AdminTable
            headers={[
              'Nome',
              'Empresa',
              'Email',
              'Data',
              'Hora',
              'Estado',
              'Objetivo',
              'Google Calendar',
            ]}
          >
            {meetings.map((meeting) => (
              <tr key={meeting.id}>
                <td>{meeting.attendeeName}</td>
                <td>{meeting.attendeeCompany}</td>
                <td>{meeting.attendeeEmail}</td>
                <td>{formatMeetingDate(meeting.startsAt, meeting.timezone)}</td>
                <td>
                  {formatTimeRangePt(
                    meeting.startsAt,
                    meeting.endsAt,
                    meeting.timezone,
                  )}
                </td>
                <td>
                  <MeetingStatusBadge status={meeting.status} />
                </td>
                <td>{meeting.meetingGoal ?? '—'}</td>
                <td>
                  {meeting.googleEventHtmlLink ? (
                    <a className="admin-link" href={meeting.googleEventHtmlLink}>
                      <ExternalLink size={13} />
                      Abrir evento
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState>Sem reuniões para o filtro selecionado.</AdminEmptyState>
        )}
      </AdminPanel>
    </div>
  );
}
