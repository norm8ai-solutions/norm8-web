import type { ContractPlan, ContractServiceType } from '@/app/generated/prisma/client';

type TimelineDeliverable = {
  title?: string | null;
  description?: string | null;
  phase?: string | null;
  estimatedDate?: string | null;
  responsible?: string | null;
  acceptanceCriteria?: string | null;
};

export type ContractTimelineTemplatePhase = {
  name: string;
  phaseType: string;
  startsAt: string;
  endsAt: string;
  duration: string;
  description: string;
  dependencies: string;
  paymentMilestone: string;
  approvalCriteria: string;
};

type ContractTimelineTemplateInput = {
  serviceType?: ContractServiceType | null;
  customServiceType?: string | null;
  plan?: ContractPlan | null;
  validityDate?: string | null;
  selectedPhases: string[];
  selectedServices: string[];
  deliverables: TimelineDeliverable[];
  includedScope?: string | null;
  acceptanceCriteria?: string | null;
};

const PHASE_LABELS: Record<string, string> = {
  LAUNCH: 'Launch',
  OPERATE: 'Operate',
  SCALE: 'Scale',
  OTHER: 'Outra fase',
};

const PHASE_NAMES: Record<string, string> = {
  LAUNCH: 'Implementação e validação inicial',
  OPERATE: 'Operação assistida e melhoria contínua',
  SCALE: 'Escala, optimização e evolução',
  OTHER: 'Execução do serviço',
};

export function getContractTimelineTemplate(input: ContractTimelineTemplateInput): ContractTimelineTemplatePhase[] {
  const usableDeliverables = input.deliverables
    .filter((deliverable) => hasText(deliverable.title))
    .sort((left, right) => getDateTime(left.estimatedDate) - getDateTime(right.estimatedDate));
  const selectedPhases = normalizeSelectedPhases(input.selectedPhases, usableDeliverables);
  const today = startOfToday();
  let cursor = today;

  return selectedPhases.map((phaseType, index) => {
    const phaseDeliverables = deliverablesForPhase(usableDeliverables, phaseType, index, selectedPhases.length);
    const dateRange = getPhaseDateRange(phaseDeliverables, cursor, input.plan, input.validityDate);
    cursor = addDays(dateRange.end, 1);

    return {
      name: buildPhaseName(phaseType, phaseDeliverables, input.selectedServices),
      phaseType,
      startsAt: formatDateInput(dateRange.start),
      endsAt: formatDateInput(dateRange.end),
      duration: buildDurationLabel(dateRange.start, dateRange.end),
      description: buildDescription(phaseType, phaseDeliverables, input),
      dependencies: buildRelatedDeliverables(phaseDeliverables, phaseType),
      paymentMilestone: buildResponsible(phaseDeliverables),
      approvalCriteria: buildApprovalCriteria(phaseDeliverables, input.acceptanceCriteria),
    };
  });
}

function normalizeSelectedPhases(selectedPhases: string[], deliverables: TimelineDeliverable[]): string[] {
  const explicit = selectedPhases.map(normalizePhaseType).filter(Boolean);
  if (explicit.length > 0) return Array.from(new Set(explicit));

  const fromDeliverables = deliverables.map((deliverable) => normalizePhaseType(deliverable.phase)).filter(Boolean);
  if (fromDeliverables.length > 0) return Array.from(new Set(fromDeliverables));

  return ['LAUNCH'];
}

function normalizePhaseType(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'LAUNCH' || normalized === 'OPERATE' || normalized === 'SCALE') return normalized;
  return normalized ? 'OTHER' : '';
}

function deliverablesForPhase(
  deliverables: TimelineDeliverable[],
  phaseType: string,
  phaseIndex: number,
  phaseCount: number,
): TimelineDeliverable[] {
  const exact = deliverables.filter((deliverable) => normalizePhaseType(deliverable.phase) === phaseType);
  if (exact.length > 0) return exact;

  if (phaseCount === 1) return deliverables;
  return deliverables.filter((_, index) => index % phaseCount === phaseIndex);
}

