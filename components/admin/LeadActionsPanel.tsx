/**
 * ------------------------------------------------------------------
 * File: components/admin/LeadActionsPanel.tsx
 * Description: Commercial next-actions panel for a lead detail page.
 * Responsibilities:
 * - Show the most urgent pending action.
 * - Let admins create, execute, complete, update, and remove lead actions.
 * - Keep validation errors visual and aligned with the admin dark UI.
 * ------------------------------------------------------------------
 */

import type { LeadAction, LeadActionStatus, LeadActionType } from '@/app/generated/prisma/client';
import {
  type LeadActionExecutionContext,
  LeadActionExecutionControl,
} from '@/components/admin/LeadActionExecutionControl';
import { LeadActionCreateForm } from '@/components/admin/LeadActionCreateForm';
import { LeadActionStatusBadge, LeadActionTypeBadge } from '@/components/admin/AdminBadge';
import { Norm8Select } from '@/components/ui/norm8-select';
import type { SuggestedLeadAction } from '@/lib/admin/lead-action-suggestions';
import {
  completeLeadAction,  deleteLeadAction,
  updateLeadActionStatus,
} from '@/lib/admin/actions';
import {
  formatDatePt,
  formatLeadActionStatus,} from '@/lib/admin/formatters';
import { AdminEmptyState, AdminPanel } from './AdminPrimitives';

type LeadActionsPanelProps = {
  actionError?: string;
  actions: LeadAction[];
  executionContext: LeadActionExecutionContext;
  executionError?: string;
  leadId: string;
  suggestedAction: SuggestedLeadAction;
};

const actionTypes: LeadActionType[] = [
  'CALL',
  'SEND_EMAIL',
  'SCHEDULE_MEETING',
  'REVIEW_AUDIT',
  'SEND_PROPOSAL',
  'FOLLOW_UP',
  'CLOSE_LOST',
  'OTHER',
];

const actionStatuses: LeadActionStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'OVERDUE',
  'COMPLETED',
];

const COPY = {
  panelTitle: 'Próximas ações',
  panelSubtitle: 'Follow-ups comerciais para avançar a oportunidade.',
  executionError:
    'Não foi possível executar a ação. Confirme os campos obrigatórios e tente novamente.',
  executionMeetingEmailError: 'Não foi possível agendar reunião: a lead não tem email associado.',
  executionMeetingSlotError: 'Este horário já está ocupado. Escolha outro horário.',
  executionMeetingCalendarError:
    'Não foi possível criar o evento no Google Calendar. A ação continua pendente.',
  executionMeetingEmailWarning:
    'Reunião criada, mas não foi possível enviar um ou mais emails de confirmação.',
  title: 'Título',
  titlePlaceholder: 'Ex.: Fazer follow-up da proposta',
  titleError: 'Indique o título da ação.',
  dueAt: 'Data/hora limite',
  dueAtError: 'Selecione a data e hora limite.',
  dueAtPastError: 'A data/hora limite não pode estar no passado.',
  description: 'Descrição / nota',
  descriptionPlaceholder: 'Contexto útil para a próxima interação...',
  create: 'Criar ação',
  pending: 'Pendentes',
  completedRecent: 'Concluídas recentemente',
  emptyPending: 'Sem ações pendentes.',
  emptyAny: 'Sem ações registadas.',
  featured: 'Próxima ação mais urgente',
  noDescription: 'Sem descrição adicional.',
  noDueAt: 'Sem data limite',
  completedAt: 'Concluída em',
  update: 'Atualizar',
  complete: 'Concluir',
  remove: 'Remover',
};

/**
 * Renders the lead commercial next-actions panel.
 *
 * @param props Lead id, lead actions and optional validation error.
 * @returns Admin panel for commercial actions.
 */
export function LeadActionsPanel({
  actionError,
  actions,
  executionContext,
  executionError,
  leadId,
  suggestedAction,
}: LeadActionsPanelProps) {
  const sortedActions = [...actions].sort(compareActionsByUrgency);
  const pendingActions = sortedActions.filter((action) => action.status !== 'COMPLETED');
  const completedActions = sortedActions
    .filter((action) => action.status === 'COMPLETED')
    .slice(0, 3);
  const nextAction = pendingActions[0];

  return (
    <AdminPanel title={COPY.panelTitle} subtitle={COPY.panelSubtitle}>
      <div className="admin-lead-actions">
        {executionError ? (
          <p className="admin-action-execution-error">{getActionExecutionErrorMessage(executionError)}</p>
        ) : null}

        {nextAction ? (
          <FeaturedAction
            action={nextAction}
            executionContext={executionContext}
            leadId={leadId}
          />
        ) : null}

        <LeadActionCreateForm
          actionError={actionError}
          actionTypes={actionTypes}
          copy={{
            create: COPY.create,
            description: COPY.description,
            descriptionPlaceholder: COPY.descriptionPlaceholder,
            dueAt: COPY.dueAt,
            dueAtError: COPY.dueAtError,
            dueAtPastError: COPY.dueAtPastError,
            title: COPY.title,
            titleError: COPY.titleError,
            titlePlaceholder: COPY.titlePlaceholder,
          }}
          leadId={leadId}
          suggestedAction={suggestedAction}
        />

        <ActionList
          actions={pendingActions}
          emptyMessage={COPY.emptyPending}
          executionContext={executionContext}
          leadId={leadId}
          title={COPY.pending}
        />

        {completedActions.length > 0 ? (
          <ActionList
            actions={completedActions}
            executionContext={executionContext}
            leadId={leadId}
            title={COPY.completedRecent}
            variant="completed"
          />
        ) : null}
      </div>
    </AdminPanel>
  );
}

