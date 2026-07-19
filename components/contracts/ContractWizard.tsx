'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Plus, Save, Trash2 } from 'lucide-react';
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
import { formatContractValue } from '@/lib/contracts/formatters';

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
  'Servico e plano',
  'Ambito e entregaveis',
  'Cronograma',
  'Investimento',
  'Clausulas',
  'Revisao',
] as const;

export function ContractWizard({
  action,
  admins,
  contractId,
  initialPayload,
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
  const [payload, setPayload] = useState<ContractWizardPayload>(
    initialPayload ?? createInitialPayload(fallbackProvider, templates[0]),
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

  function updatePayload(next: Partial<ContractWizardPayload>) {
    setPayload((current) => ({ ...current, ...next }));
  }

  function updateClient(key: keyof ContractWizardPayload['client'], value: string | null) {
    setPayload((current) => ({ ...current, client: { ...current.client, [key]: value } }));
  }

  function updateProvider(key: keyof ContractWizardPayload['provider'], value: string | null) {
    setPayload((current) => ({ ...current, provider: { ...current.provider, [key]: value ?? '' } }));
  }

  function updateService(key: keyof ContractWizardPayload['service'], value: string | boolean | string[] | null) {
    setPayload((current) => ({ ...current, service: { ...current.service, [key]: value } }));
  }

  function updateScope(key: string, value: string) {
    setPayload((current) => ({ ...current, scope: { ...current.scope, [key]: value } }));
  }

  function updateFinancial(key: string, value: string | boolean | null) {
    setPayload((current) => ({ ...current, financials: { ...current.financials, [key]: value } }));
  }

  function selectLead(leadId: string) {
    const lead = leads.find((item) => item.id === leadId);
    setPayload((current) => ({
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
      },
    }));
  }

  function selectProposal(proposalId: string) {
    const proposal = proposals.find((item) => item.id === proposalId);
    setPayload((current) => ({
      ...current,
      title: proposal ? `Contrato - ${proposal.title}` : current.title,
      client: {
        ...current.client,
        proposalId: proposalId || null,
        leadId: proposal?.leadId ?? current.client.leadId,
        tradeName: proposal?.companyName ?? current.client.tradeName,
        legalName: proposal?.companyName ?? current.client.legalName,
        representative: proposal?.contactName ?? current.client.representative,
        projectName: proposal?.title ?? current.client.projectName,
      },
      scope: {
        ...current.scope,
        identifiedProblems: proposal?.painPoints ?? current.scope.identifiedProblems,
        proposedSolution: proposal?.recommendedSolution ?? current.scope.proposedSolution,
        executiveSummary: proposal?.implementationPlan ?? current.scope.executiveSummary,
      },
      financials: {
        ...current.financials,
        commercialValue: proposal?.estimatedValue ?? current.financials.commercialValue,
        finalValue: proposal?.estimatedValue ?? current.financials.finalValue,
      },
    }));
  }

  function toggleIncludedService(service: string, checked: boolean) {
    setPayload((current) => ({
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

  return (
    <form action={action} className="admin-page-grid">
      {contractId ? <input name="contractId" type="hidden" value={contractId} /> : null}
      <input name="wizardPayload" type="hidden" value={JSON.stringify(payload)} />

      {!isEditable ? (
        <div className="admin-execution-summary admin-execution-summary-danger">
          <strong>Contrato bloqueado para edicao direta</strong>
          <span>Este contrato ja saiu do estado de rascunho/revisao. As alteracoes futuras devem usar fluxo de versao ou scope change.</span>
        </div>
      ) : null}

      <div className="contract-wizard-progress">
        {steps.map((step, index) => (
          <button
            className={`contract-wizard-step ${index === currentStep ? 'contract-wizard-step-active' : ''} ${index < currentStep ? 'contract-wizard-step-done' : ''}`}
            key={step}
            onClick={() => setCurrentStep(index)}
            type="button"
          >
            <span>{index < currentStep ? <Check size={13} /> : index + 1}</span>
            {step}
          </button>
        ))}
      </div>

      <section className="contract-wizard-panel">
        {currentStep === 0 ? (
          <WizardStep title="Cliente e origem" subtitle="Escolhe a lead/proposta e completa o snapshot comercial.">
            <div className="admin-grid-2">
              <Select label="Lead associada" value={payload.client.leadId ?? ''} onChange={selectLead}>
                <option value="">Sem lead associada</option>
                {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company} - {lead.email}</option>)}
              </Select>
              <Select label="Proposta associada" value={payload.client.proposalId ?? ''} onChange={selectProposal}>
                <option value="">Sem proposta associada</option>
                {proposals.map((proposal) => <option key={proposal.id} value={proposal.id}>{proposal.companyName} - {proposal.title}</option>)}
              </Select>
            </div>
            <div className="admin-grid-2">
              <Field label="Titulo do contrato" value={payload.title} onChange={(value) => updatePayload({ title: value })} required />
              <Field label="Nome do projeto" value={payload.client.projectName ?? ''} onChange={(value) => updateClient('projectName', value)} />
              <Field label="Nome comercial" value={payload.client.tradeName ?? ''} onChange={(value) => updateClient('tradeName', value)} />
              <Field label="Nome legal" value={payload.client.legalName ?? ''} onChange={(value) => updateClient('legalName', value)} />
              <Field label="NIF" value={payload.client.taxId ?? ''} onChange={(value) => updateClient('taxId', value)} />
              <Field label="Email" value={payload.client.email ?? ''} onChange={(value) => updateClient('email', value)} />
              <Field label="Telefone" value={payload.client.phone ?? ''} onChange={(value) => updateClient('phone', value)} />
              <Field label="Representante" value={payload.client.representative ?? ''} onChange={(value) => updateClient('representative', value)} />
              <Field label="Cargo do representante" value={payload.client.representativeRole ?? ''} onChange={(value) => updateClient('representativeRole', value)} />
              <Field label="Email do representante" value={payload.client.representativeEmail ?? ''} onChange={(value) => updateClient('representativeEmail', value)} />
            </div>
            <TextArea label="Morada fiscal" value={payload.client.fiscalAddress ?? ''} onChange={(value) => updateClient('fiscalAddress', value)} />
            <div className="admin-grid-2">
              <Field label="Codigo postal" value={payload.client.postalCode ?? ''} onChange={(value) => updateClient('postalCode', value)} />
              <Field label="Cidade" value={payload.client.city ?? ''} onChange={(value) => updateClient('city', value)} />
              <Field label="Pais" value={payload.client.country ?? 'Portugal'} onChange={(value) => updateClient('country', value)} />
              <Select label="Responsavel interno" value={payload.assignedToId ?? ''} onChange={(value) => updatePayload({ assignedToId: value || null })}>
                <option value="">Sem responsavel definido</option>
                {admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name ?? admin.email}</option>)}
              </Select>
            </div>
          </WizardStep>
        ) : null}

        {currentStep === 1 ? (
          <WizardStep title="Dados da Norm8" subtitle="Snapshot do prestador usado no contrato.">
            <div className="admin-grid-2">
              {providerFields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  value={String(payload.provider[field.key] ?? '')}
                  onChange={(value) => updateProvider(field.key, value)}
                  required={field.required}
                />
              ))}
            </div>
            <div className="admin-execution-summary">
              <strong>Dados legais</strong>
              <span>Para alterar a fonte permanente, use Definicoes legais da empresa. Aqui fica guardado o snapshot deste contrato.</span>
            </div>
          </WizardStep>
        ) : null}

        {currentStep === 2 ? (
          <WizardStep title="Servico e plano" subtitle="Define o tipo de contrato, plano e servicos incluidos.">
            <div className="admin-grid-2">
              <Select label="Tipo de servico" value={payload.service.serviceType ?? ''} onChange={(value) => updateService('serviceType', value || null)}>
                <option value="">Por definir</option>
                {CONTRACT_SERVICE_TYPES.map((type) => <option key={type} value={type}>{CONTRACT_SERVICE_TYPE_LABELS[type]}</option>)}
              </Select>
              <Select label="Plano" value={payload.service.plan ?? ''} onChange={(value) => updateService('plan', value || null)}>
                <option value="">Por definir</option>
                {CONTRACT_PLANS.map((plan) => <option key={plan} value={plan}>{CONTRACT_PLAN_LABELS[plan]}</option>)}
              </Select>
              <Field label="Outro tipo de servico" value={payload.service.serviceTypeOther ?? ''} onChange={(value) => updateService('serviceTypeOther', value)} />
              <Field label="Validade" type="date" value={payload.validUntil ?? ''} onChange={(value) => updatePayload({ validUntil: value || null })} />
            </div>
            <div className="contract-check-grid">
              <label className="contract-check"><input checked={payload.service.includesLaunch} onChange={(event) => updateService('includesLaunch', event.target.checked)} type="checkbox" />Launch</label>
              <label className="contract-check"><input checked={payload.service.includesOperate} onChange={(event) => updateService('includesOperate', event.target.checked)} type="checkbox" />Operate</label>
              <label className="contract-check"><input checked={payload.service.includesScale} onChange={(event) => updateService('includesScale', event.target.checked)} type="checkbox" />Scale</label>
            </div>
            <div className="contract-check-grid">
              {INCLUDED_SERVICE_OPTIONS.map((service) => (
                <label className="contract-check" key={service}>
                  <input checked={payload.service.includedServices.includes(service)} onChange={(event) => toggleIncludedService(service, event.target.checked)} type="checkbox" />
                  {service}
                </label>
              ))}
            </div>
          </WizardStep>
        ) : null}

        {currentStep === 3 ? (
          <WizardStep title="Ambito e entregaveis" subtitle="Regista o que entra, o que fica fora e os entregaveis principais.">
            <TextArea label="Resumo executivo" value={payload.scope.executiveSummary ?? ''} onChange={(value) => updateScope('executiveSummary', value)} />
            <TextArea label="Objetivo do projeto" value={payload.scope.projectObjective ?? ''} onChange={(value) => updateScope('projectObjective', value)} />
            <TextArea label="Problemas identificados" value={payload.scope.identifiedProblems ?? ''} onChange={(value) => updateScope('identifiedProblems', value)} />
            <TextArea label="Solucao proposta" value={payload.scope.proposedSolution ?? ''} onChange={(value) => updateScope('proposedSolution', value)} />
            <TextArea label="Ambito incluido" value={payload.scope.includedScope ?? ''} onChange={(value) => updateScope('includedScope', value)} />
            <TextArea label="Ambito excluido" value={payload.scope.excludedScope ?? ''} onChange={(value) => updateScope('excludedScope', value)} />
            <DynamicList
              addLabel="Adicionar entregavel"
              items={payload.deliverables}
              onAdd={() => updatePayload({ deliverables: [...payload.deliverables, createDeliverable()] })}
              onChange={(items) => updatePayload({ deliverables: items })}
              render={(item, index, update) => (
                <div className="admin-page-grid">
                  <div className="admin-grid-2">
                    <Field label="Entregavel" value={item.title} onChange={(value) => update(index, { title: value })} required />
                    <Select label="Fase" value={item.phase ?? ''} onChange={(value) => update(index, { phase: value || null })}>{phaseOptions}</Select>
                    <Field label="Data estimada" type="date" value={item.estimatedDate ?? ''} onChange={(value) => update(index, { estimatedDate: value })} />
                    <Field label="Responsavel" value={item.responsible ?? ''} onChange={(value) => update(index, { responsible: value })} />
                  </div>
                  <TextArea label="Descricao" value={item.description ?? ''} onChange={(value) => update(index, { description: value })} />
                  <TextArea label="Criterios de aceitacao" value={item.acceptanceCriteria ?? ''} onChange={(value) => update(index, { acceptanceCriteria: value })} />
                </div>
              )}
            />
          </WizardStep>
        ) : null}

        {currentStep === 4 ? (
          <WizardStep title="Cronograma" subtitle="Organiza fases, dependencias, marcos e criterios de aprovacao.">
            <div className="admin-filters">
              {PHASE_PRESETS.map((preset) => (
                <button className="admin-button admin-button-muted" key={preset} onClick={() => updatePayload({ phases: [...payload.phases, createPhase(preset)] })} type="button">
                  <Plus size={14} />{preset}
                </button>
              ))}
            </div>
            <DynamicList
              addLabel="Adicionar fase"
              items={payload.phases}
              onAdd={() => updatePayload({ phases: [...payload.phases, createPhase()] })}
              onChange={(items) => updatePayload({ phases: items })}
              render={(item, index, update) => (
                <div className="admin-page-grid">
                  <div className="admin-grid-2">
                    <Field label="Nome" value={item.name} onChange={(value) => update(index, { name: value })} required />
                    <Select label="Tipo" value={item.phaseType ?? ''} onChange={(value) => update(index, { phaseType: value || null })}>{phaseOptions}</Select>
                    <Field label="Inicio" type="date" value={item.startsAt ?? ''} onChange={(value) => update(index, { startsAt: value })} />
                    <Field label="Fim" type="date" value={item.endsAt ?? ''} onChange={(value) => update(index, { endsAt: value })} />
                    <Field label="Duracao" value={item.duration ?? ''} onChange={(value) => update(index, { duration: value })} />
                    <Field label="Marco de pagamento" value={item.paymentMilestone ?? ''} onChange={(value) => update(index, { paymentMilestone: value })} />
                  </div>
                  <TextArea label="Descricao" value={item.description ?? ''} onChange={(value) => update(index, { description: value })} />
                  <TextArea label="Dependencias" value={item.dependencies ?? ''} onChange={(value) => update(index, { dependencies: value })} />
                  <TextArea label="Criterios de aprovacao" value={item.approvalCriteria ?? ''} onChange={(value) => update(index, { approvalCriteria: value })} />
                </div>
              )}
            />
          </WizardStep>
        ) : null}

        {currentStep === 5 ? (
          <WizardStep title="Investimento e pagamentos" subtitle="Valores comerciais, impostos, validade e marcos de faturacao.">
            <div className="admin-grid-2">
              <Field label="Valor comercial" inputMode="decimal" value={String(payload.financials.commercialValue ?? '')} onChange={(value) => updateFinancial('commercialValue', value)} />
              <Field label="Desconto" inputMode="decimal" value={String(payload.financials.discount ?? '')} onChange={(value) => updateFinancial('discount', value)} />
              <Field label="Valor final" inputMode="decimal" value={String(payload.financials.finalValue ?? '')} onChange={(value) => updateFinancial('finalValue', value)} />
              <Field label="IVA (%)" inputMode="decimal" value={String(payload.financials.vatRate ?? '')} onChange={(value) => updateFinancial('vatRate', value)} />
              <Field label="Valor com IVA" inputMode="decimal" value={String(payload.financials.valueWithVat ?? '')} onChange={(value) => updateFinancial('valueWithVat', value)} />
              <Field label="Moeda" value={String(payload.financials.currency ?? 'EUR')} onChange={(value) => updateFinancial('currency', value)} />
              <Select label="Plano de pagamento" value={String(payload.financials.paymentPlan ?? '')} onChange={(value) => updateFinancial('paymentPlan', value)}>
                <option value="">Por definir</option>
                {PAYMENT_PLAN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Field label="Data limite de pagamento" type="date" value={String(payload.financials.paymentDueDate ?? '')} onChange={(value) => updateFinancial('paymentDueDate', value)} />
            </div>
            <div className="admin-grid-2">
              <Field label="Fee mensal Operate" inputMode="decimal" value={String(payload.financials.operateMonthlyFee ?? '')} onChange={(value) => updateFinancial('operateMonthlyFee', value)} />
              <Field label="Periodicidade Operate" value={String(payload.financials.operatePeriodicity ?? '')} onChange={(value) => updateFinancial('operatePeriodicity', value)} />
              <Field label="Meses gratuitos Operate" inputMode="numeric" value={String(payload.financials.operateFreeMonths ?? '')} onChange={(value) => updateFinancial('operateFreeMonths', value)} />
              <Field label="Inicio faturacao Operate" type="date" value={String(payload.financials.operateBillingStartDate ?? '')} onChange={(value) => updateFinancial('operateBillingStartDate', value)} />
              <Field label="Permanencia minima" value={String(payload.financials.operateMinimumStay ?? '')} onChange={(value) => updateFinancial('operateMinimumStay', value)} />
              <Field label="Pre-aviso" value={String(payload.financials.operateNoticePeriod ?? '')} onChange={(value) => updateFinancial('operateNoticePeriod', value)} />
            </div>
            <label className="contract-check">
              <input checked={Boolean(payload.financials.operateAutoRenewal)} onChange={(event) => updateFinancial('operateAutoRenewal', event.target.checked)} type="checkbox" />
              Renovacao automatica do Operate
            </label>
            <TextArea label="Condicao especial" value={String(payload.financials.specialCondition ?? '')} onChange={(value) => updateFinancial('specialCondition', value)} />
            <TextArea label="Custos de terceiros" value={String(payload.financials.thirdPartyCosts ?? '')} onChange={(value) => updateFinancial('thirdPartyCosts', value)} />
            <DynamicList
              addLabel="Adicionar pagamento"
              items={payload.paymentMilestones}
              onAdd={() => updatePayload({ paymentMilestones: [...payload.paymentMilestones, createPayment()] })}
              onChange={(items) => updatePayload({ paymentMilestones: items })}
              render={(item, index, update) => (
                <div className="admin-page-grid">
                  <div className="admin-grid-2">
                    <Field label="Percentagem" inputMode="decimal" value={item.percentage ?? ''} onChange={(value) => update(index, { percentage: value })} />
                    <Field label="Montante" inputMode="decimal" value={item.amount ?? ''} onChange={(value) => update(index, { amount: value })} />
                    <Field label="Momento de fatura" value={item.invoiceMoment ?? ''} onChange={(value) => update(index, { invoiceMoment: value })} />
                    <Field label="Data prevista" type="date" value={item.expectedDate ?? ''} onChange={(value) => update(index, { expectedDate: value })} />
                  </div>
                  <TextArea label="Descricao" value={item.description ?? ''} onChange={(value) => update(index, { description: value })} />
                  <TextArea label="Condicao de faturacao" value={item.billingCondition ?? ''} onChange={(value) => update(index, { billingCondition: value })} />
                </div>
              )}
            />
          </WizardStep>
        ) : null}

        {currentStep === 6 ? (
          <WizardStep title="Clausulas e condicoes" subtitle="Seleciona e ajusta as seccoes que entram no contrato.">
            <div className="admin-grid-2">
              <Select label="Aplicar template" value="" onChange={applyTemplate}>
                <option value="">Escolher template</option>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name} v{template.version}</option>)}
              </Select>
              <div className="admin-execution-summary">
                <strong>{enabledSections.length} clausulas ativas</strong>
                <span>As alteracoes ficam guardadas no contrato como snapshot independente do template.</span>
              </div>
            </div>
            <DynamicList
              addLabel="Adicionar clausula"
              items={payload.sections}
              onAdd={() => updatePayload({ sections: [...payload.sections, createSection(payload.sections.length + 1)] })}
              onChange={(items) => updatePayload({ sections: items.map((item, index) => ({ ...item, order: index + 1 })) })}
              render={(item, index, update) => (
                <div className="admin-page-grid">
                  <div className="admin-grid-2">
                    <label className="contract-check"><input checked={item.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} type="checkbox" />Incluir clausula</label>
                    <label className="contract-check"><input checked={item.isRequired} onChange={(event) => update(index, { isRequired: event.target.checked })} type="checkbox" />Obrigatoria</label>
                    <Field label="Titulo" value={item.title} onChange={(value) => update(index, { title: value })} required />
                    <Select label="Categoria" value={item.category} onChange={(value) => update(index, { category: value as ContractSectionCategory })}>
                      {Object.entries(CONTRACT_SECTION_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </Select>
                  </div>
                  <TextArea label="Conteudo" value={item.content} onChange={(value) => update(index, { content: value })} required />
                </div>
              )}
            />
          </WizardStep>
        ) : null}

        {currentStep === 7 ? (
          <WizardStep title="Revisao" subtitle="Confirma o rascunho antes de guardar.">
            {reviewWarnings.length > 0 ? (
              <div className="admin-execution-summary admin-execution-summary-danger">
                <strong>Pontos a rever</strong>
                {reviewWarnings.map((warning) => <span key={warning}>{warning}</span>)}
              </div>
            ) : (
              <div className="admin-execution-summary">
                <strong>Pronto para guardar</strong>
                <span>O rascunho tem os dados essenciais para a Fase 2.</span>
              </div>
            )}
            <div className="admin-kpi-grid">
              <ReviewItem label="Cliente" value={payload.client.legalName ?? payload.client.tradeName ?? selectedLead?.company ?? 'Por definir'} />
              <ReviewItem label="Projeto" value={payload.client.projectName ?? 'Por definir'} />
              <ReviewItem label="Plano" value={payload.service.plan ? CONTRACT_PLAN_LABELS[payload.service.plan] : 'Por definir'} />
              <ReviewItem label="Valor" value={formatContractValue(String(payload.financials.finalValue ?? payload.financials.commercialValue ?? selectedProposal?.estimatedValue ?? ''))} />
              <ReviewItem label="Entregaveis" value={String(payload.deliverables.length)} />
              <ReviewItem label="Clausulas" value={String(enabledSections.length)} />
            </div>
          </WizardStep>
        ) : null}
      </section>

      <div className="contract-wizard-actions">
        <Link className="admin-button admin-button-muted" href={mode === 'edit' && contractId ? `/admin/contracts/${contractId}` : '/admin/contracts'}>
          <ArrowLeft size={14} />Cancelar
        </Link>
        <div className="admin-filters">
          <button className="admin-button admin-button-muted" disabled={currentStep === 0} onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} type="button">
            <ChevronLeft size={14} />Anterior
          </button>
          {currentStep < steps.length - 1 ? (
            <button className="admin-button" onClick={() => setCurrentStep((step) => Math.min(steps.length - 1, step + 1))} type="button">
              Seguinte<ChevronRight size={14} />
            </button>
          ) : (
            <button className="admin-button" disabled={!isEditable} type="submit">
              <Save size={14} />{mode === 'edit' ? 'Guardar alteracoes' : 'Criar rascunho'}
            </button>
          )}
        </div>
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

