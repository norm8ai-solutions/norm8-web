/**
 * ------------------------------------------------------------------
 * File: lib/audit-analysis/normalization.ts
 * Description: Defensive normalization for AI audit commercial intelligence.
 * Responsibilities:
 * - Guarantee a usable likely decision maker for internal sales workflows.
 * - Rebuild a complete implementation roadmap when the AI returns too little.
 * - Keep old persisted analysis renderable without exposing internal data to clients.
 * ------------------------------------------------------------------
 */

import type { AuditRequestInput } from '@/lib/leads/schemas';
import type {
  AuditAnalysisOutput,
  ClientExecutivePreview,
  ClientPreviewOpportunity,
  ImplementationRoadmapPhase,
  SalesPlaybook,
} from './types';

type AuditAnalysisForFallback = Pick<
  AuditAnalysisOutput,
  | 'automationOpportunities'
  | 'commercialRationale'
  | 'companySummary'
  | 'implementationComplexity'
  | 'recommendedSolutions'
>;

const INVALID_DECISION_MAKERS = new Set([
  '',
  'nao identificado',
  'não identificado',
  'unknown',
  'n/a',
  'na',
  'none',
]);

/**
 * Normalizes internal commercial intelligence before persistence.
 */
export function normalizeAuditAnalysisOutput(
  analysis: AuditAnalysisOutput,
  payload: AuditRequestInput,
): AuditAnalysisOutput {
  const likelyDecisionMaker = inferLikelyDecisionMaker(payload, analysis);

  return {
    ...analysis,
    salesPlaybook: {
      ...analysis.salesPlaybook,
      likelyDecisionMaker,
    },
    implementationRoadmap: normalizeImplementationRoadmap(analysis),
    clientPreview: normalizeClientPreview(analysis, payload),
  };
}

/**
 * Guarantees a complete client-safe preview before persistence.
 */
export function normalizeClientPreview(
  analysis: AuditAnalysisOutput,
  payload: AuditRequestInput,
): ClientExecutivePreview {
  const preview = analysis.clientPreview;
  const opportunities = normalizeClientPreviewOpportunities(analysis, payload, preview?.opportunities);
  const expectedBenefits = normalizeClientPreviewBenefits(analysis, payload, preview?.expectedBenefits);

  return {
    title: usableText(preview?.title) || 'Proposta de Otimiza\u00e7\u00e3o Operacional para ' + payload.company,
    summary:
      usableText(preview?.summary) ||
      'Com base nas informa\u00e7\u00f5es partilhadas, a ' +
        payload.company +
        ' apresenta oportunidades claras para estruturar processos, reduzir trabalho manual e criar maior visibilidade operacional.',
    opportunities,
    expectedBenefits,
    recommendedDirection:
      usableText(preview?.recommendedDirection) ||
      usableText(analysis.recommendedSolutions[0]?.description) ||
      'Criar uma primeira camada de automa\u00e7\u00e3o focada nos fluxos operacionais mais repetitivos, ligada aos sistemas atuais e acompanhada por indicadores simples de progresso.',
    nextStep:
      usableText(preview?.nextStep) ||
      'Agendar uma reuni\u00e3o de 30 minutos para validar o processo atual, ferramentas usadas, prioridades e uma primeira fase de implementa\u00e7\u00e3o.',
  };
}

function normalizeClientPreviewOpportunities(
  analysis: AuditAnalysisOutput,
  payload: AuditRequestInput,
  previewOpportunities?: ClientPreviewOpportunity[],
): ClientPreviewOpportunity[] {
  const fromPreview = Array.isArray(previewOpportunities)
    ? previewOpportunities.filter(isUsablePreviewOpportunity)
    : [];
  const fromAnalysis = analysis.automationOpportunities.map((opportunity) => ({
    title: opportunity.title,
    description: opportunity.description,
  }));

  return uniqueOpportunities([
    ...fromPreview,
    ...fromAnalysis,
    ...buildClientPreviewOpportunityFallbacks(payload),
  ]).slice(0, 3);
}

function normalizeClientPreviewBenefits(
  analysis: AuditAnalysisOutput,
  payload: AuditRequestInput,
  previewBenefits?: string[],
): string[] {
  const fromPreview = Array.isArray(previewBenefits) ? previewBenefits.filter(usableText) : [];
  const fromAnalysis = analysis.automationOpportunities
    .map((opportunity) => opportunity.estimatedImpact)
    .filter(usableText);

  return uniqueStrings([
    ...fromPreview,
    ...fromAnalysis,
    ...buildClientPreviewBenefitFallbacks(payload),
  ]).slice(0, 6);
}

