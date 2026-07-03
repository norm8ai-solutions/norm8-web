/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/ExecutiveAuditPreviewEmail.tsx
 * Description: Premium client-facing Executive Audit Preview email.
 * Responsibilities:
 * - Render the AI preview as a compact executive report, not a plain confirmation.
 * - Use only client-safe language and avoid internal commercial scoring.
 * - Keep markup compatible with Gmail, Outlook, and Apple Mail through inline styles.
 * ------------------------------------------------------------------
 */

import type { CSSProperties } from 'react';
import type { EmailTemplateProps } from '../types';

const DEFAULT_LOGO_URL =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6958fdca26373c9614048efe/4f99edd00_Norm8_NewPrimary_Website_NoBG.png';
const FALLBACK_SITE_URL = 'https://norm8.pt';

const containerStyle: CSSProperties = {
  backgroundColor: '#060B14',
  color: '#E8EDF8',
  fontFamily: 'Arial, sans-serif',
  padding: '28px 14px',
};

const cardStyle: CSSProperties = {
  backgroundColor: '#0A1120',
  border: '1px solid #182034',
  borderRadius: 16,
  margin: '0 auto',
  maxWidth: 680,
  overflow: 'hidden',
};

const sectionStyle: CSSProperties = {
  borderTop: '1px solid #182034',
  padding: '26px 30px',
};

const sectionTitleStyle: CSSProperties = {
  color: '#E8EDF8',
  fontSize: 16,
  fontWeight: 800,
  margin: '0 0 12px',
};

type ClientPreviewOpportunity = {
  title?: unknown;
  description?: unknown;
};

type TimelineStep = {
  title: string;
  text: string;
};

type AuditEmailContext = {
  company: string;
  industry?: string;
  toolsUsed?: string;
  mainChallenge?: string;
  mainGoal?: string;
};

/**
 * Renders the Executive Audit Preview for audit request customers.
 *
 * @param props Lead, submission, and audit analysis context.
 * @returns React email template.
 */
