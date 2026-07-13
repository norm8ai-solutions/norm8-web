import { readFileSync } from 'node:fs';
import path from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import type { ProposalPdfSection, ProposalPdfTemplate } from './template';

type PdfPage = {
  commands: string[];
};

type LogoImage = {
  alphaData?: Buffer;
  rgbData: Buffer;
  height: number;
  width: number;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const CONTENT_TOP = 736;
const BOTTOM_LIMIT = 88;

/**
 * Norm8 brand palette mirrored from app/globals.css, website sections and email templates.
 * PDF values are RGB fractions for PDF drawing commands.
 */
const COLORS = {
  background: '0.024 0.043 0.078', // #060B14
  backgroundDeep: '0.039 0.067 0.125', // #0A1120
  panel: '0.051 0.082 0.149', // #0D1526
  panelSoft: '0.094 0.125 0.204', // #182034
  border: '0.094 0.125 0.204', // #182034
  borderBlue: '0.110 0.235 0.500',
  accent: '0.145 0.388 0.922', // #2563EB
  accentSoft: '0.070 0.135 0.255',
  muted: '0.545 0.600 0.690',
  text: '0.910 0.929 0.973', // #E8EDF8
  textMuted: '0.710 0.760 0.850',
  textSoft: '0.800 0.835 0.900',
  white: '1 1 1',
};

export function renderProposalPdf(template: ProposalPdfTemplate): Buffer {
  const logo = loadOfficialLogo();
  const pages = buildPages(template, logo);
  return buildPdfDocument(pages, logo);
}

function buildPages(template: ProposalPdfTemplate, logo: LogoImage | null): PdfPage[] {
  const pages: PdfPage[] = [];

  pages.push(createCoverPage(template, logo));

  let page = createContentPage(template, 2, logo);
  let y = CONTENT_TOP;

  for (const [index, section] of template.sections.entries()) {
    const estimatedHeight = estimateSectionHeight(section);
    if (y - estimatedHeight < BOTTOM_LIMIT) {
      pages.push(page);
      page = createContentPage(template, pages.length + 1, logo);
      y = CONTENT_TOP;
    }

    y = addSection(page, section, y, index + 1);
  }

  pages.push(page);
  return pages;
}

function createCoverPage(template: ProposalPdfTemplate, logo: LogoImage | null): PdfPage {
  const page = createPage();

  page.commands.push(rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.background));
  page.commands.push(rect(0, PAGE_HEIGHT - 3, PAGE_WIDTH, 3, COLORS.accent));
  page.commands.push(line(66, 604, PAGE_WIDTH - 86, 604, COLORS.border, 0.5));
  page.commands.push(line(PAGE_WIDTH - 174, 604, PAGE_WIDTH - 86, 604, COLORS.accent, 0.65));

  const coverLogoX = 66;
  const coverLogoY = 744;
  const coverLogoScale = 1.25;
  const coverLogoHeight = getBrandLockupHeight(coverLogoScale, 'cover', logo);
  const eyebrowY = coverLogoY - coverLogoHeight - 24;

  addBrandLockup(page, coverLogoX, coverLogoY, coverLogoScale, 'cover', logo);
  page.commands.push(text(66, eyebrowY, 8.5, 'F2', template.eyebrow, COLORS.accent));
  page.commands.push(line(66, eyebrowY - 14, 118, eyebrowY - 14, COLORS.accent, 0.8));
  page.commands.push(...multilineText(template.title, 66, eyebrowY - 82, 34, 'F2', 415, COLORS.text, 39, 3));
  page.commands.push(...multilineText(template.subtitle, 66, eyebrowY - 172, 13.5, 'F1', 408, COLORS.textSoft, 19, 3));

  const metaTop = 286;
  page.commands.push(line(66, metaTop + 24, PAGE_WIDTH - 86, metaTop + 24, COLORS.border, 0.55));
  page.commands.push(line(66, 194, PAGE_WIDTH - 86, 194, COLORS.border, 0.45));
  page.commands.push(line(302, 208, 302, metaTop + 6, COLORS.border, 0.45));
  page.commands.push(text(66, metaTop, 8.4, 'F2', 'CLIENTE', COLORS.accent));
  page.commands.push(...multilineText(template.companyName, 66, metaTop - 27, 17.5, 'F2', 206, COLORS.text, 23, 2));
  page.commands.push(text(66, 212, 10.3, 'F1', `Contacto: ${template.contactName}`, COLORS.textMuted));
  page.commands.push(text(326, metaTop, 8.4, 'F2', 'DOCUMENTO', COLORS.accent));
  page.commands.push(text(326, metaTop - 27, 10.5, 'F1', template.generatedAtLabel, COLORS.textMuted));
  page.commands.push(text(326, metaTop - 51, 10.5, 'F1', template.versionLabel, COLORS.textMuted));

  page.commands.push(line(66, 102, PAGE_WIDTH - 66, 102, COLORS.border, 0.7));
  page.commands.push(text(66, 78, 9.2, 'F1', template.footer, COLORS.muted));

  return page;
}

