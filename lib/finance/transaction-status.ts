import type { FinanceTransactionStatus } from '@/app/generated/prisma/client';

type FinanceTransactionDateInput = {
  dueDate?: Date | null;
  occurredAt: Date;
};

export function getFinanceTransactionReferenceDate(input: FinanceTransactionDateInput): Date {
  return input.dueDate ?? input.occurredAt;
}

export function isFutureFinanceTransaction(input: FinanceTransactionDateInput, referenceDate = new Date()): boolean {
  return isFutureDate(input.occurredAt, referenceDate) || isFutureDate(getFinanceTransactionReferenceDate(input), referenceDate);
}

export function normalizeFinanceTransactionStatus(input: FinanceTransactionDateInput & { status: FinanceTransactionStatus }, referenceDate = new Date()): FinanceTransactionStatus {
  if (input.status === 'CANCELLED') return 'CANCELLED';
  return isFutureFinanceTransaction(input, referenceDate) ? 'PENDING' : input.status;
}

export function canConfirmFinanceTransaction(input: FinanceTransactionDateInput, referenceDate = new Date()): boolean {
  return !isFutureFinanceTransaction(input, referenceDate);
}

function isFutureDate(date: Date, referenceDate: Date): boolean {
  return startOfDay(date).getTime() > startOfDay(referenceDate).getTime();
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
