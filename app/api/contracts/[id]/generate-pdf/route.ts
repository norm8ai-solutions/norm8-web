import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { ContractPdfError, generateContractPdf } from '@/lib/contracts/document/pdf';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    await generateContractPdf({ adminUserId: admin.id, adminEmail: admin.email, contractId: id });
    return NextResponse.redirect(new URL(`/admin/contracts/${id}/preview?generated=1`, baseUrl), { status: 303 });
  } catch (error) {
    const code = error instanceof ContractPdfError ? error.code : 'unknown';
    const redirectUrl = new URL(`/admin/contracts/${id}/preview`, baseUrl);
    redirectUrl.searchParams.set('error', code);
    if (error instanceof ContractPdfError && error.details?.missingFields?.length) {
      redirectUrl.searchParams.set('missing', error.details.missingFields.join(', '));
    }
    console.error('Contract PDF generation failed', { contractId: id, code, error });
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}