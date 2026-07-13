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
import {
 sendInternalScheduledMeetingEmails,
 sendLeadActionEmail,
 type LeadActionEmailSendResult,
} from '@/lib/email/service';
import { EMAIL_TYPES } from '@/lib/email/types';
import { getMeetingSubmissionSummary } from '@/lib/meetings/objectives';
import {
 MeetingSlotUnavailableError,
 createMeetingBooking,
 getMeetingSlotAvailability,
 type MeetingSlotAvailability,
} from '@/lib/meetings/service';
import { createProposal, generateProposalPdf, updateProposal } from '@/lib/proposals/service';
import { normalizePortugueseText } from '@/lib/text/normalize-portuguese';

const ADMIN_COOKIE_NAME = 'norm8_admin_access';

type ScheduleMeetingExecutionResult = {
 actionId: string;
 calendarEventCreated: boolean;
 customerEmailSent: boolean;
 failedEmailTypes: string[];
 internalEmailSent: boolean;
 leadId: string;
 meetingBookingId?: string;
 warning?: 'EMAIL_DELIVERY_FAILED';
};

export type LeadActionEmailExecutionResult = {
 success: boolean;
 emailSent: boolean;
 emailLogId?: string;
 providerMessageId?: string;
 timelineCreated?: boolean;
 leadActionCompleted?: boolean;
 error?: string;
};
export type LeadActionProposalExecutionResult = {
 success: boolean;
 proposalCreated: boolean;
 proposalId?: string;
 timelineCreated?: boolean;
 leadActionCompleted?: boolean;
 error?: string;
};

export type ProposalPdfGenerationResult = {
 success: boolean;
 pdfGenerated: boolean;
 proposalId?: string;
 pdfUrl?: string;
 timelineCreated?: boolean;
 error?: string;
};

