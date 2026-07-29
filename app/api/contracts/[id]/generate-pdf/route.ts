import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { ContractPdfError, generateContractPdf } from '@/lib/contracts/document/pdf';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const wantsJson = request.headers.get('accept')?.includes('application/json') || request.headers.get('x-requested-with') === 'fetch';

  try {
    const result = await generateContractPdf({ adminUserId: admin.id, adminEmail: admin.email, contractId: id });
    revalidateContractPages(id);
    if (wantsJson) {
      return NextResponse.json({ success: true, ...result });
    }
    return NextResponse.redirect(new URL(`/admin/contracts/${id}/preview?pdf=${result.operation}`, baseUrl), { status: 303 });
  } catch (error) {
    const code = error instanceof ContractPdfError ? error.code : 'unknown';
    if (wantsJson) {
      return NextResponse.json(
        {
          success: false,
          error: code,
          message: error instanceof ContractPdfError ? error.message : 'Não foi possível gerar o PDF.',
          missingFields: error instanceof ContractPdfError ? error.details?.missingFields ?? [] : [],
        },
        { status: code === 'pdf_current' || code === 'missing_pending_change_reason' ? 409 : 400 },
      );
    }

    const redirectUrl = new URL(`/admin/contracts/${id}/preview`, baseUrl);
    redirectUrl.searchParams.set('error', code);
    if (error instanceof ContractPdfError && error.details?.missingFields?.length) {
      redirectUrl.searchParams.set('missing', error.details.missingFields.join(', '));
    }
    console.error('[contracts.generatePdf] Failed to generate PDF', { contractId: id, code, error });
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
function revalidateContractPages(contractId: string): void {
  revalidatePath('/admin/contracts');
  revalidatePath(`/admin/contracts/${contractId}`);
  revalidatePath(`/admin/contracts/${contractId}/preview`);
}
