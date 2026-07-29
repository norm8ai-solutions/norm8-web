import 'server-only';

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@/app/generated/prisma/client';
import { ContractDocument } from '@/components/contracts/document/ContractDocument';
import { prisma } from '@/lib/db/prisma';
import { getContractLogoDataUri } from '@/lib/contracts/document/assets';
import { ContractAdminResolutionError, resolvePersistentAdminId as resolvePersistentContractAdminId } from '@/lib/contracts/service';
import { assertContractCanGeneratePdf, ContractGovernanceError, normalizeChangeReason } from '@/lib/contracts/governance';
import { getMissingContractFinancialFields, getMissingContractScopeFields, getMissingContractServiceFields, getStepMissingFields, hasMeaningfulLegalText, isValidBasicPortugueseTaxId, isValidEmail, isValidRequiredProviderTaxId } from '@/lib/contracts/wizard/validation';
import { getContractDocumentData } from './data';
import { slugifyFilePart } from './formatters';

export type ContractPdfGenerationResult = {
  contractId: string;
  pdfHash: string;
  pdfStorageKey: string;
  pdfUrl: string;
  operation: 'current' | 'generated' | 'regenerated';
  version: number;
};

export class ContractPdfError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: { missingFields?: string[] }) {
    super(message);
    this.name = 'ContractPdfError';
  }
}

export async function generateContractPdf(input: { adminUserId: string; adminEmail?: string | null; contractId: string; changeReason?: string | null }): Promise<ContractPdfGenerationResult> {
  const data = await getContractDocumentData(input.contractId);
  if (!data) throw new ContractPdfError('not_found', 'Contrato não encontrado.');
  const pendingChangeReason = normalizeChangeReason(data.pendingChangeReason);
  const operation = hasExistingGeneratedPdf(data) ? 'regenerated' : 'generated';
  const changeReason = pendingChangeReason ?? normalizeChangeReason(input.changeReason) ?? (operation === 'generated' ? 'Geração inicial do PDF' : null);
  try {
    assertContractCanGeneratePdf(data, changeReason);
  } catch (error) {
    if (error instanceof ContractGovernanceError) throw new ContractPdfError(error.code, error.message);
    throw error;
  }

  validateReadyForPdf(data);


  const pdf = await renderPdfBuffer(data);
  const pdfHash = hashPdf(pdf);
  const generatedAt = new Date();
  const adminUserId = await resolvePersistentPdfAdminId(input.adminUserId, input.adminEmail);

  if (operation === 'regenerated' && data.pdfHash === pdfHash && data.pdfUrl && data.pdfStorageKey) {
    await prisma.$transaction([
      prisma.contract.update({
        where: { id: input.contractId },
        data: { generatedAt, pendingChangeReason: null, pendingChangeAt: null },
      }),
      prisma.contractActivityLog.create({
        data: {
          contractId: input.contractId,
          adminUserId,
          type: 'CONTRACT_PDF_REGENERATED',
          message: `PDF mantido para ${data.number}; o conteúdo gerado é idêntico ao ficheiro atual.`,
          metadata: { generatedAt: generatedAt.toISOString(), pdfHash, pdfStorageKey: data.pdfStorageKey, pdfUrl: data.pdfUrl, changeReason, skippedVersion: true },
        },
      }),
    ]);

    return { contractId: input.contractId, operation: 'current', pdfHash, pdfStorageKey: data.pdfStorageKey, pdfUrl: data.pdfUrl, version: data.version };
  }

  const fileName = buildContractPdfFileName(data, pdfHash, generatedAt);
  const stored = await storeContractPdf(fileName, pdf);
  const version = await getNextContractVersion(input.contractId, data.version);
  const snapshot = buildContractVersionSnapshot(data);

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: input.contractId },
      data: {
        pdfUrl: stored.pdfUrl,
        pdfStorageKey: stored.pdfStorageKey,
        pdfHash,
        generatedAt,
        pendingChangeReason: null,
        pendingChangeAt: null,
      },
    }),
    prisma.contractVersion.create({
      data: {
        // The canonical PDF integrity hash for this version is ContractVersion.pdfHash.
        // Generated PDF fields are intentionally excluded from the snapshot below.
        contractId: input.contractId,
        version,
        title: data.title,
        status: data.status,
        statusAtGeneration: data.status,
        versionLabel: 'v' + version,
        snapshot,
        pdfUrl: stored.pdfUrl,
        pdfStorageKey: stored.pdfStorageKey,
        pdfHash,
        generatedAt,
        changeReason,
        createdById: adminUserId,
      },
    }),
    prisma.contractActivityLog.create({
      data: {
        contractId: input.contractId,
        adminUserId,
        type: operation === 'regenerated' ? 'CONTRACT_PDF_REGENERATED' : 'CONTRACT_PDF_GENERATED',
        message: operation === 'regenerated' ? `PDF regenerado para ${data.number} v${version}.` : `PDF gerado para ${data.number} v${version}.`,
        metadata: { fileName, generatedAt: generatedAt.toISOString(), pdfHash, pdfStorageKey: stored.pdfStorageKey, pdfUrl: stored.pdfUrl, version, versionLabel: 'v' + version, changeReason },
      },
    }),
  ]);

  return { contractId: input.contractId, operation, pdfHash, pdfStorageKey: stored.pdfStorageKey, pdfUrl: stored.pdfUrl, version };
}

