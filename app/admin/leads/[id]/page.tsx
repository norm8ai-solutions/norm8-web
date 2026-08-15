/**
 * ------------------------------------------------------------------
 * File: app/admin/leads/[id]/page.tsx
 * Description: Lead detail page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Show lead profile, related submissions, meetings, emails, activities, and notifications.
 * - Allow status and priority updates.
 * - Allow internal notes through LeadActivity records.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import { LeadActionsPanel } from '@/components/admin/LeadActionsPanel';
import { FinalProposalLink, GenerateFinalProposalForm } from '@/components/admin/FinalProposalActions';
import { ProposalPdfActions } from '@/components/admin/ProposalPdfActions';
import { SendPreMeetingIntakeRequestModal } from '@/components/admin/SendPreMeetingIntakeRequestModal';
import { Norm8Select } from '@/components/ui/norm8-select';
import { notFound } from 'next/navigation';
import {
 LeadPriorityBadge,
 LeadStatusBadge,
 MeetingStatusBadge,
 NotificationStatusBadge,
 SubmissionTypeBadge,
} from '@/components/admin/AdminBadge';
import {
 AdminEmptyState,
 AdminField,
 AdminPanel,
 AdminRow,
} from '@/components/admin/AdminPrimitives';
import {
 addLeadNote,
 updateLeadPriority,
 updateLeadStatus,
} from '@/lib/admin/actions';
import { getSuggestedNextLeadAction } from '@/lib/admin/lead-action-suggestions';
import {
 formatDatePt,
 formatLeadActivity,
 formatMeetingDate,
 formatTimeRangePt,
 getSubmissionDisplayData,
} from '@/lib/admin/formatters';
import {
  getLeadCommercialFlowState,
  type LeadCommercialFlowAction,
  type LeadCommercialFlowState,
} from '@/lib/admin/commercial-next-action';
import { getLeadById } from '@/lib/admin/queries';
import { buildDefaultProposalDataFromLead } from '@/lib/proposals/service';



type EstimatedDelivery = {
 range: string;
 rationale?: string;
};type ContractEstimate = {
 minimum: number;
 maximum: number;
 currency: 'EUR';
 confidence: 'LOW' | 'MEDIUM' | 'HIGH';
 rationale?: string;
};
type LeadDetailPageProps = {
 params: Promise<{ id: string }>;
 searchParams?: Promise<{ actionError?: string; actionExecutionError?: string }>;
};

const leadStatuses = ['NEW', 'QUALIFIED', 'CONTACTED', 'CONVERTED', 'LOST'] as const;
const leadPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

/**
 * Renders lead detail and lightweight admin management controls.
 *
 * @param props Route params with lead id.
 * @returns Lead detail page.
 */
