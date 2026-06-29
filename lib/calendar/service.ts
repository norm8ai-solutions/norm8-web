/**
 * ------------------------------------------------------------------
 * File: lib/calendar/service.ts
 * Description: Google Calendar event creation for Norm8 meeting bookings.
 * Responsibilities:
 * - Create Google Calendar events without attendees, avoiding DWD requirements.
 * - Store lead details in the event description for Norm8 visibility.
 * - Update MeetingBooking status with Google event metadata.
 * - Preserve lead submissions when Calendar fails.
 * ------------------------------------------------------------------
 */

import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getGoogleCalendarClient, getGoogleCalendarConfig } from './google';
import type { CalendarEventResult, CreateCalendarEventParams } from './types';

/**
 * Creates a Google Calendar event for a MeetingBooking.
 *
 * The event is created only in the Norm8 calendar. We intentionally do not send
 * attendees or sendUpdates because service accounts cannot invite attendees
 * without Domain-Wide Delegation. Customer confirmation is handled by Resend.
 *
 * Google Meet is intentionally left as a documented future extension: the slot
 * must be blocked reliably first, and conferencing should be added later through
 * a non-blocking patch/update flow.
 *
 * @param params Meeting booking and submission context.
 * @returns Result containing Google event metadata or failure details.
 */
export async function createMeetingCalendarEvent(
  params: CreateCalendarEventParams,
): Promise<CalendarEventResult> {
  try {
    const config = getGoogleCalendarConfig();
    const calendar = getGoogleCalendarClient();

    console.info('Creating Google Calendar event', {
      calendarId: config.calendarId,
      eventStart: params.booking.startsAt.toISOString(),
      eventEnd: params.booking.endsAt.toISOString(),
    });

    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: {
        summary: `Discovery Call — ${params.booking.attendeeCompany}`,
        description: buildEventDescription(params),
        start: {
          dateTime: params.booking.startsAt.toISOString(),
          timeZone: params.booking.timezone,
        },
        end: {
          dateTime: params.booking.endsAt.toISOString(),
          timeZone: params.booking.timezone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            {
              method: 'email',
              minutes: 24 * 60,
            },
            {
              method: 'popup',
              minutes: 60,
            },
          ],
        },
      },
    });

    const eventId = response.data.id;

    if (!eventId) {
      throw new Error('Google Calendar did not return an event id.');
    }

    console.info('Google Calendar event creation result', {
      googleEventCreated: true,
      googleEventId: eventId,
      calendarId: config.calendarId,
    });

    await prisma.meetingBooking.update({
      where: {
        id: params.booking.id,
      },
      data: {
        status: 'CONFIRMED',
        googleEventId: eventId,
        googleEventHtmlLink: response.data.htmlLink,
        calendarId: config.calendarId,
      },
    });

    return {
      success: true,
      eventId,
      htmlLink: response.data.htmlLink,
      calendarId: config.calendarId,
    };
  } catch (error) {
    console.error('Failed to create Google Calendar event', {
      googleEventCreated: false,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventStart: params.booking.startsAt.toISOString(),
      eventEnd: params.booking.endsAt.toISOString(),
      error: getCalendarErrorMessage(error),
    });

    await prisma.meetingBooking.update({
      where: {
        id: params.booking.id,
      },
      data: {
        status: 'FAILED',
      },
    });

    return {
      success: false,
      error:
        'Recebemos o seu pedido, mas não foi possível confirmar automaticamente a reunião. A equipa da Norm8 irá entrar em contacto.',
    };
  }
}

/**
 * Extracts a safe error message from Google Calendar failures.
 *
 * @param error Unknown provider error.
 * @returns Redacted error message for logs and diagnostics.
 */
function getCalendarErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown Google Calendar error.';
}

/**
 * Builds a calendar event description with lead and submission context.
 *
 * @param params Meeting booking and submission context.
 * @returns Plain-text description for Google Calendar.
 */
function buildEventDescription(params: CreateCalendarEventParams): string {
  return [
    'Origem: website Norm8',
    `Submission ID: ${params.submissionId}`,
    `Lead ID: ${params.leadId}`,
    '',
    `Nome: ${params.booking.attendeeName}`,
    `Empresa: ${params.booking.attendeeCompany}`,
    `Email: ${params.booking.attendeeEmail}`,
    `Telefone: ${params.phone || 'Não indicado'}`,
    `Objetivo: ${params.booking.meetingGoal || 'Não indicado'}`,
  ].join('\n');
}
