export function safePdfFilename(prefix: string, value: string, date = new Date()) {
  const clean = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'report';
  const day = date.toISOString().slice(0, 10);
  return `${prefix}-${clean}-${day}.pdf`;
}
