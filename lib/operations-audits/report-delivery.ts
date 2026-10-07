import 'server-only';

import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { getAuditReport, getPilotReport } from '@/lib/operations-audits/reporting';
import { renderAuditPdf, renderPilotPdf } from '@/lib/operations-audits/report-pdf';
import { safePdfFilename } from '@/lib/operations-audits/report-export';
import { getEmailProviderConfigStatus, getResendClient } from '@/lib/email/resend';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: string | null | undefined) => (value ?? '').trim();
function assertInput(input: { recipientEmail: string; subject: string; message: string }) {
  if (!emailPattern.test(input.recipientEmail) || input.recipientEmail.length > 320) throw new Error('INVALID_RECIPIENT');
  if (!input.subject || input.subject.length > 180) throw new Error('INVALID_SUBJECT');
  if (!input.message || input.message.length > 10000) throw new Error('INVALID_MESSAGE');
}
function hash(bytes: Buffer) { return createHash('sha256').update(bytes).digest('hex'); }
function providerError(error: unknown) { return error instanceof Error ? error.message.slice(0, 1000) : 'Provider delivery failed'; }

async function sendStoredDelivery(delivery: any, sentBy?: string | null) {
  const config = getEmailProviderConfigStatus();
  if (!config.configured || !config.from) throw new Error(`EMAIL_PROVIDER_NOT_CONFIGURED:${config.missing.join(',')}`);
  const response = await getResendClient().emails.send({
    from: config.from,
    to: delivery.recipientEmail,
    subject: delivery.subject,
    text: delivery.message,
    ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    attachments: [{ filename: delivery.fileName, content: Buffer.from(delivery.pdfBytes) as any }],
  });
  if (response.error) throw new Error(response.error.message || 'Resend delivery failed');
  return prisma.auditReportDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', sentAt: new Date(), sentBy: sentBy ?? null, providerMessageId: response.data?.id ?? null, failureReason: null } });
}

async function createAndSend(input: { auditId: string; pilotProposalId?: string; reportType: 'AUDIT_REPORT' | 'PILOT_REPORT'; recipientName?: string | null; recipientEmail: string; subject: string; message: string; sentBy?: string | null; bytes: Buffer; fileName: string; }) {
  assertInput(input); const generatedAt = new Date(); const fileSha256 = hash(input.bytes);
  const delivery = await prisma.auditReportDelivery.create({ data: { auditId: input.auditId, pilotProposalId: input.pilotProposalId ?? null, reportType: input.reportType, channel: 'EMAIL', status: 'PENDING', recipientName: clean(input.recipientName) || null, recipientEmail: input.recipientEmail, subject: input.subject, message: input.message, generatedAt, storageKey: `operations-audits/${input.auditId}/deliveries/pending/report.pdf`, fileName: input.fileName, fileSizeBytes: input.bytes.length, fileSha256, pdfBytes: input.bytes as any } });
  await prisma.auditReportDelivery.update({ where: { id: delivery.id }, data: { storageKey: `operations-audits/${input.auditId}/deliveries/${delivery.id}/report.pdf` } });
  try { return await sendStoredDelivery({ ...delivery, pdfBytes: input.bytes }, input.sentBy); }
  catch (error) { await prisma.auditReportDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', failureReason: providerError(error) } }); throw error; }
}

export async function sendAuditReportDelivery(input: { auditId: string; recipientName?: string | null; recipientEmail: string; subject: string; message: string; sentBy?: string | null; }) {
  const report = await getAuditReport(input.auditId); if (!report) throw new Error('AUDIT_NOT_FOUND');
  const generatedAt = new Date(); const bytes = Buffer.from(await renderAuditPdf(report, generatedAt.toISOString()));
  return createAndSend({ ...input, reportType: 'AUDIT_REPORT', bytes, fileName: safePdfFilename('norm8-audit-report', report.audit.name, generatedAt), auditId: input.auditId });
}

export async function sendPilotReportDelivery(input: { auditId: string; processId: string; opportunityId: string; pilotId?: string; recipientName?: string | null; recipientEmail: string; subject: string; message: string; sentBy?: string | null; }) {
  const report = await getPilotReport(input); if (!report) throw new Error('PILOT_NOT_FOUND');
  const generatedAt = new Date(); const bytes = Buffer.from(await renderPilotPdf(report, generatedAt.toISOString()));
  return createAndSend({ ...input, reportType: 'PILOT_REPORT', pilotProposalId: report.pilot.id, bytes, fileName: safePdfFilename('norm8-pilot-report', report.pilot.title, generatedAt), auditId: input.auditId });
}

export async function retryReportDelivery(input: { auditId: string; deliveryId: string; sentBy?: string | null; }) {
  const claimed = await prisma.auditReportDelivery.updateMany({ where: { id: input.deliveryId, auditId: input.auditId, status: 'FAILED' }, data: { status: 'PENDING', failureReason: null } });
  if (!claimed.count) {
    const existing = await prisma.auditReportDelivery.findFirst({ where: { id: input.deliveryId, auditId: input.auditId }, select: { id: true } });
    if (!existing) throw new Error('DELIVERY_NOT_FOUND');
    throw new Error('DELIVERY_NOT_FAILED');
  }
  const delivery = await prisma.auditReportDelivery.findFirst({ where: { id: input.deliveryId, auditId: input.auditId } });
  if (!delivery) throw new Error('DELIVERY_NOT_FOUND');
  try { return await sendStoredDelivery(delivery, input.sentBy); } catch (error) { await prisma.auditReportDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', failureReason: providerError(error) } }); throw error; }
}

export async function listReportDeliveries(input: { auditId: string; pilotProposalId?: string }) {
  const rows = await prisma.auditReportDelivery.findMany({ where: { auditId: input.auditId, ...(input.pilotProposalId ? { pilotProposalId: input.pilotProposalId } : {}) }, orderBy: { createdAt: 'desc' }, select: { id: true, reportType: true, channel: true, status: true, recipientName: true, recipientEmail: true, subject: true, generatedAt: true, sentAt: true, sentBy: true, providerMessageId: true, fileName: true, fileSizeBytes: true, fileSha256: true, failureReason: true } });
  return rows.map(row => ({ ...row, generatedAt: row.generatedAt.toISOString(), sentAt: row.sentAt?.toISOString() ?? null }));
}

export async function getReportDeliveryFile(input: { auditId: string; deliveryId: string }) {
  return prisma.auditReportDelivery.findFirst({ where: { id: input.deliveryId, auditId: input.auditId }, select: { fileName: true, pdfBytes: true, fileSha256: true, fileSizeBytes: true } });
}
