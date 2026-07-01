/**
 * ------------------------------------------------------------------
 * File: lib/leads/service.ts
 * Description: Central service for creating reusable Norm8 lead submissions.
 * Responsibilities:
 * - Validate payloads by submission type.
 * - Create or update the canonical Lead record by email.
 * - Persist the Submission, LeadActivity, Notification, and EmailLog together.
 * - Prepare extension points for AI analysis, email sending, calendar, and CRM sync.
 * ------------------------------------------------------------------
 */

import 'server-only';

import {
  Prisma,
  type AuditAnalysis,
  type Lead,
  type LeadPriority,
  type MeetingBooking,
  type SubmissionType,
} from '@/app/generated/prisma/client';
import { createAuditAnalysisForSubmission } from '@/lib/audit-analysis/service';
import { createMeetingCalendarEvent } from '@/lib/calendar/service';
import { sendSubmissionEmails } from '@/lib/email/service';
import { prisma } from '@/lib/db/prisma';
import {
  auditRequestSchema,
  customAutomationRequestSchema,
  meetingRequestSchema,
  type AuditRequestInput,
  type CustomAutomationRequestInput,
  type MeetingRequestInput,
} from './schemas';
import type {
  CreateLeadSubmissionInput,
  LeadSubmissionPayloadByType,
  LeadSubmissionResult,
  ValidationErrors,
} from './types';

const schemaBySubmissionType = {
  AUDIT_REQUEST: auditRequestSchema,
  CUSTOM_AUTOMATION_REQUEST: customAutomationRequestSchema,
  MEETING_REQUEST: meetingRequestSchema,
};

/**
 * Creates or updates a lead and registers a new submission.
 *
 * Responsibilities:
 * - Validate input according to submission type
 * - Find an existing lead by normalized email
 * - Create or update lead identity fields
 * - Create the submission and operational activity records
 * - Create an internal notification and a pending confirmation email log
 *
 * @param input Submission data selected by a server action.
 * @returns A consistent success/error result safe to return to client components.
 */