function createContentPage(template: ProposalPdfTemplate, pageNumber: number, logo: LogoImage | null): PdfPage {
  const page = createPage();
  page.commands.push(rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.background));
  page.commands.push(rect(0, PAGE_HEIGHT - 3, PAGE_WIDTH, 3, COLORS.accent));
  addBrandLockup(page, MARGIN_X, 792, 0.54, 'small', logo);
  page.commands.push(...multilineText(template.companyName, MARGIN_X + 112, 794, 9.5, 'F1', 320, COLORS.muted, 12, 1));
  page.commands.push(rect(MARGIN_X, 770, CONTENT_WIDTH, 1, COLORS.border));
  page.commands.push(rect(MARGIN_X, 767, 54, 1, COLORS.accent));
  page.commands.push(rect(MARGIN_X, 58, CONTENT_WIDTH, 1, COLORS.border));
  page.commands.push(text(MARGIN_X, 40, 8.5, 'F1', template.footer, COLORS.muted));
  page.commands.push(text(PAGE_WIDTH - 100, 40, 8.5, 'F1', `Página ${pageNumber}`, COLORS.muted));
  return page;
}

function addSection(page: PdfPage, section: ProposalPdfSection, startY: number, sectionNumber: number): number {
  if (section.variant === 'investment') {
    return addInvestmentSection(page, section, startY);
  }

  if (isImplementationSection(section)) {
    return addImplementationTimelineSection(page, section, startY, sectionNumber);
  }

  return addEditorialSection(page, section, startY, sectionNumber);
}

function addEditorialSection(page: PdfPage, section: ProposalPdfSection, startY: number, sectionNumber: number): number {
  const bodyLines = section.body.flatMap((body) => splitBodyLines(body, false));
  const sectionHeight = estimateEditorialSectionHeight(section);
  let y = startY;

  page.commands.push(text(MARGIN_X, y - 4, 8.5, 'F2', formatSectionNumber(sectionNumber), COLORS.accent));
  page.commands.push(line(MARGIN_X + 34, y - 1, MARGIN_X + 76, y - 1, COLORS.borderBlue, 0.55));
  page.commands.push(text(MARGIN_X + 108, y - 7, 16.5, 'F2', section.title, COLORS.text));
  page.commands.push(line(MARGIN_X, y - 30, MARGIN_X, y - sectionHeight + 22, COLORS.accent, 0.75));
  y -= 48;

  for (const bodyLine of bodyLines) {
    if (bodyLine.kind === 'gap') {
      y -= 8;
      continue;
    }

    const style = bodyLine.kind === 'label'
      ? { color: COLORS.accent, font: 'F2' as const, leading: 15, size: 9 }
      : { color: COLORS.textSoft, font: 'F1' as const, leading: 16.5, size: 10.6 };
    page.commands.push(text(MARGIN_X + 24, y, style.size, style.font, bodyLine.text, style.color));
    y -= style.leading;
  }

  page.commands.push(line(MARGIN_X + 24, startY - sectionHeight + 14, PAGE_WIDTH - MARGIN_X - 18, startY - sectionHeight + 14, COLORS.border, 0.35));
  return startY - sectionHeight - 12;
}