function Field({
  inputMode,
  label,
  onChange,
  required,
  type = 'text',
  value,
}: {
  inputMode?: 'decimal' | 'numeric';
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="admin-form-control">
      <span>{label}</span>
      <input className="admin-input" inputMode={inputMode} onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} />
    </label>
  );
}

function TextArea({ label, onChange, required, value }: { label: string; onChange: (value: string) => void; required?: boolean; value: string }) {
  return (
    <label className="admin-form-control">
      <span>{label}</span>
      <textarea className="admin-textarea" onChange={(event) => onChange(event.target.value)} required={required} value={value} />
    </label>
  );
}

function Select({ children, label, onChange, value }: { children: React.ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="admin-form-control">
      <span>{label}</span>
      <select className="admin-select" onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function DynamicList<T>({
  addLabel,
  items,
  onAdd,
  onChange,
  render,
}: {
  addLabel: string;
  items: T[];
  onAdd: () => void;
  onChange: (items: T[]) => void;
  render: (item: T, index: number, update: (index: number, patch: Partial<T>) => void) => React.ReactNode;
}) {
  function update(index: number, patch: Partial<T>) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
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
                <button className="admin-icon-button admin-button-muted" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} type="button" aria-label="Remover">
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

function createInitialPayload(provider: NonNullable<LegalSettingsOption>, template?: TemplateOption): ContractWizardPayload {
  return {
    title: 'Contrato de prestacao de servicos',
    client: { country: 'Portugal' },
    provider,
    service: {
      serviceType: null,
      serviceTypeOther: null,
      plan: null,
      includesLaunch: true,
      includesOperate: false,
      includesScale: false,
      includedServices: ['Discovery', 'Implementacao'],
    },
    scope: {},
    deliverables: [createDeliverable()],
    phases: [createPhase('Discovery e arquitetura'), createPhase('Implementacao base')],
    financials: { currency: 'EUR', vatRate: '23', paymentPlan: '50_50', operateAutoRenewal: false },
    paymentMilestones: [createPayment('50', 'Adjudicacao'), createPayment('50', 'Entrega final')],
    sections: template ? mapTemplateSections(template) : [createSection(1)],
    assignedToId: null,
    validUntil: null,
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
    !payload.service.serviceType ? 'Escolher o tipo de servico.' : null,
    !payload.service.plan ? 'Escolher o plano comercial.' : null,
    payload.deliverables.length === 0 ? 'Adicionar pelo menos um entregavel.' : null,
    payload.sections.filter((section) => section.enabled).length === 0 ? 'Selecionar pelo menos uma clausula.' : null,
    !payload.financials.finalValue && !payload.financials.commercialValue ? 'Confirmar valor comercial/final.' : null,
  ].filter((warning): warning is string => Boolean(warning));
}

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
  { key: 'tradeName', label: 'Nome comercial', required: true },
  { key: 'taxId', label: 'NIF', required: true },
  { key: 'address', label: 'Morada', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Telefone', required: true },
  { key: 'website', label: 'Website', required: true },
  { key: 'representative', label: 'Representante', required: true },
  { key: 'representativeRole', label: 'Cargo', required: true },
  { key: 'iban', label: 'IBAN', required: true },
  { key: 'bankName', label: 'Banco', required: true },
  { key: 'swiftBic', label: 'SWIFT/BIC' },
];
