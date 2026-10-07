import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { getAuditReport } from '@/lib/operations-audits/reporting';
import { AuditReportView } from '@/components/admin/operations-audits/ReportView';
import { ReportDeliveryPanel } from '@/components/admin/operations-audits/ReportDeliveryPanel';
import { listReportDeliveries } from '@/lib/operations-audits/report-delivery';

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const report = await getAuditReport(id);
  if (!report) notFound();
  const history = await listReportDeliveries({ auditId: id });
  return <><AuditReportView report={report} /><ReportDeliveryPanel auditId={id} defaultSubject={`Norm8 Audit Report — ${report.audit.name}`} defaultMessage={`Please find attached the current Norm8 audit report for ${report.audit.name}.`} history={history}/></>;
}
