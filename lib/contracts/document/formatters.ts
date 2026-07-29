import type { ContractDocumentData } from './types';

const mojibakeCodePoints = [0x00c3, 0x0192, 0x00e2, 0x20ac, 0x0161, 0x0153, 0x2122, 0xfffd];

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function textValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const cleaned = sanitizePlainText(value);
    return cleaned || null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object' && 'toString' in value) {
    const rendered = String(value);
    return rendered && rendered !== '[object Object]' ? sanitizePlainText(rendered) : null;
  }
  return null;
}

export function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(textValue).filter((item): item is string => Boolean(item)) : [];
}

export function sanitizePlainText(value: string): string {
  return repairPortugueseMojibake(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

export function repairPortugueseMojibake(value: string): string {
  if (mojibakeScore(value) === 0) return value;

  let current = value;
  for (let index = 0; index < 4; index += 1) {
    const currentScore = mojibakeScore(current);
    if (currentScore === 0) break;
    const candidate = decodeCp1252AsUtf8(current);
    if (!candidate || candidate.includes('\uFFFD')) break;
    const candidateScore = mojibakeScore(candidate);
    if (candidateScore > currentScore) break;
    current = candidate;
  }
  return current;
}

export function formatDocumentDate(value: Date | string | null | undefined): string {
  if (!value) return 'Por definir';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Por definir';
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

export function formatShortDate(value: Date | string | null | undefined): string {
  if (!value) return 'Por definir';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Por definir';
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function formatMoneyValue(value: unknown, currency = 'EUR'): string {
  const raw = textValue(value);
  if (!raw) return 'Por definir';
  const numeric = Number(raw.replace(',', '.'));
  if (!Number.isFinite(numeric)) return raw;
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(numeric);
}

export function resolveClauseVariables(content: string, data: ContractDocumentData): string {
  const finalValue = data.financials.finalValue ?? data.financials.commercialValue ?? null;
  const map: Record<string, string> = {
    '{{client.companyName}}': data.client.legalName ?? data.client.tradeName ?? 'Cliente',
    '{{client.taxId}}': data.client.taxId ?? 'NIF por definir',
    '{{provider.legalName}}': data.provider.legalName ?? 'Norm8',
    '{{contract.number}}': data.number,
    '{{contract.date}}': formatDocumentDate(data.issueDate),
    '{{project.name}}': data.projectName ?? 'Projeto por definir',
    '{{financial.total}}': finalValue ? formatMoneyValue(finalValue, data.financials.currency) : 'Valor por definir',
    '{{financial.currency}}': data.financials.currency,
    '{{payment.initialPercentage}}': data.payments[0]?.percentage ? `${data.payments[0].percentage}%` : 'Percentagem por definir',
    '{{operate.monthlyFee}}': data.financials.operateMonthlyFee ? formatMoneyValue(data.financials.operateMonthlyFee, data.financials.currency) : 'Valor por definir',
    '{{operate.noticePeriod}}': data.financials.operateNoticePeriod ?? 'Pré-aviso por definir',
  };

  return sanitizePlainText(content).replace(/{{[^}]+}}/g, (token) => map[token] ?? token);
}

export function slugifyFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72) || 'Cliente';
}

function mojibakeScore(value: string): number {
  return Array.from(value).filter((char) => mojibakeCodePoints.includes(char.charCodeAt(0))).length;
}

function decodeCp1252AsUtf8(value: string): string | null {
  try {
    const bytes = new Uint8Array(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}