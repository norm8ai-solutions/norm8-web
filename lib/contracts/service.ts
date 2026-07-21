import 'server-only';

import {
  Prisma,
  type AdminRole,
  type ContractActivityType,
  type ContractDocumentType,
  type ContractDeliverableStatus,
  type ContractPhaseType,
  type ContractPlan,
  type ContractSectionCategory,
  type ContractServiceType,
  type PaymentMilestoneStatus,
} from '@/app/generated/prisma/client';
import { isAdminAuthDisabledForDemo, normalizeAdminEmail } from '@/lib/admin/auth';
import { prisma } from '@/lib/db/prisma';
import { normalizePortugueseText } from '@/lib/text/normalize-portuguese';
import { normalizeBasicPortugueseTaxId } from '@/lib/contracts/wizard/validation';

type ContractTx = Prisma.TransactionClient;

export type WizardClientInput = {
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

export type WizardProviderInput = {
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
  swiftBic?: string | null;
};

export type WizardServiceInput = {
  serviceType?: ContractServiceType | null;
  serviceTypeOther?: string | null;
  plan?: ContractPlan | null;
  includesLaunch: boolean;
  includesOperate: boolean;
  includesScale: boolean;
  includedServices: string[];
};

export type WizardScopeInput = {
  executiveSummary?: string | null;
  projectObjective?: string | null;
  identifiedProblems?: string | null;
  proposedSolution?: string | null;
  includedScope?: string | null;
  excludedScope?: string | null;
  dependencies?: string | null;
  assumptions?: string | null;
  acceptanceCriteria?: string | null;
};

export type WizardDeliverableInput = {
  title: string;
  description?: string | null;
  phase?: string | null;
  status?: string | null;
  estimatedDate?: Date | null;
  responsible?: string | null;
  acceptanceCriteria?: string | null;
};

export type WizardPhaseInput = {
  name: string;
  phaseType?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  duration?: string | null;
  description?: string | null;
  dependencies?: string | null;
  paymentMilestone?: string | null;
  approvalCriteria?: string | null;
};

export type WizardFinancialInput = {
  commercialValue?: string | number | Prisma.Decimal | null;
  specialCondition?: string | null;
  discount?: string | number | Prisma.Decimal | null;
  finalValue?: string | number | Prisma.Decimal | null;
  vatRate?: string | number | Prisma.Decimal | null;
  valueWithVat?: string | number | Prisma.Decimal | null;
  currency?: string | null;
  taxStatus?: string | null;
  proposalValidity?: Date | null;
  paymentDueDate?: Date | null;
  paymentPlan?: string | null;
  operateMonthlyFee?: string | number | Prisma.Decimal | null;
  operatePeriodicity?: string | null;
  operateFreeMonths?: string | number | null;
  operateBillingStartDate?: Date | null;
  operateMinimumStay?: string | null;
  operateNoticePeriod?: string | null;
  operateAutoRenewal?: boolean;
  setupFee?: string | number | Prisma.Decimal | null;
  thirdPartyCosts?: string | null;
};

export type WizardPaymentMilestoneInput = {
  percentage?: string | number | Prisma.Decimal | null;
  amount?: string | number | Prisma.Decimal | null;
  invoiceMoment?: string | null;
  expectedDate?: Date | null;
  description?: string | null;
  status?: string | null;
  billingCondition?: string | null;
};

export type WizardSectionInput = {
  id?: string | null;
  templateSectionId?: string | null;
  category: ContractSectionCategory;
  title: string;
  content: string;
  order: number;
  isRequired: boolean;
  enabled: boolean;
  sourceVersion?: number | null;
};

export type ContractWizardInput = {
  title: string;
  client: WizardClientInput;
  provider: WizardProviderInput;
  service: WizardServiceInput;
  scope: WizardScopeInput;
  deliverables: WizardDeliverableInput[];
  phases: WizardPhaseInput[];
  financials: WizardFinancialInput;
  paymentMilestones: WizardPaymentMilestoneInput[];
  sections: WizardSectionInput[];
  assignedToId?: string | null;
  validUntil?: Date | null;
  adminUserId: string;
  adminEmail?: string | null;
};

export type UpdateCompanyLegalSettingsInput = WizardProviderInput & {
  updatedById?: string | null;
};

const BASE_TEMPLATE_NAME = 'Contrato Base Norm8';
const LEGAL_TEMPLATE_NOTE = 'Este template deve ser revisto por um advogado antes da utilizacao definitiva.';
const EDITABLE_STATUSES = ['DRAFT', 'IN_REVIEW'] as const;

export async function generateContractNumber(
  tx: ContractTx,
  type: ContractDocumentType = 'CTR',
  date: Date = new Date(),
): Promise<string> {
  const year = date.getFullYear();
  const sequence = await tx.contractNumberSequence.upsert({
    where: { year_type: { year, type } },
    create: { year, type, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  const currentNumber = sequence.nextNumber - 1;
  return `${type}-${year}-${String(currentNumber).padStart(4, '0')}`;
}

export async function createContractDraft(input: ContractWizardInput) {
  const normalized = normalizeWizardInput(input);

  return prisma.$transaction(async (tx) => {
    const createdById = await resolvePersistentAdminId(tx, { adminId: input.adminUserId, email: input.adminEmail });
    const assignedToId = normalized.assignedToId
      ? await resolveOptionalAdminId(tx, normalized.assignedToId)
      : null;
    const { lead, proposal } = await resolveLeadAndProposal(tx, normalized.client.leadId, normalized.client.proposalId);
    const template = await getOrCreateBaseContractTemplate(tx);
    const number = await generateContractNumber(tx, 'CTR');
    const selectedValue = normalized.financials.finalValue ?? normalized.financials.commercialValue ?? proposal?.estimatedValue ?? null;

    const contract = await tx.contract.create({
      data: {
        number,
        title: normalized.title,
        status: 'DRAFT',
        version: 1,
        leadId: lead?.id ?? null,
        proposalId: proposal?.id ?? null,
        meetingBookingId: lead?.meetingBookings?.[0]?.id ?? null,
        templateId: template.id,
        projectName: normalized.client.projectName ?? proposal?.title ?? lead?.company ?? null,
        clientSnapshot: buildClientSnapshot(normalized.client, lead, proposal),
        providerSnapshot: buildProviderSnapshot(normalized.provider),
        projectSnapshot: buildProjectSnapshot(normalized.scope, normalized.service, normalized.client, lead, proposal),
        financialSnapshot: buildFinancialSnapshot(normalized.financials, normalized.paymentMilestones, selectedValue),
        termsSnapshot: buildTermsSnapshot(template.id, template.version, normalized.service, normalized.sections),
        serviceType: normalized.service.serviceType,
        serviceTypeOther: normalized.service.serviceTypeOther,
        plan: normalized.service.plan,
        includesLaunch: normalized.service.includesLaunch,
        includesOperate: normalized.service.includesOperate,
        includesScale: normalized.service.includesScale,
        estimatedValue: selectedValue,
        currency: normalized.financials.currency ?? 'EUR',
        issueDate: new Date(),
        validUntil: normalized.validUntil ?? normalized.financials.proposalValidity ?? null,
        createdById,
        assignedToId,
        sections: { create: buildSectionCreateData(normalized.sections, template.sections) },
        deliverables: { create: buildDeliverableCreateData(normalized.deliverables) },
        phases: { create: buildPhaseCreateData(normalized.phases) },
        paymentMilestones: { create: buildPaymentCreateData(normalized.paymentMilestones, normalized.financials.currency ?? 'EUR') },
      },
      include: { lead: true, proposal: true },
    });

    await createContractLog(tx, {
      contractId: contract.id,
      adminUserId: createdById,
      type: 'CONTRACT_CREATED',
      message: `Rascunho criado: ${contract.number}`,
      metadata: { leadId: contract.leadId, proposalId: contract.proposalId, source: proposal ? 'proposal' : lead ? 'lead' : 'manual' },
    });

    return contract;
  });
}

export async function updateContractFromWizard(contractId: string, input: ContractWizardInput) {
  const normalized = normalizeWizardInput(input);

  return prisma.$transaction(async (tx) => {
    const adminUserId = await resolvePersistentAdminId(tx, { adminId: input.adminUserId, email: input.adminEmail });
    const existing = await tx.contract.findUnique({ where: { id: contractId }, select: { id: true, status: true, number: true } });

    if (!existing) throw new Error('Contrato não encontrado.');
    if (!EDITABLE_STATUSES.includes(existing.status as (typeof EDITABLE_STATUSES)[number])) {
      throw new Error('Este contrato já foi enviado ou assinado e não pode ser editado diretamente.');
    }

    const assignedToId = normalized.assignedToId
      ? await resolveOptionalAdminId(tx, normalized.assignedToId)
      : null;
    const { lead, proposal } = await resolveLeadAndProposal(tx, normalized.client.leadId, normalized.client.proposalId);
    const template = await getOrCreateBaseContractTemplate(tx);
    const selectedValue = normalized.financials.finalValue ?? normalized.financials.commercialValue ?? proposal?.estimatedValue ?? null;

    await tx.contractSection.deleteMany({ where: { contractId } });
    await tx.contractDeliverable.deleteMany({ where: { contractId } });
    await tx.contractPhase.deleteMany({ where: { contractId } });
    await tx.contractPaymentMilestone.deleteMany({ where: { contractId } });

    const contract = await tx.contract.update({
      where: { id: contractId },
      data: {
        title: normalized.title,
        leadId: lead?.id ?? null,
        proposalId: proposal?.id ?? null,
        meetingBookingId: lead?.meetingBookings?.[0]?.id ?? null,
        templateId: template.id,
        projectName: normalized.client.projectName ?? proposal?.title ?? lead?.company ?? null,
        clientSnapshot: buildClientSnapshot(normalized.client, lead, proposal),
        providerSnapshot: buildProviderSnapshot(normalized.provider),
        projectSnapshot: buildProjectSnapshot(normalized.scope, normalized.service, normalized.client, lead, proposal),
        financialSnapshot: buildFinancialSnapshot(normalized.financials, normalized.paymentMilestones, selectedValue),
        termsSnapshot: buildTermsSnapshot(template.id, template.version, normalized.service, normalized.sections),
        serviceType: normalized.service.serviceType,
        serviceTypeOther: normalized.service.serviceTypeOther,
        plan: normalized.service.plan,
        includesLaunch: normalized.service.includesLaunch,
        includesOperate: normalized.service.includesOperate,
        includesScale: normalized.service.includesScale,
        estimatedValue: selectedValue,
        currency: normalized.financials.currency ?? 'EUR',
        validUntil: normalized.validUntil ?? normalized.financials.proposalValidity ?? null,
        assignedToId,
        sections: { create: buildSectionCreateData(normalized.sections, template.sections) },
        deliverables: { create: buildDeliverableCreateData(normalized.deliverables) },
        phases: { create: buildPhaseCreateData(normalized.phases) },
        paymentMilestones: { create: buildPaymentCreateData(normalized.paymentMilestones, normalized.financials.currency ?? 'EUR') },
      },
    });

    const logs: Array<{ type: ContractActivityType; message: string }> = [
      { type: 'CONTRACT_DRAFT_UPDATED', message: `Rascunho atualizado: ${existing.number}` },
      { type: 'CONTRACT_CLIENT_UPDATED', message: 'Dados do cliente revistos.' },
      { type: 'CONTRACT_SERVICE_UPDATED', message: 'Serviço e plano revistos.' },
      { type: 'CONTRACT_SCOPE_UPDATED', message: 'Âmbito e entregáveis revistos.' },
      { type: 'CONTRACT_TIMELINE_UPDATED', message: 'Cronograma revisto.' },
      { type: 'CONTRACT_FINANCIALS_UPDATED', message: 'Investimento e pagamentos revistos.' },
      { type: 'CONTRACT_CLAUSES_UPDATED', message: 'Cláusulas e condições revistas.' },
      { type: 'CONTRACT_REVIEW_SAVED', message: 'Revisão do contrato guardada.' },
    ];

    await tx.contractActivityLog.createMany({
      data: logs.map((log) => ({
        contractId,
        adminUserId,
        type: log.type,
        message: log.message,
        metadata: {
          deliverables: normalized.deliverables.length,
          phases: normalized.phases.length,
          paymentMilestones: normalized.paymentMilestones.length,
          sections: normalized.sections.filter((section) => section.enabled).length,
        },
      })),
    });

    return contract;
  });
}

export async function updateCompanyLegalSettings(input: UpdateCompanyLegalSettingsInput) {
  const updatedById = input.updatedById ? await resolvePersistentAdminId(prisma, { adminId: input.updatedById }) : null;
  const normalized = normalizeProviderInput(input);

  return prisma.companyLegalSettings.upsert({
    where: { key: 'default' },
    create: { key: 'default', ...normalized, internalNote: LEGAL_TEMPLATE_NOTE, updatedById },
    update: { ...normalized, internalNote: LEGAL_TEMPLATE_NOTE, updatedById },
  });
}

export async function ensureContractsFoundationSeed() {
  return prisma.$transaction(async (tx) => {
    const legalSettings = await getOrCreateCompanyLegalSettings(tx, null);
    const template = await getOrCreateBaseContractTemplate(tx);
    return { legalSettings, template };
  });
}

async function resolveLeadAndProposal(tx: ContractTx, leadId?: string | null, proposalId?: string | null) {
  const proposal = proposalId
    ? await tx.proposal.findUnique({ where: { id: proposalId }, include: { lead: true, submission: true } })
    : null;
  const resolvedLeadId = leadId ?? proposal?.leadId ?? null;
  const lead = resolvedLeadId
    ? await tx.lead.findUnique({
        where: { id: resolvedLeadId },
        include: {
          submissions: { orderBy: { createdAt: 'desc' }, take: 1 },
          meetingBookings: { orderBy: { startsAt: 'desc' }, take: 1 },
        },
      })
    : null;

  if (proposalId && !proposal) throw new Error('A proposta selecionada não existe.');
  if (leadId && !lead) throw new Error('A lead selecionada não existe.');
  if (proposal && lead && proposal.leadId !== lead.id) throw new Error('A proposta selecionada não pertence à lead escolhida.');

  return { lead, proposal };
}

async function getOrCreateCompanyLegalSettings(tx: ContractTx, updatedById: string | null) {
  return tx.companyLegalSettings.upsert({
    where: { key: 'default' },
    create: {
      key: 'default',
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
      internalNote: LEGAL_TEMPLATE_NOTE,
      updatedById,
    },
    update: {},
  });
}

async function getOrCreateBaseContractTemplate(tx: ContractTx) {
  const existing = await tx.contractTemplate.findFirst({
    where: { name: BASE_TEMPLATE_NAME, isActive: true },
    include: { sections: { orderBy: { order: 'asc' } } },
  });
  if (existing) return existing;

  return tx.contractTemplate.create({
    data: {
      name: BASE_TEMPLATE_NAME,
      description: 'Template institucional base para contratos de prestação de serviços Norm8.',
      version: 1,
      isActive: true,
      internalNote: LEGAL_TEMPLATE_NOTE,
      sections: {
        create: [
          createTemplateSection('OBJECT', 'Objeto', 'O presente contrato define os termos da prestação de serviços tecnológicos pela Norm8 ao Cliente, de acordo com o âmbito, cronograma, investimento e condições comerciais registados no documento.', 1, true, ['{{client.companyName}}', '{{provider.legalName}}', '{{contract.number}}']),
          createTemplateSection('SCOPE', 'Âmbito dos serviços', 'O âmbito inclui apenas os serviços, entregáveis e fases expressamente descritos no contrato e nos seus anexos. Qualquer alteração relevante deverá ser registada por escrito.', 2, true, ['{{project.name}}']),
          createTemplateSection('PAYMENTS', 'Investimento e faturação', 'Os valores, prazos e condições de faturação serão os indicados no snapshot financeiro do contrato. A adjudicação pode depender da confirmação do pagamento inicial, quando aplicável.', 3, true, ['{{financial.total}}', '{{financial.currency}}']),
          createTemplateSection('DATA_PROTECTION', 'Proteção de dados', 'As partes comprometem-se a tratar dados pessoais apenas quando necessário para a execução dos serviços e em conformidade com a legislação aplicável de proteção de dados.', 4, true, []),
          createTemplateSection('SIGNATURES', 'Assinaturas', 'O contrato produzirá efeitos após aceitação pelas partes, assinatura do documento e cumprimento das condições comerciais iniciais aplicáveis.', 5, true, ['{{contract.date}}']),
        ],
      },
    },
    include: { sections: { orderBy: { order: 'asc' } } },
  });
}

function createTemplateSection(category: ContractSectionCategory, title: string, content: string, order: number, isRequired: boolean, variables: string[]) {
  return { category, title, content, order, isRequired, variables };
}

function normalizeWizardInput(input: ContractWizardInput): ContractWizardInput & {
  financials: WizardFinancialInput & {
    commercialValue?: Prisma.Decimal;
    discount?: Prisma.Decimal;
    finalValue?: Prisma.Decimal;
    vatRate?: Prisma.Decimal;
    valueWithVat?: Prisma.Decimal;
    operateMonthlyFee?: Prisma.Decimal;
    setupFee?: Prisma.Decimal;
  };
} {
  const provider = normalizeProviderSnapshotInput(input.provider);
  return {
    ...input,
    title: normalizeRequired(input.title, 'titulo'),
    assignedToId: normalizeOptional(input.assignedToId),
    client: normalizeClientInput(input.client),
    provider,
    service: {
      ...input.service,
      serviceTypeOther: normalizeOptional(input.service.serviceTypeOther),
      includedServices: input.service.includedServices.map(normalizeText).filter(Boolean),
    },
    scope: normalizeScopeInput(input.scope),
    deliverables: input.deliverables.map(normalizeDeliverableInput).filter((item) => item.title),
    phases: input.phases.map(normalizePhaseInput).filter((item) => item.name),
    financials: normalizeFinancialInput(input.financials),
    paymentMilestones: input.paymentMilestones.map(normalizePaymentInput).filter((item) => item.percentage || item.amount || item.description),
    sections: input.sections.map(normalizeSectionInput).filter((section) => section.enabled && section.title && section.content),
  };
}

function normalizeClientInput(input: WizardClientInput): WizardClientInput {
  const normalized = mapObjectStrings(input);
  const taxId = normalizeBasicPortugueseTaxId(normalized.taxId);
  return { ...normalized, taxId: taxId || null };
}

function normalizeProviderInput(input: WizardProviderInput): WizardProviderInput {
  return {
    legalName: normalizeRequired(input.legalName, 'nome legal'),
    tradeName: normalizeRequired(input.tradeName, 'nome comercial'),
    taxId: normalizeRequired(input.taxId, 'NIF'),
    address: normalizeRequired(input.address, 'morada'),
    email: normalizeRequired(input.email, 'email'),
    phone: normalizeRequired(input.phone, 'telefone'),
    website: normalizeRequired(input.website, 'website'),
    representative: normalizeRequired(input.representative, 'representante'),
    representativeRole: normalizeRequired(input.representativeRole, 'cargo'),
    iban: normalizeRequired(input.iban, 'IBAN'),
    bankName: normalizeRequired(input.bankName, 'banco'),
    swiftBic: normalizeOptional(input.swiftBic),
  };
}

function normalizeProviderSnapshotInput(input: WizardProviderInput): WizardProviderInput {
  return {
    legalName: normalizeText(input.legalName),
    tradeName: normalizeText(input.tradeName),
    taxId: normalizeBasicPortugueseTaxId(input.taxId),
    address: normalizeText(input.address),
    email: normalizeText(input.email),
    phone: normalizeText(input.phone),
    website: normalizeText(input.website),
    representative: normalizeText(input.representative),
    representativeRole: normalizeText(input.representativeRole),
    iban: normalizeText(input.iban),
    bankName: normalizeText(input.bankName),
    swiftBic: normalizeOptional(input.swiftBic),
  };
}

function normalizeScopeInput(input: WizardScopeInput): WizardScopeInput {
  return mapObjectStrings(input);
}

function normalizeDeliverableInput(input: WizardDeliverableInput): WizardDeliverableInput {
  return { ...mapObjectStrings(input), estimatedDate: input.estimatedDate ?? null };
}

function normalizePhaseInput(input: WizardPhaseInput): WizardPhaseInput {
  return { ...mapObjectStrings(input), startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null };
}

function normalizeFinancialInput(input: WizardFinancialInput) {
  return {
    ...mapObjectStrings(input),
    commercialValue: normalizeDecimal(input.commercialValue),
    discount: normalizeDecimal(input.discount),
    finalValue: normalizeDecimal(input.finalValue),
    vatRate: normalizeDecimal(input.vatRate),
    valueWithVat: normalizeDecimal(input.valueWithVat),
    operateMonthlyFee: normalizeDecimal(input.operateMonthlyFee),
    setupFee: normalizeDecimal(input.setupFee),
  };
}

function normalizePaymentInput(input: WizardPaymentMilestoneInput): WizardPaymentMilestoneInput & { percentage?: Prisma.Decimal; amount?: Prisma.Decimal } {
  return { ...mapObjectStrings(input), percentage: normalizeDecimal(input.percentage), amount: normalizeDecimal(input.amount) };
}

function normalizeSectionInput(input: WizardSectionInput): WizardSectionInput {
  return {
    ...input,
    title: normalizeRequired(input.title, 'título da cláusula'),
    content: sanitizePlainText(input.content),
    templateSectionId: normalizeOptional(input.templateSectionId),
  };
}

function buildClientSnapshot(input: WizardClientInput, lead: SnapshotLead, proposal: SnapshotProposal) {
  return {
    leadId: lead?.id ?? proposal?.leadId ?? input.leadId ?? null,
    proposalId: proposal?.id ?? input.proposalId ?? null,
    tradeName: input.tradeName ?? proposal?.companyName ?? lead?.company ?? null,
    legalName: input.legalName ?? proposal?.companyName ?? lead?.company ?? null,
    companyName: input.legalName ?? input.tradeName ?? proposal?.companyName ?? lead?.company ?? null,
    taxId: input.taxId ?? null,
    fiscalAddress: input.fiscalAddress ?? null,
    postalCode: input.postalCode ?? null,
    city: input.city ?? null,
    country: input.country ?? 'Portugal',
    contactName: proposal?.contactName ?? lead?.name ?? null,
    email: input.email ?? lead?.email ?? null,
    phone: input.phone ?? lead?.phone ?? null,
    website: lead?.website ?? null,
    representative: input.representative ?? null,
    representativeRole: input.representativeRole ?? null,
    representativeEmail: input.representativeEmail ?? input.email ?? lead?.email ?? null,
    source: proposal ? 'proposal' : lead ? 'lead' : 'manual',
    capturedAt: new Date().toISOString(),
  } satisfies Prisma.JsonObject;
}

function buildProviderSnapshot(input: WizardProviderInput) {
  return { ...input, capturedAt: new Date().toISOString() } satisfies Prisma.JsonObject;
}

function buildProjectSnapshot(scope: WizardScopeInput, service: WizardServiceInput, client: WizardClientInput, lead: SnapshotLead, proposal: SnapshotProposal) {
  return {
    name: client.projectName ?? proposal?.title ?? lead?.company ?? null,
    executiveSummary: scope.executiveSummary ?? null,
    projectObjective: scope.projectObjective ?? null,
    identifiedProblems: scope.identifiedProblems ?? proposal?.painPoints ?? null,
    proposedSolution: scope.proposedSolution ?? proposal?.recommendedSolution ?? null,
    includedScope: scope.includedScope ?? null,
    excludedScope: scope.excludedScope ?? null,
    dependencies: scope.dependencies ?? null,
    assumptions: scope.assumptions ?? null,
    acceptanceCriteria: scope.acceptanceCriteria ?? null,
    implementationPlan: proposal?.implementationPlan ?? null,
    nextSteps: proposal?.nextSteps ?? null,
    includedServices: service.includedServices,
    latestSubmissionId: lead?.submissions?.[0]?.id ?? proposal?.submissionId ?? null,
  } satisfies Prisma.JsonObject;
}

function buildFinancialSnapshot(financials: WizardFinancialInput, milestones: WizardPaymentMilestoneInput[], selectedValue?: Prisma.Decimal | null) {
  return {
    currency: financials.currency ?? 'EUR',
    commercialValue: decimalToString(financials.commercialValue),
    specialCondition: financials.specialCondition ?? null,
    discount: decimalToString(financials.discount),
    finalValue: decimalToString(financials.finalValue ?? selectedValue ?? null),
    vatRate: decimalToString(financials.vatRate),
    valueWithVat: decimalToString(financials.valueWithVat),
    taxStatus: financials.taxStatus ?? null,
    proposalValidity: financials.proposalValidity?.toISOString() ?? null,
    paymentDueDate: financials.paymentDueDate?.toISOString() ?? null,
    paymentPlan: financials.paymentPlan ?? null,
    operate: {
      monthlyFee: decimalToString(financials.operateMonthlyFee),
      periodicity: financials.operatePeriodicity ?? null,
      freeMonths: financials.operateFreeMonths ?? null,
      billingStartDate: financials.operateBillingStartDate?.toISOString() ?? null,
      minimumStay: financials.operateMinimumStay ?? null,
      noticePeriod: financials.operateNoticePeriod ?? null,
      autoRenewal: Boolean(financials.operateAutoRenewal),
      setupFee: decimalToString(financials.setupFee),
      thirdPartyCosts: financials.thirdPartyCosts ?? null,
    },
    milestones: milestones.map((milestone) => ({
      percentage: decimalToString(milestone.percentage),
      amount: decimalToString(milestone.amount),
      invoiceMoment: milestone.invoiceMoment ?? null,
      expectedDate: milestone.expectedDate?.toISOString() ?? null,
      description: milestone.description ?? null,
      status: milestone.status ?? 'PENDING',
      billingCondition: milestone.billingCondition ?? null,
    })),
  } satisfies Prisma.JsonObject;
}

function buildTermsSnapshot(templateId: string, templateVersion: number, service: WizardServiceInput, sections: WizardSectionInput[]) {
  return {
    templateId,
    templateVersion,
    includedServices: service.includedServices,
    selectedSectionCount: sections.filter((section) => section.enabled).length,
    legalReviewRequired: true,
    internalNote: LEGAL_TEMPLATE_NOTE,
    pdfStrategy: 'Playwright HTML/CSS preparado para fases futuras',
    storageStrategy: 'Vercel Blob em producao; fallback local apenas em desenvolvimento',
  } satisfies Prisma.JsonObject;
}

function buildSectionCreateData(sections: WizardSectionInput[], templateSections: Array<{ id: string; category: ContractSectionCategory; title: string; content: string; order: number; isRequired: boolean; version: number }>) {
  const source = sections.length > 0
    ? sections
    : templateSections.map((section) => ({ ...section, templateSectionId: section.id, sourceVersion: section.version, enabled: true }));

  return source
    .filter((section) => section.enabled)
    .map((section, index) => ({
      templateSectionId: section.templateSectionId || null,
      category: section.category,
      title: section.title,
      content: sanitizePlainText(section.content),
      order: index + 1,
      isRequired: section.isRequired,
      sourceVersion: section.sourceVersion ?? null,
    }));
}

function buildDeliverableCreateData(deliverables: WizardDeliverableInput[]) {
  return deliverables.map((deliverable, index) => ({
    title: deliverable.title,
    description: deliverable.description ?? null,
    phase: parsePhaseType(deliverable.phase),
    status: parseDeliverableStatus(deliverable.status),
    order: index + 1,
    estimatedDate: deliverable.estimatedDate ?? null,
    responsible: deliverable.responsible ?? null,
    acceptanceCriteria: deliverable.acceptanceCriteria ?? null,
  }));
}

function buildPhaseCreateData(phases: WizardPhaseInput[]) {
  return phases.map((phase, index) => ({
    name: phase.name,
    phaseType: parsePhaseType(phase.phaseType),
    order: index + 1,
    startsAt: phase.startsAt ?? null,
    endsAt: phase.endsAt ?? null,
    duration: phase.duration ?? null,
    description: phase.description ?? null,
    dependencies: phase.dependencies ?? null,
    paymentMilestone: phase.paymentMilestone ?? null,
    approvalCriteria: phase.approvalCriteria ?? null,
  }));
}

function buildPaymentCreateData(payments: WizardPaymentMilestoneInput[], currency: string) {
  return payments.map((payment) => ({
    percentage: payment.percentage ?? null,
    amount: payment.amount ?? null,
    currency,
    invoiceMoment: payment.invoiceMoment ?? null,
    expectedDate: payment.expectedDate ?? null,
    description: payment.description ?? null,
    status: parsePaymentStatus(payment.status),
    billingCondition: payment.billingCondition ?? null,
  }));
}

async function createContractLog(tx: ContractTx, input: { contractId: string; adminUserId: string; type: ContractActivityType; message: string; metadata?: Prisma.JsonObject }) {
  await tx.contractActivityLog.create({ data: input });
}

export class ContractAdminResolutionError extends Error {
  constructor(message = 'Não existe um utilizador admin ativo para associar ao contrato. Crie um administrador antes de continuar.') {
    super(message);
    this.name = 'ContractAdminResolutionError';
  }
}

export async function resolvePersistentAdminId(
  tx: Pick<ContractTx, 'adminUser'>,
  input: { adminId?: string | null; email?: string | null },
): Promise<string> {
  if (input.adminId) {
    const existing = await tx.adminUser.findUnique({ where: { id: input.adminId }, select: { id: true, isActive: true } });
    if (existing?.isActive) return existing.id;
  }

  const normalizedEmail = input.email ? normalizeAdminEmail(input.email) : null;
  if (normalizedEmail) {
    const existingByEmail = await tx.adminUser.findUnique({ where: { normalizedEmail }, select: { id: true, isActive: true } });
    if (existingByEmail?.isActive) return existingByEmail.id;
  }

  const fallback = await tx.adminUser.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (fallback && canUseDevelopmentAdminFallback()) return fallback.id;

  if (canCreateDemoAdmin()) {
    return getOrCreateDemoAdminUser(tx);
  }

  throw new ContractAdminResolutionError();
}

function canUseDevelopmentAdminFallback(): boolean {
  return process.env.NODE_ENV !== 'production' || isAdminAuthDisabledForDemo();
}

function canCreateDemoAdmin(): boolean {
  return process.env.NODE_ENV !== 'production';
}

async function getOrCreateDemoAdminUser(tx: Pick<ContractTx, 'adminUser'>): Promise<string> {
  const email = 'demo@norm8.pt';
  const normalizedEmail = normalizeAdminEmail(email);
  const role: AdminRole = 'ADMIN';

  const admin = await tx.adminUser.upsert({
    where: { normalizedEmail },
    create: {
      email,
      normalizedEmail,
      name: 'Norm8 Demo Admin',
      passwordHash: 'disabled:demo-system-user',
      role,
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
    },
    update: {
      email,
      name: 'Norm8 Demo Admin',
      role,
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
    },
    select: { id: true },
  });

  return admin.id;
}

async function resolveOptionalAdminId(tx: Pick<ContractTx, 'adminUser'>, adminId: string): Promise<string | null> {
  const existing = await tx.adminUser.findUnique({ where: { id: adminId }, select: { id: true, isActive: true } });
  return existing?.isActive ? existing.id : null;
}

type SnapshotLead = {
  id: string;
  company: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  website?: string | null;
  source?: string | null;
  submissions?: Array<{ id: string }>;
  meetingBookings?: Array<{ id: string }>;
} | null;

type SnapshotProposal = {
  id: string;
  leadId: string;
  submissionId?: string | null;
  title: string;
  companyName: string;
  contactName?: string | null;
  estimatedValue?: Prisma.Decimal | null;
  painPoints?: string | null;
  recommendedSolution?: string | null;
  implementationPlan?: string | null;
  nextSteps?: string | null;
} | null;

function normalizeRequired(value: string | null | undefined, field: string): string {
  const normalized = normalizeOptional(value);
  if (!normalized) throw new Error(`Campo obrigatório em falta: ${field}.`);
  return normalized;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const normalized = normalizePortugueseText(value ?? '').trim();
  return normalized || null;
}

function normalizeText(value: string | null | undefined): string {
  return normalizePortugueseText(value ?? '').trim();
}

function sanitizePlainText(value: string): string {
  return normalizePortugueseText(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeDecimal(value: string | number | Prisma.Decimal | null | undefined): Prisma.Decimal | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const decimal = new Prisma.Decimal(typeof value === 'string' ? value.replace(',', '.') : value);
  if (!decimal.isFinite()) throw new Error('Valor numérico inválido.');
  return decimal;
}

function decimalToString(value: unknown): string | null {
  return value && typeof value === 'object' && 'toString' in value ? String(value) : null;
}

function mapObjectStrings<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, typeof value === 'string' ? normalizeOptional(value) : value]),
  ) as T;
}

function parsePhaseType(value?: string | null): ContractPhaseType | null {
  return value === 'LAUNCH' || value === 'OPERATE' || value === 'SCALE' || value === 'OTHER' ? value : null;
}

function parseDeliverableStatus(value?: string | null): ContractDeliverableStatus {
  return value === 'IN_PROGRESS' || value === 'DELIVERED' || value === 'ACCEPTED' || value === 'BLOCKED' ? value : 'PLANNED';
}

function parsePaymentStatus(value?: string | null): PaymentMilestoneStatus {
  return value === 'READY_TO_INVOICE' || value === 'INVOICED' || value === 'PAID' || value === 'OVERDUE' || value === 'CANCELLED' ? value : 'PENDING';
}