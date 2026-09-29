'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Unlink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createOperationsTaskAction, deleteOperationsTaskAction, linkSystemToTaskAction, moveOperationsTaskAction, setTaskStakeholderAction, unlinkSystemFromTaskAction, updateOperationsTaskAction, type ProcessActionState, type StakeholderActionState, type SystemActionState } from '@/lib/operations-audits/actions';

const initialState: ProcessActionState = { success: false };
type ProcessStep = {
  id: string; sequence: number; name: string; description: string | null; actor: string | null;
  executionMode: 'MANUAL' | 'AUTOMATED' | 'HYBRID'; averageTimeMinutes: number | null;
  frequency: string | null; input: string | null; output: string | null;
  decisionRequired: boolean; exceptionFrequency: string | null;
  systems: Array<{ system: { id: string; name: string; category: string | null } }>;
  stakeholder: { id: string; name: string; role: string | null } | null;
};
type SystemOption = { id: string; name: string; category: string | null };
type StakeholderOption = { id: string; name: string; role: string | null };

export function ProcessSteps({ auditId, processId, trigger, outcome, tasks, availableSystems, availableStakeholders }: { auditId: string; processId: string; trigger: string | null; outcome: string | null; tasks: ProcessStep[]; availableSystems: SystemOption[]; availableStakeholders: StakeholderOption[] }) {
  return <div className="operations-steps">
    <Boundary kind="START" value={trigger} empty="Trigger não definido — complete-o no Overview." />
    <div aria-hidden="true" className="operations-step-connector">↓</div>
    <StepQuickCapture auditId={auditId} processId={processId} key={tasks.length} />
    {tasks.length === 0 ? <div className="operations-steps-empty"><strong>Ainda não existem steps.</strong><span>Adicione o primeiro step para descrever como o trabalho acontece.</span></div> : <ol className="operations-step-list">
      {tasks.map((task, index) => <li key={task.id}><StepRow auditId={auditId} availableStakeholders={availableStakeholders} availableSystems={availableSystems} first={index === 0} last={index === tasks.length - 1} processId={processId} task={task} />{index < tasks.length - 1 ? <div aria-hidden="true" className="operations-step-connector">↓</div> : null}</li>)}
    </ol>}
    <div aria-hidden="true" className="operations-step-connector">↓</div>
    <Boundary kind="END" value={outcome} empty="Outcome não definido — complete-o no Overview." />
  </div>;
}

function StepQuickCapture({ auditId, processId }: { auditId: string; processId: string }) {
  const [state, formAction, pending] = useActionState(createOperationsTaskAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.success) formRef.current?.reset(); inputRef.current?.focus(); }, [state]);
  return <form action={formAction} className="operations-step-quick-form" ref={formRef}>
    <input name="auditId" type="hidden" value={auditId} /><input name="processId" type="hidden" value={processId} />
    <label className="manual-intake-admin-field"><span>Adicionar step</span><input autoComplete="off" autoFocus className="admin-input" maxLength={160} name="name" placeholder="Escreva o step e prima Enter" ref={inputRef} required /></label>
    <button aria-label="Adicionar step" className="admin-button" disabled={pending} type="submit"><Plus size={14} />{pending ? 'A adicionar…' : 'Adicionar'}</button>
    {state.error ? <p className="project-form-error" role="alert">{state.error}</p> : null}
  </form>;
}

function StepRow({ auditId, processId, task, first, last, availableSystems, availableStakeholders }: { auditId: string; processId: string; task: ProcessStep; first: boolean; last: boolean; availableSystems: SystemOption[]; availableStakeholders: StakeholderOption[] }) {
  return <article className="operations-step-row">
    <span className="operations-step-number">{task.sequence}</span>
    <div className="operations-step-content"><strong>{task.name}</strong><span>{executionLabel(task.executionMode)}{task.actor ? ` · ${task.actor}` : ''}{task.averageTimeMinutes !== null ? ` · ${task.averageTimeMinutes} min` : ''}</span></div>
    <div className="operations-step-actions">
      <MoveForm auditId={auditId} direction="UP" disabled={first} processId={processId} taskId={task.id} />
      <MoveForm auditId={auditId} direction="DOWN" disabled={last} processId={processId} taskId={task.id} />
      <StepEditDialog auditId={auditId} availableStakeholders={availableStakeholders} availableSystems={availableSystems} processId={processId} task={task} />
      <form action={deleteOperationsTaskAction} onSubmit={(event) => { if (!window.confirm(`Apagar o step “${task.name}”?`)) event.preventDefault(); }}>
        <input name="auditId" type="hidden" value={auditId} /><input name="processId" type="hidden" value={processId} /><input name="taskId" type="hidden" value={task.id} />
        <button aria-label={`Apagar step ${task.sequence}`} className="project-icon-button operations-step-delete" title="Apagar step" type="submit"><Trash2 size={14} /></button>
      </form>
    </div>
  </article>;
}

