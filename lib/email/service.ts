/**
 * ------------------------------------------------------------------
 * File: lib/email/service.ts
 * Description: Transactional email workflow service for Norm8 submissions.
 * Responsibilities:
 * - Send customer confirmation emails based on submission type and booking state.
 * - Send Executive Audit Preview when audit client preview data is available.
 * - Send internal lead notifications to the Norm8 team.
 * - Keep email failures isolated from the primary lead submission flow.
 * ------------------------------------------------------------------
 */

import 'server-only';

import { createElement, type ReactNode } from 'react';
import type {
  AuditAnalysis,
  MeetingBookingStatus,
  SubmissionType,
} from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  formatSubmissionType,
  getSubmissionContactSnapshot,
} from './formatters';
import { EmailConfigurationError, getResendClient } from './resend';
import type {
  EmailType,
  InternalLeadNotificationEmailProps,
  SendSubmissionEmailsParams,
  SubmissionEmailLead,
  SubmissionEmailSubmission,
} from './types';
import AuditConfirmationEmail from './templates/AuditConfirmationEmail';
import CustomAutomationConfirmationEmail from './templates/CustomAutomationConfirmationEmail';
import ExecutiveAuditPreviewEmail from './templates/ExecutiveAuditPreviewEmail';
import InternalLeadNotificationEmail from './templates/InternalLeadNotificationEmail';
import MeetingRequestConfirmationEmail from './templates/MeetingRequestConfirmationEmail';

const DEFAULT_EMAIL_FROM = 'Norm8 <no-reply@norm8.pt>';

type EmailMetadata = Record<string, string | null>;

type EmailSendJob = {
  logId: string;
  to: string;
  subject: string;
  type: EmailType;
  react: ReactNode;
  metadata?: EmailMetadata;
};

type ConfirmationConfig = {
  subject: string;
  type: Exclude<EmailType, 'INTERNAL_NOTIFICATION'>;
  template:
    | typeof AuditConfirmationEmail
    | typeof CustomAutomationConfirmationEmail
    | typeof ExecutiveAuditPreviewEmail
    | typeof MeetingRequestConfirmationEmail;
  clientPreviewSent?: boolean;
  selectedTemplate: string;
};

/**
 * Sends all emails related to a newly created lead submission.
 *
 * Email delivery is best-effort. Provider/configuration errors are written to
 * EmailLog and console.error, but they never throw back into the submission flow.
 *
 * @param params Lead, submission, meeting booking, existing EmailLog, and audit context.
 * @returns Promise that resolves after all email attempts have been processed.
 */
export async function sendSubmissionEmails(
  params: SendSubmissionEmailsParams,
): Promise<void> {
  const jobs: EmailSendJob[] = [];

  try {
    const confirmationJob = await buildConfirmationEmailJob(params);
    if (confirmationJob) {
      jobs.push(confirmationJob);
    }
  } catch (error) {
    console.error('Failed to prepare customer confirmation email', error);
  }

  try {
    const internalJob = await buildInternalNotificationEmailJob(params);
    if (internalJob) {
      jobs.push(internalJob);
    }
  } catch (error) {
    console.error('Failed to prepare internal notification email', error);
  }

  await Promise.all(jobs.map((job) => sendEmailJob(job)));
}

/**
 * Builds the customer confirmation email job for the submission type.
 *
 * @param params Lead, submission, booking, audit analysis, and confirmation EmailLog context.
 * @returns Email job or null when no customer email can be sent.
 */
