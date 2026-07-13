import 'server-only';

import type { Lead, MeetingBooking } from '@/app/generated/prisma/client';
import {
  resolveInternalMeetingObjective,
  transformInternalObjectiveForClient,
} from '@/lib/meetings/objectives';

export type MeetingEmailContext = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  leadStatus?: string;
  leadPriority?: string;
  leadSource?: string;
  serviceInterest?: string;
  meetingTitle: string;
  meetingDate: string;
  meetingStartTime: string;
  meetingEndTime: string;
  durationMinutes: number;
  status: string;
  internalObjective: string;
  clientObjective: string;
  commercialContext?: string;
  hasLimitedCommercialContext?: boolean;
  submissionSummary?: string;
  triggerActionTitle?: string;
  triggerActionDescription?: string;
  adminLeadUrl?: string;
  googleEventId?: string;
  googleCalendarUrl?: string;
  googleEventHtmlLink?: string;
  googleEventCreated: boolean;
  source: string;
};

export type BuildMeetingEmailContextInput = {
  lead: Pick<Lead, 'id' | 'name' | 'company' | 'email' | 'phone'> &
    Partial<Pick<Lead, 'status' | 'priority' | 'source'>>;
  meetingBooking: MeetingBooking;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  leadActionDescription?: string | null;
  submissionSummary?: string | null;
  commercialContext?: string | null;
  serviceInterest?: string | null;
  triggerActionTitle?: string | null;
  triggerActionDescription?: string | null;
  source?: string | null;
  siteUrl?: string | null;
};