function hasExistingGeneratedPdf(data: NonNullable<Awaited<ReturnType<typeof getContractDocumentData>>>): boolean {
  return Boolean(data.pdfUrl || data.pdfStorageKey || data.pdfHash || data.generatedAt);
}
function validateReadyForPdf(data: Awaited<ReturnType<typeof getContractDocumentData>> extends infer T ? NonNullable<T> : never): void {
  const missingProviderLegalFields = getMissingProviderLegalFieldsForPdf(data.provider);
  if (missingProviderLegalFields.length > 0) {
    throw new ContractPdfError(
      'missing_provider_legal',
      'Não é possível gerar o contrato final porque existem dados legais da Norm8 em falta.',
      { missingFields: missingProviderLegalFields },
    );
  }
  if (!data.client.legalName && !data.client.tradeName) {
    throw new ContractPdfError('missing_client', 'Dados do cliente em falta.');
  }
  const missingClientLegalFields = getMissingClientLegalFieldsForPdf(data.client);
  if (missingClientLegalFields.length > 0) {
    throw new ContractPdfError(
      'missing_client_legal',
      'Não é possível gerar o contrato final porque existem dados legais do cliente em falta.',
      { missingFields: missingClientLegalFields },
    );
  }
  const missingServiceFields = getMissingContractServiceFields({
    service: {
      serviceType: data.serviceType,
      serviceTypeOther: data.serviceTypeOther,
      plan: data.plan,
      includesLaunch: data.includesLaunch,
      includesOperate: data.includesOperate,
      includesScale: data.includesScale,
      includedServices: data.includedServices,
    },
    validUntil: data.validUntil,
  });
  if (missingServiceFields.length > 0) {
    throw new ContractPdfError(
      'missing_service_plan',
      'Não é possível gerar o contrato final porque existem dados do serviço e plano em falta.',
      { missingFields: missingServiceFields },
    );
  }

  const missingScopeFields = getMissingContractScopeFields({
    scope: data.context,
    deliverables: data.deliverables.map((deliverable) => ({
      title: deliverable.title,
      description: deliverable.description,
      phase: deliverable.phase,
      estimatedDate: deliverable.estimatedDate?.toISOString() ?? null,
      responsible: deliverable.responsible,
      acceptanceCriteria: deliverable.acceptanceCriteria,
    })),
  });
  if (missingScopeFields.length > 0) {
    throw new ContractPdfError(
      'missing_scope_deliverables',
      'Não é possível gerar o contrato final porque existem entregáveis incompletos.',
      { missingFields: missingScopeFields },
    );
  }

  const missingTimelineFields = getStepMissingFields('timeline', {
    phases: data.phases.map((phase) => ({
      name: phase.name,
      description: phase.description,
      startsAt: phase.startsAt?.toISOString() ?? null,
      endsAt: phase.endsAt?.toISOString() ?? null,
      duration: phase.duration,
      dependencies: phase.dependencies,
      paymentMilestone: phase.paymentMilestone,
      approvalCriteria: phase.approvalCriteria,
    })),
  });
  if (missingTimelineFields.length > 0) {
    throw new ContractPdfError(
      'missing_timeline',
      'Não é possível gerar o contrato final porque existem dados do cronograma em falta.',
      { missingFields: missingTimelineFields },
    );
  }

  const missingFinancialFields = getMissingContractFinancialFields({
    financials: data.financials,
    paymentMilestones: data.payments.map((payment) => ({
      percentage: payment.percentage,
      amount: payment.amount,
      invoiceMoment: payment.invoiceMoment,
      expectedDate: payment.expectedDate?.toISOString() ?? null,
      description: payment.description,
      billingCondition: payment.billingCondition,
    })),
  });
  if (missingFinancialFields.length > 0) {
    throw new ContractPdfError(
      'missing_financials',
      'Não é possível gerar o contrato final porque existem dados de investimento e pagamentos em falta.',
      { missingFields: missingFinancialFields },
    );
  }
  if (data.sections.filter((section) => section.isRequired).length === 0) {
    throw new ContractPdfError('missing_clauses', 'Cláusulas obrigatórias em falta.');
  }
}


