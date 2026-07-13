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
import type { MeetingEmailContext } from '@/lib/meetings/email-context';

export const EMAIL_TYPES = {
  AUDIT_CONFIRMATION: 'AUDIT_CONFIRMATION',
  CUSTOM_AUTOMATION_CONFIRMATION: 'CUSTOM_AUTOMATION_CONFIRMATION',
  MEETING_CONFIRMATION: 'MEETING_CONFIRMATION',
  INTERNAL_NOTIFICATION: 'INTERNAL_NOTIFICATION',
  MEETING_INTERNAL_NOTIFICATION: 'MEETING_INTERNAL_NOTIFICATION',
  MEETING_CLIENT_CONFIRMATION: 'MEETING_CLIENT_CONFIRMATION',
  LEAD_ACTION_EMAIL: 'LEAD_ACTION_EMAIL',
  LEAD_ACTION_FOLLOW_UP: 'LEAD_ACTION_FOLLOW_UP',
} as const;

export type EmailType = (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES];

export type EmailRecipient = {
  email: string;
  name?: string | null;
};

export type SubmissionEmailLead = Pick<
  Lead,
  'id' | 'name' | 'company' | 'email' | 'phone' | 'website' | 'source' | 'status' | 'priority'
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
  meetingEmailContext?: MeetingEmailContext;
};

export type EmailTemplateProps = {
  lead: SubmissionEmailLead;
  submission: SubmissionEmailSubmission;
  meetingBooking?: MeetingBooking;
  auditAnalysis?: AuditAnalysis | null;
  meetingEmailContext?: MeetingEmailContext;
};

export type InternalLeadNotificationEmailProps = EmailTemplateProps & {
  payloadFields: Array<{
    label: string;
    value: string;
  }>;
  summary: string;
};
