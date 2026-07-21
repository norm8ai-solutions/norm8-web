import type { ContractPlan, ContractServiceType } from '@/app/generated/prisma/client';

type PricingDeliverable = {
  title?: string | null;
  description?: string | null;
};

type PricingTimelinePhase = {
  name?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  duration?: string | null;
};

export type PricingSuggestionInput = {
  serviceType?: ContractServiceType | null;
  customServiceType?: string | null;
  plan?: ContractPlan | null;
  selectedPhases: string[];
  selectedServices: string[];
  deliverables: PricingDeliverable[];
  timeline: PricingTimelinePhase[];
};

export type PricingSuggestion = {
  commercialValue: number;
  finalValue: number;
  discountValue: number;
  discountPercentage: number;
  vatRate: number;
  valueWithVat: number;
  rationale: string;
};

export type PaymentMilestoneSuggestion = {
  percentage: string;
  amount: string;
  invoiceMoment: string;
  expectedDate: string;
  description: string;
  status: string;
  billingCondition: string;
};

export const VAT_RATE_OPTIONS = [
  { value: '23', label: '23%' },
  { value: '13', label: '13%' },
  { value: '6', label: '6%' },
  { value: '0', label: 'Isento / 0%' },
] as const;

export const INVOICE_MOMENT_OPTIONS = [
  'Adjudicação',
  'Início do projeto',
  'Após diagnóstico',
  'Após aprovação do âmbito',
  'Implementação',
  'Validação intermédia',
  'Entrega final',
  'Após formação',
  'Mensalidade recorrente',
  'Renovação',
  'Outro',
] as const;

const PLAN_BASE_VALUES: Record<ContractPlan, number> = {
  STARTER: 1800,
  PROFESSIONAL: 4200,
  BUSINESS: 7800,
  CUSTOM: 12000,
};

const SERVICE_MULTIPLIERS: Partial<Record<ContractServiceType, number>> = {
  WEBSITE: 1,
  CUSTOM_SOFTWARE: 1.45,
  PROCESS_AUTOMATION: 1.25,
  AI_AGENTS: 1.35,
  SYSTEM_INTEGRATION: 1.3,
  TECHNOLOGY_CONSULTING: 0.95,
  COMMERCIAL_PLATFORM: 1.4,
  MAINTENANCE_EVOLUTION: 0.9,
  OTHER: 1.1,
};

const SERVICE_WEIGHTS: Record<string, number> = {
  Discovery: 300,
  Arquitetura: 550,
  'UI/UX': 650,
  Desenvolvimento: 1200,
  Implementação: 700,
  Integrações: 950,
  Testes: 450,
  Publicação: 350,
  Formação: 400,
  Suporte: 350,
  Analytics: 650,
  SEO: 350,
  Automações: 850,
  CRM: 800,
  Dashboards: 850,
  'Agentes IA': 1200,
  Manutenção: 500,
  'Evolução contínua': 700,
};

export function getContractPricingSuggestion(input: PricingSuggestionInput): PricingSuggestion {
  const planBase = input.plan ? PLAN_BASE_VALUES[input.plan] : PLAN_BASE_VALUES.PROFESSIONAL;
  const serviceMultiplier = input.serviceType ? SERVICE_MULTIPLIERS[input.serviceType] ?? 1 : 1;
  const serviceAddons = input.selectedServices.reduce((sum, service) => sum + (SERVICE_WEIGHTS[service] ?? 300), 0);
  const deliverableComplexity = Math.max(0, input.deliverables.filter((item) => hasText(item.title)).length - 2) * 350;
  const phaseComplexity = Math.max(0, input.selectedPhases.length - 1) * 650;
  const timelineComplexity = Math.max(0, input.timeline.filter((item) => hasText(item.name)).length - 2) * 250;
  const rawCommercialValue = (planBase + serviceAddons + deliverableComplexity + phaseComplexity + timelineComplexity) * serviceMultiplier;
  const commercialValue = roundMoney(roundToNearest(rawCommercialValue, 50));
  const defaultDiscountRate = input.plan === 'CUSTOM' ? 0 : input.plan === 'BUSINESS' ? 0.05 : 0;
  const finalValue = roundMoney(commercialValue * (1 - defaultDiscountRate));
  const vatRate = 23;

  return {
    commercialValue,
    finalValue,
    ...calculateDerivedFinancials(commercialValue, finalValue, vatRate),
    vatRate,
    rationale: buildPricingRationale(input, commercialValue),
  };
}