export async function createLeadSubmission<TType extends SubmissionType>(
  input: CreateLeadSubmissionInput<TType>,
): Promise<LeadSubmissionResult> {
  const parsedPayload = schemaBySubmissionType[input.type].safeParse(input.payload);

  if (!parsedPayload.success) {
    return {
      success: false,
      error: 'Verifique os campos assinalados e tente novamente.',
      validationErrors: parsedPayload.error.flatten().fieldErrors as ValidationErrors,
    };
  }

  const payload = parsedPayload.data as LeadSubmissionPayloadByType[TType];
  const leadIdentity = getLeadIdentity(input.type, payload);
  const priority = getLeadPriority(input.type, payload);
  const labels = getSubmissionLabels(input.type);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const leadMatch = buildLeadMatchFields(leadIdentity);
      const existingLead = await findMatchingLead(tx, leadIdentity, leadMatch);

      const lead = existingLead
        ? await tx.lead.update({
            where: {
              id: existingLead.id,
            },
            data: buildLeadUpdateData(
              existingLead,
              leadIdentity,
              leadMatch,
              input.source,
              priority,
            ),
          })
        : await tx.lead.create({
            data: {
              name: leadIdentity.name,
              company: leadIdentity.company,
              email: leadIdentity.email,
              phone: leadIdentity.phone,
              website: leadIdentity.website,
              normalizedCompany: leadMatch.normalizedCompany,
              normalizedWebsite: leadMatch.normalizedWebsite,
              normalizedEmail: leadMatch.normalizedEmail,
              source: input.source,
              priority,
            },
          });

      const submission = await tx.submission.create({
        data: {
          leadId: lead.id,
          type: input.type,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'SUBMISSION_CREATED',
          message: labels.activityMessage,
          metadata: {
            submissionId: submission.id,
            submissionType: input.type,
            source: input.source,
          },
        },
      });

      await tx.notification.create({
        data: {
          title: labels.notificationTitle,
          message: labels.notificationMessage,
          type: 'LEAD_SUBMISSION',
          relatedLeadId: lead.id,
          relatedSubmissionId: submission.id,
        },
      });

      const confirmationEmailLog = await tx.emailLog.create({
        data: {
          leadId: lead.id,
          submissionId: submission.id,
          to: lead.email,
          subject: labels.emailSubject,
          type: labels.emailType,
        },
      });

      const meetingBooking =
        input.type === 'MEETING_REQUEST'
          ? await tx.meetingBooking.create({
              data: buildMeetingBookingCreateData(
                lead.id,
                submission.id,
                payload as MeetingRequestInput,
              ),
            })
          : null;

      return {
        lead,
        submission,
        meetingBooking,
        confirmationEmailLogId: confirmationEmailLog.id,
        leadId: lead.id,
        submissionId: submission.id,
      };
    });

    const calendarResult = result.meetingBooking
      ? await createMeetingCalendarEvent({
          booking: result.meetingBooking,
          leadId: result.lead.id,
          submissionId: result.submission.id,
          phone: result.lead.phone,
        })
      : null;
    if (calendarResult && result.meetingBooking) {
      await registerMeetingCalendarOutcome(
        result.lead.id,
        result.submission.id,
        result.meetingBooking.id,
        calendarResult.success,
        calendarResult.success ? calendarResult.htmlLink : calendarResult.error,
      );
    }
    const meetingBooking = result.meetingBooking
      ? await getLatestMeetingBooking(result.meetingBooking.id)
      : undefined;

    let auditAnalysis: AuditAnalysis | null = null;

    if (result.submission.type === 'AUDIT_REQUEST') {
      try {
        auditAnalysis = await createAuditAnalysisForSubmission(result.submission);
      } catch (error) {
        console.error('Failed to create audit analysis after submission', error);
      }
    }

    await sendSubmissionEmails({
      lead: result.lead,
      submission: result.submission,
      meetingBooking,
      confirmationEmailLogId: result.confirmationEmailLogId,
      auditAnalysis,
    });

    return {
      success: true,
      leadId: result.leadId,
      submissionId: result.submissionId,
      meetingBookingStatus: meetingBooking?.status,
      googleEventId:
        calendarResult && calendarResult.success ? calendarResult.eventId : undefined,
      googleEventHtmlLink:
        calendarResult && calendarResult.success ? calendarResult.htmlLink : undefined,
      message:
        meetingBooking?.status === 'CONFIRMED'
          ? 'A sua reuniÃ£o foi confirmada e adicionada ao calendÃ¡rio. EnviÃ¡mos tambÃ©m o convite por email.'
          : calendarResult && !calendarResult.success
            ? calendarResult.error
            : undefined,
      warning:
        calendarResult && !calendarResult.success ? calendarResult.error : undefined,
    };
  } catch (error) {
    console.error('Failed to create lead submission', error);

    return {
      success: false,
      error:
        'NÃ£o foi possÃ­vel registar o pedido neste momento. Tente novamente dentro de instantes.',
    };
  }
}

/**
 * Builds the MeetingBooking database payload from validated meeting form data.
 *
 * @param leadId Lead identifier created or updated by the submission flow.
 * @param submissionId Submission identifier linked to the meeting request.
 * @param payload Validated meeting request payload.
 * @returns Prisma create input for MeetingBooking.
 */
function buildMeetingBookingCreateData(
  leadId: string,
  submissionId: string,
  payload: MeetingRequestInput,
): Prisma.MeetingBookingUncheckedCreateInput {
  return {
    leadId,
    submissionId,
    requestedDate: payload.selectedDate,
    requestedTime: payload.selectedTime,
    startsAt: new Date(payload.startsAt),
    endsAt: new Date(payload.endsAt),
    timezone: payload.timezone,
    attendeeEmail: payload.email,
    attendeeName: payload.name,
    attendeeCompany: payload.company,
    meetingGoal: payload.meetingGoal,
  };
}

/**
 * Loads the latest MeetingBooking after Google Calendar updates it.
 *
 * @param id MeetingBooking identifier.
 * @returns Updated booking or undefined if not found.
 */
