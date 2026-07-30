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
 formatMeetingDate,
 formatTimeRangePt,
 getSubmissionDisplayData,
} from '@/lib/admin/formatters';
import { getLeadById } from '@/lib/admin/queries';
import { buildDefaultProposalDataFromLead } from '@/lib/proposals/service';
import {
 generateFinalProposalFromBaseOfferAction,
 saveDiscoveryNotesAction,
 updateBaseOfferAction,
 validateBaseOfferAction,
} from '@/lib/manual-client-intake/actions';



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
  <SendPreMeetingIntakeRequestModal
  defaultCompanyName={lead.company}
  defaultContactName={lead.name}
  defaultEmail={lead.email}
  defaultPhone={lead.phone}
  leadId={lead.id}
  triggerLabel="Enviar formulário pré-reunião"
  />
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

  <BaseOfferPanel baseOffer={lead.baseOffers[0] ?? null} />

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
 {lead.activities.map((activity) => (
 <div className="admin-timeline-item" key={activity.id}>
 <p className="admin-row-title">{activity.type}</p>
 <p className="admin-row-text">{activity.message}</p>
 <p className="admin-row-meta">{formatDatePt(activity.createdAt)}</p>
 </div>
 ))}
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
 <AdminPanel title="Propostas" subtitle="Rascunhos e propostas comerciais associadas à lead.">
 {lead.proposals.length > 0 ? (
 <div className="admin-row-list">
 {lead.proposals.map((proposal) => (
 <AdminRow
 key={proposal.id}
 title={proposal.title}
 meta={`${formatProposalStatus(proposal.status)} · ${formatDatePt(proposal.createdAt)}`}
 >
 <div>
 <span>
 {formatProposalEstimatedValue(proposal.estimatedValue)} ·{' '}
 {proposal.pdfUrl || proposal.pdfPath ? 'PDF disponível' : 'Sem PDF gerado'}
 </span>
 <ProposalPdfActions
 leadId={lead.id}
 pdfUrl={proposal.pdfUrl}
 proposalId={proposal.id}
 />
 </div>
 </AdminRow>
 ))}
 </div>
 ) : (
 <AdminEmptyState>Ainda não existem propostas associadas a esta lead.</AdminEmptyState>
 )}
 </AdminPanel>
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

type LeadBaseOffer = NonNullable<Awaited<ReturnType<typeof getLeadById>>>['baseOffers'][number];

