/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/AuditConfirmationEmail.tsx
 * Description: Premium fallback customer email for Intelligent Audit requests.
 * Responsibilities:
 * - Confirm that Norm8 received the audit request.
 * - Keep the experience premium when AI analysis is unavailable.
 * - Keep internal AI scoring out of customer-facing email.
 * ------------------------------------------------------------------
 */

import EmailCard from '../components/EmailCard';
import EmailFooter from '../components/EmailFooter';
import EmailHeader from '../components/EmailHeader';
import EmailSection from '../components/EmailSection';
import EmailShell from '../components/EmailShell';
import type { EmailTemplateProps } from '../types';

/**
 * Renders the customer fallback confirmation email for audit requests.
 *
 * @param props Lead and submission context.
 * @returns React email template.
 */
export default function AuditConfirmationEmail({ lead, submission }: EmailTemplateProps) {
  const submissionDate = submission.createdAt.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <EmailShell>
      <EmailHeader
        description="Pedido recebido pela Norm8. A nossa equipa vai validar o contexto enviado e preparar os próximos passos."
        label="Auditoria Inteligente"
        meta={[
          { label: 'Empresa', value: lead.company },
          { label: 'Data', value: submissionDate },
        ]}
        title="Recebemos o seu pedido de Auditoria Inteligente"
      />

      <EmailSection>
        <p style={{ color: '#E8EDF8', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          Olá{lead.name ? `, ${lead.name}` : ''}. Obrigado por preencher a Auditoria
          Inteligente da Norm8 para a {lead.company}.
        </p>
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '14px 0 0' }}>
          Estamos a organizar as informações recebidas para identificar oportunidades
          reais de automatização, reduzir trabalho manual e melhorar a visibilidade
          operacional.
        </p>
      </EmailSection>

      <EmailSection title="O que acontece agora">
        <EmailCard compact>
          <p style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>
            Contexto recebido
          </p>
          <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            Os dados submetidos ficaram registados e associados ao seu pedido.
          </p>
        </EmailCard>
        <EmailCard compact>
          <p style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>
            Análise inicial
          </p>
          <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            Um especialista Norm8 irá rever os processos, ferramentas e desafios
            indicados antes de qualquer recomendação final.
          </p>
        </EmailCard>
        <EmailCard compact>
          <p style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>
            Próximo contacto
          </p>
          <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            Entraremos em contacto com uma leitura inicial e uma sugestão clara de
            próximo passo.
          </p>
        </EmailCard>
      </EmailSection>

      <EmailSection title="Nota">
        <p style={{ color: '#8399B8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          Este email é o fallback de receção da Auditoria Inteligente. Quando a
          pré-análise automática estiver disponível, receberá um Executive Audit
          Preview mais completo.
        </p>
      </EmailSection>

      <EmailFooter />
    </EmailShell>
  );
}
