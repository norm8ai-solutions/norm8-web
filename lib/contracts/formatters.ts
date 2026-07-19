import type {
  ContractActivityType,
  ContractPlan,
  ContractSectionCategory,
  ContractServiceType,
  ContractStatus,
} from '@/app/generated/prisma/client';
import {
  CONTRACT_ACTIVITY_LABELS,
  CONTRACT_PLAN_LABELS,
  CONTRACT_SECTION_CATEGORY_LABELS,
  CONTRACT_SERVICE_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
} from './constants';

export function formatContractStatus(status: ContractStatus): string {
  return CONTRACT_STATUS_LABELS[status];
}

export function formatContractServiceType(type?: ContractServiceType | null, fallback?: string | null): string {
  if (!type) return fallback || 'Servico por definir';
  return type === 'OTHER' && fallback ? fallback : CONTRACT_SERVICE_TYPE_LABELS[type];
}

export function formatContractPlan(plan?: ContractPlan | null): string {
  return plan ? CONTRACT_PLAN_LABELS[plan] : 'Plano por definir';
}

export function formatContractSectionCategory(category: ContractSectionCategory): string {
  return CONTRACT_SECTION_CATEGORY_LABELS[category];
}

export function formatContractActivity(type: ContractActivityType): string {
  return CONTRACT_ACTIVITY_LABELS[type];
}

export function formatContractValue(value: { toString(): string } | number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Valor por definir';
  const numericValue = typeof value === 'number' ? value : Number(value.toString());
  if (!Number.isFinite(numericValue)) return 'Valor por definir';

  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export function formatContractDate(date?: Date | null): string {
  if (!date) return 'Por definir';

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}