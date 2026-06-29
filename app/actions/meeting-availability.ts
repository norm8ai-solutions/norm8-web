/**
 * ------------------------------------------------------------------
 * File: app/actions/meeting-availability.ts
 * Description: Server actions for loading real Google Calendar availability.
 * Responsibilities:
 * - Expose available meeting slots to the public meeting form.
 * - Keep Google Calendar credentials and freebusy logic server-side.
 * - Return serializable loading/error data for client UI states.
 * ------------------------------------------------------------------
 */

'use server';

import { getAvailableMeetingSlots } from '@/lib/calendar/availability';
import type { AvailabilityRange, AvailabilityResult } from '@/lib/calendar/types';

/**
 * Loads available meeting slots from Google Calendar for a date range.
 *
 * @param range Inclusive date range in YYYY-MM-DD format.
 * @returns Available meeting days or a safe public error.
 */
export async function getAvailableMeetingSlotsAction(
  range: AvailabilityRange,
): Promise<AvailabilityResult> {
  return getAvailableMeetingSlots(range);
}
