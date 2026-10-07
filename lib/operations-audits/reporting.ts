import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { calculatePilotEconomics, formatMoneyCents } from '@/lib/operations-audits/pilot-economics';
import { classifyOpportunityDecision } from '@/lib/operations-audits/matrix-framework';
import { isScoreSnapshotStale, readScoreSnapshotDimensions, readScoreSnapshotSummary } from '@/lib/operations-audits/score-snapshot';
import { rankOpportunityPortfolio } from '@/lib/operations-audits/portfolio-ranking';

const auditInclude = {
  lead: { select: { id: true, company: true, name: true, email: true } },
  owner: { select: { name: true } },
  stakeholders: { orderBy: { name: 'asc' } }, systems: { orderBy: { name: 'asc' } }, dataSources: { orderBy: { name: 'asc' } },
  processes: { include: {
    ownerStakeholder: true, tasks: { include: { systems: true } }, systems: true, dataSources: true,
    bottlenecks: { include: { task: true } }, baselines: true,
    opportunities: { include: {
      baselineLinks: { include: { baseline: true } },
      bottleneckLinks: { include: { bottleneck: { include: { task: true } } } },
      pilot: { include: {
        project: { select: { id: true, name: true, status: true } },
        outcome: { include: { metrics: { include: { baseline: true } }, economics: { include: { timeSavingsMetric: true } } } },
      } },
    } },
  } },
} as const;

function date(value: Date | null | undefined) { return value?.toISOString() ?? null; }
function num(value: unknown): number | null { return value === null || value === undefined ? null : Number(value); }
function summaryFor(opportunity: any) {
  const snapshot = readScoreSnapshotSummary(opportunity.scoreSnapshot); const scored = Boolean(snapshot && opportunity.scoredAt); const stale = scored && isScoreSnapshotStale(opportunity.assessment, opportunity.scoreSnapshot); const dimensions = scored ? readScoreSnapshotDimensions(opportunity.scoreSnapshot) : null;
  const matrix = classifyOpportunityDecision({ businessValueScore: dimensions?.businessValue?.score ?? null, feasibilityScore: dimensions?.feasibility?.score ?? null, confidence: scored ? snapshot?.confidence ?? null : null, coverage: scored ? snapshot?.coverage ?? null : null, scoreState: !scored ? 'UNSCORED' : snapshot?.score === null ? 'SCORED_NULL' : stale ? 'STALE' : 'CURRENT' });
  return { score: scored ? snapshot?.score ?? null : null, confidence: scored ? snapshot?.confidence ?? null : null, coverage: scored ? snapshot?.coverage ?? null : null, scored, stale, dimensions, matrix };
}
function metricDto(metric: any) { return { id: metric.id, label: metric.label, before: num(metric.baselineValue), target: num(metric.targetValue), after: num(metric.actualValue), delta: metric.baselineValue === null || metric.actualValue === null ? null : num(metric.actualValue)! - num(metric.baselineValue)!, unit: metric.unit, period: metric.period, evidenceQuality: metric.evidenceQuality, source: metric.source, reference: metric.reference, note: metric.note, baselineLabel: metric.baseline?.label ?? null }; }
function economicsDto(economics: any) {
  if (!economics) return null;
  const metric = economics.timeSavingsMetric; const calc = calculatePilotEconomics({ laborCostPerHourCents: economics.laborCostPerHourCents, timeBaselineHours: num(metric?.baselineValue), timeActualHours: num(metric?.actualValue), directMonthlySavingsCents: economics.directMonthlySavingsCents, otherMonthlySavingsCents: economics.otherMonthlySavingsCents, ongoingMonthlyCostCents: economics.ongoingMonthlyCostCents, investmentCostCents: economics.investmentCostCents, currency: economics.currency });
  return { inputs: { investment: formatMoneyCents(economics.investmentCostCents, economics.currency), laborCostPerHour: formatMoneyCents(economics.laborCostPerHourCents, economics.currency), directMonthlySavings: formatMoneyCents(economics.directMonthlySavingsCents, economics.currency), otherMonthlySavings: formatMoneyCents(economics.otherMonthlySavingsCents, economics.currency), ongoingMonthlyCost: formatMoneyCents(economics.ongoingMonthlyCostCents, economics.currency), currency: economics.currency, laborCostQuality: economics.laborCostQuality, laborCostSource: economics.laborCostSource, laborCostNote: economics.laborCostNote, timeMetric: metric?.label ?? null }, calculated: { laborSavings: formatMoneyCents(calc.laborSavingsCents, economics.currency), grossMonthlySavings: formatMoneyCents(calc.grossMonthlySavingsCents, economics.currency), netMonthlySavings: formatMoneyCents(calc.netMonthlySavingsCents, economics.currency), annualizedNetSavings: formatMoneyCents(calc.annualizedNetSavingsCents, economics.currency), payback: calc.paybackMonths === null ? 'N/A' : `${calc.paybackMonths.toFixed(1)} months`, roi12m: calc.twelveMonthRoiPercent === null ? 'N/A' : `${calc.twelveMonthRoiPercent.toFixed(1)}%`, incomplete: calc.incomplete, unknown: calc.unknown }, notes: economics.notes };
}

