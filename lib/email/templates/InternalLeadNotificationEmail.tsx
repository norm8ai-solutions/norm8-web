/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/InternalLeadNotificationEmail.tsx
 * Description: Internal executive briefing email for Norm8 website submissions.
 * Responsibilities:
 * - Summarize Intelligent Audit requests as an enterprise sales briefing.
 * - Keep internal commercial analysis separate from the client-safe preview.
 * - Avoid repeated technical logs and raw field dumps in audit notifications.
 * ------------------------------------------------------------------
 */

import type { CSSProperties } from 'react';
import EmailLogo from '../components/EmailLogo';
import { inferLikelyDecisionMaker } from '@/lib/audit-analysis/normalization';
import type { AuditPriority } from '@/app/generated/prisma/client';
import {
  formatMeetingDate,
  formatMeetingDuration,
  formatMeetingStatus,
  formatMeetingTimeRange,
  formatSubmissionType,
} from '../formatters';
import type { InternalLeadNotificationEmailProps } from '../types';

const containerStyle: CSSProperties = {
  backgroundColor: '#060B14',
  color: '#E8EDF8',
  fontFamily: 'Arial, sans-serif',
  padding: '32px',
};

const cardStyle: CSSProperties = {
  backgroundColor: '#0A1120',
  border: '1px solid #182034',
  borderRadius: 14,
  margin: '0 auto',
  maxWidth: 680,
  padding: 34,
};

const eyebrowStyle: CSSProperties = {
  color: '#2563EB',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0,
  margin: 0,
  textTransform: 'uppercase',
};

const sectionStyle: CSSProperties = {
  borderTop: '1px solid #182034',
  marginTop: 26,
  paddingTop: 22,
};

const sectionTitleStyle: CSSProperties = {
  color: '#E8EDF8',
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: 0,
  margin: '0 0 14px',
  textTransform: 'uppercase',
};

const gridStyle: CSSProperties = {
  display: 'block',
};

const fieldLabelStyle: CSSProperties = {
  color: '#8399B8',
  fontSize: 11,
  fontWeight: 700,
  margin: '0 0 3px',
  textTransform: 'uppercase',
};

const fieldValueStyle: CSSProperties = {
  color: '#E8EDF8',
  fontSize: 14,
  lineHeight: 1.45,
  margin: 0,
};

type OpportunityItem = {
  title?: unknown;
  description?: unknown;
  estimatedImpact?: unknown;
};

type SolutionItem = {
  title?: unknown;
  description?: unknown;
  module?: unknown;
};

type EstimatedDelivery = {
  range: string;
  rationale?: string;
};
type ContractEstimate = {
  minimum: number;
  maximum: number;
  currency: 'EUR';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  rationale?: string;
};

/**
 * Renders the internal notification email.
 *
 * @param props Lead, submission, summary, and optional audit context.
 * @returns React email template.
 */
