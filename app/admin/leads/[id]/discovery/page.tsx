/**
 * ------------------------------------------------------------------
 * File: app/admin/leads/[id]/discovery/page.tsx
 * Description: Dedicated Discovery workspace for a lead and its Base Offer.
 * Responsibilities:
 * - Load lead, pre-meeting submission, Base Offer and structured Discovery context.
 * - Provide an admin workspace for reviewing and editing the Base Offer.
 * - Persist Discovery notes and questions through dedicated Discovery models.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompleteDiscoveryForm } from '@/components/admin/CompleteDiscoveryForm';
import { GenerateFinalProposalWithWarning } from '@/components/admin/GenerateFinalProposalWithWarning';
import { FinalProposalLink, GenerateFinalProposalForm } from '@/components/admin/FinalProposalActions';
import { DiscoveryQuestionsForm } from '@/components/admin/DiscoveryQuestionsForm';
import { DiscoveryWorkspaceSaveForm } from '@/components/admin/DiscoveryWorkspaceSaveForm';
import {
  LeadPriorityBadge,
  LeadStatusBadge,
} from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminField,
  AdminPanel,
  AdminRow,
} from '@/components/admin/AdminPrimitives';
import {
  formatDiscoverySessionStatus,
  getOrCreateDiscoverySessionForLead,
  type DiscoveryWorkspaceSession,
} from '@/lib/admin/discovery';
import { getBaseOfferPrimaryAction } from '@/lib/admin/commercial-next-action';
import { formatDatePt, formatLeadActivity } from '@/lib/admin/formatters';
import { getLeadById } from '@/lib/admin/queries';

type DiscoveryPageProps = {
  params: Promise<{ id: string }>;
};

type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLeadById>>>;
type LeadBaseOffer = LeadDetail['baseOffers'][number];
type LeadProposal = LeadDetail['proposals'][number];
type LeadSubmission = LeadDetail['submissions'][number];

type FieldRow = {
  label: string;
  value: string;
};

const discoverySessionTextFields = [
  { name: 'summary', label: 'Resumo da Discovery' },
  { name: 'decisionMakers', label: 'Decisores' },
  { name: 'urgency', label: 'Urgência' },
  { name: 'budgetRange', label: 'Orçamento ou intervalo discutido' },
  { name: 'technicalComplexity', label: 'Complexidade técnica' },
  { name: 'confirmedScope', label: 'Âmbito confirmado' },
  { name: 'nextSteps', label: 'Próximos passos' },
] as const;

/**
 * Renders the dedicated Discovery workspace for a lead.
 *
 * @param props Route params with lead id.
 * @returns Discovery workspace page.
 */