function BaseOfferPanel({ baseOffer }: { baseOffer: LeadBaseOffer | null }) {
  if (!baseOffer) {
    return (
      <AdminPanel title="Oferta Base" subtitle="Criada automaticamente pelo fluxo manual pré-discovery.">
        <AdminEmptyState>Sem Oferta Base associada a esta lead.</AdminEmptyState>
      </AdminPanel>
    );
  }

  const recommendedModules = formatJsonList(baseOffer.recommendedModules);
  const opportunities = formatJsonList(baseOffer.automationOpportunities);
  const questions = formatJsonList(baseOffer.questionsForDiscovery);
  const risks = formatJsonList(baseOffer.risksOrMissingInfo);
  const discoveryNotes = getDiscoveryNotes(baseOffer.metadata);

  return (
    <AdminPanel
      title="Oferta Base"
      subtitle="Rascunho interno para preparar discovery e proposta final."
      action={<span className="admin-badge admin-badge-blue">{formatBaseOfferStatus(baseOffer.status)}</span>}
    >
      <div className="manual-intake-panel-grid">
        <form action={updateBaseOfferAction} className="manual-intake-form">
          <input name="baseOfferId" type="hidden" value={baseOffer.id} />
          <label className="manual-intake-admin-field"><span>Resumo do problema</span><textarea className="admin-textarea" name="problemSummary" defaultValue={baseOffer.problemSummary ?? ''} /></label>
          <label className="manual-intake-admin-field"><span>Processo a automatizar</span><textarea className="admin-textarea" name="processToAutomate" defaultValue={baseOffer.processToAutomate ?? ''} /></label>
          <label className="manual-intake-admin-field"><span>Solução sugerida</span><textarea className="admin-textarea" name="suggestedSolution" defaultValue={baseOffer.suggestedSolution ?? ''} /></label>
          <div className="manual-intake-two-cols">
            <label className="manual-intake-admin-field"><span>Ferramentas mencionadas</span><input className="admin-input" name="toolsMentioned" defaultValue={baseOffer.toolsMentioned ?? ''} /></label>
            <label className="manual-intake-admin-field"><span>Intervalo de preço inicial</span><input className="admin-input" name="initialPriceRange" defaultValue={baseOffer.initialPriceRange ?? ''} /></label>
          </div>
          <label className="manual-intake-admin-field"><span>Âmbito estimado</span><textarea className="admin-textarea" name="estimatedScope" defaultValue={baseOffer.estimatedScope ?? ''} /></label>
          <label className="manual-intake-admin-field"><span>Racional de preço</span><textarea className="admin-textarea" name="pricingRationale" defaultValue={baseOffer.pricingRationale ?? ''} /></label>
          <label className="manual-intake-admin-field"><span>Próximos passos</span><textarea className="admin-textarea" name="nextSteps" defaultValue={baseOffer.nextSteps ?? ''} /></label>
          <div className="manual-intake-actions"><button className="admin-button" type="submit">Guardar Oferta Base</button></div>
        </form>
        <div className="manual-intake-side">
          <div className="manual-intake-cardlet"><h3>Módulos recomendados</h3><p>{recommendedModules}</p></div>
          <div className="manual-intake-cardlet"><h3>Oportunidades</h3><p>{opportunities}</p></div>
          <div className="manual-intake-cardlet"><h3>Perguntas para discovery</h3><p>{questions}</p></div>
          <div className="manual-intake-cardlet"><h3>Riscos ou informação em falta</h3><p>{risks}</p></div>
          <div className="manual-intake-actions">
            <form action={validateBaseOfferAction}><input name="baseOfferId" type="hidden" value={baseOffer.id} /><button className="admin-button admin-button-muted" type="submit">Marcar validada</button></form>
            <form action={generateFinalProposalFromBaseOfferAction}><input name="baseOfferId" type="hidden" value={baseOffer.id} /><button className="admin-button" type="submit">Gerar Proposta Final</button></form>
          </div>
        </div>
      </div>
      <div className="manual-intake-discovery">
        <h3>Preparação da Discovery</h3>
        <form action={saveDiscoveryNotesAction} className="manual-intake-form">
          <input name="baseOfferId" type="hidden" value={baseOffer.id} />
          <div className="manual-intake-two-cols">
            <DiscoveryField name="confirmedProblems" label="Problemas confirmados" notes={discoveryNotes} />
            <DiscoveryField name="newProblems" label="Novos problemas" notes={discoveryNotes} />
            <DiscoveryField name="currentProcess" label="Processo atual" notes={discoveryNotes} />
            <DiscoveryField name="impact" label="Impacto" notes={discoveryNotes} />
            <DiscoveryField name="tools" label="Ferramentas" notes={discoveryNotes} />
            <DiscoveryField name="decisionMakers" label="Decisores" notes={discoveryNotes} />
            <DiscoveryField name="urgency" label="Urgência" notes={discoveryNotes} />
            <DiscoveryField name="budget" label="Orçamento" notes={discoveryNotes} />
            <DiscoveryField name="validatedSolution" label="Solução validada" notes={discoveryNotes} />
            <DiscoveryField name="discardedFeatures" label="Funcionalidades descartadas" notes={discoveryNotes} />
            <DiscoveryField name="priceDiscussed" label="Preço discutido" notes={discoveryNotes} />
            <DiscoveryField name="expectedSecondMeetingDate" label="Data esperada da segunda reunião" notes={discoveryNotes} input />
          </div>
          <DiscoveryField name="nextSteps" label="Próximos passos" notes={discoveryNotes} />
          <div className="manual-intake-actions"><button className="admin-button" type="submit">Guardar preparação</button></div>
        </form>
      </div>
    </AdminPanel>
  );
}

function DiscoveryField({ label, name, notes, input = false }: { label: string; name: string; notes: Record<string, string>; input?: boolean }) {
  return <label className="manual-intake-admin-field"><span>{label}</span>{input ? <input className="admin-input" name={name} defaultValue={notes[name] ?? ''} /> : <textarea className="admin-textarea" name={name} defaultValue={notes[name] ?? ''} />}</label>;
}

function formatBaseOfferStatus(status: string): string {
  const labels: Record<string, string> = { INTERNAL_DRAFT: 'Rascunho interno', VALIDATED: 'Validada', CONVERTED_TO_PROPOSAL: 'Convertida em proposta', ARCHIVED: 'Arquivada' };
  return labels[status] ?? status;
}

function formatJsonList(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(' · ');
  if (typeof value === 'string') return value;
  return 'Sem dados registados.';
}

function getDiscoveryNotes(metadata: unknown): Record<string, string> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const notes = (metadata as Record<string, unknown>).discoveryNotes;
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return {};
  return Object.fromEntries(Object.entries(notes).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
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
