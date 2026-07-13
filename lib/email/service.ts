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

import { createElement, type ReactElement } from 'react';
import { render } from '@react-email/render';
import type {
  AuditAnalysis,
  MeetingBookingStatus,
  MeetingBooking,
  Prisma,
  SubmissionType,
} from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import { buildMeetingEmailContext } from '@/lib/meetings/email-context';
import {
  formatSubmissionType,
  getSubmissionContactSnapshot,
} from './formatters';
import {
  EmailConfigurationError,
  getEmailProviderConfigStatus,
  getResendClient,
} from './resend';
import type {
  EmailType,
  InternalLeadNotificationEmailProps,
  SendSubmissionEmailsParams,
  SubmissionEmailLead,
  SubmissionEmailSubmission,
} from './types';
import { EMAIL_TYPES } from './types';
import AuditConfirmationEmail from './templates/AuditConfirmationEmail';
import ClientMeetingConfirmationEmail from './templates/ClientMeetingConfirmationEmail';
import CustomAutomationConfirmationEmail from './templates/CustomAutomationConfirmationEmail';
import ExecutiveAuditPreviewEmail from './templates/ExecutiveAuditPreviewEmail';
import InternalLeadNotificationEmail from './templates/InternalLeadNotificationEmail';
import InternalMeetingNotificationEmail from './templates/InternalMeetingNotificationEmail';
import LeadActionEmail, { type LeadActionEmailContext } from './templates/LeadActionEmail';
import MeetingRequestConfirmationEmail from './templates/MeetingRequestConfirmationEmail';

type EmailMetadata = Record<string, string | null>;

type MeetingEmailType =
  | typeof EMAIL_TYPES.MEETING_CLIENT_CONFIRMATION
  | typeof EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION;

type MeetingEmailAttemptResult = {
  attempted: boolean;
  sent: boolean;
  emailLogId?: string;
  error?: string;
};

type MeetingEmailLogCreateInput = {
  leadId: string;
  submissionId?: string | null;
  meetingBookingId?: string | null;
  to: string;
  subject: string;
  type: MeetingEmailType;
  metadata: EmailMetadata;
};

type MeetingEmailLogCreateResult = {
  emailLogId?: string;
  error?: string;
};

type MeetingEmailDeliveryResult = {
  emailLogId?: string;
  type: MeetingEmailType;
  sent: boolean;
  error?: string;
};

export type MeetingEmailSendResult = {
  allSent: boolean;
  customerSent: boolean;
  internalSent: boolean;
  failedEmailTypes: MeetingEmailType[];
  internalEmail: MeetingEmailAttemptResult;
  clientEmail: MeetingEmailAttemptResult;
};

export type LeadActionEmailSendResult = {
  success: boolean;
  emailSent: boolean;
  emailLogId?: string;
  providerMessageId?: string;
  error?: string;
};

type SendLeadActionEmailInput = {
  context: LeadActionEmailContext;
  leadId: string;
  to: string;
  subject: string;
  type: typeof EMAIL_TYPES.LEAD_ACTION_EMAIL | typeof EMAIL_TYPES.LEAD_ACTION_FOLLOW_UP;
  metadata: EmailMetadata;
};

type EmailSendJob = {
  logId: string;
  to: string;
  subject: string;
  type: EmailType;
  react: ReactElement;
  metadata?: EmailMetadata;
};

type EmailSendResult = {
  sent: boolean;
  providerMessageId?: string;
  error?: string;
};

