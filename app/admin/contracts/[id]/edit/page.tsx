import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { ContractSectionCategory } from '@/app/generated/prisma/client';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { ContractWizard, type ContractWizardPayload } from '@/components/contracts/ContractWizard';
import { updateContractWizardAction } from '@/lib/contracts/actions';
import { getContractEditorContext } from '@/lib/contracts/queries';
import { normalizePortugueseText } from '@/lib/text/normalize-portuguese';

type ContractEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function ContractEditPage({ params, searchParams }: ContractEditPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const context = await getContractEditorContext(id);

  if (!context.contract) {
    notFound();
  }

  const contract = context.contract;
  const isEditable = contract.status === 'DRAFT' || contract.status === 'IN_REVIEW';

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title={`Editar ${contract.number}`}
        subtitle="Editor wizard para rascunhos e contratos em revisão."
        action={
          <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}`}>
            <ArrowLeft size={14} />Voltar
          </Link>
        }
      >
        {query?.error === 'invalid' ? (
          <p className="admin-action-execution-error">Confirme os campos obrigatórios antes de guardar.</p>
        ) : null}
        {query?.error === 'locked' ? (
          <p className="admin-action-execution-error">Este contrato já não permite edição direta.</p>
        ) : null}
        {query?.error === 'admin' ? (
          <p className="admin-action-execution-error">Não foi possível guardar o contrato porque não existe um administrador ativo associado. Crie um utilizador admin ou ative o modo demo corretamente.</p>
        ) : null}
        <ContractWizard
          action={updateContractWizardAction}
          admins={context.admins}
          contractId={contract.id}
          initialPayload={buildInitialPayload(contract)}
          isEditable={isEditable}
          leads={context.leads}
          legalSettings={context.legalSettings ? mapLegalSettings(context.legalSettings) : null}
          mode="edit"
          proposals={context.proposals.map((proposal) => ({ ...proposal, estimatedValue: proposal.estimatedValue?.toString() ?? null, createdAt: proposal.createdAt.toISOString(), updatedAt: proposal.updatedAt.toISOString() }))}
          templates={context.templates.map(mapTemplate)}
        />
      </AdminPanel>
    </div>
  );
}

function buildInitialPayload(contract: NonNullable<Awaited<ReturnType<typeof getContractEditorContext>>['contract']>): ContractWizardPayload {
  const client = jsonObject(contract.clientSnapshot);
  const provider = jsonObject(contract.providerSnapshot);
  const project = jsonObject(contract.projectSnapshot);
  const financial = jsonObject(contract.financialSnapshot);
  const operate = jsonObject(financial.operate);
  const terms = jsonObject(contract.termsSnapshot);

  return {
    title: contract.title,
    client: {
      leadId: contract.leadId,
      proposalId: contract.proposalId,
      tradeName: stringValue(client.tradeName),
      legalName: stringValue(client.legalName ?? client.companyName),
      taxId: stringValue(client.taxId),
      fiscalAddress: stringValue(client.fiscalAddress),
      postalCode: stringValue(client.postalCode),
      city: stringValue(client.city),
      country: stringValue(client.country) ?? 'Portugal',
      email: stringValue(client.email),
      phone: stringValue(client.phone),
      representative: stringValue(client.representative ?? client.contactName),
      representativeRole: stringValue(client.representativeRole),
      representativeEmail: stringValue(client.representativeEmail ?? client.email),
      projectName: contract.projectName ?? stringValue(project.name),
    },
    provider: {
      legalName: stringValue(provider.legalName) ?? '',
      tradeName: stringValue(provider.tradeName) ?? '',
      taxId: stringValue(provider.taxId) ?? '',
      address: stringValue(provider.address) ?? '',
      email: stringValue(provider.email) ?? '',
      phone: stringValue(provider.phone) ?? '',
      website: stringValue(provider.website) ?? '',
      representative: stringValue(provider.representative) ?? '',
      representativeRole: stringValue(provider.representativeRole) ?? '',
      iban: stringValue(provider.iban) ?? '',
      bankName: stringValue(provider.bankName) ?? '',
      swiftBic: stringValue(provider.swiftBic),
    },
    service: {
      serviceType: contract.serviceType,
      serviceTypeOther: contract.serviceTypeOther,
      plan: contract.plan,
      includesLaunch: contract.includesLaunch,
      includesOperate: contract.includesOperate,
      includesScale: contract.includesScale,
      includedServices: stringArray(terms.includedServices ?? project.includedServices),
    },
    scope: {
      executiveSummary: stringValue(project.executiveSummary),
      projectObjective: stringValue(project.projectObjective),
      identifiedProblems: stringValue(project.identifiedProblems),
      proposedSolution: stringValue(project.proposedSolution),
      includedScope: stringValue(project.includedScope),
      excludedScope: stringValue(project.excludedScope),
      dependencies: stringValue(project.dependencies),
      assumptions: stringValue(project.assumptions),
      acceptanceCriteria: stringValue(project.acceptanceCriteria),
    },
    deliverables: contract.deliverables.map((deliverable) => ({
      title: deliverable.title,
      description: deliverable.description,
      phase: deliverable.phase,
      status: deliverable.status,
      estimatedDate: dateInput(deliverable.estimatedDate),
      responsible: deliverable.responsible,
      acceptanceCriteria: deliverable.acceptanceCriteria,
    })),
    phases: contract.phases.map((phase) => ({
      name: phase.name,
      phaseType: phase.phaseType,
      startsAt: dateInput(phase.startsAt),
      endsAt: dateInput(phase.endsAt),
      duration: phase.duration,
      description: phase.description,
      dependencies: phase.dependencies,
      paymentMilestone: phase.paymentMilestone,
      approvalCriteria: phase.approvalCriteria,
    })),
    financials: {
      currency: stringValue(financial.currency) ?? contract.currency,
      commercialValue: stringValue(financial.commercialValue) ?? contract.estimatedValue?.toString() ?? '',
      specialCondition: stringValue(financial.specialCondition),
      discount: stringValue(financial.discount),
      finalValue: stringValue(financial.finalValue) ?? contract.estimatedValue?.toString() ?? '',
      vatRate: stringValue(financial.vatRate),
      valueWithVat: stringValue(financial.valueWithVat),
      taxStatus: stringValue(financial.taxStatus),
      proposalValidity: dateInputFromString(stringValue(financial.proposalValidity)),
      paymentDueDate: dateInputFromString(stringValue(financial.paymentDueDate)),
      paymentPlan: stringValue(financial.paymentPlan),
      operateMonthlyFee: stringValue(operate.monthlyFee),
      operatePeriodicity: stringValue(operate.periodicity),
      operateFreeMonths: stringValue(operate.freeMonths),
      operateBillingStartDate: dateInputFromString(stringValue(operate.billingStartDate)),
      operateMinimumStay: stringValue(operate.minimumStay),
      operateNoticePeriod: stringValue(operate.noticePeriod),
      operateAutoRenewal: Boolean(operate.autoRenewal),
      setupFee: stringValue(operate.setupFee),
      thirdPartyCosts: stringValue(operate.thirdPartyCosts),
    },
    paymentMilestones: contract.paymentMilestones.map((payment) => ({
      percentage: payment.percentage?.toString() ?? null,
      amount: payment.amount?.toString() ?? null,
      invoiceMoment: payment.invoiceMoment,
      expectedDate: dateInput(payment.expectedDate),
      description: payment.description,
      status: payment.status,
      billingCondition: payment.billingCondition,
    })),
    sections: contract.sections.map((section, index) => ({
      id: section.id,
      templateSectionId: section.templateSectionId,
      category: section.category as ContractSectionCategory,
      title: section.title,
      content: section.content,
      order: index + 1,
      isRequired: section.isRequired,
      enabled: true,
      sourceVersion: section.sourceVersion,
    })),
    assignedToId: contract.assignedToId,
    validUntil: dateInput(contract.validUntil),
  };
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return normalizePortugueseText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function dateInput(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function dateInputFromString(value: string | null): string | null {
  return value ? dateInput(value) : null;
}
function mapLegalSettings(settings: NonNullable<Awaited<ReturnType<typeof getContractEditorContext>>['legalSettings']>) {
  return {
    legalName: settings.legalName,
    tradeName: settings.tradeName,
    taxId: settings.taxId,
    address: settings.address,
    email: settings.email,
    phone: settings.phone,
    website: settings.website,
    representative: settings.representative,
    representativeRole: settings.representativeRole,
    iban: settings.iban,
    bankName: settings.bankName,
    swiftBic: settings.swiftBic,
  };
}

function mapTemplate(template: Awaited<ReturnType<typeof getContractEditorContext>>['templates'][number]) {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    sections: template.sections.map((section) => ({
      id: section.id,
      category: section.category,
      title: section.title,
      content: section.content,
      order: section.order,
      isRequired: section.isRequired,
      version: section.version,
    })),
  };
}