export default function InternalLeadNotificationEmail({
  lead,
  submission,
  meetingBooking,
  payloadFields,
  summary,
  auditAnalysis,
}: InternalLeadNotificationEmailProps) {
  const isAuditRequest = submission.type === 'AUDIT_REQUEST';

  if (!isAuditRequest) {
    return (
      <GenericInternalNotification
        lead={lead}
        meetingBooking={meetingBooking}
        payloadFields={payloadFields}
        submission={submission}
        summary={summary}
      />
    );
  }

  const company = getPayloadValue(payloadFields, 'company') ?? lead.company;
  const contact = getPayloadValue(payloadFields, 'name') ?? lead.name;
  const website = getPayloadValue(payloadFields, 'website') ?? lead.website;
  const industry = getPayloadValue(payloadFields, 'industry');
  const employees = getPayloadValue(payloadFields, 'employees');
  const annualRevenue = getPayloadValue(payloadFields, 'annualRevenue');
  const toolsUsed = getPayloadValue(payloadFields, 'toolsUsed');
  const mainChallenge = getPayloadValue(payloadFields, 'mainChallenge');
  const contractEstimate = parseContractEstimate(auditAnalysis?.contractValueEstimate);
  const estimatedDelivery = parseEstimatedDelivery(auditAnalysis?.estimatedDelivery);
  const fallbackDecisionMaker = inferLikelyDecisionMaker(industry ? { industry } : null, null);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 22 }}>
          <EmailLogo />
        </div>
        <p style={eyebrowStyle}>NORM8 INTERNAL BRIEFING</p>
        <h1 style={{ fontSize: 25, lineHeight: 1.25, margin: '12px 0 6px' }}>
          Nova Auditoria Inteligente
        </h1>
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Resumo comercial preparado para qualificacao e proximo contacto.
        </p>

        <ExecutiveSummarySection
          auditAnalysis={auditAnalysis}
          company={company}
          contact={contact}
          contractEstimate={contractEstimate}
          estimatedDelivery={estimatedDelivery}
          industry={industry}
        />

        <CompanySection
          annualRevenue={annualRevenue}
          company={company}
          employees={employees}
          industry={industry}
          toolsUsed={toolsUsed}
          website={website}
        />

        <AuditAnalysisSection
          auditAnalysis={auditAnalysis}
          fallbackProblem={mainChallenge}
        />

        <ClientPreviewSection auditAnalysis={auditAnalysis} />
        <SalesPlaybookEmailSection auditAnalysis={auditAnalysis} fallbackDecisionMaker={fallbackDecisionMaker} />
        <RoadmapEmailSection auditAnalysis={auditAnalysis} />
      </div>
    </div>
  );
}

/**
 * Renders a compact executive summary for the sales team.
 */
function ExecutiveSummarySection({
  auditAnalysis,
  company,
  contact,
  contractEstimate,
  estimatedDelivery,
  industry,
}: {
  auditAnalysis: InternalLeadNotificationEmailProps['auditAnalysis'];
  company?: string | null;
  contact?: string | null;
  contractEstimate?: ContractEstimate;
  estimatedDelivery?: EstimatedDelivery;
  industry?: string;
}) {
  return (
    <section style={{ ...sectionStyle, marginTop: 24 }}>
      <p style={sectionTitleStyle}>Executive Summary</p>
      <div style={gridStyle}>
        <BriefField label="Empresa" value={company ?? 'Nao indicada'} />
        <BriefField label="Contacto" value={contact ?? 'Nao indicado'} />
        <BriefField label="Setor" value={industry ?? 'Nao indicado'} />
        <BriefField label="Estado" value="Nova Lead" />
        <BriefField label="Prioridade" value={formatAuditPriority(auditAnalysis?.priority)} />
        <BriefField
          label="Audit Score"
          value={
            auditAnalysis?.score === null || auditAnalysis?.score === undefined
              ? 'Nao atribuido'
              : `${auditAnalysis.score}/100`
          }
        />
        <BriefField
          label="Potencial Contrato"
          value={formatContractEstimate(contractEstimate)}
        />
        <BriefField
          label="Potencial Comercial"
          value={`${formatCommercialStars(auditAnalysis?.priority)} ${formatPrioritySignal(auditAnalysis?.priority)}`}
        />
        <BriefField
          label="Complexidade"
          value={formatImplementationComplexity(auditAnalysis?.implementationComplexity)}
        />
        <BriefField
          label="Tempo estimado"
          value={estimatedDelivery?.range ?? getDeliveryRange(auditAnalysis?.implementationComplexity)}
        />
        <BriefField
          label="Probabilidade de Fecho"
          value={
            auditAnalysis?.closingProbability === null ||
            auditAnalysis?.closingProbability === undefined
              ? 'Nao estimada'
              : `${auditAnalysis.closingProbability}%`
          }
        />
      </div>
      <div style={{ marginTop: 14 }}>
        <BriefField
          label="Proximo passo"
          value={auditAnalysis?.nextStep ?? 'Discovery Call'}
        />
      </div>
    </section>
  );
}

