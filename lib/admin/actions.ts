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
import type { LeadPriority, LeadStatus } from '@/app/generated/prisma/client';
import { createAuditAnalysisForSubmission } from '@/lib/audit-analysis/service';
import { prisma } from '@/lib/db/prisma';

const ADMIN_COOKIE_NAME = 'norm8_admin_access';

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
