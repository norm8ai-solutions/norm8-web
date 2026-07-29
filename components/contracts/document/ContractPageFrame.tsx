import type { ReactNode } from 'react';
import { formatDocumentDate } from '@/lib/contracts/document/formatters';
import type { ContractDocumentData } from '@/lib/contracts/document/types';

type ContractPageFrameProps = {
  children: ReactNode;
  contract: ContractDocumentData;
  pageNumber?: number;
  showPageNumber?: boolean;
  title: string;
  totalPages?: number;
  variant?: 'cover' | 'default';
};

export function ContractPageFrame({ children, contract, pageNumber, showPageNumber = Boolean(pageNumber), title, totalPages, variant = 'default' }: ContractPageFrameProps) {
  const footerPageLabel = showPageNumber && pageNumber ? formatPageLabel(pageNumber, totalPages) : formatDocumentDate(contract.issueDate);

  return (
    <article className={`contract-document-page ${variant === 'cover' ? 'contract-cover' : ''}`} id={slugTitle(title)}>
      {variant === 'default' ? (
        <header className="contract-page-header">
          <span>Norm8 · {contract.number} · {contract.versionLabel}</span>
          <span>{title}</span>
        </header>
      ) : null}
      <div className="contract-page-content">{children}</div>
      <footer className="contract-page-footer">
        <span>norm8.pt</span>
        <span>{footerPageLabel}</span>
      </footer>
    </article>
  );
}

export function ContractLogo({ src, variant = 'default' }: { src?: string | null; variant?: 'cover' | 'default' }) {
  const logoClassName = `contract-logo ${variant === 'cover' ? 'contract-cover-logo' : ''}`.trim();

  if (!src) return <span className="contract-logo-fallback">Norm8</span>;

  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="Norm8" className={logoClassName} src={src} />;
}

export function SectionHeading({ lead, title }: { lead?: string; title: string }) {
  return (
    <div>
      <p className="contract-eyebrow">Contrato Norm8</p>
      <h2 className="contract-section-title">{title}</h2>
      {lead ? <p className="contract-section-lead">{lead}</p> : null}
    </div>
  );
}

export function InfoCard({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="contract-card contract-avoid-break">
      <strong>{label}</strong>
      <span>{value || 'Por definir'}</span>
    </div>
  );
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="contract-warning contract-avoid-break">
      <strong>Conteúdo a rever:</strong> {warnings.join(' ')}
    </div>
  );
}

function formatPageLabel(pageNumber: number, totalPages?: number): string {
  if (!totalPages) return `Página ${pageNumber}`;
  return `${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`;
}

function slugTitle(title: string): string {
  return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