/**
 * Renders concise company context without repeating contact details.
 */
function CompanySection({
  annualRevenue,
  company,
  employees,
  industry,
  toolsUsed,
  website,
}: {
  annualRevenue?: string;
  company?: string | null;
  employees?: string;
  industry?: string;
  toolsUsed?: string;
  website?: string | null;
}) {
  return (
    <section style={sectionStyle}>
      <p style={sectionTitleStyle}>Empresa</p>
      <div style={gridStyle}>
        <BriefField label="Nome" value={company ?? 'Nao indicado'} />
        <BriefField label="Website" value={website ?? 'Nao indicado'} />
        <BriefField label="Setor" value={industry ?? 'Nao indicado'} />
        <BriefField label="Colaboradores" value={employees ?? 'Nao indicado'} />
        <BriefField label="Receita" value={annualRevenue ?? 'Nao indicada'} />
        <BriefField label="Ferramentas" value={toolsUsed ?? 'Nao indicadas'} />
      </div>
    </section>
  );
}

/**
 * Renders only the internal AI analysis needed for commercial action.
 */
function AuditAnalysisSection({
  auditAnalysis,
  fallbackProblem,
}: {
  auditAnalysis: InternalLeadNotificationEmailProps['auditAnalysis'];
  fallbackProblem?: string;
}) {
  if (!auditAnalysis) {
    return (
      <NoticeSection
        title="AI Audit Analysis"
        text="A analise IA ainda nao esta disponivel. Rever a submissao no Admin Dashboard."
      />
    );
  }

  if (auditAnalysis.status === 'FAILED') {
    return (
      <NoticeSection
        title="AI Audit Analysis"
        text={`A analise IA falhou e deve ser revista no Admin Dashboard.${
          auditAnalysis.errorMessage ? ` Erro: ${auditAnalysis.errorMessage}` : ''
        }`}
      />
    );
  }

  const problems = toOpportunityItems(auditAnalysis.operationalProblems).slice(0, 3);
  const opportunities = toOpportunityItems(auditAnalysis.automationOpportunities).slice(0, 3);
  const solutions = toSolutionItems(auditAnalysis.recommendedSolutions).slice(0, 3);

  return (
    <section style={sectionStyle}>
      <p style={sectionTitleStyle}>AI Audit Analysis</p>
      <BriefParagraph label="Resumo Executivo" value={auditAnalysis.internalSummary ?? fallbackProblem ?? 'Nao disponivel'} />
      <CompactList title="Problemas encontrados" items={problems} />
      <CompactList title="Oportunidades" items={opportunities} />
      <CompactList title="Solucoes sugeridas" items={solutions} />
      <BriefParagraph label="Proximo passo" value={auditAnalysis.nextStep ?? 'Nao disponivel'} />
    </section>
  );
}

/**
 * Renders the client-facing preview that was sent, without internal details.
 */