async function getLatestMeetingBooking(id: string): Promise<MeetingBooking | undefined> {
  return (
    (await prisma.meetingBooking.findUnique({
      where: {
        id,
      },
    })) ?? undefined
  );
}

/**
 * Registers the Google Calendar result in lead activity and internal notifications.
 *
 * @param leadId Lead identifier.
 * @param submissionId Submission identifier.
 * @param meetingBookingId MeetingBooking identifier.
 * @param confirmed Whether Google Calendar confirmed the event.
 * @param detail Calendar link or failure reason.
 * @returns Promise that resolves after operational records are created.
 */
async function registerMeetingCalendarOutcome(
  leadId: string,
  submissionId: string,
  meetingBookingId: string,
  confirmed: boolean,
  detail?: string | null,
): Promise<void> {
  await prisma.leadActivity.create({
    data: {
      leadId,
      type: confirmed ? 'MEETING_BOOKING_CONFIRMED' : 'MEETING_BOOKING_FAILED',
      message: confirmed
        ? 'Meeting booking was confirmed in Google Calendar.'
        : 'Meeting booking could not be confirmed automatically in Google Calendar.',
      metadata: {
        submissionId,
        meetingBookingId,
        detail,
      },
    },
  });

  if (!confirmed) {
    await prisma.notification.create({
      data: {
        title: 'Falha ao confirmar reuniÃ£o automaticamente',
        message:
          'Foi recebido um pedido de reuniÃ£o, mas o Google Calendar nÃ£o confirmou o evento automaticamente.',
        type: 'MEETING_BOOKING_FAILED',
        relatedLeadId: leadId,
        relatedSubmissionId: submissionId,
      },
    });
  }
}

type LeadIdentity = {
  name?: string;
  company: string;
  email: string;
  phone?: string;
  website?: string;
};

type LeadMatchFields = {
  normalizedCompany: string;
  normalizedEmail: string;
  normalizedWebsite?: string;
};

/**
 * Builds a conservative Lead update without overwriting established opportunity data.
 *
 * Submission history lives in Submission.payload. The Lead record represents the
 * current company/opportunity, so repeated submissions fill empty contact fields
 * and refresh normalized matching fields without rewriting existing identity.
 *
 * @param lead Existing canonical Lead for the company/opportunity.
 * @param identity Identity fields from the new submission payload.
 * @param match Normalized matching fields derived from the submission payload.
 * @param source Source for the latest submission.
 * @param priority Priority calculated for the latest submission.
 * @returns Prisma update data for the canonical Lead.
 */
function buildLeadUpdateData(
  lead: Lead,
  identity: LeadIdentity,
  match: LeadMatchFields,
  source: string,
  priority: LeadPriority,
): Prisma.LeadUpdateInput {
  return {
    name: lead.name || identity.name,
    company: lead.company || identity.company,
    email: lead.email || identity.email,
    phone: lead.phone || identity.phone,
    website: lead.website || identity.website,
    normalizedCompany: match.normalizedCompany,
    normalizedWebsite: match.normalizedWebsite,
    normalizedEmail: match.normalizedEmail,
    source,
    priority,
  };
}

/**
 * Finds an existing Lead using the company-first B2B matching rule.
 *
 * Matching priority:
 * 1. normalized website, when available
 * 2. normalized company + normalized email
 * 3. normalized company
 *
 * Raw company/email/website fallbacks keep older rows matchable before every
 * historical Lead has been backfilled with normalized fields.
 *
 * @param tx Prisma transaction client.
 * @param identity Submission identity fields.
 * @param match Normalized fields for matching.
 * @returns Existing Lead or null.
 */
