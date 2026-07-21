'use client';

import { Children, isValidElement, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Check, ChevronLeft, ChevronRight, Lock, Plus, Save, Trash2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import type { ContractPlan, ContractSectionCategory, ContractServiceType } from '@/app/generated/prisma/client';
import {
 CONTRACT_PLAN_LABELS,
 CONTRACT_PLANS,
 CONTRACT_SECTION_CATEGORY_LABELS,
 CONTRACT_SERVICE_TYPE_LABELS,
 CONTRACT_SERVICE_TYPES,
 INCLUDED_SERVICE_OPTIONS,
 PAYMENT_PLAN_OPTIONS,
 PHASE_PRESETS,
} from '@/lib/contracts/constants';
import { Norm8DateTimePicker } from '@/components/ui/norm8-date-time-picker';
import { Norm8Select } from '@/components/ui/norm8-select';
import { formatContractValue } from '@/lib/contracts/formatters';
import { getContractScopeTemplate } from '@/lib/contracts/wizard/scope-templates';
import { getContractTimelineTemplate, type ContractTimelineTemplatePhase } from '@/lib/contracts/wizard/timeline-templates';
import {
 CONTRACT_WIZARD_STEP_IDS,
 CLIENT_LEGAL_DRAFT_WARNING_FIELDS,
 PROVIDER_LEGAL_DRAFT_WARNING_FIELDS,
 SCOPE_DRAFT_WARNING_FIELDS,
 SERVICE_DRAFT_WARNING_FIELDS,
 TIMELINE_DRAFT_WARNING_FIELDS,
 formatStepValidationErrors,
 normalizeBasicPortugueseTaxId,
 validateContractWizard,
 validateContractWizardField,
 validateContractWizardStep,
 type ContractWizardValidationError,
} from '@/lib/contracts/wizard/validation';

type LeadOption = {
 id: string;
 company: string;
 name: string | null;
 email: string;
 phone: string | null;
 website: string | null;
};

type ProposalOption = {
 id: string;
 title: string;
 leadId: string;
 companyName: string;
 contactName: string | null;
 estimatedValue: string | null;
 painPoints: string | null;
 recommendedSolution: string | null;
 implementationPlan: string | null;
 nextSteps: string | null;
 createdAt?: string;
 updatedAt?: string;
};

type AdminOption = {
 id: string;
 name: string | null;
 email: string;
};

type LegalSettingsOption = {
 legalName: string;
 tradeName: string;
 taxId: string;
 address: string;
 email: string;
 phone: string;
 website: string;
 representative: string;
 representativeRole: string;
 iban: string;
 bankName: string;
 swiftBic: string | null;
} | null;

type TemplateOption = {
 id: string;
 name: string;
 version: number;
 sections: Array<{
 id: string;
 category: ContractSectionCategory;
 title: string;
 content: string;
 order: number;
 isRequired: boolean;
 version: number;
 }>;
};

export type ContractWizardPayload = {
 title: string;
 client: {
 leadId?: string | null;
 proposalId?: string | null;
 tradeName?: string | null;
 legalName?: string | null;
 taxId?: string | null;
 fiscalAddress?: string | null;
 postalCode?: string | null;
 city?: string | null;
 country?: string | null;
 email?: string | null;
 phone?: string | null;
 representative?: string | null;
 representativeRole?: string | null;
 representativeEmail?: string | null;
 projectName?: string | null;
 };
 provider: NonNullable<LegalSettingsOption>;
 service: {
 serviceType?: ContractServiceType | null;
 serviceTypeOther?: string | null;
 plan?: ContractPlan | null;
 includesLaunch: boolean;
 includesOperate: boolean;
 includesScale: boolean;
 includedServices: string[];
 };
 scope: Record<string, string | null | undefined>;
 deliverables: Array<{
 title: string;
 description?: string | null;
 phase?: string | null;
 status?: string | null;
 estimatedDate?: string | null;
 responsible?: string | null;
 acceptanceCriteria?: string | null;
 }>;
 phases: Array<{
 name: string;
 phaseType?: string | null;
 startsAt?: string | null;
 endsAt?: string | null;
 duration?: string | null;
 description?: string | null;
 dependencies?: string | null;
 paymentMilestone?: string | null;
 approvalCriteria?: string | null;
 }>;
 financials: Record<string, string | boolean | null | undefined>;
 paymentMilestones: Array<{
 percentage?: string | null;
 amount?: string | null;
 invoiceMoment?: string | null;
 expectedDate?: string | null;
 description?: string | null;
 status?: string | null;
 billingCondition?: string | null;
 }>;
 sections: Array<{
 id?: string | null;
 templateSectionId?: string | null;
 category: ContractSectionCategory;
 title: string;
 content: string;
 order: number;
 isRequired: boolean;
 enabled: boolean;
 sourceVersion?: number | null;
 }>;
 assignedToId?: string | null;
 validUntil?: string | null;
};

type ContractWizardProps = {
 action: (formData: FormData) => void | Promise<void>;
 admins: AdminOption[];
 contractId?: string;
 initialPayload?: ContractWizardPayload;
 currentAdminId?: string | null;
 isEditable?: boolean;
 leads: LeadOption[];
 legalSettings: LegalSettingsOption;
 mode: 'create' | 'edit';
 proposals: ProposalOption[];
 templates: TemplateOption[];
};

const steps = [
 'Cliente e origem',
 'Dados da Norm8',
 'Serviço e plano',
 'Âmbito e entregáveis',
 'Cronograma',
 'Investimento',
 'Cláusulas',
 'Revisão',
] as const;

export function ContractWizard({
 action,
 admins,
 contractId,
 initialPayload,
 currentAdminId,
 isEditable = true,
 leads,
 legalSettings,
 mode,
 proposals,
 templates,
}: ContractWizardProps) {
 const fallbackProvider = legalSettings ?? {
 legalName: 'Norm8, Lda. (por preencher)',
 tradeName: 'Norm8',
 taxId: 'PT000000000',
 address: 'Morada legal por preencher',
 email: 'hello@norm8.pt',
 phone: '+351 000 000 000',
 website: 'https://norm8.pt',
 representative: 'Representante por preencher',
 representativeRole: 'Cargo por preencher',
 iban: 'PT50 0000 0000 0000 0000 0000 0',
 bankName: 'Banco por preencher',
 swiftBic: null,
 };
 const [currentStep, setCurrentStep] = useState(0);
 const [proposalTouched, setProposalTouched] = useState(Boolean(initialPayload?.client.proposalId));
 const [autoProposalNote, setAutoProposalNote] = useState<string | null>(null);
 const [validationAttempted, setValidationAttempted] = useState(false);
 const [stepErrors, setStepErrors] = useState<Partial<Record<number, ContractWizardValidationError[]>>>({});
 const [navigationNotice, setNavigationNotice] = useState<string | null>(null);
 const [pendingTimelineOverwrite, setPendingTimelineOverwrite] = useState(false);
 const [payload, setPayload] = useState<ContractWizardPayload>(
 initialPayload ?? createInitialPayload(fallbackProvider, templates[0], currentAdminId),
 );

 const selectedLead = useMemo(
 () => leads.find((lead) => lead.id === payload.client.leadId) ?? null,
 [leads, payload.client.leadId],
 );
 const selectedProposal = useMemo(
 () => proposals.find((proposal) => proposal.id === payload.client.proposalId) ?? null,
 [proposals, payload.client.proposalId],
 );
 const enabledSections = payload.sections.filter((section) => section.enabled);
 const reviewWarnings = buildReviewWarnings(payload);
 const currentStepErrors = stepErrors[currentStep] ?? [];
 const currentErrors = buildFieldErrorMap(currentStepErrors);
 const currentStepHasErrors = currentStepErrors.some((error) => error.blocking);
 const shouldShowNavigationNotice = Boolean(navigationNotice) && currentStepHasErrors;

 function setPayloadWithLiveValidation(updater: (current: ContractWizardPayload) => ContractWizardPayload): void {
 setPayload((current) => {
 const nextPayload = updater(current);
 revalidateVisibleErrors(nextPayload);
 return nextPayload;
 });
 }

 function updatePayload(next: Partial<ContractWizardPayload>) {
 setPayloadWithLiveValidation((current) => ({ ...current, ...next }));
 }

 function updateClient(key: keyof ContractWizardPayload['client'], value: string | null) {
 setPayloadWithLiveValidation((current) => ({ ...current, client: { ...current.client, [key]: value } }));
 }

 function updateProvider(key: keyof ContractWizardPayload['provider'], value: string | null) {
 setPayloadWithLiveValidation((current) => ({ ...current, provider: { ...current.provider, [key]: value ?? '' } }));
 }

 function updateService(key: keyof ContractWizardPayload['service'], value: string | boolean | string[] | null) {
 setPayloadWithLiveValidation((current) => ({ ...current, service: { ...current.service, [key]: value } }));
 }

 function updateScope(key: string, value: string) {
 setPayloadWithLiveValidation((current) => ({ ...current, scope: { ...current.scope, [key]: value } }));
 }

 function updateFinancial(key: string, value: string | boolean | null) {
 setPayloadWithLiveValidation((current) => ({ ...current, financials: { ...current.financials, [key]: value } }));
 }

 function revalidateVisibleErrors(nextPayload: ContractWizardPayload): void {
 const currentStepId = CONTRACT_WIZARD_STEP_IDS[currentStep];
 const nextCurrentStepErrors = currentStepId ? validateContractWizardStep(currentStepId, nextPayload) : [];

 if (!nextCurrentStepErrors.some((error) => error.blocking)) {
 setNavigationNotice(null);
 }

 setStepErrors((current) => refreshVisibleStepErrors(current, nextPayload));
}


function handleFieldBlur(field: string | null): void {
 if (!field) return;

 const nextFieldErrors = validateContractWizardField(CONTRACT_WIZARD_STEP_IDS[currentStep], field, payload);
 setStepErrors((current) => {
 const next = mergeFieldValidationErrors(current, currentStep, field, nextFieldErrors);
 const nextCurrentStepErrors = next[currentStep] ?? [];
 if (!nextCurrentStepErrors.some((error) => error.blocking)) setNavigationNotice(null);
 return next;
 });
 if (nextFieldErrors.some((error) => error.blocking)) setValidationAttempted(true);
}

function handleFormBlur(event: React.FocusEvent<HTMLFormElement>): void {
 const target = event.target instanceof HTMLElement ? event.target : null;
 const field = target?.closest<HTMLElement>('[data-contract-field]')?.dataset.contractField ?? null;
 handleFieldBlur(field);
}

function selectLead(leadId: string) {
 const lead = leads.find((item) => item.id === leadId);
 const latestProposal = lead && !proposalTouched ? findLatestProposalForLead(proposals, lead.id) : null;
 setAutoProposalNote(latestProposal ? 'Proposta mais recente associada automaticamente.' : null);
 setPayloadWithLiveValidation((current) => {
 const basePayload: ContractWizardPayload = {
 ...current,
 client: {
 ...current.client,
 leadId: leadId || null,
 tradeName: lead?.company ?? current.client.tradeName,
 legalName: lead?.company ?? current.client.legalName,
 email: lead?.email ?? current.client.email,
 phone: lead?.phone ?? current.client.phone,
 representative: lead?.name ?? current.client.representative,
 representativeEmail: lead?.email ?? current.client.representativeEmail,
 proposalId: proposalTouched ? current.client.proposalId : latestProposal?.id ?? null,
 },
 };
 return latestProposal ? applyProposalToPayload(basePayload, latestProposal) : basePayload;
 });
}

function selectProposal(proposalId: string) {
 const proposal = proposals.find((item) => item.id === proposalId);
 setProposalTouched(true);
 setAutoProposalNote(null);
 setPayloadWithLiveValidation((current) => applyProposalToPayload({
 ...current,
 client: { ...current.client, proposalId: proposalId || null },
 }, proposal));
}

function toggleIncludedService(service: string, checked: boolean) {
 setPayloadWithLiveValidation((current) => ({
 ...current,
 service: {
 ...current.service,
 includedServices: checked
 ? Array.from(new Set([...current.service.includedServices, service]))
 : current.service.includedServices.filter((item) => item !== service),
 },
 }));
}

function applyTemplate(templateId: string) {
 const template = templates.find((item) => item.id === templateId);
 if (!template) return;
 updatePayload({ sections: mapTemplateSections(template) });
}

function attemptNavigateToStep(targetStep: number) {
 const normalizedTarget = Math.max(0, Math.min(steps.length - 1, targetStep));

 if (normalizedTarget <= currentStep) {
 setNavigationNotice(null);
 setCurrentStep(normalizedTarget);
 return;
 }

 const firstInvalidStep = findFirstInvalidStepBefore(normalizedTarget, payload);
 if (firstInvalidStep !== null) {
 const stepId = CONTRACT_WIZARD_STEP_IDS[firstInvalidStep];
 const errors = validateContractWizardStep(stepId, payload);

 setValidationAttempted(true);
 setNavigationNotice('Complete este passo antes de avançar para os seguintes.');
 setStepErrors((current) => ({ ...current, [firstInvalidStep]: errors }));
 setCurrentStep(firstInvalidStep);
 focusFirstInvalidField(errors);
 return;
 }

 setNavigationNotice(null);
 if (normalizedTarget === 3) applyScopeTemplateSuggestions();
 if (normalizedTarget === 4) applyTimelineTemplate(false);
 setCurrentStep(normalizedTarget);
}

function applyScopeTemplateSuggestions() {
 setPayloadWithLiveValidation((current) => {
 const selectedPhases = [
 current.service.includesLaunch ? 'Launch' : null,
 current.service.includesOperate ? 'Operate' : null,
 current.service.includesScale ? 'Scale' : null,
 ].filter((phase): phase is string => Boolean(phase));
 const template = getContractScopeTemplate({
 serviceType: current.service.serviceType,
 customServiceType: current.service.serviceTypeOther,
 plan: current.service.plan,
 selectedPhases,
 selectedServices: current.service.includedServices,
 });
 const shouldReplaceDeliverables = current.deliverables.length === 0 || current.deliverables.every(isBlankDeliverable);

 return {
 ...current,
 scope: {
 ...current.scope,
 executiveSummary: fillIfBlank(current.scope.executiveSummary, template.executiveSummary),
 projectObjective: fillIfBlank(current.scope.projectObjective, template.projectObjective),
 identifiedProblems: fillIfBlank(current.scope.identifiedProblems, template.identifiedProblems),
 proposedSolution: fillIfBlank(current.scope.proposedSolution, template.proposedSolution),
 includedScope: fillIfBlank(current.scope.includedScope, template.includedScope),
 excludedScope: fillIfBlank(current.scope.excludedScope, template.excludedScope),
 acceptanceCriteria: fillIfBlank(current.scope.acceptanceCriteria, template.acceptanceCriteria),
 },
 deliverables: mergeDeliverablesWithTemplate(current.deliverables, template.deliverables, shouldReplaceDeliverables),
 };
 });
}

function applyTimelineTemplate(overwrite: boolean) {
 setPayloadWithLiveValidation((current) => {
 const selectedPhases = [
 current.service.includesLaunch ? 'LAUNCH' : null,
 current.service.includesOperate ? 'OPERATE' : null,
 current.service.includesScale ? 'SCALE' : null,
 ].filter((phase): phase is string => Boolean(phase));
 const template = getContractTimelineTemplate({
 serviceType: current.service.serviceType,
 customServiceType: current.service.serviceTypeOther,
 plan: current.service.plan,
 validityDate: current.validUntil,
 selectedPhases,
 selectedServices: current.service.includedServices,
 deliverables: current.deliverables,
 includedScope: current.scope.includedScope,
 acceptanceCriteria: current.scope.acceptanceCriteria,
 });
 const shouldReplaceTimeline = overwrite || current.phases.length === 0 || current.phases.every(isBlankPhase);
 return { ...current, phases: mergePhasesWithTemplate(current.phases, template, shouldReplaceTimeline) };
 });
}

function requestTimelineTemplate() {
 if (payload.phases.length > 0 && !payload.phases.every(isBlankPhase)) {
 setPendingTimelineOverwrite(true);
 return;
 }
 applyTimelineTemplate(false);
}

function goToNextStep() {
 attemptNavigateToStep(currentStep + 1);
}

function handleSubmit(event: FormEvent<HTMLFormElement>) {
 const submitter = (event.nativeEvent as SubmitEvent).submitter;
 const isExplicitPersistence = submitter instanceof HTMLElement && submitter.dataset.contractPersist === 'true';

 if (!isExplicitPersistence) {
 event.preventDefault();
 return;
 }

 const allErrorsByStepId = validateContractWizard(payload);
 const allErrors = Object.fromEntries(
 CONTRACT_WIZARD_STEP_IDS.map((stepId, index) => [index, allErrorsByStepId[stepId].filter(isDraftBlockingValidationError)]),
 ) as Partial<Record<number, ContractWizardValidationError[]>>;
 const firstInvalidStep = findFirstInvalidStep(allErrors);

 if (firstInvalidStep !== null) {
 event.preventDefault();
 setValidationAttempted(true);
 setStepErrors(allErrors);
 setCurrentStep(firstInvalidStep);
 focusFirstInvalidField(allErrors[firstInvalidStep] ?? []);
 }
}

return (
 <form action={action} className="admin-page-grid" onBlurCapture={handleFormBlur} onSubmit={handleSubmit} noValidate>
 {contractId ? <input name="contractId" type="hidden" value={contractId} /> : null}
 <input name="wizardPayload" type="hidden" value={JSON.stringify(payload)} />

 {!isEditable ? (
 <div className="admin-execution-summary admin-execution-summary-danger">
 <strong>Contrato bloqueado para edição direta</strong>
 <span>Este contrato já saiu do estado de rascunho/revisão. As alterações futuras devem usar fluxo de versão ou scope change.</span>
 </div>
 ) : null}

 <div className="contract-wizard-progress">
 {steps.map((step, index) => {
 const hasErrors = stepErrors[index]?.some((error) => error.blocking) ?? false;
 const isDone = index < currentStep && !hasErrors;
 const isLocked = index > currentStep && findFirstInvalidStepBefore(index, payload) !== null;

 return (
 <button
 aria-disabled={isLocked || undefined}
 className={`contract-wizard-step ${index === currentStep ? 'contract-wizard-step-active' : ''} ${isDone ? 'contract-wizard-step-done' : ''} ${hasErrors ? 'contract-wizard-step-error' : ''} ${isLocked ? 'contract-wizard-step-locked' : ''}`}
 key={step}
 onClick={(event) => { event.preventDefault(); attemptNavigateToStep(index); }}
 title={isLocked ? 'Passo bloqueado até concluir os anteriores.' : undefined}
 type="button"
 >
 <span>{hasErrors ? <AlertTriangle size={13} /> : isLocked ? <Lock size={13} /> : isDone ? <Check size={13} /> : index + 1}</span>
 {step}
 </button>
 );
 })}
 </div>

 <section className="contract-wizard-panel">
 {shouldShowNavigationNotice ? (
 <div className="admin-execution-summary admin-execution-summary-danger">
 <strong>Complete os passos anteriores antes de continuar.</strong>
 <span>{navigationNotice}</span>
 </div>
 ) : null}
 {validationAttempted && currentStepHasErrors ? <ContractStepValidationSummary errors={currentStepErrors} /> : null}

 {currentStep === 0 ? (
 <WizardStep title="Cliente e origem" subtitle="Escolhe a lead/proposta e completa o snapshot comercial.">
 <div className="admin-grid-2">
 <Select error={currentErrors['client.leadId']} field="client.leadId" label="Lead associada" placeholder="Sem lead associada" value={payload.client.leadId ?? ''} onChange={selectLead}>
 <option value="">Sem lead associada</option>
 {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company} - {lead.email}</option>)}
 </Select>
 <Select label="Proposta associada" value={payload.client.proposalId ?? ''} onChange={selectProposal}>
 <option value="">Sem proposta associada</option>
 {proposals.map((proposal) => <option key={proposal.id} value={proposal.id}>{proposal.companyName} - {proposal.title}</option>)}
 </Select>
 </div>
 {autoProposalNote ? <p className="contract-wizard-note">{autoProposalNote}</p> : null}
 <div className="admin-grid-2">
 <Field error={currentErrors.title} field="title" label="Título do contrato" value={payload.title} onChange={(value) => updatePayload({ title: value })} required />
 <Field error={currentErrors['client.projectName']} field="client.projectName" label="Nome do projeto" value={payload.client.projectName ?? ''} onChange={(value) => updateClient('projectName', value)} required />
 <Field error={currentErrors['client.tradeName']} field="client.tradeName" label="Nome comercial" value={payload.client.tradeName ?? ''} onChange={(value) => updateClient('tradeName', value)} required />
 <Field error={currentErrors['client.legalName']} field="client.legalName" label="Denominação social" value={payload.client.legalName ?? ''} onChange={(value) => updateClient('legalName', value)} required />
 <Field error={currentErrors['client.taxId']} field="client.taxId" label="NIF" value={payload.client.taxId ?? ''} onChange={(value) => updateClient('taxId', normalizeBasicPortugueseTaxId(value))} required />
 <Field error={currentErrors['client.email']} field="client.email" label="Email" value={payload.client.email ?? ''} onChange={(value) => updateClient('email', value)} required />
 <Field label="Telefone" value={payload.client.phone ?? ''} onChange={(value) => updateClient('phone', value)} />
 <Field error={currentErrors['client.representative']} field="client.representative" label="Nome do representante" value={payload.client.representative ?? ''} onChange={(value) => updateClient('representative', value)} required />
 <Field error={currentErrors['client.representativeRole']} field="client.representativeRole" label="Cargo do representante" value={payload.client.representativeRole ?? ''} onChange={(value) => updateClient('representativeRole', value)} required />
 <Field error={currentErrors['client.representativeEmail']} field="client.representativeEmail" label="Email do representante" value={payload.client.representativeEmail ?? ''} onChange={(value) => updateClient('representativeEmail', value)} required />
 </div>
 <TextArea error={currentErrors['client.fiscalAddress']} field="client.fiscalAddress" label="Morada fiscal" value={payload.client.fiscalAddress ?? ''} onChange={(value) => updateClient('fiscalAddress', value)} required />
 <div className="admin-grid-2">
 <Field error={currentErrors['client.postalCode']} field="client.postalCode" label="Código postal" value={payload.client.postalCode ?? ''} onChange={(value) => updateClient('postalCode', value)} required />
 <Field error={currentErrors['client.city']} field="client.city" label="Localidade" value={payload.client.city ?? ''} onChange={(value) => updateClient('city', value)} required />
 <Select error={currentErrors['client.country']} field="client.country" label="País" value={payload.client.country ?? ''} onChange={(value) => updateClient('country', value)} required>{countryOptions}</Select>
 <Select error={currentErrors.assignedToId} field="assignedToId" label="Responsável interno" value={payload.assignedToId ?? ''} onChange={(value) => updatePayload({ assignedToId: value || null })} required>
 <option value="">Sem responsável definido</option>
 {admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name ?? admin.email}</option>)}
 </Select>
 </div>
 </WizardStep>
 ) : null}

 {currentStep === 1 ? (
 <WizardStep title="Dados da Norm8" subtitle="Snapshot do prestador usado no contrato.">
 <div className="admin-grid-2">
 {providerFields.map((field) => (
 <Field key={field.key} error={currentErrors[`provider.${field.key}`]} field={`provider.${field.key}`} label={field.label} value={String(payload.provider[field.key] ?? '')} onChange={(value) => updateProvider(field.key, field.key === 'taxId' ? normalizeBasicPortugueseTaxId(value) : value)} required={field.required} />
 ))}
 </div>
 <div className="admin-execution-summary">
 <strong>Dados legais</strong>
 <span>Para alterar a fonte permanente, use Definições legais da empresa. Aqui fica guardado o snapshot deste contrato.</span>
 </div>
 </WizardStep>
 ) : null}

 {currentStep === 2 ? (
 <WizardStep title="Serviço e plano" subtitle="Define o tipo de contrato, plano e serviços incluídos.">
 <div className="admin-grid-2">
 <Select error={currentErrors['service.serviceType']} field="service.serviceType" label="Tipo de serviço" value={payload.service.serviceType ?? ''} onChange={(value) => updateService('serviceType', value || null)} required><option value="">Por definir</option>{CONTRACT_SERVICE_TYPES.map((type) => <option key={type} value={type}>{CONTRACT_SERVICE_TYPE_LABELS[type]}</option>)}</Select>
 <Select error={currentErrors['service.plan']} field="service.plan" label="Plano" value={payload.service.plan ?? ''} onChange={(value) => updateService('plan', value || null)} required><option value="">Por definir</option>{CONTRACT_PLANS.map((plan) => <option key={plan} value={plan}>{CONTRACT_PLAN_LABELS[plan]}</option>)}</Select>
 <Field error={currentErrors['service.serviceTypeOther']} field="service.serviceTypeOther" label="Outro tipo de serviço" value={payload.service.serviceTypeOther ?? ''} onChange={(value) => updateService('serviceTypeOther', value)} required={payload.service.serviceType === 'OTHER'} />
 <DateField error={currentErrors.validUntil} field="validUntil" label="Validade" value={payload.validUntil ?? ''} onChange={(value) => updatePayload({ validUntil: value })} required />
 </div>
 <CheckGroup error={currentErrors['service.phases']} field="service.phases">
 <label className="contract-check"><input checked={payload.service.includesLaunch} onChange={(event) => updateService('includesLaunch', event.target.checked)} type="checkbox" />Launch</label>
 <label className="contract-check"><input checked={payload.service.includesOperate} onChange={(event) => updateService('includesOperate', event.target.checked)} type="checkbox" />Operate</label>
 <label className="contract-check"><input checked={payload.service.includesScale} onChange={(event) => updateService('includesScale', event.target.checked)} type="checkbox" />Scale</label>
 </CheckGroup>
 <InlineFieldError field="service.phases" message={currentErrors['service.phases']} />
 <CheckGroup error={currentErrors['service.includedServices']} field="service.includedServices">
 {INCLUDED_SERVICE_OPTIONS.map((service) => <label className="contract-check" key={service}><input checked={payload.service.includedServices.includes(service)} onChange={(event) => toggleIncludedService(service, event.target.checked)} type="checkbox" />{service}</label>)}
 </CheckGroup>
 <InlineFieldError field="service.includedServices" message={currentErrors['service.includedServices']} />
 </WizardStep>
 ) : null}

 {currentStep === 3 ? (
 <WizardStep title="Âmbito e entregáveis" subtitle="Regista o que entra, o que fica fora e os entregáveis principais.">
 <div className="admin-execution-summary"><strong>Sugestões automáticas</strong><span>Preenche campos vazios com base no tipo de serviço, plano, fases e serviços incluídos no passo anterior.</span><button className="admin-button admin-button-muted" onClick={(event) => { event.preventDefault(); applyScopeTemplateSuggestions(); }} type="button">Preencher com base no serviço</button></div>
 <TextArea label="Resumo executivo" value={payload.scope.executiveSummary ?? ''} onChange={(value) => updateScope('executiveSummary', value)} />
 <TextArea error={currentErrors['scope.projectObjective']} field="scope.projectObjective" label="Objetivo do projeto" value={payload.scope.projectObjective ?? ''} onChange={(value) => updateScope('projectObjective', value)} required />
 <TextArea label="Problemas identificados" value={payload.scope.identifiedProblems ?? ''} onChange={(value) => updateScope('identifiedProblems', value)} />
 <TextArea error={currentErrors['scope.proposedSolution']} field="scope.proposedSolution" label="Solução proposta" value={payload.scope.proposedSolution ?? ''} onChange={(value) => updateScope('proposedSolution', value)} required />
 <TextArea error={currentErrors['scope.includedScope']} field="scope.includedScope" label="Âmbito incluído" value={payload.scope.includedScope ?? ''} onChange={(value) => updateScope('includedScope', value)} required />
 <TextArea error={currentErrors['scope.excludedScope']} field="scope.excludedScope" label="Âmbito excluído" value={payload.scope.excludedScope ?? ''} onChange={(value) => updateScope('excludedScope', value)} required />
 <TextArea error={currentErrors['scope.acceptanceCriteria']} field="scope.acceptanceCriteria" label="Critérios de aceitação gerais" value={payload.scope.acceptanceCriteria ?? ''} onChange={(value) => updateScope('acceptanceCriteria', value)} required />
 <InlineFieldError field="deliverables" message={currentErrors.deliverables} />
 <DynamicList addLabel="Adicionar entregável" confirmRemoveLabel="Remover entregável" confirmRemoveMessage="Tem a certeza de que pretende remover este entregável?" items={payload.deliverables} onAdd={() => updatePayload({ deliverables: [...payload.deliverables, createDeliverable()] })} onChange={(items) => updatePayload({ deliverables: items })} render={(item, index, update) => (
 <div className={`admin-page-grid ${hasDeliverableValidationErrors(currentErrors, index) ? 'contract-deliverable-error' : ''}`}>
 <div className="admin-grid-2">
 <Field error={currentErrors[`deliverables.${index}.title`]} field={`deliverables.${index}.title`} label="Entregável" value={item.title} onChange={(value) => update(index, { title: value })} required />
 <Select error={currentErrors[`deliverables.${index}.phase`]} field={`deliverables.${index}.phase`} label="Fase" value={item.phase ?? ''} onChange={(value) => update(index, { phase: value || null })} required>{phaseOptions}</Select>
 <DateField error={currentErrors[`deliverables.${index}.estimatedDate`]} field={`deliverables.${index}.estimatedDate`} label="Data estimada" value={item.estimatedDate ?? ''} onChange={(value) => update(index, { estimatedDate: value })} required />
 <Field error={currentErrors[`deliverables.${index}.responsible`]} field={`deliverables.${index}.responsible`} label="Responsável" value={item.responsible ?? ''} onChange={(value) => update(index, { responsible: value })} required />
 </div>
 <TextArea error={currentErrors[`deliverables.${index}.description`]} field={`deliverables.${index}.description`} label="Descrição" value={item.description ?? ''} onChange={(value) => update(index, { description: value })} required />
 <TextArea error={currentErrors[`deliverables.${index}.acceptanceCriteria`]} field={`deliverables.${index}.acceptanceCriteria`} label="Critérios de aceitação" value={item.acceptanceCriteria ?? ''} onChange={(value) => update(index, { acceptanceCriteria: value })} required />
 </div>
 )} />
 </WizardStep>
 ) : null}

 {currentStep === 4 ? (
 <WizardStep title="Cronograma" subtitle="Organiza fases, entregáveis associados e critérios de conclusão.">
 <div className="admin-execution-summary"><strong>Cronograma inteligente</strong><span>Cronograma sugerido com base no serviço, fases e entregáveis definidos. Pode editar todos os campos antes de criar o contrato.</span><button className="admin-button admin-button-muted" onClick={(event) => { event.preventDefault(); requestTimelineTemplate(); }} type="button">Preencher cronograma automaticamente</button></div>
 <div className="admin-filters">{PHASE_PRESETS.map((preset) => <button className="admin-button admin-button-muted" key={preset} onClick={() => updatePayload({ phases: [...payload.phases, createPhase(preset)] })} type="button"><Plus size={14} />{preset}</button>)}</div>
 <InlineFieldError field="phases" message={currentErrors.phases} />
 <DynamicList addLabel="Adicionar fase" confirmRemoveLabel="Remover fase" confirmRemoveMessage="Tem a certeza de que pretende remover esta fase do cronograma?" items={payload.phases} onAdd={() => updatePayload({ phases: [...payload.phases, createPhase()] })} onChange={(items) => updatePayload({ phases: items })} render={(item, index, update) => (
 <div className={`admin-page-grid ${hasPhaseValidationErrors(currentErrors, index) ? 'contract-deliverable-error' : ''}`}>
 <div className="admin-grid-2">
 <Field error={currentErrors[`phases.${index}.name`]} field={`phases.${index}.name`} label="Nome da fase" value={item.name} onChange={(value) => update(index, { name: value })} required />
 <Select error={currentErrors[`phases.${index}.phaseType`]} field={`phases.${index}.phaseType`} label="Tipo" value={item.phaseType ?? ''} onChange={(value) => update(index, { phaseType: value || null })}>{phaseOptions}</Select>
 <DateField error={currentErrors[`phases.${index}.startsAt`]} field={`phases.${index}.startsAt`} label="Data de início" value={item.startsAt ?? ''} onChange={(value) => update(index, { startsAt: value })} required />
 <DateField error={currentErrors[`phases.${index}.endsAt`]} field={`phases.${index}.endsAt`} label="Data de fim" value={item.endsAt ?? ''} onChange={(value) => update(index, { endsAt: value })} required />
 <Field error={currentErrors[`phases.${index}.duration`]} field={`phases.${index}.duration`} label="Duração estimada" value={item.duration ?? ''} onChange={(value) => update(index, { duration: value })} required />
 <Field error={currentErrors[`phases.${index}.paymentMilestone`]} field={`phases.${index}.paymentMilestone`} label="Responsável" value={item.paymentMilestone ?? ''} onChange={(value) => update(index, { paymentMilestone: value })} required />
 </div>
 <TextArea error={currentErrors[`phases.${index}.description`]} field={`phases.${index}.description`} label="Descrição" value={item.description ?? ''} onChange={(value) => update(index, { description: value })} required />
 <TextArea error={currentErrors[`phases.${index}.dependencies`]} field={`phases.${index}.dependencies`} label="Entregáveis associados" value={item.dependencies ?? ''} onChange={(value) => update(index, { dependencies: value })} required />
 <TextArea error={currentErrors[`phases.${index}.approvalCriteria`]} field={`phases.${index}.approvalCriteria`} label="Critérios de conclusão" value={item.approvalCriteria ?? ''} onChange={(value) => update(index, { approvalCriteria: value })} required />
 </div>
 )} />
 <Dialog.Root open={pendingTimelineOverwrite} onOpenChange={setPendingTimelineOverwrite}>
 <Dialog.Portal>
 <Dialog.Overlay className="contract-dialog-overlay" />
 <Dialog.Content className="contract-dialog-content">
 <Dialog.Title className="admin-panel-title">Reaplicar cronograma automático?</Dialog.Title>
 <Dialog.Description className="admin-row-text">O cronograma já tem dados. A sugestão só completa campos em falta e não substitui texto, datas ou responsáveis já preenchidos.</Dialog.Description>
 <div className="contract-dialog-actions">
 <Dialog.Close className="admin-button admin-button-muted" type="button">Cancelar</Dialog.Close>
 <button className="admin-button" onClick={() => { applyTimelineTemplate(false); setPendingTimelineOverwrite(false); }} type="button">Completar campos em falta</button>
 <button className="admin-button admin-action-execute-button-danger" onClick={() => { applyTimelineTemplate(true); setPendingTimelineOverwrite(false); }} type="button"><AlertTriangle size={14} />Substituir cronograma</button>
 </div>
 </Dialog.Content>
 </Dialog.Portal>
 </Dialog.Root>
 </WizardStep>
 ) : null}

 {currentStep === 5 ? (
 <WizardStep title="Investimento e pagamentos" subtitle="Valores comerciais, impostos, validade e marcos de faturação.">
 <div className="admin-grid-2"><Field label="Valor comercial" inputMode="decimal" value={String(payload.financials.commercialValue ?? '')} onChange={(value) => updateFinancial('commercialValue', value)} /><Field label="Desconto" inputMode="decimal" value={String(payload.financials.discount ?? '')} onChange={(value) => updateFinancial('discount', value)} /><Field error={currentErrors['financials.finalValue']} field="financials.finalValue" label="Valor final" inputMode="decimal" value={String(payload.financials.finalValue ?? '')} onChange={(value) => updateFinancial('finalValue', value)} /><Field label="IVA (%)" inputMode="decimal" value={String(payload.financials.vatRate ?? '')} onChange={(value) => updateFinancial('vatRate', value)} /><Field label="Valor com IVA" inputMode="decimal" value={String(payload.financials.valueWithVat ?? '')} onChange={(value) => updateFinancial('valueWithVat', value)} /><Select error={currentErrors['financials.currency']} field="financials.currency" label="Moeda" value={String(payload.financials.currency ?? 'EUR')} onChange={(value) => updateFinancial('currency', value)}><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option></Select><Select error={currentErrors['financials.paymentPlan']} field="financials.paymentPlan" label="Plano de pagamento" value={String(payload.financials.paymentPlan ?? '')} onChange={(value) => updateFinancial('paymentPlan', value)}><option value="">Por definir</option>{PAYMENT_PLAN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select><Field label="Data limite de pagamento" type="date" value={String(payload.financials.paymentDueDate ?? '')} onChange={(value) => updateFinancial('paymentDueDate', value)} /></div>
 <DynamicList addLabel="Adicionar pagamento" items={payload.paymentMilestones} onAdd={() => updatePayload({ paymentMilestones: [...payload.paymentMilestones, createPayment()] })} onChange={(items) => updatePayload({ paymentMilestones: items })} render={(item, index, update) => <div className="admin-page-grid"><div className="admin-grid-2"><Field label="Percentagem" inputMode="decimal" value={item.percentage ?? ''} onChange={(value) => update(index, { percentage: value })} /><Field label="Montante" inputMode="decimal" value={item.amount ?? ''} onChange={(value) => update(index, { amount: value })} /><Field label="Momento de faturação" value={item.invoiceMoment ?? ''} onChange={(value) => update(index, { invoiceMoment: value })} /><Field label="Data prevista" type="date" value={item.expectedDate ?? ''} onChange={(value) => update(index, { expectedDate: value })} /></div><TextArea label="Descrição" value={item.description ?? ''} onChange={(value) => update(index, { description: value })} /><TextArea label="Condição de faturação" value={item.billingCondition ?? ''} onChange={(value) => update(index, { billingCondition: value })} /></div>} />
 </WizardStep>
 ) : null}

 {currentStep === 6 ? (
 <WizardStep title="Cláusulas e condições" subtitle="Seleciona e ajusta as secções que entram no contrato.">
 <div className="admin-grid-2"><Select label="Aplicar template" value="" onChange={applyTemplate}><option value="">Escolher template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} v{template.version}</option>)}</Select><div className="admin-execution-summary"><strong>{enabledSections.length} cláusulas ativas</strong><span>As alterações ficam guardadas no contrato como snapshot independente do template.</span></div></div>
 <DynamicList addLabel="Adicionar cláusula" items={payload.sections} onAdd={() => updatePayload({ sections: [...payload.sections, createSection(payload.sections.length + 1)] })} onChange={(items) => updatePayload({ sections: items.map((item, index) => ({ ...item, order: index + 1 })) })} render={(item, index, update) => <div className="admin-page-grid"><div className="admin-grid-2"><label className="contract-check"><input checked={item.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} type="checkbox" />Incluir cláusula</label><label className="contract-check"><input checked={item.isRequired} onChange={(event) => update(index, { isRequired: event.target.checked })} type="checkbox" />Obrigatória</label><Field error={currentErrors[`sections.${index}.title`]} field={`sections.${index}.title`} label="Título" value={item.title} onChange={(value) => update(index, { title: value })} required /><Select label="Categoria" value={item.category} onChange={(value) => update(index, { category: value as ContractSectionCategory })}>{Object.entries(CONTRACT_SECTION_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div><TextArea error={currentErrors[`sections.${index}.content`]} field={`sections.${index}.content`} label="Conteúdo" value={item.content} onChange={(value) => update(index, { content: value })} required /></div>} />
 </WizardStep>
 ) : null}

 {currentStep === 7 ? (
 <WizardStep title="Revisão" subtitle="Confirma o rascunho antes de guardar.">
 {reviewWarnings.length > 0 ? <div className="admin-execution-summary admin-execution-summary-danger"><strong>Pontos a rever</strong>{reviewWarnings.map((warning) => <span key={warning}>{warning}</span>)}</div> : <div className="admin-execution-summary"><strong>Pronto para guardar</strong><span>O rascunho tem os dados essenciais para a Fase 2.</span></div>}
 <div className="admin-kpi-grid"><ReviewItem label="Cliente" value={payload.client.legalName ?? payload.client.tradeName ?? selectedLead?.company ?? 'Por definir'} /><ReviewItem label="Projeto" value={payload.client.projectName ?? 'Por definir'} /><ReviewItem label="Plano" value={payload.service.plan ? CONTRACT_PLAN_LABELS[payload.service.plan] : 'Por definir'} /><ReviewItem label="Valor" value={formatContractValue(String(payload.financials.finalValue ?? payload.financials.commercialValue ?? selectedProposal?.estimatedValue ?? ''))} /><ReviewItem label="Entregáveis" value={String(payload.deliverables.length)} /><ReviewItem label="Cláusulas" value={String(enabledSections.length)} /></div>
 </WizardStep>
 ) : null}
 </section>

 <div className="contract-wizard-actions">
 <Link className="admin-button admin-button-muted" href={mode === 'edit' && contractId ? `/admin/contracts/${contractId}` : '/admin/contracts'}><ArrowLeft size={14} />Cancelar</Link>
 <div className="admin-filters"><button className="admin-button admin-button-muted" disabled={currentStep === 0} onClick={(event) => { event.preventDefault(); setNavigationNotice(null); setCurrentStep((step) => Math.max(0, step - 1)); }} type="button"><ChevronLeft size={14} />Anterior</button>{currentStep < steps.length - 1 ? <button className="admin-button" onClick={(event) => { event.preventDefault(); goToNextStep(); }} type="button">Seguinte<ChevronRight size={14} /></button> : <button className="admin-button" data-contract-persist="true" disabled={!isEditable} type="submit"><Save size={14} />{mode === 'edit' ? 'Guardar alterações' : 'Criar rascunho'}</button>}</div>
 </div>
 </form>
);
}
function WizardStep({ children, subtitle, title }: { children: React.ReactNode; subtitle: string; title: string }) {
 return (
 <div className="admin-page-grid">
 <div>
 <h2 className="admin-panel-title">{title}</h2>
 <p className="admin-panel-subtitle">{subtitle}</p>
 </div>
 {children}
 </div>
 );
}

