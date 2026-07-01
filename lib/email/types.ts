/**
 * ------------------------------------------------------------------
 * File: lib/email/types.ts
 * Description: Shared contracts for Norm8 transactional email workflows.
 * Responsibilities:
 * - Define supported transactional email types.
 * - Type the payload passed from lead submissions to email services.
 * - Keep templates independent from Prisma-specific implementation details.
 * ------------------------------------------------------------------
 */

import type {
  AuditAnalysis,
  Lead,
  MeetingBooking,
  Submission,
} from '@/app/generated/prisma/client';

export type EmailType =
  | 'AUDIT_CONFIRMATION'
  | 'CUSTOM_AUTOMATION_CONFIRMATION'
  | 'MEETING_CONFIRMATION'
  | 'INTERNAL_NOTIFICATION';

export type EmailRecipient = {
  email: string;
  name?: string | null;
};

export type SubmissionEmailLead = Pick<
  Lead,
  'id' | 'name' | 'company' | 'email' | 'phone' | 'website'
>;

export type SubmissionEmailSubmission = Pick<
  Submission,
  'id' | 'type' | 'payload' | 'createdAt'
>;

export type SendSubmissionEmailsParams = {
  lead: SubmissionEmailLead;
  submission: SubmissionEmailSubmission;
  meetingBooking?: MeetingBooking;
  confirmationEmailLogId?: string;
  auditAnalysis?: AuditAnalysis | null;
};

export type EmailTemplateProps = {
  lead: SubmissionEmailLead;
  submission: SubmissionEmailSubmission;
  meetingBooking?: MeetingBooking;
  auditAnalysis?: AuditAnalysis | null;
};

export type InternalLeadNotificationEmailProps = EmailTemplateProps & {
  payloadFields: Array<{
    label: string;
    value: string;
  }>;
  summary: string;
};