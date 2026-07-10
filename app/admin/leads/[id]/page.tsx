/**
 * ------------------------------------------------------------------
 * File: app/admin/leads/[id]/page.tsx
 * Description: Lead detail page for the Norm8 admin dashboard.
 * Responsibilities:
 * - Show lead profile, related submissions, meetings, emails, activities, and notifications.
 * - Allow status and priority updates.
 * - Allow internal notes through LeadActivity records.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import { LeadActionsPanel } from '@/components/admin/LeadActionsPanel';
import { Norm8Select } from '@/components/ui/norm8-select';
import { notFound } from 'next/navigation';
import {
  LeadPriorityBadge,
  LeadStatusBadge,
  MeetingStatusBadge,
  NotificationStatusBadge,
  SubmissionTypeBadge,
} from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminField,
  AdminPanel,
  AdminRow,
} from '@/components/admin/AdminPrimitives';
import {
  addLeadNote,
  updateLeadPriority,
  updateLeadStatus,
} from '@/lib/admin/actions';
import { getSuggestedNextLeadAction } from '@/lib/admin/lead-action-suggestions';
import {
  formatDatePt,
  formatMeetingDate,
  formatTimeRangePt,
  getSubmissionDisplayData,
} from '@/lib/admin/formatters';
import { getLeadById } from '@/lib/admin/queries';



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
type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ actionError?: string; actionExecutionError?: string }>;
};

const leadStatuses = ['NEW', 'QUALIFIED', 'CONTACTED', 'CONVERTED', 'LOST'] as const;
const leadPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

/**
 * Renders lead detail and lightweight admin management controls.
 *
 * @param props Route params with lead id.
 * @returns Lead detail page.
 */
