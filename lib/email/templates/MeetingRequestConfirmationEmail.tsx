/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/MeetingRequestConfirmationEmail.tsx
 * Description: Premium customer confirmation email for meeting requests.
 * Responsibilities:
 * - Confirm meetings when Google Calendar creates the event successfully.
 * - Provide a professional fallback when automatic confirmation fails.
 * - Format meeting details in Portuguese without raw ISO/UTC values.
 * ------------------------------------------------------------------
 */

import EmailButton from '../components/EmailButton';
import EmailCard from '../components/EmailCard';
import EmailFooter from '../components/EmailFooter';
import EmailHeader from '../components/EmailHeader';
import EmailMetric from '../components/EmailMetric';
import EmailSection from '../components/EmailSection';
import EmailShell from '../components/EmailShell';
import {
  formatMeetingDate,
  formatMeetingDuration,
  formatMeetingTimeRange,
} from '../formatters';
import type { EmailTemplateProps } from '../types';

/**
 * Renders the customer confirmation email for meeting requests.
 *
 * @param props Lead and meeting booking context.
 * @returns React email template.
 */
export default function MeetingRequestConfirmationEmail({
  lead,
  meetingBooking,
  meetingEmailContext,
}: EmailTemplateProps) {
  const isConfirmed = meetingBooking?.status === 'CONFIRMED';
  const replyTo = process.env.INTERNAL_NOTIFICATION_EMAIL
    ? `mailto:${process.env.INTERNAL_NOTIFICATION_EMAIL}`
    : 'mailto:hello@norm8.pt';
  const title = isConfirmed
    ? 'Reunião confirmada com a Norm8'
    : 'Recebemos o seu pedido de reunião';

  return (
    <EmailShell>
      <EmailHeader
        description={
          isConfirmed
            ? 'A reunião ficou registada para alinharmos contexto, prioridades e próximos passos.'
            : 'Recebemos o pedido e vamos confirmar a disponibilidade para fechar o horário.'
        }
        label="Meeting Briefing"
        meta={[
          { label: 'Empresa', value: meetingEmailContext?.companyName ?? lead.company },
          { label: 'Estado', value: meetingEmailContext?.status ?? (isConfirmed ? 'Confirmada' : 'Pendente') },
        ]}
        title={title}
      />

      <EmailSection>
        <p style={{ color: '#E8EDF8', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          Olá{meetingEmailContext?.contactName ? `, ${meetingEmailContext.contactName}` : lead.name ? `, ${lead.name}` : ''}.
        </p>
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '14px 0 0' }}>
          {isConfirmed
            ? 'A sua reunião com a Norm8 está confirmada.'
            : `Recebemos o pedido de reunião para a ${meetingEmailContext?.companyName ?? lead.company}. A equipa da Norm8 irá entrar em contacto para finalizar a marcação.`}
        </p>
      </EmailSection>

      {isConfirmed && meetingBooking ? (
        <>
          <EmailSection title="Detalhes da reunião">
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <EmailMetric
                    label="Data"
                    value={meetingEmailContext?.meetingDate ?? formatMeetingDate(meetingBooking.startsAt, meetingBooking.timezone)}
                  />
                  <EmailMetric
                    label="Hora"
                    value={meetingEmailContext
                      ? `${meetingEmailContext.meetingStartTime}–${meetingEmailContext.meetingEndTime}`
                      : formatMeetingTimeRange(meetingBooking.startsAt, meetingBooking.endsAt, meetingBooking.timezone)}
                  />
                </tr>
                <tr>
                  <EmailMetric
                    label="Duração"
                    value={meetingEmailContext ? `${meetingEmailContext.durationMinutes} minutos` : formatMeetingDuration(meetingBooking.startsAt, meetingBooking.endsAt)}
                  />
                  <EmailMetric label="Empresa" value={meetingEmailContext?.companyName ?? meetingBooking.attendeeCompany} />
                </tr>
              </tbody>
            </table>
            <EmailCard>
              <p style={{ color: '#8399B8', fontSize: 11, fontWeight: 800, margin: '0 0 5px', textTransform: 'uppercase' }}>
                Objetivo da reunião
              </p>
              <p style={{ color: '#E8EDF8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                {meetingEmailContext?.clientObjective ?? 'Alinhar contexto, prioridades e oportunidades de automação para definir próximos passos claros.'}
              </p>
            </EmailCard>
          </EmailSection>
          <EmailSection align="center" title="Próximos passos">
            <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>
              A reunião servirá para compreender melhor os processos atuais, identificar
              oportunidades de automação e definir próximos passos claros.
            </p>
            <EmailButton href={replyTo}>Responder a este email</EmailButton>
          </EmailSection>
        </>
      ) : (
        <EmailSection title="Próximos passos">
          <EmailCard>
            <p style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>
              Confirmação manual
            </p>
            <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
              Não foi possível confirmar automaticamente o horário neste momento.
              A equipa Norm8 irá confirmar a disponibilidade e enviar os detalhes por email.
            </p>
          </EmailCard>
        </EmailSection>
      )}

      <EmailFooter />
    </EmailShell>
  );
}
