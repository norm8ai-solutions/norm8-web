import 'server-only';

import type { FinanceTransactionStatus, FinanceTransactionType, Prisma } from '@/app/generated/prisma/client';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db/prisma';
import type { FinancePeriodKey } from '@/lib/finance/constants';

export type FinanceProfitabilityStatusFilter = 'confirmed' | 'withPending';
export type FinanceProfitabilitySortKey = 'profit' | 'revenue' | 'margin' | 'expenses' | 'recent';

export type FinanceProfitabilityFilters = {
  period: FinancePeriodKey;
  sort: FinanceProfitabilitySortKey;
  status: FinanceProfitabilityStatusFilter;
};

export type FinanceClientProfitability = {
  id: string;
  clientName: string;
  leadId: string | null;
  primaryProposalId: string | null;
  primaryContractId: string | null;
  totalRevenueCents: number;
  totalExpensesCents: number;
  profitCents: number;
  marginPercentage: number | null;
  transactionCount: number;
  proposalCount: number;
  contractCount: number;
  activeRecurringRevenueCents: number;
  latestTransactionAt: Date | null;
};

export type FinanceProfitabilityDashboard = {
  filters: FinanceProfitabilityFilters;
  items: FinanceClientProfitability[];
  metrics: {
    associatedExpenseCents: number;
    associatedProfitCents: number;
    associatedRevenueCents: number;
    bestMarginClient: FinanceClientProfitability | null;
    mostProfitableClient: FinanceClientProfitability | null;
    totalClients: number;
  };
};

type ProfitabilityTransaction = {
  amountCents: number;
  clientName: string | null;
  contractId: string | null;
  id: string;
  leadId: string | null;
  occurredAt: Date;
  proposalId: string | null;
  status: FinanceTransactionStatus;
  type: FinanceTransactionType;
};

type ProfitabilityRecurringRevenue = {
  clientName: string;
  contractId: string | null;
  leadId: string | null;
  monthlyAmountCents: number;
  proposalId: string | null;
};

type ProposalLookup = { companyName: string; id: string; leadId: string; title: string };
type ContractLookup = { id: string; leadId: string | null; proposalId: string | null; title: string };
type LeadLookup = { company: string; id: string; name: string | null };

type ProfitabilityGroup = {
  clientName: string;
  leadId: string | null;
  latestTransactionAt: Date | null;
  proposalIds: Set<string>;
  contractIds: Set<string>;
  totalRevenueCents: number;
  totalExpensesCents: number;
  transactionIds: Set<string>;
  activeRecurringRevenueCents: number;
};

const defaultProfitabilityFilters: FinanceProfitabilityFilters = {
  period: 'all',
  sort: 'profit',
  status: 'confirmed',
};

export function parseFinanceProfitabilityFilters(searchParams: Record<string, string | string[] | undefined>): FinanceProfitabilityFilters {
  return {
    period: parseProfitabilityPeriod(getSingle(searchParams.profitabilityPeriod)),
    sort: parseProfitabilitySort(getSingle(searchParams.profitabilitySort)),
    status: parseProfitabilityStatus(getSingle(searchParams.profitabilityStatus)),
  };
}

