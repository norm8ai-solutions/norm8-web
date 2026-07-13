/**
 * ------------------------------------------------------------------
 * File: lib/email/templates/InternalMeetingNotificationEmail.tsx
 * Description: Internal Norm8 briefing email for scheduled meetings.
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

export default function InternalMeetingNotificationEmail({
  context,
}: MeetingEmailTemplateProps) {
  const leadFields = buildLeadFields(context);
  const commercialFields = buildCommercialContextFields(context);
  const meetingFields = buildMeetingFields(context);
  const preparationItems = buildPreparationItems(context);
  const calendarUrl = safeUrl(context.googleCalendarUrl ?? context.googleEventHtmlLink);

  return (
    <Norm8EmailLayout
      badge="NORM8 INTERNAL BRIEFING"
      meta={[
        { label: 'Empresa', value: safeText(context.companyName) },
        { label: 'Estado', value: safeText(context.status) },
      ]}
      subtitle="Foi marcada uma reunião comercial através da Área Interna da Norm8."
      title="Nova reunião agendada"
    >
      <EmailSection title="Resumo operacional">
        <p style={{ color: '#E8EDF8', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          Foi marcada uma reunião de diagnóstico com {safeText(context.companyName)} para {safeText(context.meetingDate)}, entre {safeText(context.meetingStartTime)} e {safeText(context.meetingEndTime)}.{buildLeadSignalSentence(context)}
        </p>
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '14px 0 0' }}>
          O foco da sessão será validar contexto, principais dores operacionais e próximos passos comerciais.
        </p>
      </EmailSection>

      <EmailSection title="Dados da lead">
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>
            {renderMetricRows(leadFields)}
          </tbody>
        </table>
      </EmailSection>

      <EmailSection title="Objetivo interno">
        <EmailCard>
          <p style={{ color: '#E8EDF8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            {safeText(context.internalObjective)}
          </p>
        </EmailCard>
      </EmailSection>

      <EmailSection title="Contexto comercial">
        <EmailCard>
          <p style={{ color: '#E8EDF8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            {safeText(context.commercialContext, 'Sem contexto comercial adicional registado. Rever a lead antes da reunião.')}
          </p>
        </EmailCard>
        {commercialFields.length > 0 ? (
          <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
            <tbody>{renderMetricRows(commercialFields)}</tbody>
          </table>
        ) : null}
      </EmailSection>

      <EmailSection title="Detalhes da reunião">
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>{renderMetricRows(meetingFields)}</tbody>
        </table>
      </EmailSection>

      <EmailSection title="Evento Google Calendar">
        <EmailCard>
          <p style={{ color: '#E8EDF8', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            {context.googleEventCreated
              ? 'Evento criado no Google Calendar.'
              : 'Evento sem identificador Google Calendar registado.'}
          </p>
        </EmailCard>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>
            {renderMetricRows([
              { label: 'Google Event ID', value: context.googleEventId },
              { label: 'Estado Google Calendar', value: context.googleEventCreated ? 'Criado' : 'Sem ID registado' },
              { label: 'Início', value: context.meetingStartTime },
              { label: 'Fim', value: context.meetingEndTime },
            ])}
          </tbody>
        </table>
        {calendarUrl ? (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <EmailButton href={calendarUrl}>Ver evento no calendário</EmailButton>
          </div>
        ) : null}
      </EmailSection>

      <EmailSection title="Preparação recomendada">
        <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: '0 0 14px' }}>
          Antes da reunião, recomenda-se rever o contexto da lead e preparar perguntas de diagnóstico.
        </p>
        <ul style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
          {preparationItems.map((item, index) => (
            <li key={item} style={{ marginBottom: index === preparationItems.length - 1 ? 0 : 6 }}>
              {item}
            </li>
          ))}
        </ul>
      </EmailSection>

      <EmailSection align="center" title="Ações rápidas">
        {safeUrl(context.adminLeadUrl) ? (
          <EmailButton href={context.adminLeadUrl!}>Abrir lead no Admin</EmailButton>
        ) : (
          <p style={{ color: '#8399B8', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Lead associada sem link direto disponível.
          </p>
        )}
      </EmailSection>
    </Norm8EmailLayout>
  );
}

type MetricField = {
  label: string;
  value?: string | number | boolean | null;
};

function buildLeadFields(context: MeetingEmailContext): MetricField[] {
  return [
    { label: 'Empresa', value: context.companyName },
    { label: 'Contacto', value: context.contactName },
    { label: 'Email', value: context.contactEmail },
    { label: 'Telefone', value: context.contactPhone },
    { label: 'Estado da lead', value: context.leadStatus },
    { label: 'Prioridade da lead', value: context.leadPriority },
    { label: 'Origem', value: context.leadSource },
    { label: 'Serviço/interesse', value: context.serviceInterest },
  ];
}

function buildCommercialContextFields(context: MeetingEmailContext): MetricField[] {
  return [
    { label: 'Resumo da submissão', value: context.submissionSummary },
    { label: 'Ação que originou a reunião', value: context.triggerActionTitle },
    { label: 'Descrição da ação', value: context.triggerActionDescription },
  ].filter((field) => hasValue(field.value));
}

function buildLeadSignalSentence(context: MeetingEmailContext): string {
  const signals = [
    context.leadStatus ? `estado ${context.leadStatus}` : null,
    context.leadPriority ? `prioridade ${context.leadPriority}` : null,
  ].filter(Boolean);

  return signals.length > 0 ? ` A lead está atualmente no ${signals.join(', com ')}.` : '';
}

function buildPreparationItems(context: MeetingEmailContext): string[] {
  if (context.hasLimitedCommercialContext) {
    return [
      'Como não existe contexto detalhado registado, preparar perguntas de diagnóstico inicial.',
      'Confirmar quais são os processos mais manuais ou repetitivos.',
      'Perceber que ferramentas a equipa usa atualmente.',
      'Identificar onde existem atrasos, retrabalho ou perda de informação.',
      'Validar prioridades e urgência da necessidade.',
      'Perceber se faz sentido avançar para proposta ou plano de implementação.',
    ];
  }

  return [
    'Rever submissão ou auditoria associada.',
    'Confirmar principais dores operacionais.',
    'Identificar processos manuais ou repetitivos mencionados.',
    'Preparar perguntas de diagnóstico.',
    'Validar próximos passos comerciais possíveis.',
    'Confirmar se faz sentido avançar para proposta ou plano de implementação.',
  ];
}

function buildMeetingFields(context: MeetingEmailContext): MetricField[] {
  return [
    { label: 'Título', value: context.meetingTitle },
    { label: 'Estado', value: context.status },
    { label: 'Data', value: context.meetingDate },
    { label: 'Hora', value: `${context.meetingStartTime}–${context.meetingEndTime}` },
    { label: 'Duração', value: `${context.durationMinutes} minutos` },
    { label: 'Origem', value: context.source },
    { label: 'Empresa', value: context.companyName },
    { label: 'Contacto', value: context.contactName },
  ];
}

function renderMetricRows(fields: MetricField[]) {
  const visibleFields = fields.filter((field) => hasValue(field.value));
  const rows = [];

  for (let index = 0; index < visibleFields.length; index += 2) {
    const first = visibleFields[index];
    const second = visibleFields[index + 1];
    rows.push(
      <tr key={`${first.label}-${second?.label ?? 'empty'}`}>
        <EmailMetric label={first.label} value={safeText(first.value)} />
        {second ? <EmailMetric label={second.label} value={safeText(second.value)} /> : <td />}
      </tr>,
    );
  }

  return rows;
}

function hasValue(value?: string | number | boolean | null): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  return String(value).trim().length > 0 && String(value).trim() !== 'Sem resumo indicado';
}

function safeText(value?: string | number | boolean | null, fallback = 'Não indicado'): string {
  const normalized = value === undefined || value === null ? undefined : String(value).trim();
  return normalized && normalized !== 'Sem resumo indicado' ? normalized : fallback;
}

function safeUrl(value?: string | null): string | undefined {
  const normalized = value?.trim();
  if (!normalized || !/^https?:\/\//i.test(normalized)) {
    return undefined;
  }

  return normalized;
}
