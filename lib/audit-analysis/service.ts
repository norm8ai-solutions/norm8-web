/**
 * ------------------------------------------------------------------
 * File: lib/audit-analysis/service.ts
 * Description: Service for generating and persisting AI audit analyses.
 * Responsibilities:
 * - Generate structured audit analysis with Groq.
 * - Validate AI output with Zod before storing it.
 * - Persist internal analysis and client preview independently when possible.
 * - Persist success and failure states without breaking submissions.
 * ------------------------------------------------------------------
 */

import 'server-only';

import { Prisma, type Submission } from '@/app/generated/prisma/client';
import { createGroqClient } from '@/lib/ai/groq';
import { prisma } from '@/lib/db/prisma';
import { auditRequestSchema } from '@/lib/leads/schemas';
import { buildAuditAnalysisSystemPrompt, buildAuditAnalysisUserPrompt } from './prompt';
import { normalizeAuditAnalysisOutput } from './normalization';
import {
  clientExecutivePreviewSchema,
  internalAuditAnalysisSchema,
} from './schemas';
import type {
  AuditAnalysisOutput,
  AuditAnalysisSubmissionContext,
  ClientExecutivePreview,
} from './types';

/**
 * Creates or updates an AI audit analysis for an existing submission.
 *
 * @param submission Submission created by the lead pipeline.
 * @returns The persisted AuditAnalysis record, or null for non-audit submissions.
 */
export async function createAuditAnalysisForSubmission(submission: Submission) {
  if (submission.type !== 'AUDIT_REQUEST') {
    return null;
  }

  const parsedPayload = auditRequestSchema.safeParse(submission.payload);

  if (!parsedPayload.success) {
    return handleAuditAnalysisFailure({
      leadId: submission.leadId,
      submissionId: submission.id,
      error: new Error('Audit submission payload is invalid for AI analysis.'),
    });
  }

  const context: AuditAnalysisSubmissionContext = {
    leadId: submission.leadId,
    submissionId: submission.id,
    payload: parsedPayload.data,
  };

  await prisma.auditAnalysis.upsert({
    where: { submissionId: submission.id },
    create: {
      leadId: submission.leadId,
      submissionId: submission.id,
      status: 'PENDING',
    },
    update: {
      status: 'PENDING',
      errorMessage: null,
    },
  });

  try {
    const { analysis, model, previewWarning } = await generateAuditAnalysis(context);

    const savedAnalysis = await saveAuditAnalysis({
      leadId: context.leadId,
      submissionId: context.submissionId,
      analysis,
      model,
    });

    await prisma.leadActivity.create({
      data: {
        leadId: context.leadId,
        type: 'AUDIT_ANALYSIS_COMPLETED',
        message: 'AI audit analysis was generated successfully.',
        metadata: {
          submissionId: context.submissionId,
          auditAnalysisId: savedAnalysis.id,
          score: analysis.score,
          priority: analysis.priority,
          clientPreviewReady: Boolean(analysis.clientPreview),
        },
      },
    });

    if (previewWarning) {
      console.warn(previewWarning);
      await prisma.leadActivity.create({
        data: {
          leadId: context.leadId,
          type: 'AUDIT_CLIENT_PREVIEW_INCOMPLETE',
          message: 'AI audit analysis was saved, but client preview was incomplete.',
          metadata: {
            submissionId: context.submissionId,
            auditAnalysisId: savedAnalysis.id,
            warning: previewWarning,
          },
        },
      });
    }

    return savedAnalysis;
  } catch (error) {
    return handleAuditAnalysisFailure({
      leadId: context.leadId,
      submissionId: context.submissionId,
      error,
    });
  }
}

/**
 * Calls Groq and validates the structured audit analysis response.
 *
 * @param context Lead, submission, and validated audit payload context.
 * @returns Validated analysis, model name used, and optional preview warning.
 */
export async function generateAuditAnalysis(
  context: AuditAnalysisSubmissionContext,
): Promise<{
  analysis: AuditAnalysisOutput;
  model: string;
  previewWarning?: string;
}> {
  const { client, model } = createGroqClient();

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: buildAuditAnalysisSystemPrompt(),
      },
      {
        role: 'user',
        content: buildAuditAnalysisUserPrompt(context.payload),
      },
    ],
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error('Groq returned an empty audit analysis response.');
  }

  const parsedJson = JSON.parse(content) as Record<string, unknown>;
  const parsedInternalAnalysis = internalAuditAnalysisSchema.safeParse(parsedJson);

  if (!parsedInternalAnalysis.success) {
    throw new Error(
      `Groq internal audit analysis output failed validation: ${parsedInternalAnalysis.error.message}`,
    );
  }

  const parsedClientPreview = clientExecutivePreviewSchema.safeParse(
    parsedJson.clientPreview,
  );
  const clientPreview: ClientExecutivePreview | undefined = parsedClientPreview.success
    ? parsedClientPreview.data
    : undefined;
  const previewWarning = parsedClientPreview.success
    ? undefined
    : `Groq client preview output failed validation: ${parsedClientPreview.error.message}`;

  return {
    analysis: normalizeAuditAnalysisOutput(
      {
        ...parsedInternalAnalysis.data,
        clientPreview,
      },
      context.payload,
    ),
    model,
    previewWarning,
  };
}

