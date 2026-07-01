/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/ExecutiveAuditPreviewEmail.tsx
 * Description: Client-facing Executive Audit Preview email for Intelligent Audit requests.
 * Responsibilities:
 * - Deliver a safe, consultative pre-analysis to the client.
 * - Show opportunities, benefits, recommended direction, and next step.
 * - Avoid internal score, commercial priority, and internal sales language.
 * ------------------------------------------------------------------
 */

import type { CSSProperties } from 'react';
import type { EmailTemplateProps } from '../types';

const containerStyle: CSSProperties = {
  backgroundColor: '#f6f8fb',
  color: '#111827',
  fontFamily: 'Arial, sans-serif',
  padding: '32px',
};

const cardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  margin: '0 auto',
  maxWidth: 640,
  padding: 32,
};

const sectionTitleStyle: CSSProperties = {
  color: '#111827',
  fontSize: 16,
  fontWeight: 700,
  margin: '24px 0 10px',
};

const DISCOVERY_MEETING_NEXT_STEP =
  'O próximo passo recomendado é uma reunião de descoberta de 30 minutos para validar os processos críticos e definir um plano inicial de implementação.';

type ClientPreviewOpportunity = {
  title?: unknown;
  description?: unknown;
};

/**
 * Renders the Executive Audit Preview for audit request customers.
 *
 * @param props Lead, submission, and audit analysis context.
 * @returns React email template.
 */
export default function ExecutiveAuditPreviewEmail({
  lead,
  auditAnalysis,
}: EmailTemplateProps) {
  const opportunities = toClientPreviewOpportunities(
    auditAnalysis?.clientPreviewOpportunities,
  );
  const benefits = toStringList(auditAnalysis?.clientPreviewBenefits);
  const meetingUrl = buildMeetingUrl();

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Norm8
        </p>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: '12px 0 16px' }}>
          {auditAnalysis?.clientPreviewTitle ?? 'A sua pré-análise de automação'}
        </h1>

        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Olá{lead.name ? `, ${lead.name}` : ''}.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Obrigado por preencher a Auditoria Inteligente da Norm8.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Com base nas informações iniciais da {lead.company}, preparámos uma
          primeira pré-análise com possíveis oportunidades de automação.
        </p>

        <p style={sectionTitleStyle}>Resumo inicial</p>
        <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>
          {auditAnalysis?.clientPreviewSummary}
        </p>

        {opportunities.length > 0 && (
          <>
            <p style={sectionTitleStyle}>Oportunidades identificadas</p>
            <ol style={{ fontSize: 15, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
              {opportunities.map((opportunity, index) => (
                <li key={`${stringValue(opportunity.title)}-${index}`} style={{ marginBottom: 10 }}>
                  <strong>{stringValue(opportunity.title)}</strong>
                  <br />
                  {stringValue(opportunity.description)}
                </li>
              ))}
            </ol>
          </>
        )}

        {benefits.length > 0 && (
          <>
            <p style={sectionTitleStyle}>Benefícios esperados</p>
            <ul style={{ fontSize: 15, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
              {benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </>
        )}

        <p style={sectionTitleStyle}>Direção recomendada</p>
        <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>
          {auditAnalysis?.clientPreviewRecommendedDirection}
        </p>

        <p style={sectionTitleStyle}>Próximo passo</p>
        <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>
          {DISCOVERY_MEETING_NEXT_STEP}
        </p>

        {meetingUrl && (
          <p style={{ margin: '20px 0 0' }}>
            <a
              href={meetingUrl}
              style={{
                backgroundColor: '#2563eb',
                borderRadius: 8,
                color: '#ffffff',
                display: 'inline-block',
                fontSize: 14,
                fontWeight: 700,
                padding: '12px 18px',
                textDecoration: 'none',
              }}
            >
              Marcar Reunião
            </a>
          </p>
        )}

        <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, marginTop: 24 }}>
          A equipa da Norm8 irá agora rever esta análise e poderá entrar em
          contacto para validar detalhes e preparar uma proposta mais ajustada à
          realidade da sua empresa.
          <br />
          <br />
          Equipa Norm8
        </p>
      </div>
    </div>
  );
}

/**
 * Converts stored Prisma Json into preview opportunities.
 *
 * @param value Stored JSON value.
 * @returns Client preview opportunities.
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
 *
 * @param value Stored JSON value.
 * @returns String list.
 */
function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/**
 * Returns printable string values only.
 *
 * @param value Unknown stored value.
 * @returns String or empty string.
 */
function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
/**
 * Builds the public meeting URL for the email CTA.
 *
 * @returns Absolute URL when NEXT_PUBLIC_SITE_URL is configured, otherwise local path.
 */
function buildMeetingUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

  return siteUrl ? `${siteUrl}/marcar-reuniao` : '/marcar-reuniao';
}