function ClientPreviewSection({
  auditAnalysis,
}: Pick<InternalLeadNotificationEmailProps, 'auditAnalysis'>) {
  if (!hasClientPreview(auditAnalysis)) {
    return (
      <NoticeSection
        title="Executive Preview enviado ao cliente"
        text="Foi enviado o email simples de rececao ao cliente."
      />
    );
  }

  const opportunities = toOpportunityItems(auditAnalysis.clientPreviewOpportunities).slice(0, 3);
  const benefits = toStringList(auditAnalysis.clientPreviewBenefits).slice(0, 5);
  const readiness = getAutomationReadiness(auditAnalysis.score);
  const timeline = buildClientTimeline(
    auditAnalysis.clientPreviewSummary,
    auditAnalysis.clientPreviewRecommendedDirection,
    benefits,
  );
  const architecture = buildClientArchitecture(opportunities);
  const ctaUrl = buildMeetingUrl();

  return (
    <section style={sectionStyle}>
      <p style={sectionTitleStyle}>Executive Preview enviado ao cliente</p>
      <BriefParagraph label="Titulo enviado" value={auditAnalysis.clientPreviewTitle} />
      <BriefParagraph label="Readiness publico" value={readiness.label} />
      <CompactStringList title="Timeline resumida" items={timeline.map((step) => `${step.title}: ${step.text}`)} />
      <BriefParagraph label="Resumo enviado" value={auditAnalysis.clientPreviewSummary} />
      <CompactList title="Oportunidades enviadas" items={opportunities} />
      <CompactStringList title="Beneficios enviados" items={benefits} />
      <CompactStringList title="Arquitetura sugerida" items={architecture} />
      <BriefParagraph
        label="Direcao recomendada enviada"
        value={auditAnalysis.clientPreviewRecommendedDirection}
      />
      <BriefParagraph
        label="Proximo passo enviado"
        value={auditAnalysis.clientPreviewNextStep}
      />
      <BriefParagraph label="CTA enviado" value={`Agendar reuniao de descoberta - ${ctaUrl}`} />
    </section>
  );
}


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

type RoadmapPhase = {
  phase: number;
  title: string;
  estimatedDuration: string;
  complexity: string;
};

/**
 * Renders a compact internal sales playbook summary.
 */
function SalesPlaybookEmailSection({
  auditAnalysis,
  fallbackDecisionMaker,
}: Pick<InternalLeadNotificationEmailProps, 'auditAnalysis'> & { fallbackDecisionMaker: string }) {
  const playbook = parseSalesPlaybook(auditAnalysis?.salesPlaybook, fallbackDecisionMaker);

  if (!playbook) {
    return null;
  }

  const probability = playbook.closingProbability ?? auditAnalysis?.closingProbability;

  return (
    <section style={sectionStyle}>
      <p style={sectionTitleStyle}>Sales Playbook</p>
      <div style={gridStyle}>
        <BriefField label="Decisor provavel" value={playbook.likelyDecisionMaker} />
        <BriefField
          label="Probabilidade de Fecho"
          value={probability === null || probability === undefined ? 'Nao estimada' : `${probability}%`}
        />
      </div>
      <CompactStringList title="3 principais dores" items={playbook.painPoints.slice(0, 3)} />
      <CompactStringList
        title="3 objecoes provaveis"
        items={playbook.likelyObjections.slice(0, 3).map((item) => item.objection)}
      />
      <CompactStringList title="3 quick wins" items={playbook.quickWins.slice(0, 3)} />
      <BriefParagraph label="Proxima abordagem comercial" value={playbook.salesStrategy} />
    </section>
  );
}

/**
 * Renders a compact roadmap summary for the internal briefing.
 */
function RoadmapEmailSection({
  auditAnalysis,
}: Pick<InternalLeadNotificationEmailProps, 'auditAnalysis'>) {
  const phases = parseRoadmap(auditAnalysis?.implementationRoadmap);

  if (phases.length === 0) {
    return null;
  }

  return (
    <section style={sectionStyle}>
      <p style={sectionTitleStyle}>Roadmap sugerido</p>
      <CompactStringList
        title="Fases principais"
        items={phases.map((phase) => `Fase ${phase.phase}: ${phase.title} - ${phase.estimatedDuration}`)}
      />
    </section>
  );
}

type ClientTimelineStep = {
  title: string;
  text: string;
};

/**
 * Builds a client-safe readiness label from internal score.
 */
function getAutomationReadiness(score?: number | null): { label: string; width: string } {
  if (score === null || score === undefined) {
    return { label: 'Potencial inicial', width: '42%' };
  }

  if (score >= 75) {
    return { label: 'Alto potencial', width: '86%' };
  }

  if (score >= 50) {
    return { label: 'Bom potencial', width: '66%' };
  }

  return { label: 'Potencial inicial', width: '46%' };
}

