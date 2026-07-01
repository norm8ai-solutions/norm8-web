/**
 * ------------------------------------------------------------------
 * File: lib/audit-analysis/schemas.ts
 * Description: Zod validation for AI audit analysis output.
 * Responsibilities:
 * - Enforce the JSON contract returned by the AI model.
 * - Validate both internal analysis and the client-safe executive preview.
 * - Allow internal analysis to be saved even if the client preview is incomplete.
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

export const clientExecutivePreviewSchema = z.object({
  title: clientSafeText,
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
  expectedBenefits: z.array(clientSafeText).min(3).max(5),
  recommendedDirection: clientSafeText,
  nextStep: clientSafeText,
});

export const internalAuditAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  companySummary: z.string().trim().min(1),
  operationalProblems: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        impact: z.string().trim().min(1),
      }),
    )
    .min(1),
  automationOpportunities: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        estimatedImpact: z.string().trim().min(1),
        complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      }),
    )
    .min(1),
  recommendedSolutions: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
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
  nextStep: z.string().trim().min(1),
  internalSummary: z.string().trim().min(1),
});

export const auditAnalysisOutputSchema = internalAuditAnalysisSchema.extend({
  clientPreview: clientExecutivePreviewSchema.optional(),
});