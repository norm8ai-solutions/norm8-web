import 'server-only';

import { createElement } from 'react';
import { render } from '@react-email/render';

import { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getEmailProviderConfigStatus, getResendClient } from '@/lib/email/resend';
import PreMeetingIntakeClientConfirmationEmail, {
  PRE_MEETING_INTAKE_CLIENT_CONFIRMATION_SUBJECT,
  buildPreMeetingIntakeClientConfirmationPlainText,
} from '@/lib/email/templates/PreMeetingIntakeClientConfirmationEmail';
import PreMeetingIntakeInternalNotificationEmail, {
  PRE_MEETING_INTAKE_INTERNAL_NOTIFICATION_SUBJECT_PREFIX,
  buildPreMeetingIntakeInternalNotificationPlainText,
} from '@/lib/email/templates/PreMeetingIntakeInternalNotificationEmail';
import PreMeetingInviteEmail, {
  PRE_MEETING_INVITE_SUBJECT,
  buildPreMeetingInvitePlainText,
} from '@/lib/email/templates/PreMeetingInviteEmail';

type ManualIntakeEmailKind = 'preMeeting' | 'legalData';

export type PreMeetingInviteEmailInput = {
  leadId: string;
  inviteId: string;
  to: string;
  contactName: string;
  companyName: string;
  formUrl: string;
};

export type PreMeetingInviteEmailResult = {
  success: boolean;
  emailLogId?: string;
  error?: string;
};

export async function sendPreMeetingInviteEmail(input: PreMeetingInviteEmailInput): Promise<PreMeetingInviteEmailResult> {
  const subject = PRE_MEETING_INVITE_SUBJECT;
  const metadata: Prisma.InputJsonObject = {
    inviteId: input.inviteId,
    formUrl: input.formUrl,
    kind: 'preMeetingInvite',
  };
  const log = await prisma.emailLog.create({
    data: {
      leadId: input.leadId,
      to: input.to,
      subject,
      type: 'PRE_MEETING_INTAKE_REQUEST',
      metadata,
    },
  });

  const providerConfig = getEmailProviderConfigStatus();
  if (!providerConfig.configured || !providerConfig.from) {
    const error = `Email provider is not configured: ${providerConfig.missing.join(', ') || 'unknown'}`;
    await markEmailFailed(log.id, error);
    return { success: false, emailLogId: log.id, error };
  }

  try {
    const resend = getResendClient();
    const html = await render(createElement(PreMeetingInviteEmail, {
      contactName: input.contactName,
      companyName: input.companyName,
      formUrl: input.formUrl,
    }));
    const text = buildPreMeetingInvitePlainText({
      contactName: input.contactName,
      companyName: input.companyName,
      formUrl: input.formUrl,
    });
    const result = await resend.emails.send({
      from: providerConfig.from,
      to: input.to,
      subject,
      html,
      text,
      ...(providerConfig.replyTo ? { replyTo: providerConfig.replyTo } : {}),
    });

    if (result.error) {
      await markEmailFailed(log.id, result.error.message);
      return { success: false, emailLogId: log.id, error: result.error.message };
    }

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'SENT',
        provider: providerConfig.provider,
        providerMessageId: result.data?.id,
        sentAt: new Date(),
        metadata: {
          ...metadata,
          provider: providerConfig.provider,
          providerMessageId: result.data?.id ?? null,
        },
      },
    });

    return { success: true, emailLogId: log.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send pre-meeting invite email.';
    await markEmailFailed(log.id, message);
    return { success: false, emailLogId: log.id, error: message };
  }
}

type ManualIntakeEmailInput = {
  kind: ManualIntakeEmailKind;
  lead: {
    id: string;
    name: string | null;
    company: string;
    email: string;
  };
  submissionId: string;
  payload: Prisma.InputJsonObject;
};

type ManualEmailJob = {
  to: string;
  subject: string;
  type: string;
  html: string;
  text?: string;
  metadata: Prisma.InputJsonObject;
};

export async function sendManualIntakeEmails(input: ManualIntakeEmailInput): Promise<void> {
  const internalTo = process.env.INTERNAL_NOTIFICATION_EMAIL;
  const clientJob = await buildClientJob(input);
  const internalJob = internalTo ? await buildInternalJob(input, internalTo) : null;
  const jobs = [clientJob, internalJob].filter((job): job is ManualEmailJob => Boolean(job));

  if (!internalTo) {
    await createFailedEmailLog({
      input,
      to: 'missing-internal-notification-email',
      subject: `Norm8: nova submissão manual de ${input.lead.company}`,
      type: `${input.kind.toUpperCase()}_INTERNAL_NOTIFICATION`,
      errorMessage: 'INTERNAL_NOTIFICATION_EMAIL is not configured.',
    });
  }

  await Promise.all(jobs.map((job) => sendManualEmailJob(input, job)));
}