/**
 * Persists a completed audit analysis.
 *
 * @param params Persisted analysis context.
 * @returns Saved AuditAnalysis row.
 */
export async function saveAuditAnalysis(params: {
  leadId: string;
  submissionId: string;
  analysis: AuditAnalysisOutput;
  model: string;
}) {
  const clientPreviewData = buildClientPreviewPersistenceData(
    params.analysis.clientPreview,
  );

  return prisma.auditAnalysis.upsert({
    where: { submissionId: params.submissionId },
    create: {
      leadId: params.leadId,
      submissionId: params.submissionId,
      score: params.analysis.score,
      priority: params.analysis.priority,
      companySummary: params.analysis.companySummary,
      operationalProblems:
        params.analysis.operationalProblems as Prisma.InputJsonValue,
      automationOpportunities:
        params.analysis.automationOpportunities as Prisma.InputJsonValue,
      recommendedSolutions:
        params.analysis.recommendedSolutions as Prisma.InputJsonValue,
      nextStep: params.analysis.nextStep,
      internalSummary: params.analysis.internalSummary,
      contractValueEstimate:
        params.analysis.contractValueEstimate as Prisma.InputJsonValue,
      implementationComplexity: params.analysis.implementationComplexity,
      estimatedDelivery: params.analysis.estimatedDelivery as Prisma.InputJsonValue,
      closingProbability: params.analysis.closingProbability,
      closingProbabilityRationale: params.analysis.closingProbabilityRationale ?? null,
      commercialRationale: params.analysis.commercialRationale,
      salesPlaybook: params.analysis.salesPlaybook as Prisma.InputJsonValue,
      implementationRoadmap:
        params.analysis.implementationRoadmap as Prisma.InputJsonValue,
      ...clientPreviewData,
      aiModel: params.model,
      status: 'COMPLETED',
      errorMessage: null,
    },
    update: {
      score: params.analysis.score,
      priority: params.analysis.priority,
      companySummary: params.analysis.companySummary,
      operationalProblems:
        params.analysis.operationalProblems as Prisma.InputJsonValue,
      automationOpportunities:
        params.analysis.automationOpportunities as Prisma.InputJsonValue,
      recommendedSolutions:
        params.analysis.recommendedSolutions as Prisma.InputJsonValue,
      nextStep: params.analysis.nextStep,
      internalSummary: params.analysis.internalSummary,
      contractValueEstimate:
        params.analysis.contractValueEstimate as Prisma.InputJsonValue,
      implementationComplexity: params.analysis.implementationComplexity,
      estimatedDelivery: params.analysis.estimatedDelivery as Prisma.InputJsonValue,
      closingProbability: params.analysis.closingProbability,
      closingProbabilityRationale: params.analysis.closingProbabilityRationale ?? null,
      commercialRationale: params.analysis.commercialRationale,
      salesPlaybook: params.analysis.salesPlaybook as Prisma.InputJsonValue,
      implementationRoadmap:
        params.analysis.implementationRoadmap as Prisma.InputJsonValue,
      ...clientPreviewData,
      aiModel: params.model,
      status: 'COMPLETED',
      errorMessage: null,
    },
  });
}

/**
 * Persists a failed audit analysis and records internal operational context.
 *
 * @param params Failure context.
 * @returns Saved failed AuditAnalysis row.
 */
export async function handleAuditAnalysisFailure(params: {
  leadId: string;
  submissionId: string;
  error: unknown;
}) {
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : 'Unknown audit analysis error.';

  const savedAnalysis = await prisma.auditAnalysis.upsert({
    where: { submissionId: params.submissionId },
    create: {
      leadId: params.leadId,
      submissionId: params.submissionId,
      status: 'FAILED',
      errorMessage,
    },
    update: {
      status: 'FAILED',
      errorMessage,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: params.leadId,
      type: 'AUDIT_ANALYSIS_FAILED',
      message: 'AI audit analysis failed and needs manual review.',
      metadata: {
        submissionId: params.submissionId,
        auditAnalysisId: savedAnalysis.id,
        errorMessage,
      },
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Falha na análise IA da auditoria',
      message:
        'Foi recebida uma Auditoria Inteligente, mas a análise IA não foi concluída automaticamente.',
      type: 'AUDIT_ANALYSIS_FAILED',
      relatedLeadId: params.leadId,
      relatedSubmissionId: params.submissionId,
    },
  });

  return savedAnalysis;
}

/**
 * Builds Prisma fields for the persisted client preview.
 *
 * @param clientPreview Client-safe executive preview from the AI output.
 * @returns Prisma data fragment for client preview fields.
 */
function buildClientPreviewPersistenceData(clientPreview?: ClientExecutivePreview) {
  return {
    clientPreviewTitle: clientPreview?.title ?? null,
    clientPreviewSummary: clientPreview?.summary ?? null,
    clientPreviewOpportunities:
      clientPreview?.opportunities === undefined
        ? Prisma.JsonNull
        : (clientPreview.opportunities as Prisma.InputJsonValue),
    clientPreviewBenefits:
      clientPreview?.expectedBenefits === undefined
        ? Prisma.JsonNull
        : (clientPreview.expectedBenefits as Prisma.InputJsonValue),
    clientPreviewRecommendedDirection: clientPreview?.recommendedDirection ?? null,
    clientPreviewNextStep: clientPreview?.nextStep ?? null,
  };
}

