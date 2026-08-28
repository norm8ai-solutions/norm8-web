'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { ProjectFormOptions, ProjectFormProject } from '@/lib/admin/project-presenters';
import {
  createProjectAction,
  createProjectMilestoneAction,
  createProjectTaskAction,
  createProjectTimeEntryAction,
  type ProjectActionState,
} from '@/lib/admin/project-actions';
import {
  formatProjectGrowthPhase,
  formatProjectMilestoneStatus,
  formatProjectStatus,
  formatProjectTaskStatus,
  formatProjectWorkCategory,
  projectGrowthPhases,
  projectMilestoneStatuses,
  projectStatuses,
  projectTaskStatuses,
  projectWorkCategories,
} from '@/lib/admin/project-presenters';
import { Norm8DateTimePicker } from '@/components/ui/norm8-date-time-picker';
import { Norm8Select, type Norm8SelectOption } from '@/components/ui/norm8-select';

const initialState: ProjectActionState = { success: false };

export function ProjectCreateForm({ options }: { options: ProjectFormOptions }) {
  const [state, formAction, pending] = useActionState(createProjectAction, initialState);

  return (
    <form action={formAction} className="project-form" noValidate>
      <div className="admin-grid-2">
        <Field label="Nome do projeto" name="name" placeholder={'Aureus - Digital Platform'} required />
        <Field label="Cliente" name="clientName" placeholder="Aureus" required />
        <SelectField label="Lead opcional" name="leadId" options={[emptyOption('Sem lead associada'), ...options.leads.map((lead) => ({ label: lead.label, value: lead.id }))]} />
        <SelectField label="Proposal opcional" name="proposalId" options={[emptyOption('Sem proposta associada'), ...options.proposals.map((proposal) => ({ label: proposal.label, value: proposal.id }))]} />
        <SelectField label="Contract opcional" name="contractId" options={[emptyOption('Sem contrato associado'), ...options.contracts.map((contract) => ({ label: contract.label, value: contract.id }))]} />
        <Field label="Plano" name="planName" placeholder="Business" />
        <Field label={'Condição comercial'} name="commercialCondition" placeholder="Founder" />
        <Field inputMode="decimal" label="Valor contratado" name="contractedValue" placeholder="300,00" required />
        <SelectField defaultValue="LAUNCH" label="Fase" name="growthPhase" options={projectGrowthPhases.map((phase) => ({ label: formatProjectGrowthPhase(phase), value: phase }))} />
        <SelectField defaultValue="IN_PROGRESS" label="Estado" name="status" options={projectStatuses.map((status) => ({ label: formatProjectStatus(status), value: status }))} />
        <Field label={'Data de início'} name="startDate" type="date" />
        <Field label={'Data prevista de conclusão'} name="targetEndDate" type="date" />
      </div>
      <label className="manual-intake-admin-field">
        <span>{'Descrição'}</span>
        <textarea className="admin-textarea" name="description" placeholder="Contexto operacional e financeiro do projeto." />
      </label>
      <ActionFeedback state={state} />
      <button className="admin-button" disabled={pending} type="submit">{pending ? 'A criar...' : 'Criar projeto'}</button>
    </form>
  );
}

