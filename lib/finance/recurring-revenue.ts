import 'server-only';

import type { FinanceRecurringRevenueStatus, Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';

export const TARGET_MRR_CENTS = 1_000_000;

const recurringCategoryName = 'Mensalidade';
const automationRecurringCategoryName = 'Automa\u00e7\u00e3o recorrente';
const defaultAccountName = 'Conta principal';

export type FinanceRecurringRevenueMetrics = {
  activeClients: number;
  arrCents: number;
  averageMonthlyRevenueCents: number;
  mrrCents: number;
  oneOffRevenueCents: number;
  recurringMonthlyRevenueCents: number;
  targetMrrCents: number;
  targetProgress: number;
};

export async function ensureRecurringRevenueDefaults() {
  const account = await ensureDefaultRecurringAccount();
  const category = await ensureRecurringRevenueCategory();
  await ensureRecurringAutomationCategory();
  return { account, category };
}

export async function getRecurringRevenueDashboard(periodWhere: Prisma.FinanceTransactionWhereInput = {}) {
  await ensureRecurringRevenueDefaults();

  const now = new Date();
  const [recurringRevenues, oneOffRevenueCents] = await Promise.all([
    prisma.financeRecurringRevenue.findMany({
      include: { account: true, category: true },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }, { createdAt: 'desc' }],
    }),
    sumOneOffRevenue(periodWhere),
  ]);

  const activeRecurringRevenues = recurringRevenues.filter((item) => isActiveRecurringRevenue(item, now));
  const mrrCents = calculateMRR(activeRecurringRevenues);
  const activeClients = getActiveRecurringClientsCount(activeRecurringRevenues);
  const averageMonthlyRevenueCents = calculateAverageMonthlyRevenuePerClient(mrrCents, activeClients);
  const arrCents = calculateARR(mrrCents);
  const targetProgress = TARGET_MRR_CENTS > 0 ? Math.min(100, Math.round((mrrCents / TARGET_MRR_CENTS) * 1000) / 10) : 0;

  return {
    metrics: {
      activeClients,
      arrCents,
      averageMonthlyRevenueCents,
      mrrCents,
      oneOffRevenueCents,
      recurringMonthlyRevenueCents: mrrCents,
      targetMrrCents: TARGET_MRR_CENTS,
      targetProgress,
    } satisfies FinanceRecurringRevenueMetrics,
    recurringRevenues,
  };
}

export function calculateMRR(items: Array<{ monthlyAmountCents: number }>): number {
  return items.reduce((total, item) => total + item.monthlyAmountCents, 0);
}

export function calculateARR(mrrCents: number): number {
  return mrrCents * 12;
}

export function calculateAverageMonthlyRevenuePerClient(mrrCents: number, activeClients: number): number {
  return activeClients > 0 ? Math.round(mrrCents / activeClients) : 0;
}

export function getActiveRecurringClientsCount(
  items: Array<{ clientName: string; contractId?: string | null; leadId?: string | null }>,
): number {
  const clients = new Set<string>();

  for (const item of items) {
    clients.add(item.leadId || item.contractId || normalizeClientName(item.clientName));
  }

  return clients.size;
}

export function formatRecurringRevenueStatus(status: FinanceRecurringRevenueStatus): string {
  const labels: Record<FinanceRecurringRevenueStatus, string> = {
    ACTIVE: 'Ativa',
    CANCELLED: 'Cancelada',
    ENDED: 'Terminada',
    PAUSED: 'Pausada',
  };

  return labels[status];
}

export async function ensureRecurringRevenueCategory() {
  const category = await prisma.financeCategory.findFirst({
    where: { name: recurringCategoryName, type: 'INCOME' },
    select: { id: true, name: true },
  });

  if (category) return category;

  return prisma.financeCategory.create({
    data: { isDefault: true, name: recurringCategoryName, type: 'INCOME' },
    select: { id: true, name: true },
  });
}

async function ensureRecurringAutomationCategory() {
  const category = await prisma.financeCategory.findFirst({
    where: { name: automationRecurringCategoryName, type: 'INCOME' },
    select: { id: true },
  });

  if (category) return category;

  return prisma.financeCategory.create({
    data: { isDefault: true, name: automationRecurringCategoryName, type: 'INCOME' },
    select: { id: true },
  });
}

async function ensureDefaultRecurringAccount() {
  const account = await prisma.financeAccount.findFirst({
    where: { currency: 'EUR', name: defaultAccountName },
    select: { id: true, name: true },
  });

  if (account) return account;

  return prisma.financeAccount.create({
    data: { currency: 'EUR', isDefault: true, name: defaultAccountName },
    select: { id: true, name: true },
  });
}

async function sumOneOffRevenue(periodWhere: Prisma.FinanceTransactionWhereInput): Promise<number> {
  const aggregate = await prisma.financeTransaction.aggregate({
    _sum: { amountCents: true },
    where: {
      ...periodWhere,
      source: { not: 'SUBSCRIPTION' },
      status: { in: ['CONFIRMED', 'PENDING'] },
      type: 'INCOME',
      NOT: {
        category: {
          name: { in: [recurringCategoryName, automationRecurringCategoryName] },
        },
      },
    },
  });

  return aggregate._sum.amountCents ?? 0;
}

function isActiveRecurringRevenue(
  item: { endDate?: Date | null; startDate: Date; status: FinanceRecurringRevenueStatus },
  now: Date,
): boolean {
  return item.status === 'ACTIVE' && item.startDate <= now && (!item.endDate || item.endDate >= now);
}

function normalizeClientName(clientName: string): string {
  return clientName.trim().toLowerCase().replace(/\s+/g, ' ');
}
