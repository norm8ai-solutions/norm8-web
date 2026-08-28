'use client';

import { useActionState, useCallback, useEffect, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarPlus, Circle, Clock3, Pause, Pencil, Play, RotateCcw, Save, Square, TimerReset, Trash2, X } from 'lucide-react';
import type { ProjectGrowthPhase, ProjectMilestoneStatus, ProjectStatus, ProjectTaskStatus, ProjectTimerStatus, ProjectWorkCategory } from '@/app/generated/prisma/client';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminEmptyState, AdminField, AdminPanel, AdminRow } from '@/components/admin/AdminPrimitives';
import { ProjectMilestoneForm, ProjectStatusSelect, ProjectTimeEntryForm } from '@/components/admin/projects/ProjectForms';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Norm8DateTimePicker } from '@/components/ui/norm8-date-time-picker';
import { Norm8Select } from '@/components/ui/norm8-select';
import {
  createProjectTimeEntryAction,
  deleteProjectTimeEntryAction,
  createProjectTaskAction,
  moveProjectTaskStatusAction,
  pauseProjectTaskTimerAction,
  resetProjectTaskTimerAction,
  resumeProjectTaskTimerAction,
  startProjectTaskTimerAction,
  stopProjectTaskTimerAction,
  updateProjectMilestoneAction,
  updateProjectTaskDescriptionAction,
  updateProjectTaskEstimateAction,
  updateProjectTaskTitleAction,
  type ProjectActionState,
} from '@/lib/admin/project-actions';
import {
  formatEffectiveHourlyRate,
  formatHoursFromMinutes,
  formatProjectGrowthPhase,
  formatProjectMilestoneStatus,
  formatProjectStatus,
  formatProjectTaskStatus,
  formatProjectWorkCategory,
  projectWorkCategories,
} from '@/lib/admin/project-presenters';
import { formatMinutesAsEstimate, isValidDurationEstimate, parseDurationToMinutes } from '@/lib/admin/project-time-formatters';
import { formatCurrencyCents, formatDateOnly, formatPercentage } from '@/lib/finance/formatters';

type ProjectDetailWorkspaceProps = {
  metrics: ProjectWorkspaceMetrics;
  project: ProjectWorkspaceProject;
};

type ProjectWorkspaceMetrics = {
  completedMilestones: number;
  completedTasks: number;
  contractedValueCents: number;
  effectiveHourlyRateCents: number | null;
  projectProgressPercentage: number;
  totalMilestones: number;
  totalTasks: number;
  totalWorkedMinutes: number;
  workedMinutesByCategory: Record<ProjectWorkCategory, number>;
};

type ProjectWorkspaceProject = {
  clientName: string;
  commercialCondition: string | null;
  contractedValueCents: number;
  contract: { id: string; number: string; title: string } | null;
  currency: string;
  description: string | null;
  growthPhase: ProjectGrowthPhase;
  id: string;
  lead: { company: string; email: string | null; id: string; name: string | null } | null;
  milestones: ProjectWorkspaceMilestone[];
  name: string;
  planName: string | null;
  proposal: { id: string; status: string; title: string } | null;
  startDate: Date | string | null;
  status: ProjectStatus;
  targetEndDate: Date | string | null;
  tasks: ProjectWorkspaceTask[];
  timeEntries: ProjectWorkspaceTimeEntry[];
  timerSessions: ProjectWorkspaceTimerSession[];
};

type ProjectWorkspaceMilestone = {
  description: string | null;
  dueDate: Date | string | null;
  id: string;
  order: number;
  status: ProjectMilestoneStatus;
  title: string;
};

type ProjectWorkspaceTask = {
  category: ProjectWorkCategory;
  description: string | null;
  estimatedMinutes: number | null;
  id: string;
  milestone: { id: string; title: string } | null;
  milestoneId: string | null;
  order: number;
  status: ProjectTaskStatus;
  timeEntries: Array<{ durationMinutes: number; id: string }>;
  title: string;
};

type ProjectWorkspaceTimeEntry = {
  category: ProjectWorkCategory;
  description: string | null;
  durationMinutes: number;
  entryDate: Date | string;
  id: string;
  task: { id: string; title: string } | null;
};

type ProjectWorkspaceTimerSession = {
  accumulatedSeconds: number;
  category: ProjectWorkCategory;
  description: string | null;
  id: string;
  pausedAt: Date | string | null;
  projectId: string;
  startedAt: Date | string;
  status: ProjectTimerStatus;
  task: { id: string; title: string };
  taskId: string;
};

type ProjectWorkspaceTab = 'overview' | 'tasks' | 'time' | 'profitability';

const tabs: Array<{ id: ProjectWorkspaceTab; label: string }> = [
  { id: 'overview', label: 'Resumo' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'time', label: 'Tempo' },
  { id: 'profitability', label: 'Rentabilidade' },
];

const kanbanColumns: Array<{ id: ProjectTaskStatus; label: string }> = [
  { id: 'TODO', label: 'Por fazer' },
  { id: 'IN_PROGRESS', label: 'Em progresso' },
  { id: 'IN_REVIEW', label: 'Em validação' },
  { id: 'BLOCKED', label: 'Bloqueado' },
  { id: 'DONE', label: 'Concluído' },
];

const initialState: ProjectActionState = { success: false };

export function ProjectDetailWorkspace({ metrics, project }: ProjectDetailWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ProjectWorkspaceTab>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [workspaceTasks, setWorkspaceTasks] = useState<ProjectWorkspaceTask[]>(project.tasks);
  const [workspaceTimerSessions, setWorkspaceTimerSessions] = useState<ProjectWorkspaceTimerSession[]>(project.timerSessions);
  const selectedTask = workspaceTasks.find((task) => task.id === selectedTaskId) ?? null;
  const activeTimer = workspaceTimerSessions.find((timer) => timer.status === 'RUNNING' || timer.status === 'PAUSED') ?? null;
  const closeTaskDrawer = useCallback(() => setSelectedTaskId(null), []);

  useEffect(() => {
    setWorkspaceTasks(project.tasks);
  }, [project.tasks]);

  useEffect(() => {
    setWorkspaceTimerSessions(project.timerSessions);
  }, [project.timerSessions]);

  return (
    <div className="project-detail-workspace">
      <div className="project-workspace-tabs" role="tablist" aria-label="Navegação do projeto">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className="project-workspace-tab"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? <OverviewTab metrics={metrics} project={project} /> : null}
      {activeTab === 'tasks' ? <TasksTab activeTimer={activeTimer} project={project} selectedTaskId={selectedTaskId} setSelectedTaskId={setSelectedTaskId} setTasks={setWorkspaceTasks} tasks={workspaceTasks} /> : null}
      {activeTab === 'time' ? <TimeTab metrics={metrics} project={project} /> : null}
      {activeTab === 'profitability' ? <ProfitabilityTab metrics={metrics} project={project} /> : null}
      {selectedTask ? <TaskDrawer activeTimer={activeTimer} onClose={closeTaskDrawer} project={project} setTasks={setWorkspaceTasks} setTimerSessions={setWorkspaceTimerSessions} task={selectedTask} /> : null}
    </div>
  );
}

