/**
 * ------------------------------------------------------------------
 * File: lib/proposals/service.ts
 * Description: Proposal persistence service for Norm8 commercial workflows.
 * Responsibilities:
 * - Create and update proposal drafts associated with leads.
 * - Expose read helpers for future proposal listing and PDF generation.
 * - Build safe Portuguese defaults from lead/submission/action context.
 * ------------------------------------------------------------------
 */

import 'server-only';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma, type AuditAnalysis, type Lead, type LeadAction, type Proposal, type Submission } from '@/app/generated/prisma/client';
import { syncFinanceIncomeForProposal } from '@/lib/admin/finance-commercial-sync';
import { prisma } from '@/lib/db/prisma';
import { renderProposalPdf } from '@/lib/proposals/pdf/generator';
import { buildProposalPdfTemplate } from '@/lib/proposals/pdf/template';
import { normalizePortugueseText } from '@/lib/text/normalize-portuguese';

export type CreateProposalInput = {
 leadId: string;
 submissionId?: string | null;
 leadActionId?: string | null;
 title?: string | null;
 companyName?: string | null;
 contactName?: string | null;
 estimatedValue?: number | string | Prisma.Decimal | null;
 scope?: string | null;
 painPoints?: string | null;
 recommendedSolution?: string | null;
 implementationPlan?: string | null;
 nextSteps?: string | null;
};

export type UpdateProposalInput = Partial<Omit<CreateProposalInput, 'leadId' | 'leadActionId'>> & {
 status?: Proposal['status'];
 pdfUrl?: string | null;
 pdfPath?: string | null;
};

type ProposalLead = Pick<Lead, 'id' | 'company' | 'name'>;
type ProposalSubmission = Pick<Submission, 'id' | 'payload' | 'notes' | 'type'>;
type ProposalAction = Pick<LeadAction, 'id' | 'title' | 'description'>;
type ProposalAuditAnalysis = Pick<
 AuditAnalysis,
 | 'automationOpportunities'
 | 'clientPreviewNextStep'
 | 'clientPreviewRecommendedDirection'
 | 'clientPreviewSummary'
 | 'commercialRationale'
 | 'companySummary'
 | 'contractValueEstimate'
 | 'implementationRoadmap'
 | 'internalSummary'
 | 'nextStep'
 | 'operationalProblems'
 | 'recommendedSolutions'
 | 'salesPlaybook'
 | 'submissionId'
>;

type ProposalDataSource = 'audit' | 'lead';

export type DefaultProposalData = {
 leadId: string;
 submissionId?: string;
 leadActionId?: string;
 title: string;
 companyName: string;
 contactName?: string | null;
 estimatedValue?: string;
 painPoints: string;
 recommendedSolution: string;
 implementationPlan: string;
 nextSteps: string;
 proposalDataSource: ProposalDataSource;
};

export type CreateDraftProposalFromLeadActionResult = {
 proposal: Proposal;
 created: boolean;
};

export type GenerateProposalPdfResult = {
 pdfPath: string;
 pdfUrl: string;
 proposal: Proposal;
};

export async function createProposal(input: CreateProposalInput): Promise<Proposal> {
 const leadId = normalizeRequired(input.leadId, 'leadId');
 const lead = await prisma.lead.findUnique({
 where: { id: leadId },
 select: { id: true, company: true, name: true },
 });

 if (!lead) {
 throw new Error('Lead não encontrada para criar proposta.');
 }

 if (input.leadActionId) {
 const existing = await prisma.proposal.findUnique({
 where: { leadActionId: input.leadActionId },
 });

 if (existing) {
 await syncFinanceIncomeForProposal(existing.id);
 return existing;
 }
 }

 const title = normalizeRequired(input.title ?? `Proposta Norm8 para ${lead.company}`, 'title');
 const companyName = normalizeRequired(input.companyName ?? lead.company, 'companyName');
 const estimatedValue = normalizeDecimal(input.estimatedValue);

 const proposal = await prisma.proposal.create({
 data: {
 lead: { connect: { id: leadId } },
 ...(input.submissionId ? { submission: { connect: { id: input.submissionId } } } : {}),
 ...(input.leadActionId ? { leadAction: { connect: { id: input.leadActionId } } } : {}),
 title,
 companyName,
 contactName: normalizeOptional(input.contactName ?? lead.name),
 estimatedValue,
 scope: normalizeOptional(input.scope),
 painPoints: normalizeOptional(input.painPoints),
 recommendedSolution: normalizeOptional(input.recommendedSolution),
 implementationPlan: normalizeOptional(input.implementationPlan),
 nextSteps: normalizeOptional(input.nextSteps),
 },
 });

 await syncFinanceIncomeForProposal(proposal.id);

 return proposal;
}

