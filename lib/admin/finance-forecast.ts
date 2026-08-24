import 'server-only';

import type { FinanceRecurringRevenueStatus, FinanceTransactionStatus, FinanceTransactionType } from '@/app/generated/prisma/client';
import { requireAdmin } from '@/lib/admin/auth';
import { calculateMonthlyEquivalentCents, getNextRecurringCostRenewalDate } from '@/lib/admin/finance-recurring-costs';
import { prisma } from '@/lib/db/prisma';

export type FinanceForecastMetrics = {
  monthLabel: string;
  monthStart: Date;
  monthEnd: Date;
  confirmedMonthIncomeCents: number;
  confirmedMonthExpenseCents: number;
  confirmedMonthProfitCents: number;
  pendingFutureIncomeCents: number;
  futureRecurringRevenueCents: number;
  pendingFutureExpenseCents: number;
  futureRecurringCostCents: number;
  remainingExpectedProfitCents: number;
  expectedMonthIncomeCents: number;
  expectedMonthExpenseCents: number;
  expectedRevenueCents: number;
  expectedExpensesCents: number;
  expectedProfitCents: number;
  estimatedCurrentBalanceCents: number;
  estimatedEndOfMonthBalanceCents: number;
  monthlyBurnRateCents: number;
  runwayMonths: number | null;
  breakdown: {
    confirmedMonthIncomeCents: number;
    confirmedMonthExpenseCents: number;
    confirmedMonthProfitCents: number;
    pendingIncomeFutureCents: number;
    recurringRevenueFutureCents: number;
    pendingExpensesFutureCents: number;
    recurringCostsFutureCents: number;
    remainingExpectedProfitCents: number;
  };
};

type ForecastTransaction = {
  amountCents: number;
  dueDate: Date | null;
  occurredAt: Date;
  status: FinanceTransactionStatus;
  type: FinanceTransactionType;
};

type RecurringRevenueBillingInput = {
  endDate: Date | null;
  monthlyAmountCents: number;
  startDate: Date;
  status: FinanceRecurringRevenueStatus;
};

export async function getFinanceForecastMetrics(referenceDate = new Date()): Promise<FinanceForecastMetrics> {
  await requireAdmin();

  const { monthEnd, monthStart } = getCurrentMonthRange(referenceDate);
  const todayStart = startOfDay(referenceDate);
  const todayEnd = getEndOfDay(referenceDate);

  const [forecastTransactions, balanceIncome, balanceExpenses, confirmedMonthIncome, confirmedMonthExpenses, recurringRevenues, recurringCosts] = await Promise.all([
    prisma.financeTransaction.findMany({
      select: { amountCents: true, dueDate: true, occurredAt: true, status: true, type: true },
      where: {
        status: 'PENDING',
        OR: [
          { dueDate: { gte: todayStart, lte: monthEnd } },
          { dueDate: null, occurredAt: { gte: todayStart, lte: monthEnd } },
        ],
      },
    }),
    sumConfirmedTransactionsUntil('INCOME', todayEnd),
    sumConfirmedTransactionsUntil('EXPENSE', todayEnd),
    sumConfirmedTransactionsBetween('INCOME', monthStart, todayEnd),
    sumConfirmedTransactionsBetween('EXPENSE', monthStart, todayEnd),
    prisma.financeRecurringRevenue.findMany({
      select: { endDate: true, monthlyAmountCents: true, startDate: true, status: true },
      where: {
        status: 'ACTIVE',
        startDate: { lte: monthEnd },
        OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
      },
    }),
    prisma.financeRecurringCost.findMany({
      select: { amountCents: true, endDate: true, frequency: true, startDate: true, status: true },
      where: {
        status: 'ACTIVE',
        startDate: { lte: monthEnd },
        OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
      },
    }),
  ]);

  const pendingIncomeFutureCents = sumForecastTransactions(forecastTransactions, 'INCOME');
  const pendingExpensesFutureCents = sumForecastTransactions(forecastTransactions, 'EXPENSE');
  const recurringRevenueFutureCents = recurringRevenues.reduce((total, item) => {
    const nextBillingDate = getNextRecurringRevenueBillingDate(item, todayStart);
    return nextBillingDate && nextBillingDate >= todayStart && nextBillingDate <= monthEnd
      ? total + item.monthlyAmountCents
      : total;
  }, 0);
  const recurringCostsFutureCents = recurringCosts.reduce((total, item) => {
    const nextRenewalDate = getNextRecurringCostRenewalDate(item, todayStart);
    return nextRenewalDate && nextRenewalDate >= todayStart && nextRenewalDate <= monthEnd
      ? total + item.amountCents
      : total;
  }, 0);
  const monthlyBurnRateCents = recurringCosts.reduce((total, item) => total + calculateMonthlyEquivalentCents(item), 0);
  const confirmedMonthIncomeCents = confirmedMonthIncome;
  const confirmedMonthExpenseCents = confirmedMonthExpenses;
  const confirmedMonthProfitCents = confirmedMonthIncomeCents - confirmedMonthExpenseCents;
  const pendingFutureIncomeCents = pendingIncomeFutureCents;
  const futureRecurringRevenueCents = recurringRevenueFutureCents;
  const pendingFutureExpenseCents = pendingExpensesFutureCents;
  const futureRecurringCostCents = recurringCostsFutureCents;
  const remainingExpectedProfitCents = pendingFutureIncomeCents + futureRecurringRevenueCents - pendingFutureExpenseCents - futureRecurringCostCents;
  const expectedMonthIncomeCents = confirmedMonthIncomeCents + pendingFutureIncomeCents + futureRecurringRevenueCents;
  const expectedMonthExpenseCents = confirmedMonthExpenseCents + pendingFutureExpenseCents + futureRecurringCostCents;
  const expectedRevenueCents = expectedMonthIncomeCents;
  const expectedExpensesCents = expectedMonthExpenseCents;
  const expectedProfitCents = expectedMonthIncomeCents - expectedMonthExpenseCents;
  const estimatedCurrentBalanceCents = balanceIncome - balanceExpenses;
  const estimatedEndOfMonthBalanceCents = estimatedCurrentBalanceCents + remainingExpectedProfitCents;
  const runwayMonths = calculateRunwayMonths(estimatedEndOfMonthBalanceCents, monthlyBurnRateCents);

  return {
    monthLabel: formatMonthLabel(monthStart),
    monthStart,
    monthEnd,
    confirmedMonthIncomeCents,
    confirmedMonthExpenseCents,
    confirmedMonthProfitCents,
    pendingFutureIncomeCents,
    futureRecurringRevenueCents,
    pendingFutureExpenseCents,
    futureRecurringCostCents,
    remainingExpectedProfitCents,
    expectedMonthIncomeCents,
    expectedMonthExpenseCents,
    expectedRevenueCents,
    expectedExpensesCents,
    expectedProfitCents,
    estimatedCurrentBalanceCents,
    estimatedEndOfMonthBalanceCents,
    monthlyBurnRateCents,
    runwayMonths,
    breakdown: {
      confirmedMonthIncomeCents,
      confirmedMonthExpenseCents,
      confirmedMonthProfitCents,
      pendingIncomeFutureCents,
      recurringRevenueFutureCents,
      pendingExpensesFutureCents,
      recurringCostsFutureCents,
      remainingExpectedProfitCents,
    },
  };
}

