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
 registerLeadActionCall,
 registerLeadActionGenericExecution,
 registerLeadActionProposalIntent,
 scheduleLeadActionMeeting,
 sendLeadActionEmailExecution,
 type LeadActionEmailExecutionResult,
 type LeadActionProposalExecutionResult,
} from '@/lib/admin/actions';
import {
 type LeadActionExecutionKind,
 getLeadActionExecutionConfig,
} from '@/lib/admin/lead-action-execution';
import LeadActionEmail, { type LeadActionEmailContext } from '@/lib/email/templates/LeadActionEmail';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from '@/components/ui/dialog';
import { ProposalPdfActions } from '@/components/admin/ProposalPdfActions';
import { Norm8DateTimePicker } from '@/components/ui/norm8-date-time-picker';
import { Norm8Select } from '@/components/ui/norm8-select';
import { normalizePortugueseText } from '@/lib/text/normalize-portuguese';

export type ProposalDraftSummary = {
 companyName: string;
 contactName?: string | null;
 estimatedValue?: string | null;
 id: string;
 implementationPlan?: string | null;
 pdfUrl?: string | null;
 leadActionId?: string | null;
 nextSteps?: string | null;
 painPoints?: string | null;
 recommendedSolution?: string | null;
 status?: string;
 title: string;
};

