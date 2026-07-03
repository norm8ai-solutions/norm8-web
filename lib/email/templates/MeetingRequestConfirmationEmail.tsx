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
}: EmailTemplateProps) {
  const isConfirmed = meetingBooking?.status === 'CONFIRMED';
  const replyTo = process.env.INTERNAL_NOTIFICATION_EMAIL
    ? `mailto:${process.env.INTERNAL_NOTIFICATION_EMAIL}`
    : 'mailto:hello@norm8.pt';
  const title = isConfirmed
    ? 'Reuniao confirmada com a Norm8'
    : 'Recebemos o seu pedido de reuniao';

  return (
    <EmailShell>
      <EmailHeader
        description={
          isConfirmed
            ? 'A reuniao ficou registada para alinharmos contexto, prioridades e proximos passos.'
            : 'Recebemos o pedido e vamos confirmar a disponibilidade para fechar o horario.'
        }
        label="Meeting Briefing"
        meta={[
          { label: 'Empresa', value: lead.company },
          { label: 'Estado', value: isConfirmed ? 'Confirmada' : 'Pendente' },
        ]}
        title={title}
      />

      <EmailSection>
        <p style={{ color: '#E8EDF8', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          Ola{lead.name ? `, ${lead.name}` : ''}.
        </p>
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '14px 0 0' }}>
          {isConfirmed
            ? 'A sua reuniao com a Norm8 esta confirmada.'
            : `Recebemos o pedido de reuniao para a ${lead.company}. A equipa da Norm8 ira entrar em contacto para finalizar a marcacao.`}
        </p>
      </EmailSection>

      {isConfirmed && meetingBooking ? (
        <>
          <EmailSection title="Detalhes da reuniao">
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <EmailMetric
                    label="Data"
                    value={formatMeetingDate(meetingBooking.startsAt, meetingBooking.timezone)}
                  />
                  <EmailMetric
                    label="Hora"
                    value={formatMeetingTimeRange(
                      meetingBooking.startsAt,
                      meetingBooking.endsAt,
                      meetingBooking.timezone,
                    )}
                  />
                </tr>
                <tr>
                  <EmailMetric
                    label="Duracao"
                    value={formatMeetingDuration(meetingBooking.startsAt, meetingBooking.endsAt)}
                  />
                  <EmailMetric label="Empresa" value={meetingBooking.attendeeCompany} />
                </tr>
              </tbody>
            </table>
            <EmailCard>
              <p style={{ color: '#8399B8', fontSize: 11, fontWeight: 800, margin: '0 0 5px', textTransform: 'uppercase' }}>
                Objetivo
              </p>
              <p style={{ color: '#E8EDF8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                {meetingBooking.meetingGoal}
              </p>
            </EmailCard>
          </EmailSection>
          <EmailSection align="center" title="Proximos passos">
            <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>
              Vamos usar a sessao para validar processos criticos, clarificar prioridades e
              definir uma primeira direccao de implementacao.
            </p>
            <EmailButton href={replyTo}>Responder a este email</EmailButton>
          </EmailSection>
        </>
      ) : (
        <EmailSection title="Proximos passos">
          <EmailCard>
            <p style={{ color: '#E8EDF8', fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>
              Confirmacao manual
            </p>
            <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
              Nao foi possivel confirmar automaticamente o horario neste momento.
              A equipa Norm8 ira confirmar disponibilidade e enviar os detalhes por email.
            </p>
          </EmailCard>
        </EmailSection>
      )}

      <EmailFooter />
    </EmailShell>
  );
}