function getMissingProviderLegalFieldsForPdf(provider: NonNullable<Awaited<ReturnType<typeof getContractDocumentData>>>['provider']): string[] {
  return [
    !hasMeaningfulLegalText(provider.legalName) ? 'Nome legal da entidade prestadora' : null,
    !isValidRequiredProviderTaxId(provider.taxId) ? 'NIF da entidade prestadora' : null,
    !hasMeaningfulLegalText(provider.address) ? 'Morada fiscal' : null,
    !isValidEmail(provider.email) ? 'Email' : null,
    !hasMeaningfulLegalText(provider.representative) ? 'Nome do representante' : null,
    !hasMeaningfulLegalText(provider.representativeRole) ? 'Cargo do representante' : null,
  ].filter((field): field is string => Boolean(field));
}
function getMissingClientLegalFieldsForPdf(client: NonNullable<Awaited<ReturnType<typeof getContractDocumentData>>>['client']): string[] {
  return [
    !client.tradeName ? 'Nome comercial' : null,
    !client.legalName ? 'Denominação social' : null,
    !isValidBasicPortugueseTaxId(client.taxId) ? 'NIF' : null,
    !client.address ? 'Morada fiscal' : null,
    !client.postalCode ? 'Código postal' : null,
    !client.city ? 'Localidade' : null,
    !client.country ? 'País' : null,
    !client.email ? 'Email' : null,
    !client.representative ? 'Nome do representante' : null,
    !client.representativeRole ? 'Cargo do representante' : null,
    !client.representativeEmail ? 'Email do representante' : null,
  ].filter((field): field is string => Boolean(field));
}
async function renderPdfBuffer(data: NonNullable<Awaited<ReturnType<typeof getContractDocumentData>>>): Promise<Buffer> {
  let chromium: typeof import('playwright').chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (error) {
    console.error('Playwright import failed', error);
    throw new ContractPdfError('playwright', 'Playwright indisponível.');
  }

  const html = await renderContractHtml(data);
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    return Buffer.from(pdf);
  } catch (error) {
    console.error('Contract PDF render failed', { contractId: data.id, error });
    throw new ContractPdfError('playwright', 'Não foi possível gerar PDF com Playwright.');
  } finally {
    await browser?.close();
  }
}

async function renderContractHtml(data: NonNullable<Awaited<ReturnType<typeof getContractDocumentData>>>): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  let logoDataUri: string;
  try {
    logoDataUri = await getContractLogoDataUri();
  } catch (error) {
    console.error('Contract logo asset failed to load', { contractId: data.id, error });
    throw new ContractPdfError('missing_logo', 'Logótipo de contrato não encontrado em public/brand/norm8-logo-black.png.');
  }
  const markup = renderToStaticMarkup(<ContractDocument contract={data} logoSrc={logoDataUri} />);
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(data.number)} - ${escapeHtml(data.title)}</title></head><body>${markup}</body></html>`;
}

function buildContractVersionSnapshot(data: NonNullable<Awaited<ReturnType<typeof getContractDocumentData>>>): Prisma.JsonObject {
  const snapshot = JSON.parse(JSON.stringify(data)) as Prisma.JsonObject;
  delete snapshot.pdfUrl;
  delete snapshot.pdfStorageKey;
  delete snapshot.pdfHash;
  delete snapshot.generatedAt;
  delete snapshot.pendingChangeReason;
  delete snapshot.pendingChangeAt;
  return snapshot;
}
function hashPdf(pdf: Buffer): string {
  try {
    return createHash('sha256').update(pdf).digest('hex');
  } catch (error) {
    console.error('Contract PDF hash failed', error);
    throw new ContractPdfError('hash_failed', 'Não foi possível calcular hash do PDF.');
  }
}

async function storeContractPdf(fileName: string, pdf: Buffer): Promise<{ pdfStorageKey: string; pdfUrl: string }> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const key = `contracts/${fileName}`;
    const blob = await put(key, pdf, { access: 'public', contentType: 'application/pdf' });
    return { pdfStorageKey: key, pdfUrl: blob.url };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new ContractPdfError('storage', 'Storage de contratos não configurado.');
  }

  try {
    const directory = path.join(process.cwd(), 'public', 'generated', 'contracts');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), pdf);
    return { pdfStorageKey: `public/generated/contracts/${fileName}`, pdfUrl: `/generated/contracts/${fileName}` };
  } catch (error) {
    console.error('Contract PDF local write failed', error);
    throw new ContractPdfError('write_failed', 'Não foi possível guardar o PDF.');
  }
}

function buildContractPdfFileName(data: NonNullable<Awaited<ReturnType<typeof getContractDocumentData>>>, pdfHash: string, generatedAt: Date): string {
  const client = slugifyFilePart(data.client.tradeName ?? data.client.legalName ?? 'Cliente');
  const timestamp = generatedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const hashPart = pdfHash.slice(0, 10);
  return `Norm8_Contrato_${client}_${data.number}_v${data.version}_${timestamp}_${hashPart}.pdf`;
}

async function resolvePersistentPdfAdminId(adminUserId: string, adminEmail?: string | null): Promise<string> {
  try {
    return await resolvePersistentContractAdminId(prisma, { adminId: adminUserId, email: adminEmail });
  } catch (error) {
    if (error instanceof ContractAdminResolutionError) {
      throw new ContractPdfError('admin_missing', 'Não existe um utilizador admin ativo para associar ao PDF.');
    }

    throw error;
  }
}

async function getNextContractVersion(contractId: string, fallbackVersion: number): Promise<number> {
  const latest = await prisma.contractVersion.findFirst({ where: { contractId }, orderBy: { version: 'desc' }, select: { version: true } });
  return latest ? latest.version + 1 : fallbackVersion;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char));
}