function OverviewTab({ metrics, project }: ProjectDetailWorkspaceProps) {
  return (
    <section className="admin-grid-main-aside project-workspace-layout">
      <div className="admin-page-grid">
        <AdminPanel title="Resumo do projeto" subtitle="Dados comerciais e operacionais base do V0.">
          <div className="admin-field-grid">
            <AdminField label="Cliente" value={project.clientName} />
            <AdminField label="Plano" value={project.planName ?? 'Sem plano'} />
            <AdminField label="Condição comercial" value={project.commercialCondition ?? 'Sem condição'} />
            <AdminField label="Estado" value={formatProjectStatus(project.status)} />
            <AdminField label="Fase" value={formatProjectGrowthPhase(project.growthPhase)} />
            <AdminField label="Início" value={formatDateOnly(project.startDate)} />
            <AdminField label="Data prevista" value={formatDateOnly(project.targetEndDate)} />
            <AdminField label="Lead" value={project.lead ? <Link className="admin-link" href={`/admin/leads/${project.lead.id}`}>{project.lead.company}</Link> : 'Sem lead associada'} />
            <AdminField label="Proposta" value={project.proposal ? <Link className="admin-link" href={`/admin/proposals/${project.proposal.id}`}>{project.proposal.title}</Link> : 'Sem proposta associada'} />
            <AdminField label="Contrato" value={project.contract ? <Link className="admin-link" href={`/admin/contracts/${project.contract.id}`}>{project.contract.number}</Link> : 'Sem contrato associado'} />
          </div>
          {project.description ? <p className="project-description">{project.description}</p> : null}
        </AdminPanel>

        <AdminPanel title="Milestones" subtitle={String(metrics.completedMilestones) + ' de ' + String(metrics.totalMilestones) + ' milestones concluídas.'}>
          <div className="project-milestones-section">
            <ProjectMilestoneForm projectId={project.id} />
            {project.milestones.length > 0 ? (
              <div className="project-milestone-list">
                {project.milestones.map((milestone) => {
                  const milestoneTasks = project.tasks.filter((task) => task.milestoneId === milestone.id);
                  const doneTasks = milestoneTasks.filter((task) => task.status === 'DONE').length;
                  const progress = milestoneTasks.length > 0 ? Math.round((doneTasks / milestoneTasks.length) * 100) : milestone.status === 'DONE' ? 100 : 0;

                  return (
                    <ProjectMilestoneCard
                      doneTasks={doneTasks}
                      key={milestone.id}
                      milestone={milestone}
                      progress={progress}
                      projectId={project.id}
                      totalTasks={milestoneTasks.length}
                    />
                  );
                })}
              </div>
            ) : <AdminEmptyState>Sem milestones criadas.</AdminEmptyState>}
          </div>
        </AdminPanel>
      </div>

      <aside className="admin-page-grid">
        <ProjectSnapshot metrics={metrics} project={project} />
      </aside>
    </section>
  );
}

function ProjectMilestoneCard({ doneTasks, milestone, progress, projectId, totalTasks }: { doneTasks: number; milestone: ProjectWorkspaceMilestone; progress: number; projectId: string; totalTasks: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateProjectMilestoneAction, initialState);

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state]);

  if (isEditing) {
    return (
      <article className="project-milestone-card is-editing">
        <form action={formAction} className="project-milestone-edit-form" noValidate>
          <input name="projectId" type="hidden" value={projectId} />
          <input name="milestoneId" type="hidden" value={milestone.id} />
          <div className="project-milestone-edit-grid">
            <label className="manual-intake-admin-field project-form-span">
              <span>Título</span>
              <input className="admin-input" defaultValue={milestone.title} name="title" placeholder="Título da milestone" required />
            </label>
            <label className="manual-intake-admin-field">
              <span>Data prevista</span>
              <Norm8DateTimePicker defaultValue={milestone.dueDate} mode="date" name="dueDate" placeholder="Selecionar data" submitFormat="date" />
            </label>
            <label className="manual-intake-admin-field">
              <span>Estado</span>
              <ProjectStatusSelect current={milestone.status} name="status" type="milestone" />
            </label>
            <label className="manual-intake-admin-field project-form-span">
              <span>Descrição opcional</span>
              <textarea className="admin-textarea" defaultValue={milestone.description ?? ''} name="description" placeholder="Contexto, entrega ou critério de conclusão." />
            </label>
          </div>
          <ActionFeedback state={state} />
          <div className="project-milestone-edit-actions">
            <button className="admin-button admin-button-muted" disabled={pending} onClick={() => setIsEditing(false)} type="button"><X size={14} />Cancelar</button>
            <button className="admin-button" disabled={pending} type="submit"><Save size={14} />{pending ? 'A guardar...' : 'Guardar'}</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="project-milestone-card">
      <div className="project-milestone-main">
        <span className="project-milestone-number">{milestone.order}</span>
        <div className="project-milestone-content">
          <div className="project-milestone-heading">
            <h3>{milestone.title}</h3>
            <AdminBadge tone={milestone.status === 'DONE' ? 'green' : milestone.status === 'IN_PROGRESS' ? 'blue' : 'slate'}>{formatProjectMilestoneStatus(milestone.status)}</AdminBadge>
          </div>
          <p className="project-milestone-meta">
            {doneTasks}/{totalTasks} tarefas concluídas
            {milestone.dueDate ? <> - {formatDateOnly(milestone.dueDate)}</> : null}
          </p>
          <p className="project-milestone-description">{milestone.description ?? 'Sem descrição.'}</p>
          <div className="project-progress-track" aria-label={String(progress) + '% de progresso'}><span style={{ width: String(progress) + '%' }} /></div>
        </div>
      </div>
      <div className="project-milestone-card-actions">
        <button className="admin-button admin-button-muted" onClick={() => setIsEditing(true)} type="button"><Pencil size={14} />Editar</button>
      </div>
    </article>
  );
}

