/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/LeadActionEmail.tsx
 * Description: Branded commercial email sent from Admin lead actions.
 * ------------------------------------------------------------------
 */

import EmailCard from '../components/EmailCard';
import EmailSection from '../components/EmailSection';
import Norm8EmailLayout from '../components/Norm8EmailLayout';

export type LeadActionEmailContext = {
  leadId: string;
  actionId: string;
  companyName?: string | null;
  contactName?: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  actionType: 'SEND_EMAIL' | 'FOLLOW_UP';
  adminLeadUrl?: string;
};

type LeadActionEmailProps = {
  context: LeadActionEmailContext;
};

export default function LeadActionEmail({ context }: LeadActionEmailProps) {
  const paragraphs = splitBodyIntoParagraphs(context.body);

  return (
    <Norm8EmailLayout
      badge={context.actionType === 'FOLLOW_UP' ? 'Norm8 Follow-up' : 'Norm8'}
      meta={[
        { label: 'Empresa', value: safeText(context.companyName) },
        { label: 'Contacto', value: safeText(context.contactName) },
      ]}
      subtitle="Mensagem enviada pela equipa Norm8."
      title={context.subject}
    >
      <EmailSection>
        <EmailCard>
          {paragraphs.map((paragraph, index) => (
            <p
              key={`${paragraph.slice(0, 18)}-${index}`}
              style={{
                color: index === 0 ? '#E8EDF8' : '#8399B8',
                fontSize: 14,
                lineHeight: 1.75,
                margin: index === 0 ? 0 : '14px 0 0',
                whiteSpace: 'pre-wrap',
              }}
            >
              {paragraph}
            </p>
          ))}
        </EmailCard>
      </EmailSection>
    </Norm8EmailLayout>
  );
}

function splitBodyIntoParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function safeText(value?: string | null): string {
  const normalized = value?.trim();
  return normalized || 'Não indicado';
}