async function buildConfirmationEmailJob({
  lead,
  submission,
  meetingBooking,
  confirmationEmailLogId,
  auditAnalysis,
}: SendSubmissionEmailsParams): Promise<EmailSendJob | null> {
  const config = getConfirmationConfig(
    submission.type,
    meetingBooking?.status,
    auditAnalysis,
  );
  const metadata = buildEmailMetadata(meetingBooking, auditAnalysis, {
    clientPreviewSent: config.clientPreviewSent ?? false,
    selectedEmailTemplate: config.selectedTemplate,
  });
  const contactSnapshot = getSubmissionContactSnapshot(submission, lead);
  const recipientEmail = contactSnapshot.email;
  const logId =
    confirmationEmailLogId ??
    (
      await prisma.emailLog.create({
        data: {
          leadId: lead.id,
          submissionId: submission.id,
          to: recipientEmail || 'missing-lead-email',
          subject: config.subject,
          type: config.type,
          metadata,
        },
      })
    ).id;

  await prisma.emailLog.update({
    where: {
      id: logId,
    },
    data: {
      to: recipientEmail || 'missing-lead-email',
      subject: config.subject,
      metadata,
    },
  });

  if (!recipientEmail) {
    await markEmailFailed(logId, 'Lead email is missing.');
    return null;
  }

  return {
    logId,
    to: recipientEmail,
    subject: config.subject,
    type: config.type,
    metadata,
    react: createElement(config.template, {
      lead: contactSnapshot,
      submission,
      meetingBooking,
      auditAnalysis,
    }),
  };
}

/**
 * Builds the internal notification email job and creates its pending EmailLog.
 *
 * @param params Lead, submission, optional meeting booking, and audit analysis context.
 * @returns Email job or null when the internal recipient is not configured.
 */
async function buildInternalNotificationEmailJob({
  lead,
  submission,
  meetingBooking,
  auditAnalysis,
}: SendSubmissionEmailsParams): Promise<EmailSendJob | null> {
  const to = process.env.INTERNAL_NOTIFICATION_EMAIL;
  const subject =
    submission.type === 'AUDIT_REQUEST'
      ? 'Nova Auditoria Inteligente recebida'
      : `Nova submissão recebida no website Norm8 - ${formatSubmissionType(
          submission.type,
        )}`;
  const metadata = buildEmailMetadata(meetingBooking, auditAnalysis);
  const log = await prisma.emailLog.create({
    data: {
      leadId: lead.id,
      submissionId: submission.id,
      to: to || 'missing-internal-notification-email',
      subject,
      type: 'INTERNAL_NOTIFICATION',
      metadata,
    },
  });

  if (!to) {
    await markEmailFailed(log.id, 'INTERNAL_NOTIFICATION_EMAIL is not configured.');
    return null;
  }

  const templateProps = buildInternalTemplateProps(
    lead,
    submission,
    meetingBooking,
    auditAnalysis,
  );

  return {
    logId: log.id,
    to,
    subject,
    type: 'INTERNAL_NOTIFICATION',
    metadata,
    react: createElement(InternalLeadNotificationEmail, templateProps),
  };
}

/**
 * Sends a prepared email job through Resend and updates the corresponding EmailLog.
 *
 * @param job Fully prepared email send job.
 * @returns Promise that resolves after the EmailLog is updated.
 */
async function sendEmailJob(job: EmailSendJob): Promise<void> {
  try {
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
      to: job.to,
      subject: job.subject,
      react: job.react,
    });

    if (response.error) {
      await markEmailFailed(job.logId, response.error.message, job.metadata);
      console.error(`Failed to send ${job.type} email`, response.error);
      return;
    }

    await prisma.emailLog.update({
      where: {
        id: job.logId,
      },
      data: {
        status: 'SENT',
        providerMessageId: response.data?.id,
        subject: job.subject,
        metadata: job.metadata,
      },
    });
  } catch (error) {
    const message =
      error instanceof EmailConfigurationError || error instanceof Error
        ? error.message
        : 'Unknown email provider error.';

    await markEmailFailed(job.logId, message, job.metadata);
    console.error(`Failed to send ${job.type} email`, error);
  }
}

/**
 * Marks an EmailLog as failed without exposing provider details to users.
 *
 * @param logId EmailLog identifier.
 * @param reason Internal failure reason for server logs.
 * @param metadata Optional booking/audit metadata to preserve on failure.
 * @returns Promise that resolves after the log is updated.
 */