function TasksTab({ activeTimer, project, selectedTaskId, setSelectedTaskId, setTasks, tasks }: { activeTimer: ProjectWorkspaceTimerSession | null; project: ProjectWorkspaceProject; selectedTaskId: string | null; setSelectedTaskId: (taskId: string) => void; setTasks: Dispatch<SetStateAction<ProjectWorkspaceTask[]>>; tasks: ProjectWorkspaceTask[] }) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<ProjectTaskStatus | null>(null);
  const [moveState, setMoveState] = useState<ProjectActionState>(initialState);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(() => new Set());
  const taskUpdateVersions = useRef<Record<string, number>>({});
  const draggedTask = draggedTaskId ? tasks.find((task) => task.id === draggedTaskId) ?? null : null;

  const clearDragFeedback = useCallback(() => {
    setDraggedTaskId(null);
    setDropTargetStatus(null);
  }, []);

  const moveTask = useCallback((taskId: string, status: ProjectTaskStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;

    const previousTasks = tasks;
    const updateVersion = (taskUpdateVersions.current[taskId] ?? 0) + 1;
    taskUpdateVersions.current[taskId] = updateVersion;

    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('taskId', taskId);
    formData.set('status', status);

    setMoveState(initialState);
    setPendingTaskIds((current) => new Set(current).add(taskId));
    setTasks((current) => moveTaskToStatus(current, taskId, status));

    void moveProjectTaskStatusAction(initialState, formData).then((result) => {
      if (taskUpdateVersions.current[taskId] !== updateVersion) return;

      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });

      if (result.success) {
        setMoveState(initialState);
        return;
      }

      setTasks(previousTasks);
      setMoveState(result);
    });
  }, [project.id, setTasks, tasks]);

  return (
    <section className="admin-page-grid">
      <AdminPanel title="Tarefas" subtitle="Crie dentro da coluna certa e mova cards para atualizar o estado.">
        {moveState.error ? <p className="project-form-error">{moveState.error}</p> : null}

        <div className={`project-kanban${pendingTaskIds.size > 0 ? ' is-moving' : ''}`} aria-label="Kanban de tarefas">
          {kanbanColumns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.id);
            const isDropTarget = dropTargetStatus === column.id;
            const isDragSource = draggedTask?.status === column.id;
            const draggedTaskStatusLabel = draggedTask ? formatProjectTaskStatus(draggedTask.status) : '';
            const showDropTransition = Boolean(draggedTask && isDropTarget && !isDragSource);
            const columnClasses = [
              'project-kanban-column',
              isDropTarget ? 'is-drop-target' : '',
              isDragSource ? 'is-drag-source' : '',
            ].filter(Boolean).join(' ');

            return (
              <section
                className={columnClasses}
                key={column.id}
                onDragLeave={(event) => {
                  const nextTarget = event.relatedTarget;
                  if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setDropTargetStatus(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setDropTargetStatus(column.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId;
                  clearDragFeedback();
                  if (taskId) moveTask(taskId, column.id);
                }}
              >
                <div className="project-kanban-column-header">
                  <span>{column.label}</span>
                  <strong>{columnTasks.length}</strong>
                </div>
                {showDropTransition ? (
                  <div className="project-kanban-transition-hint is-target" aria-live="polite">
                    <span>{draggedTaskStatusLabel}</span>
                    <ArrowRight aria-hidden="true" size={14} />
                    <span>{column.label}</span>
                  </div>
                ) : isDragSource ? <div className="project-kanban-transition-hint" aria-live="polite">Transitar para...</div> : null}
                <div className="project-kanban-list" aria-label={`Tarefas em ${column.label}`}>
                  {columnTasks.map((task) => (
                    <TaskCard
                      activeTimer={activeTimer}
                      isDraggingSource={draggedTaskId === task.id}
                      isSaving={pendingTaskIds.has(task.id)}
                      isSelected={selectedTaskId === task.id}
                      key={task.id}
                      onDragEnd={clearDragFeedback}
                      onDragStart={(event) => {
                        setMoveState(initialState);
                        setDraggedTaskId(task.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', task.id);
                      }}
                      onOpen={() => setSelectedTaskId(task.id)}
                      task={task}
                    />
                  ))}
                  <ProjectKanbanCreateForm milestones={project.milestones} projectId={project.id} status={column.id} statusLabel={column.label} />
                </div>
              </section>
            );
          })}
        </div>
      </AdminPanel>
    </section>
  );
}

function ProjectKanbanCreateForm({ milestones, projectId, status, statusLabel }: { milestones: ProjectWorkspaceMilestone[]; projectId: string; status: ProjectTaskStatus; statusLabel: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createProjectTaskAction, initialState);

  useEffect(() => {
    if (state.success) setIsOpen(false);
  }, [state.success]);

  if (!isOpen) {
    return <button className="project-kanban-create-button" onClick={() => setIsOpen(true)} type="button">+ Criar</button>;
  }

  return (
    <form action={formAction} className="project-kanban-create-form" noValidate>
      <input name="projectId" type="hidden" value={projectId} />
      <input name="status" type="hidden" value={status} />
      <input name="category" type="hidden" value="DEVELOPMENT" />
      <label className="manual-intake-admin-field">
        <span>Nova tarefa em {statusLabel}</span>
        <input
          autoFocus
          className="admin-input"
          name="title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setIsOpen(false);
            }
          }}
          placeholder="Título da tarefa"
          required
        />
      </label>
      <label className="manual-intake-admin-field">
        <span>Milestone</span>
        <Norm8Select
          defaultValue=""
          name="milestoneId"
          options={[{ label: 'Sem milestone', value: '' }, ...milestones.map((milestone) => ({ label: milestone.title, value: milestone.id }))]}
        />
      </label>
      <div className="project-kanban-create-actions">
        <button className="admin-button" disabled={pending} type="submit">{pending ? 'A criar...' : 'Criar'}</button>
        <button className="admin-button admin-button-muted" disabled={pending} onClick={() => setIsOpen(false)} type="button">Cancelar</button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