export async function getProposalById(id: string): Promise<Proposal | null> {
 return prisma.proposal.findUnique({ where: { id } });
}

export async function getProposalsByLeadId(leadId: string): Promise<Proposal[]> {
 return prisma.proposal.findMany({
 where: { leadId },
 orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
 });
}

export async function getLatestProposalByLeadId(leadId: string): Promise<Proposal | null> {
 return prisma.proposal.findFirst({
 where: { leadId },
 orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
 });
}

export async function getActiveFinalProposalForLead(
 leadId: string,
 baseOfferId?: string | null,
): Promise<Proposal | null> {
 const baseOffer = baseOfferId
 ? await prisma.baseOffer.findFirst({
 where: { id: baseOfferId, leadId },
 select: { submissionId: true },
 })
 : null;

 const proposals = await prisma.proposal.findMany({
 where: {
 leadId,
 status: { in: ['DRAFT', 'GENERATED', 'SENT', 'ACCEPTED'] },
 },
 orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { version: 'desc' }],
 });

 if (proposals.length === 0) {
 return null;
 }

 const preferredSubmissionId = baseOffer?.submissionId ?? null;
 return [...proposals].sort((a, b) => {
 const submissionScoreA = preferredSubmissionId && a.submissionId === preferredSubmissionId ? 1 : 0;
 const submissionScoreB = preferredSubmissionId && b.submissionId === preferredSubmissionId ? 1 : 0;
 if (submissionScoreA !== submissionScoreB) return submissionScoreB - submissionScoreA;

 const pdfScoreA = a.pdfUrl || a.pdfPath ? 1 : 0;
 const pdfScoreB = b.pdfUrl || b.pdfPath ? 1 : 0;
 if (pdfScoreA !== pdfScoreB) return pdfScoreB - pdfScoreA;

 return getProposalTimestamp(b) - getProposalTimestamp(a) || b.version - a.version || b.id.localeCompare(a.id);
 })[0] ?? null;
}

export async function getProposalDetailById(id: string) {
 const proposal = await prisma.proposal.findUnique({
 where: { id },
 include: {
 lead: {
 include: {
 baseOffers: { orderBy: { createdAt: 'desc' } },
 discoverySessions: {
 orderBy: { updatedAt: 'desc' },
 include: { questions: { orderBy: { createdAt: 'asc' } } },
 },
 submissions: { orderBy: { createdAt: 'desc' } },
 },
 },
 submission: true,
 leadAction: true,
 },
 });

 if (!proposal) return null;

 const financeTransaction = await prisma.financeTransaction.findFirst({
 where: { proposalId: proposal.id, source: 'PROPOSAL', type: 'INCOME' },
 orderBy: { updatedAt: 'desc' },
 });

 return { ...proposal, financeTransaction };
}

export async function updateProposal(id: string, input: UpdateProposalInput): Promise<Proposal> {
 const estimatedValue = 'estimatedValue' in input ? normalizeDecimal(input.estimatedValue) : undefined;

 const proposal = await prisma.proposal.update({
 where: { id },
 data: {
 ...(input.submissionId !== undefined
 ? input.submissionId
 ? { submission: { connect: { id: input.submissionId } } }
 : { submission: { disconnect: true } }
 : {}),
 ...(input.title !== undefined ? { title: normalizeRequired(input.title, 'title') } : {}),
 ...(input.companyName !== undefined ? { companyName: normalizeRequired(input.companyName, 'companyName') } : {}),
 ...(input.contactName !== undefined ? { contactName: normalizeOptional(input.contactName) } : {}),
 ...(estimatedValue !== undefined ? { estimatedValue } : {}),
 ...(input.scope !== undefined ? { scope: normalizeOptional(input.scope) } : {}),
 ...(input.painPoints !== undefined ? { painPoints: normalizeOptional(input.painPoints) } : {}),
 ...(input.recommendedSolution !== undefined
 ? { recommendedSolution: normalizeOptional(input.recommendedSolution) }
 : {}),
 ...(input.implementationPlan !== undefined
 ? { implementationPlan: normalizeOptional(input.implementationPlan) }
 : {}),
 ...(input.nextSteps !== undefined ? { nextSteps: normalizeOptional(input.nextSteps) } : {}),
 ...(input.status !== undefined ? { status: input.status } : {}),
 ...(input.pdfUrl !== undefined ? { pdfUrl: normalizeOptional(input.pdfUrl) } : {}),
 ...(input.pdfPath !== undefined ? { pdfPath: normalizeOptional(input.pdfPath) } : {}),
 },
 });

 await syncFinanceIncomeForProposal(proposal.id);

 return proposal;
}

