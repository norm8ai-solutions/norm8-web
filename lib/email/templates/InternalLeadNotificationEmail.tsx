/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/InternalLeadNotificationEmail.tsx
 * Description: Internal notification email for new website submissions.
 * Responsibilities:
 * - Summarize the lead and submission for the Norm8 team.
 * - Render meeting requests with Portuguese labels and readable dates.
 * - Keep markup readable in Gmail and Outlook.
 * ------------------------------------------------------------------
 */

import type { CSSProperties } from 'react';
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

/**
 * Renders the internal notification email for the Norm8 team.
 *
 * @param props Lead, submission, summary, and optional meeting booking context.
 * @returns React email template.
 */
export default function InternalLeadNotificationEmail({
  lead,
  submission,
  meetingBooking,
  payloadFields,
  summary,
}: InternalLeadNotificationEmailProps) {
  const isMeetingRequest = submission.type === 'MEETING_REQUEST' && meetingBooking;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Norm8 Website
        </p>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: '12px 0 16px' }}>
          Nova submissão recebida no website Norm8
        </h1>

        <p style={{ fontSize: 15, lineHeight: 1.7 }}>{summary}</p>

        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 24, paddingTop: 20 }}>
          <p style={labelStyle}>Lead</p>
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            <strong>Tipo de pedido:</strong> {formatSubmissionType(submission.type)}
            <br />
            <strong>Nome:</strong> {lead.name ?? 'Não indicado'}
            <br />
            <strong>Empresa:</strong> {lead.company}
            <br />
            <strong>Email:</strong> {lead.email}
            <br />
            <strong>Telefone:</strong> {lead.phone ?? 'Não indicado'}
            <br />
            <strong>Data da submissão:</strong>{' '}
            {submission.createdAt.toLocaleString('pt-PT')}
          </p>
        </div>

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
