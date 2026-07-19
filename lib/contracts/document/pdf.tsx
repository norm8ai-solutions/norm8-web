import 'server-only';

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@/app/generated/prisma/client';
import { ContractDocument } from '@/components/contracts/document/ContractDocument';
import { prisma } from '@/lib/db/prisma';
import { getContractDocumentData } from './data';
import { slugifyFilePart } from './formatters';

export type ContractPdfGenerationResult = {
  contractId: string;
  pdfHash: string;
  pdfStorageKey: string;
  pdfUrl: string;
  version: number;
};

export class ContractPdfError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'ContractPdfError';
  }
}

export async function generateContractPdf(input: { adminUserId: string; contractId: string }): Promise<ContractPdfGenerationResult> {
  const data = await getContractDocumentData(input.contractId);
  if (!data) throw new ContractPdfError('not_found', 'Contrato não encontrado.');
  if (data.status === 'SIGNED') throw new ContractPdfError('locked', 'Contratos assinados não podem ser regenerados diretamente.');

  validateReadyForPdf(data);

  const pdf = await renderPdfBuffer(data);
  const pdfHash = hashPdf(pdf);
  const fileName = buildContractPdfFileName(data);
  const stored = await storeContractPdf(fileName, pdf);
  const adminUserId = await resolvePersistentAdminId(input.adminUserId);
  const generatedAt = new Date();
  const version = await getNextContractVersion(input.contractId, data.version);
  const snapshot = JSON.parse(JSON.stringify(data)) as Prisma.JsonObject;

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: input.contractId },
      data: {
        pdfUrl: stored.pdfUrl,
        pdfStorageKey: stored.pdfStorageKey,
        pdfHash,
        generatedAt,
      },
    }),
    prisma.contractVersion.create({
      data: {
        contractId: input.contractId,
        version,
        title: data.title,
        status: data.status,
        snapshot,
        pdfUrl: stored.pdfUrl,
        pdfStorageKey: stored.pdfStorageKey,
        pdfHash,
        generatedAt,
        createdById: adminUserId,
      },
    }),
    prisma.contractActivityLog.create({
      data: {
        contractId: input.contractId,
        adminUserId,
        type: 'CONTRACT_PDF_GENERATION_REQUESTED',
        message: `PDF gerado para ${data.number} v${version}.`,
        metadata: { pdfHash, pdfStorageKey: stored.pdfStorageKey, pdfUrl: stored.pdfUrl, version },
      },
    }),
  ]);

  return { contractId: input.contractId, pdfHash, pdfStorageKey: stored.pdfStorageKey, pdfUrl: stored.pdfUrl, version };
}

function validateReadyForPdf(data: Awaited<ReturnType<typeof getContractDocumentData>> extends infer T ? NonNullable<T> : never): void {
  if (!data.provider.legalName || !data.provider.taxId || !data.provider.address) {
    throw new ContractPdfError('missing_legal', 'Dados legais da Norm8 em falta.');
  }
  if (!data.client.legalName && !data.client.tradeName) {
    throw new ContractPdfError('missing_client', 'Dados do cliente em falta.');
  }
  if (data.sections.filter((section) => section.isRequired).length === 0) {
    throw new ContractPdfError('missing_clauses', 'Cláusulas obrigatórias em falta.');
  }
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
  const markup = renderToStaticMarkup(<ContractDocument contract={data} />);
  const logoDataUri = await getLogoDataUri();
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(data.number)} - ${escapeHtml(data.title)}</title></head><body>${markup.replace('/brand/norm8-logo.png', logoDataUri)}</body></html>`;
}

async function getLogoDataUri(): Promise<string> {
  const logoPath = path.join(process.cwd(), 'public', 'brand', 'norm8-logo.png');
  try {
    const logo = await readFile(logoPath);
    return `data:image/png;base64,${logo.toString('base64')}`;
  } catch {
    return '/brand/norm8-logo.png';
  }
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

function buildContractPdfFileName(data: NonNullable<Awaited<ReturnType<typeof getContractDocumentData>>>): string {
  const client = slugifyFilePart(data.client.tradeName ?? data.client.legalName ?? 'Cliente');
  return `Norm8_Contrato_${client}_${data.number}_v${data.version}.pdf`;
}

async function resolvePersistentAdminId(adminUserId: string): Promise<string> {
  const existing = await prisma.adminUser.findUnique({ where: { id: adminUserId }, select: { id: true } });
  if (existing) return existing.id;
  const fallback = await prisma.adminUser.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (!fallback) throw new ContractPdfError('unknown', 'Não existe admin persistente para associar ao PDF.');
  return fallback.id;
}

async function getNextContractVersion(contractId: string, fallbackVersion: number): Promise<number> {
  const latest = await prisma.contractVersion.findFirst({ where: { contractId }, orderBy: { version: 'desc' }, select: { version: true } });
  return latest ? latest.version + 1 : fallbackVersion;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char));
}