type ConfirmationConfig = {
  subject: string;
  type: Exclude<EmailType, 'INTERNAL_NOTIFICATION' | 'MEETING_INTERNAL_NOTIFICATION'>;
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
  const meetingEmailContext = params.meetingBooking
    ? await buildMeetingEmailContext({
        lead: getSubmissionContactSnapshot(params.submission, params.lead),
        meetingBooking: params.meetingBooking,
        meetingDescription: params.meetingBooking.meetingGoal,
        submissionSummary: getSubmissionSummary(
          params.submission.type,
          params.submission.payload,
        ),
        serviceInterest: 'Pedido de reuniÃ£o',
        source: 'Website / Marcar ReuniÃ£o',
      })
    : undefined;
  const emailParams = { ...params, meetingEmailContext };

  try {
    const confirmationJob = await buildConfirmationEmailJob(emailParams);
    if (confirmationJob) {
      jobs.push(confirmationJob);
    }
  } catch (error) {
    console.error('Failed to prepare customer confirmation email', error);
  }

  try {
    const internalJob = await buildInternalNotificationEmailJob(emailParams);
    if (internalJob) {
      jobs.push(internalJob);
    }
  } catch (error) {
    console.error('Failed to prepare internal notification email', error);
  }

  await Promise.all(jobs.map((job) => sendEmailJob(job)));
}

async function createMeetingEmailLog({
  leadId,
  meetingBookingId,
  metadata,
  submissionId,
  subject,
  to,
  type,
}: MeetingEmailLogCreateInput): Promise<MeetingEmailLogCreateResult> {
  console.info('Creating meeting email log', {
    leadId,
    submissionId: submissionId ?? null,
    meetingBookingId: meetingBookingId ?? metadata.meetingBookingId ?? null,
    type,
    status: 'PENDING',
  });

  const data: Prisma.EmailLogCreateInput = {
    to,
    subject,
    type,
    status: 'PENDING',
    metadata,
    lead: {
      connect: { id: leadId },
    },
    ...(submissionId
      ? {
          submission: {
            connect: { id: submissionId },
          },
        }
      : {}),
    ...(meetingBookingId
      ? {
          meetingBooking: {
            connect: { id: meetingBookingId },
          },
        }
      : {}),
  };

  try {
    const log = await prisma.emailLog.create({ data });

    console.info('Meeting email log created', {
      emailLogId: log.id,
      leadId,
      submissionId: submissionId ?? null,
      meetingBookingId: meetingBookingId ?? null,
      type,
      status: log.status,
    });

    return { emailLogId: log.id };
  } catch (error) {
    const errorMessage = getSafeEmailErrorMessage(error);

    console.error('Failed to create meeting email log', {
      leadId,
      submissionId: submissionId ?? null,
      meetingBookingId: meetingBookingId ?? metadata.meetingBookingId ?? null,
      type,
      errorMessage,
    });

    return { error: errorMessage };
  }
}

export async function sendLeadActionEmail({
  context,
  leadId,
  metadata,
  subject,
  to,
  type,
}: SendLeadActionEmailInput): Promise<LeadActionEmailSendResult> {
  const log = await prisma.emailLog.create({
    data: {
      lead: { connect: { id: leadId } },
      to,
      subject,
      type,
      status: 'PENDING',
      metadata,
    },
  });

  const providerConfig = getEmailProviderConfigStatus();

  if (!providerConfig.configured) {
    const error = buildEmailProviderConfigurationError(providerConfig.missing);
    await markEmailFailed(log.id, error, metadata);
    return {
      success: false,
      emailSent: false,
      emailLogId: log.id,
      error,
    };
  }

  const sendResult = await sendEmailJob({
    logId: log.id,
    to,
    subject,
    type,
    metadata,
    react: createElement(LeadActionEmail, { context }),
  });

  return {
    success: sendResult.sent,
    emailSent: sendResult.sent,
    emailLogId: log.id,
    ...(sendResult.providerMessageId ? { providerMessageId: sendResult.providerMessageId } : {}),
    ...(sendResult.sent ? {} : { error: sendResult.error ?? 'Não foi possível enviar o email. Tente novamente.' }),
  };
}

