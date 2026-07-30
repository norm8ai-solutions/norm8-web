/**
 * ------------------------------------------------------------------
 * File: lib/leads/types.ts
 * Description: Shared TypeScript contracts for the lead submission pipeline.
 * Responsibilities:
 * - Define strongly typed inputs accepted by the central service.
 * - Standardize action/service success and error responses.
 * - Keep client components decoupled from Prisma implementation details.
 * ------------------------------------------------------------------
 */

import type { z } from 'zod';
import type {
  auditRequestSchema,
  customAutomationRequestSchema,
  meetingRequestSchema,
} from './schemas';

export type LeadSubmissionPayloadByType = {
  AUDIT_REQUEST: z.infer<typeof auditRequestSchema>;
  CUSTOM_AUTOMATION_REQUEST: z.infer<typeof customAutomationRequestSchema>;
  MEETING_REQUEST: z.infer<typeof meetingRequestSchema>;
};

export type PublicLeadSubmissionType = keyof LeadSubmissionPayloadByType;

/**
 * Input accepted by createLeadSubmission after the caller chooses the request type.
 */
export type CreateLeadSubmissionInput<TType extends PublicLeadSubmissionType = PublicLeadSubmissionType> = {
  type: TType;
  source: string;
  payload: LeadSubmissionPayloadByType[TType];
};

/**
 * Field-level validation map returned to public forms.
 */
export type ValidationErrors = Record<string, string[]>;

/**
 * Consistent public response used by services and server actions.
 */
export type LeadSubmissionResult =
  | {
      success: true;
      leadId: string;
      submissionId: string;
      message?: string;
      meetingBookingStatus?: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';
      googleEventId?: string;
      googleEventHtmlLink?: string | null;
      warning?: string;
    }
  | {
      success: false;
      error: string;
      validationErrors?: ValidationErrors;
    };
