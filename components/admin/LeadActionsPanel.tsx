/**
 * ------------------------------------------------------------------
 * File: components/admin/LeadActionsPanel.tsx
 * Description: Commercial next-actions panel for a lead detail page.
 * Responsibilities:
 * - Show the most urgent pending action.
 * - Let admins create, complete, update, and remove lead actions.
 * - Keep validation errors visual and aligned with the admin dark UI.
 * ------------------------------------------------------------------
 */

import type { LeadAction, LeadActionStatus, LeadActionType } from '@/app/generated/prisma/client';
import { Norm8Select } from '@/components/ui/norm8-select';
import {
  LeadActionStatusBadge,
  LeadActionTypeBadge,
} from '@/components/admin/AdminBadge';
import {
  completeLeadAction,
  createLeadAction,
  deleteLeadAction,
  updateLeadActionStatus,
} from '@/lib/admin/actions';
import {
  formatDatePt,
  formatLeadActionStatus,
  formatLeadActionType,
} from '@/lib/admin/formatters';
import { AdminEmptyState, AdminPanel } from './AdminPrimitives';

type LeadActionsPanelProps = {
  actionError?: string;
  actions: LeadAction[];
  leadId: string;
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
  panelTitle: 'Pr\u00f3ximas a\u00e7\u00f5es',
  panelSubtitle: 'Follow-ups comerciais para avan\u00e7ar a oportunidade.',
  title: 'T\u00edtulo',
  titlePlaceholder: 'Ex.: Fazer follow-up da proposta',
  titleError: 'Indique o t\u00edtulo da a\u00e7\u00e3o.',
  dueAt: 'Data/hora limite',
  dueAtError: 'Indique uma data/hora v\u00e1lida.',
  description: 'Descri\u00e7\u00e3o / nota',
  descriptionPlaceholder: 'Contexto \u00fatil para a pr\u00f3xima intera\u00e7\u00e3o...',
  create: 'Criar a\u00e7\u00e3o',
  pending: 'Pendentes',
  completedRecent: 'Conclu\u00eddas recentemente',
  emptyPending: 'Sem a\u00e7\u00f5es pendentes.',
  emptyAny: 'Sem a\u00e7\u00f5es registadas.',
  featured: 'Pr\u00f3xima a\u00e7\u00e3o mais urgente',
  noDescription: 'Sem descri\u00e7\u00e3o adicional.',
  noDueAt: 'Sem data limite',
  completedAt: 'Conclu\u00edda em',
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
  leadId,
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
        {nextAction ? <FeaturedAction action={nextAction} leadId={leadId} /> : null}

        <form action={createLeadAction} className="admin-action-form" noValidate>
          <input name="leadId" type="hidden" value={leadId} />
          <div className="admin-action-form-grid">
            <label className="admin-form-control">
              <span>{COPY.title}</span>
              <input
                className="admin-input"
                name="title"
                placeholder={COPY.titlePlaceholder}
              />
              {actionError === 'title' ? (
                <small className="admin-field-error">{COPY.titleError}</small>
              ) : null}
            </label>

            <label className="admin-form-control">
              <span>Tipo</span>
              <Norm8Select
                defaultValue="FOLLOW_UP"
                name="type"
                options={actionTypes.map((type) => ({
                  value: type,
                  label: formatLeadActionType(type),
                }))}
              />
            </label>

            <label className="admin-form-control">
              <span>{COPY.dueAt}</span>
              <input className="admin-input" name="dueAt" type="datetime-local" />
              {actionError === 'dueAt' ? (
                <small className="admin-field-error">{COPY.dueAtError}</small>
              ) : null}
            </label>
          </div>

          <label className="admin-form-control">
            <span>{COPY.description}</span>
            <textarea
              className="admin-textarea"
              name="description"
              placeholder={COPY.descriptionPlaceholder}
            />
          </label>

          <button className="admin-button" type="submit">
            {COPY.create}
          </button>
        </form>

        <ActionList
          actions={pendingActions}
          emptyMessage={COPY.emptyPending}
          leadId={leadId}
          title={COPY.pending}
        />

        {completedActions.length > 0 ? (
          <ActionList
            actions={completedActions}
            leadId={leadId}
            title={COPY.completedRecent}
            variant="completed"
          />
        ) : null}
      </div>
    </AdminPanel>
  );
}

function FeaturedAction({ action, leadId }: { action: LeadAction; leadId: string }) {
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
      <CompleteActionButton actionId={action.id} leadId={leadId} />
    </article>
  );
}

function ActionList({
  actions,
  emptyMessage,
  leadId,
  title,
  variant,
}: {
  actions: LeadAction[];
  emptyMessage?: string;
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