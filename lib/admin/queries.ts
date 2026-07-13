/**
 * ------------------------------------------------------------------
 * File: lib/admin/queries.ts
 * Description: Server-side Prisma queries for the Norm8 admin dashboard.
 * Responsibilities:
 * - Fetch overview metrics and operational tables from the database.
 * - Keep admin pages thin and focused on rendering.
 * - Provide reusable data access for future authenticated admin features.
 * ------------------------------------------------------------------
 */

import 'server-only';

import type { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { AdminSubmissionChartPoint } from './chart-types';
import { getMetricTrend } from './metrics';
import type {
  EmailFilter,
  LeadFilters,
  MeetingFilter,
  NotificationFilter,
} from './types';

const OVERVIEW_PERIOD_DAYS = 30;
const OVERVIEW_LEAD_ACTION_LIMIT = 5;

type OverviewMetricKey =
  | 'totalLeads'
  | 'newLeads'
  | 'totalSubmissions'
  | 'auditRequests'
  | 'automationRequests'
  | 'confirmedMeetings'
  | 'failedMeetings'
  | 'sentEmails'
  | 'failedEmails';

type OverviewMetricCounts = Record<OverviewMetricKey, number>;
type OverviewMetricPeriod = {
  gte: Date;
  lt: Date;
};


/**
 * Loads overview KPIs and latest operational records.
 *
 * @returns Aggregated admin overview data.
 */
export async function getAdminOverview() {
  const now = new Date();
  const currentPeriodStart = subtractDays(now, OVERVIEW_PERIOD_DAYS);
  const previousPeriodStart = subtractDays(currentPeriodStart, OVERVIEW_PERIOD_DAYS);
  const currentPeriod = {
    gte: currentPeriodStart,
    lt: now,
  };
  const previousPeriod = {
    gte: previousPeriodStart,
    lt: currentPeriodStart,
  };
  const [
    currentMetrics,
    previousMetrics,
    submissionsByDate,
    overdueLeadActions,
    dueTodayLeadActions,
    latestSubmissions,
    upcomingMeetings,
    latestNotifications,
  ] = await Promise.all([
    getOverviewMetricCounts(currentPeriod),
    getOverviewMetricCounts(previousPeriod),
    getSubmissionChartData(now),
    getOverdueLeadActions(now),
    getDueTodayLeadActions(now),
    prisma.submission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { lead: true },
    }),
    prisma.meetingBooking.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: 'asc' },
      take: 6,
      include: { lead: true },
    }),
    prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  return {
    metrics: {
      ...currentMetrics,
      trends: {
        totalLeads: getMetricTrend(currentMetrics.totalLeads, previousMetrics.totalLeads),
        newLeads: getMetricTrend(currentMetrics.newLeads, previousMetrics.newLeads),
        totalSubmissions: getMetricTrend(
          currentMetrics.totalSubmissions,
          previousMetrics.totalSubmissions,
        ),
        auditRequests: getMetricTrend(
          currentMetrics.auditRequests,
          previousMetrics.auditRequests,
        ),
        automationRequests: getMetricTrend(
          currentMetrics.automationRequests,
          previousMetrics.automationRequests,
        ),
        confirmedMeetings: getMetricTrend(
          currentMetrics.confirmedMeetings,
          previousMetrics.confirmedMeetings,
        ),
        failedMeetings: getMetricTrend(
          currentMetrics.failedMeetings,
          previousMetrics.failedMeetings,
          { inverseTone: true },
        ),
        sentEmails: getMetricTrend(currentMetrics.sentEmails, previousMetrics.sentEmails),
        failedEmails: getMetricTrend(
          currentMetrics.failedEmails,
          previousMetrics.failedEmails,
          { inverseTone: true },
        ),
      },
    },
    submissionsByDate,
    overdueLeadActions,
    dueTodayLeadActions,
    latestSubmissions,
    upcomingMeetings,
    latestNotifications,
  };
}

async function getOverviewMetricCounts(
  period: OverviewMetricPeriod,
): Promise<OverviewMetricCounts> {
  const [
    totalLeads,
    newLeads,
    totalSubmissions,
    auditRequests,
    automationRequests,
    confirmedMeetings,
    failedMeetings,
    sentEmails,
    failedEmails,
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: period } }),
    prisma.lead.count({ where: { status: 'NEW', createdAt: period } }),
    prisma.submission.count({ where: { createdAt: period } }),
    prisma.submission.count({ where: { type: 'AUDIT_REQUEST', createdAt: period } }),
    prisma.submission.count({
      where: { type: 'CUSTOM_AUTOMATION_REQUEST', createdAt: period },
    }),
    prisma.meetingBooking.count({ where: { status: 'CONFIRMED', createdAt: period } }),
    prisma.meetingBooking.count({ where: { status: 'FAILED', createdAt: period } }),
    prisma.emailLog.count({ where: { status: 'SENT', createdAt: period } }),
    prisma.emailLog.count({ where: { status: 'FAILED', createdAt: period } }),
  ]);

  return {
    totalLeads,
    newLeads,
    totalSubmissions,
    auditRequests,
    automationRequests,
    confirmedMeetings,
    failedMeetings,
    sentEmails,
    failedEmails,
  };
}

async function getOverdueLeadActions(now: Date) {
  const where: Prisma.LeadActionWhereInput = {
    dueAt: { lt: now },
    status: { not: 'COMPLETED' },
  };

  const [items, total] = await Promise.all([
    prisma.leadAction.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      take: OVERVIEW_LEAD_ACTION_LIMIT,
      include: { lead: true },
    }),
    prisma.leadAction.count({ where }),
  ]);

  return {
    items,
    remainingCount: Math.max(0, total - items.length),
  };
}

