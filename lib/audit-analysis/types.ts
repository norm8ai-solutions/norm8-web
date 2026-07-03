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

import type {
  AuditPriority,
  ContractConfidence,
  ImplementationComplexity,
} from '@/app/generated/prisma/client';
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

export type ContractValueEstimate = {
  minimum: number;
  maximum: number;
  currency: 'EUR';
  confidence: ContractConfidence;
  rationale: string;
};

export type ClientExecutivePreview = {
  title: string;
  summary: string;
  opportunities: ClientPreviewOpportunity[];
  expectedBenefits: string[];
  recommendedDirection: string;
  nextStep: string;
};

export type EstimatedDelivery = {
  range: string;
  rationale: string;
};

export type SalesPlaybookObjection = {
  objection: string;
  response: string;
};

export type SalesPlaybook = {
  likelyDecisionMaker: string;
  painPoints: string[];
  likelyObjections: SalesPlaybookObjection[];
  quickWins: string[];
  futureCrossSell: string[];
  closingProbability?: number;
  salesStrategy: string;
  discoveryQuestions: string[];
};

export type ImplementationRoadmapPhase = {
  phase: number;
  title: string;
  description: string;
  objective: string;
  deliverables: string[];
  estimatedDuration: string;
  dependencies: string[];
  expectedImpact: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
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
  contractValueEstimate: ContractValueEstimate;
  implementationComplexity: ImplementationComplexity;
  estimatedDelivery: EstimatedDelivery;
  closingProbability: number;
  closingProbabilityRationale?: string;
  commercialRationale: string;
  salesPlaybook: SalesPlaybook;
  implementationRoadmap: ImplementationRoadmapPhase[];
  clientPreview?: ClientExecutivePreview;
};

export type AuditAnalysisSubmissionContext = {
  leadId: string;
  submissionId: string;
  payload: AuditRequestInput;
};