export function calculateDerivedFinancials(commercialValue: number, finalValue: number, vatRate: number): Pick<PricingSuggestion, 'discountValue' | 'discountPercentage' | 'valueWithVat'> {
  const discountValue = Math.max(0, roundMoney(commercialValue - finalValue));
  const discountPercentage = commercialValue > 0 ? roundMoney((discountValue / commercialValue) * 100) : 0;
  const valueWithVat = roundMoney(finalValue * (1 + Math.max(0, vatRate) / 100));
  return { discountValue, discountPercentage, valueWithVat };
}

export function getPaymentMilestonesFromPlan(input: {
  paymentPlan?: string | null;
  finalValue: number;
  vatRate: number;
  timeline: PricingTimelinePhase[];
  startDate?: string | null;
}): PaymentMilestoneSuggestion[] {
  const plan = input.paymentPlan || '50_50';
  const percentages = getPlanPercentages(plan);
  const baseDate = parseDateInput(input.startDate) ?? startOfToday();

  return percentages.map((percentage, index) => {
    const amount = roundMoney((input.finalValue * percentage) / 100);
    return {
      percentage: formatNumber(percentage),
      amount: formatNumber(amount),
      invoiceMoment: getInvoiceMoment(plan, index),
      expectedDate: formatDateInput(getPaymentDate(baseDate, input.timeline, index)),
      description: getPaymentDescription(plan, index),
      status: 'PENDING',
      billingCondition: getBillingCondition(plan, index),
    };
  });
}

export function parsePositiveNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).trim().replace(/\s+/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function sanitizeDecimalInput(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  const [integer = '', ...decimalParts] = normalized.split('.');
  const decimal = decimalParts.join('');
  return decimalParts.length > 0 ? `${integer}.${decimal.slice(0, 2)}` : integer;
}

export function formatNumber(value: number): string {
  return String(roundMoney(value)).replace('.', ',');
}

function getPlanPercentages(plan: string): number[] {
  if (plan === 'SINGLE') return [100];
  if (plan === '30_30_40') return [30, 30, 40];
  if (plan === 'CUSTOM') return [40, 40, 20];
  return [50, 50];
}

function getInvoiceMoment(plan: string, index: number): string {
  if (plan === 'SINGLE') return 'Adjudicação';
  if (plan === '30_30_40') return ['Adjudicação', 'Implementação', 'Entrega final'][index] ?? 'Entrega final';
  if (plan === 'CUSTOM') return ['Adjudicação', 'Validação intermédia', 'Entrega final'][index] ?? 'Entrega final';
  return ['Adjudicação', 'Entrega final'][index] ?? 'Entrega final';
}

function getPaymentDescription(plan: string, index: number): string {
  const moment = getInvoiceMoment(plan, index).toLowerCase();
  return `Pagamento previsto na fase de ${moment}.`;
}

function getBillingCondition(plan: string, index: number): string {
  if (index === 0) return 'Faturação após aceitação da adjudicação.';
  if (plan === '30_30_40' && index === 1) return 'Faturação após validação da implementação intermédia.';
  return 'Faturação após validação dos entregáveis associados.';
}

function getPaymentDate(baseDate: Date, timeline: PricingTimelinePhase[], index: number): Date {
  const phaseDate = parseDateInput(timeline[index]?.endsAt) ?? parseDateInput(timeline[index]?.startsAt) ?? null;
  if (phaseDate) return phaseDate;
  const date = new Date(baseDate);
  date.setDate(date.getDate() + index * 14);
  date.setHours(12, 0, 0, 0);
  return date;
}

function buildPricingRationale(input: PricingSuggestionInput, commercialValue: number): string {
  const services = input.selectedServices.length > 0 ? input.selectedServices.join(', ') : input.customServiceType || input.serviceType || 'serviço definido';
  return `Sugestão calculada para ${services}, plano ${input.plan ?? 'por definir'}, ${input.deliverables.length} entregáveis e ${input.timeline.length} fases. Valor comercial sugerido: ${formatNumber(commercialValue)} EUR.`;
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
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

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