export async function generateProposalPdf({
 leadId,
 proposalId,
}: {
 leadId?: string;
 proposalId: string;
}): Promise<GenerateProposalPdfResult> {
 const proposal = await prisma.proposal.findUnique({
 where: { id: proposalId },
 });

 if (!proposal) {
 throw new Error('Proposta não encontrada.');
 }

 if (leadId && proposal.leadId !== leadId) {
 throw new Error('A proposta não pertence a esta lead.');
 }

 validateProposalReadyForPdf(proposal);

 const generatedAt = new Date();
 const template = buildProposalPdfTemplate({ generatedAt, proposal });
 const pdf = renderProposalPdf(template);
 const fileName = buildProposalPdfFileName(proposal);
 const publicDirectory = path.join(process.cwd(), 'public', 'generated', 'proposals');
 const absolutePath = path.join(publicDirectory, fileName);
 const pdfUrl = `/generated/proposals/${fileName}`;
 const pdfPath = `public/generated/proposals/${fileName}`;

 await mkdir(publicDirectory, { recursive: true });
 await writeFile(absolutePath, pdf);

 const updatedProposal = await prisma.proposal.update({
 where: { id: proposal.id },
 data: {
 pdfPath,
 pdfUrl,
 status: 'GENERATED',
 },
 });

 await syncFinanceIncomeForProposal(updatedProposal.id);

 return {
 pdfPath,
 pdfUrl,
 proposal: updatedProposal,
 };
}

export function buildDefaultProposalDataFromLead({
 action,
 auditAnalysis,
 lead,
 notes,
 submission,
}: {
 action?: ProposalAction | null;
 auditAnalysis?: ProposalAuditAnalysis | null;
 lead: ProposalLead;
 notes?: string | null;
 submission?: ProposalSubmission | null;
}): DefaultProposalData {
 const companyName = normalizeRequired(lead.company || 'Empresa não indicada', 'companyName');
 const submissionContext = extractSubmissionContext(submission);
 const auditDefaults = buildProposalDataFromAuditContext(auditAnalysis);
 const fallbackPainPoints =
 'Dores operacionais ainda não detalhadas. Validar processos manuais, tarefas repetitivas, atrasos, retrabalho e perda de informação antes de finalizar a proposta.';
 const fallbackSolution =
 'Desenhar uma solução faseada com foco em automação de processos, agentes de IA, melhoria da visibilidade operacional e redução de trabalho manual.';
 const fallbackImplementationPlan =
 'Fase 1: diagnóstico e mapeamento dos fluxos prioritários. Fase 2: desenho da automação e integrações necessárias. Fase 3: implementação do primeiro workflow ou agente. Fase 4: testes, validação com a equipa e ajustes. Fase 5: monitorização e expansão para novos processos.';
 const fallbackNextSteps =
 'Validar prioridades com a equipa, confirmar o processo inicial a automatizar e preparar o plano final de implementação.';

 return {
 leadId: lead.id,
 ...(submission?.id ? { submissionId: submission.id } : {}),
 ...(action?.id ? { leadActionId: action.id } : {}),
 title: `Proposta Norm8 para ${companyName}`,
 companyName,
 contactName: normalizeOptional(lead.name),
 painPoints:
      auditDefaults.painPoints ??
      normalizeOptional(notes) ??
      submissionContext ??
      normalizeOptional(action?.description) ??
      fallbackPainPoints,
 recommendedSolution: auditDefaults.recommendedSolution ?? fallbackSolution,
 implementationPlan: auditDefaults.implementationPlan ?? fallbackImplementationPlan,
 nextSteps: auditDefaults.nextSteps ?? fallbackNextSteps,
 proposalDataSource: auditDefaults.hasAuditContext ? 'audit' : 'lead',
 };
}
type AuditProposalFields = {
 hasAuditContext: boolean;
 implementationPlan?: string;
 nextSteps?: string;
 painPoints?: string;
 recommendedSolution?: string;
};

