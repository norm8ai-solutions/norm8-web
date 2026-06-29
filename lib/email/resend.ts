/**
 * ------------------------------------------------------------------
 * File: lib/email/resend.ts
 * Description: Resend client factory for Norm8 transactional emails.
 * Responsibilities:
 * - Read the Resend API key from environment variables.
 * - Validate email configuration before attempting provider calls.
 * - Export a reusable Resend client accessor for server-side services.
 * ------------------------------------------------------------------
 */

import 'server-only';

import { Resend } from 'resend';

let resendClient: Resend | null = null;

/**
 * Error raised when the email provider is not configured correctly.
 */
export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailConfigurationError';
  }
}

/**
 * Returns a singleton Resend client for server-side email delivery.
 *
 * @returns Configured Resend client.
 * @throws EmailConfigurationError when RESEND_API_KEY is missing.
 */
export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new EmailConfigurationError('RESEND_API_KEY is not configured.');
  }

  resendClient ??= new Resend(apiKey);

  return resendClient;
}