export async function sendInternalScheduledMeetingEmails(params: {
  lead: SubmissionEmailLead;
  meetingBooking: MeetingBooking;
  submissionId?: string | null;
  actionId: string;
  title: string;
  meetingDescription?: string | null;
  leadActionDescription?: string | null;
  submissionSummary?: string | null;
}): Promise<MeetingEmailSendResult> {
  const {
    actionId,
    lead,
    leadActionDescription,
    meetingBooking,
    meetingDescription,
    submissionId,
    submissionSummary,
    title,
  } = params;
  const meetingEmailContext = await buildMeetingEmailContext({
    lead,
    meetingBooking,
    meetingTitle: title,
    meetingDescription,
    leadActionDescription,
    submissionSummary,
    commercialContext: submissionSummary ?? leadActionDescription,
    serviceInterest: title,
    triggerActionTitle: title,
    triggerActionDescription: leadActionDescription,
    source: 'Ãrea Interna / PrÃ³xima AÃ§Ã£o',
  });
  const submission: SubmissionEmailSubmission = {
    id: submissionId ?? `internal-${meetingBooking.id}`,
    type: 'MEETING_REQUEST',
    createdAt: meetingBooking.createdAt,
    payload: {
      source: 'Ãrea Interna / PrÃ³xima AÃ§Ã£o',
      actionId,
      title,
    },
  };
  const metadata = {
    actionId,
    calendarId: meetingBooking.calendarId,
    companyName: lead.company,
    contactName: lead.name ?? 'Contacto nÃ£o indicado',
    emailContextType: 'meeting',
    googleEventId: meetingBooking.googleEventId,
    leadId: lead.id,
    meetingBookingId: meetingBooking.id,
    source: 'Ãrea Interna / PrÃ³xima AÃ§Ã£o',
    internalObjective: meetingEmailContext.internalObjective,
    clientObjective: meetingEmailContext.clientObjective,
  };
  const customerMetadata = {
    ...metadata,
    selectedTemplate: 'ClientMeetingConfirmationEmail',
  };
  const internalMetadata = {
    ...metadata,
    selectedTemplate: 'InternalMeetingNotificationEmail',
  };
  const customerLog = await createMeetingEmailLog({
    leadId: lead.id,
    submissionId,
    meetingBookingId: meetingBooking.id,
    to: lead.email,
    subject: 'Reunião de diagnóstico confirmada — Norm8',
    type: EMAIL_TYPES.MEETING_CLIENT_CONFIRMATION,
    metadata: customerMetadata,
  });
  const jobs: EmailSendJob[] = customerLog.emailLogId
    ? [{
        logId: customerLog.emailLogId,
        to: lead.email,
        subject: 'Reunião de diagnóstico confirmada — Norm8',
        type: EMAIL_TYPES.MEETING_CLIENT_CONFIRMATION,
        metadata: customerMetadata,
        react: createElement(ClientMeetingConfirmationEmail, {
          context: meetingEmailContext,
        }),
      }]
    : [];
  const internalTo = process.env.INTERNAL_NOTIFICATION_EMAIL;
  const internalLog = await createMeetingEmailLog({
    leadId: lead.id,
    submissionId,
    meetingBookingId: meetingBooking.id,
    to: internalTo || 'missing-internal-notification-email',
    subject: `Nova reunião agendada — ${lead.company}`,
    type: EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION,
    metadata: internalMetadata,
  });

  if (internalTo && internalLog.emailLogId) {
    jobs.push({
      logId: internalLog.emailLogId,
      to: internalTo,
      subject: `Nova reunião agendada — ${lead.company}`,
      type: EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION,
      metadata: internalMetadata,
      react: createElement(InternalMeetingNotificationEmail, {
        context: meetingEmailContext,
      }),
    });
  } else if (internalLog.emailLogId) {
    await markEmailFailed(
      internalLog.emailLogId,
      'INTERNAL_NOTIFICATION_EMAIL is not configured.',
      internalMetadata,
    );
  }

  const sentResults: MeetingEmailDeliveryResult[] = await Promise.all(jobs.map(async (job) => {
    const result = await sendEmailJob(job);

    return {
      emailLogId: job.logId,
      type: job.type as MeetingEmailType,
      sent: result.sent,
      ...(result.error ? { error: result.error } : {}),
    };
  }));
  const logFailureResults: MeetingEmailDeliveryResult[] = [];

  if (!customerLog.emailLogId) {
    logFailureResults.push({
      type: EMAIL_TYPES.MEETING_CLIENT_CONFIRMATION,
      sent: false,
      error: customerLog.error ?? 'Failed to create meeting client email log.',
    });
  }

  if (!internalLog.emailLogId) {
    logFailureResults.push({
      type: EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION,
      sent: false,
      error: internalLog.error ?? 'Failed to create meeting internal email log.',
    });
  } else if (!internalTo) {
    logFailureResults.push({
      emailLogId: internalLog.emailLogId,
      type: EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION,
      sent: false,
      error: 'INTERNAL_NOTIFICATION_EMAIL is not configured.',
    });
  }
  const results = [...sentResults, ...logFailureResults];
  const customerSent = results.some(
    (result) => result.type === EMAIL_TYPES.MEETING_CLIENT_CONFIRMATION && result.sent,
  );
  const internalSent = results.some(
    (result) => result.type === EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION && result.sent,
  );
  const failedEmailTypes = results
    .filter((result) => !result.sent)
    .map((result) => result.type)
    .filter((type): type is MeetingEmailType => (
      type === EMAIL_TYPES.MEETING_CLIENT_CONFIRMATION ||
      type === EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION
    ));
  const clientResult = results.find(
    (result) => result.type === EMAIL_TYPES.MEETING_CLIENT_CONFIRMATION,
  );
  const internalResult = results.find(
    (result) => result.type === EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION,
  );
  console[customerSent ? 'info' : 'warn'](
    customerSent ? 'Meeting client email sent' : 'Meeting client email failed',
    {
      emailLogId: customerLog.emailLogId,
      leadId: lead.id,
      meetingBookingId: meetingBooking.id,
      type: EMAIL_TYPES.MEETING_CLIENT_CONFIRMATION,
      status: customerSent ? 'SENT' : 'FAILED',
    },
  );
  console[internalSent ? 'info' : 'warn'](
    internalSent ? 'Meeting internal email sent' : 'Meeting internal email failed',
    {
      emailLogId: internalLog.emailLogId,
      leadId: lead.id,
      meetingBookingId: meetingBooking.id,
      type: EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION,
      status: internalSent ? 'SENT' : 'FAILED',
    },
  );

  return {
    allSent: Boolean(internalTo) && results.every((result) => result.sent),
    customerSent,
    internalSent,
    failedEmailTypes,
    clientEmail: {
      attempted: Boolean(clientResult),
      sent: customerSent,
      ...(customerLog.emailLogId ? { emailLogId: customerLog.emailLogId } : {}),
      ...(clientResult && 'error' in clientResult && clientResult.error
        ? { error: clientResult.error }
        : {}),
    },
    internalEmail: {
      attempted: Boolean(internalTo && internalResult),
      sent: internalSent,
      ...(internalLog.emailLogId ? { emailLogId: internalLog.emailLogId } : {}),
      ...(internalResult && 'error' in internalResult && internalResult.error
        ? { error: internalResult.error }
        : {}),
    },
  };
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
  meetingEmailContext,
}: SendSubmissionEmailsParams): Promise<EmailSendJob | null> {
  const config = getConfirmationConfig(
    submission.type,
    meetingBooking?.status,
    auditAnalysis,
  );
  const metadata = buildEmailMetadata(meetingBooking, auditAnalysis, {
    clientPreviewSent: config.clientPreviewSent ?? false,
    selectedEmailTemplate: config.selectedTemplate,
    meetingEmailContext,
  });
  const contactSnapshot = getSubmissionContactSnapshot(submission, lead);
  const recipientEmail = contactSnapshot.email;
  const logId =
    confirmationEmailLogId ??
    (
      await prisma.emailLog.create({
        data: {
          lead: { connect: { id: lead.id } },
          submission: { connect: { id: submission.id } },
          ...(meetingBooking
            ? { meetingBooking: { connect: { id: meetingBooking.id } } }
            : {}),
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
      ...(meetingBooking
        ? { meetingBooking: { connect: { id: meetingBooking.id } } }
        : {}),
      metadata,
    },
  });

  if (!recipientEmail) {
    await markEmailFailed(logId, 'Lead email is missing.');
    return null;
  }

  const react = meetingEmailContext && submission.type === 'MEETING_REQUEST'
    ? createElement(ClientMeetingConfirmationEmail, { context: meetingEmailContext })
    : createElement(config.template, {
        lead: contactSnapshot,
        submission,
        meetingBooking,
        meetingEmailContext,
        auditAnalysis,
      });

  return {
    logId,
    to: recipientEmail,
    subject: config.subject,
    type: config.type,
    metadata,
    react,
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
  meetingEmailContext,
}: SendSubmissionEmailsParams): Promise<EmailSendJob | null> {
  const to = process.env.INTERNAL_NOTIFICATION_EMAIL;
  const subject =
    submission.type === 'AUDIT_REQUEST'
      ? 'Nova Auditoria Inteligente recebida'
      : `Nova submissÃ£o recebida no website Norm8 - ${formatSubmissionType(
          submission.type,
        )}`;
  const type = meetingEmailContext && submission.type === 'MEETING_REQUEST'
    ? EMAIL_TYPES.MEETING_INTERNAL_NOTIFICATION
    : EMAIL_TYPES.INTERNAL_NOTIFICATION;
  const metadata = buildEmailMetadata(meetingBooking, auditAnalysis, {
    meetingEmailContext,
  });
  const log = await prisma.emailLog.create({
    data: {
      lead: { connect: { id: lead.id } },
      submission: { connect: { id: submission.id } },
      ...(meetingBooking
        ? { meetingBooking: { connect: { id: meetingBooking.id } } }
        : {}),
      to: to || 'missing-internal-notification-email',
      subject,
      type,
      metadata,
    },
  });

  if (!to) {
    await markEmailFailed(log.id, 'INTERNAL_NOTIFICATION_EMAIL is not configured.');
    return null;
  }

  const react = meetingEmailContext && submission.type === 'MEETING_REQUEST'
    ? createElement(InternalMeetingNotificationEmail, { context: meetingEmailContext })
    : createElement(
        InternalLeadNotificationEmail,
        buildInternalTemplateProps(
          lead,
          submission,
          meetingBooking,
          auditAnalysis,
          meetingEmailContext,
        ),
      );

  return {
    logId: log.id,
    to,
    subject,
    type,
    metadata,
    react,
  };
}

/**
 * Sends a prepared email job through Resend and updates the corresponding EmailLog.
 *
 * @param job Fully prepared email send job.
 * @returns Promise that resolves after the EmailLog is updated.
 */
async function sendEmailJob(job: EmailSendJob): Promise<EmailSendResult> {
  try {
    if (!isValidEmailAddress(job.to)) {
      const error = `Invalid recipient email for ${job.type}.`;
      await markEmailFailed(job.logId, error, job.metadata);
      return { sent: false, error };
    }

    if (!job.subject.trim()) {
      const error = `Email subject is empty for ${job.type}.`;
      await markEmailFailed(job.logId, error, job.metadata);
      return { sent: false, error };
    }

    const providerConfig = getEmailProviderConfigStatus();
    if (!providerConfig.configured || !providerConfig.from) {
      const error = buildEmailProviderConfigurationError(providerConfig.missing);
      await markEmailFailed(job.logId, error, job.metadata);
      return { sent: false, error };
    }

    const html = await renderEmailJobHtml(job);
    const text = renderPlainTextFromHtml(html);

    if (!text.trim()) {
      const error = `Rendered email plain text is empty for ${job.type}.`;
      await markEmailFailed(job.logId, error, job.metadata);
      return { sent: false, error };
    }

    console.info('Sending transactional email', {
      type: job.type,
      fromConfigured: Boolean(providerConfig.from),
      fromDomain: providerConfig.fromDomain,
      toConfigured: Boolean(job.to),
      to: maskEmailAddress(job.to),
      subject: job.subject,
      htmlLength: html.length,
      textLength: text.length,
      provider: providerConfig.provider,
    });

    const resend = getResendClient();
    const response = await resend.emails.send({
      from: providerConfig.from,
      to: job.to,
      subject: job.subject,
      html,
      text,
      ...(providerConfig.replyTo ? { replyTo: providerConfig.replyTo } : {}),
    });

    if (response.error) {
      const errorMessage = formatProviderEmailError(response.error);
      await markEmailFailed(job.logId, errorMessage, job.metadata);
      console.error(`Failed to send ${job.type} email`, response.error);
      return { sent: false, error: errorMessage };
    }

    const providerMessageId = response.data?.id;

    if (!providerMessageId) {
      const error = 'Resend accepted the request without returning a message id.';
      await markEmailFailed(job.logId, error, job.metadata);
      return { sent: false, error };
    }

    const nextMetadata: EmailMetadata = {
      ...(job.metadata ?? {}),
      provider: providerConfig.provider,
      providerMessageId,
      deliveryStatus: 'ACCEPTED_BY_PROVIDER',
      from: providerConfig.from,
      fromDomain: providerConfig.fromDomain ?? null,
      replyTo: providerConfig.replyTo ?? null,
      to: job.to,
    };

    await prisma.emailLog.update({
      where: {
        id: job.logId,
      },
      data: {
        status: 'SENT',
        provider: providerConfig.provider,
        providerMessageId,
        sentAt: new Date(),
        failedAt: null,
        errorMessage: null,
        subject: job.subject,
        metadata: nextMetadata,
      },
    });
    console.info('Transactional email accepted by provider', {
      emailLogId: job.logId,
      type: job.type,
      status: 'SENT',
      deliveryStatus: 'ACCEPTED_BY_PROVIDER',
      provider: providerConfig.provider,
      providerMessageId,
    });
    return { sent: true, providerMessageId };
  } catch (error) {
    const message =
      error instanceof EmailConfigurationError || error instanceof Error
        ? error.message
        : 'Unknown email provider error.';

    await markEmailFailed(job.logId, message, job.metadata);
    console.error(`Failed to send ${job.type} email`, error);
    return { sent: false, error: message };
  }
}
async function renderEmailJobHtml(job: EmailSendJob): Promise<string> {
  try {
    const html = await render(job.react);

    if (!html.trim()) {
      throw new Error('Rendered email HTML is empty.');
    }

    return html;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown render error.';
    throw new Error(`Email template render failed for ${job.type}: ${reason}`);
  }
}

function renderPlainTextFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildEmailProviderConfigurationError(missing: string[]): string {
  if (missing.includes('VALID_EMAIL_FROM')) {
    return 'Envio de email não configurado corretamente: remetente inválido ou domínio não verificado.';
  }

  if (missing.includes('EMAIL_FROM')) {
    return 'Envio de email não configurado corretamente: remetente em falta.';
  }

  if (missing.includes('RESEND_API_KEY')) {
    return 'Envio de email ainda não configurado.';
  }

  if (missing.includes('VALID_REPLY_TO')) {
    return 'Envio de email não configurado corretamente: reply-to inválido.';
  }

  return 'Envio de email não configurado corretamente.';
}

function formatProviderEmailError(error: { message?: string; name?: string; statusCode?: number | null }): string {
  return [
    error.statusCode ? `Provider status ${error.statusCode}` : null,
    error.name ? `Provider error ${error.name}` : null,
    error.message ?? 'Unknown provider error',
  ]
    .filter(Boolean)
    .join(': ');
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function maskEmailAddress(value: string): string {
  const [localPart, domain] = value.split('@');
  if (!localPart || !domain) {
    return 'invalid-email';
  }

  const visibleLocal = localPart.length <= 2 ? localPart[0] : localPart.slice(0, 2);
  return `${visibleLocal}***@${domain}`;
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
  const nextMetadata: EmailMetadata = {
    ...(metadata ?? {}),
    deliveryError: sanitizeEmailError(reason),
  };

  await prisma.emailLog.update({
    where: {
      id: logId,
    },
    data: {
      status: 'FAILED',
      provider: 'resend',
      failedAt: new Date(),
      errorMessage: sanitizeEmailError(reason),
      metadata: nextMetadata,
    },
  });

  console.error(`EmailLog ${logId} marked as FAILED: ${reason}`);
}

function sanitizeEmailError(reason: string): string {
  return reason.replace(/re_[A-Za-z0-9_-]+/g, 're_***').slice(0, 500);
}

function getSafeEmailErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown email log error.';
  return sanitizeEmailError(message);
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
          subject: 'A sua prÃ©-anÃ¡lise de automaÃ§Ã£o da Norm8',
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
        subject: 'Recebemos o seu pedido de AutomaÃ§Ã£o Personalizada',
        type: 'CUSTOM_AUTOMATION_CONFIRMATION',
        template: CustomAutomationConfirmationEmail,
        selectedTemplate: 'CustomAutomationConfirmationEmail',
      };
    case 'MEETING_REQUEST':
      return {
        subject:
          meetingStatus === 'CONFIRMED'
            ? 'ReuniÃ£o confirmada com a Norm8'
            : 'Recebemos o seu pedido de reuniÃ£o',
        type: EMAIL_TYPES.MEETING_CLIENT_CONFIRMATION,
        template: MeetingRequestConfirmationEmail,
        selectedTemplate: 'ClientMeetingConfirmationEmail',
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
  options: {
    clientPreviewSent?: boolean;
    selectedEmailTemplate?: string;
    meetingEmailContext?: SendSubmissionEmailsParams['meetingEmailContext'];
  } = {},
): EmailMetadata | undefined {
  const metadata: EmailMetadata = {};

  if (meetingBooking) {
    metadata.meetingBookingId = meetingBooking.id;
    metadata.meetingBookingStatus = meetingBooking.status;
    metadata.googleEventId = meetingBooking.googleEventId ?? null;
    metadata.googleEventHtmlLink = meetingBooking.googleEventHtmlLink ?? null;
  }

  if (options.meetingEmailContext) {
    metadata.internalObjective = options.meetingEmailContext.internalObjective;
    metadata.clientObjective = options.meetingEmailContext.clientObjective;
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
  meetingEmailContext?: InternalLeadNotificationEmailProps['meetingEmailContext'],
): InternalLeadNotificationEmailProps {
  return {
    lead: getSubmissionContactSnapshot(submission, lead),
    submission,
    meetingBooking,
    auditAnalysis,
    meetingEmailContext,
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
    )?.value ?? 'Pedido recebido sem contexto adicional.';

  switch (type) {
    case 'AUDIT_REQUEST':
      return `Novo pedido de Auditoria Inteligente. Resumo: ${challenge}`;
    case 'CUSTOM_AUTOMATION_REQUEST':
      return `Novo pedido de AutomaÃ§Ã£o Personalizada. Resumo: ${challenge}`;
    case 'MEETING_REQUEST':
      return `Nova marcaÃ§Ã£o de reuniÃ£o. Objetivo: ${challenge}`;
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

