/**
 * ------------------------------------------------------------------
 * File: app/admin/submissions/page.tsx
 * Description: Submissions list page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Display all lead submissions with lead context.
 * - Format submission types and summaries in Portuguese.
 * - Link to submission detail pages.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import {
  SubmissionStatusBadge,
  SubmissionTypeBadge,
} from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminPanel,
  AdminTable,
} from '@/components/admin/AdminPrimitives';
import {
  formatDatePt,
  formatSubmissionSummary,
} from '@/lib/admin/formatters';
import { getSubmissions } from '@/lib/admin/queries';

/**
 * Renders the submissions table.
 *
 * @returns Submissions page.
 */
export default async function AdminSubmissionsPage() {
  const submissions = await getSubmissions();

  return (
    <AdminPanel title="Submissões" subtitle={`${submissions.length} pedidos registados`}>
      {submissions.length > 0 ? (
        <AdminTable
          headers={['Tipo', 'Lead', 'Empresa', 'Email', 'Estado', 'Criado em', 'Resumo']}
        >
          {submissions.map((submission) => (
            <tr key={submission.id}>
              <td>
                <Link className="admin-link" href={`/admin/submissions/${submission.id}`}>
                  <SubmissionTypeBadge type={submission.type} />
                </Link>
              </td>
              <td>{submission.lead.name ?? 'Sem nome'}</td>
              <td>{submission.lead.company}</td>
              <td>{submission.lead.email}</td>
              <td>
                <SubmissionStatusBadge status={submission.status} />
              </td>
              <td>{formatDatePt(submission.createdAt)}</td>
              <td>{formatSubmissionSummary(submission.payload)}</td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <AdminEmptyState>Ainda não existem submissões.</AdminEmptyState>
      )}
    </AdminPanel>
  );
}
