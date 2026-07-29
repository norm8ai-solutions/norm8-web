import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, FileText, PenLine } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminEmptyState, AdminField, AdminPanel, AdminRow } from '@/components/admin/AdminPrimitives';
import { ContractDetailPdfGenerateButton } from '@/components/contracts/ContractDetailPdfGenerateButton';
import { formatDatePt } from '@/lib/admin/formatters';
import {
  formatContractActivity,
  formatContractDate,
  formatContractPlan,
  formatContractSectionCategory,
  formatContractServiceType,
  formatContractStatus,
  formatContractValue,
} from '@/lib/contracts/formatters';
import { reopenContractForRevisionAction, updateContractStatusAction } from '@/lib/contracts/actions';
import { getContractEditability, hasUnpublishedChanges, validateContractReadyToSend } from '@/lib/contracts/governance';
import { getContractById } from '@/lib/contracts/queries';
import { repairPortugueseMojibake } from '@/lib/contracts/document/formatters';

type ContractDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; message?: string; missing?: string; status?: string; warning?: string }>;
};

export default async function ContractDetailPage({ params, searchParams }: ContractDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const contract = await getContractById(id);

  if (!contract) {
    notFound();
  }

  const clientName = getSnapshotText(contract.clientSnapshot, 'companyName') ?? getSnapshotText(contract.clientSnapshot, 'legalName') ?? displayText(contract.lead?.company) ?? 'Cliente por definir';
  const contractTitle = displayText(contract.title) ?? contract.title;
  const enabledPhases = [contract.includesLaunch ? 'Launch' : null, contract.includesOperate ? 'Operate' : null, contract.includesScale ? 'Scale' : null].filter(Boolean).join(' / ');
  const editability = getContractEditability(contract);
  const readyToSend = validateContractReadyToSend(contract);
  const hasGeneratedPdf = Boolean(contract.pdfUrl || contract.pdfStorageKey || contract.pdfHash || contract.generatedAt);
  const pdfHasUnpublishedChanges = hasUnpublishedChanges(contract);
  const hasPendingChangeReason = Boolean(contract.pendingChangeReason?.trim() && contract.pendingChangeReason.trim().length >= 8);

  return (
    <div className="admin-page-grid">
      {query?.warning === 'missing_client_legal' || query?.warning === 'missing_client_tax_id' || query?.warning === 'missing_provider_legal' || query?.warning === 'missing_contract_legal' ? (
        <div className="admin-execution-summary" style={{ marginBottom: 14 }}>
          <strong>Rascunho guardado</strong>
          <span>Existem campos obrigatórios em falta que serão necessários antes de gerar o contrato final.</span>
          {query.missing ? <span>Campos em falta: {query.missing}.</span> : null}
        </div>
      ) : null}

      {query?.status === 'updated' ? (
        <div className="admin-execution-summary" style={{ marginBottom: 14 }}>
          <strong>Estado atualizado</strong>
          <span>A alteração ficou registada no histórico do contrato.</span>
        </div>
      ) : null}

      {query?.error ? (
        <div className="admin-execution-summary admin-execution-summary-danger" style={{ marginBottom: 14 }}>
          <strong>{query.message ?? formatContractActionError(query.error)}</strong>
          {query.missing ? <span>Campos em falta: {query.missing}.</span> : null}
        </div>
      ) : null}

      <AdminPanel
        title={`${contract.number} - ${contractTitle}`}
        subtitle={`${clientName} - v${contract.version}`}
        action={
          <div className="admin-filters">
            <ContractStatusBadge status={contract.status} />
            <Link className="admin-button admin-button-muted" href="/admin/contracts"><ArrowLeft size={14} />Voltar</Link>
            {editability.canEdit ? (
              <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}/edit`}><PenLine size={14} />Editar</Link>
            ) : null}
          </div>
        }
      >
        <div className="admin-kpi-grid">
          <SummaryItem label="Cliente" value={clientName} />
          <SummaryItem label="Plano" value={formatContractPlan(contract.plan)} />
          <SummaryItem label="Valor" value={formatContractValue(contract.estimatedValue)} />
          <SummaryItem label="Serviço" value={formatContractServiceType(contract.serviceType, contract.serviceTypeOther)} />
          <SummaryItem label="Data" value={formatContractDate(contract.issueDate)} />
          <SummaryItem label="Responsável" value={contract.assignedTo?.name ?? contract.assignedTo?.email ?? contract.createdBy.name ?? contract.createdBy.email} />
        </div>
      </AdminPanel>

      <section className="admin-grid-main-aside">
        <div className="admin-page-grid">
          <AdminPanel title="Visão geral" subtitle="Dados principais guardados nos snapshots do contrato.">
            <div className="admin-field-grid">
              <AdminField label="Projeto" value={displayText(contract.projectName)} />
              <AdminField label="Lead" value={contract.lead ? <Link className="admin-link" href={`/admin/leads/${contract.lead.id}`}>{displayText(contract.lead.company)}</Link> : 'Sem lead associada'} />
              <AdminField label="Proposta" value={contract.proposal ? displayText(contract.proposal.title) : 'Sem proposta associada'} />
              <AdminField label="Validade" value={formatContractDate(contract.validUntil)} />
              <AdminField label="Fases comerciais" value={enabledPhases || 'Por definir'} />
              <AdminField label="PDF" value={contract.pdfUrl ? <Link className="admin-link" href={contract.pdfUrl}>Descarregar</Link> : 'PDF ainda não gerado'} />
              <AdminField label="Hash PDF" value={contract.pdfHash ? formatShortHash(contract.pdfHash) : 'Por gerar'} />
            </div>
          </AdminPanel>

          <AdminPanel title="Âmbito" subtitle="Resumo comercial e técnico do projeto.">
            <div className="admin-field-grid">
              <AdminField label="Resumo" value={getSnapshotText(contract.projectSnapshot, 'executiveSummary')} />
              <AdminField label="Objetivo" value={getSnapshotText(contract.projectSnapshot, 'projectObjective')} />
              <AdminField label="Problemas" value={getSnapshotText(contract.projectSnapshot, 'identifiedProblems')} />
              <AdminField label="Solução" value={getSnapshotText(contract.projectSnapshot, 'proposedSolution')} />
              <AdminField label="Incluído" value={getSnapshotText(contract.projectSnapshot, 'includedScope')} />
              <AdminField label="Excluído" value={getSnapshotText(contract.projectSnapshot, 'excludedScope')} />
            </div>
          </AdminPanel>

          <AdminPanel title="Entregáveis" subtitle="Itens de scope associados ao contrato.">
            {contract.deliverables.length > 0 ? (
              <div className="admin-row-list">
                {contract.deliverables.map((deliverable) => (
                  <AdminRow
                    key={deliverable.id}
                    title={displayText(deliverable.title) ?? deliverable.title}
                    meta={`${deliverable.phase ?? 'Sem fase'} - ${deliverable.status} - ${formatContractDate(deliverable.estimatedDate)}`}
                  >
                    {displayText(deliverable.description) ?? displayText(deliverable.acceptanceCriteria) ?? 'Sem descrição adicional.'}
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem entregáveis definidos.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Cronograma" subtitle="Fases, dependências e critérios de aprovação.">
            {contract.phases.length > 0 ? (
              <div className="admin-row-list">
                {contract.phases.map((phase) => (
                  <AdminRow
                    key={phase.id}
                    title={`${phase.order}. ${displayText(phase.name) ?? phase.name}`}
                    meta={`${phase.phaseType ?? 'Sem tipo'} - ${formatContractDate(phase.startsAt)} até ${formatContractDate(phase.endsAt)}`}
                  >
                    {[displayText(phase.description), phase.dependencies ? `Dependências: ${displayText(phase.dependencies) ?? phase.dependencies}` : null, phase.approvalCriteria ? `Aprovação: ${displayText(phase.approvalCriteria) ?? phase.approvalCriteria}` : null].filter(Boolean).join(' ')}
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem fases definidas.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Pagamentos" subtitle="Milestones financeiros e condições de faturação.">
            {contract.paymentMilestones.length > 0 ? (
              <div className="admin-row-list">
                {contract.paymentMilestones.map((payment) => (
                  <AdminRow
                    key={payment.id}
                    title={`${payment.percentage?.toString() ?? '-'}% - ${formatContractValue(payment.amount)}`}
                    meta={`${payment.invoiceMoment ?? 'Momento por definir'} - ${formatContractDate(payment.expectedDate)} - ${payment.status}`}
                  >
                    {displayText(payment.description) ?? displayText(payment.billingCondition) ?? 'Sem condição adicional.'}
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem milestones de pagamento.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Cláusulas" subtitle="Secções guardadas no snapshot editável do contrato.">
            {contract.sections.length > 0 ? (
              <div className="admin-row-list">
                {contract.sections.map((section) => (
                  <AdminRow
                    key={section.id}
                    title={`${section.order}. ${displayText(section.title) ?? section.title}`}
                    meta={`${formatContractSectionCategory(section.category)} - ${section.isRequired ? 'Obrigatória' : 'Opcional'}`}
                  >
                    {displayText(section.content)}
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem cláusulas associadas ao contrato.</AdminEmptyState>
            )}
          </AdminPanel>


          <AdminPanel title="Versões do PDF" subtitle="Histórico documental com hash, estado e motivo de alteração.">
            {contract.versions.length > 0 ? (
              <div className="admin-row-list">
                {contract.versions.map((version) => (
                  <AdminRow
                    key={version.id}
                    title={`${version.versionLabel ?? `v${version.version}`} - ${displayText(version.title) ?? version.title}`}
                    meta={`${formatContractStatus(version.statusAtGeneration ?? version.status)} - ${formatDatePt(version.createdAt)} - ${version.createdBy.name ?? version.createdBy.email}`}
                  >
                    <div className="contract-version-meta-grid">
                      <div className="contract-version-meta-item contract-version-meta-item-hash">
                        <span className="contract-version-meta-label">Hash</span>
                        <span className="contract-version-meta-value">{version.pdfHash ? formatShortHash(version.pdfHash) : 'Hash indisponível'}</span>
                      </div>
                      <div className="contract-version-meta-item contract-version-meta-item-reason">
                        <span className="contract-version-meta-label">Motivo</span>
                        <span className="contract-version-meta-value">{displayText(version.changeReason) ?? (version.version === 1 ? 'Geração inicial do PDF' : 'Regeneração técnica do PDF')}</span>
                      </div>
                      {version.pdfUrl ? <Link className="contract-version-link" href={version.pdfUrl} rel="noreferrer" target="_blank">Abrir PDF desta versão</Link> : null}
                    </div>
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem versões de PDF registadas.</AdminEmptyState>
            )}
          </AdminPanel>
          <AdminPanel title="Atividade" subtitle="Histórico próprio do contrato.">
            {contract.activityLogs.length > 0 ? (
              <div className="admin-timeline">
                {contract.activityLogs.map((activity) => (
                  <div className="admin-timeline-item" key={activity.id}>
                    <p className="admin-row-title">{formatContractActivity(activity.type)}</p>
                    <p className="admin-row-text">{displayText(activity.message)}</p>
                    <p className="admin-row-meta">{formatDatePt(activity.createdAt)} - {activity.adminUser?.name ?? activity.adminUser?.email ?? 'Sistema'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem atividade registada.</AdminEmptyState>
            )}
          </AdminPanel>
        </div>

        <aside className="admin-page-grid">
          <AdminPanel title="Ações">
            <div className="admin-page-grid">
              <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}/preview`}><FileText size={14} />Ver preview</Link>
              {!hasGeneratedPdf && editability.canGeneratePdf ? <ContractDetailPdfGenerateButton contractId={contract.id} hasExistingPdf={false} /> : null}
              {hasGeneratedPdf && editability.canRegeneratePdf && pdfHasUnpublishedChanges && hasPendingChangeReason ? (
                <div className="admin-page-grid" style={{ gap: 10 }}>
                  <span className="admin-pill contract-detail-action-status-pill">Motivo pendente aplicado</span>
                  <p className="admin-row-meta">Este contrato tem alterações guardadas que ainda não foram refletidas no PDF. A próxima versão usará o motivo registado na edição.</p>
                  <ContractDetailPdfGenerateButton contractId={contract.id} hasExistingPdf />
                </div>
              ) : null}
              {hasGeneratedPdf && pdfHasUnpublishedChanges && !hasPendingChangeReason ? (
                <div className="admin-execution-summary admin-execution-summary-danger">
                  <strong>Alterações por publicar sem motivo registado</strong>
                  <span>Volte ao editor e guarde as alterações com motivo antes de gerar uma nova versão do PDF.</span>
                  {editability.canEdit ? <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}/edit`}>Voltar ao editor</Link> : null}
                </div>
              ) : null}
              {hasGeneratedPdf && !pdfHasUnpublishedChanges ? <span className="admin-pill contract-detail-action-status-pill">PDF atualizado</span> : null}
              {hasGeneratedPdf && !editability.canRegeneratePdf && pdfHasUnpublishedChanges && hasPendingChangeReason ? <button className="admin-button admin-button-muted" disabled type="button">PDF bloqueado neste estado</button> : null}
              {contract.pdfUrl ? <Link className="admin-button" href={contract.pdfUrl} target="_blank"><Download size={14} />Descarregar PDF</Link> : null}
              {readyToSend.ok && contract.status !== 'READY_TO_SEND' && contract.status !== 'SIGNED' ? (
                <form action={updateContractStatusAction} className="admin-page-grid" style={{ gap: 10 }}>
                  <input name="contractId" type="hidden" value={contract.id} />
                  <input name="nextStatus" type="hidden" value="READY_TO_SEND" />
                  {contract.status !== 'DRAFT' ? <input className="admin-input" minLength={8} name="changeReason" placeholder="Motivo da alteração de estado" required /> : null}
                  <button className="admin-button" type="submit">Marcar pronto para envio</button>
                </form>
              ) : null}
              {!readyToSend.ok && contract.status !== 'READY_TO_SEND' && contract.status !== 'SIGNED' ? (
                <div className="admin-execution-summary admin-execution-summary-danger"><strong>Ainda não está pronto para envio</strong>{readyToSend.missingFields.slice(0, 4).map((field) => <span key={field}>{field}</span>)}</div>
              ) : null}
              {editability.canCreateRevision ? (
                <form action={reopenContractForRevisionAction} className="admin-page-grid" style={{ gap: 10 }}>
                  <input name="contractId" type="hidden" value={contract.id} />
                  <input className="admin-input" minLength={8} name="changeReason" placeholder="Motivo para criar revisão" required />
                  <button className="admin-button admin-button-muted" type="submit"><PenLine size={14} />Criar revisão editável</button>
                </form>
              ) : null}
              {editability.reason ? <p className="admin-row-meta">{displayText(editability.reason)}</p> : null}
              <button className="admin-button admin-button-muted" disabled type="button">Envio e assinatura em fase futura</button>
            </div>
          </AdminPanel>

          <AdminPanel title="Cliente snapshot">
            <SnapshotFields value={contract.clientSnapshot} keys={['companyName', 'taxId', 'email', 'phone', 'representative', 'representativeRole']} />
          </AdminPanel>

          <AdminPanel title="Norm8 snapshot">
            <SnapshotFields value={contract.providerSnapshot} keys={['legalName', 'tradeName', 'taxId', 'email', 'representative', 'representativeRole']} />
          </AdminPanel>

          <AdminPanel title="Notas técnicas">
            <div className="admin-row-list">
              <AdminRow title="PDF" meta="Playwright HTML/CSS preparado para fase futura." />
              <AdminRow title="Storage" meta="Vercel Blob previsto em produção; fallback local apenas em desenvolvimento." />
              <AdminRow title="Legal" meta="Template sujeito a revisão por advogado antes de utilização definitiva." />
            </div>
          </AdminPanel>
        </aside>
      </section>
    </div>
  );
}


function formatShortHash(hash: string): string {
  return hash.length > 18 ? `${hash.slice(0, 12)}...${hash.slice(-6)}` : hash;
}

function formatContractActionError(error: string): string {
  const labels: Record<string, string> = {
    reason_required: 'Indique um motivo com pelo menos 8 caracteres.',
    pdf_current: 'O PDF atual já corresponde à versão mais recente do contrato.',
    missing_pending_change_reason: 'Existem alterações por publicar, mas não existe motivo de alteração registado.',
    ready_to_send_failed: 'O contrato ainda não está pronto para envio.',
    locked: 'Contrato bloqueado neste estado.',
    invalid_transition: 'Transição de estado inválida.',
  };
  return labels[error] ?? 'Não foi possível executar a ação.';
}
function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="admin-stat-card" style={{ minHeight: 92 }}>
      <p className="admin-stat-label">{label}</p>
      <p className="admin-row-title">{value}</p>
    </article>
  );
}

function ContractStatusBadge({ status }: { status: Parameters<typeof formatContractStatus>[0] }) {
  const tone = status === 'SIGNED' ? 'green' : status === 'DRAFT' ? 'yellow' : status === 'CANCELLED' || status === 'EXPIRED' || status === 'REJECTED' ? 'red' : 'blue';
  return <AdminBadge tone={tone}>{formatContractStatus(status)}</AdminBadge>;
}

function SnapshotFields({ value, keys }: { value: unknown; keys: string[] }) {
  return (
    <div className="admin-field-grid">
      {keys.map((key) => (
        <AdminField key={key} label={formatSnapshotLabel(key)} value={getSnapshotText(value, key)} />
      ))}
    </div>
  );
}

function displayText(value: string | null | undefined): string | null {
  return value ? repairPortugueseMojibake(value) : null;
}
function getSnapshotText(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' && candidate.trim() ? repairPortugueseMojibake(candidate.trim()) : null;
}

function formatSnapshotLabel(key: string): string {
  const labels: Record<string, string> = {
    companyName: 'Empresa',
    taxId: 'NIF',
    email: 'Email',
    phone: 'Telefone',
    legalName: 'Nome legal',
    tradeName: 'Nome comercial',
    representative: 'Representante',
    representativeRole: 'Cargo',
  };

  return labels[key] ?? key;
}