export function ProjectMilestoneForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(createProjectMilestoneAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [datePickerKey, setDatePickerKey] = useState(0);

  useEffect(() => {
    if (!state.success) return;

    formRef.current?.reset();
    setDatePickerKey((currentKey) => currentKey + 1);
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="project-milestone-create-form" noValidate>
      <input name="projectId" type="hidden" value={projectId} />
      <div className="project-milestone-create-row">
        <Field label="Título" name="title" placeholder="Nova milestone" required />
        <label className="manual-intake-admin-field">
          <span>Data prevista</span>
          <Norm8DateTimePicker key={datePickerKey} mode="date" name="dueDate" placeholder="Selecionar data" submitFormat="date" />
        </label>
        <button className="admin-button" disabled={pending} type="submit">{pending ? 'A adicionar...' : 'Adicionar milestone'}</button>
      </div>
      <label className="manual-intake-admin-field project-form-span">
        <span>Descrição opcional</span>
        <textarea className="admin-textarea" name="description" placeholder="Contexto, entrega ou critério de conclusão." />
      </label>
      <ActionFeedback state={state} />
    </form>
  );
}

export function ProjectTaskForm({ milestones, projectId }: { milestones: ProjectFormProject['milestones']; projectId: string }) {
  const [state, formAction, pending] = useActionState(createProjectTaskAction, initialState);

  return (
    <form action={formAction} className="project-compact-form" noValidate>
      <input name="projectId" type="hidden" value={projectId} />
      <Field label={'Título'} name="title" placeholder="Nova tarefa" required />
      <SelectField label="Milestone" name="milestoneId" options={[emptyOption('Sem milestone'), ...milestones.map((milestone) => ({ label: milestone.title, value: milestone.id }))]} />
      <SelectField defaultValue="DEVELOPMENT" label="Categoria" name="category" options={projectWorkCategories.map((category) => ({ label: formatProjectWorkCategory(category), value: category }))} />
      <Field inputMode="decimal" label="Estimativa" name="estimatedHours" placeholder="Ex.: 2.5" />
      <label className="manual-intake-admin-field project-form-span">
        <span>{'Descrição opcional'}</span>
        <textarea className="admin-textarea" name="description" />
      </label>
      <ActionFeedback state={state} />
      <button className="admin-button admin-button-muted" disabled={pending} type="submit">{pending ? 'A adicionar...' : 'Adicionar tarefa'}</button>
    </form>
  );
}

export function ProjectTimeEntryForm({ project }: { project: ProjectFormProject }) {
  const [state, formAction, pending] = useActionState(createProjectTimeEntryAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [datePickerKey, setDatePickerKey] = useState(0);
  const taskOptions = project.tasks
    .filter((task) => task.status !== 'CANCELLED')
    .map((task) => ({ label: task.title, value: task.id }));

  useEffect(() => {
    if (!state.success) return;

    formRef.current?.reset();
    setDatePickerKey((currentKey) => currentKey + 1);
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="project-time-entry-form" noValidate>
      <input name="projectId" type="hidden" value={project.id} />
      <div className="project-time-entry-form-grid">
        <SelectField label="Tarefa" name="taskId" options={taskOptions.length > 0 ? taskOptions : [emptyOption('Crie uma tarefa primeiro')]} />
        <SelectField defaultValue="DEVELOPMENT" label="Categoria" name="category" options={projectWorkCategories.map((category) => ({ label: formatProjectWorkCategory(category), value: category }))} />
        <Field className="project-time-entry-duration-field" helper="Use 30m, 1h, 1h 30m ou 2.5h." label="Duração" name="durationHours" placeholder="Ex.: 1h 30m" required />
        <label className="manual-intake-admin-field project-time-entry-date-field">
          <span>Data</span>
          <Norm8DateTimePicker
            ariaRequired
            defaultValue={new Date()}
            error={state.error === 'A data é obrigatória e tem de ser válida.'}
            errorId="project-time-entry-date-error"
            key={datePickerKey}
            mode="date"
            name="entryDate"
            placeholder="Selecionar data"
            submitFormat="date"
          />
          {state.error !== 'A data é obrigatória e tem de ser válida.' ? <small aria-hidden="true" className="project-field-helper project-time-entry-date-helper">&nbsp;</small> : null}
          {state.error === 'A data é obrigatória e tem de ser válida.' ? <small className="admin-field-error" id="project-time-entry-date-error">{state.error}</small> : null}
        </label>
        <label className="manual-intake-admin-field project-form-span">
          <span>Descrição/nota</span>
          <textarea className="admin-textarea" name="description" placeholder="Ex.: reunião com cliente, QA ou ajustes finais." />
        </label>
      </div>
      <ActionFeedback state={state} />
      <div className="project-time-entry-form-actions">
        <button className="admin-button" disabled={pending || taskOptions.length === 0} type="submit">{pending ? 'A registar...' : 'Adicionar tempo manualmente'}</button>
      </div>
    </form>
  );
}

export function ProjectStatusSelect({ current, name, type }: { current: string; name: string; type: 'milestone' | 'task' }) {
  const options = type === 'milestone'
    ? projectMilestoneStatuses.map((status) => ({ label: formatProjectMilestoneStatus(status), value: status }))
    : projectTaskStatuses.map((status) => ({ label: formatProjectTaskStatus(status), value: status }));

  return <Norm8Select defaultValue={current} name={name} options={options} />;
}

function Field({ className, helper, inputMode, label, name, placeholder, required, type = 'text' }: { className?: string; helper?: string; inputMode?: 'decimal' | 'numeric'; label: string; name: string; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <label className={className ? `manual-intake-admin-field ${className}` : 'manual-intake-admin-field'}>
      <span>{label}</span>
      <input className="admin-input" inputMode={inputMode} name={name} placeholder={placeholder} required={required} type={type} />
      {helper ? <small className="project-field-helper">{helper}</small> : null}
    </label>
  );
}

function SelectField({ defaultValue = '', label, name, options }: { defaultValue?: string; label: string; name: string; options: Norm8SelectOption[] }) {
  return (
    <label className="manual-intake-admin-field">
      <span>{label}</span>
      <Norm8Select defaultValue={defaultValue} name={name} options={options} />
    </label>
  );
}

function ActionFeedback({ state }: { state: ProjectActionState }) {
  if (state.error) return <p className="project-form-error">{state.error}</p>;
  if (state.message) return <p className="project-form-success">{state.message}</p>;
  return null;
}

function emptyOption(label: string): Norm8SelectOption {
  return { label, value: '' };
}