/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/InternalLeadNotificationEmail.tsx
 * Description: Internal notification email for new website submissions.
 * Responsibilities:
 * - Summarize the lead and submission for the Norm8 team.
 * - Render meeting requests with Portuguese labels and readable dates.
 * - Include AI audit analysis and client preview context for audit requests.
 * ------------------------------------------------------------------
 */

import type { CSSProperties } from 'react';
import type { AuditPriority } from '@/app/generated/prisma/client';
import {
  formatMeetingDate,
  formatMeetingDuration,
  formatMeetingStatus,
  formatMeetingTimeRange,
  formatPayloadLabel,
  formatSubmissionType,
} from '../formatters';
import type { InternalLeadNotificationEmailProps } from '../types';

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

const labelStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
};

type OpportunityItem = {
  title?: unknown;
  description?: unknown;
  estimatedImpact?: unknown;
};

/**
 * Renders the internal notification email for the Norm8 team.
 *
 * @param props Lead, submission, summary, and optional meeting/audit context.
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
  const isMeetingRequest = submission.type === 'MEETING_REQUEST' && meetingBooking;
  const isAuditRequest = submission.type === 'AUDIT_REQUEST';
  const submittedName = getPayloadValue(payloadFields, 'name') ?? lead.name;
  const submittedCompany = getPayloadValue(payloadFields, 'company') ?? lead.company;
  const submittedEmail = getPayloadValue(payloadFields, 'email') ?? lead.email;
  const submittedPhone = getPayloadValue(payloadFields, 'phone') ?? lead.phone;
  const submittedWebsite = getPayloadValue(payloadFields, 'website') ?? lead.website;
  const mainChallenge = getPayloadValue(payloadFields, 'mainChallenge');
  const mainGoal = getPayloadValue(payloadFields, 'mainGoal');

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Norm8 Website
        </p>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: '12px 0 16px' }}>
          {isAuditRequest
            ? 'Nova Auditoria Inteligente recebida'
            : 'Nova submissão recebida no website Norm8'}
        </h1>

        {isAuditRequest ? (
          <AuditBriefingBlock
            company={submittedCompany}
            contact={submittedName}
            mainChallenge={mainChallenge}
            mainGoal={mainGoal}
            auditAnalysis={auditAnalysis}
          />
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.7 }}>{summary}</p>
        )}

        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 24, paddingTop: 20 }}>
          <p style={labelStyle}>Lead</p>
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            <strong>Tipo de pedido:</strong> {formatSubmissionType(submission.type)}
            <br />
            <strong>Nome:</strong> {submittedName ?? 'Não indicado'}
            <br />
            <strong>Empresa:</strong> {submittedCompany}
            <br />
            <strong>Email:</strong> {submittedEmail}
            <br />
            <strong>Telefone:</strong> {submittedPhone ?? 'Não indicado'}
            <br />
            <strong>Website:</strong>{' '}
            {submittedWebsite ?? 'Não indicado'}
            <br />
            <strong>Setor:</strong>{' '}
            {getPayloadValue(payloadFields, 'industry') ?? 'Não indicado'}
            <br />
            <strong>Colaboradores:</strong>{' '}
            {getPayloadValue(payloadFields, 'employees') ?? 'Não indicado'}
            <br />
            <strong>Receita anual:</strong>{' '}
            {getPayloadValue(payloadFields, 'annualRevenue') ?? 'Não indicado'}
            <br />
            <strong>Data da submissão:</strong>{' '}
            {submission.createdAt.toLocaleString('pt-PT')}
          </p>
        </div>

        {isAuditRequest && <AuditAnalysisEmailBlock auditAnalysis={auditAnalysis} />}
        {isAuditRequest && <ClientPreviewEmailBlock auditAnalysis={auditAnalysis} />}

        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 24, paddingTop: 20 }}>
          <p style={labelStyle}>
            {isMeetingRequest ? 'Detalhes da reunião' : 'Campos principais'}
          </p>

          {isMeetingRequest ? (
            <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              <strong>Estado:</strong> {formatMeetingStatus(meetingBooking.status)}
              <br />
              <strong>Data da reunião:</strong>{' '}
              {formatMeetingDate(meetingBooking.startsAt, meetingBooking.timezone)}
              <br />
              <strong>Hora:</strong>{' '}
              {formatMeetingTimeRange(
                meetingBooking.startsAt,
                meetingBooking.endsAt,
                meetingBooking.timezone,
              )}
              <br />
              <strong>Duração:</strong>{' '}
              {formatMeetingDuration(meetingBooking.startsAt, meetingBooking.endsAt)}
              <br />
              <strong>Fuso horário:</strong> {meetingBooking.timezone}
              <br />
              <strong>Objetivo:</strong> {meetingBooking.meetingGoal ?? 'Não indicado'}
              <br />
              <strong>Google Calendar Event ID:</strong>{' '}
              {meetingBooking.googleEventId ?? 'Não disponível'}
              <br />
              <strong>Link do evento:</strong>{' '}
              {meetingBooking.googleEventHtmlLink ?? 'Não disponível'}
            </p>
          ) : (
            payloadFields.map((field) => (
              <p
                key={field.label}
                style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 10px' }}
              >
                <strong>{formatPayloadLabel(field.label)}:</strong> {field.value}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the executive briefing at the top of audit notification emails.
 *
 * @param props Submission snapshot and optional audit analysis.
 * @returns Short sales-oriented audit briefing.
 */
