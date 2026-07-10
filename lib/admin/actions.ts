/**
 * ------------------------------------------------------------------
 * File: lib/admin/actions.ts
 * Description: Server actions for mutating admin-managed lead data.
 * Responsibilities:
 * - Update lead status and priority.
 * - Add internal lead notes as LeadActivity records.
 * - Mark notifications as read.
 * - Keep mutations small and auditable.
 * ------------------------------------------------------------------
 */

'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { LeadActionStatus, LeadActionType, LeadPriority, LeadStatus } from '@/app/generated/prisma/client';
import { createAuditAnalysisForSubmission } from '@/lib/audit-analysis/service';
import { createMeetingCalendarEvent } from '@/lib/calendar/service';
import { prisma } from '@/lib/db/prisma';
import { sendInternalScheduledMeetingEmails } from '@/lib/email/service';
import { getMeetingSubmissionSummary } from '@/lib/meetings/objectives';
import {
  MeetingSlotUnavailableError,
  createMeetingBooking,
  getMeetingSlotAvailability,
  type MeetingSlotAvailability,
} from '@/lib/meetings/service';

const ADMIN_COOKIE_NAME = 'norm8_admin_access';
/**
 * Loads local MeetingBooking availability for the admin meeting execution modal.
 *
 * @param input Selected date, duration and timezone.
 * @returns Available and occupied slots for that day.
 */
export async function loadAdminMeetingSlotAvailability(input: {
  date: string;
  durationMinutes: number;
  timezone?: string;
}): Promise<MeetingSlotAvailability> {
  return getMeetingSlotAvailability(input);
}

/**
 * Validates the temporary admin access key and stores an httpOnly cookie.
 *
 * @param formData Login form data.
 * @returns Redirects to admin overview on success.
 */
export async function loginAdmin(formData: FormData): Promise<void> {
  const key = String(formData.get('key') ?? '');
  const expectedKey = process.env.ADMIN_ACCESS_KEY;

  if (!expectedKey || key !== expectedKey) {
    redirect('/admin/login?error=1');
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, key, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
  });

  redirect('/admin');
}

/**
 * Updates lead status from the admin detail page.
 *
 * @param formData Status form data.
 * @returns Revalidates the lead detail page.
 */
export async function updateLeadStatus(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId'));
  const status = String(formData.get('status')) as LeadStatus;

  await prisma.lead.update({
    where: { id: leadId },
    data: { status },
  });

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/leads');
}

/**
 * Updates lead priority from the admin detail page.
 *
 * @param formData Priority form data.
 * @returns Revalidates the lead detail page.
 */
export async function updateLeadPriority(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId'));
  const priority = String(formData.get('priority')) as LeadPriority;

  await prisma.lead.update({
    where: { id: leadId },
    data: { priority },
  });

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/leads');
}

/**
 * Adds an internal note to a lead timeline.
 *
 * @param formData Note form data.
 * @returns Revalidates the lead detail page.
 */
export async function addLeadNote(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId'));
  const message = String(formData.get('message') ?? '').trim();

  if (!message) {
    return;
  }

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: 'NOTE',
      message,
      metadata: {},
    },
  });

  revalidatePath(`/admin/leads/${leadId}`);
}

/**
 * Marks a notification as read.
 *
 * @param formData Notification form data.
 * @returns Revalidates admin notification views.
 */
export async function markNotificationAsRead(formData: FormData): Promise<void> {
  const notificationId = String(formData.get('notificationId'));

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'READ',
      readAt: new Date(),
    },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/notifications');
}

/**
 * Regenerates the AI audit analysis for an audit submission.
 *
 * @param formData Form data containing the submission id.
 * @returns Revalidates the submission detail page.
 */
export async function regenerateAuditAnalysis(formData: FormData): Promise<void> {
  const submissionId = String(formData.get('submissionId') ?? '');

  if (!submissionId) {
    return;
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || submission.type !== 'AUDIT_REQUEST') {
    return;
  }

  await createAuditAnalysisForSubmission(submission);

  revalidatePath(`/admin/submissions/${submissionId}`);
  revalidatePath('/admin/submissions');
  revalidatePath(`/admin/leads/${submission.leadId}`);
}

/**
 * Creates a commercial next action for a lead.
 *
 * @param formData Action form data.
 * @returns Revalidates the lead detail and overview pages.
 */