function ContractStepValidationSummary({ errors }: { errors: ContractWizardValidationError[] }) {
 const blockingErrors = errors.filter((error) => error.blocking);

 if (blockingErrors.length === 0) return null;

 return (
 <div className="contract-step-validation-summary" role="alert">
 <AlertTriangle size={16} />
 <div>
 <strong>Campos obrigatórios em falta</strong>
 <p>Existem campos obrigatórios por preencher neste passo.</p>
 <p>{formatStepValidationErrors(blockingErrors)}</p>
 <ul>
 {blockingErrors.map((error) => <li key={`${error.field}-${error.message}`}>{error.label}</li>)}
 </ul>
 </div>
 </div>
 );
}

function Field({
 error,
 field,
 inputMode,
 label,
 onChange,
 required,
 type = 'text',
 value,
}: {
 error?: string;
 field?: string;
 inputMode?: 'decimal' | 'numeric';
 label: string;
 onChange: (value: string) => void;
 required?: boolean;
 type?: string;
 value: string;
}) {
 const errorId = field ? `contract-field-error-${field}` : undefined;

 return (
 <label className="admin-form-control" data-contract-field={field}>
 <span>{label}{required ? ' *' : ''}</span>
 <input aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error) || undefined} className={`admin-input ${error ? 'admin-input-error' : ''}`} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} />
 {error ? <span className="admin-field-error" id={errorId}>{error}</span> : null}
 </label>
 );
}

