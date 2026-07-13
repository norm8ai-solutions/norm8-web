/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/CustomAutomationConfirmationEmail.tsx
 * Description: Premium customer email for custom automation requests.
 * Responsibilities:
 * - Confirm receipt of the custom automation request.
 * - Present the request as a compact mini briefing.
 * - Keep transactional email content concise and professional.
 * ------------------------------------------------------------------
 */

import EmailButton from '../components/EmailButton';
import EmailCard from '../components/EmailCard';
import EmailFooter from '../components/EmailFooter';
import EmailHeader from '../components/EmailHeader';
import EmailSection from '../components/EmailSection';
import EmailShell from '../components/EmailShell';
import type { EmailTemplateProps } from '../types';

/**
 * Renders the customer confirmation email for custom automation requests.
 *
 * @param props Lead and submission context.
 * @returns React email template.
 */
export default function CustomAutomationConfirmationEmail({
  lead,
  submission,
}: EmailTemplateProps) {
  const meetingUrl = buildMeetingUrl();
  const submissionDate = submission.createdAt.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <EmailShell>
      <EmailHeader
        description="Recebemos o seu pedido e vamos transformar o contexto enviado num briefing técnico e comercial para a próxima etapa."
        label="Automação Personalizada"
        meta={[
          { label: 'Empresa', value: lead.company },
          { label: 'Data', value: submissionDate },
        ]}
        title="Recebemos o seu pedido de Automação Personalizada"
      />

      <EmailSection>
        <p style={{ color: '#E8EDF8', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          Olá{lead.name ? `, ${lead.name}` : ''}. Obrigado por partilhar o desafio
          da {lead.company}.
        </p>
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '14px 0 0' }}>
          A Norm8 vai analisar o processo, as ferramentas atuais e o resultado
          pretendido para perceber onde a automação pode gerar impacto real.
        </p>
      </EmailSection>

      <EmailSection title="Mini briefing">
        <EmailCard compact>
          <p style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>
            Problema recebido
          </p>
          <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            O pedido ficou registado com os detalhes enviados no formulário.
          </p>
        </EmailCard>
        <EmailCard compact>
          <p style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>
            Como vamos analisar
          </p>
          <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            Vamos avaliar complexidade, integrações necessárias, ganhos esperados e
            prioridade de implementação.
          </p>
        </EmailCard>
        <EmailCard compact>
          <p style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>
            O que acontece a seguir
          </p>
          <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            Responderemos com uma recomendação inicial ou com uma proposta de reunião
            de descoberta para validar o fluxo em detalhe.
          </p>
        </EmailCard>
      </EmailSection>

      <EmailSection align="center" title="Próximo passo recomendado">
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>
          Uma reunião de descoberta de 30 minutos ajuda-nos a confirmar requisitos,
          prioridade e potencial de automatização.
        </p>
        <EmailButton href={meetingUrl}>Marcar reunião</EmailButton>
      </EmailSection>

      <EmailFooter />
    </EmailShell>
  );
}

function buildMeetingUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://norm8.pt';

  return `${siteUrl}/marcar-reuniao`;
}
