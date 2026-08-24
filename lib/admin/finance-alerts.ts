import 'server-only';

import { requireAdmin } from '@/lib/admin/auth';
import { buildNegativeForecastAlert } from '@/lib/admin/finance-alert-builders';
import type { FinanceForecastMetrics } from '@/lib/admin/finance-forecast';
import { getNextRecurringCostRenewalDate } from '@/lib/admin/finance-recurring-costs';
import { prisma } from '@/lib/db/prisma';
import { formatCurrencyCents, formatDateOnly, formatPercentage } from '@/lib/finance/formatters';
import { getRecurringRevenueDashboard, type FinanceRecurringRevenueMetrics } from '@/lib/finance/recurring-revenue';

export type FinanceAlertSeverity = 'danger' | 'warning' | 'info';

export type FinanceAlert = {
  id: string;
  title: string;
  description: string;
  severity: FinanceAlertSeverity;
  actionLabel?: string;
  actionHref?: string;
  createdAt?: Date | null;
  metadata?: Record<string, unknown>;
};

const maxAlerts = 8;
const dayInMs = 24 * 60 * 60 * 1000;

type FinanceAlertsContext = {
  forecast: FinanceForecastMetrics;
  recurringRevenueMetrics?: FinanceRecurringRevenueMetrics;
  referenceDate?: Date;
};

export async function getFinanceAlerts(context: FinanceAlertsContext): Promise<FinanceAlert[]> {
  await requireAdmin();

  const referenceDate = context.referenceDate ?? new Date();
  const negativeForecastAlert = buildNegativeForecastAlert(context.forecast);
  const results = await Promise.allSettled([
    getUpcomingRecurringCostAlerts(referenceDate),
    getMrrBelowTargetAlert(context.recurringRevenueMetrics),
    getUnusualExpenseAlerts(referenceDate),
    getOverduePendingIncomeAlerts(referenceDate),
  ]);

  const settledAlerts = results.flatMap((result) => {
    if (result.status === 'rejected') {
      console.error('Failed to calculate finance alert', result.reason);
      return [];
    }

    const value = result.value;
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  });

  const finalAlerts = [negativeForecastAlert, ...settledAlerts]
    .filter((alert): alert is FinanceAlert => Boolean(alert))
    .sort(compareAlerts)
    .slice(0, maxAlerts);

  if (process.env.NODE_ENV === 'development') {
    console.info('[finance-alerts]', {
      alertIds: finalAlerts.map((alert) => alert.id),
      expectedProfitCents: context.forecast.expectedProfitCents,
    });
  }

  return finalAlerts;
}

async function getUpcomingRecurringCostAlerts(referenceDate: Date): Promise<FinanceAlert[]> {
  const today = startOfDay(referenceDate);
  const limit = addDays(today, 7);
  const costs = await prisma.financeRecurringCost.findMany({
    orderBy: [{ renewalDate: 'asc' }, { title: 'asc' }],
    select: { amountCents: true, endDate: true, frequency: true, id: true, startDate: true, status: true, title: true },
    take: 200,
    where: { status: 'ACTIVE' },
  });

  const upcoming = costs
    .map((cost) => ({ cost, nextRenewalDate: getNextRecurringCostRenewalDate(cost, today) }))
    .filter((entry): entry is { cost: typeof costs[number]; nextRenewalDate: Date } => Boolean(entry.nextRenewalDate && entry.nextRenewalDate >= today && entry.nextRenewalDate <= limit))
    .sort((left, right) => left.nextRenewalDate.getTime() - right.nextRenewalDate.getTime());

  if (upcoming.length === 0) return [];

  if (upcoming.length === 1) {
    const [entry] = upcoming;
    return [{
      actionHref: '/admin/finance#custos-recorrentes',
      actionLabel: 'Ver custos recorrentes',
      createdAt: entry.nextRenewalDate,
      description: `${entry.cost.title} tem renovação prevista para ${formatDateOnly(entry.nextRenewalDate)}.`,
      id: `recurring-cost-renewal:${entry.cost.id}`,
      metadata: { amountCents: entry.cost.amountCents, recurringCostId: entry.cost.id },
      severity: 'warning',
      title: 'Despesa recorrente vence nos próximos 7 dias',
    }];
  }

  return [{
    actionHref: '/admin/finance#custos-recorrentes',
    actionLabel: 'Ver custos recorrentes',
    createdAt: upcoming[0].nextRenewalDate,
    description: `Existem ${upcoming.length} custos recorrentes com renovação nos próximos 7 dias.`,
    id: 'recurring-cost-renewal:grouped',
    metadata: { count: upcoming.length },
    severity: 'warning',
    title: 'Despesa recorrente vence nos próximos 7 dias',
  }];
}