function DateField({ error, field, label, onChange, required, value }: { error?: string; field?: string; label: string; onChange: (value: string | null) => void; required?: boolean; value: string }) {
 const errorId = field ? `contract-field-error-${field}` : undefined;

 return (
 <label className="admin-form-control" data-contract-field={field}>
 <span>{label}{required ? ' *' : ''}</span>
 <Norm8DateTimePicker
 ariaRequired={required}
 clearable
 error={Boolean(error)}
 errorId={errorId}
 mode="date"
 onValueChange={(date) => onChange(date ? formatDateInput(date) : null)}
 placeholder={`Selecionar ${label.toLowerCase()}...`}
 value={parseDateInputValue(value)}
 />
 {error ? <span className="admin-field-error" id={errorId}>{error}</span> : null}
 </label>
 );
}
function TextArea({ error, field, label, onChange, required, value }: { error?: string; field?: string; label: string; onChange: (value: string) => void; required?: boolean; value: string }) {
 const errorId = field ? `contract-field-error-${field}` : undefined;

 return (
 <label className="admin-form-control" data-contract-field={field}>
 <span>{label}{required ? ' *' : ''}</span>
 <textarea aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error) || undefined} className={`admin-textarea ${error ? 'admin-input-error' : ''}`} onChange={(event) => onChange(event.target.value)} required={required} value={value} />
 {error ? <span className="admin-field-error" id={errorId}>{error}</span> : null}
 </label>
 );
}