/**
 * Builds the same summarized timeline reflected in the client email.
 */
function buildClientTimeline(
  summary?: string | null,
  recommendedDirection?: string | null,
  benefits: string[] = [],
): ClientTimelineStep[] {
  return [
    {
      title: 'Estado atual',
      text: shortText(summary, 'Processos com oportunidades de maior clareza, consistencia e automacao.'),
    },
    {
      title: 'Automacao proposta',
      text: shortText(recommendedDirection, 'Fluxos operacionais estruturados com automacao e visibilidade centralizada.'),
    },
    {
      title: 'Estado futuro',
      text: shortText(benefits.slice(0, 2).join(', '), 'Operacao mais previsivel, menos trabalho manual e melhor controlo operacional.'),
    },
  ];
}

/**
 * Builds the architecture summary reflected in the client email.
 */
function buildClientArchitecture(opportunities: OpportunityItem[]): string[] {
  const middle = stringValue(opportunities[0]?.title) || 'Camada de Automacao Norm8';

  return [
    'Canais de Entrada',
    middle,
    'CRM / ERP / Dashboards',
    'Equipa Operacional',
  ];
}

/**
 * Trims long preview copy for compact internal display.
 */
function shortText(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return value.length > 150 ? `${value.slice(0, 147)}...` : value;
}

/**
 * Builds the public meeting URL used by the customer email CTA.
 */
function buildMeetingUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://norm8.pt';

  return `${siteUrl}/marcar-reuniao`;
}

/**
 * Keeps non-audit notifications functional without the audit executive layout.
 */
function GenericInternalNotification({
  lead,
  meetingBooking,
  payloadFields,
  submission,
  summary,
}: Omit<InternalLeadNotificationEmailProps, 'auditAnalysis'>) {
  const isMeetingRequest = submission.type === 'MEETING_REQUEST' && meetingBooking;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 22 }}>
          <EmailLogo />
        </div>
        <p style={eyebrowStyle}>NORM8 INTERNAL BRIEFING</p>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: '12px 0 16px' }}>
          Nova submissao recebida no website Norm8
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>{summary}</p>
        <section style={sectionStyle}>
          <p style={sectionTitleStyle}>{formatSubmissionType(submission.type)}</p>
          <div style={gridStyle}>
            <BriefField label="Empresa" value={lead.company} />
            <BriefField label="Contacto" value={lead.name ?? 'Nao indicado'} />
            <BriefField label="Email" value={lead.email} />
            <BriefField label="Telefone" value={lead.phone ?? 'Nao indicado'} />
          </div>
          {isMeetingRequest && (
            <p style={{ fontSize: 14, lineHeight: 1.7, margin: '18px 0 0' }}>
              <strong>Estado:</strong> {formatMeetingStatus(meetingBooking.status)}
              <br />
              <strong>Data:</strong> {formatMeetingDate(meetingBooking.startsAt, meetingBooking.timezone)}
              <br />
              <strong>Hora:</strong>{' '}
              {formatMeetingTimeRange(meetingBooking.startsAt, meetingBooking.endsAt, meetingBooking.timezone)}
              <br />
              <strong>Duracao:</strong> {formatMeetingDuration(meetingBooking.startsAt, meetingBooking.endsAt)}
            </p>
          )}
          {!isMeetingRequest && (
            <CompactTextFields fields={payloadFields} />
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Renders one compact label/value item.
 */
function BriefField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: '#0D1526', border: '1px solid #182034', borderRadius: 12, display: 'inline-block', margin: '0 10px 12px 0', padding: 14, verticalAlign: 'top', width: '44%' }}>
      <p style={fieldLabelStyle}>{label}</p>
      <p style={fieldValueStyle}>{value}</p>
    </div>
  );
}

