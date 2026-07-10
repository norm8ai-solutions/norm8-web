'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import type { LeadAction } from '@/app/generated/prisma/client';
import {
  CalendarPlus,
  ClipboardCheck,
  FileSearch,
  FileText,
  MailPlus,
  PhoneCall,
  XCircle,
} from 'lucide-react';
import {
  closeLeadAsLostFromAction,
  loadAdminMeetingSlotAvailability,
  prepareLeadActionEmail,
  registerLeadActionCall,
  registerLeadActionGenericExecution,
  registerLeadActionProposalIntent,
  scheduleLeadActionMeeting,
} from '@/lib/admin/actions';
import {
  type LeadActionExecutionKind,
  getLeadActionExecutionConfig,
} from '@/lib/admin/lead-action-execution';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Norm8DateTimePicker } from '@/components/ui/norm8-date-time-picker';
import { Norm8Select } from '@/components/ui/norm8-select';

export type LeadActionExecutionContext = {
  auditSummary?: string | null;
  latestSubmissionId?: string;
  leadCompany: string;
  leadEmail: string;
  leadId: string;
  leadName?: string | null;
  potentialEstimate?: string;
};

type LeadActionExecutionControlProps = {
  action: LeadAction;
  context: LeadActionExecutionContext;
  emphasis?: 'primary' | 'compact';
};

type AdminMeetingSlotAvailability = Awaited<ReturnType<typeof loadAdminMeetingSlotAvailability>>;

const MEETING_TIME_OPTIONS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];

