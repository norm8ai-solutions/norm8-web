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

export type ResendEmailProviderConfigStatus = {
  configured: boolean;
  provider: 'resend';
  missing: string[];
  from?: string;
  fromEmail?: string;
  fromDomain?: string;
  replyTo?: string;
};

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

export function getEmailProviderConfigStatus(): ResendEmailProviderConfigStatus {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? process.env.NORM8_EMAIL_FROM;
  const replyTo = process.env.NORM8_REPLY_TO ?? process.env.RESEND_REPLY_TO ?? process.env.INTERNAL_NOTIFICATION_EMAIL;
  const fromEmail = extractEmailAddress(from ?? '');
  const missing: string[] = [];

  if (!apiKey) {
    missing.push('RESEND_API_KEY');
  }

  if (!from) {
    missing.push('EMAIL_FROM');
  } else if (!fromEmail || !isValidEmailAddress(fromEmail)) {
    missing.push('VALID_EMAIL_FROM');
  }

  if (replyTo && !isValidEmailAddress(extractEmailAddress(replyTo) ?? replyTo)) {
    missing.push('VALID_REPLY_TO');
  }

  return {
    configured: missing.length === 0,
    provider: 'resend',
    missing,
    from,
    fromEmail: fromEmail ?? undefined,
    fromDomain: fromEmail?.split('@')[1],
    replyTo,
  };
}

function extractEmailAddress(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/<([^>]+)>/);
  return (match?.[1] ?? trimmed).trim();
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