/**
 * Renders a labelled paragraph.
 */
function BriefParagraph({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={fieldLabelStyle}>{label}</p>
      <p style={{ ...fieldValueStyle, lineHeight: 1.65 }}>{value || 'Nao disponivel'}</p>
    </div>
  );
}

/**
 * Renders a short list of analysis items.
 */
function CompactList({ title, items }: { title: string; items: OpportunityItem[] }) {
  if (items.length === 0) {
    return <BriefParagraph label={title} value="Nao disponivel" />;
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <p style={fieldLabelStyle}>{title}</p>
      <ul style={{ color: '#E8EDF8', fontSize: 14, lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
        {items.map((item, index) => (
          <li key={`${title}-${index}`} style={{ marginBottom: 6 }}>
            <strong>{stringValue(item.title) || 'Item'}</strong>
            {stringValue(item.description) ? [' - ', stringValue(item.description)].join('') : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}


/**
 * Renders a short list of plain text values.
 */
function CompactStringList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return <BriefParagraph label={title} value="Nao disponivel" />;
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <p style={fieldLabelStyle}>{title}</p>
      <ul style={{ color: '#E8EDF8', fontSize: 14, lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
        {items.map((item) => (
          <li key={item} style={{ marginBottom: 6 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Converts stored Prisma Json into strings.
 */
function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
/**
 * Renders raw generic payload fields only for non-audit notifications.
 */
function CompactTextFields({
  fields,
}: {
  fields: InternalLeadNotificationEmailProps['payloadFields'];
}) {
  return (
    <div style={{ marginTop: 18 }}>
      {fields.slice(0, 8).map((field) => (
        <BriefParagraph key={field.label} label={field.label} value={field.value} />
      ))}
    </div>
  );
}

/**
 * Renders a minimal notice section.
 */
function NoticeSection({ title, text }: { title: string; text: string }) {
  return (
    <section style={sectionStyle}>
      <p style={sectionTitleStyle}>{title}</p>
      <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{text}</p>
    </section>
  );
}

function normalizeDecisionMaker(value: string | undefined, fallbackDecisionMaker: string): string {
  const trimmed = value?.trim();
  const normalized = trimmed?.toLowerCase();

  if (!trimmed || !normalized || ['nao identificado', 'não identificado', 'unknown', 'n/a', 'na'].includes(normalized)) {
    return fallbackDecisionMaker;
  }

  return trimmed;
}

/**
 * Parses the AI Sales Playbook JSON for compact email display.
 */
function parseSalesPlaybook(value: unknown, fallbackDecisionMaker = 'CEO / COO / Diretor de Operacoes'): SalesPlaybook | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  return {
    likelyDecisionMaker: normalizeDecisionMaker(stringValue(record.likelyDecisionMaker), fallbackDecisionMaker),
    painPoints: toStringList(record.painPoints),
    likelyObjections: toSalesObjections(record.likelyObjections),
    quickWins: toStringList(record.quickWins),
    futureCrossSell: toStringList(record.futureCrossSell),
    closingProbability:
      typeof record.closingProbability === 'number' ? record.closingProbability : undefined,
    salesStrategy: stringValue(record.salesStrategy) || 'Validar contexto na discovery call.',
    discoveryQuestions: toStringList(record.discoveryQuestions),
  };
}

/**
 * Parses sales objections from the playbook JSON.
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
 * Parses roadmap phases for compact email display.
 */
function parseRoadmap(value: unknown): RoadmapPhase[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Record<string, unknown>;

    if (typeof record.phase !== 'number' || !stringValue(record.title)) {
      return [];
    }

    return [
      {
        phase: record.phase,
        title: stringValue(record.title),
        estimatedDuration: stringValue(record.estimatedDuration) || 'A estimar',
        complexity: stringValue(record.complexity) || 'MEDIUM',
      },
    ];
  });
}
/**
 * Gets a payload value by raw field label.
 */
function getPayloadValue(
  fields: InternalLeadNotificationEmailProps['payloadFields'],
  label: string,
): string | undefined {
  const value = fields.find((field) => field.label === label)?.value;

  if (label === 'industry' && value === 'Outro') {
    return 'Nao especificado';
  }

  return value;
}

/**
 * Safely converts stored Prisma Json into analysis list items.
 */
function toOpportunityItems(value: unknown): OpportunityItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is OpportunityItem => Boolean(item) && typeof item === 'object',
  );
}

/**
 * Safely converts stored Prisma Json into suggested solution items.
 */
function toSolutionItems(value: unknown): SolutionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is SolutionItem => Boolean(item) && typeof item === 'object',
  );
}

/**
 * Returns a string only when the value is printable text.
 */
function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Parses the internal contract value estimate.
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
 * Formats a contract estimate as a compact range.
 */
function formatContractEstimate(estimate?: ContractEstimate): string {
  if (!estimate) {
    return 'Nao estimado';
  }

  return `${formatCompactEuro(estimate.minimum)}-${formatCompactEuro(estimate.maximum)}`;
}

/**
 * Formats EUR values in compact executive notation.
 */
function formatCompactEuro(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k EUR`;
  }

  return `${value} EUR`;
}


/**
 * Parses the estimated delivery JSON.
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
 */
function formatImplementationComplexity(complexity?: string | null): string {
  const labels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Media',
    HIGH: 'Alta',
  };

  return complexity ? labels[complexity] ?? complexity : 'Nao estimada';
}

/**
 * Converts implementation complexity into a delivery range fallback.
 */
function getDeliveryRange(complexity?: string | null): string {
  const ranges: Record<string, string> = {
    LOW: '2-4 semanas',
    MEDIUM: '4-8 semanas',
    HIGH: '8-16 semanas',
  };

  return complexity ? ranges[complexity] ?? 'Nao estimado' : 'Nao estimado';
}

/**
 * Formats a visual commercial priority rating.
 */
function formatCommercialStars(priority?: AuditPriority | null): string {
  const starsByPriority: Record<AuditPriority, string> = {
    LOW: '2/5',
    MEDIUM: '3/5',
    HIGH: '4/5',
    URGENT: '5/5',
  };

  return priority ? starsByPriority[priority] : '0/5';
}

/**
 * Formats a short commercial priority signal.
 */
function formatPrioritySignal(priority?: AuditPriority | null): string {
  if (priority === 'URGENT' || priority === 'HIGH') {
    return 'Alta prioridade';
  }

  if (priority === 'MEDIUM') {
    return 'Prioridade media';
  }

  return 'Prioridade baixa';
}
/**
 * Formats contract confidence labels.
 */
function formatContractConfidence(confidence?: string): string {
  const labels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Media',
    HIGH: 'Alta',
  };

  return confidence ? labels[confidence] ?? confidence : 'Nao atribuida';
}

/**
 * Formats audit priority for internal email.
 */
function formatAuditPriority(priority?: AuditPriority | null): string {
  const labels: Record<AuditPriority, string> = {
    LOW: '2/5',
    MEDIUM: '3/5',
    HIGH: '4/5',
    URGENT: '5/5',
  };

  return priority ? labels[priority] : 'Nao atribuida';
}

/**
 * Checks whether a completed analysis has client preview data.
 */
function hasClientPreview(
  auditAnalysis: InternalLeadNotificationEmailProps['auditAnalysis'],
): auditAnalysis is NonNullable<InternalLeadNotificationEmailProps['auditAnalysis']> {
  return Boolean(
    auditAnalysis?.status === 'COMPLETED' &&
      auditAnalysis.clientPreviewSummary &&
      Array.isArray(auditAnalysis.clientPreviewOpportunities) &&
      auditAnalysis.clientPreviewOpportunities.length > 0,
  );
}
