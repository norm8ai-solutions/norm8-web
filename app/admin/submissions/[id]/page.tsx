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



type EstimatedDelivery = {
  range: string;
  rationale?: string;
};type ContractEstimate = {
  minimum: number;
  maximum: number;
  currency: 'EUR';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  rationale?: string;
};
type AnalysisListItem = {
  title?: unknown;
  description?: unknown;
  impact?: unknown;
  estimatedImpact?: unknown;
  complexity?: unknown;
  module?: unknown;
};

type SalesPlaybookObjection = {
  objection: string;
  response: string;
};

type SalesPlaybook = {
  likelyDecisionMaker: string;
  painPoints: string[];
  likelyObjections: SalesPlaybookObjection[];
  quickWins: string[];
  futureCrossSell: string[];
  closingProbability?: number;
  salesStrategy: string;
  discoveryQuestions: string[];
};

type ImplementationRoadmapPhase = {
  phase: number;
  title: string;
  description: string;
  objective: string;
  deliverables: string[];
  estimatedDuration: string;
  dependencies: string[];
  expectedImpact: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
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
  const contractEstimate = parseContractEstimate(analysis?.contractValueEstimate);
  const estimatedDelivery = parseEstimatedDelivery(analysis?.estimatedDelivery);
  const salesPlaybook = parseSalesPlaybook(analysis?.salesPlaybook);
  const implementationRoadmap = parseImplementationRoadmap(
    analysis?.implementationRoadmap,
  );

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

          <CommercialPotentialCard
            closingProbability={analysis?.closingProbability}
            complexity={analysis?.implementationComplexity}
            delivery={estimatedDelivery}
            estimate={contractEstimate}
            likelyDecisionMaker={salesPlaybook?.likelyDecisionMaker}
            nextStep={analysis.nextStep}
          />

          <AdminField label="Resumo da empresa" value={analysis.companySummary} />

          <AnalysisList title="Principais problemas operacionais" items={problems} />
          <AnalysisList title="Oportunidades de automação" items={opportunities} />
          <AnalysisList title="Sugestões de solução" items={solutions} />

          <AdminField label="Próximo passo recomendado" value={analysis.nextStep} />
          <AdminField label="Resumo interno" value={analysis.internalSummary} />
          <SalesPlaybookPanel
            closingProbability={analysis.closingProbability}
            playbook={salesPlaybook}
          />
          <ImplementationRoadmapPanel phases={implementationRoadmap} />
          <ClientPreviewPanel analysis={analysis} />
        </div>
      )}
    </AdminPanel>
  );
}


/**
 * Renders the internal commercial potential card.
 *
 * @param props Parsed contract estimate.
 * @returns Commercial potential panel.
 */
function CommercialPotentialCard({
  closingProbability,
  complexity,
  delivery,
  estimate,
  likelyDecisionMaker,
  nextStep,
}: {
  closingProbability?: number | null;
  complexity?: string | null;
  delivery?: EstimatedDelivery;
  estimate?: ContractEstimate;
  likelyDecisionMaker?: string;
  nextStep?: string | null;
}) {
  return (
    <div style={{ border: '1px solid rgba(148,163,184,0.18)', borderRadius: 10, padding: 16 }}>
      <p className="admin-field-label" style={{ marginBottom: 12 }}>
        Potencial Comercial
      </p>
      <div className="admin-field-grid">
        <AdminField label="Valor estimado" value={formatContractEstimate(estimate)} />
        <AdminField label="Decisor provavel" value={likelyDecisionMaker ?? 'CEO / COO / Diretor de Operacoes'} />
        <AdminField
          label="Probabilidade de Fecho"
          value={
            closingProbability === null || closingProbability === undefined
              ? 'Não estimada'
              : `${closingProbability}%`
          }
        />
        <AdminField label="Tempo estimado" value={delivery?.range ?? getDeliveryRange(complexity)} />
        <AdminField label="Complexidade" value={formatImplementationComplexity(complexity)} />
        <AdminField
          label="Confiança"
          value={formatContractConfidence(estimate?.confidence)}
        />
        <AdminField label="Proximo passo" value={nextStep ?? 'Discovery Call'} />
        <AdminField label="Justificacao" value={estimate?.rationale ?? 'Nao disponivel'} />
      </div>
    </div>
  );
}
/**
 * Renders the internal AI Sales Playbook.
 *
 * @param props Parsed playbook and fallback probability.
 * @returns Internal sales playbook panel.
 */