function getCurrentMonthRange(referenceDate: Date): { monthStart: Date; monthEnd: Date } {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

async function sumConfirmedTransactionsUntil(type: FinanceTransactionType, until: Date): Promise<number> {
  const aggregate = await prisma.financeTransaction.aggregate({
    _sum: { amountCents: true },
    where: { occurredAt: { lte: until }, status: 'CONFIRMED', type },
  });

  return aggregate._sum.amountCents ?? 0;
}

async function sumConfirmedTransactionsBetween(type: FinanceTransactionType, from: Date, until: Date): Promise<number> {
  const aggregate = await prisma.financeTransaction.aggregate({
    _sum: { amountCents: true },
    where: { occurredAt: { gte: from, lte: until }, status: 'CONFIRMED', type },
  });

  return aggregate._sum.amountCents ?? 0;
}

function sumForecastTransactions(transactions: ForecastTransaction[], type: FinanceTransactionType): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amountCents, 0);
}

function getNextRecurringRevenueBillingDate(revenue: RecurringRevenueBillingInput, referenceDate = new Date()): Date | null {
  if (revenue.status !== 'ACTIVE') return null;

  const startDate = startOfDay(revenue.startDate);
  if (Number.isNaN(startDate.getTime())) return null;

  const today = startOfDay(referenceDate);
  let nextBillingDate = startDate;

  if (nextBillingDate < today) {
    do {
      nextBillingDate = addMonthsPreservingDay(startDate, getMonthDifference(startDate, today));

      if (nextBillingDate < today) {
        nextBillingDate = addMonthsPreservingDay(nextBillingDate, 1);
      }
    } while (nextBillingDate < today);
  }

  const endDate = revenue.endDate ? startOfDay(revenue.endDate) : null;
  if (endDate && nextBillingDate > endDate) return null;

  return nextBillingDate;
}

function addMonthsPreservingDay(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const day = date.getDate();
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayOfTargetMonth));
}

function getMonthDifference(startDate: Date, targetDate: Date): number {
  return Math.max(1, (targetDate.getFullYear() - startDate.getFullYear()) * 12 + targetDate.getMonth() - startDate.getMonth());
}

function calculateRunwayMonths(balanceCents: number, monthlyBurnRateCents: number): number | null {
  if (monthlyBurnRateCents <= 0) return null;
  if (balanceCents <= 0) return 0;
  return Math.round((balanceCents / monthlyBurnRateCents) * 10) / 10;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatMonthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
