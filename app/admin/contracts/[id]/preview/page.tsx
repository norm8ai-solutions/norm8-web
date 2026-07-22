import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, PenLine } from 'lucide-react';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { ContractPreviewPdfActions } from '@/components/contracts/ContractPreviewPdfActions';
import { ContractDocument, getContractDocumentPages } from '@/components/contracts/document/ContractDocument';
import { getContractDocumentData } from '@/lib/contracts/document/data';
import { documentCss } from '@/lib/contracts/document/theme';

const zoomOptions = [75, 100, 125] as const;

type ContractPreviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; generated?: string; missing?: string; pdf?: string; zoom?: string }>;
};

type ContractPreviewData = NonNullable<Awaited<ReturnType<typeof getContractDocumentData>>>;
type PdfState = 'generated' | 'regenerated' | null;

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
  const hasExistingPdf = hasExistingGeneratedPdf(contract);

  return (
    <div className="admin-page-grid">
      <style dangerouslySetInnerHTML={{ __html: documentCss }} />
      <AdminPanel
        title={`Preview ${contract.number}`}
        subtitle="Pré-visualização A4 do contrato gerado a partir dos snapshots e dados estruturados."
        action={
          <div className="admin-filters">
            <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}`}><ArrowLeft size={14} />Voltar</Link>
            {canEdit ? <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}/edit`}><PenLine size={14} />Editar</Link> : null}
            <ContractPreviewPdfActions canGenerate={canGenerate} contractId={contract.id} hasExistingPdf={hasExistingPdf} pdfUrl={contract.pdfUrl} zoom={zoom} />
          </div>
        }
      >
        <div className="contract-preview-status-stack">
          <ContractPdfStatusBanner contract={contract} error={query?.error} missing={query?.missing} pdfState={resolvePdfState(query?.pdf, query?.generated)} />
          {contract.warnings.length > 0 ? (
            <div className="admin-execution-summary admin-execution-summary-danger">
              <strong>Conteúdo incompleto</strong>
              {contract.warnings.map((warning) => <span key={warning}>{warning}</span>)}
            </div>
          ) : null}
          <div className="contract-preview-toolbar">
            <div className="contract-preview-zoom-controls">
              <span className="contract-preview-toolbar-label">Zoom</span>
              <div className="admin-filters">
                {zoomOptions.map((option) => <Link className={`admin-button ${zoom === option ? '' : 'admin-button-muted'}`} href={`/admin/contracts/${contract.id}/preview?zoom=${option}`} key={option}>{option}%</Link>)}
              </div>
            </div>
            <span className="contract-preview-page-count">{pages.length} páginas</span>
          </div>
        </div>
      </AdminPanel>

      <section className="contract-preview-layout">
        <aside className="contract-preview-sidebar">
          <p className="admin-row-title">Secções</p>
          {pages.filter((page) => !page.isContinuation).map((page) => <a className="contract-preview-nav-link" href={`#${slugTitle(page.title)}`} key={page.id}>{page.pageNumber}. {page.title}</a>)}
        </aside>
        <div className="contract-preview-scroll">
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', width: `${10000 / zoom}%` }}>
            <ContractDocument contract={contract} includeStyles={false} />
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

function hasExistingGeneratedPdf(contract: ContractPreviewData): boolean {
  return Boolean(contract.pdfUrl || contract.pdfStorageKey || contract.pdfHash || contract.generatedAt);
}

function resolvePdfState(pdfState: string | undefined, legacyGenerated: string | undefined): PdfState {
  if (pdfState === 'generated' || pdfState === 'regenerated') return pdfState;
  return legacyGenerated === '1' ? 'generated' : null;
}

function ContractPdfStatusBanner({ contract, error, missing, pdfState }: { contract: ContractPreviewData; error?: string; missing?: string; pdfState: PdfState }) {
  if (error) {
    return (
      <div className="contract-preview-status-banner contract-preview-status-banner-error">
        <strong>{formatError(error)}</strong>
        <span>{missing ? `Campos em falta: ${missing}.` : 'O PDF anterior foi mantido. Pode tentar novamente.'}</span>
      </div>
    );
  }

  if (pdfState === 'regenerated') {
    return (
      <div className="contract-preview-status-banner contract-preview-status-banner-success">
        <strong>PDF regenerado com sucesso.</strong>
        <span>Nova versão criada e associada ao contrato.{contract.generatedAt ? ` Última geração: ${formatGeneratedAt(contract.generatedAt)}.` : ''}</span>
      </div>
    );
  }

  if (pdfState === 'generated') {
    return (
      <div className="contract-preview-status-banner contract-preview-status-banner-success">
        <strong>PDF gerado e associado ao contrato.</strong>
        <span>{contract.generatedAt ? `Última geração: ${formatGeneratedAt(contract.generatedAt)}.` : 'O documento ficou disponível para download.'}</span>
      </div>
    );
  }

  if (hasExistingGeneratedPdf(contract)) {
    return (
      <div className="contract-preview-status-banner contract-preview-status-banner-neutral">
        <strong>PDF disponível para download.</strong>
        <span>{contract.generatedAt ? `Última geração: ${formatGeneratedAt(contract.generatedAt)}.` : 'O contrato já tem um PDF associado.'}</span>
      </div>
    );
  }

  return (
    <div className="contract-preview-status-banner contract-preview-status-banner-neutral">
      <strong>PDF ainda não gerado.</strong>
      <span>Revê o preview A4 e gera o documento quando estiver pronto.</span>
    </div>
  );
}

function formatGeneratedAt(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'data indisponível';
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Lisbon',
  }).format(date);
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
    missing_client_tax_id: 'Não é possível gerar o contrato final sem o NIF do cliente.',
    missing_client_legal: 'Não é possível gerar o contrato final porque existem dados legais do cliente em falta.',
    missing_provider_legal: 'Não é possível gerar o contrato final porque existem dados legais da Norm8 em falta.',
    missing_service_plan: 'Não é possível gerar o contrato final porque existem dados do serviço e plano em falta.',
    missing_scope_deliverables: 'Não é possível gerar o contrato final porque existem entregáveis incompletos.',
    missing_timeline: 'Não é possível gerar o contrato final porque existem dados do cronograma em falta.',
    missing_financials: 'Não é possível gerar o contrato final porque existem dados de investimento e pagamentos em falta.',
    missing_clauses: 'Cláusulas obrigatórias em falta.',
    missing_logo: 'Logótipo de contrato não encontrado em public/brand/norm8-logo-black.png.',
    storage: 'Storage de contratos não configurado.',
    playwright: 'Playwright indisponível para gerar PDF.',
    write_failed: 'Não foi possível guardar o PDF.',
    hash_failed: 'Não foi possível calcular o hash do PDF.',
    locked: 'Contratos assinados não podem ser regenerados diretamente.',
    admin_missing: 'Não existe um utilizador admin ativo para associar ao PDF.',
    unknown: 'Não foi possível gerar o PDF.',
  };
  return map[error] ?? map.unknown;
}

function PreviewError({ message }: { message: string }) {
  return <AdminPanel title="Preview indisponível"><p className="admin-action-execution-error">{message}</p></AdminPanel>;
}
