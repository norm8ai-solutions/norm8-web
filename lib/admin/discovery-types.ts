/**
 * ------------------------------------------------------------------
 * File: lib/admin/discovery-types.ts
 * Description: Shared Discovery workspace types for Admin UI and services.
 * ------------------------------------------------------------------
 */

export const discoveryQuestionCategories = [
  'PROCESS',
  'TOOLS',
  'DECISION',
  'URGENCY',
  'BUDGET',
  'INTEGRATIONS',
  'IMPACT',
  'RISKS',
  'NEXT_STEPS',
] as const;

export type DiscoveryQuestionCategory = (typeof discoveryQuestionCategories)[number];

export type DiscoveryQuestionInput = {
  id: string;
  question: string;
  category: DiscoveryQuestionCategory;
  answer: string;
  status: 'UNANSWERED' | 'ANSWERED';
  impactOrObservation?: string;
};

export type DiscoverySessionInput = {
  id: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  meetingDate?: Date | null;
  summary?: string | null;
  decisionMakers?: string | null;
  urgency?: string | null;
  budgetRange?: string | null;
  technicalComplexity?: string | null;
  confirmedScope?: string | null;
  nextSteps?: string | null;
};

export const discoveryQuestionCategoryOptions: Array<{ label: string; value: DiscoveryQuestionCategory }> = [
  { value: 'PROCESS', label: 'Processo' },
  { value: 'TOOLS', label: 'Ferramentas' },
  { value: 'DECISION', label: 'Decisão' },
  { value: 'URGENCY', label: 'Urgência' },
  { value: 'BUDGET', label: 'Orçamento' },
  { value: 'INTEGRATIONS', label: 'Integrações' },
  { value: 'IMPACT', label: 'Impacto' },
  { value: 'RISKS', label: 'Riscos' },
  { value: 'NEXT_STEPS', label: 'Próximos passos' },
];

export function getDiscoveryQuestionCategoryLabel(category: DiscoveryQuestionCategory): string {
  return discoveryQuestionCategoryOptions.find((option) => option.value === category)?.label ?? 'Processo';
}

export function isDiscoveryQuestionCategory(value: string): value is DiscoveryQuestionCategory {
  return discoveryQuestionCategories.includes(value as DiscoveryQuestionCategory);
}