export async function createLeadAction(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const type = String(formData.get('type') ?? 'FOLLOW_UP') as LeadActionType;
  const dueAt = parseOptionalDateTime(String(formData.get('dueAt') ?? ''));

  if (!leadId) {
    return;
  }

  if (!title) {
    redirect(`/admin/leads/${leadId}?actionError=title`);
  }

  if (dueAt === 'INVALID' || !dueAt) {
    redirect(`/admin/leads/${leadId}?actionError=dueAt`);
  }

  const now = new Date();

  if (dueAt < now) {
    redirect(`/admin/leads/${leadId}?actionError=dueAtPast`);
  }

  const status: LeadActionStatus = 'PENDING';

  const action = await prisma.leadAction.create({
    data: {
      leadId,
      type,
      title,
      description: description || null,
      dueAt,
      status,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: 'ACTION_CREATED',
      message: `Pr\u00f3xima a\u00e7\u00e3o criada: ${action.title}`,
      metadata: {
        actionId: action.id,
        actionType: action.type,
        dueAt: action.dueAt?.toISOString() ?? null,
      },
    },
  });


  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
}

/**
 * Updates a commercial action status.
 *
 * @param formData Action status form data.
 * @returns Revalidates the lead detail and overview pages.
 */
export async function updateLeadActionStatus(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId') ?? '');
  const actionId = String(formData.get('actionId') ?? '');
  const status = String(formData.get('status') ?? 'PENDING') as LeadActionStatus;

  if (!leadId || !actionId) {
    return;
  }

  const action = await prisma.leadAction.update({
    where: { id: actionId },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: status === 'COMPLETED' ? 'ACTION_COMPLETED' : 'ACTION_UPDATED',
      message:
        status === 'COMPLETED'
          ? `A\u00e7\u00e3o conclu\u00edda: ${action.title}`
          : `Estado da a\u00e7\u00e3o atualizado: ${action.title}`,
      metadata: {
        actionId: action.id,
        status: action.status,
      },
    },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
}

/**
 * Marks a commercial action as completed.
 *
 * @param formData Action form data.
 * @returns Revalidates the lead detail and overview pages.
 */
export async function completeLeadAction(formData: FormData): Promise<void> {
  formData.set('status', 'COMPLETED');
  await updateLeadActionStatus(formData);
}

/**
 * Deletes a commercial action.
 *
 * @param formData Action form data.
 * @returns Revalidates the lead detail and overview pages.
 */
export async function deleteLeadAction(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId') ?? '');
  const actionId = String(formData.get('actionId') ?? '');

  if (!leadId || !actionId) {
    return;
  }

  const action = await prisma.leadAction.delete({
    where: { id: actionId },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: 'ACTION_UPDATED',
      message: `A\u00e7\u00e3o removida: ${action.title}`,
      metadata: {
        actionId: action.id,
        status: 'DELETED',
      },
    },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
}

/**
 * Creates a meeting from a commercial action and completes the action.
 *
 * @param formData Meeting execution form data.
 * @returns Revalidates lead, overview and meetings pages.
 */
export async function scheduleLeadActionMeeting(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId') ?? '');
  const actionId = String(formData.get('actionId') ?? '');
  const startsAtValue = String(formData.get('startsAt') ?? '').trim();
  const durationMinutes = parsePositiveInteger(String(formData.get('durationMinutes') ?? '45'));
  const title = String(formData.get('title') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  const timezone = String(formData.get('timezone') ?? 'Europe/Lisbon').trim() || 'Europe/Lisbon';
  const startsAt = parseOptionalDateTime(startsAtValue);

  if (!leadId || !actionId) {
    return;
  }

  if (startsAt === 'INVALID' || !startsAt || !durationMinutes) {
    redirect(`/admin/leads/${leadId}?actionExecutionError=meeting`);
  }

  const action = await prisma.leadAction.findFirst({
    where: { id: actionId, leadId },
    include: {
      lead: {
        include: {
          submissions: {
            include: {
              meetingBooking: true,
              auditAnalysis: {
                select: {
                  internalSummary: true,
                  companySummary: true,
                  nextStep: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!action) {
    return;
  }

  if (!title) {
    redirect(`/admin/leads/${leadId}?actionExecutionError=meeting`);
  }

  const availableSubmission = action.lead.submissions.find(
    (submission) => !submission.meetingBooking,
  );

  const email = action.lead.email.trim();

  if (!email) {
    redirect(`/admin/leads/${leadId}?actionExecutionError=meetingEmail`);
  }

  const attendeeCompany = action.lead.company.trim() || 'Empresa não indicada';
  const attendeeName = action.lead.name?.trim() || 'Contacto não indicado';
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  let meeting;

  try {
    console.info('Scheduling internal lead meeting', {
      leadId,
      actionId,
      eventStart: startsAt.toISOString(),
      eventEnd: endsAt.toISOString(),
    });

    meeting = await createMeetingBooking({
      leadId,
      submissionId: availableSubmission?.id ?? null,
      status: 'REQUESTED',
      requestedDate: formatDateInputValue(startsAt),
      requestedTime: formatTimeInputValue(startsAt),
      startsAt,
      endsAt,
      timezone: timezone || 'Europe/Lisbon',
      attendeeEmail: email,
      attendeeName,
      attendeeCompany,
      meetingGoal: notes || title || action.description || action.title,
    });

    const calendarResult = await createMeetingCalendarEvent({
      booking: meeting,
      leadId,
      submissionId: availableSubmission?.id ?? null,
      phone: action.lead.phone,
      source: 'Área Interna / Próxima Ação',
      title,
    });

    if (!calendarResult.success) {
      await prisma.meetingBooking.delete({ where: { id: meeting.id } });
      redirect(
        `/admin/leads/${leadId}?actionExecutionError=${
          calendarResult.code === 'SLOT_UNAVAILABLE' ? 'meetingSlot' : 'meetingCalendar'
        }`,
      );
    }

    meeting = await prisma.meetingBooking.findUniqueOrThrow({
      where: { id: meeting.id },
    });
  } catch (error) {
    if (error instanceof MeetingSlotUnavailableError) {
      redirect(`/admin/leads/${leadId}?actionExecutionError=meetingSlot`);
    }

    throw error;
  }

  await prisma.$transaction([
    prisma.leadAction.update({
      where: { id: actionId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    }),
    prisma.leadActivity.create({
      data: {
        leadId,
        type: 'MEETING_SCHEDULED',
        message: `Reunião agendada: ${title || action.title}`,
        metadata: {
          actionId,
          meetingBookingId: meeting.id,
          googleEventId: meeting.googleEventId,
          googleEventHtmlLink: meeting.googleEventHtmlLink,
          calendarId: meeting.calendarId,
          title,
          durationMinutes,
          submissionId: availableSubmission?.id ?? null,
          linkedToSubmission: Boolean(availableSubmission),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        },
      },
    }),
  ]);

  console.info('Internal lead meeting scheduled successfully', {
    leadId,
    actionId,
    meetingBookingId: meeting.id,
    googleEventCreated: Boolean(meeting.googleEventId),
    googleEventId: meeting.googleEventId,
  });

  const emailResult = await sendInternalScheduledMeetingEmails({
    lead: action.lead,
    meetingBooking: meeting,
    submissionId: availableSubmission?.id ?? null,
    actionId,
    title,
    meetingDescription: notes,
    leadActionDescription: action.description,
    submissionSummary:
      availableSubmission?.auditAnalysis?.internalSummary ??
      availableSubmission?.auditAnalysis?.companySummary ??
      availableSubmission?.auditAnalysis?.nextStep ??
      getMeetingSubmissionSummary(availableSubmission?.payload),
  });

  if (!emailResult.allSent) {
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'MEETING_EMAIL_FAILED',
        message: 'Reunião criada, mas um ou mais emails de confirmação falharam.',
        metadata: { actionId, meetingBookingId: meeting.id },
      },
    });
  }

  revalidateLeadActionExecutionPaths(leadId);
  revalidatePath('/admin/meetings');

  if (!emailResult.allSent) {
    redirect(`/admin/leads/${leadId}?actionExecutionError=meetingEmailWarning`);
  }
}

/**
 * Stores an editable commercial email draft as an internal EmailLog.
 *
 * @param formData Email execution form data.
 * @returns Revalidates lead, overview and email pages.
 */
export async function prepareLeadActionEmail(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId') ?? '');
  const actionId = String(formData.get('actionId') ?? '');
  const to = String(formData.get('to') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!leadId || !actionId) {
    return;
  }

  if (!to || !subject || !body) {
    redirect(`/admin/leads/${leadId}?actionExecutionError=email`);
  }

  const action = await prisma.leadAction.findFirst({
    where: { id: actionId, leadId },
  });

  if (!action) {
    return;
  }

  const emailLog = await prisma.emailLog.create({
    data: {
      leadId,
      to,
      subject,
      type: 'COMMERCIAL_DRAFT',
      status: 'PENDING',
      metadata: {
        actionId,
        body,
        mode: 'draft',
      },
    },
  });

  await prisma.leadAction.update({
    where: { id: actionId },
    data: {
      status: 'IN_PROGRESS',
      completedAt: null,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: 'EMAIL_DRAFT_CREATED',
      message: `Email preparado: ${subject}`,
      metadata: {
        actionId,
        emailLogId: emailLog.id,
      },
    },
  });

  revalidateLeadActionExecutionPaths(leadId);
  revalidatePath('/admin/emails');
}

/**
 * Registers a future proposal workflow without pretending a proposal was generated.
 *
 * @param formData Proposal placeholder form data.
 * @returns Revalidates lead and overview pages.
 */
export async function registerLeadActionProposalIntent(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId') ?? '');
  const actionId = String(formData.get('actionId') ?? '');
  const notes = String(formData.get('notes') ?? '').trim();

  if (!leadId || !actionId) {
    return;
  }

  const action = await prisma.leadAction.update({
    where: { id: actionId },
    data: {
      status: 'IN_PROGRESS',
      completedAt: null,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: 'PROPOSAL_INTENT_CREATED',
      message: `Intenção de proposta registada: ${action.title}`,
      metadata: {
        actionId,
        notes: notes || null,
      },
    },
  });

  revalidateLeadActionExecutionPaths(leadId);
}

/**
 * Registers a phone call execution and completes the action.
 *
 * @param formData Call registration form data.
 * @returns Revalidates lead and overview pages.
 */
export async function registerLeadActionCall(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId') ?? '');
  const actionId = String(formData.get('actionId') ?? '');
  const notes = String(formData.get('notes') ?? '').trim();
  const result = String(formData.get('result') ?? '').trim();
  const occurredAt = parseOptionalDateTime(String(formData.get('occurredAt') ?? ''));

  if (!leadId || !actionId) {
    return;
  }

  if (occurredAt === 'INVALID') {
    redirect(`/admin/leads/${leadId}?actionExecutionError=call`);
  }

  const action = await prisma.leadAction.update({
    where: { id: actionId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: 'CALL_LOGGED',
      message: `Chamada registada: ${action.title}`,
      metadata: {
        actionId,
        result: result || null,
        notes: notes || null,
        occurredAt: occurredAt?.toISOString() ?? new Date().toISOString(),
      },
    },
  });

  revalidateLeadActionExecutionPaths(leadId);
}

/**
 * Registers a generic execution note and completes the action.
 *
 * @param formData Generic execution form data.
 * @returns Revalidates lead and overview pages.
 */
export async function registerLeadActionGenericExecution(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId') ?? '');
  const actionId = String(formData.get('actionId') ?? '');
  const notes = String(formData.get('notes') ?? '').trim();

  if (!leadId || !actionId) {
    return;
  }

  const action = await prisma.leadAction.update({
    where: { id: actionId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: 'ACTION_EXECUTION_REGISTERED',
      message: `Execução registada: ${action.title}`,
      metadata: {
        actionId,
        actionType: action.type,
        notes: notes || null,
      },
    },
  });

  revalidateLeadActionExecutionPaths(leadId);
}
/**
 * Marks a lead as lost from an executable action and completes that action.
 *
 * @param formData Close-lost form data.
 * @returns Revalidates lead, lead list and overview pages.
 */
export async function closeLeadAsLostFromAction(formData: FormData): Promise<void> {
  const leadId = String(formData.get('leadId') ?? '');
  const actionId = String(formData.get('actionId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (!leadId || !actionId) {
    return;
  }

  const action = await prisma.leadAction.update({
    where: { id: actionId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'LOST' },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: 'LEAD_CLOSED_LOST',
      message: `Lead fechada como perdida: ${action.title}`,
      metadata: {
        actionId,
        reason: reason || null,
      },
    },
  });

  revalidateLeadActionExecutionPaths(leadId);
}


function formatDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function formatTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}
function revalidateLeadActionExecutionPaths(leadId: string): void {
  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
}
function parseOptionalDateTime(value: string): Date | 'INVALID' | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);

  return Number.isNaN(date.getTime()) ? 'INVALID' : date;
}
function parsePositiveInteger(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