function TimeTab({ metrics, project }: ProjectDetailWorkspaceProps) {
  return (
    <section className="admin-grid-main-aside project-workspace-layout">
      <div className="admin-page-grid">
        <AdminPanel title="Time tracking" subtitle="Timer persistente por tarefa e registo manual quando for preciso.">
          <div className="project-time-section">
            {project.timerSessions.length > 0 ? (
              <div className="project-active-timer-strip">
                {project.timerSessions.map((timer) => <ActiveTimerInline key={timer.id} projectId={project.id} timer={timer} />)}
              </div>
            ) : null}

            <ProjectTimeEntryForm project={project} />

            <div className="project-time-history">
              <div className="project-time-history-heading">
                <h3>Registos recentes</h3>
                <span>{project.timeEntries.length} {project.timeEntries.length === 1 ? 'registo' : 'registos'}</span>
              </div>
              {project.timeEntries.length > 0 ? (
                <div className="admin-row-list">
                  {project.timeEntries.map((entry) => (
                    <AdminRow key={entry.id} title={formatHoursFromMinutes(entry.durationMinutes) + ' - ' + (entry.task?.title ?? 'Tarefa removida')} meta={formatProjectWorkCategory(entry.category) + ' - ' + formatDateOnly(entry.entryDate)}>
                      <div className="project-time-entry-row">
                        <span>{entry.description ?? 'Sem nota.'}</span>
                        <form action={deleteProjectTimeEntryAction}>
                          <input name="projectId" type="hidden" value={project.id} />
                          <input name="timeEntryId" type="hidden" value={entry.id} />
                          <button className="admin-link finance-table-link" type="submit"><Trash2 size={13} />Remover</button>
                        </form>
                      </div>
                    </AdminRow>
                  ))}
                </div>
              ) : <AdminEmptyState>Ainda não existem registos de tempo. Registe tempo manualmente ou use o timer numa tarefa.</AdminEmptyState>}
            </div>
          </div>
        </AdminPanel>
      </div>
      <aside className="admin-page-grid">
        <CategoryHours metrics={metrics} />
      </aside>
    </section>
  );
}

function ProfitabilityTab({ metrics, project }: ProjectDetailWorkspaceProps) {
  return (
    <section className="admin-grid-main-aside project-workspace-layout">
      <div className="admin-page-grid">
        <AdminPanel title="Rentabilidade">
          <div className="admin-row-list">
            <AdminRow title="Valor contratado" meta={formatCurrencyCents(project.contractedValueCents, project.currency)} />
            <AdminRow title="Horas trabalhadas" meta={formatHoursFromMinutes(metrics.totalWorkedMinutes)} />
            <AdminRow title="Receita efetiva por hora" meta={formatEffectiveHourlyRate(metrics.effectiveHourlyRateCents, project.currency)} />
          </div>
          <p className="project-description">Esta métrica ajuda a perceber quanto custa realmente entregar este tipo de projeto e a ajustar o pricing dos próximos clientes.</p>
        </AdminPanel>
      </div>
      <aside className="admin-page-grid">
        <ProjectSnapshot metrics={metrics} project={project} />
        <CategoryHours metrics={metrics} />
      </aside>
    </section>
  );
}


type ProjectTaskDraft = {
  category: ProjectWorkCategory;
  description: string;
  estimatedHours: string;
  milestoneId: string;
  status: ProjectTaskStatus;
  title: string;
};

type TaskFieldSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function TaskDrawer({ activeTimer, onClose, project, setTasks, setTimerSessions, task }: { activeTimer: ProjectWorkspaceTimerSession | null; onClose: () => void; project: ProjectWorkspaceProject; setTasks: Dispatch<SetStateAction<ProjectWorkspaceTask[]>>; setTimerSessions: Dispatch<SetStateAction<ProjectWorkspaceTimerSession[]>>; task: ProjectWorkspaceTask }) {
  const [draft, setDraft] = useState<ProjectTaskDraft>(() => createTaskDraft(task));
  const [titleSaveStatus, setTitleSaveStatus] = useState<TaskFieldSaveStatus>('idle');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionSaveStatus, setDescriptionSaveStatus] = useState<TaskFieldSaveStatus>('idle');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [estimateSaveStatus, setEstimateSaveStatus] = useState<TaskFieldSaveStatus>('idle');
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const taskTimer = activeTimer?.taskId === task.id ? activeTimer : null;
  const workedMinutes = task.timeEntries.reduce((sum, entry) => sum + Math.max(0, entry.durationMinutes), 0);
  const progress = getTaskProgress(task, workedMinutes);
  const selectedMilestone = project.milestones.find((milestone) => milestone.id === draft.milestoneId) ?? null;

  const saveTitle = useCallback(async () => {
    const title = draft.title.trim();
    if (!title) {
      setTitleSaveStatus('error');
      setTitleError('O título da tarefa é obrigatório.');
      return;
    }

    if (title === task.title) {
      setTitleSaveStatus('idle');
      setTitleError(null);
      setDraft((currentDraft) => ({ ...currentDraft, title }));
      return;
    }

    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('taskId', task.id);
    formData.set('title', title);

    setTitleSaveStatus('saving');
    setTitleError(null);

    const result = await updateProjectTaskTitleAction(initialState, formData);
    if (!result.success) {
      setTitleSaveStatus('error');
      setTitleError(result.error ?? 'Erro ao guardar');
      return;
    }

    setTasks((currentTasks) => currentTasks.map((currentTask) => (currentTask.id === task.id ? { ...currentTask, title } : currentTask)));
    setDraft((currentDraft) => ({ ...currentDraft, title }));
    setTitleSaveStatus('saved');
  }, [draft.title, project.id, setTasks, task.id, task.title]);

  const saveDescription = useCallback(async () => {
    const description = draft.description.trim();
    const currentDescription = task.description ?? '';
    if (description === currentDescription) {
      setDescriptionSaveStatus('idle');
      setDescriptionError(null);
      setDraft((currentDraft) => ({ ...currentDraft, description }));
      return;
    }

    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('taskId', task.id);
    formData.set('description', description);

    setDescriptionSaveStatus('saving');
    setDescriptionError(null);

    const result = await updateProjectTaskDescriptionAction(initialState, formData);
    if (!result.success) {
      setDescriptionSaveStatus('error');
      setDescriptionError(result.error ?? 'Erro ao guardar');
      return;
    }

    const savedDescription = description || null;
    setTasks((currentTasks) => currentTasks.map((currentTask) => (currentTask.id === task.id ? { ...currentTask, description: savedDescription } : currentTask)));
    setDraft((currentDraft) => ({ ...currentDraft, description }));
    setDescriptionSaveStatus('saved');
  }, [draft.description, project.id, setTasks, task.description, task.id]);
  const saveEstimate = useCallback(async () => {
    if (!isValidDurationEstimate(draft.estimatedHours)) {
      setEstimateSaveStatus('error');
      setEstimateError('Use um formato como 2h, 30m ou 1h 30m.');
      return;
    }

    const estimatedMinutes = parseDurationToMinutes(draft.estimatedHours);
    if (estimatedMinutes === (task.estimatedMinutes ?? null)) {
      setEstimateSaveStatus('idle');
      setEstimateError(null);
      setDraft((currentDraft) => ({ ...currentDraft, estimatedHours: formatMinutesAsEstimate(estimatedMinutes) }));
      return;
    }

    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('taskId', task.id);
    formData.set('estimate', draft.estimatedHours);

    setEstimateSaveStatus('saving');
    setEstimateError(null);

    const result = await updateProjectTaskEstimateAction(initialState, formData);
    if (!result.success) {
      setEstimateSaveStatus('error');
      setEstimateError(result.error ?? 'Não foi possível guardar a estimativa.');
      return;
    }

    setTasks((currentTasks) => currentTasks.map((currentTask) => (currentTask.id === task.id ? { ...currentTask, estimatedMinutes } : currentTask)));
    setDraft((currentDraft) => ({ ...currentDraft, estimatedHours: formatMinutesAsEstimate(estimatedMinutes) }));
    setEstimateSaveStatus('saved');
  }, [draft.estimatedHours, project.id, setTasks, task.estimatedMinutes, task.id]);
  const requestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    setDraft(createTaskDraft(task));
    setTitleSaveStatus('idle');
    setTitleError(null);
    setDescriptionSaveStatus('idle');
    setDescriptionError(null);
    setEstimateSaveStatus('idle');
    setEstimateError(null);
  }, [task.id]);

  useEffect(() => {
    const savedFields = [titleSaveStatus, descriptionSaveStatus, estimateSaveStatus];
    if (!savedFields.includes('saved')) return;

    const timeout = window.setTimeout(() => {
      if (titleSaveStatus === 'saved') setTitleSaveStatus('idle');
      if (descriptionSaveStatus === 'saved') setDescriptionSaveStatus('idle');
      if (estimateSaveStatus === 'saved') setEstimateSaveStatus('idle');
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [descriptionSaveStatus, estimateSaveStatus, titleSaveStatus]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  return (
    <>
      <button aria-label="Fechar detalhe da tarefa" className="project-task-drawer-backdrop" onClick={requestClose} type="button" />
      <aside aria-label="Detalhe da tarefa" aria-modal="true" className="project-task-drawer" role="dialog">
        <div className="project-task-drawer-header">
          <div>
            <span>{project.name} / {selectedMilestone?.title ?? 'Sem milestone'} / Tarefa</span>
            <h2>Detalhe da tarefa</h2>
          </div>
          <button aria-label="Fechar detalhe da tarefa" className="project-icon-button" onClick={requestClose} type="button"><X size={16} /></button>
        </div>

        <div className="project-task-detail-form">

          <div className="project-task-detail-grid">
            <div className="project-task-detail-main">
              <label className="project-task-title-field">
                <span>Título</span>
                <input
                  className="project-task-title-input"
                  name="title"
                  onBlur={saveTitle}
                  onChange={(event) => {
                    setDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }));
                    setTitleSaveStatus('idle');
                    setTitleError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      event.stopPropagation();
                      setDraft((currentDraft) => ({ ...currentDraft, title: task.title }));
                      setTitleSaveStatus('idle');
                      setTitleError(null);
                    }
                  }}
                  placeholder="Título da tarefa"
                  required
                  type="text"
                  value={draft.title}
                />
                <TaskFieldFeedback error={titleError} status={titleSaveStatus} />
              </label>

              <label className="manual-intake-admin-field">
                <span>Descrição</span>
                <textarea
                  className="admin-textarea project-task-description-input"
                  name="description"
                  onBlur={saveDescription}
                  onChange={(event) => {
                    setDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }));
                    setDescriptionSaveStatus('idle');
                    setDescriptionError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      event.stopPropagation();
                      setDraft((currentDraft) => ({ ...currentDraft, description: task.description ?? '' }));
                      setDescriptionSaveStatus('idle');
                      setDescriptionError(null);
                    }
                  }}
                  placeholder="Adicione uma descrição para contextualizar esta tarefa."
                  value={draft.description}
                />
                <TaskFieldFeedback error={descriptionError} status={descriptionSaveStatus} />
              </label>
            </div>

            <div className="project-task-detail-side">
              <label className="manual-intake-admin-field">
                <span>Estado</span>
                <Norm8Select name="status" onValueChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, status: value as ProjectTaskStatus }))} options={kanbanColumns.map((status) => ({ label: status.label, value: status.id }))} value={draft.status} />
              </label>

              <label className="manual-intake-admin-field">
                <span>Milestone</span>
                <Norm8Select
                  name="milestoneId"
                  onValueChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, milestoneId: value }))}
                  options={[{ label: 'Sem milestone', value: '' }, ...project.milestones.map((milestone) => ({ label: milestone.title, value: milestone.id }))]}
                  value={draft.milestoneId}
                />
              </label>

              <label className="manual-intake-admin-field">
                <span>Categoria</span>
                <Norm8Select name="category" onValueChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, category: value as ProjectWorkCategory }))} options={projectWorkCategories.map((category) => ({ label: formatProjectWorkCategory(category), value: category }))} value={draft.category} />
              </label>

              <label className="manual-intake-admin-field project-estimate-field">
                <span>Estimativa</span>
                <input
                  className="admin-input"
                  inputMode="text"
                  name="estimatedHours"
                  onBlur={saveEstimate}
                  onChange={(event) => {
                    setDraft((currentDraft) => ({ ...currentDraft, estimatedHours: event.target.value }));
                    setEstimateSaveStatus('idle');
                    setEstimateError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      event.stopPropagation();
                      setDraft((currentDraft) => ({ ...currentDraft, estimatedHours: formatMinutesAsEstimate(task.estimatedMinutes) }));
                      setEstimateSaveStatus('idle');
                      setEstimateError(null);
                    }
                  }}
                  placeholder="Ex.: 2h ou 1h 30m"
                  type="text"
                  value={draft.estimatedHours}
                />
                {draft.estimatedHours ? null : <small className="project-field-helper">Use h e m. Ex.: 2h, 30m ou 1h 30m.</small>}
                <TaskFieldFeedback error={estimateError} status={estimateSaveStatus} />
              </label>

              <div className="project-task-meta-grid project-task-detail-readonly">
                <AdminField label="Registado" value={formatHoursFromMinutes(workedMinutes)} />
                <AdminField label="Progresso" value={`${progress}%`} />
              </div>
              <div className="project-progress-track" aria-label={`${progress}% de progresso`}><span style={{ width: `${progress}%` }} /></div>
            </div>
          </div>

        </div>

        <ProjectTimerControls activeTimer={activeTimer} projectId={project.id} setTimerSessions={setTimerSessions} task={task} timer={taskTimer} />
      </aside>
    </>
  );
}

