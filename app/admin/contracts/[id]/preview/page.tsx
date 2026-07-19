import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, FileText, PenLine } from 'lucide-react';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { ContractDocument, getContractDocumentPages } from '@/components/contracts/document/ContractDocument';
import { getContractDocumentData } from '@/lib/contracts/document/data';

const zoomOptions = [75, 100, 125] as const;

type ContractPreviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; generated?: string; zoom?: string }>;
};

export default async function ContractPreviewPage({ params, searchParams }: ContractPreviewPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const zoom = parseZoom(query?.zoom);
  const contract = await loadContractSafely(id);

  if (!contract) {
    if (query?.error === 'database') {
      return <PreviewError message="Não foi possível carregar o contrato neste momento. Verifique a ligação à base de dados e tente novamente." />;
    }
    notFound();
  }

  const pages = getContractDocumentPages(contract);
  const canEdit = contract.status === 'DRAFT' || contract.status === 'IN_REVIEW';
  const canGenerate = contract.status !== 'SIGNED';

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title={`Preview ${contract.number}`}
        subtitle="Pré-visualização A4 do contrato gerado a partir dos snapshots e dados estruturados."
        action={
          <div className="admin-filters">
            <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}`}><ArrowLeft size={14} />Voltar</Link>
            {canEdit ? <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}/edit`}><PenLine size={14} />Editar</Link> : null}
            {contract.pdfUrl ? <Link className="admin-button" href={contract.pdfUrl} target="_blank"><Download size={14} />Descarregar PDF</Link> : null}
            {canGenerate ? (
              <form action={`/api/contracts/${contract.id}/generate-pdf`} method="post">
                <button className="admin-button" type="submit"><FileText size={14} />{contract.pdfUrl ? 'Regenerar PDF' : 'Gerar PDF'}</button>
              </form>
            ) : <span className="admin-pill">Regeneração bloqueada em contratos assinados</span>}
          </div>
        }
      >
        {query?.generated === '1' ? <p className="admin-execution-success">PDF gerado e associado ao contrato.</p> : null}
        {query?.error ? <p className="admin-action-execution-error">{formatError(query.error)}</p> : null}
        {contract.warnings.length > 0 ? (
          <div className="admin-execution-summary admin-execution-summary-danger" style={{ marginBottom: 14 }}>
            <strong>Conteúdo incompleto</strong>
            {contract.warnings.map((warning) => <span key={warning}>{warning}</span>)}
          </div>
        ) : null}
        <div className="contract-preview-toolbar">
          <div className="admin-filters">
            {zoomOptions.map((option) => <Link className={`admin-button ${zoom === option ? '' : 'admin-button-muted'}`} href={`/admin/contracts/${contract.id}/preview?zoom=${option}`} key={option}>{option}%</Link>)}
          </div>
          <span className="admin-row-meta">{pages.length} páginas estimadas</span>
        </div>
      </AdminPanel>

      <section className="contract-preview-layout">
        <aside className="contract-preview-sidebar">
          <p className="admin-row-title">Secções</p>
          {pages.map((page) => <a className="contract-preview-nav-link" href={`#${slugTitle(page.title)}`} key={page.id}>{page.estimatedPage}. {page.title}</a>)}
        </aside>
        <div className="contract-preview-scroll">
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', width: `${10000 / zoom}%` }}>
            <ContractDocument contract={contract} />
          </div>
        </div>
      </section>
    </div>
  );
}

async function loadContractSafely(id: string) {
  try {
    return await getContractDocumentData(id);
  } catch (error) {
    console.error('Failed to load contract preview', { contractId: id, error });
    return null;
  }
}

function parseZoom(value: string | undefined): 75 | 100 | 125 {
  const parsed = Number(value);
  return parsed === 75 || parsed === 125 ? parsed : 100;
}

function slugTitle(title: string): string {
  return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatError(error: string): string {
  const map: Record<string, string> = {
    not_found: 'Contrato não encontrado.',
    missing_legal: 'Dados legais da Norm8 em falta.',
    missing_client: 'Dados do cliente em falta.',
    missing_clauses: 'Cláusulas obrigatórias em falta.',
    storage: 'Storage de contratos não configurado.',
    playwright: 'Playwright indisponível para gerar PDF.',
    write_failed: 'Não foi possível guardar o PDF.',
    hash_failed: 'Não foi possível calcular o hash do PDF.',
    locked: 'Contratos assinados não podem ser regenerados diretamente.',
    unknown: 'Não foi possível gerar o PDF.',
  };
  return map[error] ?? map.unknown;
}

function PreviewError({ message }: { message: string }) {
  return <AdminPanel title="Preview indisponível"><p className="admin-action-execution-error">{message}</p></AdminPanel>;
}