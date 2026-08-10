/**
 * ------------------------------------------------------------------
 * File: app/admin/proposals/[proposalId]/page.tsx
 * Description: Dedicated Admin detail page for a commercial proposal.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProposalPdfActions } from '@/components/admin/ProposalPdfActions';
import {
  AdminEmptyState,
  AdminField,
  AdminPanel,
} from '@/components/admin/AdminPrimitives';
import { requireAdmin } from '@/lib/admin/auth';
import { formatDatePt } from '@/lib/admin/formatters';
import { getProposalDetailById } from '@/lib/proposals/service';

type ProposalDetailPageProps = {
  params: Promise<{ proposalId: string }>;
};

type ProposalDetail = NonNullable<Awaited<ReturnType<typeof getProposalDetailById>>>;
type ProposalBaseOffer = ProposalDetail['lead']['baseOffers'][number];
type ProposalDiscoverySession = ProposalDetail['lead']['discoverySessions'][number];

export default async function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  await requireAdmin();

  const { proposalId } = await params;
  const proposal = await getProposalDetailById(proposalId);

  if (!proposal) {
    notFound();
  }

  const baseOffer = findProposalBaseOffer(proposal);
  const discoverySession = findProposalDiscoverySession(proposal, baseOffer);
  const pdfUrl = proposal.pdfUrl || null;
  const sourceLabel = getProposalSourceLabel(baseOffer, discoverySession, proposal.leadActionId);

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title="Proposta Final"
        subtitle={'Resumo comercial, contexto de origem e documento PDF associado à proposta.'}
        action={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link className="admin-button admin-button-muted" href={`/admin/leads/${proposal.leadId}`}>Voltar &agrave; Lead</Link>
            {pdfUrl ? (
              <Link className="admin-button" href={pdfUrl} rel="noreferrer" target="_blank">Ver PDF</Link>
            ) : null}
          </div>
        }
      >
        <div className="admin-field-grid">
          <AdminField label="Título" value={safeText(proposal.title)} />
          <AdminField label="Estado" value={formatProposalStatus(proposal.status)} />
          <AdminField label="Criada em" value={formatDatePt(proposal.createdAt)} />
          <AdminField label="Atualizada" value={formatDatePt(proposal.updatedAt)} />
          <AdminField label="Valor estimado" value={formatProposalEstimatedValue(proposal.estimatedValue)} />
          <AdminField label="Fonte" value={sourceLabel} />
        </div>
      </AdminPanel>

      <section className="admin-grid-main-aside">
        <div className="admin-page-grid">
          <AdminPanel title="Resumo da proposta" subtitle="Dados principais preparados para validação comercial.">
            <div className="admin-field-grid">
              <AdminField label="Empresa" value={safeText(proposal.companyName)} />
              <AdminField label="Contacto" value={safeText(proposal.contactName)} />
              <AdminField label="Versão" value={`v${proposal.version}`} />
              <AdminField label="Estado do PDF" value={pdfUrl ? 'PDF disponível' : 'PDF ainda não gerado'} />
            </div>
            {proposal.status === 'DRAFT' ? (
              <p className="admin-row-meta" style={{ marginTop: 12 }}>
                Esta proposta ainda est&aacute; em rascunho e pode precisar de valida&ccedil;&atilde;o antes do envio.
              </p>
            ) : null}
          </AdminPanel>

          <AdminPanel title="Problema validado" subtitle="Contexto comercial que justifica a proposta.">
            <ProposalText value={proposal.painPoints ?? baseOffer?.problemSummary ?? discoverySession?.summary} />
          </AdminPanel>

          <AdminPanel title="Solução proposta" subtitle="Direção recomendada para resolver o problema validado.">
            <ProposalText value={proposal.recommendedSolution ?? baseOffer?.suggestedSolution} />
          </AdminPanel>

          <AdminPanel title="Âmbito resumido" subtitle="Escopo operacional usado para enquadrar a implementação.">
            <ProposalText value={proposal.scope ?? proposal.implementationPlan ?? baseOffer?.estimatedScope ?? discoverySession?.confirmedScope} />
          </AdminPanel>

          <AdminPanel title="Próximos passos" subtitle="Movimentos comerciais seguintes após validação da proposta.">
            <ProposalText value={proposal.nextSteps ?? discoverySession?.nextSteps ?? baseOffer?.nextSteps} />
          </AdminPanel>
        </div>

        <aside className="admin-page-grid">
          <AdminPanel title="Cliente e Lead">
            <div className="admin-field-grid">
              <AdminField label="Empresa" value={safeText(proposal.lead.company)} />
              <AdminField label="Contacto" value={safeText(proposal.lead.name)} />
              <AdminField label="Email" value={safeText(proposal.lead.email)} />
              <AdminField label="Telefone" value={safeText(proposal.lead.phone)} />
              <AdminField label="Origem" value={safeText(proposal.lead.source)} />
              <AdminField label="Lead" value={<Link className="admin-link" href={`/admin/leads/${proposal.leadId}`}>Abrir Lead</Link>} />
            </div>
          </AdminPanel>

          <AdminPanel title="Origem da proposta">
            <div className="admin-field-grid">
              <AdminField label="Fonte" value={sourceLabel} />
              <AdminField label="Oferta Base" value={baseOffer ? formatBaseOfferStatus(baseOffer.status) : 'Por definir'} />
              <AdminField label="Discovery" value={discoverySession ? formatDiscoveryStatus(discoverySession.status) : 'Por definir'} />
              <AdminField label="Submissão" value={proposal.submission ? formatDatePt(proposal.submission.createdAt) : 'Por definir'} />
            </div>
          </AdminPanel>

          <AdminPanel title="Estado do PDF" subtitle={pdfUrl ? 'Documento gerado e associado.' : 'Documento ainda não gerado.'}>
            <ProposalPdfActions
              leadId={proposal.leadId}
              pdfUrl={pdfUrl}
              proposalId={proposal.id}
            />
          </AdminPanel>
        </aside>
      </section>
    </div>
  );
}

function ProposalText({ value }: { value?: string | null }) {
  const text = safeText(value, 'Ainda sem informação registada.');

  if (!text.trim()) {
    return <AdminEmptyState>Ainda sem informa&ccedil;&atilde;o registada.</AdminEmptyState>;
  }

  return <p className="admin-row-text" style={{ whiteSpace: 'pre-wrap' }}>{text}</p>;
}

function findProposalBaseOffer(proposal: ProposalDetail): ProposalBaseOffer | null {
  if (proposal.submissionId) {
    const linked = proposal.lead.baseOffers.find((baseOffer) => baseOffer.submissionId === proposal.submissionId);
    if (linked) return linked;
  }

  return proposal.lead.baseOffers[0] ?? null;
}

function findProposalDiscoverySession(
  proposal: ProposalDetail,
  baseOffer: ProposalBaseOffer | null,
): ProposalDiscoverySession | null {
  if (baseOffer) {
    const linked = proposal.lead.discoverySessions.find((session) => session.baseOfferId === baseOffer.id);
    if (linked) return linked;
  }

  return proposal.lead.discoverySessions[0] ?? null;
}

function getProposalSourceLabel(
  baseOffer: ProposalBaseOffer | null,
  discoverySession: ProposalDiscoverySession | null,
  leadActionId?: string | null,
): string {
  if (discoverySession) return 'Discovery / Oferta Base';
  if (baseOffer) return 'Oferta Base';
  if (leadActionId) return 'Manual';
  return 'Manual';
}

function safeText(value?: string | null, fallback = 'Por definir'): string {
  return value?.trim() || fallback;
}

function formatProposalStatus(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Rascunho',
    GENERATED: 'PDF gerado',
    SENT: 'Enviada',
    ACCEPTED: 'Aceite',
    REJECTED: 'Rejeitada',
    EXPIRED: 'Expirada',
  };

  return labels[status] ?? status;
}

function formatBaseOfferStatus(status: string): string {
  const labels: Record<string, string> = {
    INTERNAL_DRAFT: 'Rascunho interno',
    DISCOVERY_PREPARATION: 'Discovery em preparação',
    DISCOVERY_COMPLETED: 'Discovery concluída',
    VALIDATED: 'Discovery concluída',
    CONVERTED_TO_PROPOSAL: 'Convertida em proposta',
    ARCHIVED: 'Arquivada',
  };

  return labels[status] ?? status;
}

function formatDiscoveryStatus(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Rascunho',
    IN_PROGRESS: 'Em preparação',
    COMPLETED: 'Concluída',
    ARCHIVED: 'Arquivada',
  };

  return labels[status] ?? status;
}

function formatProposalEstimatedValue(value: { toString(): string } | null): string {
  if (!value) return 'Valor por estimar';

  const numericValue = Number(value.toString());
  if (!Number.isFinite(numericValue)) return 'Valor por estimar';

  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(numericValue);
}