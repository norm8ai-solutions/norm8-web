import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAuditReport } from '@/lib/operations-audits/reporting';
import { renderAuditPdf } from '@/lib/operations-audits/report-pdf';
import { safePdfFilename } from '@/lib/operations-audits/report-export';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const report = await getAuditReport(id);
  if (!report) return new NextResponse('Not found', { status: 404 });
  const generatedAt = new Date().toISOString();
  try {
    const buffer = await renderAuditPdf(report, generatedAt);
    return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${safePdfFilename('norm8-ai-operations-audit', report.audit.lead.company, new Date(generatedAt))}"`, 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('audit report pdf generation failed', error);
    return new NextResponse('Unable to generate report PDF', { status: 500 });
  }
}
