import 'server-only';

import { Prisma, type ContractDeliverableStatus, type ContractPhaseType, type ContractSectionCategory, type PaymentMilestoneStatus } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import { asObject, textArray, textValue } from './formatters';
import type { ContractDocumentData, ContractDocumentDeliverable, ContractDocumentParty } from './types';

const contractDocumentInclude = {
  lead: { select: { id: true, company: true, email: true } },
  proposal: { select: { id: true, title: true, pdfUrl: true } },
  sections: { orderBy: { order: 'asc' } },
  phases: { orderBy: { order: 'asc' } },
  deliverables: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
  paymentMilestones: { orderBy: [{ expectedDate: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.ContractInclude;

export async function getContractDocumentData(contractId: string): Promise<ContractDocumentData | null> {
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: contractDocumentInclude });
  if (!contract) return null;

  const clientSnapshot = asObject(contract.clientSnapshot);
  const providerSnapshot = asObject(contract.providerSnapshot);
  const projectSnapshot = asObject(contract.projectSnapshot);
  const financialSnapshot = asObject(contract.financialSnapshot);
  const termsSnapshot = asObject(contract.termsSnapshot);
  const operateSnapshot = asObject(financialSnapshot.operate);

  const deliverables: ContractDocumentDeliverable[] = contract.deliverables.map((deliverable) => ({
    id: deliverable.id,
    title: deliverable.title,
    description: deliverable.description,
    phase: deliverable.phase as ContractPhaseType | null,
    status: deliverable.status as ContractDeliverableStatus,
    estimatedDate: deliverable.estimatedDate,
    responsible: deliverable.responsible,
    acceptanceCriteria: deliverable.acceptanceCriteria,
  }));

  const data: ContractDocumentData = {
    id: contract.id,
    number: contract.number,
    title: contract.title,
    version: contract.version,
    status: contract.status,
    issueDate: contract.issueDate,
    validUntil: contract.validUntil,
    pdfUrl: contract.pdfUrl,
    pdfStorageKey: contract.pdfStorageKey,
    pdfHash: contract.pdfHash,
    generatedAt: contract.generatedAt,
    projectName: contract.projectName ?? textValue(projectSnapshot.name),
    serviceType: contract.serviceType,
    serviceTypeOther: contract.serviceTypeOther,
    plan: contract.plan,
    includesLaunch: contract.includesLaunch,
    includesOperate: contract.includesOperate,
    includesScale: contract.includesScale,
    includedServices: textArray(termsSnapshot.includedServices ?? projectSnapshot.includedServices),
    client: buildClientParty(clientSnapshot),
    provider: buildProviderParty(providerSnapshot),
    context: {
      executiveSummary: textValue(projectSnapshot.executiveSummary),
      projectObjective: textValue(projectSnapshot.projectObjective),
      identifiedProblems: textValue(projectSnapshot.identifiedProblems),
      proposedSolution: textValue(projectSnapshot.proposedSolution),
      includedScope: textValue(projectSnapshot.includedScope),
      excludedScope: textValue(projectSnapshot.excludedScope),
      dependencies: textValue(projectSnapshot.dependencies),
      assumptions: textValue(projectSnapshot.assumptions),
      acceptanceCriteria: textValue(projectSnapshot.acceptanceCriteria),
      implementationPlan: textValue(projectSnapshot.implementationPlan),
      nextSteps: textValue(projectSnapshot.nextSteps),
    },
    proposal: contract.proposal ? { id: contract.proposal.id, title: contract.proposal.title, pdfUrl: contract.proposal.pdfUrl } : null,
    lead: contract.lead ? { id: contract.lead.id, company: contract.lead.company, email: contract.lead.email } : null,
    sections: contract.sections
      .filter((section) => section.title.trim() && section.content.trim())
      .map((section) => ({
        id: section.id,
        title: section.title,
        category: section.category as ContractSectionCategory,
        content: section.content,
        order: section.order,
        isRequired: section.isRequired,
      })),
    phases: contract.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      phaseType: phase.phaseType as ContractPhaseType | null,
      order: phase.order,
      startsAt: phase.startsAt,
      endsAt: phase.endsAt,
      duration: phase.duration,
      description: phase.description,
      dependencies: phase.dependencies,
      paymentMilestone: phase.paymentMilestone,
      approvalCriteria: phase.approvalCriteria,
      deliverables: deliverables.filter((deliverable) => deliverable.phase && deliverable.phase === phase.phaseType),
    })),
    deliverables,
    payments: contract.paymentMilestones.map((payment) => ({
      id: payment.id,
      percentage: payment.percentage?.toString() ?? null,
      amount: payment.amount?.toString() ?? null,
      currency: payment.currency,
      invoiceMoment: payment.invoiceMoment,
      expectedDate: payment.expectedDate,
      description: payment.description,
      status: payment.status as PaymentMilestoneStatus,
      billingCondition: payment.billingCondition,
    })),
    financials: {
      currency: textValue(financialSnapshot.currency) ?? contract.currency,
      commercialValue: textValue(financialSnapshot.commercialValue) ?? contract.estimatedValue?.toString() ?? null,
      discount: textValue(financialSnapshot.discount),
      finalValue: textValue(financialSnapshot.finalValue) ?? contract.estimatedValue?.toString() ?? null,
      vatRate: textValue(financialSnapshot.vatRate),
      valueWithVat: textValue(financialSnapshot.valueWithVat),
      taxStatus: textValue(financialSnapshot.taxStatus),
      proposalValidity: textValue(financialSnapshot.proposalValidity),
      paymentDueDate: textValue(financialSnapshot.paymentDueDate),
      paymentPlan: textValue(financialSnapshot.paymentPlan),
      specialCondition: textValue(financialSnapshot.specialCondition),
      operateMonthlyFee: textValue(operateSnapshot.monthlyFee),
      operatePeriodicity: textValue(operateSnapshot.periodicity),
      operateFreeMonths: textValue(operateSnapshot.freeMonths),
      operateBillingStartDate: textValue(operateSnapshot.billingStartDate),
      operateMinimumStay: textValue(operateSnapshot.minimumStay),
      operateNoticePeriod: textValue(operateSnapshot.noticePeriod),
      operateAutoRenewal: Boolean(operateSnapshot.autoRenewal),
      setupFee: textValue(operateSnapshot.setupFee),
      thirdPartyCosts: textValue(operateSnapshot.thirdPartyCosts),
    },
    warnings: [],
  };

  data.warnings = buildWarnings(data);
  return data;
}