async function markEmailFailed(
  logId: string,
  reason: string,
  metadata?: EmailMetadata,
): Promise<void> {
  await prisma.emailLog.update({
    where: {
      id: logId,
    },
    data: {
      status: 'FAILED',
      metadata,
    },
  });

  console.error(`EmailLog ${logId} marked as FAILED: ${reason}`);
}

/**
 * Resolves the customer email subject, type, and template by submission type.
 *
 * @param type Submission type stored in the database.
 * @param meetingStatus Optional booking status for meeting email subject.
 * @param auditAnalysis Optional audit analysis used for Executive Audit Preview.
 * @returns Confirmation email configuration.
 */
function getConfirmationConfig(
  type: SubmissionType,
  meetingStatus?: MeetingBookingStatus,
  auditAnalysis?: SendSubmissionEmailsParams['auditAnalysis'],
): ConfirmationConfig {
  switch (type) {
    case 'AUDIT_REQUEST':
      if (canSendExecutiveAuditPreview(auditAnalysis)) {
        return {
          subject: 'A sua pré-análise de automação da Norm8',
          type: 'AUDIT_CONFIRMATION',
          template: ExecutiveAuditPreviewEmail,
          clientPreviewSent: true,
          selectedTemplate: 'ExecutiveAuditPreviewEmail',
        };
      }

      return {
        subject: 'Recebemos o seu pedido de Auditoria Inteligente',
        type: 'AUDIT_CONFIRMATION',
        template: AuditConfirmationEmail,
        clientPreviewSent: false,
        selectedTemplate: 'AuditConfirmationEmail',
      };
    case 'CUSTOM_AUTOMATION_REQUEST':
      return {
        subject: 'Recebemos o seu pedido de Automação Personalizada',
        type: 'CUSTOM_AUTOMATION_CONFIRMATION',
        template: CustomAutomationConfirmationEmail,
        selectedTemplate: 'CustomAutomationConfirmationEmail',
      };
    case 'MEETING_REQUEST':
      return {
        subject:
          meetingStatus === 'CONFIRMED'
            ? 'Reunião confirmada com a Norm8'
            : 'Recebemos o seu pedido de reunião',
        type: 'MEETING_CONFIRMATION',
        template: MeetingRequestConfirmationEmail,
        selectedTemplate: 'MeetingRequestConfirmationEmail',
      };
  }
}

/**
 * Builds provider-independent email metadata for EmailLog records.
 *
 * @param meetingBooking Optional meeting booking context.
 * @param auditAnalysis Optional audit analysis context.
 * @param options Optional email-specific metadata flags.
 * @returns JSON-safe metadata object.
 */
