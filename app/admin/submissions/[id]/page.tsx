/**
 * ------------------------------------------------------------------
 * File: app/admin/submissions/[id]/page.tsx
 * Description: Submission detail page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Show formatted payload fields before raw JSON.
 * - Show lead, meeting, and email context.
 * - Keep detailed submission inspection readable for operators.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  SubmissionStatusBadge,
  SubmissionTypeBadge,
} from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminField,
  AdminPanel,
} from '@/components/admin/AdminPrimitives';
import {
  formatDatePt,
  formatPayloadRows,
} from '@/lib/admin/formatters';
import { getSubmissionById } from '@/lib/admin/queries';

type SubmissionDetailPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Renders submission detail.
 *
 * @param props Route params with submission id.
 * @returns Submission detail page.
 */
export default async function SubmissionDetailPage({
  params,
}: SubmissionDetailPageProps) {
  const { id } = await params;
  const submission = await getSubmissionById(id);

  if (!submission) {
    notFound();
  }

  const payloadRows = formatPayloadRows(submission.payload);

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title="Detalhe da submissão"
        subtitle={`${submission.lead.company} · ${formatDatePt(submission.createdAt)}`}
        action={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <SubmissionTypeBadge type={submission.type} />
            <SubmissionStatusBadge status={submission.status} />
          </div>
        }
      >
        <div className="admin-field-grid">
          <AdminField
            label="Lead"
            value={
              <Link className="admin-link" href={`/admin/leads/${submission.lead.id}`}>
                {submission.lead.name ?? submission.lead.company}
              </Link>
            }
          />
          <AdminField label="Empresa" value={submission.lead.company} />
          <AdminField label="Email" value={submission.lead.email} />
          <AdminField label="Criado em" value={formatDatePt(submission.createdAt)} />
        </div>
      </AdminPanel>

      <section className="admin-grid-main-aside">
        <AdminPanel title="Dados formatados" subtitle="Campos principais enviados no formulário.">
          {payloadRows.length > 0 ? (
            <div className="admin-field-grid">
              {payloadRows.map((row) => (
                <AdminField key={row.label} label={row.label} value={row.value} />
              ))}
            </div>
          ) : (
            <AdminEmptyState>Sem dados formatáveis no payload.</AdminEmptyState>
          )}
        </AdminPanel>

        <AdminPanel title="JSON bruto" subtitle="Payload original para diagnóstico técnico.">
          <pre
            style={{
              color: '#c7d2ea',
              fontSize: 12,
              lineHeight: 1.6,
              margin: 0,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {JSON.stringify(submission.payload, null, 2)}
          </pre>
        </AdminPanel>
      </section>
    </div>
  );
}