export default async function LeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
 const { id } = await params;
 const query = await searchParams;
 const lead = await getLeadById(id);

 if (!lead) {
 notFound();
 }

 const latestAnalysis = lead.auditAnalyses[0];
 const latestContractEstimate = parseContractEstimate(
 latestAnalysis?.contractValueEstimate,
 );
 const latestEstimatedDelivery = parseEstimatedDelivery(latestAnalysis?.estimatedDelivery);
 const suggestedAction = getSuggestedNextLeadAction({
 status: lead.status,
 priority: lead.priority,
 submissions: lead.submissions,
 auditAnalyses: lead.auditAnalyses,
 meetingBookings: lead.meetingBookings,
 emailLogs: lead.emailLogs,
 leadActions: lead.leadActions,
 });
 const latestSubmission = lead.submissions[0] ?? null;
 const latestSubmissionId = latestAnalysis?.submissionId ?? latestSubmission?.id;
 const proposalDefaults = buildDefaultProposalDataFromLead({
 auditAnalysis: latestAnalysis ?? null,
 lead,
 submission: latestSubmission,
 });
 const primaryBaseOffer = lead.baseOffers[0] ?? null;
 const primaryDiscoverySession = selectPrimaryDiscoverySession(lead.discoverySessions, primaryBaseOffer);
 const activeFinalProposal = selectActiveFinalProposal(lead.proposals, primaryBaseOffer);
 const commercialFlowState = getLeadCommercialFlowState({
 baseOfferStatus: primaryBaseOffer?.status,
 discoverySessionStatus: primaryDiscoverySession?.status,
 finalProposalId: activeFinalProposal?.id,
 finalProposalPdfHref: activeFinalProposal ? getProposalPdfHref(activeFinalProposal) : null,
 leadId: lead.id,
 });
 const executionContext = {
 auditSummary: latestAnalysis?.internalSummary ?? latestAnalysis?.companySummary ?? null,
 latestSubmissionId,
 leadCompany: lead.company,
 leadEmail: lead.email,
 leadId: lead.id,
 leadName: lead.name,
 potentialEstimate: formatContractEstimate(latestContractEstimate),
 proposalDefaults,
 proposalDrafts: lead.proposals.map((proposal) => ({
 companyName: proposal.companyName,
 contactName: proposal.contactName,
 estimatedValue: proposal.estimatedValue?.toString() ?? null,
 id: proposal.id,
 implementationPlan: proposal.implementationPlan,
 leadActionId: proposal.leadActionId,
 nextSteps: proposal.nextSteps,
 painPoints: proposal.painPoints,
 pdfUrl: proposal.pdfUrl,
 recommendedSolution: proposal.recommendedSolution,
 status: proposal.status,
 title: proposal.title,
 })),
 };

 return (
 <div className="admin-page-grid">
 <AdminPanel
 title={lead.name ?? 'Lead sem nome'}
 subtitle={`${lead.company} · ${lead.email}`}
 action={
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
 <LeadStatusBadge status={lead.status} />
 <LeadPriorityBadge priority={lead.priority} />

  </div>
 }
 >
 <div className="admin-filters">
 <form action={updateLeadStatus} className="admin-filters">
 <input name="leadId" type="hidden" value={lead.id} />
 <Norm8Select
 defaultValue={lead.status}
 name="status"
 options={leadStatuses.map((status) => ({
 value: status,
 label: status,
 }))}
 />
 <button className="admin-button" type="submit">
 Atualizar estado
 </button>
 </form>

 <form action={updateLeadPriority} className="admin-filters">
 <input name="leadId" type="hidden" value={lead.id} />
 <Norm8Select
 defaultValue={lead.priority}
 name="priority"
 options={leadPriorities.map((priority) => ({
 value: priority,
 label: priority,
 }))}
 />
 <button className="admin-button admin-button-muted" type="submit">
 Atualizar prioridade
 </button>
 </form>
 </div>
 </AdminPanel>

 <section className="admin-grid-main-aside">
 <div className="admin-page-grid">
 <LeadActionsPanel
 actionError={query?.actionError}
 actions={lead.leadActions}
 executionContext={executionContext}
 executionError={query?.actionExecutionError}
 leadId={lead.id}
 suggestedAction={suggestedAction}
 />

  <BaseOfferPanel baseOffer={primaryBaseOffer} flowState={commercialFlowState} lead={lead} />

 <AdminPanel title="Nota interna" subtitle="Regista contexto comercial para a equipa.">
 <form action={addLeadNote} style={{ display: 'grid', gap: 12 }}>
 <input name="leadId" type="hidden" value={lead.id} />
 <textarea
 className="admin-textarea"
 name="message"
 placeholder="Adicionar nota..."
 />
 <button className="admin-button" style={{ width: 180 }} type="submit">
 Guardar nota
 </button>
 </form>
 </AdminPanel>

 <AdminPanel title="Submissões" subtitle="Pedidos associados ao lead.">
 {lead.submissions.length > 0 ? (
 <div className="admin-row-list">
 {lead.submissions.map((submission) => {
 const display = getSubmissionDisplayData({
 payload: submission.payload,
 lead,
 });

 return (
 <AdminRow
 key={submission.id}
 title={
 <Link className="admin-link" href={`/admin/submissions/${submission.id}`}>
 <SubmissionTypeBadge type={submission.type} />
 </Link>
 }
 meta={`${display.company ?? 'Sem empresa'} · ${formatDatePt(submission.createdAt)}`}
 >
 {display.name ?? 'Sem nome'} · {display.summary}
 </AdminRow>
 );
 })}
 </div>
 ) : (
 <AdminEmptyState>Sem submissões associadas.</AdminEmptyState>
 )}
 </AdminPanel>

 <AdminPanel title="Timeline de atividades" subtitle="Histórico operacional do lead.">
 {lead.activities.length > 0 ? (
 <div className="admin-timeline">
 {lead.activities.map((activity) => {
 const activityDisplay = formatLeadActivity(activity);

 return (
 <div className="admin-timeline-item" key={activity.id}>
 <p className="admin-row-title">{activityDisplay.title}</p>
 <p className="admin-row-text">{activityDisplay.description}</p>
 <p className="admin-row-meta">{formatDatePt(activity.createdAt)}</p>
 </div>
 );
 })}
 </div>
 ) : (
 <AdminEmptyState>Sem atividades registadas.</AdminEmptyState>
 )}
 </AdminPanel>
 </div>

 <aside className="admin-page-grid">
 <AdminPanel title="Dados do lead">
 <div className="admin-field-grid">
 <AdminField label="Nome" value={lead.name} />
 <AdminField label="Empresa" value={lead.company} />
 <AdminField label="Email" value={lead.email} />
 <AdminField label="Telefone" value={lead.phone} />
 <AdminField label="Website" value={lead.website} />
 <AdminField label="Origem" value={lead.source} />
 <AdminField label="Criado em" value={formatDatePt(lead.createdAt)} />
 <AdminField label="Atualizado" value={formatDatePt(lead.updatedAt)} />
 </div>
 </AdminPanel>


 <AdminPanel title="Potencial Comercial">
 <div className="admin-field-grid">
 <AdminField
 label="Valor estimado"
 value={formatContractEstimate(latestContractEstimate)}
 />
 <AdminField
 label="Probabilidade de Fecho"
 value={
 latestAnalysis?.closingProbability === null ||
 latestAnalysis?.closingProbability === undefined
 ? 'Não estimada'
 : `${latestAnalysis.closingProbability}%`
 }
 />
 <AdminField
 label="Tempo estimado"
 value={
 latestEstimatedDelivery?.range ??
  getDeliveryRange(latestAnalysis?.implementationComplexity)
 }
 />
 <AdminField
 label="Complexidade"
 value={formatImplementationComplexity(latestAnalysis?.implementationComplexity)}
 />
 <AdminField
 label="Confiança"
 value={formatContractConfidence(latestContractEstimate?.confidence)}
 />
 <AdminField
 label="Justificação"
 value={latestContractEstimate?.rationale ?? 'Não disponível'}
 />
 </div>
 </AdminPanel>
 <AdminPanel title="AI Sales Assets" subtitle="Resumo da análise mais recente.">
 {latestAnalysis ? (
 <div className="admin-field-grid">
 <AdminField
 label="Sales Playbook"
 value={latestAnalysis.salesPlaybook ? 'Disponível' : 'Não gerado'}
 />
 <AdminField
 label="Roadmap sugerido"
 value={latestAnalysis.implementationRoadmap ? 'Disponível' : 'Não gerado'}
 />
 <AdminField
 label="Detalhe completo"
 value={
 <Link
 className="admin-link"
 href={`/admin/submissions/${latestAnalysis.submissionId}`}
 >
 Abrir submissão
 </Link>
 }
 />
 </div>
 ) : (
 <AdminEmptyState>Sem análise IA associada.</AdminEmptyState>
 )}
 </AdminPanel>
 <div id="propostas">
 <AdminPanel title="Propostas" subtitle="Rascunhos e propostas comerciais associadas à lead.">
 {lead.proposals.length > 0 ? (
 <div className="admin-row-list">
 {lead.proposals.map((proposal) => (
 <div id={`proposal-${proposal.id}`} key={proposal.id}>
 <AdminRow
 title={proposal.title}
 meta={`${formatProposalSource(proposal)} · ${formatDatePt(proposal.createdAt)} · ${formatProposalEstimatedValue(proposal.estimatedValue)}`}
 >
 <div className="proposal-compact-card">
 <div className="proposal-compact-badges">
 <span className={`admin-badge ${getProposalStatusBadgeClass(proposal.status)}`}>{formatProposalStatus(proposal.status)}</span>
 {proposal.id === activeFinalProposal?.id ? <span className="admin-badge admin-badge-blue">Proposta ativa</span> : null}
 <span className={`admin-badge ${proposal.pdfUrl || proposal.pdfPath ? 'admin-badge-green' : 'admin-badge-slate'}`}>{formatProposalPdfStatus(proposal)}</span>
 </div>
 <p className="proposal-compact-summary">{getProposalSummary(proposal)}</p>
 <div className="proposal-compact-actions">
 <FinalProposalLink href={`/admin/proposals/${proposal.id}`} />
 <ProposalPdfActions
 leadId={lead.id}
 pdfUrl={proposal.pdfUrl}
 proposalId={proposal.id}
 showSuccessMessage={false}
 />
 </div>
 </div>
 </AdminRow>
 </div>
 ))}
 </div>
 ) : (
 <AdminEmptyState>Ainda não existem propostas associadas a esta lead.</AdminEmptyState>
 )}
 </AdminPanel>
 </div>
 <AdminPanel title="Reuniões">
 {lead.meetingBookings.length > 0 ? (
 <div className="admin-row-list">
 {lead.meetingBookings.map((meeting) => (
 <AdminRow
 key={meeting.id}
 title={formatMeetingDate(meeting.startsAt, meeting.timezone)}
 meta={formatTimeRangePt(
 meeting.startsAt,
 meeting.endsAt,
 meeting.timezone,
 )}
 >
 <MeetingStatusBadge status={meeting.status} />
 </AdminRow>
 ))}
 </div>
 ) : (
 <AdminEmptyState>Sem reuniões registadas.</AdminEmptyState>
 )}
 </AdminPanel>

 <AdminPanel title="Emails">
 {lead.emailLogs.length > 0 ? (
 <div className="admin-row-list">
 {lead.emailLogs.map((email) => (
 <AdminRow
 key={email.id}
 title={email.subject}
 meta={`${email.status} · ${formatDatePt(email.createdAt)}`}
 />
 ))}
 </div>
 ) : (
 <AdminEmptyState>Sem emails registados.</AdminEmptyState>
 )}
 </AdminPanel>

 <AdminPanel title="Notificações">
 {lead.notifications.length > 0 ? (
 <div className="admin-row-list">
 {lead.notifications.map((notification) => (
 <AdminRow
 key={notification.id}
 title={
 <>
 {notification.title}{' '}
 <NotificationStatusBadge status={notification.status} />
 </>
 }
 meta={formatDatePt(notification.createdAt)}
 />
 ))}
 </div>
 ) : (
 <AdminEmptyState>Sem notificações associadas.</AdminEmptyState>
 )}
 </AdminPanel>
 </aside>
 </section>
 </div>
 );
}

