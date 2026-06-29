/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/MeetingRequestConfirmationEmail.tsx
 * Description: Customer confirmation email for meeting requests.
 * Responsibilities:
 * - Confirm meetings when Google Calendar creates the event successfully.
 * - Provide a professional fallback when automatic confirmation fails.
 * - Format meeting details in Portuguese without raw ISO/UTC values.
 * ------------------------------------------------------------------
 */

import type { CSSProperties } from 'react';
import {
  formatMeetingDate,
  formatMeetingDuration,
  formatMeetingTimeRange,
} from '../formatters';
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
  maxWidth: 560,
  padding: 32,
};

/**
 * Renders the customer confirmation email for meeting requests.
 *
 * @param props Lead and meeting booking context.
 * @returns React email template.
 */
export default function MeetingRequestConfirmationEmail({
  lead,
  meetingBooking,
}: EmailTemplateProps) {
  const isConfirmed = meetingBooking?.status === 'CONFIRMED';

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Norm8
        </p>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: '12px 0 16px' }}>
          {isConfirmed
            ? 'Reunião confirmada com a Norm8'
            : 'Recebemos o seu pedido de reunião'}
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Olá{lead.name ? `, ${lead.name}` : ''}.
        </p>

        {isConfirmed && meetingBooking ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.7 }}>
              A sua reunião com a Norm8 foi confirmada.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8 }}>
              <strong>Data:</strong>{' '}
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
              <strong>Empresa:</strong> {meetingBooking.attendeeCompany}
              <br />
              <strong>Objetivo:</strong> {meetingBooking.meetingGoal}
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.7 }}>
              A reunião ficou registada no calendário da Norm8.
            </p>
            <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
              Receberá todos os detalhes por email.
            </p>
          </>
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.7 }}>
            Recebemos o seu pedido de reunião para a {lead.company}. Não foi
            possível confirmar automaticamente o horário neste momento, mas a
            equipa da Norm8 irá entrar em contacto para finalizar a marcação.
          </p>
        )}
      </div>
    </div>
  );
}