function AuditBriefingBlock({
  company,
  contact,
  mainChallenge,
  mainGoal,
  auditAnalysis,
}: {
  company?: string | null;
  contact?: string | null;
  mainChallenge?: string;
  mainGoal?: string;
  auditAnalysis: InternalLeadNotificationEmailProps['auditAnalysis'];
}) {
  const problem = auditAnalysis?.internalSummary ?? mainChallenge ?? 'Não indicado';
  const nextStep = auditAnalysis?.nextStep ?? 'Validar contexto e priorizar seguimento comercial.';

  return (
    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, marginTop: 18, padding: 16 }}>
      <p style={{ ...labelStyle, margin: '0 0 10px' }}>Briefing inicial</p>
      <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
        <strong>Empresa:</strong> {company ?? 'Não indicada'}
        <br />
        <strong>Contacto:</strong> {contact ?? 'Não indicado'}
        <br />
        <strong>Problema principal:</strong> {problem}
        <br />
        <strong>Objetivo declarado:</strong> {mainGoal ?? 'Não indicado'}
        <br />
        <strong>Prioridade IA:</strong> {formatAuditPriority(auditAnalysis?.priority)}
        <br />
        <strong>Score:</strong>{' '}
        {auditAnalysis?.score === null || auditAnalysis?.score === undefined
          ? 'Não atribuído'
          : `${auditAnalysis.score}/100`}
        <br />
        <strong>Próximo passo:</strong> {nextStep}
      </p>
    </div>
  );
}

/**
 * Renders full internal audit analysis details when available.
 *
 * @param props Audit analysis record from Prisma.
 * @returns Internal AI audit analysis email block.
 */
