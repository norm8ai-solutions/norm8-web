/**
 * Repairs common UTF-8 mojibake seen in Portuguese text before it reaches UI or Proposal persistence.
 * Correct text is returned unchanged.
 */
const WINDOWS_1252_SPECIAL_BYTES: Record<string, number> = {
  '\u20ac': 0x80,
  '\u201a': 0x82,
  '\u0192': 0x83,
  '\u201e': 0x84,
  '\u2026': 0x85,
  '\u2020': 0x86,
  '\u2021': 0x87,
  '\u02c6': 0x88,
  '\u2030': 0x89,
  '\u0160': 0x8a,
  '\u2039': 0x8b,
  '\u0152': 0x8c,
  '\u017d': 0x8e,
  '\u2018': 0x91,
  '\u2019': 0x92,
  '\u201c': 0x93,
  '\u201d': 0x94,
  '\u2022': 0x95,
  '\u2013': 0x96,
  '\u2014': 0x97,
  '\u02dc': 0x98,
  '\u2122': 0x99,
  '\u0161': 0x9a,
  '\u203a': 0x9b,
  '\u0153': 0x9c,
  '\u017e': 0x9e,
  '\u0178': 0x9f,
};

const MOJIBAKE_PATTERN = /\u00c3|\u00c2|\u00e2\u20ac|\u00e2\u201a|\ufffd/;
const MOJIBAKE_SCORE_PATTERN = /\u00c3|\u00c2|\u00e2\u20ac|\u00e2\u201a|\ufffd/g;

export function normalizePortugueseText(value: string): string {
  if (!MOJIBAKE_PATTERN.test(value)) {
    return value;
  }

  let repaired = value;

  for (let pass = 0; pass < 4; pass += 1) {
    const decoded = decodeWindows1252AsUtf8(repaired);

    if (!decoded || decoded.includes('\ufffd') || mojibakeScore(decoded) >= mojibakeScore(repaired)) {
      break;
    }

    repaired = decoded;
  }

  return repaired.replace(/[ \t]{2,}/g, ' ');
}

export function normalizePortugueseTextOrNull(value: string | null | undefined): string | null {
  const normalized = normalizePortugueseText(value ?? '').trim();
  return normalized || null;
}

function mojibakeScore(value: string): number {
  return value.match(MOJIBAKE_SCORE_PATTERN)?.length ?? 0;
}

function decodeWindows1252AsUtf8(value: string): string | null {
  const bytes: number[] = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0);

    if (codePoint === undefined) {
      return null;
    }

    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    const specialByte = WINDOWS_1252_SPECIAL_BYTES[char];
    if (specialByte === undefined) {
      return null;
    }

    bytes.push(specialByte);
  }

  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}
