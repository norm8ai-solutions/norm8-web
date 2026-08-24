import type { FinanceTransactionStatus, FinanceTransactionType, Prisma } from '@/app/generated/prisma/client';
import { financePeriodOptions, type FinancePeriodKey } from './constants';
import { requireAdmin } from '@/lib/admin/auth';
import { getRecurringCostDashboard } from '@/lib/admin/finance-recurring-costs';
import { getFinanceAlerts } from '@/lib/admin/finance-alerts';
import { getFinanceForecastMetrics } from '@/lib/admin/finance-forecast';
import { getClientProfitabilityMetrics, parseFinanceProfitabilityFilters } from '@/lib/admin/finance-profitability';
import { prisma } from '@/lib/db/prisma';
import { getRecurringRevenueDashboard } from './recurring-revenue';


export type FinanceProposalOption = {
  createdAt: Date;
  id: string;
  label: string;
  leadId: string;
  status?: string | null;
  title: string;
};

export type FinanceProposalOptionsByLeadId = Record<string, FinanceProposalOption[]>;

export type FinanceClientOption = {
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  id: string;
  label: string;
  searchValue: string;
};

export type FinanceFilters = {
  categoryId?: string;
  period: FinancePeriodKey;
  profitability: ReturnType<typeof parseFinanceProfitabilityFilters>;
  query?: string;
  status?: FinanceTransactionStatus | 'ALL';
  type?: FinanceTransactionType | 'ALL';
};

const incomeCategories = ['Implementa\u00e7\u00e3o', 'Mensalidade', 'Automa\u00e7\u00e3o recorrente', 'Auditoria', 'Consultoria', 'Outro rendimento'];
const expenseCategories = ['Software', 'Infraestrutura', 'Marketing', 'Subcontrata\u00e7\u00e3o', 'Ferramentas IA', 'Dom\u00ednios', 'Contabilidade', 'Impostos', 'Outro custo'];

const financeDefaultCategoryNameCorrections: Array<{ corrupted: string; correct: string; type: FinanceTransactionType }> = [
  { corrupted: 'Implementa\u00c3\u00a7\u00c3\u00a3o', correct: 'Implementa\u00e7\u00e3o', type: 'INCOME' },
  { corrupted: 'Implementa\u00c3\u0192\u00c2\u00a7\u00c3\u0192\u00c2\u00a3o', correct: 'Implementa\u00e7\u00e3o', type: 'INCOME' },
  { corrupted: 'Automa\u00c3\u00a7\u00c3\u00a3o recorrente', correct: 'Automa\u00e7\u00e3o recorrente', type: 'INCOME' },
  { corrupted: 'Automa\u00c3\u0192\u00c2\u00a7\u00c3\u0192\u00c2\u00a3o recorrente', correct: 'Automa\u00e7\u00e3o recorrente', type: 'INCOME' },
  { corrupted: 'Subcontrata\u00c3\u00a7\u00c3\u00a3o', correct: 'Subcontrata\u00e7\u00e3o', type: 'EXPENSE' },
  { corrupted: 'Subcontrata\u00c3\u0192\u00c2\u00a7\u00c3\u0192\u00c2\u00a3o', correct: 'Subcontrata\u00e7\u00e3o', type: 'EXPENSE' },
  { corrupted: 'Dom\u00c3\u00adnios', correct: 'Dom\u00ednios', type: 'EXPENSE' },
  { corrupted: 'Dom\u00c3\u0192\u00c2\u00adnios', correct: 'Dom\u00ednios', type: 'EXPENSE' },
  { corrupted: 'Automa\u00c3\u00a7\u00c3\u00a3o', correct: 'Automa\u00e7\u00e3o', type: 'EXPENSE' },
  { corrupted: 'Automa\u00c3\u0192\u00c2\u00a7\u00c3\u0192\u00c2\u00a3o', correct: 'Automa\u00e7\u00e3o', type: 'EXPENSE' },
];


export async function ensureFinanceDefaults(): Promise<void> {
  await normalizeFinanceDefaultCategoryNames();

  const account = await prisma.financeAccount.findFirst({
    where: { name: 'Conta principal', currency: 'EUR' },
    select: { id: true },
  });

  if (!account) {
    await prisma.financeAccount.create({ data: { currency: 'EUR', isDefault: true, name: 'Conta principal' } });
  }

  for (const name of incomeCategories) await ensureCategory(name, 'INCOME');
  for (const name of expenseCategories) await ensureCategory(name, 'EXPENSE');
}

async function ensureCategory(name: string, type: FinanceTransactionType): Promise<void> {
  const category = await prisma.financeCategory.findFirst({ where: { name, type }, select: { id: true } });
  if (!category) await prisma.financeCategory.create({ data: { isDefault: true, name, type } });
}