type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLeadById>>>;
type LeadBaseOffer = LeadDetail['baseOffers'][number];
type LeadProposal = NonNullable<Awaited<ReturnType<typeof getLeadById>>>['proposals'][number];
type LeadDiscoverySession = NonNullable<Awaited<ReturnType<typeof getLeadById>>>['discoverySessions'][number];

function BaseOfferPanel({
  baseOffer,
  flowState,
  lead,
}: {
  baseOffer: LeadBaseOffer | null;
  flowState: LeadCommercialFlowState;
  lead: LeadDetail;
}) {
  const statusLabel = baseOffer ? formatBaseOfferStatus(baseOffer.status) : flowState.label;
  const statusBadgeClass = getCommercialFlowBadgeClass(flowState.stage);

  if (!baseOffer) {
    return (
      <AdminPanel
        title="Oferta Base"
        subtitle="Criada automaticamente pelo fluxo manual pré-discovery."
        action={<span className={`admin-badge ${statusBadgeClass}`}>{flowState.label}</span>}
      >
        <div className="base-offer-summary-card" id="oferta-base">
          <CommercialFlowStateSummary flowState={flowState} />
          <AdminEmptyState>
            Oferta Base ainda não criada. A Oferta Base será gerada automaticamente após a submissão do formulário pré-reunião.
          </AdminEmptyState>
          <BaseOfferSummaryActions baseOfferId={null} flowState={flowState} lead={lead} />
        </div>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel
      title="Oferta Base"
      subtitle="Resumo executivo para orientar a próxima etapa comercial."
      action={<span className={`admin-badge ${statusBadgeClass}`}>{flowState.label}</span>}
    >
      <div className="base-offer-summary-card" id="oferta-base">
        <CommercialFlowStateSummary flowState={flowState} />
        <div className="base-offer-summary-grid">
          <BaseOfferSummaryItem label="Estado da Oferta Base" value={statusLabel} />
          <BaseOfferSummaryItem label="Problema principal" value={formatBaseOfferText(baseOffer.problemSummary, 'Ainda sem informação suficiente.')} />
          <BaseOfferSummaryItem label="Processo a automatizar" value={formatBaseOfferText(baseOffer.processToAutomate)} />
          <BaseOfferSummaryItem
            clamp
            label="Solução sugerida"
            value={formatBaseOfferText(baseOffer.suggestedSolution, 'Ainda sem informação suficiente.')}
          />
          <BaseOfferSummaryItem label="Âmbito estimado" value={formatBaseOfferText(baseOffer.estimatedScope)} />
          <BaseOfferSummaryItem label="Última atualização" value={formatDatePt(baseOffer.updatedAt)} />
        </div>

        <BaseOfferSummaryActions baseOfferId={baseOffer.id} flowState={flowState} lead={lead} />
      </div>
    </AdminPanel>
  );
}

function CommercialFlowStateSummary({ flowState }: { flowState: LeadCommercialFlowState }) {
  return (
    <div className="base-offer-flow-state">
      <span className="base-offer-summary-label">Próxima fase</span>
      <strong>{flowState.label}</strong>
      <p>{flowState.description}</p>
    </div>
  );
}

function BaseOfferSummaryItem({ clamp = false, label, value }: { clamp?: boolean; label: string; value: string }) {
  return (
    <div className="base-offer-summary-item">
      <span className="base-offer-summary-label">{label}</span>
      <p className={clamp ? 'base-offer-summary-value base-offer-summary-value-clamped' : 'base-offer-summary-value'}>
        {value}
      </p>
    </div>
  );
}

function BaseOfferSummaryActions({
  baseOfferId,
  flowState,
  lead,
}: {
  baseOfferId: string | null;
  flowState: LeadCommercialFlowState;
  lead: LeadDetail;
}) {
  const visibleSecondaryActions = flowState.secondaryActions.filter((action) => action.href !== flowState.primaryAction?.href);

  if (!flowState.primaryAction && visibleSecondaryActions.length === 0) {
    return null;
  }

  return (
    <div className="base-offer-summary-actions">
      {flowState.primaryAction ? renderCommercialFlowAction(flowState.primaryAction, baseOfferId, lead, true) : null}
      {visibleSecondaryActions.map((action) => renderCommercialFlowAction(action, baseOfferId, lead, false))}
    </div>
  );
}

function renderCommercialFlowAction(
  action: LeadCommercialFlowAction,
  baseOfferId: string | null,
  lead: LeadDetail,
  primary: boolean,
) {
  const className = primary ? 'admin-button' : 'admin-button admin-button-muted';

  if (action.type === 'link' && action.href) {
    return action.label === 'Ver Proposta Final' ? (
      <FinalProposalLink className={className} href={action.href} key={action.label} label={action.label} />
    ) : (
      <Link className={className} href={action.href} key={action.label}>{action.label}</Link>
    );
  }

  if (action.type === 'external' && action.href) {
    return <Link className={className} href={action.href} key={action.label} rel="noreferrer" target="_blank">{action.label}</Link>;
  }

  if (action.type === 'form' && baseOfferId) {
    return (
      <GenerateFinalProposalForm baseOfferId={baseOfferId} className={className} key={action.label} label={action.label} />
    );
  }

  if (action.type === 'form') {
    return (
      <SendPreMeetingIntakeRequestModal
        defaultCompanyName={lead.company}
        defaultContactName={lead.name}
        defaultEmail={lead.email}
        defaultPhone={lead.phone}
        key={action.label}
        leadId={lead.id}
        triggerLabel={action.label}
      />
    );
  }

  return null;
}

function selectPrimaryDiscoverySession(sessions: LeadDiscoverySession[], baseOffer: LeadBaseOffer | null): LeadDiscoverySession | null {
  const activeSessions = sessions.filter((session) => session.status !== 'ARCHIVED');

  if (baseOffer) {
    const matchingSession = activeSessions.find((session) => session.baseOfferId === baseOffer.id);
    if (matchingSession) return matchingSession;
  }

  return activeSessions[0] ?? null;
}

function selectActiveFinalProposal(proposals: LeadProposal[], baseOffer: LeadBaseOffer | null): LeadProposal | null {
  const activeProposals = proposals.filter((proposal) => ['DRAFT', 'GENERATED', 'SENT', 'ACCEPTED'].includes(proposal.status));
  const candidates = activeProposals.length > 0 ? activeProposals : proposals;
  const preferredSubmissionId = baseOffer?.submissionId ?? null;

  return [...candidates].sort((a, b) => {
    const submissionScoreA = preferredSubmissionId && a.submissionId === preferredSubmissionId ? 1 : 0;
    const submissionScoreB = preferredSubmissionId && b.submissionId === preferredSubmissionId ? 1 : 0;
    if (submissionScoreA !== submissionScoreB) return submissionScoreB - submissionScoreA;

    const pdfScoreA = a.pdfUrl || a.pdfPath ? 1 : 0;
    const pdfScoreB = b.pdfUrl || b.pdfPath ? 1 : 0;
    if (pdfScoreA !== pdfScoreB) return pdfScoreB - pdfScoreA;

    return getProposalTimestamp(b) - getProposalTimestamp(a) || b.version - a.version || b.id.localeCompare(a.id);
  })[0] ?? null;
}

function getProposalTimestamp(proposal: LeadProposal): number {
  const updatedAt = proposal.updatedAt?.getTime() ?? NaN;
  const createdAt = proposal.createdAt?.getTime() ?? NaN;

  return Number.isFinite(updatedAt) ? updatedAt : Number.isFinite(createdAt) ? createdAt : 0;
}
function formatBaseOfferText(value?: string | null, fallback = 'Por definir'): string {
  const normalized = value?.trim();
  return normalized || fallback;
}

function getProposalPdfHref(proposal: LeadProposal): string | null {
  return proposal.pdfUrl || proposal.pdfPath || null;
}

function getCommercialFlowBadgeClass(stage: LeadCommercialFlowState['stage']): string {
  const classes: Record<LeadCommercialFlowState['stage'], string> = {
    WAITING_PRE_MEETING_SUBMISSION: 'admin-badge-slate',
    BASE_OFFER_CREATED: 'admin-badge-blue',
    DISCOVERY_IN_PREPARATION: 'admin-badge-blue',
    DISCOVERY_COMPLETED: 'admin-badge-green',
    FINAL_PROPOSAL_CREATED: 'admin-badge-green',
    BASE_OFFER_ARCHIVED: 'admin-badge-slate',
  };

  return classes[stage];
}

function formatBaseOfferStatus(status: string): string {
  const labels: Record<string, string> = {
    INTERNAL_DRAFT: 'Rascunho interno',
    DISCOVERY_PREPARATION: 'Discovery em preparação',
    DISCOVERY_COMPLETED: 'Discovery concluída',
    VALIDATED: 'Discovery concluída',
    CONVERTED_TO_PROPOSAL: 'Convertida em proposta',
    ARCHIVED: 'Arquivada',
  };

  return labels[status] ?? formatUnknownBaseOfferStatus(status);
}

function formatUnknownBaseOfferStatus(status: string): string {
  const readable = status
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return readable || 'Estado desconhecido';
}

function formatProposalSource(proposal: LeadProposal): string {
  if (proposal.submissionId) return 'Discovery / Oferta Base';
  if (proposal.leadActionId) return 'Manual';
  return 'Manual';
}

function getProposalSummary(proposal: LeadProposal): string {
  return (
    proposal.recommendedSolution?.trim() ||
    proposal.painPoints?.trim() ||
    proposal.scope?.trim() ||
    proposal.implementationPlan?.trim() ||
    proposal.nextSteps?.trim() ||
    'Sem resumo disponível.'
  );
}

function formatProposalPdfStatus(proposal: LeadProposal): string {
  return proposal.pdfUrl || proposal.pdfPath ? 'PDF disponível' : 'PDF pendente';
}

function getProposalStatusBadgeClass(status: string): string {
  const tones: Record<string, string> = {
    DRAFT: 'admin-badge-slate',
    GENERATED: 'admin-badge-green',
    SENT: 'admin-badge-blue',
    ACCEPTED: 'admin-badge-green',
    REJECTED: 'admin-badge-red',
    EXPIRED: 'admin-badge-yellow',
  };

  return tones[status] ?? 'admin-badge-slate';
}
function formatProposalStatus(status: string): string {
 switch (status) {
 case 'DRAFT':
 return 'Rascunho';
 case 'GENERATED':
 return 'PDF gerado';
 case 'SENT':
 return 'Enviada';
 case 'ACCEPTED':
 return 'Aceite';
 case 'REJECTED':
 return 'Rejeitada';
 case 'EXPIRED':
 return 'Expirada';
 default:
 return status;
 }
}

function formatProposalEstimatedValue(value: { toString(): string } | null): string {
 if (!value) {
 return 'Valor por estimar';
 }

 const numericValue = Number(value.toString());
 if (!Number.isFinite(numericValue)) {
 return 'Valor por estimar';
 }

 return formatCompactEuro(numericValue);
}
/**
 * Parses the internal contract value estimate JSON.
 *
 * @param value Stored Prisma Json value.
 * @returns Parsed estimate or undefined.
 */
function parseContractEstimate(value: unknown): ContractEstimate | undefined {
 if (!value || typeof value !== 'object' || Array.isArray(value)) {
 return undefined;
 }

 const record = value as Record<string, unknown>;

 if (
 typeof record.minimum !== 'number' ||
 typeof record.maximum !== 'number' ||
 record.currency !== 'EUR' ||
 !['LOW', 'MEDIUM', 'HIGH'].includes(String(record.confidence))
 ) {
 return undefined;
 }

 return {
 minimum: record.minimum,
 maximum: record.maximum,
 currency: 'EUR',
 confidence: record.confidence as ContractEstimate['confidence'],
 rationale: typeof record.rationale === 'string' ? record.rationale : undefined,
 };
}

/**
 * Formats a commercial estimate range.
 *
 * @param estimate Parsed estimate.
 * @returns Compact EUR range.
 */
function formatContractEstimate(estimate?: ContractEstimate): string {
  if (!estimate) {
    return 'Não estimado';
  }

  return `${formatCompactEuro(estimate.minimum)} - ${formatCompactEuro(estimate.maximum)}`;
}

/**
 * Formats contract confidence into Portuguese.
 *
 * @param confidence Confidence enum value.
 * @returns Portuguese label.
 */
function formatContractConfidence(confidence?: string): string {
  const labels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
  };

  return confidence ? labels[confidence] ?? confidence : 'Não atribuída';
}

