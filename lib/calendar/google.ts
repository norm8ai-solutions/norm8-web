/**
 * ------------------------------------------------------------------
 * File: lib/calendar/google.ts
 * Description: Google Calendar client initialization for Norm8 scheduling.
 * Responsibilities:
 * - Read and validate Google Calendar environment variables.
 * - Support escaped service account private keys from hosting providers.
 * - Expose an authenticated Google Calendar client for server services.
 * ------------------------------------------------------------------
 */

import 'server-only';

import { google, type calendar_v3 } from 'googleapis';
import type { GoogleCalendarConfig } from './types';

let calendarClient: calendar_v3.Calendar | null = null;

/**
 * Error raised when Google Calendar integration is not configured.
 */
export class GoogleCalendarConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleCalendarConfigurationError';
  }
}

/**
 * Reads and validates Google Calendar integration settings.
 *
 * @returns Normalized calendar configuration.
 * @throws GoogleCalendarConfigurationError when required values are missing.
 */
export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const safeConfigState = {
    hasClientEmail: Boolean(clientEmail),
    hasPrivateKey: Boolean(privateKey),
    hasCalendarId: Boolean(calendarId),
    calendarId,
  };

  if (!clientEmail || !privateKey || !calendarId) {
    console.error('Google Calendar configuration missing', safeConfigState);
    throw new GoogleCalendarConfigurationError(
      'Google Calendar service account configuration is incomplete.',
    );
  }

  console.info('Google Calendar configuration loaded', safeConfigState);

  return {
    clientEmail,
    privateKey,
    calendarId,
    addGoogleMeet: process.env.GOOGLE_CALENDAR_ADD_MEET === 'true',
    timezone: process.env.MEETING_TIMEZONE || 'Europe/Lisbon',
    durationMinutes: Number(process.env.MEETING_DURATION_MINUTES || 30),
    workdayStart: process.env.MEETING_WORKDAY_START || '09:00',
    workdayEnd: process.env.MEETING_WORKDAY_END || '17:30',
  };
}

/**
 * Returns an authenticated Google Calendar client using a service account.
 *
 * @returns Google Calendar API client.
 */
export function getGoogleCalendarClient(): calendar_v3.Calendar {
  if (calendarClient) {
    return calendarClient;
  }

  const config = getGoogleCalendarConfig();
  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  calendarClient = google.calendar({
    version: 'v3',
    auth,
  });

  return calendarClient;
}
