import EmailButton from '../components/EmailButton';
import EmailCard from '../components/EmailCard';
import EmailFooter from '../components/EmailFooter';
import EmailHeader from '../components/EmailHeader';
import EmailSection from '../components/EmailSection';
import EmailShell from '../components/EmailShell';

export type PreMeetingInviteEmailProps = {
  contactName: string;
  companyName: string;
  formUrl: string;
};

export const PRE_MEETING_INVITE_SUBJECT = 'Informações para preparar a reunião — Norm8';

export function buildPreMeetingInvitePlainText({
  contactName,
  companyName,
  formUrl,
}: PreMeetingInviteEmailProps): string {
  return [
    `Olá ${contactName},`,
    '',
    'Obrigado pelo interesse em falar com a Norm8.',
    '',
    `Antes da reunião, agradecemos que preencha este formulário rápido com algumas informações sobre a ${companyName}, o processo que pretende melhorar e as ferramentas que utiliza atualmente.`,
    '',
    'Estas informações ajudam a nossa equipa a preparar melhor a reunião, identificar oportunidades de automação e tornar a conversa mais objetiva desde o início.',
    '',
    `Preencher formulário pré-reunião: ${formUrl}`,
    '',
    'Após recebermos as informações, enviaremos um email de confirmação da reunião com base na data discutida anteriormente.',
    '',
    'Obrigado,',
    'Equipa Norm8',
    '',
    'Norm8 — Sistemas de IA para operações mais claras, rápidas e escaláveis.',
  ].join('\n');
}

export default function PreMeetingInviteEmail({
  contactName,
  companyName,
  formUrl,
}: PreMeetingInviteEmailProps) {
  return (
    <EmailShell>
      <EmailHeader
        label="Norm8 · Pré-reunião"
        title="Informações para preparar a reunião"
        description="Partilhe o contexto essencial para a equipa Norm8 preparar uma conversa mais objetiva e orientada a oportunidades reais de automação."
        meta={[{ label: 'Empresa', value: companyName }]}
      />

      <EmailSection>
        <EmailCard>
          <p style={paragraphStyle}>Olá {contactName},</p>
          <p style={paragraphStyle}>Obrigado pelo interesse em falar com a Norm8.</p>
          <p style={paragraphStyle}>
            Antes da reunião, agradecemos que preencha este formulário rápido com algumas informações sobre a {companyName}, o processo que pretende melhorar e as ferramentas que utiliza atualmente.
          </p>
          <p style={paragraphStyle}>
            Estas informações ajudam a nossa equipa a preparar melhor a reunião, identificar oportunidades de automação e tornar a conversa mais objetiva desde o início.
          </p>
        </EmailCard>
      </EmailSection>

      <EmailSection align="center" title="Formulário pré-reunião">
        <EmailButton href={formUrl}>Preencher formulário pré-reunião</EmailButton>
        <p style={fallbackStyle}>
          Se o botão não funcionar, copie e cole este link no navegador:
          <br />
          <a href={formUrl} style={linkStyle}>{formUrl}</a>
        </p>
      </EmailSection>

      <EmailSection>
        <EmailCard compact>
          <p style={paragraphStyle}>
            Após recebermos as informações, enviaremos um email de confirmação da reunião com base na data discutida anteriormente.
          </p>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            Obrigado,<br />
            Equipa Norm8
          </p>
        </EmailCard>
      </EmailSection>

      <EmailFooter text="Norm8 — Sistemas de IA para operações mais claras, rápidas e escaláveis." />
    </EmailShell>
  );
}

const paragraphStyle = {
  color: '#B8C7E6',
  fontSize: 15,
  lineHeight: 1.7,
  margin: '0 0 14px',
};

const fallbackStyle = {
  color: '#8399B8',
  fontSize: 13,
  lineHeight: 1.6,
  margin: '18px 0 0',
  wordBreak: 'break-word' as const,
};

const linkStyle = {
  color: '#60A5FA',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};
