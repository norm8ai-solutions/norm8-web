export const documentTheme = {
  primary: '#2563eb',
  primaryDark: '#0f2f7a',
  background: '#f5f7fb',
  surface: '#ffffff',
  textPrimary: '#101828',
  textSecondary: '#475467',
  border: '#d8dee8',
  muted: '#eef2f7',
  success: '#12805c',
  warning: '#b7791f',
  danger: '#b42318',
} as const;

export const documentCss = `
  :root {
    --doc-primary: ${documentTheme.primary};
    --doc-primary-dark: ${documentTheme.primaryDark};
    --doc-bg: ${documentTheme.background};
    --doc-surface: ${documentTheme.surface};
    --doc-text: ${documentTheme.textPrimary};
    --doc-muted: ${documentTheme.textSecondary};
    --doc-border: ${documentTheme.border};
    --doc-soft: ${documentTheme.muted};
    --doc-success: ${documentTheme.success};
    --doc-warning: ${documentTheme.warning};
    --doc-danger: ${documentTheme.danger};
  }

  * { box-sizing: border-box; }

  body {
    background: var(--doc-bg);
    color: var(--doc-text);
    font-family: Inter, Arial, Helvetica, sans-serif;
    margin: 0;
  }

  .contract-document {
    display: grid;
    gap: 22px;
    justify-items: center;
    padding: 28px 0;
  }

  .contract-document-page {
    background: var(--doc-surface);
    border: 1px solid rgba(16, 24, 40, 0.08);
    box-shadow: 0 16px 50px rgba(15, 23, 42, 0.12);
    color: var(--doc-text);
    display: flex;
    flex-direction: column;
    min-height: 297mm;
    overflow: hidden;
    padding: 18mm 18mm 14mm;
    page-break-after: always;
    position: relative;
    width: 210mm;
  }

  .contract-document-page:last-child { page-break-after: auto; }

  .contract-page-header,
  .contract-page-footer {
    align-items: center;
    color: var(--doc-muted);
    display: flex;
    font-size: 9px;
    justify-content: space-between;
    letter-spacing: 0.02em;
  }

  .contract-page-header {
    border-bottom: 1px solid var(--doc-border);
    margin-bottom: 18px;
    padding-bottom: 9px;
  }

  .contract-page-footer {
    border-top: 1px solid var(--doc-border);
    margin-top: auto;
    padding-top: 9px;
  }

  .contract-page-content {
    display: grid;
    gap: 18px;
  }

  .contract-cover {
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    justify-content: flex-start;
  }

  .contract-cover .contract-page-content {
    align-content: unset;
    display: flex;
    flex-direction: column;
    gap: 0;
    justify-content: flex-start;
  }

  .contract-logo {
    display: block;
    height: auto;
    max-height: 54px;
    max-width: 150px;
    object-fit: contain;
    width: 150px;
  }

  .contract-cover-logo-wrap {
    align-items: flex-start;
    display: flex;
    line-height: 0;
    margin-bottom: 16px;
    margin-left: -20px;
    min-height: 0;
    padding: 0;
  }

  .contract-cover-title-block {
    margin: 0;
    padding: 0;
  }

  .contract-cover-title-block .contract-eyebrow {
    margin-top: 0;
  }

  .contract-cover .contract-meta-grid {
    margin-top: 56px;
  }

  .contract-cover-logo {
    max-height: 76px;
    max-width: 200px;
    width: 200px;
  }
  .contract-logo-fallback {
    color: var(--doc-text);
    display: inline-block;
    font-size: 24px;
    font-weight: 850;
    letter-spacing: 0;
    line-height: 1;
  }

  .contract-eyebrow {
    color: var(--doc-primary);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    margin: 0 0 10px;
    text-transform: uppercase;
  }

  .contract-title {
    color: var(--doc-text);
    font-size: 34px;
    font-weight: 850;
    letter-spacing: 0;
    line-height: 1.08;
    margin: 0;
  }

  .contract-subtitle {
    color: var(--doc-muted);
    font-size: 15px;
    line-height: 1.55;
    margin: 12px 0 0;
    max-width: 560px;
  }

  .contract-section-title {
    color: var(--doc-text);
    font-size: 22px;
    font-weight: 820;
    line-height: 1.2;
    margin: 0;
    page-break-after: avoid;
  }

  .contract-section-lead {
    color: var(--doc-muted);
    font-size: 12px;
    line-height: 1.55;
    margin: 0;
  }

  .contract-grid-2,
  .contract-grid-3 {
    display: grid;
    gap: 12px;
  }

  .contract-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .contract-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

  .contract-card,
  .contract-warning,
  .contract-table-wrap {
    border: 1px solid var(--doc-border);
    border-radius: 8px;
    page-break-inside: avoid;
  }

  .contract-card {
    background: #ffffff;
    display: grid;
    gap: 8px;
    padding: 13px;
  }

  .contract-card strong {
    color: var(--doc-text);
    font-size: 12px;
  }

  .contract-card span,
  .contract-card p,
  .contract-list li,
  .contract-clause p {
    color: var(--doc-muted);
    font-size: 11px;
    line-height: 1.55;
    margin: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  .contract-warning {
    background: #fff7ed;
    color: #9a3412;
    font-size: 11px;
    line-height: 1.45;
    padding: 10px 12px;
  }

  .contract-meta-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 28px;
  }

  .contract-meta-item {
    border-top: 1px solid var(--doc-border);
    display: grid;
    gap: 4px;
    padding-top: 9px;
  }

  .contract-meta-item span {
    color: var(--doc-muted);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .contract-meta-item strong {
    color: var(--doc-text);
    font-size: 12px;
  }

  .contract-index-list {
    counter-reset: section;
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
  }

  .contract-index-item {
    align-items: center;
    border-bottom: 1px solid var(--doc-border);
    display: grid;
    gap: 12px;
    grid-template-columns: 32px minmax(0, 1fr) 52px;
    list-style: none;
    padding: 9px 0;
  }

  .contract-index-number {
    align-items: center;
    background: var(--doc-soft);
    border-radius: 999px;
    color: var(--doc-primary-dark);
    display: inline-flex;
    font-size: 10px;
    font-weight: 850;
    height: 26px;
    justify-content: center;
    width: 26px;
  }

  .contract-table {
    border-collapse: collapse;
    font-size: 10.5px;
    width: 100%;
  }

  .contract-table th,
  .contract-table td {
    border-bottom: 1px solid var(--doc-border);
    line-height: 1.45;
    padding: 8px;
    text-align: left;
    vertical-align: top;
  }

  .contract-table th {
    background: #f8fafc;
    color: var(--doc-muted);
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .contract-table tr:last-child td { border-bottom: 0; }

  .contract-growth {
    align-items: stretch;
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .contract-growth-card {
    background: #f8fafc;
    border: 1px solid var(--doc-border);
    border-radius: 8px;
    display: grid;
    gap: 8px;
    opacity: 0.48;
    padding: 14px;
    page-break-inside: avoid;
  }

  .contract-growth-card-active {
    background: #eff6ff;
    border-color: #93c5fd;
    opacity: 1;
  }

  .contract-clause {
    border-top: 1px solid var(--doc-border);
    display: grid;
    gap: 7px;
    padding: 12px 0;
    page-break-inside: avoid;
  }

  .contract-clause h3 {
    color: var(--doc-text);
    font-size: 13px;
    margin: 0;
  }

  .contract-signature-grid {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 28px;
  }

  .contract-signature-line {
    border-top: 1px solid var(--doc-text);
    display: grid;
    gap: 5px;
    margin-top: 54px;
    padding-top: 9px;
  }

  @media print {
    body { background: #ffffff; }
    .contract-document { gap: 0; padding: 0; }
    .contract-document-page {
      border: 0;
      box-shadow: none;
      min-height: 297mm;
      width: 210mm;
    }
  }

  @page {
    margin: 0;
    size: A4;
  }
`;