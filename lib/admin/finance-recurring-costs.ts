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

export type RecurringCostWithNextRenewal<T> = T & { nextRenewalDate: Date };

export function getUpcomingRenewals<T extends RecurringCostRenewalInput>(items: T[], days = 30, referenceDate = new Date()): Array<RecurringCostWithNextRenewal<T>> {
  const today = startOfDay(referenceDate);
  const limit = addDays(today, days);

  return items
    .map((item) => ({ item, nextRenewalDate: getNextRecurringCostRenewalDate(item, today) }))
    .filter((entry): entry is { item: T; nextRenewalDate: Date } => Boolean(entry.nextRenewalDate && entry.nextRenewalDate >= today && entry.nextRenewalDate <= limit))
    .sort((left, right) => left.nextRenewalDate.getTime() - right.nextRenewalDate.getTime())
    .map(({ item, nextRenewalDate }) => ({ ...item, nextRenewalDate }));
}

type RecurringCostRenewalInput = {
  endDate?: Date | null;
  frequency: FinanceRecurringCostFrequency;
  startDate: Date;
  status: FinanceRecurringCostStatus;
};

export function getNextRecurringCostRenewalDate(cost: RecurringCostRenewalInput, referenceDate = new Date()): Date | null {
  if (cost.status !== 'ACTIVE') return null;

  const startDate = startOfDay(cost.startDate);
  if (Number.isNaN(startDate.getTime())) return null;

  const today = startOfDay(referenceDate);
  let nextRenewal = startDate;

  if (nextRenewal < today) {
    const interval = cost.frequency === 'YEARLY' ? 'year' : 'month';

    do {
      nextRenewal = interval === 'year'
        ? addYearsPreservingDay(startDate, getYearDifference(startDate, today))
        : addMonthsPreservingDay(startDate, getMonthDifference(startDate, today));

      if (nextRenewal < today) {
        nextRenewal = interval === 'year'
          ? addYearsPreservingDay(nextRenewal, 1)
          : addMonthsPreservingDay(nextRenewal, 1);
      }
    } while (nextRenewal < today);
  }

  const endDate = cost.endDate ? startOfDay(cost.endDate) : null;
  if (endDate && nextRenewal > endDate) return null;

  return nextRenewal;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return startOfDay(result);
}

function addMonthsPreservingDay(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const day = date.getDate();
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayOfTargetMonth));
}

function addYearsPreservingDay(date: Date, years: number): Date {
  const year = date.getFullYear() + years;
  const month = date.getMonth();
  const day = date.getDate();
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayOfTargetMonth));
}

function getMonthDifference(startDate: Date, targetDate: Date): number {
  return Math.max(1, (targetDate.getFullYear() - startDate.getFullYear()) * 12 + targetDate.getMonth() - startDate.getMonth());
}

function getYearDifference(startDate: Date, targetDate: Date): number {
  return Math.max(1, targetDate.getFullYear() - startDate.getFullYear());
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