async function sendManualEmailJob(input: ManualIntakeEmailInput, job: ManualEmailJob): Promise<void> {
  const log = await prisma.emailLog.create({
    data: {
      leadId: input.lead.id,
      submissionId: input.submissionId,
      to: job.to,
      subject: job.subject,
      type: job.type,
      metadata: job.metadata,
    },
  });

  const providerConfig = getEmailProviderConfigStatus();
  if (!providerConfig.configured || !providerConfig.from) {
    await markEmailFailed(log.id, `Email provider is not configured: ${providerConfig.missing.join(', ') || 'unknown'}`);
    return;
  }

  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: providerConfig.from,
      to: job.to,
      subject: job.subject,
      html: job.html,
      ...(job.text ? { text: job.text } : {}),
      ...(providerConfig.replyTo ? { replyTo: providerConfig.replyTo } : {}),
    });

    if (result.error) {
      await markEmailFailed(log.id, result.error.message);
      return;
    }

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'SENT',
        provider: providerConfig.provider,
        providerMessageId: result.data?.id,
        sentAt: new Date(),
        metadata: {
          ...job.metadata,
          provider: providerConfig.provider,
          providerMessageId: result.data?.id ?? null,
        },
      },
    });
  } catch (error) {
    await markEmailFailed(log.id, error instanceof Error ? error.message : 'Failed to send manual intake email.');
  }
}

async function buildClientJob(input: ManualIntakeEmailInput): Promise<ManualEmailJob> {
  if (input.kind === 'preMeeting') {
    const context = getPreMeetingEmailContext(input);

    return {
      to: input.lead.email,
      subject: PRE_MEETING_INTAKE_CLIENT_CONFIRMATION_SUBJECT,
      type: 'PRE_MEETING_INTAKE_CLIENT_CONFIRMATION',
      metadata: { kind: input.kind, audience: 'client', submissionId: input.submissionId },
      html: await render(createElement(PreMeetingIntakeClientConfirmationEmail, {
        contactName: context.contactName,
        companyName: context.companyName,
      })),
      text: buildPreMeetingIntakeClientConfirmationPlainText({
        contactName: context.contactName,
        companyName: context.companyName,
      }),
    };
  }

  return {
    to: input.lead.email,
    subject: 'Norm8: dados legais recebidos',
    type: 'LEGAL_DATA_CLIENT_RECEIPT',
    metadata: { kind: input.kind, audience: 'client' },
    html: renderEmailShell(
      'Dados legais recebidos',
      'Recebemos os dados legais e de faturação. A equipa Norm8 vai validar a informação antes dos próximos passos.',
      input.lead,
    ),
  };
}

async function buildInternalJob(input: ManualIntakeEmailInput, to: string): Promise<ManualEmailJob> {
  if (input.kind === 'preMeeting') {
    const context = getPreMeetingEmailContext(input);
    const subject = `${PRE_MEETING_INTAKE_INTERNAL_NOTIFICATION_SUBJECT_PREFIX} — ${context.companyName}`;

    return {
      to,
      subject,
      type: 'PRE_MEETING_INTAKE_INTERNAL_NOTIFICATION',
      metadata: {
        kind: input.kind,
        audience: 'internal',
        submissionId: input.submissionId,
        adminLeadUrl: context.adminLeadUrl ?? null,
      },
      html: await render(createElement(PreMeetingIntakeInternalNotificationEmail, context)),
      text: buildPreMeetingIntakeInternalNotificationPlainText(context),
    };
  }

  return {
    to,
    subject: `Dados legais recebidos: ${input.lead.company}`,
    type: 'LEGAL_DATA_INTERNAL_NOTIFICATION',
    metadata: { kind: input.kind, audience: 'internal' },
    html: renderInternalShell('Dados legais recebidos', input),
  };
}