function buildEmailMetadata(
  meetingBooking?: SendSubmissionEmailsParams['meetingBooking'],
  auditAnalysis?: SendSubmissionEmailsParams['auditAnalysis'],
  options: { clientPreviewSent?: boolean; selectedEmailTemplate?: string } = {},
): EmailMetadata | undefined {
  const metadata: EmailMetadata = {};

  if (meetingBooking) {
    metadata.meetingBookingStatus = meetingBooking.status;
    metadata.googleEventId = meetingBooking.googleEventId ?? null;
    metadata.googleEventHtmlLink = meetingBooking.googleEventHtmlLink ?? null;
  }

  if (auditAnalysis) {
    metadata.auditStatus = auditAnalysis.status;
    metadata.auditAnalysisId = auditAnalysis.id;
    metadata.auditAnalysisScore =
      auditAnalysis.score === null || auditAnalysis.score === undefined
        ? null
        : String(auditAnalysis.score);
    metadata.hasClientPreview = hasUsableClientPreview(auditAnalysis) ? 'true' : 'false';
    metadata.previewTitle = auditAnalysis.clientPreviewTitle ?? null;
    metadata.previewOpportunityCount = String(getClientPreviewOpportunityCount(auditAnalysis));
  }

  if (options.clientPreviewSent !== undefined) {
    metadata.clientPreviewSent = options.clientPreviewSent ? 'true' : 'false';
  }

  if (options.selectedEmailTemplate) {
    metadata.selectedTemplate = options.selectedEmailTemplate;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Counts persisted client preview opportunities for safe operational metadata.
 */
function getClientPreviewOpportunityCount(
  auditAnalysis?: SendSubmissionEmailsParams['auditAnalysis'],
): number {
  return Array.isArray(auditAnalysis?.clientPreviewOpportunities)
    ? auditAnalysis.clientPreviewOpportunities.length
    : 0;
}

/**
 * Builds the props consumed by the internal notification template.
 *
 * @param lead Lead identity fields.
 * @param submission Submission and payload context.
 * @param meetingBooking Optional meeting booking context.
 * @param auditAnalysis Optional audit analysis context.
 * @returns Internal email template props.
 */
function buildInternalTemplateProps(
  lead: SubmissionEmailLead,
  submission: SubmissionEmailSubmission,
  meetingBooking?: SendSubmissionEmailsParams['meetingBooking'],
  auditAnalysis?: SendSubmissionEmailsParams['auditAnalysis'],
): InternalLeadNotificationEmailProps {
  return {
    lead: getSubmissionContactSnapshot(submission, lead),
    submission,
    meetingBooking,
    auditAnalysis,
    payloadFields: getPayloadFields(submission.payload),
    summary: getSubmissionSummary(submission.type, submission.payload),
  };
}

/**
 * Converts a JSON payload into readable key/value pairs for internal emails.
 *
 * @param payload Submission payload stored in Prisma Json.
 * @returns Flattened payload fields safe for email rendering.
 */
function getPayloadFields(
  payload: SubmissionEmailSubmission['payload'],
): Array<{ label: string; value: string }> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }

  return Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => ({
      label,
      value: stringifyPayloadValue(value),
    }));
}

/**
 * Formats payload values for concise internal email display.
 *
 * @param value Raw JSON payload value.
 * @returns Human-readable string.
 */
function stringifyPayloadValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

/**
 * Creates a short internal summary by submission type.
 *
 * @param type Submission type stored in the database.
 * @param payload Raw submission payload.
 * @returns Portuguese summary for the internal notification.
 */
function getSubmissionSummary(
  type: SubmissionType,
  payload: SubmissionEmailSubmission['payload'],
): string {
  const fields = getPayloadFields(payload);
  const challenge =
    fields.find((field) =>
      ['mainChallenge', 'processToAutomate', 'meetingGoal'].includes(field.label),
    )?.value ?? 'Sem resumo indicado.';

  switch (type) {
    case 'AUDIT_REQUEST':
      return `Novo pedido de Auditoria Inteligente. Resumo: ${challenge}`;
    case 'CUSTOM_AUTOMATION_REQUEST':
      return `Novo pedido de Automação Personalizada. Resumo: ${challenge}`;
    case 'MEETING_REQUEST':
      return `Nova marcação de reunião. Objetivo: ${challenge}`;
  }
}

/**
 * Checks whether the customer should receive the Executive Audit Preview.
 *
 * Fallback AuditConfirmationEmail is reserved for failed AI analysis or missing
 * preview content. Optional preview fields enrich the email but do not block it.
 *
 * @param auditAnalysis Optional audit analysis record.
 * @returns Whether the Executive Audit Preview can be sent.
 */
function canSendExecutiveAuditPreview(
  auditAnalysis?: AuditAnalysis | null,
): auditAnalysis is AuditAnalysis {
  return Boolean(
    auditAnalysis?.status === 'COMPLETED' && hasUsableClientPreview(auditAnalysis),
  );
}

/**
 * Checks the minimum persisted client preview needed for the premium email.
 * Optional preview sections are rendered with local fallbacks by the template.
 */
function hasUsableClientPreview(auditAnalysis?: AuditAnalysis | null): boolean {
  return Boolean(
    auditAnalysis?.clientPreviewSummary &&
      Array.isArray(auditAnalysis.clientPreviewOpportunities) &&
      auditAnalysis.clientPreviewOpportunities.length > 0,
  );
}


