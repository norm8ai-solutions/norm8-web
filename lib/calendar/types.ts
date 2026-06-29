/**
 * ------------------------------------------------------------------
 * File: lib/calendar/types.ts
 * Description: Shared TypeScript contracts for Norm8 calendar workflows.
 * Responsibilities:
 * - Define reusable Google Calendar configuration and booking types.
 * - Keep frontend availability responses serializable.
 * - Decouple meeting booking logic from specific React components.
 * ------------------------------------------------------------------
 */

import type { MeetingBooking } from '@/app/generated/prisma/client';

export type GoogleCalendarConfig = {
  clientEmail: string;
  privateKey: string;
  calendarId: string;
  addGoogleMeet: boolean;
  timezone: string;
  durationMinutes: number;
  workdayStart: string;
  workdayEnd: string;
};

export type BusyInterval = {
  start: Date;
  end: Date;
};

export type AvailableMeetingSlot = {
  date: string;
  time: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
};

export type AvailableMeetingDay = {
  date: string;
  available: boolean;
  slots: AvailableMeetingSlot[];
};

export type AvailabilityRange = {
  startDate: string;
  endDate: string;
};

export type AvailabilityResult =
  | {
      success: true;
      days: AvailableMeetingDay[];
    }
  | {
      success: false;
      error: string;
    };

export type CreateCalendarEventParams = {
  booking: MeetingBooking;
  leadId: string;
  submissionId: string;
  phone?: string | null;
};

export type CalendarEventResult =
  | {
      success: true;
      eventId: string;
      htmlLink?: string | null;
      calendarId: string;
    }
  | {
      success: false;
      error: string;
    };