function addImplementationTimelineSection(page: PdfPage, section: ProposalPdfSection, startY: number, sectionNumber: number): number {
  const phases = splitPhaseItems(section.body.join('\n'));

  if (phases.length < 2) {
    return addEditorialSection(page, section, startY, sectionNumber);
  }

  const sectionHeight = estimateImplementationSectionHeight(section);
  let y = startY;

  page.commands.push(text(MARGIN_X, y - 4, 8.5, 'F2', formatSectionNumber(sectionNumber), COLORS.accent));
  page.commands.push(line(MARGIN_X + 34, y - 1, MARGIN_X + 76, y - 1, COLORS.borderBlue, 0.55));
  page.commands.push(text(MARGIN_X + 108, y - 7, 16.5, 'F2', section.title, COLORS.text));
  y -= 48;

  const lineX = MARGIN_X + 18;
  page.commands.push(line(lineX, y + 8, lineX, startY - sectionHeight + 34, COLORS.borderBlue, 0.55));

  phases.forEach((phase, index) => {
    page.commands.push(fillCircle(lineX, y + 1, 3.2, COLORS.accent));
    page.commands.push(text(MARGIN_X + 38, y + 4, 8.4, 'F2', `FASE ${index + 1}`, COLORS.accent));
    page.commands.push(...multilineText(phase, MARGIN_X + 38, y - 14, 10.7, 'F1', CONTENT_WIDTH - 62, COLORS.textSoft, 16, 3));
    y -= 52;
  });

  page.commands.push(line(MARGIN_X + 24, startY - sectionHeight + 14, PAGE_WIDTH - MARGIN_X - 18, startY - sectionHeight + 14, COLORS.border, 0.35));
  return startY - sectionHeight - 14;
}

function addInvestmentSection(page: PdfPage, section: ProposalPdfSection, startY: number): number {
  const bodyLines = section.body.flatMap((body) => splitBodyLines(body, true));
  const sectionHeight = estimateInvestmentSectionHeight(section);
  let y = startY;

  page.commands.push(rect(MARGIN_X + 18, y - sectionHeight + 20, CONTENT_WIDTH - 36, sectionHeight - 20, COLORS.accentSoft));
  page.commands.push(line(MARGIN_X + 34, y - 22, PAGE_WIDTH - MARGIN_X - 40, y - 22, COLORS.borderBlue, 0.55));
  page.commands.push(text(MARGIN_X + 30, y - 4, 8.7, 'F2', 'INVESTIMENTO', COLORS.accent));
  page.commands.push(text(MARGIN_X + 30, y - 38, 16.5, 'F2', section.title, COLORS.white));
  y -= 72;

  for (const bodyLine of bodyLines) {
    if (bodyLine.kind === 'gap') {
      y -= 8;
      continue;
    }

    const style = bodyLine.kind === 'value'
      ? { color: COLORS.white, font: 'F2' as const, leading: 31, size: 24 }
      : { color: COLORS.textSoft, font: 'F1' as const, leading: 15.5, size: 10.2 };
    page.commands.push(text(MARGIN_X + 30, y, style.size, style.font, bodyLine.text, style.color));
    y -= style.leading;
  }

  return startY - sectionHeight - 18;
}

