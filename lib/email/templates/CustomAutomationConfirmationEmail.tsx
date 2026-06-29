/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/CustomAutomationConfirmationEmail.tsx
 * Description: Customer confirmation email for custom automation requests.
 * Responsibilities:
 * - Confirm receipt of the custom automation request.
 * - Communicate the expected 24-hour response window.
 * - Keep transactional email content concise and professional.
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
 * Renders the customer confirmation email for custom automation requests.
 *
 * @param props Lead and submission context.
 * @returns React email template.
 */
export default function CustomAutomationConfirmationEmail({
  lead,
}: EmailTemplateProps) {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Norm8
        </p>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: '12px 0 16px' }}>
          Recebemos o seu pedido de Automação Personalizada
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Olá{lead.name ? `, ${lead.name}` : ''}.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Obrigado por partilhar o desafio da {lead.company}. Vamos analisar o
          contexto enviado e responder em até 24 horas com os próximos passos.
        </p>
        <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
          Se entretanto quiser acrescentar algum detalhe, pode responder
          diretamente a este email.
        </p>
      </div>
    </div>
  );
}