/**
 * Formats EUR values in compact notation.
 *
 * @param value Numeric EUR value.
 * @returns Compact display string.
 */
function formatCompactEuro(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k€`;
  }

  return `${value}€`;
}
/**
 * Parses the internal estimated delivery JSON.
 *
 * @param value Stored Prisma Json value.
 * @returns Parsed delivery estimate or undefined.
 */
function parseEstimatedDelivery(value: unknown): EstimatedDelivery | undefined {
 if (!value || typeof value !== 'object' || Array.isArray(value)) {
 return undefined;
 }

 const record = value as Record<string, unknown>;

 if (typeof record.range !== 'string') {
 return undefined;
 }

 return {
 range: record.range,
 rationale: typeof record.rationale === 'string' ? record.rationale : undefined,
 };
}

/**
 * Formats implementation complexity into Portuguese.
 *
 * @param complexity Complexity enum value.
 * @returns Portuguese label.
 */
function formatImplementationComplexity(complexity?: string | null): string {
  const labels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
  };

  return complexity ? labels[complexity] ?? complexity : 'Não estimada';
}

/**
 * Returns a delivery fallback from implementation complexity.
 *
 * @param complexity Complexity enum value.
 * @returns Delivery range.
 */
function getDeliveryRange(complexity?: string | null): string {
  const ranges: Record<string, string> = {
    LOW: '2-4 semanas',
    MEDIUM: '4-8 semanas',
    HIGH: '8-16 semanas',
  };

  return complexity ? ranges[complexity] ?? 'Não estimado' : 'Não estimado';
}