function Select({
 children,
 description,
 disabled,
 error,
 field,
 label,
 onChange,
 placeholder = 'Selecionar...',
 required,
 value,
}: {
 children: React.ReactNode;
 description?: string;
 disabled?: boolean;
 error?: string;
 field?: string;
 label: string;
 onChange: (value: string) => void;
 placeholder?: string;
 required?: boolean;
 value: string;
}) {
 const options = selectOptionsFromChildren(children);
 const errorId = field ? `contract-field-error-${field}` : undefined;

 return (
 <label className="admin-form-control" data-contract-field={field}>
 <span>{label}{required ? ' *' : ''}</span>
 <Norm8Select
 ariaRequired={required}
 disabled={disabled}
 error={Boolean(error)}
 errorId={errorId}
 onValueChange={onChange}
 options={options}
 placeholder={placeholder}
 value={value}
 />
 {description ? <span className="admin-row-text">{description}</span> : null}
 {error ? <span className="admin-field-error" id={errorId}>{error}</span> : null}
 </label>
 );
}

function InlineFieldError({ field, message }: { field?: string; message?: string }) {
 if (!message) return null;
 return <span className="admin-field-error" data-contract-field={field}>{message}</span>;
}

function CheckGroup({ children, error, field }: { children: React.ReactNode; error?: string; field: string }) {
 return (
 <div
 aria-describedby={error ? `contract-field-error-${field}` : undefined}
 aria-invalid={Boolean(error) || undefined}
 className={`contract-check-grid ${error ? 'contract-check-grid-error' : ''}`}
 data-contract-field={field}
 >
 {children}
 </div>
 );
}
function DynamicList<T>({
 addLabel,
 confirmRemoveLabel = 'Remover item',
 confirmRemoveMessage = 'Tem a certeza de que pretende remover este item?',
 items,
 onAdd,
 onChange,
 render,
}: {
 addLabel: string;
 confirmRemoveLabel?: string;
 confirmRemoveMessage?: string;
 items: T[];
 onAdd: () => void;
 onChange: (items: T[]) => void;
 render: (item: T, index: number, update: (index: number, patch: Partial<T>) => void) => React.ReactNode;
}) {
 const [pendingRemovalIndex, setPendingRemovalIndex] = useState<number | null>(null);

 function update(index: number, patch: Partial<T>) {
 onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
 }

 function confirmRemoval() {
 if (pendingRemovalIndex === null) return;
 onChange(items.filter((_, itemIndex) => itemIndex !== pendingRemovalIndex));
 setPendingRemovalIndex(null);
 }

 return (
 <div className="admin-page-grid">
 <div className="admin-filters">
 <button className="admin-button admin-button-muted" onClick={onAdd} type="button"><Plus size={14} />{addLabel}</button>
 </div>
 {items.length > 0 ? (
 <div className="admin-row-list">
 {items.map((item, index) => (
 <div className="admin-rich-item" key={index}>
 <div className="admin-rich-item-top">
 <p className="admin-row-title">Item {index + 1}</p>
 <button className="admin-icon-button admin-button-muted" onClick={() => setPendingRemovalIndex(index)} type="button" aria-label="Remover">
 <Trash2 size={14} />
 </button>
 </div>
 {render(item, index, update)}
 </div>
 ))}
 </div>
 ) : (
 <p className="admin-row-text">Sem itens definidos.</p>
 )}

 <Dialog.Root open={pendingRemovalIndex !== null} onOpenChange={(open) => { if (!open) setPendingRemovalIndex(null); }}>
 <Dialog.Portal>
 <Dialog.Overlay className="contract-dialog-overlay" />
 <Dialog.Content className="contract-dialog-content">
 <Dialog.Title className="admin-panel-title">Confirmar remoção</Dialog.Title>
 <Dialog.Description className="admin-row-text">{confirmRemoveMessage}</Dialog.Description>
 <div className="contract-dialog-actions">
 <Dialog.Close className="admin-button admin-button-muted" type="button">Cancelar</Dialog.Close>
 <button className="admin-button admin-action-execute-button-danger" onClick={confirmRemoval} type="button">
 <AlertTriangle size={14} />{confirmRemoveLabel}
 </button>
 </div>
 </Dialog.Content>
 </Dialog.Portal>
 </Dialog.Root>
 </div>
 );
}
function ReviewItem({ label, value }: { label: string; value: string }) {
 return (
 <article className="admin-stat-card" style={{ minHeight: 92 }}>
 <p className="admin-stat-label">{label}</p>
 <p className="admin-row-title">{value || 'Por definir'}</p>
 </article>
 );
}