function FeaturedAction({
  action,
  executionContext,
  leadId,
}: {
  action: LeadAction;
  executionContext: LeadActionExecutionContext;
  leadId: string;
}) {
  return (
    <article className="admin-next-action">
      <div>
        <p className="admin-next-action-eyebrow">{COPY.featured}</p>
        <h3>{action.title}</h3>
        <p>{action.description || COPY.noDescription}</p>
      </div>
      <div className="admin-action-card-meta">
        <LeadActionStatusBadge status={getEffectiveActionStatus(action)} />
        {action.dueAt ? <span>{formatDatePt(action.dueAt)}</span> : <span>{COPY.noDueAt}</span>}
      </div>
      <div className="admin-next-action-controls">
        <LeadActionExecutionControl
          action={action}
          context={executionContext}
          emphasis="primary"
        />
        <CompleteActionButton actionId={action.id} leadId={leadId} />
      </div>
    </article>
  );
}

function ActionList({
  actions,
  emptyMessage,
  executionContext,
  leadId,
  title,
  variant,
}: {
  actions: LeadAction[];
  emptyMessage?: string;
  executionContext: LeadActionExecutionContext;
  leadId: string;
  title: string;
  variant?: 'completed';
}) {
  return (
    <section className="admin-action-list-section">
      <h3>{title}</h3>
      {actions.length > 0 ? (
        <div className="admin-action-list">
          {actions.map((action) => (
            <article className="admin-action-card" key={action.id}>
              <div className="admin-action-card-main">
                <div className="admin-action-card-title">
                  <strong>{action.title}</strong>
                  <LeadActionTypeBadge type={action.type} />
                </div>
                {action.description ? <p>{action.description}</p> : null}
                <div className="admin-action-card-meta">
                  <LeadActionStatusBadge status={getEffectiveActionStatus(action)} />
                  <span>{action.dueAt ? formatDatePt(action.dueAt) : COPY.noDueAt}</span>
                  {action.completedAt ? (
                    <span>
                      {COPY.completedAt} {formatDatePt(action.completedAt)}
                    </span>
                  ) : null}
                </div>
              </div>

              {variant === 'completed' ? (
                <DeleteActionButton actionId={action.id} leadId={leadId} />
              ) : (
                <div className="admin-action-card-controls">
                  <LeadActionExecutionControl action={action} context={executionContext} />
                  <form action={updateLeadActionStatus} className="admin-action-status-form">
                    <input name="leadId" type="hidden" value={leadId} />
                    <input name="actionId" type="hidden" value={action.id} />
                    <Norm8Select
                      defaultValue={getEffectiveActionStatus(action)}
                      name="status"
                      options={actionStatuses.map((status) => ({
                        value: status,
                        label: formatLeadActionStatus(status),
                      }))}
                    />
                    <button className="admin-button admin-button-muted" type="submit">
                      {COPY.update}
                    </button>
                  </form>
                  <CompleteActionButton actionId={action.id} leadId={leadId} />
                  <DeleteActionButton actionId={action.id} leadId={leadId} />
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <AdminEmptyState>{emptyMessage ?? COPY.emptyAny}</AdminEmptyState>
      )}
    </section>
  );
}

function CompleteActionButton({
  actionId,
  leadId,
}: {
  actionId: string;
  leadId: string;
}) {
  return (
    <form action={completeLeadAction}>
      <input name="leadId" type="hidden" value={leadId} />
      <input name="actionId" type="hidden" value={actionId} />
      <button className="admin-button" type="submit">
        {COPY.complete}
      </button>
    </form>
  );
}

function DeleteActionButton({
  actionId,
  leadId,
}: {
  actionId: string;
  leadId: string;
}) {
  return (
    <form action={deleteLeadAction}>
      <input name="leadId" type="hidden" value={leadId} />
      <input name="actionId" type="hidden" value={actionId} />
      <button className="admin-button admin-button-muted" type="submit">
        {COPY.remove}
      </button>
    </form>
  );
}

function getEffectiveActionStatus(action: LeadAction): LeadActionStatus {
  if (action.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (action.status === 'OVERDUE' || (action.dueAt && action.dueAt < new Date())) {
    return 'OVERDUE';
  }

  return action.status;
}

function getActionExecutionErrorMessage(error?: string): string {
  if (error === 'meetingEmail') {
    return COPY.executionMeetingEmailError;
  }

  if (error === 'meetingSlot') {
    return COPY.executionMeetingSlotError;
  }

  if (error === 'meetingCalendar') {
    return COPY.executionMeetingCalendarError;
  }

  if (error === 'meetingEmailWarning') {
    return COPY.executionMeetingEmailWarning;
  }

  return COPY.executionError;
}

function compareActionsByUrgency(first: LeadAction, second: LeadAction): number {
  if (first.status === 'COMPLETED' && second.status !== 'COMPLETED') {
    return 1;
  }

  if (first.status !== 'COMPLETED' && second.status === 'COMPLETED') {
    return -1;
  }

  const firstDue = first.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const secondDue = second.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;

  if (firstDue !== secondDue) {
    return firstDue - secondDue;
  }

  return second.createdAt.getTime() - first.createdAt.getTime();
}
