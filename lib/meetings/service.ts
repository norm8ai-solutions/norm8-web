/**
 * ------------------------------------------------------------------
 * File: lib/meetings/service.ts
 * Description: Shared MeetingBooking creation helpers for public and admin flows.
 * Responsibilities:
 * - Build a single canonical MeetingBooking payload.
 * - Validate occupied meeting slots before writes.
 * - Keep submission association optional while lead association remains required.
 * ------------------------------------------------------------------
 */

import 'server-only';

import {
  Prisma,
  type MeetingBooking,
  type MeetingBookingStatus,
} from '@/app/generated/prisma/client';
import { zonedTimeToUtc } from '@/lib/calendar/availability';
import { prisma } from '@/lib/db/prisma';

const BUSY_MEETING_STATUSES: MeetingBookingStatus[] = ['REQUESTED', 'CONFIRMED'];
const DEFAULT_ADMIN_MEETING_TIMES = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];

export class MeetingSlotUnavailableError extends Error {
  constructor() {
    super('Meeting slot is unavailable.');
    this.name = 'MeetingSlotUnavailableError';
  }
}

export type BuildMeetingBookingCreateDataInput = {
  leadId: string;
  submissionId?: string | null;
  requestedDate: string;
  requestedTime: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  attendeeEmail: string;
  attendeeName: string;
  attendeeCompany: string;
  meetingGoal?: string | null;
  status?: MeetingBookingStatus;
};

export type MeetingSlotAvailabilityInput = {
  date: string;
  durationMinutes: number;
  timezone?: string;
};

export type MeetingSlotAvailability = {
  date: string;
  durationMinutes: number;
  timezone: string;
  slots: Array<{
    time: string;
    startsAt: string;
    endsAt: string;
    available: boolean;
  }>;
};

export function buildMeetingBookingCreateData({
  leadId,
  submissionId,
  requestedDate,
  requestedTime,
  startsAt,
  endsAt,
  timezone,
  attendeeEmail,
  attendeeName,
  attendeeCompany,
  meetingGoal,
  status,
}: BuildMeetingBookingCreateDataInput): Prisma.MeetingBookingUncheckedCreateInput {
  return {
    leadId,
    submissionId: submissionId ?? null,
    status,
    requestedDate,
    requestedTime,
    startsAt,
    endsAt,
    timezone,
    attendeeEmail,
    attendeeName,
    attendeeCompany,
    meetingGoal,
  };
}

export async function assertMeetingSlotAvailable({
  startsAt,
  endsAt,
}: Pick<BuildMeetingBookingCreateDataInput, 'startsAt' | 'endsAt'>): Promise<void> {
  const overlappingMeeting = await prisma.meetingBooking.findFirst({
    where: {
      status: { in: BUSY_MEETING_STATUSES },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });

  if (overlappingMeeting) {
    throw new MeetingSlotUnavailableError();
  }
}

export async function createMeetingBooking(
  input: BuildMeetingBookingCreateDataInput,
): Promise<MeetingBooking> {
  return prisma.$transaction(
    async (tx) => {
      const overlappingMeeting = await tx.meetingBooking.findFirst({
        where: {
          status: { in: BUSY_MEETING_STATUSES },
          startsAt: { lt: input.endsAt },
          endsAt: { gt: input.startsAt },
        },
        select: { id: true },
      });

      if (overlappingMeeting) {
        throw new MeetingSlotUnavailableError();
      }

      return tx.meetingBooking.create({
        data: buildMeetingBookingCreateData(input),
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function getMeetingSlotAvailability({
  date,
  durationMinutes,
  timezone = 'Europe/Lisbon',
}: MeetingSlotAvailabilityInput): Promise<MeetingSlotAvailability> {
  const dayStart = zonedTimeToUtc(date, '00:00', timezone);
  const dayEnd = zonedTimeToUtc(addDays(date, 1), '00:00', timezone);
  const now = new Date();
  const existingMeetings = await prisma.meetingBooking.findMany({
    where: {
      status: { in: BUSY_MEETING_STATUSES },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
    select: {
      startsAt: true,
      endsAt: true,
    },
  });

  return {
    date,
    durationMinutes,
    timezone,
    slots: DEFAULT_ADMIN_MEETING_TIMES.map((time) => {
      const startsAt = zonedTimeToUtc(date, time, timezone);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
      const available =
        startsAt > now &&
        !existingMeetings.some((meeting) =>
          intervalsOverlap(startsAt, endsAt, meeting.startsAt, meeting.endsAt),
        );

      return {
        time,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        available,
      };
    }),
  };
}

function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

function addDays(date: string, days: number): string {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate.toISOString().slice(0, 10);
}