function buildMeetingEmailFailureMessage(failedEmailTypes: string[]): string {
 const failed = new Set(failedEmailTypes);

 if (
 failed.has('MEETING_CLIENT_CONFIRMATION') &&
 failed.has('MEETING_INTERNAL_NOTIFICATION')
 ) {
 return 'Reunião criada, mas os emails de confirmação ao cliente e de notificação interna falharam.';
 }

 if (failed.has('MEETING_INTERNAL_NOTIFICATION')) {
 return 'Reunião criada, mas o email interno da Norm8 falhou.';
 }

 if (failed.has('MEETING_CLIENT_CONFIRMATION')) {
 return 'Reunião criada, mas o email de confirmação ao cliente falhou.';
 }

 return 'Reunião criada, mas um ou mais emails de confirmação falharam.';
}
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

 if (action.status === 'COMPLETED') {
 redirect(`/admin/leads/${leadId}?actionExecutionError=meetingAlreadyCompleted`);
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
 const executionResult: ScheduleMeetingExecutionResult = {
 actionId,
 calendarEventCreated: false,
 customerEmailSent: false,
 failedEmailTypes: [],
 internalEmailSent: false,
 leadId,
 };

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
 executionResult.meetingBookingId = meeting.id;

 console.info('MeetingBooking created for internal lead meeting', {
 leadId,
 actionId,
 meetingBookingId: meeting.id,
 status: meeting.status,
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
 executionResult.calendarEventCreated = Boolean(meeting.googleEventId);

 console.info('Google Calendar event attached to MeetingBooking', {
 leadId,
 actionId,
 meetingBookingId: meeting.id,
 googleEventCreated: executionResult.calendarEventCreated,
 googleEventId: meeting.googleEventId,
 calendarId: meeting.calendarId,
 });
 } catch (error) {
 if (error instanceof MeetingSlotUnavailableError) {
 redirect(`/admin/leads/${leadId}?actionExecutionError=meetingSlot`);
 }

 throw error;
 }

 if (meeting.status !== 'CONFIRMED' || !meeting.googleEventId) {
 console.error('Blocked scheduled meeting emails because the calendar event is not confirmed', {
 leadId,
 actionId,
 meetingBookingId: meeting.id,
 meetingStatus: meeting.status,
 googleEventCreated: Boolean(meeting.googleEventId),
 });
 redirect(`/admin/leads/${leadId}?actionExecutionError=meetingCalendar`);
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

 console.info('LeadAction completed and timeline activity created for scheduled meeting', {
 leadId,
 actionId,
 meetingBookingId: meeting.id,
 activityType: 'MEETING_SCHEDULED',
 });

 console.info('Internal lead meeting scheduled successfully', {
 leadId,
 actionId,
 meetingBookingId: meeting.id,
 googleEventCreated: Boolean(meeting.googleEventId),
 googleEventId: meeting.googleEventId,
 });

 console.info('Sending scheduled meeting emails', {
 leadId,
 actionId,
 meetingBookingId: meeting.id,
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
 }).catch((error) => {
 const errorMessage = error instanceof Error ? error.message : 'Unknown meeting email error.';

 console.error('Scheduled meeting email workflow failed after meeting was created', {
 leadId,
 actionId,
 meetingBookingId: meeting.id,
 error: errorMessage,
 });

 return {
 allSent: false,
 customerSent: false,
 internalSent: false,
 failedEmailTypes: [
 'MEETING_CLIENT_CONFIRMATION',
 'MEETING_INTERNAL_NOTIFICATION',
 ],
 clientEmail: {
 attempted: false,
 sent: false,
 error: errorMessage,
 },
 internalEmail: {
 attempted: false,
 sent: false,
 error: errorMessage,
 },
 };
 });
 executionResult.customerEmailSent = emailResult.customerSent;
 executionResult.internalEmailSent = emailResult.internalSent;
 executionResult.failedEmailTypes = emailResult.failedEmailTypes;

 if (!emailResult.allSent) {
 executionResult.warning = 'EMAIL_DELIVERY_FAILED';
 const failedEmailMessage = buildMeetingEmailFailureMessage(emailResult.failedEmailTypes);
 await prisma.leadActivity.create({
 data: {
 leadId,
 type: 'MEETING_EMAIL_FAILED',
 message: failedEmailMessage,
 metadata: {
 actionId,
 meetingBookingId: meeting.id,
 failedEmailTypes: emailResult.failedEmailTypes,
 customerEmailSent: emailResult.customerSent,
 internalEmailSent: emailResult.internalSent,
 clientEmail: emailResult.clientEmail,
 internalEmail: emailResult.internalEmail,
 },
 },
 });
 console.warn('Internal lead meeting scheduled with email delivery warnings', executionResult);
 }

 revalidateLeadActionExecutionPaths(leadId);
 revalidatePath('/admin/meetings');

 if (!emailResult.allSent) {
 redirect(`/admin/leads/${leadId}?actionExecutionError=meetingEmailWarning`);
 }
}

/**
 * Sends a real commercial email from a LeadAction execution.
 *
 * @param _previousState Previous UI state from useActionState.
 * @param formData Email execution form data.
 * @returns Typed execution result for the Admin modal.
 */
export async function sendLeadActionEmailExecution(
 _previousState: LeadActionEmailExecutionResult,
 formData: FormData,
): Promise<LeadActionEmailExecutionResult> {
 const leadId = String(formData.get('leadId') ?? '');
 const actionId = String(formData.get('actionId') ?? '');
 const to = String(formData.get('to') ?? '').trim();
 const subject = String(formData.get('subject') ?? '').trim();
 const body = String(formData.get('body') ?? '').trim();

 if (!leadId || !actionId) {
 return buildLeadActionEmailError('Não foi possível identificar a lead ou a ação.');
 }

 if (!isValidEmailAddress(to)) {
 return buildLeadActionEmailError('Esta lead não tem um email válido associado.');
 }

 if (!subject) {
 return buildLeadActionEmailError('Indique um assunto antes de enviar.');
 }

 if (!body) {
 return buildLeadActionEmailError('Indique o corpo do email antes de enviar.');
 }

 const action = await prisma.leadAction.findFirst({
 where: { id: actionId, leadId },
 include: { lead: true },
 });

 if (!action) {
 return buildLeadActionEmailError('A ação comercial já não existe ou não pertence a esta lead.');
 }

 if (action.status === 'COMPLETED') {
 return buildLeadActionEmailError('Esta ação já foi concluída. Atualize a página antes de tentar novamente.');
 }

 if (action.type !== 'SEND_EMAIL' && action.type !== 'FOLLOW_UP') {
 return buildLeadActionEmailError('Esta ação não suporta envio de email.');
 }

 const emailType = action.type === 'FOLLOW_UP'
 ? EMAIL_TYPES.LEAD_ACTION_FOLLOW_UP
 : EMAIL_TYPES.LEAD_ACTION_EMAIL;
 const sendResult: LeadActionEmailSendResult = await sendLeadActionEmail({
 leadId,
 to,
 subject,
 type: emailType,
 context: {
 leadId,
 actionId,
 companyName: action.lead.company,
 contactName: action.lead.name,
 recipientEmail: to,
 subject,
 body,
 actionType: action.type,
 adminLeadUrl: `/admin/leads/${leadId}`,
 },
 metadata: {
 actionId,
 actionType: action.type,
 companyName: action.lead.company,
 contactName: action.lead.name ?? null,
 template: 'LeadActionEmail',
 },
 });

 if (!sendResult.emailSent) {
 if (sendResult.emailLogId) {
 const failedMessage = action.type === 'FOLLOW_UP'
 ? `Falha ao enviar follow-up para ${to}. Motivo: ${sendResult.error ?? 'Erro desconhecido.'}`
 : `Falha ao enviar email para ${to}. Motivo: ${sendResult.error ?? 'Erro desconhecido.'}`;

 await prisma.leadActivity.create({
 data: {
 leadId,
 type: action.type === 'FOLLOW_UP' ? 'FOLLOW_UP_EMAIL_FAILED' : 'EMAIL_FAILED',
 message: failedMessage,
 metadata: {
 actionId,
 emailLogId: sendResult.emailLogId,
 subject,
 error: sendResult.error ?? null,
 },
 },
 });
 }

 revalidateLeadActionExecutionPaths(leadId);
 revalidatePath('/admin/emails');

 return {
 success: false,
 emailSent: false,
 emailLogId: sendResult.emailLogId,
 error: sendResult.error ?? 'Não foi possível enviar o email. Tente novamente.',
 };
 }

 const activityType = action.type === 'FOLLOW_UP' ? 'FOLLOW_UP_EMAIL_SENT' : 'EMAIL_SENT';
 const activityMessage = action.type === 'FOLLOW_UP'
 ? `Follow-up aceite pelo provider para ${action.lead.name ?? to}: ${subject}`
 : `Email aceite pelo provider para ${action.lead.name ?? to}: ${subject}`;

 await prisma.$transaction([
 prisma.leadActivity.create({
 data: {
 leadId,
 type: activityType,
 message: activityMessage,
 metadata: {
 actionId,
 emailLogId: sendResult.emailLogId,
 provider: 'resend',
 providerMessageId: sendResult.providerMessageId ?? null,
 deliveryStatus: 'ACCEPTED_BY_PROVIDER',
 subject,
 to,
 },
 },
 }),
 prisma.leadAction.update({
 where: { id: actionId },
 data: {
 status: 'COMPLETED',
 completedAt: new Date(),
 },
 }),
 ]);

 revalidateLeadActionExecutionPaths(leadId);
 revalidatePath('/admin/emails');

 return {
 success: true,
 emailSent: true,
 emailLogId: sendResult.emailLogId,
 providerMessageId: sendResult.providerMessageId,
 timelineCreated: true,
 leadActionCompleted: true,
 };
}
/**
 * Creates or updates a real proposal draft after the admin reviews the proposal data.
 *
 * No PDF is generated and no email is sent in this step.
 *
 * @param _previousState Previous form state from useActionState.
 * @param formData Proposal preparation form data.
 * @returns Execution result for the proposal preparation modal.
 */
export async function registerLeadActionProposalIntent(
 _previousState: LeadActionProposalExecutionResult,
 formData: FormData,
): Promise<LeadActionProposalExecutionResult> {
 const leadId = String(formData.get('leadId') ?? '').trim();
 const actionId = String(formData.get('actionId') ?? '').trim();
 const title = normalizeProposalText(String(formData.get('title') ?? ''));
 const companyName = normalizeProposalText(String(formData.get('companyName') ?? ''));
 const contactName = normalizeProposalText(String(formData.get('contactName') ?? ''));
 const estimatedValue = normalizeProposalText(String(formData.get('estimatedValue') ?? ''));
 const painPoints = normalizeProposalText(String(formData.get('painPoints') ?? ''));
 const recommendedSolution = normalizeProposalText(String(formData.get('recommendedSolution') ?? ''));
 const implementationPlan = normalizeProposalText(String(formData.get('implementationPlan') ?? ''));
 const nextSteps = normalizeProposalText(String(formData.get('nextSteps') ?? ''));

 if (!leadId || !actionId) {
 return buildLeadActionProposalError('N\u00e3o foi poss\u00edvel identificar a lead ou a a\u00e7\u00e3o.');
 }

 if (!title) {
 return buildLeadActionProposalError('O t\u00edtulo da proposta \u00e9 obrigat\u00f3rio.');
 }

 if (!companyName) {
 return buildLeadActionProposalError('A empresa \u00e9 obrigat\u00f3ria.');
 }


 if (!painPoints) {
 return buildLeadActionProposalError('As dores identificadas são obrigatórias.');
 }

 if (!recommendedSolution) {
 return buildLeadActionProposalError('A solu\u00e7\u00e3o recomendada \u00e9 obrigat\u00f3ria.');
 }

 if (!implementationPlan) {
 return buildLeadActionProposalError('O plano de implementação é obrigatório.');
 }

 if (!nextSteps) {
 return buildLeadActionProposalError('Os pr\u00f3ximos passos s\u00e3o obrigat\u00f3rios.');
 }

 if (estimatedValue && !isValidProposalValue(estimatedValue)) {
 return buildLeadActionProposalError('O valor estimado deve ser v\u00e1lido.');
 }

 const action = await prisma.leadAction.findFirst({
 where: { id: actionId, leadId, type: 'SEND_PROPOSAL' },
 include: { proposal: true, lead: true },
 });

 if (!action) {
 return buildLeadActionProposalError('A a\u00e7\u00e3o de proposta j\u00e1 n\u00e3o existe ou n\u00e3o pertence a esta lead.');
 }

 if (action.status === 'COMPLETED' && action.proposal) {
 return {
 success: true,
 proposalCreated: true,
 proposalId: action.proposal.id,
 timelineCreated: false,
 leadActionCompleted: true,
 };
 }

 const proposalInput = {
 leadId,
 leadActionId: actionId,
 title,
 companyName,
 contactName: contactName || null,
 estimatedValue: estimatedValue || null,
 painPoints,
 recommendedSolution,
 implementationPlan,
 nextSteps,
 };

 try {
 const proposal = action.proposal
 ? await updateProposal(action.proposal.id, proposalInput)
 : await createProposal(proposalInput);

 await prisma.$transaction([
 prisma.leadActivity.create({
 data: {
 leadId,
 type: 'PROPOSAL_CREATED',
 message: `Proposta criada: ${proposal.title}`,
 metadata: {
 actionId,
 proposalId: proposal.id,
 leadId,
 status: proposal.status,
 estimatedValue: estimatedValue || null,
 companyName: proposal.companyName,
 },
 },
 }),
 prisma.leadAction.update({
 where: { id: actionId },
 data: {
 status: 'IN_PROGRESS',
 completedAt: null,
 },
 }),
 ]);

 console.info('Proposal created from lead action', {
 actionId,
 leadId,
 proposalId: proposal.id,
 status: proposal.status,
 });

 revalidateLeadActionExecutionPaths(leadId);

 return {
 success: true,
 proposalCreated: true,
 proposalId: proposal.id,
 timelineCreated: true,
 leadActionCompleted: false,
 };
 } catch (error) {
 console.error('Failed to create proposal from lead action', error);
 return buildLeadActionProposalError('N\u00e3o foi poss\u00edvel criar a proposta. Confirme os dados e tente novamente.');
 }
}

export async function generateProposalPdfExecution(
 _previousState: ProposalPdfGenerationResult,
 formData: FormData,
): Promise<ProposalPdfGenerationResult> {
 const leadId = String(formData.get('leadId') ?? '').trim();
 const proposalId = String(formData.get('proposalId') ?? '').trim();

 if (!leadId || !proposalId) {
 return buildProposalPdfGenerationError('N\u00e3o foi poss\u00edvel identificar a lead ou a proposta.');
 }

 try {
 const result = await generateProposalPdf({ leadId, proposalId });
 const activityMessage = `PDF da proposta gerado: ${result.proposal.title}`;
 const existingPdfActivity = await prisma.leadActivity.findFirst({
 where: {
 leadId,
 message: activityMessage,
 type: 'PROPOSAL_PDF_GENERATED',
 },
 select: { id: true },
 });
 if (!existingPdfActivity) {
 await prisma.leadActivity.create({
 data: {
 leadId,
 type: 'PROPOSAL_PDF_GENERATED',
 message: activityMessage,
 metadata: {
 leadId,
 proposalId: result.proposal.id,
 leadActionId: result.proposal.leadActionId,
 pdfPath: result.pdfPath,
 pdfUrl: result.pdfUrl,
 status: result.proposal.status,
 version: result.proposal.version,
 },
 },
 });
 }

 if (result.proposal.leadActionId) {
 await prisma.leadAction.update({
 where: { id: result.proposal.leadActionId },
 data: {
 status: 'COMPLETED',
 completedAt: new Date(),
 },
 });
 }

 console.info('Proposal PDF generated', {
 leadId,
 pdfPath: result.pdfPath,
 pdfUrl: result.pdfUrl,
 proposalId: result.proposal.id,
 status: result.proposal.status,
 });

 revalidateLeadActionExecutionPaths(leadId);

 return {
 success: true,
 pdfGenerated: true,
 proposalId: result.proposal.id,
 pdfUrl: result.pdfUrl,
 timelineCreated: !existingPdfActivity,
 };
 } catch (error) {
 console.error('Failed to generate proposal PDF', error);
 return buildProposalPdfGenerationError(
 error instanceof Error
 ? error.message
 : 'N\u00e3o foi poss\u00edvel gerar o PDF da proposta. Confirme os dados e tente novamente.',
 );
 }
}

function buildProposalPdfGenerationError(error: string): ProposalPdfGenerationResult {
 return {
 success: false,
 pdfGenerated: false,
 error,
 };
}

function buildLeadActionProposalError(error: string): LeadActionProposalExecutionResult {
 return {
 success: false,
 proposalCreated: false,
 error,
 };
}

function normalizeProposalText(value: string): string {
  return normalizePortugueseText(value)
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isValidProposalValue(value: string): boolean {
 const normalized = value.replace(',', '.');
 return /^\d+(\.\d{1,2})?$/.test(normalized) && Number.isFinite(Number(normalized));
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

function buildLeadActionEmailError(error: string): LeadActionEmailExecutionResult {
 return {
 success: false,
 emailSent: false,
 error,
 };
}

function isValidEmailAddress(value: string): boolean {
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
