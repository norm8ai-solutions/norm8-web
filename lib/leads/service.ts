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
  type LeadPriority,
  type MeetingBooking,
  type SubmissionType,
} from '@/app/generated/prisma/client';
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
      const lead = await tx.lead.upsert({
        where: {
          email: leadIdentity.email,
        },
        create: {
          name: leadIdentity.name,
          company: leadIdentity.company,
          email: leadIdentity.email,
          phone: leadIdentity.phone,
          website: leadIdentity.website,
          source: input.source,
          priority,
        },
        update: {
          name: leadIdentity.name,
          company: leadIdentity.company,
          phone: leadIdentity.phone,
          website: leadIdentity.website,
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

    await sendSubmissionEmails({
      lead: result.lead,
      submission: result.submission,
      meetingBooking,
      confirmationEmailLogId: result.confirmationEmailLogId,
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
          ? 'A sua reunião foi confirmada e adicionada ao calendário. Enviámos também o convite por email.'
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
        'Não foi possível registar o pedido neste momento. Tente novamente dentro de instantes.',
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
        title: 'Falha ao confirmar reunião automaticamente',
        message:
          'Foi recebido um pedido de reunião, mas o Google Calendar não confirmou o evento automaticamente.',
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
        notificationTitle: 'Novo pedido de automação personalizada',
        notificationMessage:
          'Foi recebido um novo pedido de automação personalizada.',
        emailSubject: 'Recebemos o seu pedido de automação Norm8',
        emailType: 'CUSTOM_AUTOMATION_CONFIRMATION',
      };
    case 'MEETING_REQUEST':
      return {
        activityMessage: 'Lead submitted a meeting request.',
        notificationTitle: 'Novo pedido de reunião',
        notificationMessage: 'Foi recebido um novo pedido de reunião.',
        emailSubject: 'Recebemos o seu pedido de reunião Norm8',
        emailType: 'MEETING_CONFIRMATION',
      };
  }
}