export default async function LeadDiscoveryPage({ params }: DiscoveryPageProps) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  const baseOffer = lead.baseOffers[0] ?? null;
  const discoverySession = baseOffer ? await getOrCreateDiscoverySessionForLead(lead.id) : null;
  const displayBaseOffer = baseOffer && discoverySession && baseOffer.status === 'INTERNAL_DRAFT'
    ? { ...baseOffer, status: 'DISCOVERY_PREPARATION' as LeadBaseOffer['status'] }
    : baseOffer;
  const preMeetingSubmission = getPreMeetingSubmission(lead.submissions, displayBaseOffer);
  const completionChecklist = buildDiscoveryCompletionChecklist(displayBaseOffer, discoverySession);
  const proposalReadiness = buildProposalReadinessChecklist({
    baseOffer: displayBaseOffer,
    discoverySession,
    submission: preMeetingSubmission,
  });
  const finalProposal = selectActiveFinalProposal(lead.proposals, displayBaseOffer);
  const hasFinalProposal = Boolean(finalProposal);

  return (
    <div className="admin-page-grid discovery-workspace-page">
      <AdminPanel
        title="Preparação da Discovery"
        subtitle="Use a Oferta Base, o contexto submetido pelo cliente e as perguntas sugeridas para conduzir a reunião e preparar a Proposta Final."
        action={<Link className="admin-button admin-button-muted" href={`/admin/leads/${lead.id}`}>Voltar &agrave; Lead</Link>}
      >
        <div className="discovery-hero-grid">
          <div className="discovery-hero-copy">
            <span className="admin-badge admin-badge-blue discovery-status-badge">
              {discoverySession ? formatDiscoverySessionStatus(discoverySession.status) : displayBaseOffer ? formatBaseOfferStatus(displayBaseOffer.status) : 'Sem Oferta Base'}
            </span>
            <h1>{lead.company || 'Empresa por definir'}</h1>
            <p>{lead.name || 'Contacto por definir'} · {lead.email || 'Email não indicado'}</p>
          </div>
          <div className="discovery-hero-badges">
            <LeadStatusBadge status={lead.status} />
            <LeadPriorityBadge priority={lead.priority} />
          </div>
        </div>
      </AdminPanel>

      <section className="discovery-workspace-layout">
        {discoverySession ? (
          <DiscoveryWorkspaceSaveForm discoverySessionId={discoverySession.id} hasBaseOffer={Boolean(displayBaseOffer)} leadId={lead.id}>
            <LeadSummaryPanel lead={lead} />
            <PreMeetingSubmissionPanel submission={preMeetingSubmission} />
            <BaseOfferWorkspacePanel baseOffer={displayBaseOffer} />
            <DiscoveryQuestionsPanel baseOffer={displayBaseOffer} discoverySession={discoverySession} />
            <DiscoveryNotesPanel baseOffer={displayBaseOffer} discoverySession={discoverySession} />
            <NextStepsPanel baseOffer={displayBaseOffer} />
          </DiscoveryWorkspaceSaveForm>
        ) : (
          <div className="admin-page-grid">
            <LeadSummaryPanel lead={lead} />
            <PreMeetingSubmissionPanel submission={preMeetingSubmission} />
            <BaseOfferWorkspacePanel baseOffer={displayBaseOffer} />
            <DiscoveryQuestionsPanel baseOffer={displayBaseOffer} discoverySession={discoverySession} />
            <DiscoveryNotesPanel baseOffer={displayBaseOffer} discoverySession={discoverySession} />
            <NextStepsPanel baseOffer={displayBaseOffer} />
          </div>
        )}

        <aside className="admin-page-grid discovery-workspace-aside">
          <DiscoveryStatePanel baseOffer={displayBaseOffer} checklist={completionChecklist} discoverySession={discoverySession} finalProposal={finalProposal} hasFinalProposal={hasFinalProposal} leadId={lead.id} />
          <ProposalReadinessPanel checklist={proposalReadiness} />
          <DiscoveryActivityPanel activities={lead.activities.slice(0, 5)} />
        </aside>
      </section>
    </div>
  );
}

function LeadSummaryPanel({ lead }: { lead: LeadDetail }) {
  return (
    <AdminPanel title="Resumo da Lead" subtitle="Contexto comercial rápido para abrir a reunião.">
      <div className="admin-field-grid">
        <AdminField label="Empresa" value={safeText(lead.company)} />
        <AdminField label="Contacto" value={safeText(lead.name)} />
        <AdminField label="Email" value={safeText(lead.email, 'Não indicado')} />
        <AdminField label="Telefone" value={safeText(lead.phone, 'Não indicado')} />
        <AdminField label="Estado" value={<LeadStatusBadge status={lead.status} />} />
        <AdminField label="Prioridade" value={<LeadPriorityBadge priority={lead.priority} />} />
        <AdminField label="Origem" value={safeText(lead.source)} />
        <AdminField label="Website" value={safeText(lead.website, 'Não indicado')} />
        <AdminField label="Criada em" value={formatDatePt(lead.createdAt)} />
        <AdminField label="Atualizada" value={formatDatePt(lead.updatedAt)} />
      </div>
    </AdminPanel>
  );
}

