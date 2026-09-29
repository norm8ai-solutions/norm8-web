'use client';

import { useActionState } from 'react';
import { updateOperationsProcessOverviewAction, type ProcessActionState } from '@/lib/operations-audits/actions';

const initialState: ProcessActionState = { success: false };
type ProcessOverview = { id: string; name: string; department: string | null; description: string | null; trigger: string | null; endState: string | null; notes: string | null };

export function ProcessOverviewForm({ auditId, process }: { auditId: string; process: ProcessOverview }) {
  const [state, formAction, pending] = useActionState(updateOperationsProcessOverviewAction, initialState);
  return <form action={formAction} className="operations-process-overview-form">
    <input name="auditId" type="hidden" value={auditId} /><input name="processId" type="hidden" value={process.id} />
    <div className="admin-grid-2">
      <label className="manual-intake-admin-field"><span>Nome *</span><input className="admin-input" defaultValue={process.name} maxLength={160} name="name" required /></label>
      <label className="manual-intake-admin-field"><span>Departamento</span><input className="admin-input" defaultValue={process.department ?? ''} name="department" /></label>
    </div>
    <div className="operations-process-boundaries">
      <label className="manual-intake-admin-field"><span>Trigger · START</span><input className="admin-input" defaultValue={process.trigger ?? ''} name="trigger" placeholder="O que causa o início deste processo?" /><small>O evento ou condição que inicia o workflow.</small></label>
      <span aria-hidden="true" className="operations-process-arrow">→</span>
      <label className="manual-intake-admin-field"><span>Outcome · END</span><input className="admin-input" defaultValue={process.endState ?? ''} name="endState" placeholder="Que resultado confirma a conclusão?" /><small>O estado ou resultado de negócio que marca o fim.</small></label>
    </div>
    <label className="manual-intake-admin-field"><span>Descrição</span><textarea className="admin-textarea" defaultValue={process.description ?? ''} name="description" rows={4} /></label>
    <label className="manual-intake-admin-field"><span>Notas / pain observado</span><textarea className="admin-textarea" defaultValue={process.notes ?? ''} name="notes" rows={4} /></label>
    {state.error ? <p className="project-form-error" role="alert">{state.error}</p> : null}{state.message ? <p className="project-form-success" role="status">{state.message}</p> : null}
    <div className="operations-process-form-actions"><button className="admin-button" disabled={pending} type="submit">{pending ? 'A guardar…' : 'Guardar overview'}</button></div>
  </form>;
}
