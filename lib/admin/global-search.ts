/**
 * ------------------------------------------------------------------
 * File: lib/admin/global-search.ts
 * Description: Incremental global search for the Norm8 admin area.
 * Responsibilities:
 * - Search real operational records already stored in Prisma.
 * - Return small, typed result cards for the admin topbar command bar.
 * - Keep the API thin and ready for a future indexed search backend.
 * ------------------------------------------------------------------
 */

import 'server-only';

import type { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  formatDatePt,
  formatLeadStatus,
  formatMeetingStatus,
  formatPriority,
  formatSubmissionStatus,
  formatSubmissionType,
  getSubmissionDisplayData,
} from './formatters';
import type { AdminGlobalSearchResult } from './search-types';

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 24;

type SearchableSubmission = Awaited<
  ReturnType<typeof prisma.submission.findMany>
>[number] & {
  lead: {
    name: string | null;
    company: string;
    email: string;
    phone: string | null;
  };
  auditAnalysis: {
    id: string;
    status: string;
    priority: string | null;
    score: number | null;
    createdAt: Date;
  } | null;
};

/**
 * Searches admin operational records using real database data.
 *
 * @param rawQuery User-entered query.
 * @returns Grouped-compatible flat result list.
 */
export async function searchAdminGlobal(
  rawQuery: string,
): Promise<AdminGlobalSearchResult[]> {
  const query = normalizeSearchQuery(rawQuery);

  if (query.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const [leads, submissions, meetings, emails] = await Promise.all([
    searchLeads(query),
    searchSubmissions(query),
    searchMeetings(query),
    searchEmails(query),
  ]);

  return [...leads, ...submissions, ...meetings, ...emails].slice(0, MAX_RESULTS);
}

async function searchLeads(query: string): Promise<AdminGlobalSearchResult[]> {
  const leadStatus = enumEquals(query, ['NEW', 'QUALIFIED', 'CONTACTED', 'CONVERTED', 'LOST']);
  const leadPriority = enumEquals(query, ['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
  const orFilters: Prisma.LeadWhereInput[] = [
    { name: { contains: query, mode: 'insensitive' } },
    { company: { contains: query, mode: 'insensitive' } },
    { email: { contains: query, mode: 'insensitive' } },
    { phone: { contains: query, mode: 'insensitive' } },
  ];

  if (leadStatus) {
    orFilters.push({ status: leadStatus });
  }

  if (leadPriority) {
    orFilters.push({ priority: leadPriority });
  }

  const where: Prisma.LeadWhereInput = { OR: orFilters };

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 8,
    include: {
      submissions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  return leads.flatMap((lead) => {
    const latestSubmission = lead.submissions[0];
    const subtitle = [
      lead.name,
      latestSubmission ? formatSubmissionType(latestSubmission.type) : undefined,
      formatPriority(lead.priority),
    ]
      .filter(Boolean)
      .join(' · ');

    const leadResult: AdminGlobalSearchResult = {
      id: `lead-${lead.id}`,
      type: 'lead',
      group: 'Leads',
      title: lead.company,
      subtitle: subtitle || lead.email,
      status: formatLeadStatus(lead.status),
      href: `/admin/leads/${lead.id}`,
      date: formatDatePt(lead.updatedAt),
    };

    const companyResult: AdminGlobalSearchResult | null = matchesText(
      query,
      lead.company,
    )
      ? {
          id: `company-${lead.id}`,
          type: 'company',
          group: 'Empresas',
          title: lead.company,
          subtitle: [lead.name, lead.email].filter(Boolean).join(' · '),
          status: formatPriority(lead.priority),
          href: `/admin/leads/${lead.id}`,
          date: formatDatePt(lead.updatedAt),
        }
      : null;

    return companyResult ? [leadResult, companyResult] : [leadResult];
  });
}

async function searchSubmissions(
  query: string,
): Promise<AdminGlobalSearchResult[]> {
  const submissions = (await prisma.submission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80,
    include: { lead: true, auditAnalysis: true },
  })) as SearchableSubmission[];

  return submissions
    .filter((submission) => submissionMatchesQuery(submission, query))
    .slice(0, 8)
    .flatMap((submission) => {
      const display = getSubmissionDisplayData(submission);
      const typeLabel = formatSubmissionType(submission.type);
      const title = display.company ?? display.name ?? typeLabel;
      const baseResult: AdminGlobalSearchResult = {
        id: `submission-${submission.id}`,
        type: 'submission',
        group: 'Submissões',
        title,
        subtitle: [display.name, typeLabel, display.summary].filter(Boolean).join(' · '),
        status: formatSubmissionStatus(submission.status),
        href: `/admin/submissions/${submission.id}`,
        date: formatDatePt(submission.createdAt),
      };

      if (!submission.auditAnalysis) {
        return [baseResult];
      }

      const auditResult: AdminGlobalSearchResult = {
        id: `audit-${submission.auditAnalysis.id}`,
        type: 'audit',
        group: 'Auditorias',
        title: `Auditoria · ${title}`,
        subtitle: [
          submission.auditAnalysis.score !== null
            ? `Score ${submission.auditAnalysis.score}`
            : undefined,
          submission.auditAnalysis.priority
            ? formatPriority(submission.auditAnalysis.priority as Parameters<typeof formatPriority>[0])
            : undefined,
          display.summary,
        ]
          .filter(Boolean)
          .join(' · '),
        status: submission.auditAnalysis.status,
        href: `/admin/submissions/${submission.id}`,
        date: formatDatePt(submission.auditAnalysis.createdAt),
      };

      return [baseResult, auditResult];
    });
}

async function searchMeetings(query: string): Promise<AdminGlobalSearchResult[]> {
  const meetingStatus = enumEquals(query, ['REQUESTED', 'CONFIRMED', 'CANCELLED', 'FAILED']);
  const orFilters: Prisma.MeetingBookingWhereInput[] = [
    { attendeeName: { contains: query, mode: 'insensitive' } },
    { attendeeCompany: { contains: query, mode: 'insensitive' } },
    { attendeeEmail: { contains: query, mode: 'insensitive' } },
    { meetingGoal: { contains: query, mode: 'insensitive' } },
  ];

  if (meetingStatus) {
    orFilters.push({ status: meetingStatus });
  }

  const where: Prisma.MeetingBookingWhereInput = { OR: orFilters };

  const meetings = await prisma.meetingBooking.findMany({
    where,
    orderBy: { startsAt: 'desc' },
    take: 6,
    include: { lead: true },
  });

  return meetings.map((meeting) => ({
    id: `meeting-${meeting.id}`,
    type: 'meeting',
    group: 'Reuniões',
    title: `Reunião com ${meeting.attendeeName}`,
    subtitle: [
      meeting.attendeeCompany,
      meeting.meetingGoal,
      meeting.attendeeEmail,
    ]
      .filter(Boolean)
      .join(' · '),
    status: formatMeetingStatus(meeting.status),
    href: `/admin/leads/${meeting.leadId}`,
    date: formatDatePt(meeting.startsAt),
  }));
}

async function searchEmails(query: string): Promise<AdminGlobalSearchResult[]> {
  const emails = await prisma.emailLog.findMany({
    where: {
      OR: [
        { to: { contains: query, mode: 'insensitive' } },
        { subject: { contains: query, mode: 'insensitive' } },
        { type: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  return emails.map((email) => ({
    id: `email-${email.id}`,
    type: 'email',
    group: 'Emails',
    title: email.subject,
    subtitle: email.to,
    status: email.status,
    href: '/admin/emails',
    date: formatDatePt(email.createdAt),
  }));
}

function submissionMatchesQuery(
  submission: SearchableSubmission,
  query: string,
): boolean {
  const display = getSubmissionDisplayData(submission);
  const haystack = [
    submission.type,
    formatSubmissionType(submission.type),
    submission.status,
    formatSubmissionStatus(submission.status),
    display.name,
    display.company,
    display.email,
    display.phone,
    display.website,
    display.summary,
    submission.lead.name,
    submission.lead.company,
    submission.lead.email,
    submission.lead.phone,
    submission.auditAnalysis?.status,
    submission.auditAnalysis?.priority,
  ];

  return haystack.some((value) => matchesText(query, value));
}

function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function matchesText(query: string, value?: string | number | null): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  return String(value).toLowerCase().includes(query.toLowerCase());
}

function enumEquals<T extends string>(
  query: string,
  values: readonly T[],
): T | undefined {
  const normalizedQuery = query.trim().toUpperCase();

  return values.find((value) => value === normalizedQuery);
}

