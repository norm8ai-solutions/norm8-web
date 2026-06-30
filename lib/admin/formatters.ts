/**
 * ------------------------------------------------------------------
 * File: lib/admin/formatters.ts
 * Description: Formatting helpers for the internal Norm8 admin dashboard.
 * Responsibilities:
 * - Convert database enums and technical keys into Portuguese UI labels.
 * - Format dates, meeting ranges, and payload fields consistently.
 * - Keep admin pages focused on presentation and data management.
 * ------------------------------------------------------------------
 */

import type {
  LeadPriority,
  LeadStatus,
  MeetingBookingStatus,
  NotificationStatus,
  SubmissionStatus,
  SubmissionType,
} from '@/app/generated/prisma/client';

/**
 * Formats a submission type into Portuguese.
 *
 * @param type Submission type enum value.
 * @returns Human-readable label.
 */
export function formatSubmissionType(type: SubmissionType): string {
  const labels: Record<SubmissionType, string> = {
    AUDIT_REQUEST: 'Auditoria Inteligente',
    CUSTOM_AUTOMATION_REQUEST: 'Automação Personalizada',
    MEETING_REQUEST: 'Marcação de Reunião',
  };

  return labels[type];
}

/**
 * Formats a lead status into Portuguese.
 *
 * @param status Lead status enum value.
 * @returns Human-readable label.
 */
export function formatLeadStatus(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    NEW: 'Novo',
    QUALIFIED: 'Qualificado',
    CONTACTED: 'Contactado',
    CONVERTED: 'Convertido',
    LOST: 'Perdido',
  };

  return labels[status];
}

/**
 * Formats a submission status into Portuguese.
 *
 * @param status Submission status enum value.
 * @returns Human-readable label.
 */
export function formatSubmissionStatus(status: SubmissionStatus): string {
  const labels: Record<SubmissionStatus, string> = {
    NEW: 'Nova',
    IN_REVIEW: 'Em análise',
    CONTACTED: 'Contactada',
    CLOSED: 'Fechada',
    ARCHIVED: 'Arquivada',
  };

  return labels[status];
}

/**
 * Formats lead priority into Portuguese.
 *
 * @param priority Lead priority enum value.
 * @returns Human-readable label.
 */
export function formatPriority(priority: LeadPriority): string {
  const labels: Record<LeadPriority, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  };

  return labels[priority];
}

/**
 * Formats meeting booking status into Portuguese.
 *
 * @param status Meeting status enum value.
 * @returns Human-readable label.
 */
export function formatMeetingStatus(status: MeetingBookingStatus): string {
  const labels: Record<MeetingBookingStatus, string> = {
    REQUESTED: 'Pendente',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
    FAILED: 'Falhou',
  };

  return labels[status];
}

/**
 * Formats notification status into Portuguese.
 *
 * @param status Notification status enum value.
 * @returns Human-readable label.
 */
export function formatNotificationStatus(status: NotificationStatus): string {
  const labels: Record<NotificationStatus, string> = {
    UNREAD: 'Por ler',
    READ: 'Lida',
    ARCHIVED: 'Arquivada',
  };

  return labels[status];
}

/**
 * Formats a date in Portuguese.
 *
 * @param date Date to format.
 * @returns Date and time in pt-PT.
 */
export function formatDatePt(date: Date): string {
  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a meeting date in Portuguese.
 *
 * @param date Meeting date.
 * @param timezone IANA timezone.
 * @returns Human-readable date.
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
 * Formats a meeting time range.
 *
 * @param startsAt Meeting start.
 * @param endsAt Meeting end.
 * @param timezone IANA timezone.
 * @returns Time range in local timezone.
 */
export function formatTimeRangePt(
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
 * Formats JSON payload field labels for admin display.
 *
 * @param key Raw payload key.
 * @returns Portuguese label.
 */
export function formatPayloadLabel(key: string): string {
  const labels: Record<string, string> = {
    name: 'Nome',
    company: 'Empresa',
    role: 'Cargo',
    email: 'Email',
    phone: 'Telefone',
    website: 'Website',
    industry: 'Setor',
    employees: 'Colaboradores',
    annualRevenue: 'Receita anual',
    toolsUsed: 'Ferramentas usadas',
    mainChallenge: 'Principal desafio',
    mainGoal: 'Objetivo principal',
    processToAutomate: 'Processo a automatizar',
    currentTools: 'Ferramentas atuais',
    desiredOutcome: 'Resultado pretendido',
    estimatedBudget: 'Budget estimado',
    desiredTimeline: 'Timeline desejada',
    meetingGoal: 'Objetivo da reunião',
    selectedDate: 'Data selecionada',
    selectedTime: 'Hora selecionada',
    startsAt: 'Início',
    endsAt: 'Fim',
    timezone: 'Fuso horário',
  };

  return labels[key] ?? key;
}

/**
 * Converts payload JSON into readable admin rows.
 *
 * @param payload Submission payload.
 * @returns Label/value rows.
 */
export function formatPayloadRows(
  payload: unknown,
): Array<{ label: string; value: string }> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }

  return Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      label: formatPayloadLabel(key),
      value:
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value),
    }));
}

/**
 * Builds a concise submission summary for tables.
 *
 * @param payload Submission payload.
 * @returns Short summary text.
 */
export function formatSubmissionSummary(payload: unknown): string {
  const rows = formatPayloadRows(payload);
  const preferred = rows.find((row) =>
    ['Principal desafio', 'Processo a automatizar', 'Objetivo da reunião'].includes(
      row.label,
    ),
  );

  return preferred?.value ?? rows[0]?.value ?? 'Sem resumo';
}
