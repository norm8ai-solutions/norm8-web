/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/ClientMeetingConfirmationEmail.tsx
 * Description: Client-facing Norm8 meeting confirmation email.
 * ------------------------------------------------------------------
 */

import type { MeetingEmailContext } from '@/lib/meetings/email-context';
import EmailButton from '../components/EmailButton';
import EmailCard from '../components/EmailCard';
import EmailMetric from '../components/EmailMetric';
import EmailSection from '../components/EmailSection';
import Norm8EmailLayout from '../components/Norm8EmailLayout';

type MeetingEmailTemplateProps = {
  context: MeetingEmailContext;
};

export default function ClientMeetingConfirmationEmail({
  context,
}: MeetingEmailTemplateProps) {
  const companyReference = getCompanyReference(context.companyName);
  const replyTo = process.env.INTERNAL_NOTIFICATION_EMAIL
    ? `mailto:${process.env.INTERNAL_NOTIFICATION_EMAIL}`
    : 'mailto:hello@norm8.pt';

  return (
    <Norm8EmailLayout
      badge="Meeting Briefing"
      meta={[
        { label: 'Empresa', value: safeText(context.companyName) },
        { label: 'Estado', value: safeText(context.status) },
      ]}
      subtitle="Vamos alinhar contexto, prioridades e próximos passos."
      title="Reunião confirmada com a Norm8"
    >
      <EmailSection>
        <p style={{ color: '#E8EDF8', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          Olá{context.contactName ? `, ${context.contactName}` : ''}.
        </p>
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '14px 0 0' }}>
          A sua reunião com a Norm8 está confirmada. Vamos usar esta sessão para compreender melhor o contexto {companyReference}, identificar prioridades e definir próximos passos claros para uma possível colaboração.
        </p>
      </EmailSection>

      <EmailSection title="Detalhes da reunião">
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <EmailMetric label="Data" value={safeText(context.meetingDate)} />
              <EmailMetric label="Hora" value={`${context.meetingStartTime}–${context.meetingEndTime}`} />
            </tr>
            <tr>
              <EmailMetric label="Duração" value={`${context.durationMinutes} minutos`} />
              <EmailMetric label="Empresa" value={safeText(context.companyName)} />
            </tr>
            <tr>
              <EmailMetric label="Estado" value={safeText(context.status)} />
              <EmailMetric label="Contacto" value={safeText(context.contactName)} />
            </tr>
          </tbody>
        </table>
      </EmailSection>

      <EmailSection title="Objetivo da reunião">
        <EmailCard>
          <p style={{ color: '#E8EDF8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            {safeClientObjective(context.clientObjective, context.companyName)}
          </p>
        </EmailCard>
      </EmailSection>

      <EmailSection title="O que vamos abordar">
        <ul style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>Contexto atual e principais processos manuais.</li>
          <li style={{ marginBottom: 6 }}>Prioridades e áreas com maior potencial de automação.</li>
          <li style={{ marginBottom: 6 }}>Ferramentas e fluxos usados atualmente.</li>
          <li style={{ marginBottom: 6 }}>Gargalos, atrasos, retrabalho ou perda de informação.</li>
          <li style={{ marginBottom: 0 }}>Próximos passos recomendados.</li>
        </ul>
      </EmailSection>

      <EmailSection title="Como se preparar">
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '0 0 14px' }}>
          Para aproveitarmos melhor a sessão, recomendamos que tenha presente os principais processos manuais, ferramentas usadas atualmente e áreas onde sente maior perda de tempo ou falta de visibilidade.
        </p>
        <ul style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>Identifique os processos que consomem mais tempo à equipa.</li>
          <li style={{ marginBottom: 6 }}>Tenha presentes as ferramentas usadas atualmente.</li>
          <li style={{ marginBottom: 6 }}>Pense nas tarefas repetitivas que poderiam ser automatizadas.</li>
          <li style={{ marginBottom: 6 }}>Liste áreas onde existe atraso, retrabalho ou perda de informação.</li>
          <li style={{ marginBottom: 0 }}>Se possível, traga exemplos concretos de processos ou fluxos internos.</li>
        </ul>
      </EmailSection>

      <EmailSection title="Próximos passos">
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Na reunião, vamos clarificar o contexto, validar prioridades e perceber se faz sentido avançar para uma proposta de solução ou plano de implementação.
        </p>
      </EmailSection>

      <EmailSection align="center" title="Responder à equipa Norm8">
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>
          Se precisar de ajustar algum detalhe ou acrescentar contexto antes da reunião, pode responder diretamente a este email.
        </p>
        <EmailButton href={replyTo}>Responder a este email</EmailButton>
      </EmailSection>
    </Norm8EmailLayout>
  );
}

function safeClientObjective(value: string | undefined, companyName?: string | null): string {
  const normalized = value?.trim();
  if (normalized && !containsInternalLanguage(normalized)) {
    return normalized;
  }

  const company = companyName?.trim();
  return company
    ? `Alinhar o contexto da ${company}, perceber prioridades operacionais e identificar oportunidades de automação para definir próximos passos claros.`
    : 'Compreender melhor os processos atuais da empresa, identificar oportunidades de automação e definir próximos passos claros.';
}

function getCompanyReference(companyName?: string | null): string {
  const company = companyName?.trim();
  return company && company !== 'Não indicado' ? `da ${company}` : 'da empresa';
}

function containsInternalLanguage(value: string): boolean {
  return /\b(lead|pipeline|funil comercial|funil|qualificação|qualificar|ação pendente|potencial comercial|oportunidade comercial|fechar oportunidade|avançar oportunidade|estado da lead|agendar reunião|marcar reunião|entrar em contacto|avançar o processo de colaboração)\b/i.test(value);
}

function safeText(value?: string | null): string {
  const normalized = value?.trim();
  return normalized && normalized !== 'Sem resumo indicado' ? normalized : 'Não indicado';
}