function buildProposalDataFromAuditContext(
 auditAnalysis?: ProposalAuditAnalysis | null,
): AuditProposalFields {
 if (!auditAnalysis) {
 return { hasAuditContext: false };
 }

 const painPointLines = uniqueNonEmpty([
 ...jsonRecordList(auditAnalysis.operationalProblems).flatMap((problem) => [
 formatRecordSentence(problem, ['title', 'description', 'impact']),
 ]),
 ...extractStringListFromRecord(auditAnalysis.salesPlaybook, 'painPoints'),
 auditAnalysis.companySummary,
 auditAnalysis.internalSummary,
 ]).slice(0, 6);

 const solutionLines = uniqueNonEmpty([
 ...jsonRecordList(auditAnalysis.recommendedSolutions).map((solution) =>
 formatRecordSentence(solution, ['title', 'description', 'module']),
 ),
 ...jsonRecordList(auditAnalysis.automationOpportunities).map((opportunity) =>
 formatRecordSentence(opportunity, ['title', 'description', 'estimatedImpact']),
 ),
 auditAnalysis.clientPreviewRecommendedDirection,
 ]).slice(0, 6);

 const roadmapLines = uniqueNonEmpty(
 jsonRecordList(auditAnalysis.implementationRoadmap).map((phase, index) => {
 const phaseNumber = getNumberValue(phase.phase) ?? index + 1;
 const title = getTextValue(phase.title) ?? `Fase ${phaseNumber}`;
 const description = getTextValue(phase.description) ?? getTextValue(phase.objective);
 const deliverables = extractStringListFromValue(phase.deliverables).slice(0, 3).join(', ');
 const duration = getTextValue(phase.estimatedDuration);
 const details = uniqueNonEmpty([description, deliverables ? `Entregáveis: ${deliverables}` : null, duration ? `Duração estimada: ${duration}` : null]).join(' ');

 return details ? `Fase ${phaseNumber}: ${title}. ${details}` : `Fase ${phaseNumber}: ${title}.`;
 }),
 ).slice(0, 5);

 const nextSteps = normalizeOptional(
 auditAnalysis.clientPreviewNextStep ?? auditAnalysis.nextStep,
 );

 return {
 hasAuditContext: Boolean(
 painPointLines.length ||
 solutionLines.length ||
 roadmapLines.length ||
 nextSteps ||
 auditAnalysis.companySummary ||
 auditAnalysis.internalSummary,
 ),
 painPoints: formatParagraphList(painPointLines),
 recommendedSolution: formatParagraphList(solutionLines),
 implementationPlan: formatParagraphList(roadmapLines),
 nextSteps: nextSteps ?? undefined,
 };
}

