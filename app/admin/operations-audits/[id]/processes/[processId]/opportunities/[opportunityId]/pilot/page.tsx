import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { PilotProposalCreate } from '@/components/admin/operations-audits/PilotProposalCreate';
import { PilotProposalEditor } from '@/components/admin/operations-audits/PilotProposalEditor';
import { PilotLifecycleActions } from '@/components/admin/operations-audits/PilotLifecycleActions';
import { PilotOutcomeTracker } from '@/components/admin/operations-audits/PilotOutcomeTracker';
import { PilotEconomics } from '@/components/admin/operations-audits/PilotEconomics';
import { requireAdmin } from '@/lib/admin/auth';
import { getAutomationOpportunityById, getPilotEconomics, getPilotOutcome, getPilotProposalByOpportunity } from '@/lib/operations-audits/service';

export default async function PilotProposalPage({ params }: { params: Promise<{ id: string; processId: string; opportunityId: string }> }) {
  await requireAdmin();
  const { id: auditId, processId, opportunityId } = await params;
  const [pilot, opportunity] = await Promise.all([getPilotProposalByOpportunity(auditId, processId, opportunityId), getAutomationOpportunityById(auditId, processId, opportunityId)]);
  if (!opportunity) notFound();
  const rawOutcome = pilot && pilot.status === 'CONVERTED_TO_PROJECT' ? await getPilotOutcome({ auditId, processId, opportunityId, pilotId: pilot.id }) : null;
  const economics = rawOutcome?.status === 'COMPLETED' && pilot ? await getPilotEconomics({ auditId, processId, opportunityId, pilotId: pilot.id, outcomeId: rawOutcome.id }) : null;
  const outcome = rawOutcome ? { ...rawOutcome, metrics: rawOutcome.metrics.map(metric => ({ ...metric, baselineValue: metric.baselineValue === null ? null : Number(metric.baselineValue), targetValue: metric.targetValue === null ? null : Number(metric.targetValue), actualValue: metric.actualValue === null ? null : Number(metric.actualValue) })) } as any : null;
  return <div className="admin-page-grid">
    <AdminPanel title={pilot?.title ?? 'Create Pilot Proposal'} subtitle={`${opportunity.process.name} · ${opportunity.title ?? 'Opportunity'}`} action={<div className="admin-filters"><AdminBadge tone="blue">{pilot?.status ?? 'DRAFT'}</AdminBadge>{pilot ? <Link className="admin-button admin-button-muted" href={`/admin/operations-audits/${auditId}/processes/${processId}/opportunities/${opportunityId}/pilot/report`}>View Pilot Report</Link> : null}<Link className="admin-button admin-button-muted" href={`/admin/operations-audits/${auditId}/processes/${processId}/opportunities/${opportunityId}`}><ArrowLeft size={14}/>Back to opportunity</Link></div>}><p className="admin-row-text">Source Opportunity: {opportunity.title ?? 'Untitled'} · Decision: {opportunity.decision}</p></AdminPanel>
    <AdminPanel title="Pilot Proposal" subtitle="A bounded experiment draft; it does not create a Project or execute the pilot.">{pilot ? <PilotProposalEditor auditId={auditId} processId={processId} opportunityId={opportunityId} pilot={pilot}/> : <PilotProposalCreate auditId={auditId} processId={processId} opportunityId={opportunityId} title={opportunity.title ?? 'Opportunity'}/>}</AdminPanel>
    {pilot ? <AdminPanel title="Lifecycle" subtitle="Each transition is explicit and validated server-side."><PilotLifecycleActions auditId={auditId} processId={processId} opportunityId={opportunityId} pilotId={pilot.id} status={pilot.status} projectId={pilot.projectId}/></AdminPanel> : null}
    {pilot?.status === 'CONVERTED_TO_PROJECT' ? <><AdminPanel title="Pilot Outcome" subtitle="Manual, evidence-aware before/after tracking; no automatic project metrics."><PilotOutcomeTracker auditId={auditId} processId={processId} opportunityId={opportunityId} pilotId={pilot.id} outcome={outcome}/></AdminPanel>{outcome?.status === 'COMPLETED' ? <AdminPanel title="Outcome Economics / ROI" subtitle="Explicit assumptions and derived results. Unknown values remain incomplete, not zero."><PilotEconomics auditId={auditId} processId={processId} opportunityId={opportunityId} pilotId={pilot.id} outcomeId={outcome.id} economics={economics as any} metrics={outcome.metrics} pilotPriceCents={pilot.priceCents} pilotCurrency={pilot.currency}/></AdminPanel> : null}</> : null}
  </div>;
}