function splitBodyLines(body: string, investment: boolean): Array<{ kind: 'gap' | 'label' | 'text' | 'value'; leading: number; text: string }> {
  const paragraphs = body
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const lines: Array<{ kind: 'gap' | 'label' | 'text' | 'value'; leading: number; text: string }> = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const isValue = investment && paragraphIndex === 0;
    const maxWidth = isValue ? CONTENT_WIDTH - 60 : CONTENT_WIDTH - 44;
    const fontSize = isValue ? 23 : 10.6;
    const wrapped = wrapText(normalizePdfCopy(paragraph), maxWidth, fontSize);

    wrapped.forEach((line, lineIndex) => {
      lines.push({
        kind: isValue ? 'value' : looksLikeLabelLine(line) && lineIndex === 0 ? 'label' : 'text',
        leading: isValue ? 30 : 16.5,
        text: line,
      });
    });

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push({ kind: 'gap', leading: 8, text: '' });
    }
  });

  return lines.length > 0 ? lines : [{ kind: 'text', leading: 16.5, text: '-' }];
}

function estimateSectionHeight(section: ProposalPdfSection): number {
  if (section.variant === 'investment') {
    return estimateInvestmentSectionHeight(section);
  }

  if (isImplementationSection(section) && splitPhaseItems(section.body.join('\n')).length >= 2) {
    return estimateImplementationSectionHeight(section);
  }

  return estimateEditorialSectionHeight(section);
}

function estimateEditorialSectionHeight(section: ProposalPdfSection): number {
  const lines = section.body.flatMap((body) => splitBodyLines(body, false));
  return Math.max(92, 58 + lines.reduce((total, line) => total + (line.kind === 'gap' ? 8 : line.leading), 0));
}

function estimateImplementationSectionHeight(section: ProposalPdfSection): number {
  return Math.max(130, 58 + splitPhaseItems(section.body.join('\n')).length * 52);
}

function estimateInvestmentSectionHeight(section: ProposalPdfSection): number {
  const lines = section.body.flatMap((body) => splitBodyLines(body, true));
  return Math.max(124, 86 + lines.reduce((total, line) => total + (line.kind === 'gap' ? 8 : line.leading), 0));
}


function formatSectionNumber(sectionNumber: number): string {
  return String(sectionNumber).padStart(2, '0');
}

function isImplementationSection(section: ProposalPdfSection): boolean {
  return section.title.toLowerCase().includes('implementação');
}

function splitPhaseItems(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^Fase\s+\d+\s+-\s+/i.test(line))
    .map((line) => line.replace(/^Fase\s+\d+\s+-\s+/i, '').trim());
}

function getBrandLockupHeight(scale: number, variant: 'cover' | 'small', logo: LogoImage | null): number {
  if (logo) {
    const logoWidth = variant === 'cover' ? 156 * scale : 118 * scale;
    return logoWidth * (logo.height / logo.width);
  }

  return 25 * scale;
}

function addBrandLockup(
  page: PdfPage,
  x: number,
  y: number,
  scale: number,
  variant: 'cover' | 'small',
  logo: LogoImage | null,
): void {
  if (logo) {
    const logoWidth = variant === 'cover' ? 156 * scale : 118 * scale;
    const logoHeight = logoWidth * (logo.height / logo.width);
    page.commands.push(image('Logo', x, y - logoHeight, logoWidth, logoHeight));
    return;
  }

  const markSize = 25 * scale;
  const wordSize = variant === 'cover' ? 28 * scale : 20 * scale;
  const labelSize = variant === 'cover' ? 7.5 * scale : 6.5 * scale;
  const wordX = x + markSize + 11 * scale;

  page.commands.push(rect(x, y - markSize + 4 * scale, markSize, markSize, COLORS.accent));
  page.commands.push(rect(x + 5 * scale, y - markSize + 9 * scale, markSize - 10 * scale, 3 * scale, COLORS.white));
  page.commands.push(rect(x + 5 * scale, y - markSize + 16 * scale, markSize - 10 * scale, 3 * scale, COLORS.white));
  page.commands.push(text(wordX, y - 16 * scale, wordSize, 'F2', 'NORM8', COLORS.text));
  page.commands.push(text(wordX + 1 * scale, y - 29 * scale, labelSize, 'F2', 'AI OPERATIONS SYSTEMS', COLORS.accent));
}

function createPage(): PdfPage {
  return { commands: [] };
}