async function getMrrBelowTargetAlert(currentMetrics?: FinanceRecurringRevenueMetrics): Promise<FinanceAlert | null> {
  const metrics = currentMetrics ?? (await getRecurringRevenueDashboard()).metrics;
  const { mrrCents, targetMrrCents, targetProgress } = metrics;
  if (targetMrrCents <= 0 || mrrCents >= targetMrrCents) return null;

  return {
    actionHref: '/admin/finance#receita-recorrente',
    actionLabel: 'Ver receita recorrente',
    description: `O MRR atual é ${formatCurrencyCents(mrrCents)} de uma meta de ${formatCurrencyCents(targetMrrCents)}. Progresso atual: ${formatPercentage(targetProgress)}.`,
    id: 'mrr-below-target',
    metadata: { mrrCents, targetMrrCents, targetProgress },
    severity: targetProgress < 25 ? 'warning' : 'info',
    title: 'MRR abaixo da meta',
  };
}

async function getUnusualExpenseAlerts(referenceDate: Date): Promise<FinanceAlert[]> {
  const today = startOfDay(referenceDate);
  const last90Days = new Date(today.getTime() - 90 * dayInMs);
  const last30Days = new Date(today.getTime() - 30 * dayInMs);

  const expenses = await prisma.financeTransaction.findMany({
    orderBy: { amountCents: 'desc' },
    select: { amountCents: true, id: true, occurredAt: true, title: true },
    take: 200,
    where: {
      amountCents: { gt: 0 },
      occurredAt: { gte: last90Days, lte: referenceDate },
      status: 'CONFIRMED',
      type: 'EXPENSE',
    },
  });

  if (expenses.length < 3) return [];

  const averageExpenseCents = Math.round(expenses.reduce((total, expense) => total + expense.amountCents, 0) / expenses.length);
  if (averageExpenseCents <= 0) return [];

  return expenses
    .filter((expense) => expense.occurredAt >= last30Days && expense.amountCents > averageExpenseCents * 2)
    .sort((left, right) => right.amountCents / averageExpenseCents - left.amountCents / averageExpenseCents)
    .slice(0, 3)
    .map((expense) => ({
      actionHref: '/admin/finance#transacoes',
      actionLabel: 'Ver transações',
      createdAt: expense.occurredAt,
      description: `A despesa "${expense.title}" foi de ${formatCurrencyCents(expense.amountCents)}, acima do padrão recente.`,
      id: `unusual-expense:${expense.id}`,
      metadata: { averageExpenseCents, expenseId: expense.id },
      severity: 'warning',
      title: 'Despesa acima do normal',
    }));
}

async function getOverduePendingIncomeAlerts(referenceDate: Date): Promise<FinanceAlert[]> {
  const threshold = startOfDay(new Date(referenceDate.getTime() - 7 * dayInMs));
  const pendingIncomes = await prisma.financeTransaction.findMany({
    orderBy: [{ dueDate: 'asc' }, { occurredAt: 'asc' }],
    select: { createdAt: true, dueDate: true, id: true, occurredAt: true, title: true },
    take: 20,
    where: {
      status: 'PENDING',
      type: 'INCOME',
      OR: [
        { dueDate: { lte: threshold } },
        { dueDate: null, occurredAt: { lte: threshold } },
      ],
    },
  });

  if (pendingIncomes.length === 0) return [];

  if (pendingIncomes.length === 1) {
    const [income] = pendingIncomes;
    const reference = income.dueDate ?? income.occurredAt ?? income.createdAt;
    return [{
      actionHref: '/admin/finance?type=INCOME&status=PENDING',
      actionLabel: 'Ver entradas pendentes',
      createdAt: reference,
      description: `A entrada "${income.title}" continua pendente desde ${formatDateOnly(reference)}.`,
      id: `overdue-pending-income:${income.id}`,
      metadata: { transactionId: income.id },
      severity: 'warning',
      title: 'Entrada pendente há mais de 7 dias',
    }];
  }

  return [{
    actionHref: '/admin/finance?type=INCOME&status=PENDING',
    actionLabel: 'Ver entradas pendentes',
    createdAt: pendingIncomes[0].dueDate ?? pendingIncomes[0].occurredAt ?? pendingIncomes[0].createdAt,
    description: `Existem ${pendingIncomes.length} entradas pendentes há mais de 7 dias.`,
    id: 'overdue-pending-income:grouped',
    metadata: { count: pendingIncomes.length },
    severity: 'warning',
    title: 'Entrada pendente há mais de 7 dias',
  }];
}

function compareAlerts(left: FinanceAlert, right: FinanceAlert): number {
  const severityDifference = getSeverityRank(left.severity) - getSeverityRank(right.severity);
  if (severityDifference !== 0) return severityDifference;
  return (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0);
}

function getSeverityRank(severity: FinanceAlertSeverity): number {
  if (severity === 'danger') return 0;
  if (severity === 'warning') return 1;
  return 2;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return startOfDay(result);
}