const MEETING_DURATION_OPTIONS = [
  { value: '15', label: '15 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '60 minutos' },
  { value: '90', label: '90 minutos' },
];

const iconByKind: Record<LeadActionExecutionKind, typeof CalendarPlus> = {
  scheduleMeeting: CalendarPlus,
  prepareEmail: MailPlus,
  openSubmission: FileSearch,
  createProposal: FileText,
  registerCall: PhoneCall,
  closeLost: XCircle,
  registerGenericExecution: ClipboardCheck,
};

export function LeadActionExecutionControl({
  action,
  context,
  emphasis = 'compact',
}: LeadActionExecutionControlProps) {
  const config = getLeadActionExecutionConfig(action.type);
  const Icon = iconByKind[config.kind];
  const buttonClassName = [
    'admin-button',
    'admin-action-execute-button',
    config.tone !== 'primary' ? 'admin-button-muted' : '',
    config.tone === 'danger' ? 'admin-action-execute-button-danger' : '',
    emphasis === 'primary' ? 'admin-action-execute-button-featured' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (config.kind === 'openSubmission') {
    if (!context.latestSubmissionId) {
      return (
        <button className={buttonClassName} disabled type="button">
          <Icon aria-hidden="true" size={16} />
          Sem submissão
        </button>
      );
    }

    return (
      <Link
        className={buttonClassName}
        href={`/admin/submissions/${context.latestSubmissionId}`}
      >
        <Icon aria-hidden="true" size={16} />
        {config.label}
      </Link>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={buttonClassName} type="button">
          <Icon aria-hidden="true" size={16} />
          {config.label}
        </button>
      </DialogTrigger>
      <DialogContent className="admin-execution-dialog">
        <DialogHeader>
          <DialogTitle>{config.label}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        {renderExecutionForm(config.kind, action, context)}
      </DialogContent>
    </Dialog>
  );
}

function renderExecutionForm(
  kind: LeadActionExecutionKind,
  action: LeadAction,
  context: LeadActionExecutionContext,
) {
  switch (kind) {
    case 'scheduleMeeting':
      return <MeetingExecutionForm action={action} context={context} />;
    case 'prepareEmail':
      return <EmailExecutionForm action={action} context={context} />;
    case 'createProposal':
      return <ProposalExecutionForm action={action} context={context} />;
    case 'registerCall':
      return <CallExecutionForm action={action} context={context} />;
    case 'closeLost':
      return <CloseLostExecutionForm action={action} context={context} />;
    case 'registerGenericExecution':
      return <GenericExecutionForm action={action} context={context} />;
    case 'openSubmission':
      return null;
  }
}

function MeetingExecutionForm({
  action,
  context,
}: {
  action: LeadAction;
  context: LeadActionExecutionContext;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [startsAt, setStartsAt] = React.useState<Date | null>(() =>
    getMeetingDefaultDate(action.dueAt),
  );
  const [durationMinutes, setDurationMinutes] = React.useState('45');
  const [availability, setAvailability] = React.useState<AdminMeetingSlotAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [availabilityError, setAvailabilityError] = React.useState<string | null>(null);
  const selectedDate = startsAt ? toIsoDateValue(startsAt) : toIsoDateValue(getNextUsefulSlot());
  const selectedTime = startsAt ? formatTimeValue(startsAt) : '';
  const parsedDuration = Number.parseInt(durationMinutes, 10);

  const clearExecutionError = React.useCallback((): void => {
    if (!searchParams.has('actionExecutionError')) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('actionExecutionError');
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  React.useEffect(() => {
    let active = true;

    setAvailabilityLoading(true);
    setAvailabilityError(null);

    loadAdminMeetingSlotAvailability({
      date: selectedDate,
      durationMinutes: Number.isFinite(parsedDuration) ? parsedDuration : 45,
      timezone: 'Europe/Lisbon',
    })
      .then((result) => {
        if (!active) {
          return;
        }

        setAvailability(result);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setAvailability(null);
        setAvailabilityError('Não foi possível carregar horários disponíveis. Tente novamente.');
      })
      .finally(() => {
        if (active) {
          setAvailabilityLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [parsedDuration, selectedDate]);

  React.useEffect(() => {
    if (!availability || !startsAt) {
      return;
    }

    const matchingSlot = availability.slots.find((slot) => slot.time === selectedTime);

    if (matchingSlot?.available) {
      return;
    }

    const nextAvailableSlot = availability.slots.find((slot) => slot.available);

    if (nextAvailableSlot) {
      setStartsAt(new Date(nextAvailableSlot.startsAt));
    }
  }, [availability, selectedTime, startsAt]);

  const timeOptions = availability
    ? availability.slots.map((slot) => ({
        time: slot.time,
        disabled: !slot.available,
        label: slot.available ? slot.time : `${slot.time} ocupado`,
      }))
    : MEETING_TIME_OPTIONS.map((time) => ({
        time,
        disabled: availabilityLoading,
        label: availabilityLoading ? `${time} ...` : time,
      }));
  const selectedSlotIsAvailable = Boolean(
    availability?.slots.some((slot) => slot.time === selectedTime && slot.available),
  );
  const submitDisabled = availabilityLoading || Boolean(availabilityError) || !selectedSlotIsAvailable;

  const handleStartsAtChange = (nextDate: Date | null): void => {
    clearExecutionError();
    setStartsAt(nextDate);
  };

  const handleDurationChange = (nextDuration: string): void => {
    clearExecutionError();
    setDurationMinutes(nextDuration);
  };

  return (
    <form action={scheduleLeadActionMeeting} className="admin-execution-form" noValidate>
      <ExecutionHiddenFields actionId={action.id} leadId={context.leadId} />
      <input name="timezone" type="hidden" value="Europe/Lisbon" />
      <label className="admin-form-control">
        <span>Título</span>
        <input
          className="admin-input"
          defaultValue={`Reunião de diagnóstico com ${context.leadCompany}`}
          name="title"
        />
      </label>
      <div className="admin-execution-summary">
        <strong>{context.leadCompany}</strong>
        <span>{context.leadName ?? 'Contacto sem nome'} · {context.leadEmail}</span>
      </div>
      <label className="admin-form-control">
        <span>Data e hora</span>
        <Norm8DateTimePicker
          ariaRequired
          clearable={false}
          density="compact"
          name="startsAt"
          onValueChange={handleStartsAtChange}
          placeholder="Selecionar data e hora da reunião..."
          timeOptions={timeOptions}
          value={startsAt}
        />
      </label>
      {availabilityError ? (
        <p className="admin-execution-inline-error">{availabilityError}</p>
      ) : null}
      {!availabilityError && availability && !availability.slots.some((slot) => slot.available) ? (
        <p className="admin-execution-inline-error">Sem horários disponíveis para esta data.</p>
      ) : null}
      <label className="admin-form-control">
        <span>Duração</span>
        <Norm8Select
          ariaRequired
          defaultValue="45"
          name="durationMinutes"
          onValueChange={handleDurationChange}
          options={MEETING_DURATION_OPTIONS}
          value={durationMinutes}
        />
      </label>
      <label className="admin-form-control">
        <span>Descrição / notas</span>
        <textarea
          className="admin-textarea"
          defaultValue={action.description ?? `Diagnóstico comercial com ${context.leadCompany}.`}
          name="notes"
        />
      </label>
      <ExecutionSubmitButton disabled={submitDisabled} pendingLabel="A agendar...">
        Confirmar reunião
      </ExecutionSubmitButton>
    </form>
  );
}

function EmailExecutionForm({
  action,
  context,
}: {
  action: LeadAction;
  context: LeadActionExecutionContext;
}) {
  const emailTemplate = getEmailTemplate(action, context);

  return (
    <form action={prepareLeadActionEmail} className="admin-execution-form" noValidate>
      <ExecutionHiddenFields actionId={action.id} leadId={context.leadId} />
      <label className="admin-form-control">
        <span>Destinatário</span>
        <input className="admin-input" defaultValue={context.leadEmail} name="to" />
      </label>
      <label className="admin-form-control">
        <span>Assunto</span>
        <input className="admin-input" defaultValue={emailTemplate.subject} name="subject" />
      </label>
      <label className="admin-form-control">
        <span>Corpo</span>
        <textarea
          className="admin-textarea admin-execution-textarea-large"
          defaultValue={emailTemplate.body}
          name="body"
        />
      </label>
      <ExecutionSubmitButton pendingLabel="A guardar...">Guardar rascunho</ExecutionSubmitButton>
    </form>
  );
}

function ProposalExecutionForm({
  action,
  context,
}: {
  action: LeadAction;
  context: LeadActionExecutionContext;
}) {
  return (
    <form action={registerLeadActionProposalIntent} className="admin-execution-form" noValidate>
      <ExecutionHiddenFields actionId={action.id} leadId={context.leadId} />
      <div className="admin-execution-summary">
        <strong>O módulo de propostas será integrado futuramente com PDF, CRM e Norm8 OS.</strong>
        <span>{context.leadCompany} · {context.leadEmail}</span>
        {context.potentialEstimate ? <span>Potencial: {context.potentialEstimate}</span> : null}
        {context.auditSummary ? <span>{context.auditSummary}</span> : null}
      </div>
      <label className="admin-form-control">
        <span>Notas para a proposta</span>
        <textarea
          className="admin-textarea"
          defaultValue={action.description ?? ''}
          name="notes"
          placeholder="Resumo do que deve ser preparado quando o módulo estiver disponível..."
        />
      </label>
      <ExecutionSubmitButton pendingLabel="A registar...">
        Registar intenção de proposta
      </ExecutionSubmitButton>
    </form>
  );
}

function CallExecutionForm({
  action,
  context,
}: {
  action: LeadAction;
  context: LeadActionExecutionContext;
}) {
  return (
    <form action={registerLeadActionCall} className="admin-execution-form" noValidate>
      <ExecutionHiddenFields actionId={action.id} leadId={context.leadId} />
      <div className="admin-execution-summary">
        <strong>{context.leadName ?? context.leadCompany}</strong>
        <span>{context.leadEmail}</span>
      </div>
      <label className="admin-form-control">
        <span>Data e hora</span>
        <input className="admin-input" defaultValue={toDateTimeLocalValue(new Date())} name="occurredAt" type="datetime-local" />
      </label>
      <label className="admin-form-control">
        <span>Resultado</span>
        <select className="admin-select" defaultValue="answered" name="result">
          <option value="answered">Atendida</option>
          <option value="no_answer">Sem resposta</option>
          <option value="voicemail">Mensagem deixada</option>
          <option value="callback">Pediu contacto mais tarde</option>
        </select>
      </label>
      <label className="admin-form-control">
        <span>Notas da chamada</span>
        <textarea
          className="admin-textarea"
          defaultValue={action.description ?? ''}
          name="notes"
          placeholder="Resultado da chamada, próximos passos ou tentativa de contacto..."
        />
      </label>
      <ExecutionSubmitButton pendingLabel="A registar...">Registar chamada</ExecutionSubmitButton>
    </form>
  );
}

function CloseLostExecutionForm({
  action,
  context,
}: {
  action: LeadAction;
  context: LeadActionExecutionContext;
}) {
  return (
    <form action={closeLeadAsLostFromAction} className="admin-execution-form" noValidate>
      <ExecutionHiddenFields actionId={action.id} leadId={context.leadId} />
      <div className="admin-execution-summary admin-execution-summary-danger">
        <strong>Esta ação marca a lead como perdida.</strong>
        <span>A ação será concluída e a lead sai do pipeline ativo.</span>
      </div>
      <label className="admin-form-control">
        <span>Motivo</span>
        <textarea
          className="admin-textarea"
          name="reason"
          placeholder="Ex.: Sem orçamento, sem fit, sem resposta após follow-up..."
        />
      </label>
      <ExecutionSubmitButton danger pendingLabel="A fechar...">
        Fechar como perdida
      </ExecutionSubmitButton>
    </form>
  );
}

function GenericExecutionForm({
  action,
  context,
}: {
  action: LeadAction;
  context: LeadActionExecutionContext;
}) {
  return (
    <form action={registerLeadActionGenericExecution} className="admin-execution-form" noValidate>
      <ExecutionHiddenFields actionId={action.id} leadId={context.leadId} />
      <div className="admin-execution-summary">
        <strong>{action.title}</strong>
        <span>Regista o que foi feito e conclui esta ação.</span>
      </div>
      <label className="admin-form-control">
        <span>Nota de execução</span>
        <textarea
          className="admin-textarea"
          defaultValue={action.description ?? ''}
          name="notes"
          placeholder="Descreve brevemente a execução desta ação..."
        />
      </label>
      <ExecutionSubmitButton pendingLabel="A registar...">Concluir ação</ExecutionSubmitButton>
    </form>
  );
}

function ExecutionHiddenFields({
  actionId,
  leadId,
}: {
  actionId: string;
  leadId: string;
}) {
  return (
    <>
      <input name="leadId" type="hidden" value={leadId} />
      <input name="actionId" type="hidden" value={actionId} />
    </>
  );
}

function ExecutionSubmitButton({
  children,
  danger = false,
  disabled = false,
  pendingLabel,
}: {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={[
        'admin-button',
        'admin-execution-submit-button',
        danger ? 'admin-action-execute-button-danger' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

function getEmailTemplate(
  action: LeadAction,
  context: LeadActionExecutionContext,
): { body: string; subject: string } {
  const greeting = context.leadName ? `Olá ${context.leadName},` : 'Olá,';

  if (action.type === 'FOLLOW_UP') {
    return {
      subject: 'Seguimento do pedido submetido à Norm8',
      body: `${greeting}\n\nEstou a dar seguimento ao pedido submetido através do website da Norm8.\n\nGostava de confirmar se ainda faz sentido avançarmos com uma breve reunião de diagnóstico para perceber melhor os processos que pretendem automatizar e os próximos passos.\n\nCumprimentos,\nEquipa Norm8`,
    };
  }

  return {
    subject: 'Seguimento da auditoria de automação da Norm8',
    body: `${greeting}\n\nObrigado pelo pedido submetido no website da Norm8.\n\nEstive a rever o contexto da ${context.leadCompany} e acredito que podemos ajudar a reduzir trabalho manual, melhorar acompanhamento comercial e automatizar processos internos.\n\nGostava de agendar uma breve reunião de diagnóstico para perceber melhor as prioridades e próximos passos.\n\nCumprimentos,\nEquipa Norm8`,
  };
}

function getMeetingDefaultDate(date: Date | null): Date {
  return date && date.getTime() > Date.now() ? new Date(date) : getNextUsefulSlot();
}

function toIsoDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function formatTimeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function toDateTimeLocalValue(date: Date | null): string {
  const baseDate = date && date.getTime() > Date.now() ? new Date(date) : getNextUsefulSlot();

  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  const hours = String(baseDate.getHours()).padStart(2, '0');
  const minutes = String(baseDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getNextUsefulSlot(): Date {
  const slot = new Date();
  slot.setDate(slot.getDate() + 1);
  slot.setHours(slot.getHours() < 9 ? 9 : slot.getHours() + 1, 0, 0, 0);

  if (slot.getHours() >= 18) {
    slot.setDate(slot.getDate() + 1);
    slot.setHours(9, 0, 0, 0);
  }

  if (slot.getDay() === 0) {
    slot.setDate(slot.getDate() + 1);
  }

  if (slot.getDay() === 6) {
    slot.setDate(slot.getDate() + 2);
  }

  return slot;
}