export type LeadActionExecutionContext = {
 auditSummary?: string | null;
 latestSubmissionId?: string;
 leadCompany: string;
 leadEmail: string;
 leadId: string;
 leadName?: string | null;
 potentialEstimate?: string;
 proposalDefaults?: ProposalPrefillDefaults;
 proposalDrafts?: ProposalDraftSummary[];
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
 const existingProposal = action.type === 'SEND_PROPOSAL'
 ? context.proposalDrafts?.find((proposal) => proposal.leadActionId === action.id)
 : undefined;
 const triggerLabel = action.type === 'SEND_PROPOSAL' && existingProposal
 ? 'Preparar proposta'
 : config.label;
 const dialogTitle = action.type === 'SEND_PROPOSAL' ? 'Preparar proposta' : config.label;
 const dialogDescription = action.type === 'SEND_PROPOSAL'
 ? 'Revê e ajusta os dados antes de gerar a proposta comercial.'
 : config.description;
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
 {triggerLabel}
 </button>
 </DialogTrigger>
 <DialogContent className={`admin-execution-dialog${config.kind === 'prepareEmail' ? ' admin-execution-dialog-email' : ''}`}>
 <DialogHeader>
 <DialogTitle>{dialogTitle}</DialogTitle>
 <DialogDescription>{dialogDescription}</DialogDescription>
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
 const [availabilityDate, setAvailabilityDate] = React.useState<Date>(() =>
 getMeetingDefaultDate(action.dueAt),
 );
 const [durationMinutes, setDurationMinutes] = React.useState('45');
 const [availability, setAvailability] = React.useState<AdminMeetingSlotAvailability | null>(null);
 const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
 const [availabilityError, setAvailabilityError] = React.useState<string | null>(null);
 const selectedDate = toIsoDateValue(availabilityDate);
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
 setAvailability(null);
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

 const handleMeetingDayChange = (nextDay: Date): void => {
 clearExecutionError();
 setAvailabilityError(null);
 setAvailabilityDate(nextDay);
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
 <span>{'T\u00edtulo'}</span>
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
 onDayChange={handleMeetingDayChange}
 onValueChange={handleStartsAtChange}
 placeholder="Selecionar data e hora da reunião..."
 timeOptions={timeOptions}
 timeOptionsLoading={availabilityLoading}
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
 const router = useRouter();
 const emailTemplate = getEmailTemplate(action, context);
 const initialState: LeadActionEmailExecutionResult = {
 success: false,
 emailSent: false,
 };
 const [state, formAction, pending] = React.useActionState(
 sendLeadActionEmailExecution,
 initialState,
 );
 const [to, setTo] = React.useState(context.leadEmail);
 const [subject, setSubject] = React.useState(emailTemplate.subject);
 const [body, setBody] = React.useState(emailTemplate.body);
 const previewContext = React.useMemo<LeadActionEmailContext>(() => ({
 leadId: context.leadId,
 actionId: action.id,
 companyName: context.leadCompany,
 contactName: context.leadName,
 recipientEmail: to,
 subject,
 body,
 actionType: action.type === 'FOLLOW_UP' ? 'FOLLOW_UP' : 'SEND_EMAIL',
 adminLeadUrl: `/admin/leads/${context.leadId}`,
 }), [action.id, action.type, body, context.leadCompany, context.leadId, context.leadName, subject, to]);
 const localEmailError = to && !isValidEmailAddress(to)
 ? 'Esta lead não tem um email válido associado.'
 : null;
 const sendDisabled = pending || Boolean(localEmailError) || !to.trim() || !subject.trim() || !body.trim();
 const submitLabel = action.type === 'FOLLOW_UP' ? 'Enviar follow-up' : 'Enviar email';

 React.useEffect(() => {
 if (state.success) {
 router.refresh();
 }
 }, [router, state.success]);

 return (
 <form action={formAction} className="admin-execution-form" noValidate>
 <ExecutionHiddenFields actionId={action.id} leadId={context.leadId} />
 <div className="admin-email-composer-grid">
 <section className="admin-email-editor-panel" aria-label="Editor do email">
 <div className="admin-execution-summary">
 <strong>Editor simples</strong>
 <span>O email só será marcado como enviado depois de confirmação do provider.</span>
 </div>
 <label className="admin-form-control">
 <span>Para</span>
 <input
 className="admin-input"
 name="to"
 onChange={(event) => setTo(event.target.value)}
 value={to}
 />
 </label>
 <label className="admin-form-control">
 <span>Assunto</span>
 <input
 className="admin-input"
 name="subject"
 onChange={(event) => setSubject(event.target.value)}
 value={subject}
 />
 </label>
 <label className="admin-form-control">
 <span>Corpo</span>
 <textarea
 className="admin-textarea admin-execution-textarea-large"
 name="body"
 onChange={(event) => setBody(event.target.value)}
 value={body}
 />
 </label>
 </section>
 <EmailPreview context={previewContext} to={to} />
 </div>
 {localEmailError ? (
 <p className="admin-execution-inline-error">{localEmailError}</p>
 ) : null}
 {state.error ? (
 <p className="admin-execution-inline-error">{state.error}</p>
 ) : null}
 {state.success ? (
 <p className="admin-execution-success">Email aceite pelo provider e ação concluída.</p>
 ) : null}
 <ExecutionSubmitButton disabled={sendDisabled} pending={pending} pendingLabel="A enviar...">
 {submitLabel}
 </ExecutionSubmitButton>
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
 const router = useRouter();
 const existingProposal = context.proposalDrafts?.find(
 (proposal) => proposal.leadActionId === action.id,
 );
 const defaults = getProposalFormDefaults(action, context, existingProposal);
 const initialState: LeadActionProposalExecutionResult = {
 success: false,
 proposalCreated: false,
 };
 const [state, formAction, pending] = React.useActionState(
 registerLeadActionProposalIntent,
 initialState,
 );

 React.useEffect(() => {
 if (state.success) {
 router.refresh();
 }
 }, [router, state.success]);

 return (
 <>
 <form action={formAction} className="admin-execution-form" noValidate>
 <ExecutionHiddenFields actionId={action.id} leadId={context.leadId} />
 <div className="admin-execution-summary">
 <strong>Preparar proposta</strong>
 <span>{'Rev\u00ea e ajusta os dados antes de gerar a proposta comercial.'}</span>
 {context.potentialEstimate ? <span>Potencial comercial: {context.potentialEstimate}</span> : null}
 {existingProposal ? <span>Rascunho existente carregado para revis\u00e3o.</span> : <span>{getProposalDataSourceLabel(defaults.proposalDataSource)}</span>}
 </div>

 <label className="admin-form-control">
 <span>{'T\u00edtulo da proposta'}</span>
 <input className="admin-input" defaultValue={defaults.title} name="title" required />
 </label>

 <div className="admin-action-form-grid">
 <label className="admin-form-control">
 <span>Empresa</span>
 <input className="admin-input" defaultValue={defaults.companyName} name="companyName" required />
 </label>
 <label className="admin-form-control">
 <span>Contacto</span>
 <input className="admin-input" defaultValue={defaults.contactName} name="contactName" />
 </label>
 <label className="admin-form-control">
 <span>Valor estimado</span>
 <input
 className="admin-input"
 defaultValue={defaults.estimatedValue}
 inputMode="decimal"
 name="estimatedValue"
 placeholder="Ex.: 4500"
 />
 </label>
 </div>


 <label className="admin-form-control">
 <span>Dores identificadas</span>
 <textarea className="admin-textarea" defaultValue={defaults.painPoints} name="painPoints" required />
 </label>
 <label className="admin-form-control">
 <span>{'Solu\u00e7\u00e3o recomendada'}</span>
 <textarea
 className="admin-textarea"
 defaultValue={defaults.recommendedSolution}
 name="recommendedSolution"
 required
 />
 </label>
 <label className="admin-form-control">
 <span>{'Plano de implementa\u00e7\u00e3o'}</span>
 <textarea
 className="admin-textarea"
 defaultValue={defaults.implementationPlan}
 name="implementationPlan"
 required
 />
 </label>
 <label className="admin-form-control">
 <span>{'Pr\u00f3ximos passos'}</span>
 <textarea className="admin-textarea" defaultValue={defaults.nextSteps} name="nextSteps" required />
 </label>

 {state.error ? (
 <p className="admin-execution-inline-error">{state.error}</p>
 ) : null}

 <ExecutionSubmitButton disabled={pending} pending={pending} pendingLabel="A guardar...">
 Guardar proposta
 </ExecutionSubmitButton>
 </form>

 {existingProposal && !state.success ? (
 <div className="admin-execution-summary">
 <strong>{'Proposta j\u00e1 guardada'}</strong>
 <span>
 {existingProposal.pdfUrl
 ? 'O PDF desta proposta j\u00e1 est\u00e1 dispon\u00edvel.'
 : 'Esta proposta ainda n\u00e3o tem PDF gerado.'}
 </span>
 <ProposalPdfActions
 generateLabel="Gerar PDF"
 leadId={context.leadId}
 pdfUrl={existingProposal.pdfUrl}
 proposalId={existingProposal.id}
 regenerateLabel="Regenerar PDF"
 viewLabel="Ver PDF"
 />
 </div>
 ) : null}

 {state.success && state.proposalId ? (
 <div className="admin-execution-summary">
 <strong>Proposta criada com sucesso</strong>
 <span>{'A proposta foi guardada e est\u00e1 pronta para gerar o PDF.'}</span>
 <span>{'O PDF ainda n\u00e3o foi gerado automaticamente.'}</span>
 <ProposalPdfActions
 generateLabel="Gerar PDF agora"
 leadId={context.leadId}
 pdfUrl={existingProposal?.pdfUrl}
 proposalId={state.proposalId}
 regenerateLabel="Regenerar PDF"
 viewLabel="Ver PDF"
 />
 </div>
 ) : null}
 </>
 );
}

type ProposalFormDefaults = {
 companyName: string;
 contactName: string;
 estimatedValue: string;
 implementationPlan: string;
 nextSteps: string;
 painPoints: string;
 proposalDataSource: 'audit' | 'lead' | 'saved';
 recommendedSolution: string;
 title: string;
};

type ProposalPrefillDefaults = Partial<Pick<
 ProposalFormDefaults,
 'estimatedValue' | 'implementationPlan' | 'nextSteps' | 'painPoints' | 'recommendedSolution'
>> & {
 proposalDataSource: 'audit' | 'lead';
};
function getProposalFormDefaults(
  action: LeadAction,
  context: LeadActionExecutionContext,
  existingProposal?: ProposalDraftSummary,
): ProposalFormDefaults {
  const clean = normalizePortugueseText;
  const companyName = clean(existingProposal?.companyName || context.leadCompany || 'Empresa não indicada');

  return {
    title: clean(existingProposal?.title || `Proposta Norm8 para ${companyName}`),
    companyName,
    contactName: clean(existingProposal?.contactName || context.leadName || ''),
    estimatedValue: clean(existingProposal?.estimatedValue || context.proposalDefaults?.estimatedValue || ''),
    proposalDataSource: existingProposal ? 'saved' : context.proposalDefaults?.proposalDataSource ?? 'lead',
    painPoints: clean(
      existingProposal?.painPoints ||
        context.proposalDefaults?.painPoints ||
        context.auditSummary ||
        action.description ||
        'Dores operacionais ainda não detalhadas. Validar processos manuais, tarefas repetitivas, atrasos, retrabalho e perda de informação antes de finalizar a proposta.',
    ),
    recommendedSolution: clean(
      existingProposal?.recommendedSolution ||
        context.proposalDefaults?.recommendedSolution ||
        'Desenhar uma solução faseada com foco em automação de processos, melhoria da visibilidade operacional e redução de trabalho manual.',
    ),
    implementationPlan: clean(
      existingProposal?.implementationPlan ||
        context.proposalDefaults?.implementationPlan ||
        'Fase 1: diagnóstico e mapeamento dos processos. Fase 2: desenho da solução. Fase 3: implementação inicial. Fase 4: validação, ajustes e acompanhamento.',
    ),
    nextSteps: clean(
      existingProposal?.nextSteps ||
        context.proposalDefaults?.nextSteps ||
        'Validar prioridades com a equipa, confirmar o processo inicial a automatizar e preparar a versão final da proposta para envio ao cliente.',
    ),
  };
}
function getProposalDataSourceLabel(source: ProposalFormDefaults['proposalDataSource']): string {
  if (source === 'audit') {
    return 'Dados pr\u00e9-preenchidos com base na Auditoria Inteligente associada a esta lead.';
  }

  if (source === 'saved') {
    return 'Dados carregados a partir do rascunho de proposta j\u00e1 guardado.';
  }

  return 'Dados pr\u00e9-preenchidos com base na informa\u00e7\u00e3o dispon\u00edvel da lead.';
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

function EmailPreview({ context, to }: { context: LeadActionEmailContext; to: string }) {
 return (
 <section className="admin-email-preview" aria-label="Pré-visualização do email final">
 <div className="admin-email-preview-toolbar">
 <div>
 <strong>Pré-visualização do email final com branding Norm8</strong>
 <span>Renderizado com o mesmo template usado no envio real.</span>
 </div>
 <span className="admin-email-preview-recipient">Para: {to || 'Sem destinatário'}</span>
 </div>
 <div className="admin-email-preview-scroll">
 <div className="admin-email-preview-canvas">
 <LeadActionEmail context={context} />
 </div>
 </div>
 </section>
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
 pending: pendingOverride,
 pendingLabel,
}: {
 children: React.ReactNode;
 danger?: boolean;
 disabled?: boolean;
 pending?: boolean;
 pendingLabel: string;
}) {
 const { pending: formPending } = useFormStatus();
 const pending = pendingOverride ?? formPending;

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
 const greeting = context.leadName ? `Olá, ${context.leadName}.` : 'Olá.';
 const hasCompany = Boolean(context.leadCompany?.trim());
 const companyReference = hasCompany ? context.leadCompany.trim() : 'a empresa';

 if (action.type === 'FOLLOW_UP') {
 return {
 subject: hasCompany
 ? `Follow-up  -  Norm8 e ${context.leadCompany}`
 : 'Follow-up  -  Norm8',
 body: `${greeting}\n\nEspero que esteja tudo bem.\n\nFicámos de dar seguimento ao contacto com a Norm8 e queria perceber se ainda faz sentido alinharmos contexto, prioridades e próximos passos.\n\nA ideia será compreender melhor o contexto da ${companyReference} e perceber onde existem processos manuais, atrasos, tarefas repetitivas ou perda de informação que possam ser simplificados com automação e IA.\n\nSe fizer sentido, podemos avançar com uma breve reunião de diagnóstico ou definir o próximo passo mais adequado.\n\nObrigado,\nEquipa Norm8`,
 };
 }

 return {
 subject: hasCompany
 ? `Próximos passos com a Norm8  -  ${context.leadCompany}`
 : 'Próximos passos com a Norm8',
 body: `${greeting}\n\nEspero que esteja tudo bem.\n\nNa sequência do contacto com a Norm8, envio este email para alinharmos próximos passos e percebermos de que forma podemos ajudar a simplificar processos, reduzir trabalho manual e tornar as operações mais claras e escaláveis.\n\nSe fizer sentido, podemos avançar com uma breve reunião de diagnóstico para compreender melhor o contexto da ${companyReference} e identificar oportunidades concretas de automação.\n\nObrigado,\nEquipa Norm8`,
 };
}
function isValidEmailAddress(value: string): boolean {
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
