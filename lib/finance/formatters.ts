import type { FinanceTransactionSource, FinanceTransactionStatus, FinanceTransactionType } from '@/app/generated/prisma/client';

export function formatCurrencyCents(amountCents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    currency: currency || 'EUR',
    style: 'currency',
  }).format(amountCents / 100);
}

export function formatSignedCurrencyCents(amountCents: number, type: FinanceTransactionType, currency = 'EUR'): string {
  const sign = type === 'INCOME' ? '+' : '-';
  return sign + formatCurrencyCents(amountCents, currency);
}

export function formatFinanceTransactionType(type: FinanceTransactionType): string {
  const labels: Record<FinanceTransactionType, string> = {
    INCOME: 'Entrada',
    EXPENSE: 'Despesa',
  };

  return labels[type];
}

export function formatFinanceTransactionStatus(status: FinanceTransactionStatus): string {
  const labels: Record<FinanceTransactionStatus, string> = {
    PENDING: 'Pendente',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
  };

  return labels[status];
}

export function formatFinanceSource(source: FinanceTransactionSource): string {
  const labels: Record<FinanceTransactionSource, string> = {
    MANUAL: 'Manual',
    PROPOSAL: 'Proposta',
    CONTRACT: 'Contrato',
    SUBSCRIPTION: 'Subscri\u00e7\u00e3o',
    OTHER: 'Outro',
  };

  return labels[source];
}

export function parseEuroToCents(input: FormDataEntryValue | null): number | null {
  const raw = String(input ?? '').trim();

  if (!raw) {
    return null;
  }

  const normalized = raw
    .replace(/\s/g, '')
    .replace(/\u20ac/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100);
}