async function getDueTodayLeadActions(now: Date) {
  const tomorrowStart = addDays(startOfDay(now), 1);
  const where: Prisma.LeadActionWhereInput = {
    dueAt: {
      gte: now,
      lt: tomorrowStart,
    },
    status: { not: 'COMPLETED' },
  };

  const [items, total] = await Promise.all([
    prisma.leadAction.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      take: OVERVIEW_LEAD_ACTION_LIMIT,
      include: { lead: true },
    }),
    prisma.leadAction.count({ where }),
  ]);

  return {
    items,
    remainingCount: Math.max(0, total - items.length),
  };
}

async function getSubmissionChartData(now: Date): Promise<AdminSubmissionChartPoint[]> {
  const currentDayStart = startOfDay(now);
  const firstDayStart = subtractDays(currentDayStart, OVERVIEW_PERIOD_DAYS - 1);
  const endExclusive = addDays(currentDayStart, 1);
  const points = new Map<string, AdminSubmissionChartPoint>();

  for (let index = 0; index < OVERVIEW_PERIOD_DAYS; index += 1) {
    const date = addDays(firstDayStart, index);
    const dateKey = formatDateKey(date);
    points.set(dateKey, {
      date: dateKey,
      label: formatChartDateLabel(date),
      tooltipLabel: formatChartTooltipDate(date),
      submissions: 0,
    });
  }

  const submissions = await prisma.submission.findMany({
    where: {
      createdAt: {
        gte: firstDayStart,
        lt: endExclusive,
      },
    },
    select: { createdAt: true },
  });

  submissions.forEach((submission) => {
    const dateKey = formatDateKey(submission.createdAt);
    const point = points.get(dateKey);

    if (point) {
      point.submissions += 1;
    }
  });

  return Array.from(points.values());
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);

  return result;
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);

  return result;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatChartDateLabel(date: Date): string {
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  });
}

function formatChartTooltipDate(date: Date): string {
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    weekday: 'long',
  });
}

/**
 * Loads leads with search and filter support.
 *
 * @param filters Search, status, and priority filters.
 * @returns Matching leads ordered by creation date.
 */
export async function getLeads(filters: LeadFilters = {}) {
  const where: Prisma.LeadWhereInput = {
    AND: [
      filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { company: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {},
      filters.status && filters.status !== 'ALL' ? { status: filters.status } : {},
      filters.priority && filters.priority !== 'ALL'
        ? { priority: filters.priority }
        : {},
    ],
  };

  return prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      submissions: { select: { id: true } },
      meetingBookings: { select: { id: true } },
    },
  });
}

/**
 * Loads a lead detail with all related operational records.
 *
 * @param id Lead identifier.
 * @returns Lead detail or null.
 */
export async function getLeadById(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      submissions: { orderBy: { createdAt: 'desc' } },
      auditAnalyses: { orderBy: { createdAt: 'desc' } },
      meetingBookings: { orderBy: { startsAt: 'desc' } },
      emailLogs: { orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' } },
      notifications: { orderBy: { createdAt: 'desc' } },
      leadActions: { orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }] },
    },
  });

  if (!lead) {
    return null;
  }

  try {
    const proposals = await prisma.proposal.findMany({
      where: { leadId: id },
      orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
    });

    return { ...lead, proposals };
  } catch (error) {
    console.error(
      'Failed to load proposals for lead detail. Confirm that the add_proposals migration is applied and the dev server was restarted after prisma generate.',
      error,
    );

    return { ...lead, proposals: [] };
  }
}
/**
 * Loads all submissions with lead context.
 *
 * @returns Submissions ordered by newest first.
 */
export async function getSubmissions() {
  return prisma.submission.findMany({
    orderBy: { createdAt: 'desc' },
    include: { lead: true, meetingBooking: true },
  });
}

/**
 * Loads a single submission detail.
 *
 * @param id Submission identifier.
 * @returns Submission detail or null.
 */
export async function getSubmissionById(id: string) {
  return prisma.submission.findUnique({
    where: { id },
    include: { lead: true, meetingBooking: true, emailLogs: true, auditAnalysis: true },
  });
}

/**
 * Loads meeting bookings with admin filters.
 *
 * @param filter Meeting filter.
 * @returns Matching meeting bookings.
 */
export async function getMeetings(filter: MeetingFilter = 'ALL') {
  const now = new Date();
  const where: Prisma.MeetingBookingWhereInput =
    filter === 'CONFIRMED'
      ? { status: 'CONFIRMED' }
      : filter === 'FAILED'
        ? { status: 'FAILED' }
        : filter === 'UPCOMING'
          ? { startsAt: { gte: now } }
          : filter === 'PAST'
            ? { startsAt: { lt: now } }
            : {};

  return prisma.meetingBooking.findMany({
    where,
    orderBy: { startsAt: 'desc' },
    include: { lead: true },
  });
}

/**
 * Loads email logs with optional status filter.
 *
 * @param filter Email status filter.
 * @returns Matching email logs.
 */
export async function getEmailLogs(filter: EmailFilter = 'ALL') {
  return prisma.emailLog.findMany({
    where: filter === 'ALL' ? {} : { status: filter },
    orderBy: { createdAt: 'desc' },
    include: { lead: true },
  });
}

/**
 * Loads notifications with optional status filter.
 *
 * @param filter Notification status filter.
 * @returns Matching notifications.
 */
export async function getNotifications(filter: NotificationFilter = 'ALL') {
  return prisma.notification.findMany({
    where: filter === 'ALL' ? {} : { status: filter },
    orderBy: { createdAt: 'desc' },
    include: { relatedLead: true, relatedSubmission: true },
  });
}