function TaskFieldFeedback({ error, status }: { error: string | null; status: TaskFieldSaveStatus }) {
  if (error) return <small className="project-estimate-feedback is-error">{error}</small>;
  if (status === 'saving') return <small className="project-estimate-feedback">A guardar...</small>;
  if (status === 'saved') return <small className="project-estimate-feedback is-saved">Guardado</small>;
  return null;
}
function createTaskDraft(task: ProjectWorkspaceTask): ProjectTaskDraft {
  return {
    category: task.category,
    description: task.description ?? '',
    estimatedHours: formatMinutesAsEstimate(task.estimatedMinutes),
    milestoneId: task.milestoneId ?? '',
    status: task.status,
    title: task.title,
  };
}

function ProjectTimerControls({ activeTimer, projectId, setTimerSessions, task, timer }: { activeTimer: ProjectWorkspaceTimerSession | null; projectId: string; setTimerSessions: Dispatch<SetStateAction<ProjectWorkspaceTimerSession[]>>; task: ProjectWorkspaceTask; timer: ProjectWorkspaceTimerSession | null }) {
  const previousTimerSessionsRef = useRef<ProjectWorkspaceTimerSession[] | null>(null);
  const [manualTimeOpen, setManualTimeOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [manualEntryDate, setManualEntryDate] = useState(() => formatDateInput(new Date()));
  const [startState, startAction, startPending] = useActionState(startProjectTaskTimerAction, initialState);
  const [pauseState, pauseAction, pausePending] = useActionState(pauseProjectTaskTimerAction, initialState);
  const [resumeState, resumeAction, resumePending] = useActionState(resumeProjectTaskTimerAction, initialState);
  const [stopState, stopAction, stopPending] = useActionState(stopProjectTaskTimerAction, initialState);
  const [manualState, manualAction, manualPending] = useActionState(createProjectTimeEntryAction, initialState);
  const blockedByOtherTask = Boolean(activeTimer && activeTimer.taskId !== task.id);
  const isOptimisticTimer = Boolean(timer?.id.startsWith('optimistic-'));
  const isReadyToStart = !timer && !blockedByOtherTask;

  const updateTimerSessionsOptimistically = useCallback((updater: (currentTimers: ProjectWorkspaceTimerSession[]) => ProjectWorkspaceTimerSession[]) => {
    setTimerSessions((currentTimers) => {
      previousTimerSessionsRef.current = currentTimers;
      return updater(currentTimers);
    });
  }, [setTimerSessions]);

  const rollbackTimerSessions = useCallback(() => {
    const previousTimerSessions = previousTimerSessionsRef.current;
    if (!previousTimerSessions) return;
    setTimerSessions(previousTimerSessions);
    previousTimerSessionsRef.current = null;
  }, [setTimerSessions]);

  const commitTimerSession = useCallback((timerSession: ProjectWorkspaceTimerSession) => {
    previousTimerSessionsRef.current = null;
    setTimerSessions((currentTimers) => upsertTimerSession(currentTimers, timerSession));
  }, [setTimerSessions]);

  const clearOptimisticSnapshot = useCallback(() => {
    previousTimerSessionsRef.current = null;
  }, []);
  const handleConfirmResetTimer = useCallback(async () => {
    if (!timer || isResetting) return;

    setResetError(null);
    setIsResetting(true);

    const formData = new FormData();
    formData.set('projectId', projectId);
    formData.set('timerId', timer.id);

    const result = await resetProjectTaskTimerAction(initialState, formData);

    if (!result.success) {
      setResetError(result.error ?? 'Não foi possível reiniciar o timer.');
      setIsResetting(false);
      return;
    }

    setTimerSessions((currentTimers) => currentTimers.filter((currentTimer) => currentTimer.id !== timer.id));
    clearOptimisticSnapshot();
    setResetDialogOpen(false);
    setIsResetting(false);
  }, [clearOptimisticSnapshot, isResetting, projectId, setTimerSessions, timer]);

  useEffect(() => {
    if (!manualState.success) return;
    setManualTimeOpen(false);
    setManualEntryDate(formatDateInput(new Date()));
  }, [manualState.success]);

  useEffect(() => {
    if (startState.error) rollbackTimerSessions();
    if (startState.timerSession) commitTimerSession(startState.timerSession);
  }, [commitTimerSession, rollbackTimerSessions, startState.error, startState.timerSession]);

  useEffect(() => {
    if (pauseState.error) rollbackTimerSessions();
    if (pauseState.timerSession) commitTimerSession(pauseState.timerSession);
  }, [commitTimerSession, pauseState.error, pauseState.timerSession, rollbackTimerSessions]);

  useEffect(() => {
    if (resumeState.error) rollbackTimerSessions();
    if (resumeState.timerSession) commitTimerSession(resumeState.timerSession);
  }, [commitTimerSession, resumeState.error, resumeState.timerSession, rollbackTimerSessions]);



  return (
    <div className="project-task-drawer-section project-timer-box">
      <div className="project-timer-heading">
        <Clock3 size={16} />
        <span>Timer da tarefa</span>
      </div>

      {timer ? <TimerReadout timer={timer} /> : (
        <div className="project-timer-readout">
          <strong>00:00:00</strong>
          <span>Pronto para iniciar</span>
        </div>
      )}

      {blockedByOtherTask ? <p className="project-form-error">Existe um timer ativo noutra tarefa.</p> : null}

      <div className="project-timer-primary-actions">
        {!timer ? (
          <form action={startAction} className="project-timer-action-form" onSubmit={() => { updateTimerSessionsOptimistically((currentTimers) => upsertTimerSession(currentTimers, createOptimisticTimerSession(projectId, task, 'RUNNING'))); }}>
            <input name="projectId" type="hidden" value={projectId} />
            <input name="taskId" type="hidden" value={task.id} />
            <input name="category" type="hidden" value={task.category} />
            <button className="admin-button" disabled={startPending || blockedByOtherTask} type="submit"><Play size={14} />Iniciar</button>
          </form>
        ) : null}

        {timer?.status === 'RUNNING' ? (
          <form action={pauseAction} className="project-timer-action-form" onSubmit={() => { if (!timer) return; const pausedAt = new Date(); const accumulatedSeconds = getTimerSeconds(timer, pausedAt.getTime()); updateTimerSessionsOptimistically((currentTimers) => upsertTimerSession(currentTimers, { ...timer, accumulatedSeconds, pausedAt, status: 'PAUSED' })); }}>
            <input name="projectId" type="hidden" value={projectId} />
            <input name="timerId" type="hidden" value={timer.id} />
            <button className="admin-button admin-button-muted" disabled={pausePending || isOptimisticTimer} type="submit"><Pause size={14} />Pausar</button>
          </form>
        ) : null}

        {timer?.status === 'PAUSED' ? (
          <form action={resumeAction} className="project-timer-action-form" onSubmit={() => { if (!timer) return; updateTimerSessionsOptimistically((currentTimers) => upsertTimerSession(currentTimers, { ...timer, pausedAt: null, startedAt: new Date(), status: 'RUNNING' })); }}>
            <input name="projectId" type="hidden" value={projectId} />
            <input name="timerId" type="hidden" value={timer.id} />
            <button className="admin-button admin-button-muted" disabled={resumePending || isOptimisticTimer} type="submit"><Play size={14} />Retomar</button>
          </form>
        ) : null}

        {timer ? (
          <form action={stopAction} className="project-timer-stop-form">
            <input name="projectId" type="hidden" value={projectId} />
            <input name="timerId" type="hidden" value={timer.id} />
            <label className="manual-intake-admin-field project-timer-note-field">
              <span>Nota ao guardar</span>
              <textarea className="admin-textarea" name="description" placeholder="Ex.: ajustes no layout, QA, reunião com cliente" />
            </label>
            <button className="admin-button" disabled={stopPending} type="submit"><Square size={14} />Parar e guardar</button>
          </form>
        ) : null}
      </div>

      <div className={`project-timer-secondary-actions${isReadyToStart ? ' is-ready-to-start' : ''}`}>
        {timer ? (
          <AlertDialog open={resetDialogOpen} onOpenChange={(open) => { if (isResetting) return; setResetError(null); setResetDialogOpen(open); }}>
            <AlertDialogTrigger asChild>
              <button className="admin-button admin-button-muted" disabled={isResetting || isOptimisticTimer} type="button"><RotateCcw size={14} />Reiniciar</button>
            </AlertDialogTrigger>
            <AlertDialogContent className="project-timer-reset-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>Reiniciar timer?</AlertDialogTitle>
                <AlertDialogDescription>O tempo ainda não guardado desta sessão será apagado. Esta ação não cria um registo de tempo.</AlertDialogDescription>
              </AlertDialogHeader>
              {resetError ? <p className="project-form-error">{resetError}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel className="admin-button admin-button-muted" disabled={isResetting} type="button">Cancelar</AlertDialogCancel>
                <button className="admin-button project-timer-reset-confirm" disabled={isResetting} onClick={handleConfirmResetTimer} type="button">{isResetting ? 'A reiniciar...' : 'Reiniciar timer'}</button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        <button className="admin-button admin-button-muted" onClick={() => setManualTimeOpen((open) => !open)} type="button"><CalendarPlus size={14} />Adicionar tempo manualmente</button>
      </div>

      {manualTimeOpen ? (
        <form action={manualAction} className="project-manual-time-form" noValidate>
          <input name="projectId" type="hidden" value={projectId} />
          <input name="taskId" type="hidden" value={task.id} />
          <p className="project-field-helper">Use esta opção quando tiver trabalhado fora do timer.</p>
          <label className="manual-intake-admin-field">
            <span>Duração</span>
            <input className="admin-input" inputMode="text" name="durationHours" placeholder="Ex.: 30m, 1h ou 1h 30m" required type="text" />
          </label>
          <label className="manual-intake-admin-field">
            <span>Data</span>
            <input className="admin-input" name="entryDate" onChange={(event) => setManualEntryDate(event.target.value)} required type="date" value={manualEntryDate} />
          </label>
          <label className="manual-intake-admin-field">
            <span>Categoria</span>
            <Norm8Select defaultValue={task.category} name="category" options={projectWorkCategories.map((category) => ({ label: formatProjectWorkCategory(category), value: category }))} />
          </label>
          <label className="manual-intake-admin-field">
            <span>Descrição/nota</span>
            <textarea className="admin-textarea" name="description" placeholder="Ex.: reunião com cliente, ajustes finais, QA" />
          </label>
          <div className="project-manual-time-actions">
            <button className="admin-button" disabled={manualPending} type="submit">{manualPending ? 'A registar...' : 'Registar tempo'}</button>
            <button className="admin-button admin-button-muted" disabled={manualPending} onClick={() => setManualTimeOpen(false)} type="button">Cancelar</button>
          </div>
        </form>
      ) : null}

      <TimerActionFeedback state={startState} />
      <TimerActionFeedback state={pauseState} />
      <TimerActionFeedback state={resumeState} />
      <TimerActionFeedback state={stopState} />
      <ActionFeedback state={manualState} />
    </div>
  );
}
function TimerActionFeedback({ state }: { state: ProjectActionState }) {
  if (state.error) return <p className="project-form-error">{state.error}</p>;
  return null;
}

function TimerReadout({ timer }: { timer: ProjectWorkspaceTimerSession }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.status !== 'RUNNING') return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer.status]);

  const seconds = getTimerSeconds(timer, now);
  return (
    <div className="project-timer-readout">
      <strong>{formatTimerSeconds(seconds)}</strong>
      <span>{timer.status === 'RUNNING' ? 'A contar' : 'Pausado'}</span>
    </div>
  );
}

function ActiveTimerInline({ projectId, timer }: { projectId: string; timer: ProjectWorkspaceTimerSession }) {
  const [stopState, stopAction, stopPending] = useActionState(stopProjectTaskTimerAction, initialState);

  return (
    <div className="project-active-timer">
      <TimerReset size={16} />
      <div>
        <strong>{timer.task.title}</strong>
        <TimerReadout timer={timer} />
      </div>
      <form action={stopAction}>
        <input name="projectId" type="hidden" value={projectId} />
        <input name="timerId" type="hidden" value={timer.id} />
        <button className="admin-button admin-button-muted" disabled={stopPending} type="submit">Guardar</button>
      </form>
      <TimerActionFeedback state={stopState} />
    </div>
  );
}

function TaskCard({ activeTimer, isDraggingSource, isSaving, isSelected, onDragEnd, onDragStart, onOpen, task }: { activeTimer: ProjectWorkspaceTimerSession | null; isDraggingSource: boolean; isSaving: boolean; isSelected: boolean; onDragEnd: () => void; onDragStart: (event: DragEvent<HTMLElement>) => void; onOpen: () => void; task: ProjectWorkspaceTask }) {
  const workedMinutes = task.timeEntries.reduce((sum, entry) => sum + Math.max(0, entry.durationMinutes), 0);
  const progress = getTaskProgress(task, workedMinutes);
  const isTiming = activeTimer?.taskId === task.id;

  return (
    <article
      className={`project-task-card${isSelected ? ' is-selected' : ''}${isDraggingSource ? ' project-task-card--dragging-source' : ''}${isSaving ? ' is-saving' : ''}`}
      draggable
      onClick={onOpen}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="project-task-card-top">
        <span>{task.milestone?.title ?? 'Sem milestone'}</span>
        {isSaving ? <AdminBadge tone="slate">A guardar...</AdminBadge> : isTiming ? <AdminBadge tone="cyan">Timer</AdminBadge> : <StatusDot status={task.status} />}
      </div>
      <strong>{task.title}</strong>
      <small>{formatProjectWorkCategory(task.category)}</small>
      <div className="project-progress-track" aria-label={`${progress}% de progresso`}><span style={{ width: `${progress}%` }} /></div>
      <div className="project-task-card-bottom">
        <span>{formatHoursFromMinutes(workedMinutes)}</span>
        <span>{task.estimatedMinutes ? formatHoursFromMinutes(task.estimatedMinutes) : 'Sem estimativa'}</span>
      </div>
    </article>
  );
}

function moveTaskToStatus(tasks: ProjectWorkspaceTask[], taskId: string, status: ProjectTaskStatus): ProjectWorkspaceTask[] {
  return tasks.map((task) => task.id === taskId ? { ...task, status } : task);
}

function CategoryHours({ metrics }: { metrics: ProjectWorkspaceMetrics }) {
  return (
    <AdminPanel title="Horas por categoria">
      {metrics.totalWorkedMinutes > 0 ? (
        <div className="project-category-list">
          {projectWorkCategories.map((category) => {
            const minutes = metrics.workedMinutesByCategory[category];
            const percentage = metrics.totalWorkedMinutes > 0 ? (minutes / metrics.totalWorkedMinutes) * 100 : 0;

            return (
              <div className="project-category-item" key={category}>
                <span>{formatProjectWorkCategory(category)}</span>
                <strong>{formatHoursFromMinutes(minutes)}</strong>
                <small>{formatPercentage(percentage)}</small>
              </div>
            );
          })}
        </div>
      ) : <AdminEmptyState>Ainda não existem horas registadas.</AdminEmptyState>}
    </AdminPanel>
  );
}

function ProjectSnapshot({ metrics, project }: ProjectDetailWorkspaceProps) {
  return (
    <AdminPanel title="Snapshot">
      <div className="admin-row-list">
        <AdminRow title="Estado" meta={formatProjectStatus(project.status)} />
        <AdminRow title="Fase" meta={formatProjectGrowthPhase(project.growthPhase)} />
        <AdminRow title="Progresso" meta={`${metrics.projectProgressPercentage}%`} />
        <AdminRow title="Valor contratado" meta={formatCurrencyCents(project.contractedValueCents, project.currency)} />
        <AdminRow title="Receita efetiva por hora" meta={formatEffectiveHourlyRate(metrics.effectiveHourlyRateCents, project.currency)} />
      </div>
    </AdminPanel>
  );
}

function StatusDot({ status }: { status: ProjectTaskStatus }) {
  const className = `project-status-dot project-status-dot-${status.toLowerCase().replace('_', '-')}`;
  return <Circle aria-label={formatProjectTaskStatus(status)} className={className} size={12} />;
}

function ActionFeedback({ state }: { state: ProjectActionState }) {
  if (state.error) return <p className="project-form-error">{state.error}</p>;
  if (state.message) return <p className="project-form-success">{state.message}</p>;
  return null;
}

function createOptimisticTimerSession(projectId: string, task: ProjectWorkspaceTask, status: ProjectTimerStatus): ProjectWorkspaceTimerSession {
  const now = new Date();
  return {
    accumulatedSeconds: 0,
    category: task.category,
    description: null,
    id: `optimistic-${task.id}-${now.getTime()}`,
    pausedAt: status === 'PAUSED' ? now : null,
    projectId,
    startedAt: now,
    status,
    task: { id: task.id, title: task.title },
    taskId: task.id,
  };
}

function upsertTimerSession(timerSessions: ProjectWorkspaceTimerSession[], timerSession: ProjectWorkspaceTimerSession): ProjectWorkspaceTimerSession[] {
  const withoutSameSession = timerSessions.filter((currentTimer) => currentTimer.id !== timerSession.id && !(currentTimer.id.startsWith('optimistic-') && currentTimer.taskId === timerSession.taskId));
  return [timerSession, ...withoutSameSession];
}

function getTaskProgress(task: ProjectWorkspaceTask, workedMinutes: number): number {
  if (task.status === 'DONE') return 100;
  if (task.status === 'TODO') return 0;
  if (!task.estimatedMinutes || task.estimatedMinutes <= 0) return task.status === 'IN_REVIEW' ? 75 : task.status === 'IN_PROGRESS' ? 50 : task.status === 'BLOCKED' ? 25 : 0;
  return Math.min(99, Math.round((workedMinutes / task.estimatedMinutes) * 100));
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function getTimerSeconds(timer: ProjectWorkspaceTimerSession, now: number): number {
  if (timer.status !== 'RUNNING') return timer.accumulatedSeconds;
  const startedAt = new Date(timer.startedAt).getTime();
  if (!Number.isFinite(startedAt)) return timer.accumulatedSeconds;
  return timer.accumulatedSeconds + Math.max(0, Math.floor((now - startedAt) / 1000));
}

function formatTimerSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}