export async function getAuditReport(auditId: string) {
  const audit: any = await prisma.operationsAudit.findUnique({ where: { id: auditId }, include: auditInclude as any });
  if (!audit) return null;
  const opportunities = audit.processes.flatMap((process: any) => process.opportunities.map((opportunity: any) => ({ ...opportunity, process })));
  const ranked = rankOpportunityPortfolio(opportunities.map((opportunity: any) => ({ id: opportunity.id, score: summaryFor(opportunity).score })));
  const rankMap = new Map(ranked.map((row: any) => [row.id, row.globalRank]));
  const opportunityDtos = opportunities.map((opportunity: any) => { const analytical = summaryFor(opportunity); const pilot = opportunity.pilot; const outcome = pilot?.outcome; return { id: opportunity.id, title: opportunity.title ?? 'Untitled opportunity', processId: opportunity.processId, processName: opportunity.process?.name ?? '—', problem: opportunity.problem, currentState: opportunity.currentState, proposedOutcome: opportunity.proposedOutcome, status: opportunity.status, scoringModelId: opportunity.scoringModelId, score: analytical.score, confidence: analytical.confidence, coverage: analytical.coverage, strategicFit: opportunity.strategicFit, rank: rankMap.get(opportunity.id) ?? null, matrix: analytical.matrix.label, matrixCode: analytical.matrix.classification, decision: opportunity.decision, decisionRationale: opportunity.decisionRationale, decisionOwner: opportunity.decisionOwner, decidedAt: date(opportunity.decidedAt), nextStep: opportunity.nextStep, scoreState: analytical.stale ? 'STALE' : analytical.scored ? 'CURRENT' : 'UNSCORED', pilot: pilot ? { id: pilot.id, title: pilot.title, status: pilot.status, objective: pilot.objective, scope: pilot.scope, successCriteria: pilot.successCriteria, owner: pilot.owner, duration: pilot.duration, price: formatMoneyCents(pilot.priceCents, pilot.currency ?? 'EUR'), project: pilot.project, proposedAt: date(pilot.proposedAt), acceptedAt: date(pilot.acceptedAt), rejectedAt: date(pilot.rejectedAt), convertedAt: date(pilot.convertedAt), outcome: outcome ? { status: outcome.status, successAssessment: outcome.successAssessment, summary: outcome.summary, keyLearnings: outcome.keyLearnings, issuesEncountered: outcome.issuesEncountered, conclusion: outcome.conclusion, nextStep: outcome.nextStep, completedAt: date(outcome.completedAt), metrics: outcome.metrics.map(metricDto), economics: economicsDto(outcome.economics) } : null } : null }; });
  return { audit: { id: audit.id, name: audit.name, status: audit.status, scope: audit.scope, objectives: audit.objectives, notes: audit.notes, createdAt: date(audit.createdAt), lead: audit.lead, owner: audit.owner }, counts: { processes: audit.processes.length, bottlenecks: audit.processes.reduce((n: number, p: any) => n + p.bottlenecks.length, 0), baselines: audit.processes.reduce((n: number, p: any) => n + p.baselines.length, 0), opportunities: opportunityDtos.length, scoredOpportunities: opportunityDtos.filter((o: any) => o.score !== null).length, proceedToPilot: opportunityDtos.filter((o: any) => o.decision === 'PROCEED_TO_PILOT').length, pilotProposals: opportunityDtos.filter((o: any) => o.pilot).length, acceptedPilots: opportunityDtos.filter((o: any) => o.pilot?.status === 'ACCEPTED' || o.pilot?.status === 'CONVERTED_TO_PROJECT').length, convertedProjects: opportunityDtos.filter((o: any) => o.pilot?.status === 'CONVERTED_TO_PROJECT').length, completedOutcomes: opportunityDtos.filter((o: any) => o.pilot?.outcome?.status === 'COMPLETED').length }, stakeholders: audit.stakeholders, systems: audit.systems, dataSources: audit.dataSources, processes: audit.processes.map((process: any) => ({ id: process.id, name: process.name, department: process.department, owner: process.owner ?? process.ownerStakeholder?.name, participants: process.participants, status: process.status, trigger: process.trigger, endState: process.endState, taskCount: process.tasks.length, systemCount: process.systems.length, dataSourceCount: process.dataSources.length, bottleneckCount: process.bottlenecks.length, opportunityCount: process.opportunities.length, bottlenecks: process.bottlenecks.map((b: any) => ({ id: b.id, description: b.description, category: b.category, task: b.task?.name ?? null, evidenceQuality: b.evidenceQuality, impact: b.timeImpact ?? b.costImpactCents !== null ? b.timeImpact ?? `€${((b.costImpactCents ?? 0) / 100).toFixed(2)}` : null })), baselines: process.baselines.map((b: any) => ({ id: b.id, label: b.label, value: b.numericValue !== null ? String(b.numericValue) : b.textValue, unit: b.unit, period: b.period, evidenceQuality: b.evidenceQuality, source: b.source })) })), opportunities: opportunityDtos };
}

export async function getPilotReport(input: { auditId: string; processId: string; opportunityId: string; pilotId?: string }) {
  const report = await getAuditReport(input.auditId); if (!report) return null;
  const opportunity = report.opportunities.find((item: any) => item.id === input.opportunityId && item.processId === input.processId && item.pilot && (!input.pilotId || item.pilot.id === input.pilotId)); if (!opportunity) return null;
  return { audit: report.audit, opportunity, pilot: opportunity.pilot };
}