function buildClientPreviewOpportunityFallbacks(payload: AuditRequestInput): ClientPreviewOpportunity[] {
  const challenge = payload.mainChallenge || 'os processos manuais mais criticos';
  const goal = payload.mainGoal || 'melhorar a previsibilidade operacional';
  const tools = payload.toolsUsed || 'as ferramentas atuais';

  return [
    {
      title: 'Centralizar pedidos e prioridades operacionais',
      description:
        'Criar um fluxo unico para registar, classificar e acompanhar trabalho ligado a ' +
        challenge.toLowerCase() +
        ', reduzindo decisoes dispersas e follow-ups manuais.',
    },
    {
      title: 'Automatizar tarefas repetitivas entre sistemas',
      description:
        'Ligar ' +
        tools +
        ' a regras simples de triagem, notificacoes e atualizacao de estados, mantendo a equipa focada nas excecoes que exigem decisao humana.',
    },
    {
      title: 'Dar visibilidade executiva ao progresso',
      description:
        'Transformar o objetivo de ' +
        goal.toLowerCase() +
        ' em indicadores, alertas e uma cadencia de revisao para apoiar decisoes com informacao atualizada.',
    },
  ];
}

function buildClientPreviewBenefitFallbacks(payload: AuditRequestInput): string[] {
  const challenge = payload.mainChallenge || 'processos operacionais recorrentes';
  const goal = payload.mainGoal || 'maior controlo operacional';
  const tools = payload.toolsUsed || 'sistemas existentes';

  return [
    'Menos trabalho manual em tarefas ligadas a ' + challenge.toLowerCase() + '.',
    'Melhor visibilidade sobre estado, prioridades e bloqueios operacionais.',
    'Informacao mais consistente entre ' + tools + ' e as equipas envolvidas.',
    'Processos mais previsiveis para apoiar ' + goal.toLowerCase() + '.',
    'Menos dependencia de follow-ups manuais e validacoes informais.',
    'Base tecnica mais preparada para novas automacoes futuras.',
  ];
}

function isUsablePreviewOpportunity(value: ClientPreviewOpportunity): boolean {
  return Boolean(usableText(value.title) && usableText(value.description));
}

