import type { ReactNode } from 'react';
import { formatDocumentDate } from '@/lib/contracts/document/formatters';
import type { ContractDocumentData } from '@/lib/contracts/document/types';

type ContractPageFrameProps = {
  children: ReactNode;
  contract: ContractDocumentData;
  pageNumber?: number;
  title: string;
  variant?: 'cover' | 'default';
};

export function ContractPageFrame({ children, contract, pageNumber, title, variant = 'default' }: ContractPageFrameProps) {
  return (
    <article className={`contract-document-page ${variant === 'cover' ? 'contract-cover' : ''}`} id={slugTitle(title)}>
      {variant === 'default' ? (
        <header className="contract-page-header">
          <span>Norm8 - {contract.number} - v{contract.version}</span>
          <span>{title}</span>
        </header>
      ) : null}
      <div className="contract-page-content">{children}</div>
      <footer className="contract-page-footer">
        <span>Norm8 - Sistemas de IA para operações mais claras, rápidas e escaláveis.</span>
        <span>{pageNumber ? `Página ${pageNumber}` : formatDocumentDate(contract.issueDate)} - norm8.pt</span>
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
    <div className="contract-card">
      <strong>{label}</strong>
      <span>{value || 'Por definir'}</span>
    </div>
  );
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="contract-warning">
      <strong>Conteúdo a rever:</strong> {warnings.join(' ')}
    </div>
  );
}

function slugTitle(title: string): string {
  return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}