function extractEstimatedValueFromAudit(value: Prisma.JsonValue | null): string | undefined {
 if (!isJsonRecord(value)) {
 return undefined;
 }

 const minimum = getNumberValue(value.minimum);
 const currency = getTextValue(value.currency);

 if (!minimum || minimum <= 0 || currency !== 'EUR') {
 return undefined;
 }

 return String(Math.round(minimum));
}
function jsonRecordList(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue>[] {
 if (!Array.isArray(value)) {
 return [];
 }

 return value.filter(isJsonRecord);
}

function isJsonRecord(value: Prisma.JsonValue): value is Record<string, Prisma.JsonValue> {
 return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function extractStringListFromRecord(value: Prisma.JsonValue | null, key: string): string[] {
 if (!isJsonRecord(value)) {
 return [];
 }

 return extractStringListFromValue(value[key]);
}

function extractStringListFromValue(value: Prisma.JsonValue | undefined): string[] {
 if (!Array.isArray(value)) {
 return [];
 }

 return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function formatRecordSentence(
 record: Record<string, Prisma.JsonValue>,
 keys: string[],
): string | null {
 const parts = keys
 .map((key) => getTextValue(record[key]))
 .filter((part): part is string => Boolean(part));

 if (parts.length === 0) {
 return null;
 }

 const [title, ...details] = parts;
 return details.length > 0 ? `${title}: ${details.join(' ')}` : title;
}

function getTextValue(value: Prisma.JsonValue | undefined): string | null {
 return typeof value === 'string' ? normalizeOptional(value) : null;
}

function getNumberValue(value: Prisma.JsonValue | undefined): number | null {
 return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatParagraphList(lines: string[]): string | undefined {
 const normalized = uniqueNonEmpty(lines);
 return normalized.length > 0 ? normalized.join('\n') : undefined;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
 const seen = new Set<string>();
 const result: string[] = [];

 for (const value of values) {
 const normalized = normalizeOptional(value);
 if (!normalized) {
 continue;
 }

 const key = normalized.toLowerCase();
 if (seen.has(key)) {
 continue;
 }

 seen.add(key);
 result.push(normalized);
 }

 return result;
}
function validateProposalReadyForPdf(proposal: Proposal): void {
 const missingFields = [
 ['title', proposal.title],
 ['companyName', proposal.companyName],
 ['painPoints', proposal.painPoints],
 ['recommendedSolution', proposal.recommendedSolution],
 ['implementationPlan', proposal.implementationPlan],
 ['nextSteps', proposal.nextSteps],
 ].filter(([, value]) => typeof value !== 'string' || !value.trim());

 if (missingFields.length > 0) {
 throw new Error(
 `A proposta ainda não tem todos os campos obrigatórios para gerar PDF: ${missingFields
 .map(([field]) => field)
 .join(', ')}.`,
 );
 }
}

function buildProposalPdfFileName(proposal: Proposal): string {
 const companySlug = slugify(proposal.companyName) || 'lead';
 const proposalId = proposal.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12);

 return `norm8-proposta-${companySlug}-v${proposal.version}-${proposalId}.pdf`;
}

function slugify(value: string): string {
 return value
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .toLowerCase()
 .replace(/[^a-z0-9]+/g, '-')
 .replace(/^-+|-+$/g, '')
 .slice(0, 48);
}

export async function createDraftProposalFromLeadAction({
 actionId,
 leadId,
 notes,
}: {
 actionId: string;
 leadId: string;
 notes?: string | null;
}): Promise<CreateDraftProposalFromLeadActionResult> {
 const action = await prisma.leadAction.findFirst({
 where: { id: actionId, leadId, type: 'SEND_PROPOSAL' },
 include: {
 proposal: true,
 lead: {
 include: {
 submissions: { orderBy: { createdAt: 'desc' }, take: 1 },
 },
 },
 },
 });

 if (!action) {
 throw new Error('Ação de proposta não encontrada para esta lead.');
 }

 if (action.proposal) {
 await syncFinanceIncomeForProposal(action.proposal.id);
 return { proposal: action.proposal, created: false };
 }

 const submission = action.lead.submissions[0] ?? null;
 const defaults = buildDefaultProposalDataFromLead({
 action,
 lead: action.lead,
 notes,
 submission,
 });
 const proposal = await createProposal(defaults);

 return { proposal, created: true };
}

function getProposalTimestamp(proposal: Pick<Proposal, 'updatedAt' | 'createdAt'>): number {
 const updatedAt = proposal.updatedAt?.getTime() ?? NaN;
 const createdAt = proposal.createdAt?.getTime() ?? NaN;

 return Number.isFinite(updatedAt) ? updatedAt : Number.isFinite(createdAt) ? createdAt : 0;
}
function normalizeRequired(value: string | null | undefined, field: string): string {
  const normalized = normalizePortugueseText(value ?? '').trim();

  if (!normalized) {
    throw new Error(`Campo obrigat?rio em falta para proposta: ${field}.`);
  }

  return normalized;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const normalized = normalizePortugueseText(value ?? '').trim();
  return normalized || null;
}

function normalizeDecimal(value: CreateProposalInput['estimatedValue']): Prisma.Decimal | undefined {
 if (value === undefined || value === null || value === '') {
 return undefined;
 }

 const decimal = new Prisma.Decimal(typeof value === 'string' ? value.replace(',', '.') : value);

 if (!decimal.isFinite()) {
 throw new Error('Valor estimado inválido para proposta.');
 }

 return decimal;
}

function extractSubmissionContext(submission?: ProposalSubmission | null): string | null {
 if (!submission) {
 return null;
 }

 const notes = normalizeOptional(submission.notes);
 if (notes) {
 return notes;
 }

 const payloadText = extractTextFromPayload(submission.payload);
 if (payloadText) {
 return payloadText;
 }

 return null;
}

function extractTextFromPayload(value: Prisma.JsonValue): string | null {
 if (typeof value === 'string') {
 return normalizeOptional(value);
 }

 if (!value || typeof value !== 'object' || Array.isArray(value)) {
 return null;
 }

 const object = value as Record<string, Prisma.JsonValue>;
 const preferredKeys = [
 'challenge',
 'message',
 'description',
 'painPoints',
 'notes',
 'goal',
 'meetingGoal',
 'processes',
 ];

 for (const key of preferredKeys) {
 const candidate = object[key];
 if (typeof candidate === 'string') {
 const normalized = normalizeOptional(candidate);
 if (normalized) {
 return normalized;
 }
 }
 }

 return null;
}
