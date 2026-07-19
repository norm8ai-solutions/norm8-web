import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, FileText, PenLine } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminEmptyState, AdminField, AdminPanel, AdminRow } from '@/components/admin/AdminPrimitives';
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
import { getContractById } from '@/lib/contracts/queries';

type ContractDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContractDetailPage({ params }: ContractDetailPageProps) {
  const { id } = await params;
  const contract = await getContractById(id);

  if (!contract) {
    notFound();
  }

  const clientName = getSnapshotText(contract.clientSnapshot, 'companyName') ?? getSnapshotText(contract.clientSnapshot, 'legalName') ?? contract.lead?.company ?? 'Cliente por definir';
  const enabledPhases = [contract.includesLaunch ? 'Launch' : null, contract.includesOperate ? 'Operate' : null, contract.includesScale ? 'Scale' : null].filter(Boolean).join(' / ');

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title={`${contract.number} - ${contract.title}`}
        subtitle={`${clientName} - v${contract.version}`}
        action={
          <div className="admin-filters">
            <ContractStatusBadge status={contract.status} />
            <Link className="admin-button admin-button-muted" href="/admin/contracts"><ArrowLeft size={14} />Voltar</Link>
            {contract.status === 'DRAFT' || contract.status === 'IN_REVIEW' ? (
              <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}/edit`}><PenLine size={14} />Editar</Link>
            ) : null}
          </div>
        }
      >
        <div className="admin-kpi-grid">
          <SummaryItem label="Cliente" value={clientName} />
          <SummaryItem label="Plano" value={formatContractPlan(contract.plan)} />
          <SummaryItem label="Valor" value={formatContractValue(contract.estimatedValue)} />
          <SummaryItem label="Servico" value={formatContractServiceType(contract.serviceType, contract.serviceTypeOther)} />
          <SummaryItem label="Data" value={formatContractDate(contract.issueDate)} />
          <SummaryItem label="Responsavel" value={contract.assignedTo?.name ?? contract.assignedTo?.email ?? contract.createdBy.name ?? contract.createdBy.email} />
        </div>
      </AdminPanel>

      <section className="admin-grid-main-aside">
        <div className="admin-page-grid">
          <AdminPanel title="Visao geral" subtitle="Dados principais guardados nos snapshots do contrato.">
            <div className="admin-field-grid">
              <AdminField label="Projeto" value={contract.projectName} />
              <AdminField label="Lead" value={contract.lead ? <Link className="admin-link" href={`/admin/leads/${contract.lead.id}`}>{contract.lead.company}</Link> : 'Sem lead associada'} />
              <AdminField label="Proposta" value={contract.proposal ? contract.proposal.title : 'Sem proposta associada'} />
              <AdminField label="Validade" value={formatContractDate(contract.validUntil)} />
              <AdminField label="Fases comerciais" value={enabledPhases || 'Por definir'} />
              <AdminField label="PDF" value={contract.pdfUrl ? <Link className="admin-link" href={contract.pdfUrl}>Descarregar</Link> : 'Geracao PDF fica para fase futura'} />
            </div>
          </AdminPanel>

          <AdminPanel title="Ambito" subtitle="Resumo comercial e tecnico do projeto.">
            <div className="admin-field-grid">
              <AdminField label="Resumo" value={getSnapshotText(contract.projectSnapshot, 'executiveSummary')} />
              <AdminField label="Objetivo" value={getSnapshotText(contract.projectSnapshot, 'projectObjective')} />
              <AdminField label="Problemas" value={getSnapshotText(contract.projectSnapshot, 'identifiedProblems')} />
              <AdminField label="Solucao" value={getSnapshotText(contract.projectSnapshot, 'proposedSolution')} />
              <AdminField label="Incluido" value={getSnapshotText(contract.projectSnapshot, 'includedScope')} />
              <AdminField label="Excluido" value={getSnapshotText(contract.projectSnapshot, 'excludedScope')} />
            </div>
          </AdminPanel>

          <AdminPanel title="Entregaveis" subtitle="Itens de scope associados ao contrato.">
            {contract.deliverables.length > 0 ? (
              <div className="admin-row-list">
                {contract.deliverables.map((deliverable) => (
                  <AdminRow
                    key={deliverable.id}
                    title={deliverable.title}
                    meta={`${deliverable.phase ?? 'Sem fase'} - ${deliverable.status} - ${formatContractDate(deliverable.estimatedDate)}`}
                  >
                    {deliverable.description ?? deliverable.acceptanceCriteria ?? 'Sem descricao adicional.'}
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem entregaveis definidos.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Cronograma" subtitle="Fases, dependencias e criterios de aprovacao.">
            {contract.phases.length > 0 ? (
              <div className="admin-row-list">
                {contract.phases.map((phase) => (
                  <AdminRow
                    key={phase.id}
                    title={`${phase.order}. ${phase.name}`}
                    meta={`${phase.phaseType ?? 'Sem tipo'} - ${formatContractDate(phase.startsAt)} ate ${formatContractDate(phase.endsAt)}`}
                  >
                    {[phase.description, phase.dependencies ? `Dependencias: ${phase.dependencies}` : null, phase.approvalCriteria ? `Aprovacao: ${phase.approvalCriteria}` : null].filter(Boolean).join(' ')}
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem fases definidas.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Pagamentos" subtitle="Milestones financeiros e condicoes de faturacao.">
            {contract.paymentMilestones.length > 0 ? (
              <div className="admin-row-list">
                {contract.paymentMilestones.map((payment) => (
                  <AdminRow
                    key={payment.id}
                    title={`${payment.percentage?.toString() ?? '-'}% - ${formatContractValue(payment.amount)}`}
                    meta={`${payment.invoiceMoment ?? 'Momento por definir'} - ${formatContractDate(payment.expectedDate)} - ${payment.status}`}
                  >
                    {payment.description ?? payment.billingCondition ?? 'Sem condicao adicional.'}
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem milestones de pagamento.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Clausulas" subtitle="Seccoes guardadas no snapshot editavel do contrato.">
            {contract.sections.length > 0 ? (
              <div className="admin-row-list">
                {contract.sections.map((section) => (
                  <AdminRow
                    key={section.id}
                    title={`${section.order}. ${section.title}`}
                    meta={`${formatContractSectionCategory(section.category)} - ${section.isRequired ? 'Obrigatoria' : 'Opcional'}`}
                  >
                    {section.content}
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem clausulas associadas ao contrato.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Atividade" subtitle="Historico proprio do contrato.">
            {contract.activityLogs.length > 0 ? (
              <div className="admin-timeline">
                {contract.activityLogs.map((activity) => (
                  <div className="admin-timeline-item" key={activity.id}>
                    <p className="admin-row-title">{formatContractActivity(activity.type)}</p>
                    <p className="admin-row-text">{activity.message}</p>
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
          <AdminPanel title="Acoes">
            <div className="admin-page-grid">
              <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contract.id}/preview`}><FileText size={14} />Ver preview</Link>
              {contract.status === 'SIGNED' ? (
                <button className="admin-button admin-button-muted" disabled type="button">Regeneracao futura por nova versao</button>
              ) : (
                <form action={`/api/contracts/${contract.id}/generate-pdf`} method="post">
                  <button className="admin-button admin-button-muted" type="submit"><Download size={14} />{contract.pdfUrl ? 'Regenerar PDF' : 'Gerar PDF'}</button>
                </form>
              )}
              {contract.pdfUrl ? <Link className="admin-button" href={contract.pdfUrl} target="_blank"><Download size={14} />Descarregar PDF</Link> : null}
              <button className="admin-button admin-button-muted" disabled type="button">Assinatura futura</button>
            </div>
          </AdminPanel>

          <AdminPanel title="Cliente snapshot">
            <SnapshotFields value={contract.clientSnapshot} keys={['companyName', 'taxId', 'email', 'phone', 'representative', 'representativeRole']} />
          </AdminPanel>

          <AdminPanel title="Norm8 snapshot">
            <SnapshotFields value={contract.providerSnapshot} keys={['legalName', 'tradeName', 'taxId', 'email', 'representative', 'representativeRole']} />
          </AdminPanel>

          <AdminPanel title="Notas tecnicas">
            <div className="admin-row-list">
              <AdminRow title="PDF" meta="Playwright HTML/CSS preparado para fase futura." />
              <AdminRow title="Storage" meta="Vercel Blob previsto em producao; fallback local apenas em desenvolvimento." />
              <AdminRow title="Legal" meta="Template sujeito a revisao por advogado antes de utilizacao definitiva." />
            </div>
          </AdminPanel>
        </aside>
      </section>
    </div>
  );
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

function getSnapshotText(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
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