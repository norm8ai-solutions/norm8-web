/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/MeetingRequestConfirmationEmail.tsx
 * Description: Customer confirmation email for meeting requests.
 * Responsibilities:
 * - Confirm receipt of the meeting request.
 * - Explain that availability will be validated manually.
 * - Avoid promising calendar booking before an integration exists.
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
  maxWidth: 560,
  padding: 32,
};

/**
 * Renders the customer confirmation email for meeting requests.
 *
 * @param props Lead and submission context.
 * @returns React email template.
 */
export default function MeetingRequestConfirmationEmail({
  lead,
}: EmailTemplateProps) {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Norm8
        </p>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: '12px 0 16px' }}>
          Recebemos o seu pedido de reunião
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Olá{lead.name ? `, ${lead.name}` : ''}.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Confirmamos que recebemos o pedido de reunião para a {lead.company}.
          A equipa da Norm8 irá validar a disponibilidade e confirmar o horário.
        </p>
        <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
          Até à confirmação, este pedido ainda não representa uma marcação final
          no calendário.
        </p>
      </div>
    </div>
  );
}
