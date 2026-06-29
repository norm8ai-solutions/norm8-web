/**
 * ------------------------------------------------------------------
 * File: lib/calendar/availability.ts
 * Description: Availability calculation for Norm8 meeting scheduling.
 * Responsibilities:
 * - Query Google Calendar busy intervals through freebusy.
 * - Generate working-hours slots for the configured timezone and duration.
 * - Exclude weekends, past slots, and slots overlapping existing events.
 * ------------------------------------------------------------------
 */

import 'server-only';

import { getGoogleCalendarClient, getGoogleCalendarConfig } from './google';
import type {
  AvailabilityRange,
  AvailabilityResult,
  AvailableMeetingDay,
  AvailableMeetingSlot,
  BusyInterval,
  GoogleCalendarConfig,
} from './types';

/**
 * Gets available meeting slots from Google Calendar for a date range.
 *
 * @param range Inclusive start and end dates in YYYY-MM-DD format.
 * @returns Serializable availability result for the frontend.
 */
export async function getAvailableMeetingSlots(
  range: AvailabilityRange,
): Promise<AvailabilityResult> {
  try {
    const config = getGoogleCalendarConfig();
    const busyIntervals = await getBusyIntervals(range, config);
    const days = buildAvailabilityDays(range, config, busyIntervals);

    return {
      success: true,
      days,
    };
  } catch (error) {
    console.error('Failed to load Google Calendar availability', error);

    return {
      success: false,
      error:
        'Não foi possível carregar horários disponíveis. Tente novamente dentro de instantes.',
    };
  }
}

/**
 * Fetches busy intervals from Google Calendar freebusy.
 *
 * @param range Inclusive date range.
 * @param config Calendar configuration.
 * @returns Busy intervals as Date objects.
 */
async function getBusyIntervals(
  range: AvailabilityRange,
  config: GoogleCalendarConfig,
): Promise<BusyInterval[]> {
  const calendar = getGoogleCalendarClient();
  const timeMin = zonedTimeToUtc(range.startDate, '00:00', config.timezone);
  const timeMax = zonedTimeToUtc(range.endDate, '23:59', config.timezone);
  console.info('Loading Google Calendar freebusy', {
    calendarId: config.calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    timezone: config.timezone,
  });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: config.timezone,
      items: [
        {
          id: config.calendarId,
        },
      ],
    },
  });

  const busyIntervals = (
    response.data.calendars?.[config.calendarId]?.busy?.map((interval) => ({
      start: new Date(interval.start ?? ''),
      end: new Date(interval.end ?? ''),
    })) ?? []
  ).filter((interval) => !Number.isNaN(interval.start.getTime()) && !Number.isNaN(interval.end.getTime()));

  console.info('Google Calendar freebusy loaded', {
    calendarId: config.calendarId,
    busyCount: busyIntervals.length,
  });

  return busyIntervals;
}

/**
 * Builds available day objects by subtracting busy intervals from workday slots.
 *
 * @param range Inclusive date range.
 * @param config Calendar configuration.
 * @param busyIntervals Busy intervals returned by Google.
 * @returns Availability grouped by day.
 */
function buildAvailabilityDays(
  range: AvailabilityRange,
  config: GoogleCalendarConfig,
  busyIntervals: BusyInterval[],
): AvailableMeetingDay[] {
  const dates = enumerateDates(range.startDate, range.endDate);

  return dates.map((date) => {
    const slots = isWeekend(date)
      ? []
      : buildDaySlots(date, config, busyIntervals);

    return {
      date,
      available: slots.length > 0,
      slots,
    };
  });
}

/**
 * Generates all valid meeting slots for one working day.
 *
 * Slots are calculated in the configured timezone, converted to UTC ISO values
 * for reliable storage, and filtered against Google busy intervals.
 *
 * @param date Date in YYYY-MM-DD format.
 * @param config Calendar configuration.
 * @param busyIntervals Busy intervals returned by Google.
 * @returns Available slots for the day.
 */
function buildDaySlots(
  date: string,
  config: GoogleCalendarConfig,
  busyIntervals: BusyInterval[],
): AvailableMeetingSlot[] {
  const slots: AvailableMeetingSlot[] = [];
  const now = new Date();
  let cursorMinutes = timeToMinutes(config.workdayStart);
  const endMinutes = timeToMinutes(config.workdayEnd);

  while (cursorMinutes + config.durationMinutes <= endMinutes) {
    const time = minutesToTime(cursorMinutes);
    const startsAt = zonedTimeToUtc(date, time, config.timezone);
    const endsAt = new Date(startsAt.getTime() + config.durationMinutes * 60_000);

    if (
      startsAt > now &&
      !busyIntervals.some((busy) => intervalsOverlap(startsAt, endsAt, busy.start, busy.end))
    ) {
      slots.push({
        date,
        time,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timezone: config.timezone,
      });
    }

    cursorMinutes += config.durationMinutes;
  }

  return slots;
}

/**
 * Converts a date/time in an IANA timezone into a UTC Date.
 *
 * The project avoids adding another date library here. This helper uses
 * Intl.DateTimeFormat to calculate the timezone offset, including daylight
 * saving changes for Europe/Lisbon.
 *
 * @param date Date in YYYY-MM-DD format.
 * @param time Time in HH:mm format.
 * @param timezone IANA timezone.
 * @returns UTC Date representing the local zoned time.
 */
export function zonedTimeToUtc(date: string, time: string, timezone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const targetUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const guess = new Date(targetUtcMs);
  const parts = getZonedDateParts(guess, timezone);
  const representedUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );

  return new Date(guess.getTime() + (targetUtcMs - representedUtcMs));
}

/**
 * Enumerates ISO date strings inclusively.
 *
 * @param startDate Start date in YYYY-MM-DD format.
 * @param endDate End date in YYYY-MM-DD format.
 * @returns Date strings between both dates.
 */
function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Checks whether a date string represents a weekend.
 *
 * @param date Date in YYYY-MM-DD format.
 * @returns True for Saturday or Sunday.
 */
function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();

  return day === 0 || day === 6;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

function getZonedDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  };
}