function findLatestProposalForLead(proposals: ProposalOption[], leadId: string): ProposalOption | null {
 const matches = proposals.filter((proposal) => proposal.leadId === leadId);
 if (matches.length === 0) return null;
 return [...matches].sort((a, b) => getProposalTimestamp(b) - getProposalTimestamp(a) || b.id.localeCompare(a.id))[0] ?? null;
}

function getProposalTimestamp(proposal: ProposalOption): number {
 const updatedAt = proposal.updatedAt ? new Date(proposal.updatedAt).getTime() : NaN;
 if (Number.isFinite(updatedAt)) return updatedAt;
 const createdAt = proposal.createdAt ? new Date(proposal.createdAt).getTime() : NaN;
 return Number.isFinite(createdAt) ? createdAt : 0;
}

function applyProposalToPayload(payload: ContractWizardPayload, proposal?: ProposalOption | null): ContractWizardPayload {
 if (!proposal) return payload;
 return {
 ...payload,
 title: proposal.title ? `Contrato - ${proposal.title}` : payload.title,
 client: {
 ...payload.client,
 proposalId: proposal.id,
 leadId: proposal.leadId ?? payload.client.leadId,
 tradeName: proposal.companyName ?? payload.client.tradeName,
 legalName: proposal.companyName ?? payload.client.legalName,
 representative: proposal.contactName ?? payload.client.representative,
 projectName: proposal.title ?? payload.client.projectName,
 },
 scope: {
 ...payload.scope,
 identifiedProblems: proposal.painPoints ?? payload.scope.identifiedProblems,
 proposedSolution: proposal.recommendedSolution ?? payload.scope.proposedSolution,
 executiveSummary: proposal.implementationPlan ?? payload.scope.executiveSummary,
 projectObjective: proposal.nextSteps ?? payload.scope.projectObjective,
 },
 financials: {
 ...payload.financials,
 commercialValue: proposal.estimatedValue ?? payload.financials.commercialValue,
 finalValue: proposal.estimatedValue ?? payload.financials.finalValue,
 },
 };
}

