import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { getPilotReport } from '@/lib/operations-audits/reporting';
import { PilotReportView } from '@/components/admin/operations-audits/ReportView';
import { ReportDeliveryPanel } from '@/components/admin/operations-audits/ReportDeliveryPanel';
import { listReportDeliveries } from '@/lib/operations-audits/report-delivery';

export default async function PilotReportPage({ params }: { params: Promise<{ id: string; processId: string; opportunityId: string; pilotId?: string }> }) {
  await requireAdmin();
  const { id, processId, opportunityId } = await params;
  const report = await getPilotReport({ auditId: id, processId, opportunityId });
  if (!report) notFound();
  const history = await listReportDeliveries({ auditId: id, pilotProposalId: report.pilot.id });
  return <><PilotReportView report={report} /><ReportDeliveryPanel auditId={id} pilot={{ processId, opportunityId }} pilotId={report.pilot.id} defaultSubject={`Norm8 Pilot Report — ${report.pilot.title}`} defaultMessage={`Please find attached the pilot report for ${report.pilot.title}.`} history={history}/></>;
}