function SalesPlaybookPanel({
  closingProbability,
  playbook,
}: {
  closingProbability?: number | null;
  playbook?: SalesPlaybook;
}) {
  if (!playbook) {
    return <AdminField label="AI Sales Playbook" value="Sem playbook gerado." />;
  }

  const probability =
    playbook.closingProbability ??
    (closingProbability === null || closingProbability === undefined
      ? undefined
      : closingProbability);

  return (
    <div style={{ borderTop: '1px solid rgba(148,163,184,0.18)', paddingTop: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <p className="admin-field-label" style={{ margin: 0 }}>
          AI Sales Playbook
        </p>
        <AdminBadge tone="blue">Interno</AdminBadge>
      </div>

      <div className="admin-field-grid" style={{ marginBottom: 16 }}>
        <AdminField label="Decisor provavel" value={playbook.likelyDecisionMaker} />
        <AdminField
          label="Probabilidade de Fecho"
          value={probability === undefined ? 'Nao estimada' : `${probability}%`}
        />
      </div>

      <AdminField label="Estrategia recomendada" value={playbook.salesStrategy} />
      <StringList title="Principais dores" items={playbook.painPoints} />
      <ObjectionList objections={playbook.likelyObjections} />
      <StringList title="Quick Wins" items={playbook.quickWins} />
      <StringList title="Cross-sell futuro" items={playbook.futureCrossSell} />
      <StringList title="Perguntas para discovery call" items={playbook.discoveryQuestions} />
    </div>
  );
}

/**
 * Renders likely objections with consultative responses.
 *
 * @param props Objection list.
 * @returns Objection cards.
 */
function ObjectionList({ objections }: { objections: SalesPlaybookObjection[] }) {
  if (objections.length === 0) {
    return <AdminField label="Objecoes provaveis" value="Sem dados." />;
  }

  return (
    <div>
      <p className="admin-field-label" style={{ marginBottom: 10 }}>
        Objecoes provaveis + respostas
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {objections.map((item, index) => (
          <div
            key={`${item.objection}-${index}`}
            style={{ border: '1px solid rgba(148,163,184,0.18)', borderRadius: 10, padding: 14 }}
          >
            <p style={{ color: '#dce6ff', fontWeight: 700, margin: '0 0 8px' }}>
              {item.objection}
            </p>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{item.response}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders the suggested implementation roadmap.
 *
 * @param props Parsed roadmap phases.
 * @returns Roadmap timeline.
 */
function ImplementationRoadmapPanel({ phases }: { phases: ImplementationRoadmapPhase[] }) {
  if (phases.length === 0) {
    return <AdminField label="Roadmap sugerido" value="Sem roadmap gerado." />;
  }

  return (
    <div style={{ borderTop: '1px solid rgba(148,163,184,0.18)', paddingTop: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <p className="admin-field-label" style={{ margin: 0 }}>
          Roadmap sugerido
        </p>
        <AdminBadge tone="green">Plano interno</AdminBadge>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {phases
          .slice()
          .sort((a, b) => a.phase - b.phase)
          .map((phase) => (
            <div
              key={`${phase.phase}-${phase.title}`}
              style={{ border: '1px solid rgba(148,163,184,0.18)', borderRadius: 12, padding: 16 }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <AdminBadge tone="blue">{`Fase ${phase.phase}`}</AdminBadge>
                <AdminBadge tone="slate">{phase.estimatedDuration}</AdminBadge>
                <AdminBadge tone="yellow">{formatComplexity(phase.complexity)}</AdminBadge>
              </div>
              <h3 style={{ color: '#f8fafc', fontSize: 16, margin: '0 0 8px' }}>
                {phase.title}
              </h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 12px' }}>
                {phase.description}
              </p>
              <div className="admin-field-grid">
                <AdminField label="Objetivo" value={phase.objective} />
                <AdminField label="Impacto esperado" value={phase.expectedImpact} />
              </div>
              <StringList title="Entregaveis" items={phase.deliverables} />
              <StringList title="Dependencias" items={phase.dependencies} />
            </div>
          ))}
      </div>
    </div>
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
 * Parses the AI Sales Playbook JSON safely.
 *
 * @param value Stored Prisma Json value.
 * @returns Parsed playbook or undefined.
 */
function parseSalesPlaybook(value: unknown): SalesPlaybook | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  return {
    likelyDecisionMaker: normalizeDecisionMaker(stringValue(record.likelyDecisionMaker)),
    painPoints: toStringList(record.painPoints),
    likelyObjections: toSalesObjections(record.likelyObjections),
    quickWins: toStringList(record.quickWins),
    futureCrossSell: toStringList(record.futureCrossSell),
    closingProbability:
      typeof record.closingProbability === 'number' ? record.closingProbability : undefined,
    salesStrategy:
      stringValue(record.salesStrategy) ||
      'Validar contexto, urgencia e criterios de decisao na discovery call.',
    discoveryQuestions: toStringList(record.discoveryQuestions),
  };
}

function normalizeDecisionMaker(value: string): string {
  const normalized = value.trim().toLowerCase();

  return normalized && !['nao identificado', 'não identificado', 'unknown', 'n/a', 'na'].includes(normalized)
    ? value.trim()
    : 'CEO / COO / Diretor de Operacoes';
}

/**
 * Parses playbook objections.
 *
 * @param value Stored Json value.
 * @returns Objection list.
 */
function toSalesObjections(value: unknown): SalesPlaybookObjection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Record<string, unknown>;
    const objection = stringValue(record.objection);
    const response = stringValue(record.response);

    return objection && response ? [{ objection, response }] : [];
  });
}

/**
 * Parses the implementation roadmap JSON safely.
 *
 * @param value Stored Prisma Json value.
 * @returns Ordered roadmap phases.
 */
function parseImplementationRoadmap(value: unknown): ImplementationRoadmapPhase[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Record<string, unknown>;
    const complexity = stringValue(record.complexity).toUpperCase();

    if (
      typeof record.phase !== 'number' ||
      !stringValue(record.title) ||
      !['LOW', 'MEDIUM', 'HIGH'].includes(complexity)
    ) {
      return [];
    }

    return [
      {
        phase: record.phase,
        title: stringValue(record.title),
        description: stringValue(record.description),
        objective: stringValue(record.objective),
        deliverables: toStringList(record.deliverables),
        estimatedDuration: stringValue(record.estimatedDuration) || 'A estimar',
        dependencies: toStringList(record.dependencies),
        expectedImpact: stringValue(record.expectedImpact),
        complexity: complexity as ImplementationRoadmapPhase['complexity'],
      },
    ];
  });
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
/**
 * Parses the internal contract value estimate JSON.
 *
 * @param value Stored Prisma Json value.
 * @returns Parsed estimate or undefined.
 */
function parseContractEstimate(value: unknown): ContractEstimate | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.minimum !== 'number' ||
    typeof record.maximum !== 'number' ||
    record.currency !== 'EUR' ||
    !['LOW', 'MEDIUM', 'HIGH'].includes(String(record.confidence))
  ) {
    return undefined;
  }

  return {
    minimum: record.minimum,
    maximum: record.maximum,
    currency: 'EUR',
    confidence: record.confidence as ContractEstimate['confidence'],
    rationale: typeof record.rationale === 'string' ? record.rationale : undefined,
  };
}

/**
 * Formats a commercial estimate range.
 *
 * @param estimate Parsed estimate.
 * @returns Compact EUR range.
 */
function formatContractEstimate(estimate?: ContractEstimate): string {
  if (!estimate) {
    return 'Não estimado';
  }

  return `${formatCompactEuro(estimate.minimum)}–${formatCompactEuro(estimate.maximum)}`;
}

/**
 * Formats contract confidence into Portuguese.
 *
 * @param confidence Confidence enum value.
 * @returns Portuguese label.
 */
function formatContractConfidence(confidence?: string): string {
  const labels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
  };

  return confidence ? labels[confidence] ?? confidence : 'Não atribuída';
}

/**
 * Formats EUR values in compact notation.
 *
 * @param value Numeric EUR value.
 * @returns Compact display string.
 */
function formatCompactEuro(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k€`;
  }

  return `${value}€`;
}
/**
 * Parses the internal estimated delivery JSON.
 *
 * @param value Stored Prisma Json value.
 * @returns Parsed delivery estimate or undefined.
 */
function parseEstimatedDelivery(value: unknown): EstimatedDelivery | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.range !== 'string') {
    return undefined;
  }

  return {
    range: record.range,
    rationale: typeof record.rationale === 'string' ? record.rationale : undefined,
  };
}

/**
 * Formats implementation complexity into Portuguese.
 *
 * @param complexity Complexity enum value.
 * @returns Portuguese label.
 */
function formatImplementationComplexity(complexity?: string | null): string {
  const labels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
  };

  return complexity ? labels[complexity] ?? complexity : 'Não estimada';
}

/**
 * Returns a delivery fallback from implementation complexity.
 *
 * @param complexity Complexity enum value.
 * @returns Delivery range.
 */
function getDeliveryRange(complexity?: string | null): string {
  const ranges: Record<string, string> = {
    LOW: '2-4 semanas',
    MEDIUM: '4-8 semanas',
    HIGH: '8-16 semanas',
  };

  return complexity ? ranges[complexity] ?? 'Não estimado' : 'Não estimado';
}
