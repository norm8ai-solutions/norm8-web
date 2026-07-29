import 'server-only';

import type { ContractStatus } from '@/app/generated/prisma/client';

export type ContractGovernanceInput = {
  status: ContractStatus;
  pdfUrl?: string | null;
  pdfStorageKey?: string | null;
  pdfHash?: string | null;
  generatedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  pendingChangeReason?: string | null;
  pendingChangeAt?: Date | string | null;
  versions?: Array<{ id: string; version: number; pdfHash?: string | null }>;
};

export type ContractEditability = {
  canEdit: boolean;
  canGeneratePdf: boolean;
  canRegeneratePdf: boolean;
  canCreateRevision: boolean;
  requiresChangeReason: boolean;
  reason?: string;
};

export type ReadyToSendCheck = {
  ok: boolean;
  missingFields: string[];
};

const DIRECTLY_EDITABLE: ContractStatus[] = ['DRAFT', 'IN_REVIEW'];
const REVISION_ALLOWED: ContractStatus[] = ['READY_TO_SEND', 'SENT', 'VIEWED', 'AWAITING_SIGNATURE', 'REJECTED', 'EXPIRED', 'CANCELLED'];
const TERMINAL: ContractStatus[] = ['SIGNED'];

export function getContractEditability(contract: ContractGovernanceInput): ContractEditability {
  const hasPdf = hasGeneratedPdf(contract);

  if (TERMINAL.includes(contract.status)) {
    return {
      canEdit: false,
      canGeneratePdf: false,
      canRegeneratePdf: false,
      canCreateRevision: false,
      requiresChangeReason: false,
      reason: 'Este contrato já foi assinado e está bloqueado para edição.',
    };
  }

  if (DIRECTLY_EDITABLE.includes(contract.status)) {
    return {
      canEdit: true,
      canGeneratePdf: true,
      canRegeneratePdf: hasPdf && hasUnpublishedChanges(contract),
      canCreateRevision: false,
      requiresChangeReason: contract.status !== 'DRAFT' || hasPdf,
      reason: hasPdf ? 'Este contrato já tem PDF gerado. Alterações relevantes devem indicar motivo antes de regenerar o PDF.' : undefined,
    };
  }

  return {
    canEdit: false,
    canGeneratePdf: false,
    canRegeneratePdf: false,
    canCreateRevision: REVISION_ALLOWED.includes(contract.status),
    requiresChangeReason: true,
    reason: 'Crie uma nova revisão ou reabra o contrato com motivo antes de alterar os dados.',
  };
}

export function hasGeneratedPdf(contract: Pick<ContractGovernanceInput, 'pdfUrl' | 'pdfStorageKey' | 'pdfHash' | 'generatedAt'>): boolean {
  return Boolean(contract.pdfUrl || contract.pdfStorageKey || contract.pdfHash || contract.generatedAt);
}

export function assertContractCanBeEdited(contract: ContractGovernanceInput, changeReason?: string | null): void {
  const editability = getContractEditability(contract);
  if (!editability.canEdit) {
    throw new ContractGovernanceError('locked', editability.reason ?? 'Este contrato já não pode ser editado diretamente.');
  }

  if (editability.requiresChangeReason && !normalizeChangeReason(changeReason)) {
    throw new ContractGovernanceError('reason_required', 'Indique o motivo da alteração antes de guardar este contrato.');
  }
}

export function assertContractCanGeneratePdf(contract: ContractGovernanceInput, changeReason?: string | null): void {
  const editability = getContractEditability(contract);
  const isRegeneration = hasGeneratedPdf(contract);
  if (isRegeneration && !hasUnpublishedChanges(contract)) {
    throw new ContractGovernanceError('pdf_current', 'O PDF atual já corresponde à versão mais recente do contrato.');
  }
  if (isRegeneration ? !editability.canRegeneratePdf : !editability.canGeneratePdf) {
    throw new ContractGovernanceError('locked', editability.reason ?? 'Este contrato já não pode gerar ou regenerar PDF diretamente.');
  }

  if ((contract.status !== 'DRAFT' || isRegeneration) && !normalizeChangeReason(changeReason)) {
    throw new ContractGovernanceError('reason_required', 'Indique o motivo da geração ou regeneração do PDF.');
  }
}

export function normalizeChangeReason(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length >= 8 ? normalized.slice(0, 500) : null;
}

export function validateContractReadyToSend(contract: ContractGovernanceInput & {
  clientSnapshot?: unknown;
  providerSnapshot?: unknown;
  estimatedValue?: unknown;
  paymentMilestones?: Array<{ amount?: unknown; percentage?: unknown; invoiceMoment?: string | null; expectedDate?: Date | string | null; billingCondition?: string | null }>;
}): ReadyToSendCheck {
  const missingFields: string[] = [];
  const client = objectValue(contract.clientSnapshot);
  const provider = objectValue(contract.providerSnapshot);

  addMissing(missingFields, !text(client.legalName) && !text(client.companyName), 'Cliente: denominação social');
  addMissing(missingFields, !text(client.taxId), 'Cliente: NIF');
  addMissing(missingFields, !text(client.email), 'Cliente: email');
  addMissing(missingFields, !text(client.representative), 'Cliente: representante');
  addMissing(missingFields, !text(provider.legalName), 'Norm8: nome legal');
  addMissing(missingFields, !text(provider.taxId), 'Norm8: NIF');
  addMissing(missingFields, !text(provider.email), 'Norm8: email');
  addMissing(missingFields, !contract.estimatedValue, 'Investimento: valor final');
  addMissing(missingFields, !contract.paymentMilestones?.length, 'Investimento: plano de pagamentos');
  contract.paymentMilestones?.forEach((payment, index) => {
    const prefix = `Pagamento ${index + 1}`;
    addMissing(missingFields, !payment.amount && !payment.percentage, `${prefix}: valor ou percentagem`);
    addMissing(missingFields, !payment.invoiceMoment, `${prefix}: momento de faturação`);
    addMissing(missingFields, !payment.billingCondition, `${prefix}: condição de faturação`);
  });
  addMissing(missingFields, !contract.pdfHash, 'PDF: hash SHA-256');
  addMissing(missingFields, !contract.versions?.length, 'PDF: versão gerada');
  addMissing(missingFields, hasUnpublishedChanges(contract), 'PDF: regenerar depois da última alteração');
  addMissing(missingFields, ['SIGNED', 'CANCELLED', 'EXPIRED'].includes(contract.status), 'Estado: contrato não pode ser enviado neste estado');

  return { ok: missingFields.length === 0, missingFields };
}

export function hasUnpublishedChanges(contract: Pick<ContractGovernanceInput, 'generatedAt' | 'pendingChangeReason' | 'pendingChangeAt'>): boolean {
  if (normalizeChangeReason(contract.pendingChangeReason)) return true;
  if (!contract.pendingChangeAt) return false;
  if (!contract.generatedAt) return true;

  const pendingChangeAt = new Date(contract.pendingChangeAt).getTime();
  const generatedAt = new Date(contract.generatedAt).getTime();
  if (Number.isNaN(pendingChangeAt) || Number.isNaN(generatedAt)) return true;

  return pendingChangeAt > generatedAt;
}
export class ContractGovernanceError extends Error {
  constructor(public readonly code: 'locked' | 'reason_required' | 'invalid_transition' | 'ready_to_send_failed' | 'pdf_current', message: string, public readonly missingFields: string[] = []) {
    super(message);
    this.name = 'ContractGovernanceError';
  }
}

function addMissing(fields: string[], condition: boolean, label: string) {
  if (condition) fields.push(label);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
