import 'server-only';

import type { FinanceRecurringCostFrequency, FinanceRecurringCostStatus } from '@/app/generated/prisma/client';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db/prisma';

const defaultAccountName = 'Conta principal';
const recurringCostCategoryNames = [
  'Software',
  'Ferramentas IA',
  'Infraestrutura',
  'Hosting',
  'Domínios',
  'Email',
  'Automação',
  'Contabilidade',
  'Marketing',
  'Outro custo recorrente',
];

export type FinanceRecurringCostMetrics = {
  activeCosts: number;
  annualFixedCostsCents: number;
  largestRecurringCostCents: number;
  monthlyBurnRateCents: number;
  monthlyFixedCostsCents: number;
  upcomingRenewalsCount: number;
};

export async function ensureRecurringCostDefaults() {
  const account = await ensureDefaultRecurringCostAccount();

  for (const name of recurringCostCategoryNames) {
    await ensureRecurringCostCategory(name);
  }

  const category = await ensureRecurringCostCategory('Software');
  return { account, category };
}

export async function getRecurringCostDashboard() {
  await requireAdmin();
  await ensureRecurringCostDefaults();

  const costs = await getRecurringCosts();
  const upcomingRenewals = getUpcomingRenewals(costs, 30);
  const monthlyFixedCostsCents = calculateMonthlyBurnRate(costs);
  const largestRecurringCostCents = costs
    .filter((cost) => cost.status === 'ACTIVE')
    .reduce((largest, cost) => Math.max(largest, calculateMonthlyEquivalentCents(cost)), 0);

  return {
    costs,
    metrics: {
      activeCosts: costs.filter((cost) => cost.status === 'ACTIVE').length,
      annualFixedCostsCents: calculateAnnualFixedCosts(costs),
      largestRecurringCostCents,
      monthlyBurnRateCents: monthlyFixedCostsCents,
      monthlyFixedCostsCents,
      upcomingRenewalsCount: upcomingRenewals.length,
    } satisfies FinanceRecurringCostMetrics,
    upcomingRenewals,
  };
}

export async function getRecurringCosts() {
  return prisma.financeRecurringCost.findMany({
    include: { account: true, category: true },
    orderBy: [{ status: 'asc' }, { renewalDate: 'asc' }, { title: 'asc' }],
  });
}

export function calculateMonthlyBurnRate(items: Array<{ amountCents: number; frequency: FinanceRecurringCostFrequency; status: FinanceRecurringCostStatus }>): number {
  return items
    .filter((item) => item.status === 'ACTIVE')
    .reduce((total, item) => total + calculateMonthlyEquivalentCents(item), 0);
}

export function calculateAnnualFixedCosts(items: Array<{ amountCents: number; frequency: FinanceRecurringCostFrequency; status: FinanceRecurringCostStatus }>): number {
  return calculateMonthlyBurnRate(items) * 12;
}

export function calculateMonthlyEquivalentCents(item: { amountCents: number; frequency: FinanceRecurringCostFrequency }): number {
  if (item.frequency === 'MONTHLY') return item.amountCents;
  return Math.round(item.amountCents / 12);
}

export function getUpcomingRenewals<T extends { renewalDate: Date | null; status: FinanceRecurringCostStatus }>(items: T[], days = 30): T[] {
  const now = new Date();
  const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return items.filter((item) => item.status === 'ACTIVE' && item.renewalDate && item.renewalDate >= now && item.renewalDate <= limit);
}

export function getNextRenewalLabel(renewalDate: Date | null): string {
  if (!renewalDate) return 'Sem renovação definida';

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const renewal = new Date(renewalDate.getFullYear(), renewalDate.getMonth(), renewalDate.getDate()).getTime();
  const days = Math.ceil((renewal - start) / (24 * 60 * 60 * 1000));

  if (days === 0) return 'Renova hoje';
  if (days === 1) return 'Renova amanhã';
  if (days > 1) return `Renova em ${days} dias`;
  return 'Renovação ultrapassada';
}

export function formatRecurringCostFrequency(frequency: FinanceRecurringCostFrequency): string {
  const labels: Record<FinanceRecurringCostFrequency, string> = {
    MONTHLY: 'Mensal',
    YEARLY: 'Anual',
  };

  return labels[frequency];
}

export function formatRecurringCostStatus(status: FinanceRecurringCostStatus): string {
  const labels: Record<FinanceRecurringCostStatus, string> = {
    ACTIVE: 'Ativo',
    CANCELLED: 'Cancelado',
    ENDED: 'Terminado',
    PAUSED: 'Pausado',
  };

  return labels[status];
}

async function ensureRecurringCostCategory(name: string) {
  const category = await prisma.financeCategory.findFirst({
    where: { name, type: 'EXPENSE' },
    select: { id: true, name: true },
  });

  if (category) return category;

  return prisma.financeCategory.create({
    data: { isDefault: true, name, type: 'EXPENSE' },
    select: { id: true, name: true },
  });
}

async function ensureDefaultRecurringCostAccount() {
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