function refreshVisibleStepErrors(
 current: Partial<Record<number, ContractWizardValidationError[]>>,
 payload: ContractWizardPayload,
): Partial<Record<number, ContractWizardValidationError[]>> {
 let changed = false;
 const next: Partial<Record<number, ContractWizardValidationError[]>> = { ...current };

 Object.entries(current).forEach(([stepIndex, errors]) => {
 const index = Number(stepIndex);
 const stepId = CONTRACT_WIZARD_STEP_IDS[index];
 if (!stepId || !errors || errors.length === 0) return;

 const visibleFields = new Set(errors.map((error) => error.field));
 const refreshedErrors = validateContractWizardStep(stepId, payload).filter((error) => visibleFields.has(error.field));

 if (!areValidationErrorsEqual(errors, refreshedErrors)) {
 next[index] = refreshedErrors;
 changed = true;
 }
 });

 return changed ? next : current;
}

function mergeFieldValidationErrors(
 current: Partial<Record<number, ContractWizardValidationError[]>>,
 stepIndex: number,
 field: string,
 fieldErrors: ContractWizardValidationError[],
): Partial<Record<number, ContractWizardValidationError[]>> {
 const existingStepErrors = current[stepIndex] ?? [];
 const nextStepErrors = [
 ...existingStepErrors.filter((error) => error.field !== field),
 ...fieldErrors,
 ];

 if (existingStepErrors.length === 0 && nextStepErrors.length === 0) return current;
 if (areValidationErrorsEqual(existingStepErrors, nextStepErrors)) return current;

 return { ...current, [stepIndex]: nextStepErrors };
}

