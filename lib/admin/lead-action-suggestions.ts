/**
 * ------------------------------------------------------------------
 * File: lib/admin/lead-action-suggestions.ts
 * Description: Deterministic defaults for commercial next-action forms.
 * Responsibilities:
 * - Suggest useful lead follow-ups without AI calls.
 * - Keep reusable presets aligned with action types.
 * - Keep date calculations inside business hours.
 * - Avoid past due dates and weekend defaults.
 * ------------------------------------------------------------------
 */

import type {
  LeadActionStatus,
  LeadActionType,
  LeadPriority,
  LeadStatus,
  SubmissionType,
} from '@/app/generated/prisma/client';

type SuggestedLeadActionInput = {
  status: LeadStatus;
  priority: LeadPriority;
  submissions: Array<{
    type: SubmissionType;
    createdAt: Date;
  }>;
  auditAnalyses: Array<{
    createdAt: Date;
  }>;
  meetingBookings: Array<{
    startsAt: Date;
  }>;
  emailLogs: Array<{
    createdAt: Date;
  }>;
  leadActions: Array<{
    status: LeadActionStatus;
    dueAt: Date | null;
  }>;
  now?: Date;
};

export type LeadActionTypePreset = {
  title: string;
  description: string;
};

export type SuggestedLeadAction = LeadActionTypePreset & {
  type: LeadActionType;
  dueAt: Date;
};

const DEFAULT_HOUR = 10;
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 18;

const leadActionTypePresets: Record<LeadActionType, LeadActionTypePreset> = {
  REVIEW_AUDIT: {
    title: 'Rever auditoria e qualificar oportunidade',
    description:
      'Analisar a submissão mais recente, validar o potencial comercial e definir o próximo passo recomendado para a lead.',
  },
  SCHEDULE_MEETING: {
    title: 'Marcar reunião de diagnóstico',
    description:
      'Contactar a lead prioritária para agendar uma reunião de diagnóstico e avançar a oportunidade no funil comercial.',
  },
  SEND_EMAIL: {
    title: 'Preparar email de seguimento',
    description:
      'Preparar uma mensagem personalizada para dar seguimento ao pedido submetido e propor o próximo passo.',
  },
  FOLLOW_UP: {
    title: 'Fazer follow-up comercial',
    description:
      'Dar seguimento ao contacto anterior, confirmar interesse e tentar avançar para reunião ou proposta.',
  },
  SEND_PROPOSAL: {
    title: 'Preparar e enviar proposta',
    description:
      'Preparar proposta com base na auditoria, necessidades identificadas e potencial comercial da oportunidade.',
  },
  CALL: {
    title: 'Ligar ao contacto',
    description:
      'Contactar a lead por telefone para validar interesse, esclarecer dúvidas e definir o próximo passo comercial.',
  },
  CLOSE_LOST: {
    title: 'Fechar oportunidade como perdida',
    description:
      'Registar o motivo de perda da oportunidade e atualizar o estado comercial da lead.',
  },
  OTHER: {
    title: 'Registar próxima ação',
    description:
      'Adicionar contexto e definir o próximo passo necessário para avançar esta oportunidade.',
  },
};

/**
 * Returns the deterministic copy preset for a commercial action type.
 *
 * @param type Lead action type selected by the admin.
 * @returns Default title and description for that type.
 */
export function getLeadActionPresetByType(type: LeadActionType): LeadActionTypePreset {
  return leadActionTypePresets[type];
}

/**
 * Builds the initial next-action suggestion shown in the lead detail form.
 *
 * @param input Current lead context.
 * @returns Editable deterministic action defaults.
 */
export function getSuggestedNextLeadAction(
  input: SuggestedLeadActionInput,
): SuggestedLeadAction {
  const now = input.now ?? new Date();
  const hasPendingActions = input.leadActions.some(
    (action) => action.status !== 'COMPLETED',
  );
  const latestSubmission = getLatestByDate(input.submissions, 'createdAt');
  const hasAuditContext =
    latestSubmission?.type === 'AUDIT_REQUEST' || input.auditAnalyses.length > 0;
  const hasMeeting = input.meetingBookings.length > 0;
  const hasEmail = input.emailLogs.length > 0;

  if (input.priority === 'HIGH' || input.priority === 'URGENT') {
    return buildSuggestedAction('SCHEDULE_MEETING', getSameBusinessDayPlusTwoHoursOrNext(now));
  }

  if (input.status === 'QUALIFIED') {
    return buildSuggestedAction('SEND_PROPOSAL', addBusinessDaysAtDefaultHour(now, 2));
  }

  if (input.status === 'CONTACTED' && !hasMeeting) {
    return buildSuggestedAction('FOLLOW_UP', getNextBusinessDayAtDefaultHour(now));
  }

  if (input.status === 'NEW' && !hasPendingActions) {
    return buildSuggestedAction(
      hasAuditContext ? 'REVIEW_AUDIT' : 'FOLLOW_UP',
      getNextBusinessDayAtDefaultHour(now),
    );
  }

  return buildSuggestedAction(
    hasEmail ? 'FOLLOW_UP' : 'SEND_EMAIL',
    getNextBusinessDayAtDefaultHour(now),
  );
}

function buildSuggestedAction(type: LeadActionType, dueAt: Date): SuggestedLeadAction {
  return {
    type,
    dueAt,
    ...getLeadActionPresetByType(type),
  };
}

function getLatestByDate<T extends Record<K, Date>, K extends keyof T>(
  items: T[],
  dateKey: K,
): T | undefined {
  return [...items].sort(
    (first, second) => second[dateKey].getTime() - first[dateKey].getTime(),
  )[0];
}

function getSameBusinessDayPlusTwoHoursOrNext(now: Date): Date {
  const candidate = roundUpToNextQuarterHour(addHours(now, 2));

  if (
    isBusinessDay(now) &&
    candidate.getDate() === now.getDate() &&
    candidate.getHours() >= BUSINESS_START_HOUR &&
    isBeforeBusinessEnd(candidate)
  ) {
    return candidate;
  }

  return getNextBusinessDayAtDefaultHour(now);
}

function getNextBusinessDayAtDefaultHour(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  result.setHours(DEFAULT_HOUR, 0, 0, 0);

  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

function addBusinessDaysAtDefaultHour(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);

    if (isBusinessDay(result)) {
      addedDays += 1;
    }
  }

  result.setHours(DEFAULT_HOUR, 0, 0, 0);

  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);

  return result;
}

function roundUpToNextQuarterHour(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const nextQuarter = Math.ceil(minutes / 15) * 15;

  if (nextQuarter === 60) {
    result.setHours(result.getHours() + 1, 0, 0, 0);
  } else {
    result.setMinutes(nextQuarter, 0, 0);
  }

  return result;
}

function isBeforeBusinessEnd(date: Date): boolean {
  return (
    date.getHours() < BUSINESS_END_HOUR ||
    (date.getHours() === BUSINESS_END_HOUR && date.getMinutes() === 0)
  );
}

function isBusinessDay(date: Date): boolean {
  const day = date.getDay();

  return day !== 0 && day !== 6;
}