export async function buildMeetingEmailContext({
  lead,
  meetingBooking,
  meetingTitle,
  meetingDescription,
  leadActionDescription,
  submissionSummary,
  commercialContext,
  serviceInterest,
  triggerActionTitle,
  triggerActionDescription,
  source,
  siteUrl,
}: BuildMeetingEmailContextInput): Promise<MeetingEmailContext> {
  const timezone = meetingBooking.timezone || 'Europe/Lisbon';
  const baseUrl = clean(siteUrl) ?? clean(process.env.NEXT_PUBLIC_SITE_URL);
  const companyName =
    clean(lead.company) ?? clean(meetingBooking.attendeeCompany) ?? 'Empresa não indicada';
  const rawInternalObjective = resolveInternalMeetingObjective({
    meetingDescription,
    leadActionDescription,
    submissionSummary,
  });
  const internalObjective = adaptInternalObjectiveForScheduledMeeting(rawInternalObjective);
  const clientObjective = await transformInternalObjectiveForClient({
    internalObjective,
    companyName,
  });
  const usefulTriggerActionDescription = getUsefulText(triggerActionDescription ?? leadActionDescription, [
    internalObjective,
  ]);
  const usefulSubmissionSummary = getUsefulText(submissionSummary, [internalObjective]);
  const usefulServiceInterest = getUsefulText(serviceInterest, [meetingTitle]);
  const commercialContextResult = buildCommercialContext({
    explicitCommercialContext: commercialContext,
    internalObjective,
    leadActionDescription,
    leadPriority: formatLeadPriority(lead.priority),
    leadSource: formatLeadSourceLabel(lead.source),
    leadStatus: formatLeadStatus(lead.status),
    serviceInterest: usefulServiceInterest,
    submissionSummary: usefulSubmissionSummary,
    triggerActionDescription: usefulTriggerActionDescription,
  });

  return {
    companyName,
    contactName: clean(lead.name) ?? clean(meetingBooking.attendeeName) ?? 'Contacto não indicado',
    contactEmail: clean(lead.email) ?? clean(meetingBooking.attendeeEmail) ?? 'Email não indicado',
    contactPhone: clean(lead.phone) ?? 'Não indicado',
    leadStatus: formatLeadStatus(lead.status),
    leadPriority: formatLeadPriority(lead.priority),
    leadSource: formatLeadSourceLabel(lead.source),
    serviceInterest: usefulServiceInterest,
    meetingTitle: clean(meetingTitle) ?? `Reunião de diagnóstico — ${clean(lead.company) ?? 'Norm8'}`,
    meetingDate: formatMeetingDate(meetingBooking.startsAt, timezone),
    meetingStartTime: formatMeetingTime(meetingBooking.startsAt, timezone),
    meetingEndTime: formatMeetingTime(meetingBooking.endsAt, timezone),
    durationMinutes: Math.max(
      0,
      Math.round((meetingBooking.endsAt.getTime() - meetingBooking.startsAt.getTime()) / 60_000),
    ),
    status: formatStatus(meetingBooking.status),
    internalObjective,
    clientObjective,
    commercialContext: commercialContextResult.text,
    hasLimitedCommercialContext: commercialContextResult.isFallback,
    submissionSummary: usefulSubmissionSummary,
    triggerActionTitle: clean(triggerActionTitle),
    triggerActionDescription: usefulTriggerActionDescription,
    adminLeadUrl: baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/admin/leads/${lead.id}`
      : undefined,
    googleEventId: clean(meetingBooking.googleEventId),
    googleCalendarUrl: clean(meetingBooking.googleEventHtmlLink),
    googleEventHtmlLink: clean(meetingBooking.googleEventHtmlLink),
    googleEventCreated: Boolean(meetingBooking.googleEventId),
    source: clean(source) ?? 'Website / Marcar Reunião',
  };
}

function clean(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function adaptInternalObjectiveForScheduledMeeting(value: string): string {
  if (!isSchedulingInstruction(value)) {
    return value;
  }

  return 'Realizar reunião de diagnóstico para validar contexto, principais dores operacionais e próximos passos comerciais.';
}

function buildCommercialContext({
  explicitCommercialContext,
  internalObjective,
  leadActionDescription,
  leadPriority,
  leadSource,
  leadStatus,
  serviceInterest,
  submissionSummary,
  triggerActionDescription,
}: {
  explicitCommercialContext?: string | null;
  internalObjective: string;
  leadActionDescription?: string | null;
  leadPriority?: string;
  leadSource?: string;
  leadStatus?: string;
  serviceInterest?: string;
  submissionSummary?: string;
  triggerActionDescription?: string;
}): { text: string; isFallback: boolean } {
  const candidates = [
    submissionSummary,
    explicitCommercialContext,
    serviceInterest,
    triggerActionDescription,
    leadActionDescription,
  ];
  const usefulCandidate = candidates
    .map((candidate) => getUsefulText(candidate, [internalObjective]))
    .find(Boolean);

  if (usefulCandidate) {
    return { text: usefulCandidate, isFallback: false };
  }

  const leadSignals = [
    leadStatus ? `estado ${leadStatus}` : null,
    leadPriority ? `prioridade ${leadPriority}` : null,
    leadSource ? `origem ${leadSource}` : null,
  ].filter(Boolean);

  if (leadSignals.length > 0) {
    return {
      text: `Lead com contexto inicial limitado (${leadSignals.join(', ')}). Usar a reunião para recolher informação sobre processos atuais, ferramentas utilizadas, tarefas repetitivas, atrasos, retrabalho e prioridades de automação.`,
      isFallback: true,
    };
  }

  return {
    text: 'Lead com contexto inicial limitado. Usar a reunião para recolher informação sobre processos atuais, ferramentas utilizadas, tarefas repetitivas, atrasos, retrabalho e prioridades de automação.',
    isFallback: true,
  };
}

function getUsefulText(value: string | null | undefined, duplicateCandidates: Array<string | null | undefined>): string | undefined {
  const normalized = clean(value);
  if (!normalized || normalized === 'Sem resumo indicado') {
    return undefined;
  }

  if (isSchedulingInstruction(normalized)) {
    return undefined;
  }

  if (duplicateCandidates.some((candidate) => isDuplicateText(normalized, candidate))) {
    return undefined;
  }

  return normalized;
}

function isSchedulingInstruction(value: string): boolean {
  const normalized = normalizeTextForComparison(value);
  const mentionsMeetingScheduling =
    /\b(agendar|marcar)\b/.test(normalized) && /\b(reuniao|diagnostico)\b/.test(normalized);
  const mentionsOperationalContact =
    /\bcontactar\b/.test(normalized) &&
    /\b(lead|agendar|marcar|reuniao|diagnostico|oportunidade)\b/.test(normalized);

  return mentionsMeetingScheduling || mentionsOperationalContact || /\bfunil comercial\b/.test(normalized);
}

function isDuplicateText(a?: string | null, b?: string | null): boolean {
  const left = normalizeTextForComparison(a);
  const right = normalizeTextForComparison(b);
  if (!left || !right) {
    return false;
  }

  return left === right || left.includes(right) || right.includes(left);
}

function normalizeTextForComparison(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatLeadSourceLabel(source?: string | null): string | undefined {
  const normalized = clean(source)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const labels: Record<string, string> = {
    'website:meeting': 'Website / Marcação de reunião',
    'website:audit': 'Website / Auditoria Inteligente',
    'website:custom-automation': 'Website / Automação Personalizada',
    'admin:lead-action': 'Área Interna / Próxima Ação',
    manual: 'Criada manualmente',
    fallback: 'Origem não indicada',
  };

  return labels[normalized] ?? clean(source);
}

function formatMeetingDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(date);
}

function formatMeetingTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  }).format(date);
}

function formatStatus(status: MeetingBooking['status']): string {
  const labels: Record<MeetingBooking['status'], string> = {
    REQUESTED: 'Pendente',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
    FAILED: 'Falhou',
  };

  return labels[status];
}

function formatLeadStatus(status?: Lead['status']): string | undefined {
  if (!status) {
    return undefined;
  }

  const labels: Record<Lead['status'], string> = {
    NEW: 'Nova',
    QUALIFIED: 'Qualificada',
    CONTACTED: 'Contactada',
    CONVERTED: 'Convertida',
    LOST: 'Perdida',
  };

  return labels[status];
}

function formatLeadPriority(priority?: Lead['priority']): string | undefined {
  if (!priority) {
    return undefined;
  }

  const labels: Record<Lead['priority'], string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  };

  return labels[priority];
}