function uniqueOpportunities(opportunities: ClientPreviewOpportunity[]): ClientPreviewOpportunity[] {
  const seen = new Set<string>();

  return opportunities.filter((opportunity) => {
    const key = normalizeText(opportunity.title + ' ' + opportunity.description);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = normalizeText(value);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function usableText(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Infers a decision maker from AI output first, then sector rules.
 */
export function inferLikelyDecisionMaker(
  payload?: Pick<AuditRequestInput, 'industry'> | null,
  auditAnalysis?: Partial<Pick<AuditAnalysisOutput, 'salesPlaybook'>> | null,
): string {
  const aiDecisionMaker = auditAnalysis?.salesPlaybook?.likelyDecisionMaker?.trim();

  if (aiDecisionMaker && !isInvalidDecisionMaker(aiDecisionMaker)) {
    return aiDecisionMaker;
  }

  const industry = normalizeText(payload?.industry ?? '');

  if (matchesAny(industry, ['saude', 'clinica', 'clinic', 'health'])) {
    return 'Diretor Clinico / Gerente de Clinica / COO';
  }

  if (matchesAny(industry, ['logistica', 'transporte', 'transport'])) {
    return 'COO / Diretor de Operacoes / Diretor Logistico';
  }

  if (matchesAny(industry, ['energia', 'industria', 'industrial', 'construcao'])) {
    return 'COO / Diretor de Operacoes / Diretor de Transformacao Digital';
  }

  if (matchesAny(industry, ['tecnologia', 'software', 'tech', 'it'])) {
    return 'CEO / COO / CTO';
  }

  if (matchesAny(industry, ['retalho', 'retail', 'ecommerce', 'comercio'])) {
    return 'Diretor de Operacoes / Diretor Comercial / COO';
  }

  if (matchesAny(industry, ['servicos', 'b2b', 'consultoria'])) {
    return 'CEO / COO / Diretor Comercial';
  }

  return 'CEO / COO / Diretor de Operacoes';
}

/**
 * Returns a complete 4-5 phase roadmap, preserving valid AI phases when possible.
 */
export function normalizeImplementationRoadmap(
  analysis: AuditAnalysisForFallback & { implementationRoadmap?: ImplementationRoadmapPhase[] },
): ImplementationRoadmapPhase[] {
  const validPhases = Array.isArray(analysis.implementationRoadmap)
    ? analysis.implementationRoadmap.filter(isCompleteRoadmapPhase).slice(0, 5)
    : [];

  const normalizedPhases = validPhases.map((phase, index) => ({
    ...phase,
    phase: index + 1,
  }));

  if (normalizedPhases.length >= 4) {
    return normalizedPhases;
  }

  const fallbackPhases = buildFallbackImplementationRoadmap(analysis);
  const completedPhases = [...normalizedPhases];

  for (const fallbackPhase of fallbackPhases) {
    if (completedPhases.length >= 5) {
      break;
    }

    if (completedPhases.some((phase) => phase.title === fallbackPhase.title)) {
      continue;
    }

    completedPhases.push({
      ...fallbackPhase,
      phase: completedPhases.length + 1,
    });
  }

  return completedPhases.slice(0, 5);
}

/**
 * Builds a conservative roadmap from the validated analysis context.
 */
export function buildFallbackImplementationRoadmap(
  auditAnalysis: AuditAnalysisForFallback,
): ImplementationRoadmapPhase[] {
  const complexity = auditAnalysis.implementationComplexity ?? 'MEDIUM';
  const firstSolution = auditAnalysis.recommendedSolutions[0]?.title ?? 'Automacao operacional';
  const firstOpportunity = auditAnalysis.automationOpportunities[0]?.title ?? 'Processos criticos';

  return [
    {
      phase: 1,
      title: 'Discovery e Arquitetura',
      description: `Mapear processos, sistemas e prioridades associados a ${firstOpportunity}.`,
      objective: 'Validar requisitos, riscos e desenho da solucao antes da implementacao.',
      deliverables: ['Mapa de processos', 'Arquitetura funcional', 'Plano de implementacao'],
      estimatedDuration: '1-2 semanas',
      dependencies: ['Acesso aos stakeholders', 'Inventario de ferramentas atuais'],
      expectedImpact: 'Alinhamento claro entre problema operacional, solucao e impacto esperado.',
      complexity: 'LOW',
    },
    {
      phase: 2,
      title: 'Integracoes e Automacao Base',
      description: `Implementar a base tecnica para ${firstSolution}.`,
      objective: 'Reduzir trabalho manual nos fluxos prioritarios.',
      deliverables: ['Fluxos automatizados', 'Integracoes essenciais', 'Regras operacionais'],
      estimatedDuration: complexity === 'HIGH' ? '3-5 semanas' : '2-4 semanas',
      dependencies: ['Credenciais de sistemas', 'Validacao das regras de negocio'],
      expectedImpact: 'Primeira reducao de tarefas repetitivas e maior consistencia operacional.',
      complexity,
    },
    {
      phase: 3,
      title: 'Automacao de Processos Prioritarios',
      description: 'Expandir a automacao para os fluxos operacionais com maior impacto no dia a dia.',
      objective: 'Escalar a reducao de trabalho manual apos a base tecnica estar validada.',
      deliverables: ['Workflows prioritarios', 'Regras de excecao', 'Validacao com utilizadores-chave'],
      estimatedDuration: '2-4 semanas',
      dependencies: ['Integracoes base concluidas', 'Feedback da equipa operacional'],
      expectedImpact: 'Maior eficiencia operacional e menos dependencia de tarefas repetitivas.',
      complexity: complexity === 'HIGH' ? 'HIGH' : 'MEDIUM',
    },
    {
      phase: 4,
      title: 'Dashboards e Visibilidade Operacional',
      description: 'Criar visibilidade sobre estado, excecoes e desempenho dos processos automatizados.',
      objective: 'Dar controlo operacional a equipas e decisores.',
      deliverables: ['Dashboard executivo', 'Alertas operacionais', 'Indicadores de acompanhamento'],
      estimatedDuration: '1-3 semanas',
      dependencies: ['Dados operacionais disponiveis', 'Definicao de indicadores'],
      expectedImpact: 'Melhor tomada de decisao e menor dependencia de acompanhamento manual.',
      complexity: complexity === 'LOW' ? 'LOW' : 'MEDIUM',
    },
    {
      phase: 5,
      title: 'Agentes IA e Otimizacao Continua',
      description: 'Evoluir a solucao com assistencia IA, aprendizagem operacional e melhorias incrementais.',
      objective: 'Transformar a automacao inicial num sistema escalavel e continuamente otimizado.',
      deliverables: ['Agentes IA prioritarios', 'Rotina de melhoria continua', 'Backlog de evolucao'],
      estimatedDuration: '2-4 semanas',
      dependencies: ['Dados das primeiras fases', 'Feedback dos utilizadores'],
      expectedImpact: auditAnalysis.commercialRationale || auditAnalysis.companySummary,
      complexity: complexity === 'LOW' ? 'MEDIUM' : complexity,
    },
  ];
}

/**
 * Checks whether a stored decision maker is usable for sales workflows.
 */
export function isInvalidDecisionMaker(value?: string | null): boolean {
  return INVALID_DECISION_MAKERS.has(normalizeText(value ?? ''));
}

/**
 * Produces a render-safe playbook from persisted JSON.
 */
export function normalizeParsedSalesPlaybook<T extends SalesPlaybook>(
  playbook: T,
  fallbackDecisionMaker: string,
): T {
  if (!isInvalidDecisionMaker(playbook.likelyDecisionMaker)) {
    return playbook;
  }

  return {
    ...playbook,
    likelyDecisionMaker: fallbackDecisionMaker,
  };
}

function isCompleteRoadmapPhase(value: ImplementationRoadmapPhase): boolean {
  return Boolean(
    value.phase &&
      value.title &&
      value.description &&
      value.objective &&
      value.estimatedDuration &&
      value.expectedImpact &&
      ['LOW', 'MEDIUM', 'HIGH'].includes(value.complexity),
  );
}

function matchesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

