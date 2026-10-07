import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { AuditReadinessPanel } from '@/components/admin/operations-audits/AuditReadinessPanel';
import { requireAdmin } from '@/lib/admin/auth';
import { getAuditReport } from '@/lib/operations-audits/reporting';
import { getAuditReadiness } from '@/lib/operations-audits/readiness';

export default async function AuditReadinessPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params; const report = await getAuditReport(id); if (!report) notFound();
  return <div className="admin-page-grid"><AdminPanel title="Audit Readiness" subtitle="Deterministic structural and lifecycle checks for the current Audit."><AuditReadinessPanel readiness={getAuditReadiness(report)} auditId={id} detail /></AdminPanel><Link className="admin-link" href={`/admin/operations-audits/${id}`}>Back to Audit Workspace</Link></div>;
}
