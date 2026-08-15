import 'server-only';

import { Prisma, type FinanceTransaction, type FinanceTransactionSource } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';

type FinanceSyncResult =
  | { status: 'created'; transaction: FinanceTransaction }
  | { status: 'updated'; transaction: FinanceTransaction }
  | { status: 'skipped'; reason: 'missing-record' | 'missing-value' };

type FinanceTx = Prisma.TransactionClient | typeof prisma;

const IMPLEMENTATION_CATEGORY = 'Implementa\u00e7\u00e3o';
const DEFAULT_ACCOUNT = 'Conta principal';

export async function syncFinanceIncomeForProposal(proposalId: string): Promise<FinanceSyncResult> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { contracts: { orderBy: { updatedAt: 'desc' }, take: 1 }, lead: true },
  });

  if (!proposal) return { status: 'skipped', reason: 'missing-record' };

  const amountCents = toAmountCents(proposal.estimatedValue);
  if (!amountCents) return { status: 'skipped', reason: 'missing-value' };

  return upsertCommercialIncome({
    amountCents,
    clientName: proposal.companyName || proposal.lead.company,
    contractId: proposal.contracts[0]?.id ?? null,
    description:
      proposal.status === 'ACCEPTED'
        ? 'Entrada pendente atualizada automaticamente ap\u00f3s a aceita\u00e7\u00e3o da Proposta Final.'
        : 'Entrada pendente criada automaticamente a partir da Proposta Final.',
    leadId: proposal.leadId,
    proposalId: proposal.id,
    source: 'PROPOSAL',
    title: `Implementa\u00e7\u00e3o - ${proposal.companyName || proposal.lead.company}`,
  });
}

export async function syncFinanceIncomeForContract(contractId: string): Promise<FinanceSyncResult> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { lead: true, proposal: { include: { lead: true } } },
  });

  if (!contract) return { status: 'skipped', reason: 'missing-record' };

  const valueSource = contract.estimatedValue ?? contract.proposal?.estimatedValue ?? null;
  const amountCents = toAmountCents(valueSource);
  if (!amountCents) return { status: 'skipped', reason: 'missing-value' };

  const companyName =
    readJsonString(contract.clientSnapshot, ['companyName', 'company', 'legalName', 'name']) ??
    contract.proposal?.companyName ??
    contract.lead?.company ??
    'Cliente Norm8';
  const leadId = contract.leadId ?? contract.proposal?.leadId ?? null;

  return upsertCommercialIncome({
    amountCents,
    clientName: companyName,
    contractId: contract.id,
    description: contract.proposalId
      ? 'Entrada pendente associada automaticamente ao contrato criado a partir da Proposta Final.'
      : 'Entrada pendente criada automaticamente a partir do contrato.',
    leadId,
    proposalId: contract.proposalId,
    source: contract.proposalId ? 'PROPOSAL' : 'CONTRACT',
    title: `Implementa\u00e7\u00e3o - ${companyName}`,
  });
}

export async function ensureFinanceIncomeCategory(tx: FinanceTx = prisma) {
  const category = await tx.financeCategory.findFirst({
    where: { name: IMPLEMENTATION_CATEGORY, type: 'INCOME' },
    select: { id: true },
  });

  if (category) return category;

  return tx.financeCategory.create({
    data: { isDefault: true, name: IMPLEMENTATION_CATEGORY, type: 'INCOME' },
    select: { id: true },
  });
}

export async function ensureDefaultFinanceAccount(tx: FinanceTx = prisma) {
  const account = await tx.financeAccount.findFirst({
    where: { currency: 'EUR', name: DEFAULT_ACCOUNT },
    select: { id: true },
  });

  if (account) return account;

  return tx.financeAccount.create({
    data: { currency: 'EUR', isDefault: true, name: DEFAULT_ACCOUNT },
    select: { id: true },
  });
}

export function toAmountCents(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const normalized =
    value instanceof Prisma.Decimal
      ? value.toString()
      : typeof value === 'object' && 'toString' in value
        ? String(value)
        : String(value);

  const compact = normalized.trim().replace(/\s/g, '').replace(/\u20ac/g, '');
  if (!compact) return null;

  const hasComma = compact.includes(',');
  const hasDot = compact.includes('.');
  const decimalText =
    hasComma && hasDot
      ? compact.replace(/\./g, '').replace(',', '.')
      : hasComma
        ? compact.replace(',', '.')
        : compact;
  try {
    const decimal = new Prisma.Decimal(decimalText);

    if (!decimal.isFinite() || decimal.lessThanOrEqualTo(0)) return null;

    return decimal.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
  } catch {
    return null;
  }
}

async function upsertCommercialIncome(input: {
  amountCents: number;
  clientName: string;
  contractId?: string | null;
  description: string;
  leadId?: string | null;
  proposalId?: string | null;
  source: FinanceTransactionSource;
  title: string;
}): Promise<FinanceSyncResult> {
  const category = await ensureFinanceIncomeCategory();
  const account = await ensureDefaultFinanceAccount();
  let existing = input.proposalId
    ? await prisma.financeTransaction.findFirst({
        where: { proposalId: input.proposalId, source: 'PROPOSAL', type: 'INCOME' },
      })
    : null;

  if (!existing && input.contractId) {
    existing = await prisma.financeTransaction.findFirst({
      where: { contractId: input.contractId, source: { in: ['CONTRACT', 'PROPOSAL'] }, type: 'INCOME' },
    });
  }

  if (existing) {
    const transaction = await prisma.financeTransaction.update({
      where: { id: existing.id },
      data: {
        accountId: account.id,
        amountCents: input.amountCents,
        categoryId: category.id,
        clientName: input.clientName,
        contractId: input.contractId ?? existing.contractId,
        description: input.description,
        leadId: input.leadId ?? existing.leadId,
        proposalId: input.proposalId ?? existing.proposalId,
        source: input.source,
        status: existing.status === 'CANCELLED' ? existing.status : 'PENDING',
        title: input.title,
      },
    });

    return { status: 'updated', transaction };
  }

  const transaction = await prisma.financeTransaction.create({
    data: {
      accountId: account.id,
      amountCents: input.amountCents,
      categoryId: category.id,
      clientName: input.clientName,
      contractId: input.contractId ?? null,
      currency: 'EUR',
      description: input.description,
      dueDate: null,
      leadId: input.leadId ?? null,
      occurredAt: new Date(),
      paidAt: null,
      proposalId: input.proposalId ?? null,
      source: input.source,
      status: 'PENDING',
      title: input.title,
      type: 'INCOME',
    },
  });

  if (input.leadId) {
    await prisma.leadActivity.create({
      data: {
        leadId: input.leadId,
        type: 'FINANCE_INCOME_CREATED',
        message: 'Foi criada uma entrada pendente em Finance associada \u00e0 Proposta Final.',
        metadata: {
          amountCents: input.amountCents,
          contractId: input.contractId ?? null,
          financeTransactionId: transaction.id,
          proposalId: input.proposalId ?? null,
          source: input.source,
        },
      },
    });
  }

  return { status: 'created', transaction };
}

function readJsonString(value: Prisma.JsonValue, keys: string[]): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  for (const key of keys) {
    const record = value as Prisma.JsonObject;
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  return null;
}