function buildPdfDocument(pages: PdfPage[], logo: LogoImage | null): Buffer {
  const objects: string[] = [];
  const addObject = (body: string): number => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('');
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const logoMaskId = logo?.alphaData
    ? addObject(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${logo.alphaData.length} >>\nstream\n${logo.alphaData.toString('latin1')}\nendstream`)
    : null;
  const logoId = logo
    ? addObject(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${logoMaskId ? ` /SMask ${logoMaskId} 0 R` : ''} /Length ${logo.rgbData.length} >>\nstream\n${logo.rgbData.toString('latin1')}\nendstream`)
    : null;
  const pageIds: number[] = [];

  for (const page of pages) {
    const stream = page.commands.join('\n');
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    const xObjectResource = logoId ? ` /XObject << /Logo ${logoId} 0 R >>` : '';
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >>${xObjectResource} >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  const chunks: string[] = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
  const offsets: number[] = [0];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(chunks.join(''), 'latin1'));
    chunks.push(`${index + 1} 0 obj\n${body}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(chunks.join(''), 'latin1');
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push('0000000000 65535 f \n');

  for (let index = 1; index <= objects.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }

  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`);
  chunks.push(`startxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.from(chunks.join(''), 'latin1');
}

function multilineText(
  value: string,
  x: number,
  y: number,
  size: number,
  fontName: 'F1' | 'F2',
  width: number,
  color: string,
  leading: number,
  maxLines: number,
): string[] {
  return wrapText(value, width, size)
    .slice(0, maxLines)
    .map((line, index) => text(x, y - index * leading, size, fontName, line, color));
}

function wrapText(value: string, width: number, fontSize: number): string[] {
  const normalized = normalizePdfCopy(value);
  const maxChars = Math.max(18, Math.floor(width / (fontSize * 0.48)));
  const words = normalized.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const safeWord = word.length > maxChars ? splitLongWord(word, maxChars) : [word];

    for (const part of safeWord) {
      const next = current ? `${current} ${part}` : part;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = part;
      } else {
        current = next;
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : ['-'];
}

function splitLongWord(word: string, maxChars: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < word.length; index += maxChars - 1) {
    chunks.push(word.slice(index, index + maxChars - 1));
  }
  return chunks;
}

function image(name: string, x: number, y: number, width: number, height: number): string {
  return `q ${width} 0 0 ${height} ${x} ${y} cm /${name} Do Q`;
}

function line(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number): string {
  return `${color} RG ${lineWidth} w ${x1} ${y1} m ${x2} ${y2} l S`;
}

function fillCircle(x: number, y: number, radius: number, color: string): string {
  const c = radius * 0.5522847498;
  return `${color} rg ${x + radius} ${y} m ${x + radius} ${y + c} ${x + c} ${y + radius} ${x} ${y + radius} c ${x - c} ${y + radius} ${x - radius} ${y + c} ${x - radius} ${y} c ${x - radius} ${y - c} ${x - c} ${y - radius} ${x} ${y - radius} c ${x + c} ${y - radius} ${x + radius} ${y - c} ${x + radius} ${y} c f`;
}


function text(
  x: number,
  y: number,
  size: number,
  fontName: 'F1' | 'F2',
  value: string,
  color: string,
): string {
  return `BT /${fontName} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm ${pdfText(value)} Tj ET`;
}

function rect(x: number, y: number, width: number, height: number, color: string): string {
  return `${color} rg ${x} ${y} ${width} ${height} re f`;
}

function strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth: number): string {
  return `${color} RG ${lineWidth} w ${x} ${y} ${width} ${height} re S`;
}

function looksLikeLabelLine(value: string): boolean {
  return /^[A-Za-zÀ-ÿ ]+:/.test(value);
}

function normalizePdfCopy(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[•]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfText(value: string): string {
  const escaped = [...normalizePdfCopy(value)]
    .map((character) => escapePdfByte(toWinAnsiByte(character)))
    .join('');

  return `(${escaped})`;
}

function toWinAnsiByte(character: string): number {
  const code = character.codePointAt(0) ?? 32;

  if (code <= 0xff) {
    return code;
  }

  if (character === '€') {
    return 0x80;
  }

  return 0x3f;
}

function escapePdfByte(byte: number): string {
  if (byte === 0x28 || byte === 0x29 || byte === 0x5c) {
    return `\\${String.fromCharCode(byte)}`;
  }

  if (byte < 0x20 || byte > 0x7e) {
    return `\\${byte.toString(8).padStart(3, '0')}`;
  }

  return String.fromCharCode(byte);
}

function loadOfficialLogo(): LogoImage | null {
  const logoPath = path.join(process.cwd(), 'public', 'brand', 'norm8-logo.png');

  try {
    const png = parsePng(readFileSync(logoPath));
    const imageData = buildLogoImageData(png);
    return {
      alphaData: imageData.alphaData ? deflateSync(imageData.alphaData) : undefined,
      rgbData: deflateSync(imageData.rgbData),
      height: png.height,
      width: png.width,
    };
  } catch (error) {
    console.warn('Norm8 proposal PDF logo asset not available; using fallback wordmark.', {
      error: error instanceof Error ? error.message : 'Unknown logo loading error',
      logoPath,
    });
    return null;
  }
}

type ParsedPng = {
  colorType: 2 | 6;
  data: Buffer;
  height: number;
  width: number;
};

function parsePng(buffer: Buffer): ParsedPng {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Invalid PNG signature.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!width || !height || idatChunks.length === 0) {
    throw new Error('Incomplete PNG logo data.');
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}.`);
  }

  return {
    colorType: colorType as 2 | 6,
    data: unfilterPng(inflateSync(Buffer.concat(idatChunks)), width, height, colorType === 6 ? 4 : 3),
    height,
    width,
  };
}

