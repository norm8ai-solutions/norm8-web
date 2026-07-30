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

export const PRE_MEETING_INVITE_SUBJECT = 'Informa\u00e7\u00f5es para preparar a reuni\u00e3o \u2014 Norm8';

export function buildPreMeetingInvitePlainText({
  contactName,
  companyName,
  formUrl,
}: PreMeetingInviteEmailProps): string {
  return [
    `Ol\u00e1 ${contactName},`,
    '',
    'Obrigado pelo interesse em falar com a Norm8.',
    '',
    `Antes da reuni\u00e3o, agradecemos que preencha este formul\u00e1rio r\u00e1pido com algumas informa\u00e7\u00f5es sobre a ${companyName}, o processo que pretende melhorar e as ferramentas que utiliza atualmente.`,
    '',
    'Estas informa\u00e7\u00f5es ajudam a nossa equipa a preparar melhor a reuni\u00e3o, identificar oportunidades de automa\u00e7\u00e3o e tornar a conversa mais objetiva desde o in\u00edcio.',
    '',
    `Preencher formul\u00e1rio pr\u00e9-reuni\u00e3o: ${formUrl}`,
    '',
    'Ap\u00f3s recebermos as informa\u00e7\u00f5es, enviaremos um email de confirma\u00e7\u00e3o da reuni\u00e3o com base na data discutida anteriormente.',
    '',
    'Obrigado,',
    'Equipa Norm8',
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
        label="Norm8 \u00b7 Pr\u00e9-reuni\u00e3o"
        title="Informa\u00e7\u00f5es para preparar a reuni\u00e3o"
        description="Partilhe o contexto essencial para a equipa Norm8 preparar uma conversa mais objetiva e orientada a oportunidades reais de automa\u00e7\u00e3o."
        meta={[{ label: 'Empresa', value: companyName }]}
      />

      <EmailSection>
        <EmailCard>
          <p style={paragraphStyle}>Ol\u00e1 {contactName},</p>
          <p style={paragraphStyle}>Obrigado pelo interesse em falar com a Norm8.</p>
          <p style={paragraphStyle}>
            Antes da reuni\u00e3o, agradecemos que preencha este formul\u00e1rio r\u00e1pido com algumas informa\u00e7\u00f5es sobre a {companyName}, o processo que pretende melhorar e as ferramentas que utiliza atualmente.
          </p>
          <p style={paragraphStyle}>
            Estas informa\u00e7\u00f5es ajudam a nossa equipa a preparar melhor a reuni\u00e3o, identificar oportunidades de automa\u00e7\u00e3o e tornar a conversa mais objetiva desde o in\u00edcio.
          </p>
        </EmailCard>
      </EmailSection>

      <EmailSection align="center" title="Formul\u00e1rio pr\u00e9-reuni\u00e3o">
        <EmailButton href={formUrl}>Preencher formul\u00e1rio pr\u00e9-reuni\u00e3o</EmailButton>
        <p style={fallbackStyle}>
          Se o bot\u00e3o n\u00e3o funcionar, copie e cole este link no navegador:
          <br />
          <a href={formUrl} style={linkStyle}>{formUrl}</a>
        </p>
      </EmailSection>

      <EmailSection>
        <EmailCard compact>
          <p style={paragraphStyle}>
            Ap\u00f3s recebermos as informa\u00e7\u00f5es, enviaremos um email de confirma\u00e7\u00e3o da reuni\u00e3o com base na data discutida anteriormente.
          </p>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            Obrigado,<br />
            Equipa Norm8
          </p>
        </EmailCard>
      </EmailSection>

      <EmailFooter text="Norm8 \u2014 Sistemas de IA para opera\u00e7\u00f5es mais claras, r\u00e1pidas e escal\u00e1veis." />
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