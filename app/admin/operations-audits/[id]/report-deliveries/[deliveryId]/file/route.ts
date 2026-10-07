import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getReportDeliveryFile } from '@/lib/operations-audits/report-delivery';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; deliveryId: string }> }) {
  await requireAdmin();
  const { id, deliveryId } = await params;
  const file = await getReportDeliveryFile({ auditId: id, deliveryId });
  if (!file) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Blob([file.pdfBytes as any], { type: 'application/pdf' }), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(file.fileSizeBytes), 'Content-Disposition': `attachment; filename="${file.fileName}"`, 'Cache-Control': 'private, no-store' } });
}