async function findMatchingLead(
  tx: Prisma.TransactionClient,
  identity: LeadIdentity,
  match: LeadMatchFields,
): Promise<Lead | null> {
  if (match.normalizedWebsite) {
    const byWebsite = await tx.lead.findFirst({
      where: {
        OR: [
          { normalizedWebsite: match.normalizedWebsite },
          ...(identity.website ? [{ website: identity.website }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (byWebsite) {
      return byWebsite;
    }

    const byLegacyWebsite = await findLegacyWebsiteMatch(tx, match.normalizedWebsite);

    if (byLegacyWebsite) {
      return byLegacyWebsite;
    }
  }

  const byCompanyAndEmail = await tx.lead.findFirst({
    where: {
      OR: [
        {
          normalizedCompany: match.normalizedCompany,
          normalizedEmail: match.normalizedEmail,
        },
        {
          company: identity.company,
          email: identity.email,
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (byCompanyAndEmail) {
    return byCompanyAndEmail;
  }

  const byLegacyCompanyAndEmail = await findLegacyCompanyAndEmailMatch(tx, match);

  if (byLegacyCompanyAndEmail) {
    return byLegacyCompanyAndEmail;
  }

  const byCompany = await tx.lead.findFirst({
    where: {
      OR: [
        { normalizedCompany: match.normalizedCompany },
        { company: identity.company },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  return byCompany ?? findLegacyCompanyMatch(tx, match.normalizedCompany);
}

/**
 * Finds older Leads whose normalizedWebsite column has not been backfilled yet.
 *
 * @param tx Prisma transaction client.
 * @param normalizedWebsite Website key to match.
 * @returns Existing Lead or null.
 */
async function findLegacyWebsiteMatch(
  tx: Prisma.TransactionClient,
  normalizedWebsite: string,
): Promise<Lead | null> {
  const leads = await tx.lead.findMany({
    where: { website: { not: null } },
    orderBy: { createdAt: 'asc' },
  });

  return (
    leads.find((lead) => normalizeWebsite(lead.website ?? undefined) === normalizedWebsite) ??
    null
  );
}

/**
 * Finds older Leads by normalized company and email before normalized columns exist.
 *
 * @param tx Prisma transaction client.
 * @param match Normalized fields for matching.
 * @returns Existing Lead or null.
 */
async function findLegacyCompanyAndEmailMatch(
  tx: Prisma.TransactionClient,
  match: LeadMatchFields,
): Promise<Lead | null> {
  const leads = await tx.lead.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return (
    leads.find(
      (lead) =>
        normalizeCompanyName(lead.company) === match.normalizedCompany &&
        normalizeEmail(lead.email) === match.normalizedEmail,
    ) ?? null
  );
}

/**
 * Finds older Leads by normalized company before normalized columns exist.
 *
 * @param tx Prisma transaction client.
 * @param normalizedCompany Company key to match.
 * @returns Existing Lead or null.
 */
async function findLegacyCompanyMatch(
  tx: Prisma.TransactionClient,
  normalizedCompany: string,
): Promise<Lead | null> {
  const leads = await tx.lead.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return (
    leads.find((lead) => normalizeCompanyName(lead.company) === normalizedCompany) ??
    null
  );
}

/**
 * Builds normalized matching fields from submission identity data.
 *
 * @param identity Identity fields from the submitted form.
 * @returns Normalized values used only for Lead matching.
 */
function buildLeadMatchFields(identity: LeadIdentity): LeadMatchFields {
  return {
    normalizedCompany: normalizeCompanyName(identity.company),
    normalizedEmail: normalizeEmail(identity.email),
    normalizedWebsite: normalizeWebsite(identity.website),
  };
}

/**
 * Normalizes an email for Lead matching.
 *
 * @param email Raw submitted email.
 * @returns Lowercase trimmed email.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalizes company names for approximate B2B opportunity matching.
 *
 * @param company Raw submitted company name.
 * @returns Lowercase, accent-free and punctuation-light company key.
 */
function normalizeCompanyName(company: string): string {
  return company
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes websites to a comparable hostname.
 *
 * @param website Optional raw website from the form.
 * @returns Lowercase hostname without protocol or www prefix.
 */
function normalizeWebsite(website?: string): string | undefined {
  if (!website) {
    return undefined;
  }

  const trimmed = website.trim().toLowerCase();

  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);

    return url.hostname.replace(/^www\./, '') || undefined;
  } catch {
    return trimmed
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      ?.trim() || undefined;
  }
}

/**
 * Extracts the canonical lead fields from each submission payload.
 *
 * @param type Submission type being processed.
 * @param payload Validated payload for that type.
 * @returns Lead identity fields used for upsert.
 */
function getLeadIdentity<TType extends SubmissionType>(
  type: TType,
  payload: LeadSubmissionPayloadByType[TType],
): LeadIdentity {
  switch (type) {
    case 'AUDIT_REQUEST': {
      const auditPayload = payload as AuditRequestInput;

      return {
        name: auditPayload.name,
        company: auditPayload.company,
        email: auditPayload.email,
        phone: auditPayload.phone,
        website: auditPayload.website,
      };
    }
    case 'CUSTOM_AUTOMATION_REQUEST': {
      const automationPayload = payload as CustomAutomationRequestInput;

      return {
        name: automationPayload.name,
        company: automationPayload.company,
        email: automationPayload.email,
        phone: automationPayload.phone,
        website: automationPayload.website,
      };
    }
    case 'MEETING_REQUEST': {
      const meetingPayload = payload as MeetingRequestInput;

      return {
        name: meetingPayload.name,
        company: meetingPayload.company,
        email: meetingPayload.email,
        phone: meetingPayload.phone,
      };
    }
  }
}

/**
 * Applies lightweight triage rules while keeping the full scoring pipeline open
 * for future AI analysis and sales automation.
 *
 * @param type Submission type being processed.
 * @param payload Validated payload for that type.
 * @returns Initial lead priority.
 */
function getLeadPriority<TType extends SubmissionType>(
  type: TType,
  payload: LeadSubmissionPayloadByType[TType],
): LeadPriority {
  if (type === 'CUSTOM_AUTOMATION_REQUEST') {
    const automationPayload = payload as CustomAutomationRequestInput;

    return automationPayload.estimatedBudget ? 'HIGH' : 'MEDIUM';
  }

  if (type === 'AUDIT_REQUEST') {
    const auditPayload = payload as AuditRequestInput;

    return auditPayload.employees === '500+' ? 'HIGH' : 'MEDIUM';
  }

  return 'MEDIUM';
}

type SubmissionLabels = {
  activityMessage: string;
  notificationTitle: string;
  notificationMessage: string;
  emailSubject: string;
  emailType: string;
};

/**
 * Maps submission types to human-readable internal messages and prepared email metadata.
 *
 * @param type Submission type being processed.
 * @returns Labels used across activity, notification, and email log records.
 */
function getSubmissionLabels(type: SubmissionType): SubmissionLabels {
  switch (type) {
    case 'AUDIT_REQUEST':
      return {
        activityMessage: 'Lead submitted an intelligent audit request.',
        notificationTitle: 'Nova auditoria inteligente',
        notificationMessage: 'Foi recebido um novo pedido de auditoria inteligente.',
        emailSubject: 'Recebemos o seu pedido de auditoria Norm8',
        emailType: 'AUDIT_CONFIRMATION',
      };
    case 'CUSTOM_AUTOMATION_REQUEST':
      return {
        activityMessage: 'Lead submitted a custom automation request.',
        notificationTitle: 'Novo pedido de automaÃ§Ã£o personalizada',
        notificationMessage:
          'Foi recebido um novo pedido de automaÃ§Ã£o personalizada.',
        emailSubject: 'Recebemos o seu pedido de automaÃ§Ã£o Norm8',
        emailType: 'CUSTOM_AUTOMATION_CONFIRMATION',
      };
    case 'MEETING_REQUEST':
      return {
        activityMessage: 'Lead submitted a meeting request.',
        notificationTitle: 'Novo pedido de reuniÃ£o',
        notificationMessage: 'Foi recebido um novo pedido de reuniÃ£o.',
        emailSubject: 'Recebemos o seu pedido de reuniÃ£o Norm8',
        emailType: 'MEETING_CONFIRMATION',
      };
  }
}