export default function ExecutiveAuditPreviewEmail({
  lead,
  submission,
  auditAnalysis,
}: EmailTemplateProps) {
  const auditContext = getAuditEmailContext(submission.payload, lead.company);
  const opportunities = buildOpportunities(
    auditAnalysis?.clientPreviewOpportunities,
    auditContext,
  );
  const benefits = buildBenefits(auditAnalysis?.clientPreviewBenefits, auditContext);
  const readiness = getAutomationReadiness(auditAnalysis?.score);
  const timeline = buildTimeline(
    auditAnalysis?.clientPreviewSummary,
    auditAnalysis?.clientPreviewRecommendedDirection,
    benefits,
    auditContext,
  );
  const architecture = buildArchitecture(opportunities, auditContext);
  const meetingUrl = buildMeetingUrl();
  const logoUrl = process.env.NEXT_PUBLIC_NORM8_LOGO_URL || DEFAULT_LOGO_URL;
  const submissionDate = submission.createdAt.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ padding: '24px 30px 12px' }}>
          {logoUrl ? (
            <img
              alt="Norm8"
              src={logoUrl}
              style={{ display: 'block', height: 'auto', maxWidth: 136, width: 136 }}
            />
          ) : (
            <p style={{ color: '#E8EDF8', fontSize: 18, fontWeight: 800, margin: 0 }}>
              Norm8
            </p>
          )}
        </div>

        <div style={{ backgroundColor: '#0D1526', borderTop: '1px solid #182034', padding: '32px 30px' }}>
          <p style={{ color: '#2563EB', fontSize: 12, fontWeight: 800, margin: '0 0 10px', textTransform: 'uppercase' }}>
            Executive Audit Preview
          </p>
          <h1 style={{ color: '#E8EDF8', fontSize: 28, lineHeight: 1.22, margin: '0 0 14px' }}>
            {auditAnalysis?.clientPreviewTitle ?? `Proposta de Otimização Operacional para ${lead.company}`}
          </h1>
          <p style={{ color: '#8399B8', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px' }}>
            Pré-análise personalizada gerada pela Norm8
          </p>
          <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ color: '#8399B8', fontSize: 12, padding: '0 16px 0 0', textTransform: 'uppercase' }}>
                  Empresa
                </td>
                <td style={{ color: '#8399B8', fontSize: 12, padding: 0, textTransform: 'uppercase' }}>
                  Data
                </td>
              </tr>
              <tr>
                <td style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 700, padding: '4px 16px 0 0' }}>
                  {lead.company}
                </td>
                <td style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 700, padding: '4px 0 0' }}>
                  {submissionDate}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={sectionStyle}>
          <p style={{ color: '#E8EDF8', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
            Analisámos as informações da {lead.company} e identificámos oportunidades
            iniciais para reduzir trabalho manual, melhorar visibilidade operacional
            e estruturar processos mais escaláveis.
          </p>
          <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '14px 0 0' }}>
            Obrigado por preencher a Auditoria Inteligente da Norm8.
          </p>
        </div>

        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Automation Readiness</p>
          <div style={{ backgroundColor: '#0D1526', border: '1px solid #182034', borderRadius: 12, padding: 16 }}>
            <span style={{ backgroundColor: '#2563EB', borderRadius: 999, color: '#ffffff', display: 'inline-block', fontSize: 13, fontWeight: 800, padding: '7px 12px' }}>
              {readiness.label}
            </span>
            <div style={{ backgroundColor: '#182034', borderRadius: 999, height: 8, marginTop: 14, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#2563EB', borderRadius: 999, height: 8, width: readiness.width }} />
            </div>
          </div>
        </div>

        <TextSection title="Resumo inicial" value={auditAnalysis?.clientPreviewSummary} />

        <TimelineSection steps={timeline} />

        {opportunities.length > 0 && (
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Oportunidades identificadas</p>
            {opportunities.map((opportunity, index) => (
              <div key={`${stringValue(opportunity.title)}-${index}`} style={{ backgroundColor: '#0D1526', border: '1px solid #182034', borderRadius: 12, marginBottom: 10, padding: 16 }}>
                <p style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>
                  {stringValue(opportunity.title)}
                </p>
                <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                  {stringValue(opportunity.description)}
                </p>
              </div>
            ))}
          </div>
        )}

        {benefits.length > 0 && (
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Benefícios esperados</p>
            <ul style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
              {benefits.map((benefit) => (
                <li key={benefit} style={{ marginBottom: 6 }}>{benefit}</li>
              ))}
            </ul>
          </div>
        )}

        <ArchitectureSection items={architecture} />

        <TextSection
          title="Direção recomendada"
          value={auditAnalysis?.clientPreviewRecommendedDirection}
        />
        <TextSection title="Próximo passo" value={auditAnalysis?.clientPreviewNextStep} />

        <div style={{ ...sectionStyle, textAlign: 'center' }}>
          <a
            href={meetingUrl}
            style={{
              backgroundColor: '#2563EB',
              borderRadius: 10,
              color: '#ffffff',
              display: 'inline-block',
              fontSize: 14,
              fontWeight: 800,
              padding: '13px 20px',
              textDecoration: 'none',
            }}
          >
            Agendar reunião de descoberta
          </a>
        </div>

        <div style={sectionStyle}>
          <p style={{ color: '#8399B8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Esta pré-análise foi gerada automaticamente pela IA da Norm8 com base nas
            informações fornecidas.
            <br />
            <br />
            Antes de qualquer proposta comercial, um especialista da nossa equipa irá
            validar as recomendações e adaptá-las à realidade específica da sua empresa.
          </p>
        </div>

        <div style={{ backgroundColor: '#060B14', padding: '20px 30px' }}>
          <p style={{ color: '#8399B8', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            Norm8 · Sistemas de IA para operações mais claras, rápidas e escaláveis.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a report text section.
 */
function TextSection({ title, value }: { title: string; value?: string | null }) {
  return (
    <div style={sectionStyle}>
      <p style={sectionTitleStyle}>{title}</p>
      <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.75, margin: 0 }}>
        {value ?? 'A equipa da Norm8 irá validar esta secção na próxima etapa.'}
      </p>
    </div>
  );
}

/**
 * Renders a simple current-state to future-state timeline.
 */
function TimelineSection({ steps }: { steps: TimelineStep[] }) {
  return (
    <div style={sectionStyle}>
      <p style={sectionTitleStyle}>Do estado atual ao sistema ideal</p>
      {steps.map((step, index) => (
        <div key={step.title} style={{ paddingBottom: index === steps.length - 1 ? 0 : 14 }}>
          <p style={{ color: '#2563EB', fontSize: 12, fontWeight: 800, margin: '0 0 4px', textTransform: 'uppercase' }}>
            {index + 1}. {step.title}
          </p>
          <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            {step.text}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Renders a simple email-safe architecture diagram.
 */
function ArchitectureSection({ items }: { items: string[] }) {
  return (
    <div style={sectionStyle}>
      <p style={sectionTitleStyle}>Arquitetura inicial sugerida</p>
      {items.map((item, index) => (
        <div key={`${item}-${index}`}>
          <div style={{ backgroundColor: '#0D1526', border: '1px solid #182034', borderRadius: 10, color: '#E8EDF8', fontSize: 14, fontWeight: 700, padding: '12px 14px', textAlign: 'center' }}>
            {item}
          </div>
          {index < items.length - 1 && (
            <div style={{ color: '#2563EB', fontSize: 18, fontWeight: 800, lineHeight: 1.4, textAlign: 'center' }}>
              ↓
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Extracts the audit form context used to make the email copy specific.
 */
function getAuditEmailContext(payload: unknown, company: string): AuditEmailContext {
  if (!isRecord(payload)) {
    return { company };
  }

  return {
    company,
    industry: stringValue(payload.industry),
    toolsUsed: stringValue(payload.toolsUsed),
    mainChallenge: stringValue(payload.mainChallenge),
    mainGoal: stringValue(payload.mainGoal),
  };
}

/**
 * Converts stored Prisma Json into preview opportunities and completes old short previews.
 */
function buildOpportunities(value: unknown, context: AuditEmailContext): ClientPreviewOpportunity[] {
  const stored = toClientPreviewOpportunities(value)
    .map((item) => ({
      title: stringValue(item.title),
      description: stringValue(item.description),
    }))
    .filter((item) => item.title && item.description);

  return [...stored, ...buildContextualOpportunityFallbacks(context)].slice(0, 3);
}

/**
 * Converts stored Prisma Json into preview opportunities.
 */
function toClientPreviewOpportunities(value: unknown): ClientPreviewOpportunity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is ClientPreviewOpportunity => Boolean(item) && typeof item === 'object',
  );
}

/**
 * Converts stored Prisma Json into string list values.
 */
function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

/**
 * Builds client-safe benefits using submitted audit context when the AI output is short.
 */
function buildBenefits(value: unknown, context: AuditEmailContext): string[] {
  const benefits = toStringList(value).slice(0, 6);
  const fallbackBenefits = buildContextualBenefits(context);

  return [...benefits, ...fallbackBenefits]
    .filter((benefit, index, list) => list.indexOf(benefit) === index)
    .slice(0, 6);
}

/**
 * Builds a safe public readiness label from the internal score.
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
 * Builds the simple transformation timeline without repeating the summary block.
 */
function buildTimeline(
  summary: string | null | undefined,
  recommendedDirection: string | null | undefined,
  benefits: string[] = [],
  context: AuditEmailContext,
): TimelineStep[] {
  const challenge = context.mainChallenge || 'processos que ainda dependem de coordena\u00e7\u00e3o manual';
  const goal = context.mainGoal || 'ganhar maior previsibilidade operacional';
  const tools = context.toolsUsed || 'as ferramentas atuais da equipa';

  return [
    {
      title: 'Estado atual',
      text: shortText(
        context.company + ' parte de um contexto em que ' + challenge.toLowerCase() + ' ainda depende de valida\u00e7\u00f5es, passagem de informa\u00e7\u00e3o e acompanhamento entre equipas.',
        shortText(summary, 'Existem processos com oportunidades de maior clareza, consist\u00eancia e automa\u00e7\u00e3o.'),
      ),
    },
    {
      title: 'Automa\u00e7\u00e3o proposta',
      text: shortText(
        recommendedDirection || 'Criar uma camada de automa\u00e7\u00e3o ligada a ' + tools + ', com fluxos para priorizar pedidos, reduzir tarefas repetitivas e dar visibilidade ao progresso operacional.',
        'Estruturar fluxos operacionais com automa\u00e7\u00e3o, integra\u00e7\u00f5es e visibilidade centralizada.',
      ),
    },
    {
      title: 'Estado futuro',
      text: shortText(
        goal.charAt(0).toUpperCase() + goal.slice(1) + ', com informa\u00e7\u00e3o mais consistente, decis\u00f5es mais r\u00e1pidas e uma base operacional preparada para crescer com menos fric\u00e7\u00e3o.',
        benefits.slice(0, 2).join(', ') || 'Opera\u00e7\u00e3o mais previs\u00edvel, menos trabalho manual e melhor controlo operacional.',
      ),
    },
  ];
}

/**
 * Builds an email-safe architecture diagram from the audit context.
 */
function buildArchitecture(
  opportunities: ClientPreviewOpportunity[],
  context: AuditEmailContext,
): string[] {
  const tools = splitTools(context.toolsUsed).slice(0, 2).join(' + ');
  const primaryOpportunity = stringValue(opportunities[0]?.title);

  return [
    context.industry ? 'Processos e pedidos de ' + context.industry : 'Canais de entrada e pedidos operacionais',
    primaryOpportunity || 'Fluxos priorit\u00e1rios de automa\u00e7\u00e3o',
    tools || 'Sistemas atuais da empresa',
    'Camada Norm8 de automa\u00e7\u00e3o e valida\u00e7\u00e3o',
    'Dashboards executivos e alertas operacionais',
  ];
}

function buildContextualOpportunityFallbacks(context: AuditEmailContext): ClientPreviewOpportunity[] {
  const challenge = context.mainChallenge || 'os processos manuais mais cr\u00edticos';
  const goal = context.mainGoal || 'melhorar a previsibilidade operacional';
  const tools = context.toolsUsed || 'as ferramentas atuais';

  return [
    {
      title: 'Centralizar pedidos e prioridades operacionais',
      description: 'Criar um fluxo \u00fanico para registar, classificar e acompanhar trabalho ligado a ' + challenge.toLowerCase() + ', reduzindo decis\u00f5es dispersas e follow-ups manuais.',
    },
    {
      title: 'Automatizar tarefas repetitivas entre sistemas',
      description: 'Ligar ' + tools + ' a regras simples de triagem, notifica\u00e7\u00f5es e atualiza\u00e7\u00e3o de estados, mantendo a equipa focada nas exce\u00e7\u00f5es que exigem decis\u00e3o humana.',
    },
    {
      title: 'Dar visibilidade executiva ao progresso',
      description: 'Transformar o objetivo de ' + goal.toLowerCase() + ' em indicadores, alertas e uma cad\u00eancia de revis\u00e3o que ajude a dire\u00e7\u00e3o a decidir com informa\u00e7\u00e3o atualizada.',
    },
  ];
}

function buildContextualBenefits(context: AuditEmailContext): string[] {
  const challenge = context.mainChallenge || 'processos operacionais recorrentes';
  const goal = context.mainGoal || 'maior controlo operacional';
  const tools = context.toolsUsed || 'sistemas existentes';

  return [
    'Menos trabalho manual em tarefas ligadas a ' + challenge.toLowerCase() + '.',
    'Melhor visibilidade sobre estado, prioridades e bloqueios operacionais.',
    'Informa\u00e7\u00e3o mais consistente entre ' + tools + ' e as equipas envolvidas.',
    'Processos mais previs\u00edveis para apoiar ' + goal.toLowerCase() + '.',
    'Menos depend\u00eancia de follow-ups manuais e valida\u00e7\u00f5es informais.',
    'Base t\u00e9cnica mais preparada para novas automa\u00e7\u00f5es futuras.',
  ];
}

function splitTools(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Trims long text for visual report blocks.
 */
function shortText(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return value.length > 170 ? `${value.slice(0, 167)}...` : value;
}

/**
 * Returns printable string values only.
 */
function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Builds the public meeting URL for the email CTA.
 */
function buildMeetingUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || FALLBACK_SITE_URL;

  return `${siteUrl}/marcar-reuniao`;
}