function AuditAnalysisEmailBlock({
  auditAnalysis,
}: Pick<InternalLeadNotificationEmailProps, 'auditAnalysis'>) {
  if (!auditAnalysis) {
    return <NoticeBlock title="AI Audit Analysis" text="A análise IA ficará disponível no Admin Dashboard." />;
  }

  if (auditAnalysis.status === 'FAILED') {
    return (
      <NoticeBlock
        title="AI Audit Analysis"
        text={`A análise IA falhou e deve ser revista no Admin Dashboard.${
          auditAnalysis.errorMessage ? ` Erro: ${auditAnalysis.errorMessage}` : ''
        }`}
      />
    );
  }

  if (auditAnalysis.status !== 'COMPLETED') {
    return <NoticeBlock title="AI Audit Analysis" text="A análise IA ficará disponível no Admin Dashboard." />;
  }

  const opportunities = toOpportunityItems(auditAnalysis.automationOpportunities).slice(0, 3);

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 24, paddingTop: 20 }}>
      <p style={labelStyle}>AI Audit Analysis</p>
      <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
        <strong>Score:</strong> {auditAnalysis.score ?? 'Não atribuído'}/100
        <br />
        <strong>Prioridade comercial:</strong> {formatAuditPriority(auditAnalysis.priority)}
        <br />
        <strong>Resumo interno:</strong>{' '}
        {auditAnalysis.internalSummary ?? 'Não disponível'}
        <br />
        <strong>Próximo passo recomendado:</strong>{' '}
        {auditAnalysis.nextStep ?? 'Não disponível'}
      </p>

      {opportunities.length > 0 && (
        <ol style={{ fontSize: 14, lineHeight: 1.6, margin: '14px 0 0', paddingLeft: 20 }}>
          {opportunities.map((opportunity, index) => (
            <li key={`${stringValue(opportunity.title)}-${index}`}>
              <strong>{stringValue(opportunity.title) || 'Oportunidade'}</strong>
              {stringValue(opportunity.estimatedImpact)
                ? ` - ${stringValue(opportunity.estimatedImpact)}`
                : ''}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Renders the preview that was sent to the client, or fallback state.
 *
 * @param props Audit analysis record from Prisma.
 * @returns Client preview email block.
 */
function ClientPreviewEmailBlock({
  auditAnalysis,
}: Pick<InternalLeadNotificationEmailProps, 'auditAnalysis'>) {
  if (!hasClientPreview(auditAnalysis)) {
    return <NoticeBlock title="Preview enviado ao cliente" text="Fallback simples enviado ao cliente." />;
  }

  const opportunities = toOpportunityItems(auditAnalysis.clientPreviewOpportunities).slice(0, 3);

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 24, paddingTop: 20 }}>
      <p style={labelStyle}>Preview enviado ao cliente</p>
      <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
        <strong>Título:</strong> {auditAnalysis.clientPreviewTitle}
        <br />
        <strong>Resumo:</strong> {auditAnalysis.clientPreviewSummary}
      </p>
      {opportunities.length > 0 && (
        <ol style={{ fontSize: 14, lineHeight: 1.6, margin: '14px 0 0', paddingLeft: 20 }}>
          {opportunities.map((opportunity, index) => (
            <li key={`${stringValue(opportunity.title)}-${index}`}>
              <strong>{stringValue(opportunity.title) || 'Oportunidade'}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Renders a small labelled notice block.
 *
 * @param props Title and text.
 * @returns Notice block.
 */
function NoticeBlock({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 24, paddingTop: 20 }}>
      <p style={labelStyle}>{title}</p>
      <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>{text}</p>
    </div>
  );
}

/**
 * Gets a payload value by raw field label.
 *
 * @param fields Flattened payload fields.
 * @param label Raw payload key.
 * @returns Matching field value.
 */
function getPayloadValue(
  fields: InternalLeadNotificationEmailProps['payloadFields'],
  label: string,
): string | undefined {
  const value = fields.find((field) => field.label === label)?.value;

  if (label === 'industry' && value === 'Outro') {
    return 'Não especificado';
  }

  return value;
}

/**
 * Safely converts stored Prisma Json into opportunity items.
 *
 * @param value Stored JSON value.
 * @returns Array of object-like opportunities.
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
 * Returns a string only when the value is printable text.
 *
 * @param value Unknown stored value.
 * @returns String value or empty string.
 */
function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Formats audit priority for internal email.
 *
 * @param priority Priority value from the audit analysis.
 * @returns Portuguese priority label.
 */
function formatAuditPriority(priority?: AuditPriority | null): string {
  const labels: Record<AuditPriority, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  };

  return priority ? labels[priority] : 'Não atribuída';
}

/**
 * Checks whether a completed analysis has client preview data.
 *
 * @param auditAnalysis Audit analysis record.
 * @returns Whether the preview is available.
 */
function hasClientPreview(
  auditAnalysis: InternalLeadNotificationEmailProps['auditAnalysis'],
): auditAnalysis is NonNullable<InternalLeadNotificationEmailProps['auditAnalysis']> {
  return Boolean(
    auditAnalysis?.status === 'COMPLETED' &&
      auditAnalysis.clientPreviewTitle &&
      auditAnalysis.clientPreviewSummary &&
      Array.isArray(auditAnalysis.clientPreviewOpportunities) &&
      auditAnalysis.clientPreviewOpportunities.length > 0,
  );
}