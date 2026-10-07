import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getPilotReport } from '@/lib/operations-audits/reporting';
import { renderPilotPdf } from '@/lib/operations-audits/report-pdf';
import { safePdfFilename } from '@/lib/operations-audits/report-export';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; processId: string; opportunityId: string }> }) {
  await requireAdmin();
  const { id, processId, opportunityId } = await params;
  const report = await getPilotReport({ auditId: id, processId, opportunityId });
  if (!report) return new NextResponse('Not found', { status: 404 });
  const generatedAt = new Date().toISOString();
  try {
    const buffer = await renderPilotPdf(report, generatedAt);
    return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${safePdfFilename('norm8-pilot-report', report.pilot.title ?? 'pilot', new Date(generatedAt))}"`, 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('pilot report pdf generation failed', error);
    return new NextResponse('Unable to generate report PDF', { status: 500 });
  }
}
