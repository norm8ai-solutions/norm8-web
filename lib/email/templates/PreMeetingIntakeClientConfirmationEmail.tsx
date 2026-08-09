import EmailCard from '../components/EmailCard';
import EmailFooter from '../components/EmailFooter';
import EmailHeader from '../components/EmailHeader';
import EmailSection from '../components/EmailSection';
import EmailShell from '../components/EmailShell';

export type PreMeetingIntakeClientConfirmationEmailProps = {
  contactName?: string | null;
  companyName: string;
};

export const PRE_MEETING_INTAKE_CLIENT_CONFIRMATION_SUBJECT = 'Informações recebidas — Norm8';

export function buildPreMeetingIntakeClientConfirmationPlainText({
  contactName,
  companyName,
}: PreMeetingIntakeClientConfirmationEmailProps): string {
  return [
    `Olá${contactName ? ` ${contactName}` : ''},`,
    '',
    `Obrigado por partilhar o contexto da ${companyName}.`,
    '',
    'A equipa Norm8 recebeu as informações enviadas e vai usá-las para preparar a reunião com base no contexto partilhado.',
    '',
    'O próximo passo será a confirmação da reunião por email, com base na data discutida anteriormente.',
    '',
    'Obrigado,',
    'Equipa Norm8',
    '',
    'Norm8 — Sistemas de IA para operações mais claras, rápidas e escaláveis.',
  ].join('\n');
}

export default function PreMeetingIntakeClientConfirmationEmail({
  contactName,
  companyName,
}: PreMeetingIntakeClientConfirmationEmailProps) {
  return (
    <EmailShell>
      <EmailHeader
        label="Norm8 · Pré-reunião"
        title="Informações recebidas"
        description="Recebemos o contexto partilhado e vamos usá-lo para preparar uma reunião mais objetiva e útil."
        meta={[{ label: 'Empresa', value: companyName }]}
      />

      <EmailSection>
        <EmailCard>
          <p style={paragraphStyle}>Olá{contactName ? ` ${contactName}` : ''},</p>
          <p style={paragraphStyle}>Obrigado por partilhar o contexto da {companyName}.</p>
          <p style={paragraphStyle}>
            A equipa Norm8 recebeu as informações enviadas e vai usá-las para preparar a reunião com base no contexto partilhado.
          </p>
          <p style={paragraphStyle}>
            O próximo passo será a confirmação da reunião por email, com base na data discutida anteriormente.
          </p>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            Obrigado,<br />
            Equipa Norm8
          </p>
        </EmailCard>
      </EmailSection>

      <EmailFooter />
    </EmailShell>
  );
}

const paragraphStyle = {
  color: '#B8C7E6',
  fontSize: 15,
  lineHeight: 1.7,
  margin: '0 0 14px',
};