function unfilterPng(raw: Buffer, width: number, height: number, bytesPerPixel: number): Buffer {
  const stride = width * bytesPerPixel;
  const output = Buffer.alloc(stride * height);
  let inputOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = raw[inputOffset];
    inputOffset += 1;
    const rowOffset = row * stride;
    const previousRowOffset = rowOffset - stride;

    for (let column = 0; column < stride; column += 1) {
      const rawByte = raw[inputOffset + column];
      const left = column >= bytesPerPixel ? output[rowOffset + column - bytesPerPixel] : 0;
      const up = row > 0 ? output[previousRowOffset + column] : 0;
      const upLeft = row > 0 && column >= bytesPerPixel ? output[previousRowOffset + column - bytesPerPixel] : 0;

      output[rowOffset + column] = (rawByte + pngFilterValue(filter, left, up, upLeft)) & 0xff;
    }

    inputOffset += stride;
  }

  return output;
}

function pngFilterValue(filter: number, left: number, up: number, upLeft: number): number {
  switch (filter) {
    case 0:
      return 0;
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return Math.floor((left + up) / 2);
    case 4:
      return paethPredictor(left, up, upLeft);
    default:
      throw new Error(`Unsupported PNG filter: ${filter}.`);
  }
}

function paethPredictor(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}

function buildLogoImageData(png: ParsedPng): { alphaData?: Buffer; rgbData: Buffer } {
  const sourceBytesPerPixel = png.colorType === 6 ? 4 : 3;
  const rgbData = Buffer.alloc(png.width * png.height * 3);
  const alphaData = png.colorType === 6 ? Buffer.alloc(png.width * png.height) : undefined;
  let hasTransparency = false;

  for (let source = 0, target = 0, alphaTarget = 0; source < png.data.length; source += sourceBytesPerPixel, target += 3, alphaTarget += 1) {
    rgbData[target] = png.data[source];
    rgbData[target + 1] = png.data[source + 1];
    rgbData[target + 2] = png.data[source + 2];

    if (alphaData) {
      const alpha = png.data[source + 3];
      alphaData[alphaTarget] = alpha;
      hasTransparency ||= alpha < 255;
    }
  }

  return {
    alphaData: hasTransparency ? alphaData : undefined,
    rgbData,
  };
}