function getPreMeetingEmailContext(input: ManualIntakeEmailInput) {
  return {
    adminLeadUrl: buildAdminLeadUrl(input.lead.id),
    companyName: getPayloadString(input.payload, 'companyName') || input.lead.company,
    contactName: getPayloadString(input.payload, 'contactName') || input.lead.name,
    email: getPayloadString(input.payload, 'email') || input.lead.email,
    phone: getPayloadString(input.payload, 'phone'),
    websiteOrSocials: getPayloadString(input.payload, 'websiteOrSocials'),
    businessArea: getPayloadString(input.payload, 'businessArea') || 'Não indicado',
    mainProblem: getPayloadString(input.payload, 'mainProblem') || 'Não indicado',
    processToAutomate: getPayloadString(input.payload, 'processToAutomate') || 'Não indicado',
    currentTools: getPayloadString(input.payload, 'currentTools') || 'Não indicado',
    solutionObjective: getPayloadString(input.payload, 'solutionObjective') || 'Não indicado',
    notes: getPayloadString(input.payload, 'notes'),
    submittedAt: formatSubmittedAt(getPayloadString(input.payload, 'submittedAt')),
  };
}

function renderEmailShell(title: string, body: string, lead: ManualIntakeEmailInput['lead']): string {
  return `
    <div style="font-family:Arial,sans-serif;background:#060914;color:#dbe7ff;padding:28px">
      <div style="max-width:620px;margin:0 auto;border:1px solid #1e2a44;border-radius:12px;padding:24px;background:#0b1020">
        <h1 style="margin:0 0 12px;font-size:22px;color:#ffffff">${escapeHtml(title)}</h1>
        <p style="line-height:1.6;color:#b8c7e6">Olá${lead.name ? ` ${escapeHtml(lead.name)}` : ''},</p>
        <p style="line-height:1.6;color:#b8c7e6">${escapeHtml(body)}</p>
        <p style="line-height:1.6;color:#93a4c7">Não envie passwords, tokens de acesso ou credenciais por email. Se forem necessários acessos técnicos, a equipa Norm8 indicará um método seguro.</p>
        <p style="margin-top:24px;color:#93a4c7">Equipa Norm8</p>
      </div>
    </div>`;
}

function renderInternalShell(title: string, input: ManualIntakeEmailInput): string {
  const rows = Object.entries(input.payload)
    .filter(([key]) => !['consent', 'interestConfirmation', 'payloadHash'].includes(key))
    .map(([key, value]) => `<tr><td style="padding:8px;color:#93a4c7">${escapeHtml(key)}</td><td style="padding:8px;color:#dbe7ff">${escapeHtml(String(value ?? ''))}</td></tr>`)
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;background:#060914;color:#dbe7ff;padding:28px">
      <div style="max-width:760px;margin:0 auto;border:1px solid #1e2a44;border-radius:12px;padding:24px;background:#0b1020">
        <h1 style="margin:0 0 12px;font-size:22px;color:#ffffff">${escapeHtml(title)}</h1>
        <p style="line-height:1.6;color:#b8c7e6">Lead: ${escapeHtml(input.lead.company)} · ${escapeHtml(input.lead.email)}</p>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
    </div>`;
}

async function createFailedEmailLog(params: {
  input: ManualIntakeEmailInput;
  to: string;
  subject: string;
  type: string;
  errorMessage: string;
}) {
  await prisma.emailLog.create({
    data: {
      leadId: params.input.lead.id,
      submissionId: params.input.submissionId,
      to: params.to,
      subject: params.subject,
      type: params.type,
      status: 'FAILED',
      errorMessage: params.errorMessage,
      failedAt: new Date(),
      metadata: { kind: params.input.kind, audience: 'internal' },
    },
  });
}

async function markEmailFailed(emailLogId: string, errorMessage: string) {
  await prisma.emailLog.update({
    where: { id: emailLogId },
    data: {
      status: 'FAILED',
      errorMessage,
      failedAt: new Date(),
    },
  });
}

function getPayloadString(payload: Prisma.InputJsonObject, key: string): string | null {
  const value = payload[key];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function formatSubmittedAt(value: string | null): string {
  const date = value ? new Date(value) : new Date();

  if (!Number.isFinite(date.getTime())) {
    return value ?? 'Não indicado';
  }

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Lisbon',
  }).format(date);
}

function buildAdminLeadUrl(leadId: string): string | undefined {
  const appUrl = getAppUrl();

  if (!appUrl) {
    return undefined;
  }

  return `${appUrl}/admin/leads/${leadId}`;
}

function getAppUrl(): string | undefined {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (!rawUrl) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  return withProtocol.replace(/\/$/, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}