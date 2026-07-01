/**
 * ------------------------------------------------------------------
 * File: lib/audit-analysis/types.ts
 * Description: Types for AI audit analysis generation and persistence.
 * Responsibilities:
 * - Define the structured output expected from the AI model.
 * - Separate internal analysis fields from the client-safe executive preview.
 * - Keep service signatures readable and strongly typed.
 * ------------------------------------------------------------------
 */

import type { AuditPriority } from '@/app/generated/prisma/client';
import type { AuditRequestInput } from '@/lib/leads/schemas';

export type OperationalProblem = {
  title: string;
  description: string;
  impact: string;
};

export type AutomationOpportunity = {
  title: string;
  description: string;
  estimatedImpact: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
};

export type RecommendedSolution = {
  title: string;
  description: string;
  module:
    | 'Sales'
    | 'Marketing'
    | 'Operations'
    | 'Customer Support'
    | 'Internal Systems';
};

export type ClientPreviewOpportunity = {
  title: string;
  description: string;
};

export type ClientExecutivePreview = {
  title: string;
  summary: string;
  opportunities: ClientPreviewOpportunity[];
  expectedBenefits: string[];
  recommendedDirection: string;
  nextStep: string;
};

export type AuditAnalysisOutput = {
  score: number;
  priority: AuditPriority;
  companySummary: string;
  operationalProblems: OperationalProblem[];
  automationOpportunities: AutomationOpportunity[];
  recommendedSolutions: RecommendedSolution[];
  nextStep: string;
  internalSummary: string;
  clientPreview?: ClientExecutivePreview;
};

export type AuditAnalysisSubmissionContext = {
  leadId: string;
  submissionId: string;
  payload: AuditRequestInput;
};