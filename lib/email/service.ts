/**
 * ------------------------------------------------------------------
 * File: lib/email/service.ts
 * Description: Transactional email workflow service for Norm8 submissions.
 * Responsibilities:
 * - Send customer confirmation emails based on submission type.
 * - Send internal lead notifications to the Norm8 team.
 * - Update EmailLog records with SENT or FAILED delivery state.
 * - Keep email failures isolated from the primary lead submission flow.
 * ------------------------------------------------------------------
 */

import 'server-only';

import { createElement, type ReactNode } from 'react';
import type { SubmissionType } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
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
import InternalLeadNotificationEmail from './templates/InternalLeadNotificationEmail';
import MeetingRequestConfirmationEmail from './templates/MeetingRequestConfirmationEmail';

const DEFAULT_EMAIL_FROM = 'Norm8 <no-reply@norm8.pt>';

type EmailSendJob = {
  logId: string;
  to: string;
  subject: string;
  type: EmailType;
  react: ReactNode;
};

/**
 * Sends all emails related to a newly created lead submission.
 *
 * Email delivery is intentionally best-effort. Provider/configuration errors
 * are written to EmailLog and console.error, but they never throw back into the
 * submission flow after the lead and submission are created.
 *
 * @param params Lead, submission, and optional existing confirmation EmailLog.
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
 * @param params Lead, submission, and confirmation EmailLog context.
 * @returns Email job or null when no customer email can be sent.
 */
async function buildConfirmationEmailJob({
  lead,
  submission,
  confirmationEmailLogId,
}: SendSubmissionEmailsParams): Promise<EmailSendJob | null> {
  const config = getConfirmationConfig(submission.type);
  const logId =
    confirmationEmailLogId ??
    (
      await prisma.emailLog.create({
        data: {
          leadId: lead.id,
          submissionId: submission.id,
          to: lead.email || 'missing-lead-email',
          subject: config.subject,
          type: config.type,
        },
      })
    ).id;

  if (!lead.email) {
    await markEmailFailed(logId, 'Lead email is missing.');
    return null;
  }

  return {
    logId,
    to: lead.email,
    subject: config.subject,
    type: config.type,
    react: createElement(config.template, { lead, submission }),
  };
}

/**
 * Builds the internal notification email job and creates its pending EmailLog.
 *
 * @param params Lead and submission context.
 * @returns Email job or null when the internal recipient is not configured.
 */
async function buildInternalNotificationEmailJob({
  lead,
  submission,
}: SendSubmissionEmailsParams): Promise<EmailSendJob | null> {
  const to = process.env.INTERNAL_NOTIFICATION_EMAIL;
  const subject = 'Nova submissão recebida no website Norm8';
  const log = await prisma.emailLog.create({
    data: {
      leadId: lead.id,
      submissionId: submission.id,
      to: to || 'missing-internal-notification-email',
      subject,
      type: 'INTERNAL_NOTIFICATION',
    },
  });

  if (!to) {
    await markEmailFailed(log.id, 'INTERNAL_NOTIFICATION_EMAIL is not configured.');
    return null;
  }

  const templateProps = buildInternalTemplateProps(lead, submission);

  return {
    logId: log.id,
    to,
    subject,
    type: 'INTERNAL_NOTIFICATION',
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
      await markEmailFailed(job.logId, response.error.message);
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
      },
    });
  } catch (error) {
    const message =
      error instanceof EmailConfigurationError || error instanceof Error
        ? error.message
        : 'Unknown email provider error.';

    await markEmailFailed(job.logId, message);
    console.error(`Failed to send ${job.type} email`, error);
  }
}

/**
 * Marks an EmailLog as failed without exposing provider details to users.
 *
 * @param logId EmailLog identifier.
 * @param reason Internal failure reason for server logs.
 * @returns Promise that resolves after the log is updated.
 */
async function markEmailFailed(logId: string, reason: string): Promise<void> {
  await prisma.emailLog.update({
    where: {
      id: logId,
    },
    data: {
      status: 'FAILED',
    },
  });

  console.error(`EmailLog ${logId} marked as FAILED: ${reason}`);
}

type ConfirmationConfig = {
  subject: string;
  type: Exclude<EmailType, 'INTERNAL_NOTIFICATION'>;
  template:
    | typeof AuditConfirmationEmail
    | typeof CustomAutomationConfirmationEmail
    | typeof MeetingRequestConfirmationEmail;
};

/**
 * Resolves the customer email subject, type, and template by submission type.
 *
 * @param type Submission type stored in the database.
 * @returns Confirmation email configuration.
 */
function getConfirmationConfig(type: SubmissionType): ConfirmationConfig {
  switch (type) {
    case 'AUDIT_REQUEST':
      return {
        subject: 'Recebemos o seu pedido de Auditoria Inteligente',
        type: 'AUDIT_CONFIRMATION',
        template: AuditConfirmationEmail,
      };
    case 'CUSTOM_AUTOMATION_REQUEST':
      return {
        subject: 'Recebemos o seu pedido de Automação Personalizada',
        type: 'CUSTOM_AUTOMATION_CONFIRMATION',
        template: CustomAutomationConfirmationEmail,
      };
    case 'MEETING_REQUEST':
      return {
        subject: 'Recebemos o seu pedido de reunião',
        type: 'MEETING_CONFIRMATION',
        template: MeetingRequestConfirmationEmail,
      };
  }
}

/**
 * Builds the props consumed by the internal notification template.
 *
 * @param lead Lead identity fields.
 * @param submission Submission and payload context.
 * @returns Internal email template props.
 */
function buildInternalTemplateProps(
  lead: SubmissionEmailLead,
  submission: SubmissionEmailSubmission,
): InternalLeadNotificationEmailProps {
  const payloadFields = getPayloadFields(submission.payload);

  return {
    lead,
    submission,
    payloadFields,
    summary: getSubmissionSummary(submission.type, payloadFields),
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
 * @param payloadFields Flattened payload fields.
 * @returns Portuguese summary for the internal notification.
 */
function getSubmissionSummary(
  type: SubmissionType,
  payloadFields: Array<{ label: string; value: string }>,
): string {
  const challenge =
    payloadFields.find((field) =>
      ['mainChallenge', 'processToAutomate', 'meetingGoal'].includes(field.label),
    )?.value ?? 'Sem resumo indicado.';

  switch (type) {
    case 'AUDIT_REQUEST':
      return `Novo pedido de Auditoria Inteligente. Resumo: ${challenge}`;
    case 'CUSTOM_AUTOMATION_REQUEST':
      return `Novo pedido de Automação Personalizada. Resumo: ${challenge}`;
    case 'MEETING_REQUEST':
      return `Novo pedido de reunião. Objetivo: ${challenge}`;
  }
}
