/**
 * ------------------------------------------------------------------
 * File: app/admin/submissions/[id]/page.tsx
 * Description: Submission detail page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Show formatted payload fields before raw JSON.
 * - Show AI audit analysis for Intelligent Audit submissions.
 * - Keep detailed submission inspection readable for operators.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AdminBadge,
  SubmissionStatusBadge,
  SubmissionTypeBadge,
} from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminField,
  AdminPanel,
} from '@/components/admin/AdminPrimitives';
import { regenerateAuditAnalysis } from '@/lib/admin/actions';
import {
  formatDatePt,
  formatPayloadRows,
  getSubmissionDisplayData,
} from '@/lib/admin/formatters';
import { getSubmissionById } from '@/lib/admin/queries';

type SubmissionDetailPageProps = {
  params: Promise<{ id: string }>;
};

type AnalysisListItem = {
  title?: unknown;
  description?: unknown;
  impact?: unknown;
  estimatedImpact?: unknown;
  complexity?: unknown;
  module?: unknown;
};

/**
 * Renders submission detail.
 *
 * @param props Route params with submission id.
 * @returns Submission detail page.
 */
export default async function SubmissionDetailPage({
  params,
}: SubmissionDetailPageProps) {
  const { id } = await params;
  const submission = await getSubmissionById(id);

  if (!submission) {
    notFound();
  }

  const payloadRows = formatPayloadRows(submission.payload);
  const display = getSubmissionDisplayData(submission);

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title="Detalhe da submissão"
        subtitle={`${display.company ?? 'Sem empresa'} - ${formatDatePt(submission.createdAt)}`}
        action={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <SubmissionTypeBadge type={submission.type} />
            <SubmissionStatusBadge status={submission.status} />
          </div>
        }
      >
        <div className="admin-field-grid">
          <AdminField
            label="Lead"
            value={
              <Link className="admin-link" href={`/admin/leads/${submission.lead.id}`}>
                {display.name ?? display.company ?? submission.lead.email}
              </Link>
            }
          />
          <AdminField label="Empresa" value={display.company} />
          <AdminField label="Email" value={display.email} />
          <AdminField label="Telefone" value={display.phone} />
          <AdminField label="Website" value={display.website} />
          <AdminField label="Criado em" value={formatDatePt(submission.createdAt)} />
        </div>
      </AdminPanel>

      {submission.type === 'AUDIT_REQUEST' && (
        <AuditAnalysisPanel
          analysis={submission.auditAnalysis}
          submissionId={submission.id}
        />
      )}

      <section className="admin-grid-main-aside">
        <AdminPanel title="Dados formatados" subtitle="Campos principais enviados no formulário.">
          {payloadRows.length > 0 ? (
            <div className="admin-field-grid">
              {payloadRows.map((row) => (
                <AdminField key={row.label} label={row.label} value={row.value} />
              ))}
            </div>
          ) : (
            <AdminEmptyState>Sem dados formatáveis no payload.</AdminEmptyState>
          )}
        </AdminPanel>

        <AdminPanel title="JSON bruto" subtitle="Payload original para diagnóstico técnico.">
          <pre
            style={{
              color: '#c7d2ea',
              fontSize: 12,
              lineHeight: 1.6,
              margin: 0,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {JSON.stringify(submission.payload, null, 2)}
          </pre>
        </AdminPanel>
      </section>
    </div>
  );
}

/**
 * Renders the AI audit analysis state and result.
 *
 * @param props Analysis data and submission id.
 * @returns AI audit analysis admin panel.
 */
function AuditAnalysisPanel({
  analysis,
  submissionId,
}: {
  analysis: NonNullable<Awaited<ReturnType<typeof getSubmissionById>>>['auditAnalysis'];
  submissionId: string;
}) {
  const status = analysis?.status ?? 'PENDING';
  const opportunities = toAnalysisListItems(analysis?.automationOpportunities);
  const problems = toAnalysisListItems(analysis?.operationalProblems);
  const solutions = toAnalysisListItems(analysis?.recommendedSolutions);

  return (
    <AdminPanel
      title="AI Audit Analysis"
      subtitle={getAnalysisStatusLabel(status)}
      action={
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <AnalysisStatusBadge status={status} />
          {analysis?.priority && <AuditPriorityBadge priority={analysis.priority} />}
          <form action={regenerateAuditAnalysis}>
            <input name="submissionId" type="hidden" value={submissionId} />
            <button className="admin-button admin-button-muted" type="submit">
              Regerar análise IA
            </button>
          </form>
        </div>
      }
    >
      {!analysis || status === 'PENDING' ? (
        <AdminEmptyState>Análise IA em preparação...</AdminEmptyState>
      ) : status === 'FAILED' ? (
        <div className="admin-field-grid">
          <AdminField label="Estado" value="Falha ao gerar análise" />
          <AdminField label="Erro interno" value={analysis.errorMessage ?? 'Erro desconhecido'} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="admin-field-grid">
            <AdminField label="Audit Score" value={`${analysis.score ?? 0}/100`} />
            <AdminField label="Prioridade" value={formatAuditPriority(analysis.priority)} />
            <AdminField label="Modelo IA" value={analysis.aiModel ?? 'Não registado'} />
          </div>

          <AdminField label="Resumo da empresa" value={analysis.companySummary} />

          <AnalysisList title="Principais problemas operacionais" items={problems} />
          <AnalysisList title="Oportunidades de automação" items={opportunities} />
          <AnalysisList title="Sugestões de solução" items={solutions} />

          <AdminField label="Próximo passo recomendado" value={analysis.nextStep} />
          <AdminField label="Resumo interno" value={analysis.internalSummary} />
          <ClientPreviewPanel analysis={analysis} />
        </div>
      )}
    </AdminPanel>
  );
}

/**
 * Renders the client-facing Executive Audit Preview saved with the analysis.
 *
 * @param props Audit analysis record.
 * @returns Client preview panel content.
 */
function ClientPreviewPanel({
  analysis,
}: {
  analysis: NonNullable<
    NonNullable<Awaited<ReturnType<typeof getSubmissionById>>>['auditAnalysis']
  >;
}) {
  const hasPreview = Boolean(
    analysis.clientPreviewTitle &&
      analysis.clientPreviewSummary &&
      Array.isArray(analysis.clientPreviewOpportunities) &&
      analysis.clientPreviewOpportunities.length > 0,
  );
  const opportunities = toAnalysisListItems(analysis.clientPreviewOpportunities);
  const benefits = toStringList(analysis.clientPreviewBenefits);

  return (
    <div style={{ borderTop: '1px solid rgba(148,163,184,0.18)', paddingTop: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <p className="admin-field-label" style={{ margin: 0 }}>
          Executive Preview enviado ao cliente
        </p>
        <AdminBadge tone={hasPreview ? 'green' : 'slate'}>
          {hasPreview ? 'Enviado ao cliente' : 'Fallback enviado'}
        </AdminBadge>
      </div>

      {hasPreview ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <AdminField label="Título" value={analysis.clientPreviewTitle} />
          <AdminField label="Resumo" value={analysis.clientPreviewSummary} />
          <AnalysisList title="Oportunidades enviadas" items={opportunities} />
          <StringList title="Benefícios esperados" items={benefits} />
          <AdminField
            label="Direção recomendada"
            value={analysis.clientPreviewRecommendedDirection}
          />
          <AdminField label="Próximo passo cliente" value={analysis.clientPreviewNextStep} />
        </div>
      ) : (
        <AdminEmptyState>Foi enviado o email simples de receção ao cliente.</AdminEmptyState>
      )}
    </div>
  );
}
/**
 * Renders a numbered analysis list.
 *
 * @param props List title and items.
 * @returns Numbered list or empty state.
 */
function AnalysisList({ title, items }: { title: string; items: AnalysisListItem[] }) {
  if (items.length === 0) {
    return <AdminField label={title} value="Sem dados." />;
  }

  return (
    <div>
      <p className="admin-field-label" style={{ marginBottom: 10 }}>
        {title}
      </p>
      <ol style={{ color: '#dce6ff', display: 'grid', gap: 10, margin: 0, paddingLeft: 20 }}>
        {items.map((item, index) => (
                    <li key={`${title}-${index}`} style={{ display: 'grid', gap: 6 }}>
            <strong>{stringValue(item.title) || 'Item sem título'}</strong>
            {stringValue(item.description) && <div>{stringValue(item.description)}</div>}
            {stringValue(item.impact) && (
              <AnalysisDetail label="Impacto" value={stringValue(item.impact)} />
            )}
            {stringValue(item.estimatedImpact) && (
              <AnalysisDetail
                label="Impacto estimado"
                value={stringValue(item.estimatedImpact)}
              />
            )}
            {stringValue(item.complexity) && (
              <AnalysisDetail
                label="Complexidade"
                value={formatComplexity(stringValue(item.complexity))}
              />
            )}
            {stringValue(item.module) && (
              <AnalysisDetail label="Módulo" value={stringValue(item.module)} />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Renders a labelled detail line inside analysis lists.
 *
 * @param props Detail label and value.
 * @returns Compact labelled detail.
 */
function AnalysisDetail({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ color: '#94a3b8', display: 'grid', gap: 2, fontSize: 12 }}>
      <strong style={{ color: '#c7d2ea', fontSize: 11, textTransform: 'uppercase' }}>
        {label}:
      </strong>
      <span>{value}</span>
    </span>
  );
}
/**
 * Safely converts stored Prisma Json into analysis list items.
 *
 * @param value Stored JSON value.
 * @returns Array of object-like analysis items.
 */
function toAnalysisListItems(value: unknown): AnalysisListItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is AnalysisListItem => Boolean(item) && typeof item === 'object',
  );
}

/**
 * Returns a string only when the value is printable text.
 *
 * @param value Unknown stored value.
 * @returns String value or empty string.
 */
function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Safely converts stored Prisma Json into string list values.
 *
 * @param value Stored JSON value.
 * @returns Array of strings.
 */
function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/**
 * Renders a compact string list.
 *
 * @param props List title and string items.
 * @returns Bulleted list or empty field.
 */
function StringList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return <AdminField label={title} value="Sem dados." />;
  }

  return (
    <div>
      <p className="admin-field-label" style={{ marginBottom: 10 }}>
        {title}
      </p>
      <ul style={{ color: '#dce6ff', display: 'grid', gap: 8, margin: 0, paddingLeft: 20 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders an audit analysis status badge.
 *
 * @param props Status value.
 * @returns Status badge.
 */
function AnalysisStatusBadge({ status }: { status: string }) {
  const tone = status === 'COMPLETED' ? 'green' : status === 'FAILED' ? 'red' : 'yellow';

  return <AdminBadge tone={tone}>{getAnalysisStatusLabel(status)}</AdminBadge>;
}

/**
 * Renders an audit priority badge.
 *
 * @param props Priority value.
 * @returns Priority badge.
 */
function AuditPriorityBadge({ priority }: { priority: string }) {
  const toneByPriority: Record<string, 'slate' | 'blue' | 'yellow' | 'red'> = {
    LOW: 'slate',
    MEDIUM: 'blue',
    HIGH: 'yellow',
    URGENT: 'red',
  };

  return (
    <AdminBadge tone={toneByPriority[priority] ?? 'slate'}>
      {formatAuditPriority(priority)}
    </AdminBadge>
  );
}

/**
 * Formats an audit analysis status for the admin UI.
 *
 * @param status Status value.
 * @returns Portuguese label.
 */
function getAnalysisStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Análise IA em preparação...',
    COMPLETED: 'Análise concluída',
    FAILED: 'Falha ao gerar análise',
  };

  return labels[status] ?? status;
}

/**
 * Formats audit priority for the admin UI.
 *
 * @param priority Priority value.
 * @returns Portuguese label.
 */
function formatAuditPriority(priority?: string | null): string {
  const labels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  };

  return priority ? labels[priority] ?? priority : 'Não atribuída';
}


/**
 * Formats technical complexity values into Portuguese.
 *
 * @param complexity Complexity value from AI output.
 * @returns Portuguese label.
 */
function formatComplexity(complexity: string): string {
  const labels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
  };

  return labels[complexity.toUpperCase()] ?? complexity;
}