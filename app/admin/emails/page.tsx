/**
 * ------------------------------------------------------------------
 * File: app/admin/emails/page.tsx
 * Description: Email logs page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Display transactional EmailLog records.
 * - Filter by delivery status.
 * - Expose provider message IDs for diagnostics.
 * ------------------------------------------------------------------
 */

import { Filter } from 'lucide-react';
import { Norm8Select } from '@/components/ui/norm8-select';
import { EmailStatusBadge } from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminPanel,
  AdminTable,
} from '@/components/admin/AdminPrimitives';
import type { EmailFilter } from '@/lib/admin/types';
import { formatDatePt } from '@/lib/admin/formatters';
import { getEmailLogs } from '@/lib/admin/queries';

type AdminEmailsPageProps = {
  searchParams?: Promise<{ status?: EmailFilter }>;
};

const emailFilters: Array<{ value: EmailFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'SENT', label: 'Enviados' },
  { value: 'FAILED', label: 'Falhados' },
];

/**
 * Renders the email logs table.
 *
 * @param props Search params with optional status filter.
 * @returns Emails page.
 */
export default async function AdminEmailsPage({ searchParams }: AdminEmailsPageProps) {
  const params = await searchParams;
  const status = params?.status ?? 'ALL';
  const emails = await getEmailLogs(status);

  return (
    <div className="admin-page-grid">
      <AdminPanel title="Emails" subtitle={`${emails.length} logs encontrados`}>
        <form action="/admin/emails" className="admin-filters">
          <Norm8Select
            defaultValue={status}
            name="status"
            options={emailFilters}
          />
          <button className="admin-filter-button" type="submit">
            <Filter size={14} />
            Filtrar
          </button>
        </form>
      </AdminPanel>

      <AdminPanel>
        {emails.length > 0 ? (
          <AdminTable
            headers={['Para', 'Assunto', 'Tipo', 'Estado', 'Provider ID', 'Criado em']}
          >
            {emails.map((email) => (
              <tr key={email.id}>
                <td>{email.to}</td>
                <td>{email.subject}</td>
                <td>{email.type}</td>
                <td>
                  <EmailStatusBadge status={email.status} />
                </td>
                <td>{email.providerMessageId ?? '—'}</td>
                <td>{formatDatePt(email.createdAt)}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState>Sem emails para o filtro selecionado.</AdminEmptyState>
        )}
      </AdminPanel>
    </div>
  );
}
