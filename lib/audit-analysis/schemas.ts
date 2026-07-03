/**
 * ------------------------------------------------------------------
 * File: lib/audit-analysis/schemas.ts
 * Description: Zod validation for AI audit analysis output.
 * Responsibilities:
 * - Enforce the JSON contract returned by the AI model.
 * - Validate both internal analysis and the client-safe executive preview.
 * - Allow internal analysis to be saved even if optional internal blocks are partial.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

const unsafeClientLanguagePattern =
  /\b(score|prioridade comercial|lead score|margem|contrato|valor potencial|pipeline|nota interna)\b/i;

const clientSafeText = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !unsafeClientLanguagePattern.test(value), {
    message: 'Client preview contains internal commercial language.',
  });

const requiredText = z.string().trim().min(1);
const stringListSchema = z.array(requiredText).catch([]);

export const clientExecutivePreviewSchema = z.object({
  title: clientSafeText.catch('Executive Audit Preview Norm8'),
  summary: clientSafeText,
  opportunities: z
    .array(
      z.object({
        title: clientSafeText,
        description: clientSafeText,
      }),
    )
    .min(1)
    .max(3),
  expectedBenefits: z.array(clientSafeText).min(1).max(6).catch([]),
  recommendedDirection: clientSafeText.catch('A direção recomendada será validada durante a sessão de discovery.'),
  nextStep: clientSafeText.catch('Agendar uma sessão de discovery para validar prioridades, sistemas e próximos passos.'),
});

const contractValueEstimateSchema = z.object({
  minimum: z.number().int().nonnegative(),
  maximum: z.number().int().nonnegative(),
  currency: z.literal('EUR'),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  rationale: requiredText,
});

const estimatedDeliverySchema = z.object({
  range: requiredText,
  rationale: requiredText,
});

const defaultSalesPlaybook = {
  likelyDecisionMaker: 'CEO / COO / Diretor de Operacoes',
  painPoints: [],
  likelyObjections: [],
  quickWins: [],
  futureCrossSell: [],
  salesStrategy: 'Validar contexto, urgencia e criterios de decisao na discovery call.',
  discoveryQuestions: [],
};

const salesPlaybookSchema = z
  .object({
    likelyDecisionMaker: requiredText.catch(defaultSalesPlaybook.likelyDecisionMaker),
    painPoints: stringListSchema,
    likelyObjections: z
      .array(
        z.object({
          objection: requiredText,
          response: requiredText,
        }),
      )
      .catch([]),
    quickWins: stringListSchema,
    futureCrossSell: stringListSchema,
    closingProbability: z.number().int().min(0).max(100).optional().catch(undefined),
    salesStrategy: requiredText.catch(defaultSalesPlaybook.salesStrategy),
    discoveryQuestions: stringListSchema,
  })
  .catch(defaultSalesPlaybook);

const implementationRoadmapPhaseSchema = z.object({
  phase: z.number().int().positive(),
  title: requiredText,
  description: requiredText,
  objective: requiredText,
  deliverables: stringListSchema,
  estimatedDuration: requiredText,
  dependencies: stringListSchema,
  expectedImpact: requiredText,
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

const implementationRoadmapSchema = z
  .array(implementationRoadmapPhaseSchema)
  .min(4)
  .max(5)
  .catch([]);

export const internalAuditAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  companySummary: requiredText,
  operationalProblems: z
    .array(
      z.object({
        title: requiredText,
        description: requiredText,
        impact: requiredText,
      }),
    )
    .min(1),
  automationOpportunities: z
    .array(
      z.object({
        title: requiredText,
        description: requiredText,
        estimatedImpact: requiredText,
        complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      }),
    )
    .min(1),
  recommendedSolutions: z
    .array(
      z.object({
        title: requiredText,
        description: requiredText,
        module: z.enum([
          'Sales',
          'Marketing',
          'Operations',
          'Customer Support',
          'Internal Systems',
        ]),
      }),
    )
    .min(1),
  nextStep: requiredText,
  internalSummary: requiredText,
  contractValueEstimate: contractValueEstimateSchema,
  implementationComplexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  estimatedDelivery: estimatedDeliverySchema,
  closingProbability: z.number().int().min(0).max(100),
  closingProbabilityRationale: requiredText.optional().catch(undefined),
  commercialRationale: requiredText,
  salesPlaybook: salesPlaybookSchema,
  implementationRoadmap: implementationRoadmapSchema,
});

export const auditAnalysisOutputSchema = internalAuditAnalysisSchema.extend({
  clientPreview: clientExecutivePreviewSchema.optional(),
});