function areValidationErrorsEqual(left: ContractWizardValidationError[], right: ContractWizardValidationError[]): boolean {
 if (left.length !== right.length) return false;
 return left.every((error, index) => {
 const other = right[index];
 return Boolean(other) && error.field === other.field && error.message === other.message && error.blocking === other.blocking;
 });
}
function isDraftBlockingValidationError(error: ContractWizardValidationError): boolean {
 return !CLIENT_LEGAL_DRAFT_WARNING_FIELDS.has(error.field)
 && !PROVIDER_LEGAL_DRAFT_WARNING_FIELDS.has(error.field)
 && !SERVICE_DRAFT_WARNING_FIELDS.has(error.field)
 && !SCOPE_DRAFT_WARNING_FIELDS.has(error.field)
 && !TIMELINE_DRAFT_WARNING_FIELDS.has(error.field)
 && !error.field.startsWith('deliverables.')
 && !error.field.startsWith('phases.');
}
function hasDeliverableValidationErrors(errors: Record<string, string>, index: number): boolean {
 return Object.keys(errors).some((field) => field.startsWith(`deliverables.${index}.`));
}
function hasPhaseValidationErrors(errors: Record<string, string>, index: number): boolean {
 return Object.keys(errors).some((field) => field.startsWith(`phases.${index}.`));
}function buildFieldErrorMap(errors: ContractWizardValidationError[]): Record<string, string> {
 return Object.fromEntries(errors.filter((error) => error.blocking).map((error) => [error.field, error.message]));
}

function focusFirstInvalidField(errors: ContractWizardValidationError[]): void {
 const firstField = errors.find((error) => error.blocking)?.field;
 if (!firstField || typeof document === 'undefined') return;

 window.requestAnimationFrame(() => {
 const field = document.querySelector<HTMLElement>(`[data-contract-field="${firstField}"]`);
 const target = field?.querySelector<HTMLElement>('button, input, textarea, [tabindex]') ?? field;

 target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
 target?.focus({ preventScroll: true });
 });
}

function findFirstInvalidStepBefore(targetStep: number, payload: ContractWizardPayload): number | null {
 for (let index = 0; index < targetStep; index += 1) {
 const stepId = CONTRACT_WIZARD_STEP_IDS[index];
 if (!stepId) continue;

 const errors = validateContractWizardStep(stepId, payload);
 if (errors.some((error) => error.blocking)) return index;
 }

 return null;
}
function findFirstInvalidStep(errors: Partial<Record<number, ContractWizardValidationError[]>>): number | null {
 for (let index = 0; index < steps.length; index += 1) {
 if (errors[index]?.some((error) => error.blocking)) return index;
 }
 return null;
}

function selectOptionsFromChildren(children: React.ReactNode): Array<{ value: string; label: string }> {
 return Children.toArray(children).flatMap((child) => {
 if (!isValidElement<{ children?: React.ReactNode; value?: string }>(child)) return [];
 if (child.type === 'option') return [{ value: String(child.props.value ?? ''), label: reactNodeToText(child.props.children) }];
 return selectOptionsFromChildren(child.props.children);
 });
}
function reactNodeToText(node: React.ReactNode): string {
 if (typeof node === 'string' || typeof node === 'number') return String(node);
 if (Array.isArray(node)) return node.map(reactNodeToText).join('');
 return '';
}
function mergeDeliverablesWithTemplate(
  currentDeliverables: ContractWizardPayload['deliverables'],
  templateDeliverables: Array<{
    title: string;
    description: string;
    phase: string;
    estimatedDate: string;
    responsible: string;
    acceptanceCriteria: string;
  }>,
  replaceBlankList: boolean,
): ContractWizardPayload['deliverables'] {
  const mappedTemplate = templateDeliverables.map((item) => ({
    title: item.title,
    description: item.description,
    phase: item.phase,
    status: 'PLANNED',
    estimatedDate: item.estimatedDate,
    responsible: item.responsible,
    acceptanceCriteria: item.acceptanceCriteria,
  }));

  if (replaceBlankList) return mappedTemplate;

  const usedTemplateIndexes = new Set<number>();
  const completedCurrent = currentDeliverables.map((current, index) => {
    const matchedIndex = templateDeliverables.findIndex((template, templateIndex) => !usedTemplateIndexes.has(templateIndex) && areSameDeliverable(current.title, template.title));
    const fallbackIndex = matchedIndex >= 0 ? matchedIndex : index < templateDeliverables.length && !usedTemplateIndexes.has(index) ? index : -1;
    const template = fallbackIndex >= 0 ? templateDeliverables[fallbackIndex] : null;

    if (fallbackIndex >= 0) usedTemplateIndexes.add(fallbackIndex);
    if (!template) return current;

    return {
      ...current,
      title: fillIfBlank(current.title, template.title),
      description: fillIfBlank(current.description, template.description),
      phase: fillIfBlank(current.phase, template.phase),
      status: current.status ?? 'PLANNED',
      estimatedDate: fillIfBlank(current.estimatedDate, template.estimatedDate),
      responsible: fillIfBlank(current.responsible, template.responsible),
      acceptanceCriteria: fillIfBlank(current.acceptanceCriteria, template.acceptanceCriteria),
    };
  });

  const existingTitles = new Set(completedCurrent.map((item) => normalizeDeliverableTitle(item.title)).filter(Boolean));
  const missingTemplateItems = mappedTemplate.filter((item, index) => !usedTemplateIndexes.has(index) && !existingTitles.has(normalizeDeliverableTitle(item.title)));
  return [...completedCurrent, ...missingTemplateItems];
}