async function normalizeFinanceDefaultCategoryNames(): Promise<void> {
  for (const correction of financeDefaultCategoryNameCorrections) {
    const corruptedCategories = await prisma.financeCategory.findMany({
      where: { isDefault: true, name: correction.corrupted, type: correction.type },
      select: { id: true },
    });

    if (corruptedCategories.length === 0) continue;

    let correctCategory = await prisma.financeCategory.findFirst({
      where: { name: correction.correct, type: correction.type },
      select: { id: true },
    });

    if (!correctCategory) {
      correctCategory = await prisma.financeCategory.update({
        where: { id: corruptedCategories[0].id },
        data: { isDefault: true, name: correction.correct },
        select: { id: true },
      });
    }

    const duplicateCategories = corruptedCategories.filter((category) => category.id !== correctCategory.id);

    for (const duplicateCategory of duplicateCategories) {
      await prisma.$transaction([
        prisma.financeTransaction.updateMany({ where: { categoryId: duplicateCategory.id }, data: { categoryId: correctCategory.id } }),
        prisma.financeRecurringRevenue.updateMany({ where: { categoryId: duplicateCategory.id }, data: { categoryId: correctCategory.id } }),
        prisma.financeRecurringCost.updateMany({ where: { categoryId: duplicateCategory.id }, data: { categoryId: correctCategory.id } }),
        prisma.financeCategory.delete({ where: { id: duplicateCategory.id } }),
      ]);
    }
  }
}

export async function getFinanceDashboard(filters: FinanceFilters) {
  await ensureFinanceDefaults();
  const referenceDate = new Date();
  const periodWhere = getPeriodWhere(filters.period, referenceDate);
  const transactionWhere: Prisma.FinanceTransactionWhereInput = { ...periodWhere };
  const confirmedPeriodWhere: Prisma.FinanceTransactionWhereInput = {
    ...periodWhere,
    occurredAt: mergeDateWhere(periodWhere.occurredAt, { lte: referenceDate }),
  };

  if (filters.type && filters.type !== 'ALL') transactionWhere.type = filters.type;
  if (filters.status && filters.status !== 'ALL') transactionWhere.status = filters.status;
  if (filters.categoryId) transactionWhere.categoryId = filters.categoryId;
  if (filters.query) {
    transactionWhere.OR = [
      { title: { contains: filters.query, mode: 'insensitive' } },
      { clientName: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  const [confirmedIncome, confirmedExpense, pendingIncome, pendingExpense, recentTransactions, transactions, categories, accounts, clientOptions, proposalOptionsByLeadId, recurringRevenue, recurringCosts, forecast, profitability] = await Promise.all([
    sumAmount({ ...confirmedPeriodWhere, status: 'CONFIRMED', type: 'INCOME' }),
    sumAmount({ ...confirmedPeriodWhere, status: 'CONFIRMED', type: 'EXPENSE' }),
    sumAmount({ ...periodWhere, status: 'PENDING', type: 'INCOME' }),
    sumAmount({ ...periodWhere, status: 'PENDING', type: 'EXPENSE' }),
    prisma.financeTransaction.findMany({ include: { account: true, category: true }, orderBy: { occurredAt: 'desc' }, take: 10 }),
    prisma.financeTransaction.findMany({ include: { account: true, category: true }, orderBy: { occurredAt: 'desc' }, take: 100, where: transactionWhere }),
    prisma.financeCategory.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] }),
    prisma.financeAccount.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }),
    getFinanceClientOptions(),
    getFinanceProposalOptionsByLeadId(),
    getRecurringRevenueDashboard(periodWhere),
    getRecurringCostDashboard(),
    getFinanceForecastMetrics(referenceDate),
    getClientProfitabilityMetrics(filters.profitability),
  ]);

  const alerts = await getFinanceAlerts({ forecast, recurringRevenueMetrics: recurringRevenue.metrics, referenceDate });

  const profitCents = confirmedIncome - confirmedExpense;
  const pendingCents = pendingIncome + pendingExpense;
  const estimatedBalanceCents = confirmedIncome - confirmedExpense + pendingIncome - pendingExpense;
  const margin = confirmedIncome > 0 ? Math.round((profitCents / confirmedIncome) * 1000) / 10 : 0;

  return { accounts, alerts, categories, clientOptions, filters, forecast, metrics: { confirmedExpenseCents: confirmedExpense, confirmedIncomeCents: confirmedIncome, estimatedBalanceCents, margin, pendingCents, profitCents }, profitability, proposalOptionsByLeadId, recurringCosts, recurringRevenue, recentTransactions, transactions };
}