export async function getClientProfitabilityMetrics(filters: FinanceProfitabilityFilters = defaultProfitabilityFilters): Promise<FinanceProfitabilityDashboard> {
  await requireAdmin();

  const statuses: FinanceTransactionStatus[] = filters.status === 'withPending' ? ['CONFIRMED', 'PENDING'] : ['CONFIRMED'];

  const transactions = await prisma.financeTransaction.findMany({
    orderBy: { occurredAt: 'desc' },
    select: { amountCents: true, clientName: true, contractId: true, id: true, leadId: true, occurredAt: true, proposalId: true, status: true, type: true },
    where: {
      ...getPeriodWhere(filters.period),
      OR: [
        { leadId: { not: null } },
        { proposalId: { not: null } },
        { contractId: { not: null } },
        { clientName: { not: null } },
      ],
      status: { in: statuses },
    },
  });

  const activeRecurringRevenues = await prisma.financeRecurringRevenue.findMany({
    select: { clientName: true, contractId: true, leadId: true, monthlyAmountCents: true, proposalId: true },
    where: {
      status: 'ACTIVE',
      OR: [
        { leadId: { not: null } },
        { proposalId: { not: null } },
        { contractId: { not: null } },
        { clientName: { not: '' } },
      ],
    },
  });

  const lookup = await buildCommercialLookup(transactions, activeRecurringRevenues);
  const groups = new Map<string, ProfitabilityGroup>();

  for (const transaction of transactions) {
    const identity = resolveClientIdentity(transaction, lookup);
    if (!identity) continue;

    const group = getOrCreateGroup(groups, identity);
    group.transactionIds.add(transaction.id);
    group.latestTransactionAt = getLatestDate(group.latestTransactionAt, transaction.occurredAt);
    if (transaction.proposalId) group.proposalIds.add(transaction.proposalId);
    if (transaction.contractId) group.contractIds.add(transaction.contractId);

    if (transaction.type === 'INCOME') group.totalRevenueCents += transaction.amountCents;
    if (transaction.type === 'EXPENSE') group.totalExpensesCents += transaction.amountCents;
  }

  for (const recurringRevenue of activeRecurringRevenues) {
    const identity = resolveClientIdentity(recurringRevenue, lookup);
    if (!identity) continue;

    const group = getOrCreateGroup(groups, identity);
    group.activeRecurringRevenueCents += recurringRevenue.monthlyAmountCents;
    if (recurringRevenue.proposalId) group.proposalIds.add(recurringRevenue.proposalId);
    if (recurringRevenue.contractId) group.contractIds.add(recurringRevenue.contractId);
  }

  const items = [...groups.entries()].map(([id, group]) => {
    const profitCents = group.totalRevenueCents - group.totalExpensesCents;
    const marginPercentage = group.totalRevenueCents > 0 ? Math.round((profitCents / group.totalRevenueCents) * 1000) / 10 : null;

    return {
      id,
      activeRecurringRevenueCents: group.activeRecurringRevenueCents,
      clientName: group.clientName,
      contractCount: group.contractIds.size,
      latestTransactionAt: group.latestTransactionAt,
      leadId: group.leadId,
      marginPercentage,
      primaryContractId: [...group.contractIds][0] ?? null,
      primaryProposalId: [...group.proposalIds][0] ?? null,
      profitCents,
      proposalCount: group.proposalIds.size,
      totalExpensesCents: group.totalExpensesCents,
      totalRevenueCents: group.totalRevenueCents,
      transactionCount: group.transactionIds.size,
    } satisfies FinanceClientProfitability;
  });

  items.sort(getProfitabilitySorter(filters.sort));

  const associatedRevenueCents = items.reduce((total, item) => total + item.totalRevenueCents, 0);
  const associatedExpenseCents = items.reduce((total, item) => total + item.totalExpensesCents, 0);
  const associatedProfitCents = associatedRevenueCents - associatedExpenseCents;
  const mostProfitableClient = [...items].sort(getProfitabilitySorter('profit'))[0] ?? null;
  const bestMarginClient = [...items].filter((item) => item.marginPercentage !== null).sort(getProfitabilitySorter('margin'))[0] ?? null;

  return {
    filters,
    items,
    metrics: {
      associatedExpenseCents,
      associatedProfitCents,
      associatedRevenueCents,
      bestMarginClient,
      mostProfitableClient,
      totalClients: items.length,
    },
  };
}

export async function getProjectProfitabilityMetrics(filters?: FinanceProfitabilityFilters): Promise<FinanceProfitabilityDashboard> {
  return getClientProfitabilityMetrics(filters);
}

export async function getProfitabilityByLeadId(leadId: string): Promise<FinanceClientProfitability | null> {
  const dashboard = await getClientProfitabilityMetrics({ ...defaultProfitabilityFilters, period: 'all' });
  return dashboard.items.find((item) => item.leadId === leadId) ?? null;
}

export async function getProfitabilityByProposalId(proposalId: string): Promise<FinanceClientProfitability | null> {
  const dashboard = await getClientProfitabilityMetrics({ ...defaultProfitabilityFilters, period: 'all' });
  return dashboard.items.find((item) => item.primaryProposalId === proposalId) ?? null;
}

export async function getProfitabilityByContractId(contractId: string): Promise<FinanceClientProfitability | null> {
  const dashboard = await getClientProfitabilityMetrics({ ...defaultProfitabilityFilters, period: 'all' });
  return dashboard.items.find((item) => item.primaryContractId === contractId) ?? null;
}

async function buildCommercialLookup(transactions: ProfitabilityTransaction[], recurringRevenues: ProfitabilityRecurringRevenue[]) {
  const leadIds = new Set<string>();
  const proposalIds = new Set<string>();
  const contractIds = new Set<string>();

  for (const item of [...transactions, ...recurringRevenues]) {
    if (item.leadId) leadIds.add(item.leadId);
    if (item.proposalId) proposalIds.add(item.proposalId);
    if (item.contractId) contractIds.add(item.contractId);
  }

  const contracts = contractIds.size > 0
    ? await prisma.contract.findMany({ where: { id: { in: [...contractIds] } }, select: { id: true, leadId: true, proposalId: true, title: true } })
    : [];

  for (const contract of contracts) {
    if (contract.leadId) leadIds.add(contract.leadId);
    if (contract.proposalId) proposalIds.add(contract.proposalId);
  }

  const proposals = proposalIds.size > 0
    ? await prisma.proposal.findMany({ where: { id: { in: [...proposalIds] } }, select: { companyName: true, id: true, leadId: true, title: true } })
    : [];

  for (const proposal of proposals) leadIds.add(proposal.leadId);

  const leads = leadIds.size > 0
    ? await prisma.lead.findMany({ where: { id: { in: [...leadIds] } }, select: { company: true, id: true, name: true } })
    : [];

  return {
    contractsById: new Map<string, ContractLookup>(contracts.map((contract) => [contract.id, contract])),
    leadsById: new Map<string, LeadLookup>(leads.map((lead) => [lead.id, lead])),
    proposalsById: new Map<string, ProposalLookup>(proposals.map((proposal) => [proposal.id, proposal])),
  };
}