function areSameDeliverable(left: string | null | undefined, right: string): boolean {
  return Boolean(normalizeDeliverableTitle(left) && normalizeDeliverableTitle(left) === normalizeDeliverableTitle(right));
}

function normalizeDeliverableTitle(value: string | null | undefined): string {
  return value?.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ?? '';
}
function mergePhasesWithTemplate(
  currentPhases: ContractWizardPayload['phases'],
  templatePhases: ContractTimelineTemplatePhase[],
  replaceTimeline: boolean,
): ContractWizardPayload['phases'] {
  if (replaceTimeline) return templatePhases.map((phase) => ({ ...phase }));
  if (currentPhases.length === 0) return templatePhases.map((phase) => ({ ...phase }));

  const completed = currentPhases.map((current, index) => {
    const template = templatePhases[index] ?? templatePhases.find((phase) => phase.phaseType === current.phaseType) ?? null;
    if (!template) return current;

    return {
      ...current,
      name: fillIfBlank(current.name, template.name),
      phaseType: fillIfBlank(current.phaseType, template.phaseType),
      startsAt: fillIfBlank(current.startsAt, template.startsAt),
      endsAt: fillIfBlank(current.endsAt, template.endsAt),
      duration: fillIfBlank(current.duration, template.duration),
      description: fillIfBlank(current.description, template.description),
      dependencies: fillIfBlank(current.dependencies, template.dependencies),
      paymentMilestone: fillIfBlank(current.paymentMilestone, template.paymentMilestone),
      approvalCriteria: fillIfBlank(current.approvalCriteria, template.approvalCriteria),
    };
  });

  return completed.length >= templatePhases.length ? completed : [...completed, ...templatePhases.slice(completed.length).map((phase) => ({ ...phase }))];
}

function fillIfBlank(currentValue: string | null | undefined, suggestion: string): string {
 return currentValue?.trim() ? currentValue : suggestion;
}

function isBlankPhase(phase: ContractWizardPayload['phases'][number]): boolean {
 return !phase.name?.trim()
 && !phase.description?.trim()
 && !phase.startsAt?.trim()
 && !phase.endsAt?.trim()
 && !phase.duration?.trim()
 && !phase.dependencies?.trim()
 && !phase.paymentMilestone?.trim()
 && !phase.approvalCriteria?.trim();
}

function isBlankDeliverable(deliverable: ContractWizardPayload['deliverables'][number]): boolean {
 return !deliverable.title?.trim()
 && !deliverable.description?.trim()
 && !deliverable.responsible?.trim()
 && !deliverable.acceptanceCriteria?.trim()
 && !deliverable.estimatedDate?.trim();
}

function parseDateInputValue(value: string): Date | null {
 if (!value) return null;
 const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
 if (!match) {
 const fallback = new Date(value);
 return Number.isNaN(fallback.getTime()) ? null : fallback;
 }
 return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

function formatDateInput(date: Date): string {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 const day = String(date.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
}
function defaultValidUntilDate(): string {
 const date = new Date();
 date.setHours(12, 0, 0, 0);
 date.setDate(date.getDate() + 15);
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 const day = String(date.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
}
function createInitialPayload(provider: NonNullable<LegalSettingsOption>, template?: TemplateOption, currentAdminId?: string | null): ContractWizardPayload {
 return {
 title: 'Contrato de prestação de serviços',
 client: { country: 'Portugal' },
 provider,
 service: {
 serviceType: null,
 serviceTypeOther: null,
 plan: null,
 includesLaunch: true,
 includesOperate: false,
 includesScale: false,
 includedServices: ['Discovery', 'Implementação'],
 },
 scope: {},
 deliverables: [createDeliverable()],
 phases: [createPhase('Discovery e arquitetura'), createPhase('Implementação base')],
 financials: { currency: 'EUR', vatRate: '23', paymentPlan: '50_50', operateAutoRenewal: false },
 paymentMilestones: [createPayment('50', 'Adjudicação'), createPayment('50', 'Entrega final')],
 sections: template ? mapTemplateSections(template) : [createSection(1)],
 assignedToId: currentAdminId ?? null,
 validUntil: defaultValidUntilDate(),
 };
}

function createDeliverable() {
 return { title: '', description: '', phase: 'LAUNCH', status: 'PLANNED', estimatedDate: null, responsible: '', acceptanceCriteria: '' };
}

function createPhase(name = '') {
 return { name, phaseType: 'LAUNCH', startsAt: null, endsAt: null, duration: '', description: '', dependencies: '', paymentMilestone: '', approvalCriteria: '' };
}

function createPayment(percentage = '', invoiceMoment = '') {
 return { percentage, amount: '', invoiceMoment, expectedDate: null, description: '', status: 'PENDING', billingCondition: '' };
}

function createSection(order: number) {
 return { category: 'ANNEX' as ContractSectionCategory, title: '', content: '', order, isRequired: false, enabled: true, sourceVersion: 1 };
}

function mapTemplateSections(template: TemplateOption): ContractWizardPayload['sections'] {
 return template.sections.map((section, index) => ({
 templateSectionId: section.id,
 category: section.category,
 title: section.title,
 content: section.content,
 order: index + 1,
 isRequired: section.isRequired,
 enabled: true,
 sourceVersion: section.version,
 }));
}

function buildReviewWarnings(payload: ContractWizardPayload): string[] {
 return [
 !payload.client.legalName && !payload.client.tradeName ? 'Definir nome legal ou comercial do cliente.' : null,
 !payload.client.taxId ? 'O NIF do cliente continua em falta e será necessário antes de gerar o contrato final.' : null,
 !payload.service.serviceType ? 'Escolher o tipo de serviço.' : null,
 !payload.service.plan ? 'Escolher o plano comercial.' : null,
 payload.deliverables.length === 0 ? 'Adicionar pelo menos um entregável.' : null,
 payload.sections.filter((section) => section.enabled).length === 0 ? 'Selecionar pelo menos uma cláusula.' : null,
 !payload.financials.finalValue && !payload.financials.commercialValue ? 'Confirmar valor comercial/final.' : null,
 ].filter((warning): warning is string => Boolean(warning));
}


const countryOptions = (
 <>
 <option value="Portugal">Portugal</option>
 </>
);
const phaseOptions = (
 <>
 <option value="">Por definir</option>
 <option value="LAUNCH">Launch</option>
 <option value="OPERATE">Operate</option>
 <option value="SCALE">Scale</option>
 <option value="OTHER">Outro</option>
 </>
);

const providerFields: Array<{ key: keyof NonNullable<LegalSettingsOption>; label: string; required?: boolean }> = [
 { key: 'legalName', label: 'Nome legal', required: true },
 { key: 'tradeName', label: 'Nome comercial' },
 { key: 'taxId', label: 'NIF', required: true },
 { key: 'address', label: 'Morada fiscal', required: true },
 { key: 'email', label: 'Email', required: true },
 { key: 'phone', label: 'Telefone' },
 { key: 'website', label: 'Website' },
 { key: 'representative', label: 'Nome do representante', required: true },
 { key: 'representativeRole', label: 'Cargo', required: true },
 { key: 'iban', label: 'IBAN' },
 { key: 'bankName', label: 'Banco' },
 { key: 'swiftBic', label: 'SWIFT/BIC' },
];