function getPhaseDateRange(
  deliverables: TimelineDeliverable[],
  fallbackStart: Date,
  plan?: ContractPlan | null,
  validityDate?: string | null,
): { start: Date; end: Date } {
  const deliverableDates = deliverables.map((deliverable) => parseDateInput(deliverable.estimatedDate)).filter((date): date is Date => Boolean(date));
  const starts = deliverableDates.length > 0 ? minDate(deliverableDates) : fallbackStart;
  const durationDays = deliverableDates.length > 0 ? Math.max(4, daysBetween(starts, maxDate(deliverableDates)) + 1) : fallbackDurationDays(plan);
  const end = addDays(starts, durationDays - 1);
  const validUntil = parseDateInput(validityDate);

  return {
    start: starts < startOfToday() ? startOfToday() : starts,
    end: validUntil && end > validUntil ? validUntil : end,
  };
}

function buildPhaseName(phaseType: string, deliverables: TimelineDeliverable[], selectedServices: string[]): string {
  const titles = deliverables.map((deliverable) => deliverable.title?.trim()).filter(Boolean);
  if (titles.some((title) => /diagn[oó]stico|levantamento|discovery/i.test(title ?? ''))) return 'Diagnóstico e alinhamento inicial';
  if (titles.some((title) => /arquitetura|planeamento|ux|ui/i.test(title ?? ''))) return 'Arquitetura e planeamento';
  if (titles.some((title) => /desenvolvimento|configura[cç][aã]o|implementa[cç][aã]o/i.test(title ?? ''))) return 'Desenvolvimento e configuração';
  if (titles.some((title) => /forma[cç][aã]o|entrega|valida[cç][aã]o|publica[cç][aã]o/i.test(title ?? ''))) return 'Implementação, validação e entrega';
  if (selectedServices.some((service) => /suporte|manuten[cç][aã]o|analytics|dashboard/i.test(service))) return 'Operação, suporte e acompanhamento';
  return PHASE_NAMES[phaseType] ?? 'Execução do serviço';
}

function buildDescription(phaseType: string, deliverables: TimelineDeliverable[], input: ContractTimelineTemplateInput): string {
  const phaseLabel = PHASE_LABELS[phaseType] ?? 'fase';
  const serviceText = input.selectedServices.length > 0 ? input.selectedServices.join(', ') : input.customServiceType || input.serviceType || 'serviços contratados';
  const deliverableText = deliverables.length > 0
    ? ` Inclui ${deliverables.map((deliverable) => deliverable.title).filter(Boolean).join(', ')}.`
    : '';
  const scopeText = hasText(input.includedScope) ? ` Considera o âmbito incluído definido no contrato.` : '';

  return `Fase ${phaseLabel} orientada para ${serviceText}, com actividades sequenciais, validação com o cliente e preparação dos resultados acordados.${deliverableText}${scopeText}`;
}

function buildRelatedDeliverables(deliverables: TimelineDeliverable[], phaseType: string): string {
  const titles = deliverables.map((deliverable) => deliverable.title?.trim()).filter(Boolean);
  if (titles.length > 0) return titles.join('; ');
  return `Entregáveis associados à fase ${PHASE_LABELS[phaseType] ?? phaseType}.`;
}

function buildResponsible(deliverables: TimelineDeliverable[]): string {
  const responsible = Array.from(new Set(deliverables.map((deliverable) => deliverable.responsible?.trim()).filter(Boolean)));
  return responsible.length > 0 ? responsible.join('; ') : 'Equipa Norm8';
}

function buildApprovalCriteria(deliverables: TimelineDeliverable[], fallback?: string | null): string {
  const criteria = Array.from(new Set(deliverables.map((deliverable) => deliverable.acceptanceCriteria?.trim()).filter(Boolean)));
  if (criteria.length > 0) return criteria.join('\n');
  return fallback?.trim() || 'Conclusão validada pelo cliente, sem pendências bloqueantes e com entregáveis associados aprovados.';
}

function buildDurationLabel(start: Date, end: Date): string {
  const days = daysBetween(start, end) + 1;
  if (days <= 1) return '1 dia';
  if (days % 7 === 0) return `${days / 7} semana${days / 7 > 1 ? 's' : ''}`;
  return `${days} dias`;
}
function fallbackDurationDays(plan?: ContractPlan | null): number {
  if (plan === 'STARTER') return 7;
  if (plan === 'PROFESSIONAL') return 10;
  if (plan === 'BUSINESS' || plan === 'CUSTOM') return 14;
  return 10;
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateTime(value: string | null | undefined): number {
  return parseDateInput(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(12, 0, 0, 0);
  return next;
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000));
}

function minDate(dates: Date[]): Date {
  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function maxDate(dates: Date[]): Date {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