function resolveClientIdentity(item: { clientName: string | null; contractId: string | null; leadId: string | null; proposalId: string | null }, lookup: Awaited<ReturnType<typeof buildCommercialLookup>>): { clientName: string; key: string; leadId: string | null } | null {
  const leadId = resolveLeadId(item, lookup);
  if (leadId) {
    const lead = lookup.leadsById.get(leadId);
    return { clientName: lead?.company ?? item.clientName ?? 'Cliente sem nome', key: 'lead:' + leadId, leadId };
  }

  if (item.proposalId) {
    const proposal = lookup.proposalsById.get(item.proposalId);
    return { clientName: proposal?.companyName ?? item.clientName ?? proposal?.title ?? 'Projeto sem cliente', key: 'proposal:' + item.proposalId, leadId: null };
  }

  if (item.contractId) {
    const contract = lookup.contractsById.get(item.contractId);
    return { clientName: item.clientName ?? contract?.title ?? 'Contrato sem cliente', key: 'contract:' + item.contractId, leadId: null };
  }

  const clientName = item.clientName?.trim();
  if (!clientName) return null;

  return { clientName, key: 'manual:' + normalizeClientName(clientName), leadId: null };
}

function resolveLeadId(item: { contractId: string | null; leadId: string | null; proposalId: string | null }, lookup: Awaited<ReturnType<typeof buildCommercialLookup>>): string | null {
  if (item.leadId) return item.leadId;
  if (item.proposalId) return lookup.proposalsById.get(item.proposalId)?.leadId ?? null;
  if (!item.contractId) return null;

  const contract = lookup.contractsById.get(item.contractId);
  if (contract?.leadId) return contract.leadId;
  if (contract?.proposalId) return lookup.proposalsById.get(contract.proposalId)?.leadId ?? null;
  return null;
}

function getOrCreateGroup(groups: Map<string, ProfitabilityGroup>, identity: { clientName: string; key: string; leadId: string | null }): ProfitabilityGroup {
  const existing = groups.get(identity.key);
  if (existing) return existing;

  const group: ProfitabilityGroup = {
    activeRecurringRevenueCents: 0,
    clientName: identity.clientName,
    contractIds: new Set<string>(),
    latestTransactionAt: null,
    leadId: identity.leadId,
    proposalIds: new Set<string>(),
    totalExpensesCents: 0,
    totalRevenueCents: 0,
    transactionIds: new Set<string>(),
  };

  groups.set(identity.key, group);
  return group;
}

function getLatestDate(current: Date | null, candidate: Date): Date {
  return !current || candidate > current ? candidate : current;
}

function getProfitabilitySorter(sort: FinanceProfitabilitySortKey): (a: FinanceClientProfitability, b: FinanceClientProfitability) => number {
  return (a, b) => {
    if (sort === 'revenue') return b.totalRevenueCents - a.totalRevenueCents;
    if (sort === 'expenses') return b.totalExpensesCents - a.totalExpensesCents;
    if (sort === 'margin') return (b.marginPercentage ?? -Infinity) - (a.marginPercentage ?? -Infinity);
    if (sort === 'recent') return (b.latestTransactionAt?.getTime() ?? 0) - (a.latestTransactionAt?.getTime() ?? 0);
    return b.profitCents - a.profitCents;
  };
}

function getPeriodWhere(period: FinancePeriodKey): Prisma.FinanceTransactionWhereInput {
  const now = new Date();
  if (period === 'all') return {};
  if (period === 'last30') return { occurredAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
  if (period === 'year') return { occurredAt: { gte: new Date(now.getFullYear(), 0, 1) } };
  if (period === 'quarter') return { occurredAt: { gte: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1) } };
  return { occurredAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
}

function parseProfitabilityPeriod(value: string | undefined): FinancePeriodKey {
  return value === 'month' || value === 'last30' || value === 'quarter' || value === 'year' || value === 'all' ? value : defaultProfitabilityFilters.period;
}

function parseProfitabilityStatus(value: string | undefined): FinanceProfitabilityStatusFilter {
  return value === 'withPending' ? 'withPending' : defaultProfitabilityFilters.status;
}

function parseProfitabilitySort(value: string | undefined): FinanceProfitabilitySortKey {
  return value === 'revenue' || value === 'margin' || value === 'expenses' || value === 'recent' || value === 'profit' ? value : defaultProfitabilityFilters.sort;
}

function getSingle(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const trimmed = candidate?.trim();
  return trimmed || undefined;
}

function normalizeClientName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cliente-manual';
}
