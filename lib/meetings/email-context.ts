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
  meetingTitle: string;
  meetingDate: string;
  meetingStartTime: string;
  meetingEndTime: string;
  durationMinutes: number;
  status: string;
  internalObjective: string;
  clientObjective: string;
  adminLeadUrl?: string;
  googleEventHtmlLink?: string;
  source: string;
};

export type BuildMeetingEmailContextInput = {
  lead: Pick<Lead, 'id' | 'name' | 'company' | 'email' | 'phone'>;
  meetingBooking: MeetingBooking;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  leadActionDescription?: string | null;
  submissionSummary?: string | null;
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
  source,
  siteUrl,
}: BuildMeetingEmailContextInput): Promise<MeetingEmailContext> {
  const timezone = meetingBooking.timezone || 'Europe/Lisbon';
  const baseUrl = clean(siteUrl) ?? clean(process.env.NEXT_PUBLIC_SITE_URL);
  const companyName =
    clean(lead.company) ?? clean(meetingBooking.attendeeCompany) ?? 'Empresa não indicada';
  const internalObjective = resolveInternalMeetingObjective({
    meetingDescription,
    leadActionDescription,
    submissionSummary,
  });
  const clientObjective = await transformInternalObjectiveForClient({
    internalObjective,
    companyName,
  });

  return {
    companyName,
    contactName: clean(lead.name) ?? clean(meetingBooking.attendeeName) ?? 'Contacto não indicado',
    contactEmail: clean(lead.email) ?? clean(meetingBooking.attendeeEmail) ?? 'Email não indicado',
    contactPhone: clean(lead.phone) ?? 'Não indicado',
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
    adminLeadUrl: baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/admin/leads/${lead.id}`
      : undefined,
    googleEventHtmlLink: clean(meetingBooking.googleEventHtmlLink),
    source: clean(source) ?? 'Website / Marcar Reunião',
  };
}

function clean(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
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