function buildClientParty(snapshot: Record<string, unknown>): ContractDocumentParty {
  return {
    legalName: textValue(snapshot.legalName ?? snapshot.companyName),
    tradeName: textValue(snapshot.tradeName),
    taxId: textValue(snapshot.taxId),
    address: textValue(snapshot.fiscalAddress ?? snapshot.address),
    postalCode: textValue(snapshot.postalCode),
    city: textValue(snapshot.city),
    country: textValue(snapshot.country),
    email: textValue(snapshot.email),
    phone: textValue(snapshot.phone),
    website: textValue(snapshot.website),
    representative: textValue(snapshot.representative ?? snapshot.contactName),
    representativeRole: textValue(snapshot.representativeRole),
    representativeEmail: textValue(snapshot.representativeEmail),
  };
}

function buildProviderParty(snapshot: Record<string, unknown>): ContractDocumentParty {
  return {
    legalName: textValue(snapshot.legalName),
    tradeName: textValue(snapshot.tradeName),
    taxId: textValue(snapshot.taxId),
    address: textValue(snapshot.address),
    email: textValue(snapshot.email),
    phone: textValue(snapshot.phone),
    website: textValue(snapshot.website),
    representative: textValue(snapshot.representative),
    representativeRole: textValue(snapshot.representativeRole),
  };
}

function buildWarnings(data: ContractDocumentData): string[] {
  return [
    !data.provider.legalName || !data.provider.taxId || !data.provider.address ? 'Dados legais da Norm8 incompletos.' : null,
    !data.client.legalName && !data.client.tradeName ? 'Cliente sem nome legal/comercial definido.' : null,
    !data.client.taxId ? 'Cliente sem NIF definido.' : null,
    data.sections.filter((section) => section.isRequired).length === 0 ? 'Sem clausulas obrigatorias selecionadas.' : null,
    !data.financials.finalValue && !data.financials.commercialValue ? 'Valores financeiros incompletos.' : null,
  ].filter((warning): warning is string => Boolean(warning));
}