function MoveForm({ auditId, processId, taskId, direction, disabled }: { auditId: string; processId: string; taskId: string; direction: 'UP' | 'DOWN'; disabled: boolean }) {
  return <form action={moveOperationsTaskAction}><input name="auditId" type="hidden" value={auditId} /><input name="processId" type="hidden" value={processId} /><input name="taskId" type="hidden" value={taskId} /><input name="direction" type="hidden" value={direction} /><button aria-label={direction === 'UP' ? 'Mover step para cima' : 'Mover step para baixo'} className="project-icon-button" disabled={disabled} title={direction === 'UP' ? 'Mover para cima' : 'Mover para baixo'} type="submit">{direction === 'UP' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</button></form>;
}

function StepEditDialog({ auditId, processId, task, availableSystems, availableStakeholders }: { auditId: string; processId: string; task: ProcessStep; availableSystems: SystemOption[]; availableStakeholders: StakeholderOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateOperationsTaskAction, initialState);
  useEffect(() => { if (state.success) setOpen(false); }, [state]);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button aria-label={`Editar step ${task.sequence}`} className="project-icon-button" title="Editar step" type="button"><Pencil size={14} /></button></DialogTrigger><DialogContent className="operations-process-dialog operations-step-dialog"><DialogHeader><DialogTitle>Step {task.sequence}</DialogTitle><DialogDescription>Enriqueça o step sem alterar a sequência do workflow.</DialogDescription></DialogHeader>
    <form action={formAction} className="operations-process-form">
      <input name="auditId" type="hidden" value={auditId} /><input name="processId" type="hidden" value={processId} /><input name="taskId" type="hidden" value={task.id} />
      <label className="manual-intake-admin-field"><span>Nome *</span><input className="admin-input" defaultValue={task.name} maxLength={160} name="name" required /></label>
      <div className="admin-grid-2"><label className="manual-intake-admin-field"><span>Actor</span><input className="admin-input" defaultValue={task.actor ?? ''} name="actor" placeholder="Ex.: Accountant" /></label><label className="manual-intake-admin-field"><span>Execution type</span><select className="admin-input" defaultValue={task.executionMode} name="executionMode"><option value="MANUAL">Manual</option><option value="AUTOMATED">Automated</option><option value="HYBRID">Hybrid</option></select></label></div>
      <label className="manual-intake-admin-field"><span>Description</span><textarea className="admin-textarea" defaultValue={task.description ?? ''} name="description" rows={3} /></label>
      <details className="operations-step-details"><summary>Operational details</summary><div className="operations-step-details-body">
        <div className="admin-grid-2"><label className="manual-intake-admin-field"><span>Average time (minutes)</span><input className="admin-input" defaultValue={task.averageTimeMinutes ?? ''} min={0} name="averageTimeMinutes" step={1} type="number" /></label><label className="manual-intake-admin-field"><span>Frequency</span><input className="admin-input" defaultValue={task.frequency ?? ''} name="frequency" placeholder="Ex.: 20 times/month" /></label></div>
        <div className="admin-grid-2"><label className="manual-intake-admin-field"><span>Input</span><input className="admin-input" defaultValue={task.input ?? ''} name="input" /></label><label className="manual-intake-admin-field"><span>Output</span><input className="admin-input" defaultValue={task.output ?? ''} name="output" /></label></div>
        <div className="admin-grid-2"><label className="manual-intake-admin-field"><span>Exception frequency</span><input className="admin-input" defaultValue={task.exceptionFrequency ?? ''} name="exceptionFrequency" placeholder="Ex.: Medium" /></label><label className="operations-step-checkbox"><input defaultChecked={task.decisionRequired} name="decisionRequired" type="checkbox" /><span>Decision required</span></label></div>
      </div></details>
      {state.error ? <p className="project-form-error" role="alert">{state.error}</p> : null}
      <div className="operations-process-form-actions"><button className="admin-button admin-button-muted" onClick={() => setOpen(false)} type="button">Cancelar</button><button className="admin-button" disabled={pending} type="submit">{pending ? 'A guardar…' : 'Guardar step'}</button></div>
    </form>
    <TaskSystemsEditor auditId={auditId} availableSystems={availableSystems} processId={processId} task={task} />
    <TaskStakeholderEditor auditId={auditId} availableStakeholders={availableStakeholders} processId={processId} task={task} />
  </DialogContent></Dialog>;
}

function TaskStakeholderEditor({auditId,processId,task,availableStakeholders}:{auditId:string;processId:string;task:ProcessStep;availableStakeholders:StakeholderOption[]}){const initial:StakeholderActionState={success:false};const[state,action,pending]=useActionState(setTaskStakeholderAction,initial);return <form action={action} className="operations-task-systems"><input name="auditId" type="hidden" value={auditId}/><input name="processId" type="hidden" value={processId}/><input name="taskId" type="hidden" value={task.id}/><label className="manual-intake-admin-field"><span>Specific stakeholder</span><select className="admin-input" defaultValue={task.stakeholder?.id??''} name="stakeholderId"><option value="">No specific stakeholder</option>{availableStakeholders.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><small>Actor textual preservado: {task.actor??'não definido'}</small><button className="admin-button admin-button-muted" disabled={pending}>Guardar stakeholder</button>{state.error?<p className="project-form-error">{state.error}</p>:null}</form>}

function TaskSystemsEditor({ auditId, processId, task, availableSystems }: { auditId: string; processId: string; task: ProcessStep; availableSystems: SystemOption[] }) {
  const initial: SystemActionState = { success: false };
  const [state, action, pending] = useActionState(linkSystemToTaskAction, initial);
  const linked = new Set(task.systems.map(({ system }) => system.id));
  const options = availableSystems.filter((system) => !linked.has(system.id));
  return <div className="operations-task-systems"><span className="admin-field-label">Systems</span>
    {task.systems.length ? <div className="operations-system-chips">{task.systems.map(({ system }) => <div className="operations-system-chip" key={system.id}><span>{system.name}</span><form action={unlinkSystemFromTaskAction}><input name="auditId" type="hidden" value={auditId} /><input name="processId" type="hidden" value={processId} /><input name="taskId" type="hidden" value={task.id} /><input name="systemId" type="hidden" value={system.id} /><button aria-label={`Desassociar ${system.name}`} className="project-icon-button" type="submit"><Unlink size={12} /></button></form></div>)}</div> : <small>Nenhum sistema associado a este step.</small>}
    <form action={action} className="operations-task-system-add"><input name="auditId" type="hidden" value={auditId} /><input name="processId" type="hidden" value={processId} /><input name="taskId" type="hidden" value={task.id} /><select className="admin-input" disabled={!options.length} name="systemId" required><option value="">Selecionar sistema…</option>{options.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}</select><button className="admin-button admin-button-muted" disabled={pending || !options.length} type="submit">Associar</button></form>
    {state.error ? <p className="project-form-error">{state.error}</p> : null}
  </div>;
}

function Boundary({ kind, value, empty }: { kind: 'START' | 'END'; value: string | null; empty: string }) {
  return <div className={`operations-step-boundary operations-step-boundary-${kind.toLowerCase()}`}><strong>{kind}</strong><span className={value ? '' : 'is-empty'}>{value ?? empty}</span></div>;
}
function executionLabel(value: ProcessStep['executionMode']): string { return value === 'AUTOMATED' ? 'Automated' : value === 'HYBRID' ? 'Hybrid' : 'Manual'; }