function PreMeetingSubmissionPanel({ submission }: { submission: LeadSubmission | null }) {
  if (!submission) {
    return (
      <AdminPanel title="Contexto submetido pelo cliente" subtitle="Snapshot read-only do formulário pré-reunião.">
        <AdminEmptyState>Ainda não existe contexto submetido pelo cliente.</AdminEmptyState>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel
      title="Contexto submetido pelo cliente"
      subtitle={`Submissão recebida em ${formatDatePt(submission.createdAt)}.`}
      action={<Link className="admin-link" href={`/admin/submissions/${submission.id}`}>Abrir submissão</Link>}
    >
      <div className="discovery-readonly-grid">
        {buildPreMeetingRows(submission).map((row) => (
          <ReadOnlyItem key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </AdminPanel>
  );
}

function BaseOfferWorkspacePanel({ baseOffer }: { baseOffer: LeadBaseOffer | null }) {
  if (!baseOffer) {
    return (
      <AdminPanel title="Oferta Base completa" subtitle="Hipótese interna a validar durante a Discovery.">
        <AdminEmptyState>
          Ainda não existe Oferta Base para esta Lead. A Oferta Base é normalmente gerada automaticamente após a submissão do formulário pré-reunião.
        </AdminEmptyState>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel
      title="Oferta Base completa"
      subtitle="Edite os campos principais e consulte os elementos gerados automaticamente."
      action={<span className="admin-badge admin-badge-blue">{formatBaseOfferStatus(baseOffer.status)}</span>}
    >
      <div className="manual-intake-form discovery-base-offer-form">
        <input name="baseOfferId" type="hidden" value={baseOffer.id} />
        <label className="manual-intake-admin-field"><span>Resumo do problema</span><textarea className="admin-textarea" name="baseOfferProblemSummary" defaultValue={baseOffer.problemSummary ?? ''} /></label>
        <label className="manual-intake-admin-field"><span>Processo a automatizar</span><textarea className="admin-textarea" name="baseOfferProcessToAutomate" defaultValue={baseOffer.processToAutomate ?? ''} /></label>
        <label className="manual-intake-admin-field"><span>Solução sugerida</span><textarea className="admin-textarea" name="baseOfferSuggestedSolution" defaultValue={baseOffer.suggestedSolution ?? ''} /></label>
        <div className="manual-intake-two-cols">
          <label className="manual-intake-admin-field"><span>Ferramentas mencionadas</span><input className="admin-input" name="baseOfferToolsMentioned" defaultValue={baseOffer.toolsMentioned ?? ''} /></label>
          <label className="manual-intake-admin-field"><span>Intervalo de preço inicial</span><input className="admin-input" name="baseOfferInitialPriceRange" defaultValue={baseOffer.initialPriceRange ?? ''} /></label>
        </div>
        <label className="manual-intake-admin-field"><span>Âmbito estimado</span><textarea className="admin-textarea" name="baseOfferEstimatedScope" defaultValue={baseOffer.estimatedScope ?? ''} /></label>
        <label className="manual-intake-admin-field"><span>Racional de preço</span><textarea className="admin-textarea" name="baseOfferPricingRationale" defaultValue={baseOffer.pricingRationale ?? ''} /></label>
      </div>

      <div className="discovery-cardlet-grid">
        <ReadOnlyItem label="Módulos recomendados" value={formatJsonList(baseOffer.recommendedModules).join('\n')} />
        <ReadOnlyItem label="Oportunidades de automação" value={formatJsonList(baseOffer.automationOpportunities).join('\n')} />
        <ReadOnlyItem label="Riscos ou informação em falta" value={formatJsonList(baseOffer.risksOrMissingInfo).join('\n')} />
      </div>
    </AdminPanel>
  );
}

function DiscoveryQuestionsPanel({ baseOffer, discoverySession }: { baseOffer: LeadBaseOffer | null; discoverySession: DiscoveryWorkspaceSession | null }) {
  return (
    <AdminPanel title="Perguntas sugeridas para Discovery" subtitle="Guia de conversa transformado em respostas estruturadas para a Proposta Final.">
      {!baseOffer ? (
        <AdminEmptyState>Crie ou receba uma Oferta Base antes de guardar respostas de Discovery.</AdminEmptyState>
      ) : discoverySession && discoverySession.questions.length > 0 ? (
        <DiscoveryQuestionsForm questions={discoverySession.questions} />
      ) : (
        <AdminEmptyState>
          Ainda não existem perguntas sugeridas para esta discovery. As perguntas serão geradas a partir da Oferta Base quando existir contexto suficiente.
        </AdminEmptyState>
      )}
    </AdminPanel>
  );
}

function DiscoveryNotesPanel({ baseOffer, discoverySession }: { baseOffer: LeadBaseOffer | null; discoverySession: DiscoveryWorkspaceSession | null }) {
  if (!baseOffer || !discoverySession) {
    return (
      <AdminPanel title="Notas da reunião" subtitle="Respostas e validações recolhidas durante a Discovery.">
        <AdminEmptyState>Crie ou receba uma Oferta Base antes de guardar notas de Discovery.</AdminEmptyState>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel title="Notas da reunião" subtitle="Estas notas são guardadas na Discovery estruturada da Lead.">
      <div className="manual-intake-form">
        <input name="discoverySessionId" type="hidden" value={discoverySession.id} />
        <div className="manual-intake-two-cols">
          <label className="manual-intake-admin-field">
            <span>Data da reunião</span>
            <input className="admin-input" name="meetingDate" type="date" defaultValue={formatDateInput(discoverySession.meetingDate)} />
          </label>
          {discoverySessionTextFields.map((field) => (
            <label className="manual-intake-admin-field" key={field.name}>
              <span>{field.label}</span>
              <textarea className="admin-textarea" name={field.name === 'nextSteps' ? 'sessionNextSteps' : field.name} defaultValue={stringifyValue(discoverySession[field.name])} />
            </label>
          ))}
        </div>
      </div>
    </AdminPanel>
  );
}

function NextStepsPanel({ baseOffer }: { baseOffer: LeadBaseOffer | null }) {
  if (!baseOffer) {
    return (
      <AdminPanel
        title="Próximos passos"
        subtitle="Defina as ações a seguir após a discovery para preparar a Proposta Final, alinhar expectativas e manter o avanço comercial claro."
      >
        <AdminEmptyState>Ainda não existem próximos passos definidos.</AdminEmptyState>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel
      title="Próximos passos"
      subtitle="Defina as ações a seguir após a discovery para preparar a Proposta Final, alinhar expectativas e manter o avanço comercial claro."
    >
      <div className="manual-intake-form discovery-next-steps-form">
        <input name="baseOfferId" type="hidden" value={baseOffer.id} />
        <label className="manual-intake-admin-field">
          <span>Próximos passos acordados</span>
          <textarea
            className="admin-textarea discovery-next-steps-textarea"
            defaultValue={baseOffer.nextSteps ?? ''}
            name="baseOfferNextSteps"
            placeholder="Ex.: Preparar Proposta Final, confirmar dados legais, agendar reunião de fecho e identificar acessos técnicos necessários."
          />
        </label>
        {!baseOffer.nextSteps?.trim() ? (
          <p className="discovery-next-steps-empty">Ainda não existem próximos passos definidos.</p>
        ) : null}
      </div>
    </AdminPanel>
  );
}

function DiscoveryStatePanel({
  baseOffer,
  checklist,
  discoverySession,
  finalProposal,
  hasFinalProposal,
  leadId,
}: {
  baseOffer: LeadBaseOffer | null;
  checklist: DiscoveryCompletionChecklist;
  discoverySession: DiscoveryWorkspaceSession | null;
  finalProposal: LeadProposal | null;
  hasFinalProposal: boolean;
  leadId: string;
}) {
  const discoveryCompleted = discoverySession?.status === 'COMPLETED';
  const proposalAlreadyConverted = baseOffer?.status === 'CONVERTED_TO_PROPOSAL';
  const convertedWithoutProposal = proposalAlreadyConverted && !finalProposal;
  const primaryAction = getBaseOfferPrimaryAction({
    baseOfferStatus: baseOffer?.status,
    discoverySessionStatus: discoverySession?.status,
    finalProposalId: finalProposal?.id,
    hasDiscoverySession: Boolean(discoverySession),
    hasFinalProposal,
    leadId,
  });
  const canGenerateProposal = Boolean(baseOffer && primaryAction.type === 'GENERATE_FINAL_PROPOSAL');
  const canGenerateWithWarning = Boolean(baseOffer && !finalProposal && !proposalAlreadyConverted && primaryAction.needsWarning);

  return (
    <AdminPanel title="Ações principais" subtitle="Estado e próximos movimentos comerciais.">
      <div className="discovery-state-stack">
        <AdminField label="Estado da Discovery" value={discoverySession ? formatDiscoverySessionStatus(discoverySession.status) : 'Sem Discovery'} />
        <AdminField label="Estado da Oferta Base" value={baseOffer ? formatBaseOfferStatus(baseOffer.status) : 'Sem Oferta Base'} />
        <AdminField label="Proposta Final" value={hasFinalProposal ? 'Proposta Final já criada' : 'Ainda não criada'} />

        {finalProposal && !discoveryCompleted ? (
          <div className="discovery-warning">
            <p>A Proposta Final j&aacute; existe, mas a Discovery ainda n&atilde;o foi marcada como conclu&iacute;da.</p>
          </div>
        ) : null}

        {convertedWithoutProposal ? (
          <div className="discovery-warning">
            <p>A Oferta Base est&aacute; marcada como convertida, mas n&atilde;o foi encontrada uma proposta associada.</p>
          </div>
        ) : null}

        {checklist.hasMissingRequiredInfo && !discoveryCompleted ? (
          <div className="discovery-warning">
            <p>Ainda existem informa&ccedil;&otilde;es importantes por preencher antes de concluir a discovery.</p>
            <p>Pode concluir a discovery mesmo assim, mas recomenda-se preencher estes dados antes de gerar a Proposta Final.</p>
            <div className="discovery-missing-list">
              <span>Por preencher:</span>
              <ul>
                {checklist.missing.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="base-offer-summary-actions">
          {finalProposal ? (
            <FinalProposalLink href={`/admin/proposals/${finalProposal.id}`} />
          ) : null}
          {discoverySession && !finalProposal ? (
            <CompleteDiscoveryForm
              baseOfferId={baseOffer?.id}
              disabled={discoveryCompleted}
              discoverySessionId={discoverySession.id}
              leadId={leadId}
            />
          ) : null}
          {discoverySession && finalProposal && !discoveryCompleted ? (
            <CompleteDiscoveryForm
              baseOfferId={baseOffer?.id}
              discoverySessionId={discoverySession.id}
              leadId={leadId}
              submitLabel="Concluir Discovery"
              variant="secondary"
            />
          ) : null}
          {baseOffer && canGenerateProposal ? (
            <GenerateFinalProposalForm baseOfferId={baseOffer.id} label={primaryAction.label} />
          ) : null}
          {canGenerateWithWarning && baseOffer ? (
            <GenerateFinalProposalWithWarning
              baseOfferId={baseOffer.id}
              discoveryHref={`/admin/leads/${leadId}/discovery`}
            />
          ) : null}
          {proposalAlreadyConverted && finalProposal ? <span className="admin-badge">Convertida em proposta</span> : null}
          <Link className="admin-button admin-button-muted" href={`/admin/leads/${leadId}`}>Voltar &agrave; Lead</Link>
        </div>
      </div>
    </AdminPanel>
  );
}
type ProposalReadinessSource = 'DISCOVERY' | 'BASE_OFFER' | 'SUBMISSION' | 'LEAD';

type ProposalReadinessItem = {
  key: string;
  label: string;
  isComplete: boolean;
  source?: ProposalReadinessSource;
  helperText?: string;
};

type ProposalReadinessChecklist = {
  items: ProposalReadinessItem[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  isReady: boolean;
};

function ProposalReadinessPanel({ checklist }: { checklist: ProposalReadinessChecklist }) {
  return (
    <AdminPanel
      title="Prontidão para proposta"
      subtitle="Confirme se a informação essencial já está validada antes de avançar para a Proposta Final."
      action={<span className="admin-badge admin-badge-blue proposal-readiness-count">{checklist.completedCount}/{checklist.totalCount}</span>}
    >
      <div className="proposal-readiness">
        <div className="proposal-readiness-progress" aria-label={`${checklist.percentage}% pronto para proposta`}>
          <span style={{ width: `${checklist.percentage}%` }} />
        </div>
        <p className="proposal-readiness-summary">{checklist.percentage}% pronto para proposta</p>

        <div className="discovery-checklist proposal-readiness-list">
          {checklist.items.map((item) => (
            <div
              className={item.isComplete ? 'discovery-checklist-item discovery-checklist-item-done' : 'discovery-checklist-item'}
              key={item.key}
            >
              <span aria-hidden="true">{item.isComplete ? '✓' : '·'}</span>
              <p>
                {item.label}
                {item.source ? <small>{formatReadinessSource(item.source)}</small> : null}
              </p>
            </div>
          ))}
        </div>

        {checklist.isReady ? (
          <div className="proposal-readiness-message proposal-readiness-message-ready">
            A Discovery tem informação suficiente para preparar uma Proposta Final mais completa.
          </div>
        ) : null}
      </div>
    </AdminPanel>
  );
}

function formatReadinessSource(source: ProposalReadinessSource): string {
  const labels: Record<ProposalReadinessSource, string> = {
    DISCOVERY: 'Discovery',
    BASE_OFFER: 'Oferta Base',
    SUBMISSION: 'Formulário',
    LEAD: 'Lead',
  };

  return labels[source];
}
function DiscoveryActivityPanel({ activities }: { activities: LeadDetail['activities'] }) {
  return (
    <AdminPanel title="Atividade recente" subtitle="Últimos eventos desta Lead.">
      {activities.length > 0 ? (
        <div className="admin-row-list">
          {activities.map((activity) => {
            const activityDisplay = formatLeadActivity(activity);

            return (
              <AdminRow key={activity.id} title={activityDisplay.title} meta={formatDatePt(activity.createdAt)}>
                {activityDisplay.description}
              </AdminRow>
            );
          })}
        </div>
      ) : (
        <AdminEmptyState>Sem atividade recente.</AdminEmptyState>
      )}
    </AdminPanel>
  );
}

function ReadOnlyItem({ label, value }: FieldRow) {
  return (
    <div className="discovery-readonly-item">
      <span>{label}</span>
      <p>{value || 'Por definir'}</p>
    </div>
  );
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
function getPreMeetingSubmission(submissions: LeadSubmission[], baseOffer: LeadBaseOffer | null): LeadSubmission | null {
  if (baseOffer?.submissionId) {
    const linked = submissions.find((submission) => submission.id === baseOffer.submissionId);
    if (linked) return linked;
  }

  return submissions.find((submission) => submission.type === 'PRE_MEETING_INTAKE') ?? null;
}

function buildPreMeetingRows(submission: LeadSubmission): FieldRow[] {
  const payload = toRecord(submission.payload);

  return [
    { label: 'Nome do contacto', value: payloadString(payload, 'contactName') },
    { label: 'Email', value: payloadString(payload, 'email') },
    { label: 'Telefone', value: payloadString(payload, 'phone') },
    { label: 'Empresa', value: payloadString(payload, 'companyName') },
    { label: 'Setor de atividade', value: payloadString(payload, 'businessArea') },
    { label: 'Website ou redes sociais', value: payloadString(payload, 'websiteOrSocials', 'Não indicado') },
    { label: 'Problema principal', value: payloadString(payload, 'mainProblem', 'Ainda sem informação') },
    { label: 'Processo a automatizar', value: payloadString(payload, 'processToAutomate') },
    { label: 'Ferramentas atuais', value: payloadString(payload, 'currentTools') },
    { label: 'Objetivo da solução', value: payloadString(payload, 'solutionObjective') },
    { label: 'Notas adicionais', value: payloadString(payload, 'notes', 'Não indicado') },
  ];
}

type DiscoveryCompletionChecklist = {
  completed: string[];
  missing: string[];
  hasMissingRequiredInfo: boolean;
};

function buildProposalReadinessChecklist({
  baseOffer,
  discoverySession,
  submission,
}: {
  baseOffer: LeadBaseOffer | null;
  discoverySession: DiscoveryWorkspaceSession | null;
  submission: LeadSubmission | null;
}): ProposalReadinessChecklist {
  const payload = submission ? toRecord(submission.payload) : {};
  const questions = discoverySession?.questions ?? [];
  const hasQuestion = (...categories: Array<DiscoveryWorkspaceSession['questions'][number]['category']>) =>
    categories.some((category) => hasAnsweredQuestionByCategory(questions, category));
  const item = (
    key: string,
    label: string,
    candidates: Array<[boolean, ProposalReadinessSource]>,
  ): ProposalReadinessItem => {
    const match = candidates.find(([complete]) => complete);

    return {
      key,
      label,
      isComplete: Boolean(match),
      source: match?.[1],
      helperText: match ? undefined : 'Por preencher',
    };
  };

  const items: ProposalReadinessItem[] = [
    item('problem', 'Problema validado', [
      [hasMeaningfulText(discoverySession?.summary), 'DISCOVERY'],
      [hasQuestion('PROCESS', 'IMPACT'), 'DISCOVERY'],
      [hasMeaningfulText(baseOffer?.problemSummary), 'BASE_OFFER'],
    ]),
    item('process', 'Processo confirmado', [
      [hasMeaningfulText(discoverySession?.confirmedScope), 'DISCOVERY'],
      [hasQuestion('PROCESS'), 'DISCOVERY'],
      [hasMeaningfulText(baseOffer?.processToAutomate), 'BASE_OFFER'],
    ]),
    item('tools', 'Ferramentas identificadas', [
      [hasQuestion('TOOLS'), 'DISCOVERY'],
      [hasMeaningfulText(baseOffer?.toolsMentioned), 'BASE_OFFER'],
      [hasMeaningfulText(payloadString(payload, 'currentTools', '')), 'SUBMISSION'],
    ]),
    item('decision', 'Decisor identificado', [
      [hasMeaningfulText(discoverySession?.decisionMakers), 'DISCOVERY'],
      [hasQuestion('DECISION'), 'DISCOVERY'],
    ]),
    item('urgency', 'Urgência validada', [
      [hasMeaningfulText(discoverySession?.urgency), 'DISCOVERY'],
      [hasQuestion('URGENCY'), 'DISCOVERY'],
    ]),
    item('scope', 'Escopo inicial definido', [
      [hasMeaningfulText(discoverySession?.confirmedScope), 'DISCOVERY'],
      [hasMeaningfulScopeText(baseOffer?.estimatedScope), 'BASE_OFFER'],
      [hasQuestion('PROCESS', 'INTEGRATIONS'), 'DISCOVERY'],
    ]),
    item('risks', 'Riscos anotados', [
      [hasQuestion('RISKS'), 'DISCOVERY'],
      [formatJsonList(baseOffer?.risksOrMissingInfo).some(hasMeaningfulRiskText), 'BASE_OFFER'],
    ]),
    item('nextSteps', 'Próximos passos definidos', [
      [hasMeaningfulText(discoverySession?.nextSteps), 'DISCOVERY'],
      [hasMeaningfulNextStepsText(baseOffer?.nextSteps), 'BASE_OFFER'],
      [hasQuestion('NEXT_STEPS'), 'DISCOVERY'],
    ]),
  ];

  const completedCount = items.filter((readinessItem) => readinessItem.isComplete).length;
  const totalCount = items.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    items,
    completedCount,
    totalCount,
    percentage,
    isReady: completedCount === totalCount,
  };
}
function buildDiscoveryCompletionChecklist(
  baseOffer: LeadBaseOffer | null,
  discoverySession: DiscoveryWorkspaceSession | null,
): DiscoveryCompletionChecklist {
  const answeredToolsQuestion = discoverySession ? hasAnsweredQuestionByCategory(discoverySession.questions, 'TOOLS') : false;
  const items = [
    { label: 'Problema validado', done: hasMeaningfulText(discoverySession?.summary) || hasMeaningfulText(baseOffer?.problemSummary) },
    { label: 'Processo principal confirmado', done: hasMeaningfulText(discoverySession?.confirmedScope) || hasMeaningfulText(baseOffer?.processToAutomate) },
    { label: 'Ferramentas atuais confirmadas', done: hasMeaningfulText(baseOffer?.toolsMentioned) || answeredToolsQuestion },
    { label: 'Decisor identificado', done: hasMeaningfulText(discoverySession?.decisionMakers) },
    { label: 'Urgência identificada', done: hasMeaningfulText(discoverySession?.urgency) },
    { label: 'Próximos passos definidos', done: hasMeaningfulText(discoverySession?.nextSteps) || hasMeaningfulNextStepsText(baseOffer?.nextSteps) },
  ];

  const completed = items.filter((item) => item.done).map((item) => item.label);
  const missing = items.filter((item) => !item.done).map((item) => item.label);

  return { completed, missing, hasMissingRequiredInfo: missing.length > 0 };
}
function formatJsonList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.trim() ? [value.trim()] : [];
  }

  return [];
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

  return labels[status] ?? formatUnknownStatus(status);
}

function formatUnknownStatus(status: string): string {
  const readable = status
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return readable || 'Estado desconhecido';
}

function formatDateInput(value?: Date | null): string {
  if (!value) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function hasAnsweredQuestionByCategory(
  questions: DiscoveryWorkspaceSession['questions'],
  category: DiscoveryWorkspaceSession['questions'][number]['category'],
): boolean {
  return questions.some((question) => (
    question.category === category &&
    question.status === 'ANSWERED' &&
    hasMeaningfulText(question.answer)
  ));
}

function hasMeaningfulText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = normalizeChecklistText(value);
  if (!normalized) return false;

  const invalidPlaceholders = [
    'por definir',
    'a definir',
    'a validar',
    'a validar apos discovery',
    'a validar após discovery',
    'a validar com o cliente',
    'ainda sem informacao',
    'ainda sem informação',
    'ainda sem informacao registada',
    'ainda sem informação registada',
    'nao indicado',
    'não indicado',
    'sem dados registados',
    'sem informacao',
    'sem informação',
    'sem informacao registada',
    'sem informação registada',
    'n/a',
    'null',
    'undefined',
  ];

  return !invalidPlaceholders.includes(normalized);
}

function hasMeaningfulScopeText(value: unknown): boolean {
  if (!hasMeaningfulText(value)) return false;
  if (typeof value !== 'string') return false;
  const normalized = normalizeChecklistText(value);

  return !normalized.includes('diagnostico desenho do fluxo prototipo operacional validacao com equipa interna');
}

function hasMeaningfulRiskText(value: unknown): boolean {
  if (!hasMeaningfulText(value)) return false;
  if (typeof value !== 'string') return false;
  const normalized = normalizeChecklistText(value);
  const genericRiskTexts = [
    'confirmar qualidade e disponibilidade dos dados atuais',
    'validar permissoes de acesso as ferramentas mencionadas',
    'validar permissões de acesso às ferramentas mencionadas',
    'confirmar decisores urgencia e orcamento antes de fechar ambito',
    'confirmar decisores urgência e orçamento antes de fechar âmbito',
    'confirmar dados',
    'por confirmar',
  ];

  return !genericRiskTexts.some((placeholder) => normalized.includes(normalizeChecklistText(placeholder)));
}

function hasMeaningfulNextStepsText(value: unknown): boolean {
  if (!hasMeaningfulText(value)) return false;
  if (typeof value !== 'string') return false;
  const normalized = normalizeChecklistText(value);

  return !normalized.includes('usar esta oferta base para preparar a reuniao de discovery');
}

function normalizeChecklistText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function payloadString(record: Record<string, unknown>, key: string, fallback = 'Por definir'): string {
  return stringifyValue(record[key]) || fallback;
}

function safeText(value?: string | null, fallback = 'Por definir'): string {
  return value?.trim() || fallback;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