export default async function LeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  const latestAnalysis = lead.auditAnalyses[0];
  const latestContractEstimate = parseContractEstimate(
    latestAnalysis?.contractValueEstimate,
  );
  const latestEstimatedDelivery = parseEstimatedDelivery(latestAnalysis?.estimatedDelivery);
  const suggestedAction = getSuggestedNextLeadAction({
    status: lead.status,
    priority: lead.priority,
    submissions: lead.submissions,
    auditAnalyses: lead.auditAnalyses,
    meetingBookings: lead.meetingBookings,
    emailLogs: lead.emailLogs,
    leadActions: lead.leadActions,
  });
  const latestSubmissionId = latestAnalysis?.submissionId ?? lead.submissions[0]?.id;
  const executionContext = {
    auditSummary: latestAnalysis?.internalSummary ?? latestAnalysis?.companySummary ?? null,
    latestSubmissionId,
    leadCompany: lead.company,
    leadEmail: lead.email,
    leadId: lead.id,
    leadName: lead.name,
    potentialEstimate: formatContractEstimate(latestContractEstimate),
  };

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title={lead.name ?? 'Lead sem nome'}
        subtitle={`${lead.company} · ${lead.email}`}
        action={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <LeadStatusBadge status={lead.status} />
            <LeadPriorityBadge priority={lead.priority} />
          </div>
        }
      >
        <div className="admin-filters">
          <form action={updateLeadStatus} className="admin-filters">
            <input name="leadId" type="hidden" value={lead.id} />
            <Norm8Select
              defaultValue={lead.status}
              name="status"
              options={leadStatuses.map((status) => ({
                value: status,
                label: status,
              }))}
            />
            <button className="admin-button" type="submit">
              Atualizar estado
            </button>
          </form>

          <form action={updateLeadPriority} className="admin-filters">
            <input name="leadId" type="hidden" value={lead.id} />
            <Norm8Select
              defaultValue={lead.priority}
              name="priority"
              options={leadPriorities.map((priority) => ({
                value: priority,
                label: priority,
              }))}
            />
            <button className="admin-button admin-button-muted" type="submit">
              Atualizar prioridade
            </button>
          </form>
        </div>
      </AdminPanel>

      <section className="admin-grid-main-aside">
        <div className="admin-page-grid">
          <LeadActionsPanel
            actionError={query?.actionError}
            actions={lead.leadActions}
            executionContext={executionContext}
            executionError={query?.actionExecutionError}
            leadId={lead.id}
            suggestedAction={suggestedAction}
          />

          <AdminPanel title="Nota interna" subtitle="Regista contexto comercial para a equipa.">
            <form action={addLeadNote} style={{ display: 'grid', gap: 12 }}>
              <input name="leadId" type="hidden" value={lead.id} />
              <textarea
                className="admin-textarea"
                name="message"
                placeholder="Adicionar nota..."
              />
              <button className="admin-button" style={{ width: 180 }} type="submit">
                Guardar nota
              </button>
            </form>
          </AdminPanel>

          <AdminPanel title="Submissões" subtitle="Pedidos associados ao lead.">
            {lead.submissions.length > 0 ? (
              <div className="admin-row-list">
                {lead.submissions.map((submission) => {
                  const display = getSubmissionDisplayData({
                    payload: submission.payload,
                    lead,
                  });

                  return (
                    <AdminRow
                      key={submission.id}
                      title={
                        <Link className="admin-link" href={`/admin/submissions/${submission.id}`}>
                          <SubmissionTypeBadge type={submission.type} />
                        </Link>
                      }
                      meta={`${display.company ?? 'Sem empresa'} · ${formatDatePt(submission.createdAt)}`}
                    >
                      {display.name ?? 'Sem nome'} · {display.summary}
                    </AdminRow>
                  );
                })}
              </div>
            ) : (
              <AdminEmptyState>Sem submissões associadas.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Timeline de atividades" subtitle="Histórico operacional do lead.">
            {lead.activities.length > 0 ? (
              <div className="admin-timeline">
                {lead.activities.map((activity) => (
                  <div className="admin-timeline-item" key={activity.id}>
                    <p className="admin-row-title">{activity.type}</p>
                    <p className="admin-row-text">{activity.message}</p>
                    <p className="admin-row-meta">{formatDatePt(activity.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem atividades registadas.</AdminEmptyState>
            )}
          </AdminPanel>
        </div>

        <aside className="admin-page-grid">
          <AdminPanel title="Dados do lead">
            <div className="admin-field-grid">
              <AdminField label="Nome" value={lead.name} />
              <AdminField label="Empresa" value={lead.company} />
              <AdminField label="Email" value={lead.email} />
              <AdminField label="Telefone" value={lead.phone} />
              <AdminField label="Website" value={lead.website} />
              <AdminField label="Origem" value={lead.source} />
              <AdminField label="Criado em" value={formatDatePt(lead.createdAt)} />
              <AdminField label="Atualizado" value={formatDatePt(lead.updatedAt)} />
            </div>
          </AdminPanel>

          
          <AdminPanel title="Potencial Comercial">
            <div className="admin-field-grid">
              <AdminField
                label="Valor estimado"
                value={formatContractEstimate(latestContractEstimate)}
              />
              <AdminField
                label="Probabilidade de Fecho"
                value={
                  latestAnalysis?.closingProbability === null ||
                  latestAnalysis?.closingProbability === undefined
                    ? 'Não estimada'
                    : `${latestAnalysis.closingProbability}%`
                }
              />
              <AdminField
                label="Tempo estimado"
                value={
                  latestEstimatedDelivery?.range ??
                  getDeliveryRange(latestAnalysis?.implementationComplexity)
                }
              />
              <AdminField
                label="Complexidade"
                value={formatImplementationComplexity(latestAnalysis?.implementationComplexity)}
              />
              <AdminField
                label="Confiança"
                value={formatContractConfidence(latestContractEstimate?.confidence)}
              />
              <AdminField
                label="Justificação"
                value={latestContractEstimate?.rationale ?? 'Não disponível'}
              />
            </div>
          </AdminPanel>
          <AdminPanel title="AI Sales Assets" subtitle="Resumo da análise mais recente.">
            {latestAnalysis ? (
              <div className="admin-field-grid">
                <AdminField
                  label="Sales Playbook"
                  value={latestAnalysis.salesPlaybook ? 'Disponível' : 'Não gerado'}
                />
                <AdminField
                  label="Roadmap sugerido"
                  value={latestAnalysis.implementationRoadmap ? 'Disponível' : 'Não gerado'}
                />
                <AdminField
                  label="Detalhe completo"
                  value={
                    <Link
                      className="admin-link"
                      href={`/admin/submissions/${latestAnalysis.submissionId}`}
                    >
                      Abrir submissão
                    </Link>
                  }
                />
              </div>
            ) : (
              <AdminEmptyState>Sem análise IA associada.</AdminEmptyState>
            )}
          </AdminPanel>
          <AdminPanel title="Reuniões">
            {lead.meetingBookings.length > 0 ? (
              <div className="admin-row-list">
                {lead.meetingBookings.map((meeting) => (
                  <AdminRow
                    key={meeting.id}
                    title={formatMeetingDate(meeting.startsAt, meeting.timezone)}
                    meta={formatTimeRangePt(
                      meeting.startsAt,
                      meeting.endsAt,
                      meeting.timezone,
                    )}
                  >
                    <MeetingStatusBadge status={meeting.status} />
                  </AdminRow>
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem reuniões registadas.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Emails">
            {lead.emailLogs.length > 0 ? (
              <div className="admin-row-list">
                {lead.emailLogs.map((email) => (
                  <AdminRow
                    key={email.id}
                    title={email.subject}
                    meta={`${email.status} · ${formatDatePt(email.createdAt)}`}
                  />
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem emails registados.</AdminEmptyState>
            )}
          </AdminPanel>

          <AdminPanel title="Notificações">
            {lead.notifications.length > 0 ? (
              <div className="admin-row-list">
                {lead.notifications.map((notification) => (
                  <AdminRow
                    key={notification.id}
                    title={
                      <>
                        {notification.title}{' '}
                        <NotificationStatusBadge status={notification.status} />
                      </>
                    }
                    meta={formatDatePt(notification.createdAt)}
                  />
                ))}
              </div>
            ) : (
              <AdminEmptyState>Sem notificações associadas.</AdminEmptyState>
            )}
          </AdminPanel>
        </aside>
      </section>
    </div>
  );
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
