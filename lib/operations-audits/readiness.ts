export type ReadinessCheckStatus = 'PASS' | 'INFO' | 'WARNING' | 'BLOCKING';
export type ReadinessCheck = { id: string; category: string; name: string; status: ReadinessCheckStatus; reason: string; entityLabel?: string; href?: string };
export type AuditReadiness = { status: 'IN_PROGRESS' | 'REVIEW_READY' | 'HAS_BLOCKING_ISSUES'; checks: ReadinessCheck[]; warnings: ReadinessCheck[]; blockingIssues: ReadinessCheck[]; completedChecks: number; summary: { processes: number; opportunities: number; undecided: number; staleScores: number; pilots: number; completedOutcomes: number } };

const check = (checks: ReadinessCheck[], item: ReadinessCheck) => { checks.push(item); return item; };
const hrefFor = (auditId: string, processId?: string, opportunityId?: string) => processId && opportunityId ? `/admin/operations-audits/${auditId}/processes/${processId}/opportunities/${opportunityId}` : processId ? `/admin/operations-audits/${auditId}/processes/${processId}` : `/admin/operations-audits/${auditId}`;

export function getAuditReadiness(report: any): AuditReadiness {
  const checks: ReadinessCheck[] = []; const auditId = report.audit.id; const processes = report.processes ?? []; const opportunities = report.opportunities ?? [];
  check(checks, { id: 'audit-process-exists', category: 'Audit Structure', name: 'At least one process exists', status: processes.length ? 'PASS' : 'INFO', reason: processes.length ? `${processes.length} process(es) captured.` : 'Quick Capture can start with a process name; enrich the audit before review.' });
  for (const process of processes) {
    const meaningful = Boolean(process.name && (process.trigger || process.endState || process.taskCount));
    check(checks, { id: `process-map-${process.id}`, category: 'Current-State Mapping', name: 'Process has meaningful mapping', status: meaningful ? 'PASS' : 'WARNING', reason: meaningful ? 'Name plus trigger, end state, or tasks are present.' : `Process "${process.name}" needs trigger, end state, or tasks.`, entityLabel: process.name, href: hrefFor(auditId, process.id) });
    check(checks, { id: `process-baseline-${process.id}`, category: 'Evidence', name: 'Baseline coverage', status: process.baselineCount ?? process.baselines?.length ? 'PASS' : 'WARNING', reason: process.baselineCount ?? process.baselines?.length ? 'Baseline metric(s) captured.' : `Process "${process.name}" has no baseline metrics.`, entityLabel: process.name, href: hrefFor(auditId, process.id) });
  }
  for (const opportunity of opportunities) {
    const base = { entityLabel: opportunity.title, href: hrefFor(auditId, opportunity.processId, opportunity.id) };
    if (opportunity.scoreState === 'STALE') check(checks, { ...base, id: `opportunity-stale-${opportunity.id}`, category: 'Opportunities', name: 'Score snapshot is current', status: 'WARNING', reason: 'The score snapshot is stale; human decisions remain allowed.' });
    if (opportunity.score === null) check(checks, { ...base, id: `opportunity-score-${opportunity.id}`, category: 'Opportunities', name: 'Opportunity evaluated and scored', status: 'INFO', reason: 'Opportunity has no usable score yet.' }); else if (!opportunity.scoringModelId) check(checks, { ...base, id: `opportunity-model-${opportunity.id}`, category: 'Opportunities', name: 'Scored opportunity has scoring model', status: 'WARNING', reason: 'Score exists but scoring model reference is missing.' });
    if (opportunity.decision === 'UNDECIDED') check(checks, { ...base, id: `opportunity-undecided-${opportunity.id}`, category: 'Decision', name: 'Human decision recorded', status: 'INFO', reason: 'Opportunity remains undecided.' });
    else {
      if (!opportunity.decisionRationale?.trim()) check(checks, { ...base, id: `decision-rationale-${opportunity.id}`, category: 'Decision', name: 'Final decision has rationale', status: 'BLOCKING', reason: 'A finalized decision is missing its rationale.' });
      if (!opportunity.decidedAt) check(checks, { ...base, id: `decision-date-${opportunity.id}`, category: 'Decision', name: 'Final decision has timestamp', status: 'BLOCKING', reason: 'A finalized decision is missing decidedAt.' });
    }
    if (opportunity.decision === 'UNDECIDED' && opportunity.decidedAt) check(checks, { ...base, id: `decision-open-date-${opportunity.id}`, category: 'Decision', name: 'Undecided opportunity has no decision timestamp', status: 'WARNING', reason: 'UNDECIDED should have decidedAt = null.' });
    if (opportunity.decision === 'PROCEED_TO_PILOT' && !opportunity.pilot) check(checks, { ...base, id: `pilot-required-${opportunity.id}`, category: 'Pilot', name: 'Proceed decision has pilot proposal', status: 'WARNING', reason: 'Proceed to Pilot was recorded but no Pilot Proposal exists.' });
    if (opportunity.pilot) {
      const pilot = opportunity.pilot;
      if (pilot.status === 'CONVERTED_TO_PROJECT' && !pilot.project) check(checks, { ...base, id: `pilot-project-${pilot.id}`, category: 'Pilot', name: 'Converted pilot has project', status: 'BLOCKING', reason: 'Pilot is CONVERTED_TO_PROJECT but project relation is missing.' });
      if (pilot.project && pilot.status !== 'CONVERTED_TO_PROJECT') check(checks, { ...base, id: `pilot-project-state-${pilot.id}`, category: 'Pilot', name: 'Project conversion state matches pilot', status: 'BLOCKING', reason: 'Pilot has a project but is not CONVERTED_TO_PROJECT.' });
      if (pilot.status === 'PROPOSED' && !pilot.proposedAt) check(checks, { ...base, id: `pilot-proposed-at-${pilot.id}`, category: 'Pilot', name: 'Proposed pilot has timestamp', status: 'WARNING', reason: 'PROPOSED pilot is missing proposedAt.' });
      if (pilot.status === 'ACCEPTED' && !pilot.acceptedAt) check(checks, { ...base, id: `pilot-accepted-at-${pilot.id}`, category: 'Pilot', name: 'Accepted pilot has timestamp', status: 'WARNING', reason: 'ACCEPTED pilot is missing acceptedAt.' });
      if (pilot.status === 'REJECTED' && !pilot.rejectionReason?.trim()) check(checks, { ...base, id: `pilot-rejection-${pilot.id}`, category: 'Pilot', name: 'Rejected pilot has reason', status: 'WARNING', reason: 'REJECTED pilot has no rejection reason.' });
      if (pilot.status !== 'CONVERTED_TO_PROJECT' && pilot.outcome) check(checks, { ...base, id: `outcome-pilot-${pilot.id}`, category: 'Outcome', name: 'Outcome belongs to converted pilot', status: 'BLOCKING', reason: 'Outcome exists before the Pilot is converted to a Project.' });
      if (pilot.outcome?.status === 'COMPLETED' && !pilot.outcome.completedAt) check(checks, { ...base, id: `outcome-completed-at-${pilot.id}`, category: 'Outcome', name: 'Completed outcome has timestamp', status: 'BLOCKING', reason: 'COMPLETED outcome is missing completedAt.' });
      if (pilot.outcome?.status === 'COMPLETED' && pilot.outcome.successAssessment === 'NOT_EVALUATED') check(checks, { ...base, id: `outcome-assessment-${pilot.id}`, category: 'Outcome', name: 'Completed outcome has assessment', status: 'BLOCKING', reason: 'COMPLETED outcome remains NOT_EVALUATED.' });
      if (pilot.outcome?.economics) {
        if (pilot.outcome.status !== 'COMPLETED') check(checks, { ...base, id: `economics-outcome-${pilot.id}`, category: 'Economics', name: 'Economics belongs to completed outcome', status: 'BLOCKING', reason: 'Economics exists while the outcome is not COMPLETED.' });
        if (!pilot.outcome.economics.inputs.currency) check(checks, { ...base, id: `economics-currency-${pilot.id}`, category: 'Economics', name: 'Economics has currency', status: 'BLOCKING', reason: 'Economics currency is missing.' });
      }
    }
  }
  check(checks, { id: 'reporting-deterministic', category: 'Reporting', name: 'Reporting projection available', status: 'PASS', reason: 'Audit and Pilot reports derive from the current audit entities.' });
  const blockingIssues = checks.filter(item => item.status === 'BLOCKING'); const warnings = checks.filter(item => item.status === 'WARNING');
  const summary = { processes: processes.length, opportunities: opportunities.length, undecided: opportunities.filter((o: any) => o.decision === 'UNDECIDED').length, staleScores: opportunities.filter((o: any) => o.scoreState === 'STALE').length, pilots: opportunities.filter((o: any) => o.pilot).length, completedOutcomes: opportunities.filter((o: any) => o.pilot?.outcome?.status === 'COMPLETED').length };
  return { status: blockingIssues.length ? 'HAS_BLOCKING_ISSUES' : processes.length && opportunities.length ? 'REVIEW_READY' : 'IN_PROGRESS', checks, warnings, blockingIssues, completedChecks: checks.filter(item => item.status === 'PASS').length, summary };
}
