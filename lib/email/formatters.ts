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
    meetingGoal: 'Objetivo',
    selectedDate: 'Data pedida',
    selectedTime: 'Hora pedida',
    industry: 'Setor',
    employees: 'Colaboradores',
    mainChallenge: 'Principal desafio',
    mainGoal: 'Objetivo principal',
    processToAutomate: 'Processo a automatizar',
    currentTools: 'Ferramentas atuais',
    desiredOutcome: 'Resultado pretendido',
    estimatedBudget: 'Budget estimado',
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