export async function getFinanceProposalOptionsByLeadId(): Promise<FinanceProposalOptionsByLeadId> {
  await requireAdmin();

  const proposals = await prisma.proposal.findMany({
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { version: 'desc' }],
    select: { createdAt: true, estimatedValue: true, id: true, leadId: true, status: true, title: true, updatedAt: true },
    take: 500,
  });

  return proposals.reduce<FinanceProposalOptionsByLeadId>((accumulator, proposal) => {
    const options = accumulator[proposal.leadId] ?? [];
    options.push({
      createdAt: proposal.createdAt,
      id: proposal.id,
      label: buildProposalLabel({
        createdAt: proposal.createdAt,
        estimatedValue: proposal.estimatedValue,
        status: proposal.status,
        title: proposal.title,
      }),
      leadId: proposal.leadId,
      status: proposal.status,
      title: proposal.title,
    });
    accumulator[proposal.leadId] = options;
    return accumulator;
  }, {});
}

function buildProposalLabel(proposal: { createdAt: Date; estimatedValue: Prisma.Decimal | null; status: string; title: string }): string {
  const parts = [proposal.title, formatProposalStatus(proposal.status)];
  const value = formatProposalValue(proposal.estimatedValue);
  if (value) parts.push(value);
  parts.push(formatDatePt(proposal.createdAt));
  return parts.join(' · ');
}

function formatProposalStatus(status: string): string {
  const labels: Record<string, string> = {
    ACCEPTED: 'Aceite',
    DRAFT: 'Rascunho',
    GENERATED: 'Gerada',
    REJECTED: 'Recusada',
    SENT: 'Enviada',
  };
  return labels[status] ?? status;
}

function formatProposalValue(value: Prisma.Decimal | null): string | null {
  if (!value) return null;
  const amount = Number(value.toString());
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat('pt-PT', { currency: 'EUR', style: 'currency' }).format(amount);
}

function formatDatePt(date: Date): string {
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}
export async function getFinanceClientOptions(): Promise<FinanceClientOption[]> {
  await requireAdmin();

  const leads = await prisma.lead.findMany({
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    select: { company: true, email: true, id: true, name: true },
    take: 250,
  });

  return leads.map((lead) => {
    const parts = [lead.company, lead.name, lead.email].filter(Boolean);

    return {
      companyName: lead.company,
      contactName: lead.name,
      email: lead.email,
      id: lead.id,
      label: parts.join(' \u00b7 '),
      searchValue: normalizeSearch(parts.join(' ')),
    };
  });
}

function normalizeSearch(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function parseFinanceFilters(searchParams: Record<string, string | string[] | undefined>): FinanceFilters {
  return {
    categoryId: normalizeAll(getSingle(searchParams.categoryId)),
    period: parsePeriod(getSingle(searchParams.period)),
    profitability: parseFinanceProfitabilityFilters(searchParams),
    query: getSingle(searchParams.q),
    status: parseStatus(getSingle(searchParams.status)),
    type: parseType(getSingle(searchParams.type)),
  };
}

function getSingle(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const trimmed = candidate?.trim();
  return trimmed || undefined;
}

function normalizeAll(value: string | undefined): string | undefined {
  return value && value !== 'ALL' ? value : undefined;
}

function parsePeriod(value: string | undefined): FinancePeriodKey {
  return financePeriodOptions.some((option) => option.value === value) ? (value as FinancePeriodKey) : 'month';
}

function parseType(value: string | undefined): FinanceTransactionType | 'ALL' {
  return value === 'INCOME' || value === 'EXPENSE' ? value : 'ALL';
}

function parseStatus(value: string | undefined): FinanceTransactionStatus | 'ALL' {
  return value === 'PENDING' || value === 'CONFIRMED' || value === 'CANCELLED' ? value : 'ALL';
}

function getPeriodWhere(period: FinancePeriodKey, now = new Date()): Prisma.FinanceTransactionWhereInput {
  if (period === 'all') return {};
  if (period === 'last30') return { occurredAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
  if (period === 'year') return { occurredAt: { gte: new Date(now.getFullYear(), 0, 1) } };
  if (period === 'quarter') return { occurredAt: { gte: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1) } };
  return { occurredAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
}

type FinanceTransactionDateWhere = NonNullable<Prisma.FinanceTransactionWhereInput['occurredAt']>;

function mergeDateWhere(left: FinanceTransactionDateWhere | undefined, right: Prisma.DateTimeFilter<'FinanceTransaction'>): FinanceTransactionDateWhere {
  if (left instanceof Date || typeof left === 'string') return { equals: left, ...right };
  return { ...(left ?? {}), ...right };
}

async function sumAmount(where: Prisma.FinanceTransactionWhereInput): Promise<number> {
  const aggregate = await prisma.financeTransaction.aggregate({ _sum: { amountCents: true }, where });
  return aggregate._sum.amountCents ?? 0;
}
