/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/AuditConfirmationEmail.tsx
 * Description: Customer confirmation email for Intelligent Audit requests.
 * Responsibilities:
 * - Confirm that Norm8 received the audit request.
 * - Set expectations for manual review by the Norm8 team.
 * - Keep email markup simple and compatible with common email clients.
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
 * Renders the customer confirmation email for audit requests.
 *
 * @param props Lead and submission context.
 * @returns React email template.
 */
export default function AuditConfirmationEmail({ lead }: EmailTemplateProps) {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Norm8
        </p>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: '12px 0 16px' }}>
          Recebemos o seu pedido de Auditoria Inteligente
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Olá{lead.name ? `, ${lead.name}` : ''}.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Confirmamos a receção do pedido de auditoria da {lead.company}. A
          equipa da Norm8 irá analisar as informações enviadas e entrará em
          contacto com os próximos passos.
        </p>
        <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
          Este email confirma apenas a receção do pedido. Não é necessário
          responder, a menos que queira acrescentar informação relevante.
        </p>
      </div>
    </div>
  );
}
