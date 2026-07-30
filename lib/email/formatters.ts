/**
 * ------------------------------------------------------------------
 * File: lib/email/formatters.ts
 * Description: Formatting helpers for Norm8 transactional email content.
 * Responsibilities:
 * - Convert technical submission/status values into Portuguese labels.
 * - Format meeting dates and times for Portugal.
 * - Keep email templates readable and free from raw ISO/UTC values.
 * ------------------------------------------------------------------
 */

import type {
  MeetingBookingStatus,
  SubmissionType,
} from '@/app/generated/prisma/client';
import type {
  SubmissionEmailLead,
  SubmissionEmailSubmission,
} from './types';

/**
 * Converts internal submission types into readable Portuguese labels.
 *
 * @param type Submission type stored in the database.
 * @returns Human-readable submission type.
 */
export function formatSubmissionType(type: SubmissionType): string {
  switch (type) {
    case 'AUDIT_REQUEST':
      return 'Auditoria Inteligente';
    case 'CUSTOM_AUTOMATION_REQUEST':
      return 'Automação Personalizada';
    case 'MEETING_REQUEST':
      return 'Marcação de reunião';
    case 'PRE_MEETING_INTAKE':
      return 'Pré-discovery manual';
    case 'LEGAL_DATA_INTAKE':
      return 'Dados legais';
  }
}

/**
 * Formats a meeting date in Portuguese.
 *
 * @param date Meeting start date.
 * @param timezone IANA timezone used for display.
 * @returns Localized Portuguese date.
 */
export function formatMeetingDate(date: Date, timezone: string): string {
  return date.toLocaleDateString('pt-PT', {
    timeZone: timezone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats a meeting time range in Portuguese.
 *
 * @param startsAt Meeting start date.
 * @param endsAt Meeting end date.
 * @param timezone IANA timezone used for display.
 * @returns Time range such as "09:00 – 09:30".
 */
export function formatMeetingTimeRange(
  startsAt: Date,
  endsAt: Date,
  timezone: string,
): string {
  const formatter = new Intl.DateTimeFormat('pt-PT', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formatter.format(startsAt)} – ${formatter.format(endsAt)}`;
}

/**
 * Converts payload keys into readable Portuguese labels.
 *
 * @param label Raw payload key.
 * @returns Human-readable label.
 */
export function formatPayloadLabel(label: string): string {
  const labels: Record<string, string> = {
    name: 'Nome',
    company: 'Empresa',
    email: 'Email',
    phone: 'Telefone',
    website: 'Website',
    meetingGoal: 'Objetivo',
    selectedDate: 'Data pedida',
    selectedTime: 'Hora pedida',
    industry: 'Setor',
    employees: 'Colaboradores',
    annualRevenue: 'Receita anual',
    toolsUsed: 'Ferramentas usadas',
    mainChallenge: 'Principal desafio',
    mainGoal: 'Objetivo principal',
    processToAutomate: 'Processo a automatizar',
    currentTools: 'Ferramentas atuais',
    desiredOutcome: 'Resultado pretendido',
    estimatedBudget: 'Orçamento estimado',
    desiredTimeline: 'Timeline desejada',
  };

  return labels[label] ?? label;
}

/**
 * Converts meeting booking status into Portuguese labels.
 *
 * @param status Meeting booking status.
 * @returns Human-readable status.
 */
export function formatMeetingStatus(status: MeetingBookingStatus): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Confirmada';
    case 'FAILED':
      return 'Falhou';
    case 'CANCELLED':
      return 'Cancelada';
    case 'REQUESTED':
      return 'Pendente';
  }
}

/**
 * Calculates meeting duration in minutes.
 *
 * @param startsAt Meeting start date.
 * @param endsAt Meeting end date.
 * @returns Duration in minutes.
 */
export function formatMeetingDuration(startsAt: Date, endsAt: Date): string {
  const minutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);

  return `${minutes} minutos`;
}

export type SubmissionContactSnapshot = SubmissionEmailLead & {
  industry?: string;
};

/**
 * Builds the historical contact snapshot for a submission-related email.
 *
 * Lead records are consolidated by email and can keep older identity fields.
 * Customer and internal emails tied to a Submission must therefore prefer the
 * immutable Submission.payload values and only use Lead as fallback.
 *
 * @param submission Submission context with immutable payload.
 * @param lead Consolidated Lead fallback.
 * @returns Contact data that reflects the submitted form snapshot.
 */
export function getSubmissionContactSnapshot(
  submission: SubmissionEmailSubmission,
  lead: SubmissionEmailLead,
): SubmissionContactSnapshot {
  return {
    id: lead.id,
    name: getPayloadString(submission.payload, 'name') ?? lead.name,
    company: getPayloadString(submission.payload, 'company') ?? lead.company,
    email: getPayloadString(submission.payload, 'email') ?? lead.email,
    phone: getPayloadString(submission.payload, 'phone') ?? lead.phone,
    website: getPayloadString(submission.payload, 'website') ?? lead.website,
    source: lead.source,
    status: lead.status,
    priority: lead.priority,
    industry: getPayloadString(submission.payload, 'industry'),
  };
}

/**
 * Reads a printable string from a submission payload.
 *
 * @param payload Submission payload snapshot.
 * @param key Payload key to read.
 * @returns Trimmed string value or undefined.
 */
function getPayloadString(payload: unknown, key: string): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[key];

  if (typeof value === 'string') {
    const trimmed = value.trim();

    return trimmed || undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}
