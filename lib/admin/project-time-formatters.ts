export function parseDurationToMinutes(value: string): number | null {
  const raw = value.trim().toLowerCase().replace(',', '.');
  if (!raw) return null;

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return Math.round(Number(raw) * 60);
  }

  let totalMinutes = 0;
  let matched = false;
  let cursor = 0;
  const matcher = /(\d+(?:\.\d+)?)\s*([hm])/g;

  for (const match of raw.matchAll(matcher)) {
    const gap = raw.slice(cursor, match.index);
    if (gap.trim()) return null;

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount < 0) return null;

    totalMinutes += match[2] === 'h' ? amount * 60 : amount;
    cursor = match.index + match[0].length;
    matched = true;
  }

  if (!matched || raw.slice(cursor).trim()) return null;
  return Math.round(totalMinutes);
}

export function isValidDurationEstimate(value: string): boolean {
  return !value.trim() || parseDurationToMinutes(value) !== null;
}

export function formatMinutesAsEstimate(minutes: number | null): string {
  if (minutes === null || minutes < 0) return '';
  if (minutes === 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) return `${hours}h ${remainingMinutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainingMinutes}m`;
}