/**
 * ------------------------------------------------------------------
 * File: app/actions/lead-submissions.ts
 * Description: Server actions used by public Norm8 lead capture forms.
 * Responsibilities:
 * - Expose one action per public form while sharing the same service.
 * - Keep client components unaware of persistence and workflow details.
 * - Return serializable success/error results with validation feedback.
 * ------------------------------------------------------------------
 */

'use server';

import { createLeadSubmission } from '@/lib/leads/service';
import type {
  AuditRequestInput,
  CustomAutomationRequestInput,
  MeetingRequestInput,
} from '@/lib/leads/schemas';
import type { LeadSubmissionResult } from '@/lib/leads/types';

/**
 * Registers an Intelligent Audit request through the generic submissions pipeline.
 *
 * @param payload Public audit form data.
 * @returns Submission result for the client form.
 */
export async function submitAuditRequest(
  payload: AuditRequestInput,
): Promise<LeadSubmissionResult> {
  return createLeadSubmission({
    type: 'AUDIT_REQUEST',
    source: 'website:audit',
    payload,
  });
}

/**
 * Registers a Custom Automation request through the generic submissions pipeline.
 *
 * @param payload Public custom automation form data.
 * @returns Submission result for the client form.
 */
export async function submitCustomAutomationRequest(
  payload: CustomAutomationRequestInput,
): Promise<LeadSubmissionResult> {
  return createLeadSubmission({
    type: 'CUSTOM_AUTOMATION_REQUEST',
    source: 'website:custom-automation',
    payload,
  });
}

/**
 * Registers a Meeting request through the generic submissions pipeline.
 *
 * @param payload Public meeting form data.
 * @returns Submission result for the client form.
 */
export async function submitMeetingRequest(
  payload: MeetingRequestInput,
): Promise<LeadSubmissionResult> {
  return createLeadSubmission({
    type: 'MEETING_REQUEST',
    source: 'website:meeting',
    payload,
  });
}
