'use client';

import { useActionState, useCallback, useEffect, useState, useTransition, type DragEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Circle, Clock3, Pause, Play, Square, TimerReset, Trash2, X } from 'lucide-react';
import type { ProjectGrowthPhase, ProjectMilestoneStatus, ProjectStatus, ProjectTaskStatus, ProjectTimerStatus, ProjectWorkCategory } from '@/app/generated/prisma/client';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminEmptyState, AdminField, AdminPanel, AdminRow } from '@/components/admin/AdminPrimitives';
import { ProjectMilestoneForm, ProjectStatusSelect, ProjectTimeEntryForm } from '@/components/admin/projects/ProjectForms';
import {
  deleteProjectTimeEntryAction,
  createProjectTaskAction,
  moveProjectTaskStatusAction,
  pauseProjectTaskTimerAction,
  resumeProjectTaskTimerAction,
  startProjectTaskTimerAction,
  stopProjectTaskTimerAction,
  updateProjectMilestoneStatusAction,
  updateProjectTaskStatusAction,
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
  const selectedTask = project.tasks.find((task) => task.id === selectedTaskId) ?? null;
  const activeTimer = project.timerSessions.find((timer) => timer.status === 'RUNNING' || timer.status === 'PAUSED') ?? null;
  const closeTaskDrawer = useCallback(() => setSelectedTaskId(null), []);

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
      {activeTab === 'tasks' ? <TasksTab activeTimer={activeTimer} project={project} selectedTaskId={selectedTaskId} setSelectedTaskId={setSelectedTaskId} /> : null}
      {activeTab === 'time' ? <TimeTab metrics={metrics} project={project} /> : null}
      {activeTab === 'profitability' ? <ProfitabilityTab metrics={metrics} project={project} /> : null}

      {selectedTask ? (
        <>
          <button aria-label="Fechar detalhe da tarefa" className="project-task-drawer-backdrop" onClick={closeTaskDrawer} type="button" />
          <TaskDrawer activeTimer={activeTimer} onClose={closeTaskDrawer} project={project} task={selectedTask} />
        </>
      ) : null}
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

        <AdminPanel title="Milestones" subtitle={`${metrics.completedMilestones} de ${metrics.totalMilestones} milestones concluídas.`} action={<ProjectMilestoneForm projectId={project.id} />}>
          {project.milestones.length > 0 ? (
            <div className="project-milestone-list">
              {project.milestones.map((milestone) => {
                const milestoneTasks = project.tasks.filter((task) => task.milestoneId === milestone.id);
                const doneTasks = milestoneTasks.filter((task) => task.status === 'DONE').length;
                const progress = milestoneTasks.length > 0 ? Math.round((doneTasks / milestoneTasks.length) * 100) : milestone.status === 'DONE' ? 100 : 0;
                const milestoneMeta = `${doneTasks}/${milestoneTasks.length} tarefas concluídas · ${formatProjectMilestoneStatus(milestone.status)}${milestone.dueDate ? ` · ${formatDateOnly(milestone.dueDate)}` : ''}`;

                return (
                  <article className="project-milestone-card" key={milestone.id}>
                    <div className="project-milestone-main">
                      <span className="project-milestone-number">{milestone.order}</span>
                      <div className="project-milestone-content">
                        <div className="project-milestone-heading">
                          <h3>{milestone.order} · {milestone.title}</h3>
                          <AdminBadge tone={milestone.status === 'DONE' ? 'green' : milestone.status === 'IN_PROGRESS' ? 'blue' : 'slate'}>{formatProjectMilestoneStatus(milestone.status)}</AdminBadge>
                        </div>
                        <p className="project-milestone-meta">{milestoneMeta}</p>
                        <p className="project-milestone-description">{milestone.description ?? 'Sem descrição.'}</p>
                        <div className="project-progress-track" aria-label={`${progress}% de progresso`}><span style={{ width: `${progress}%` }} /></div>
                      </div>
                    </div>
                    <form action={updateProjectMilestoneStatusAction} className="project-milestone-status-form">
                      <input name="projectId" type="hidden" value={project.id} />
                      <input name="milestoneId" type="hidden" value={milestone.id} />
                      <ProjectStatusSelect current={milestone.status} name="status" type="milestone" />
                      <button className="admin-button admin-button-muted" type="submit">Atualizar</button>
                    </form>
                  </article>
                );
              })}
            </div>
          ) : <AdminEmptyState>Sem milestones criadas.</AdminEmptyState>}
        </AdminPanel>
      </div>

      <aside className="admin-page-grid">
        <ProjectSnapshot metrics={metrics} project={project} />
      </aside>
    </section>
  );
}

function TasksTab({ activeTimer, project, selectedTaskId, setSelectedTaskId }: { activeTimer: ProjectWorkspaceTimerSession | null; project: ProjectWorkspaceProject; selectedTaskId: string | null; setSelectedTaskId: (taskId: string) => void }) {
  const router = useRouter();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<ProjectTaskStatus | null>(null);
  const [moveState, setMoveState] = useState<ProjectActionState>(initialState);
  const [isMoving, startMoveTransition] = useTransition();

  const moveTask = useCallback((taskId: string, status: ProjectTaskStatus) => {
    const task = project.tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;

    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('taskId', taskId);
    formData.set('status', status);

    setMoveState({ success: false, message: 'A atualizar estado...' });
    startMoveTransition(() => {
      void moveProjectTaskStatusAction(initialState, formData).then((result) => {
        setMoveState(result);
        router.refresh();
      });
    });
  }, [project.id, project.tasks, router]);

  return (
    <section className="admin-page-grid">
      <AdminPanel title="Tarefas" subtitle="Crie dentro da coluna certa e mova cards para atualizar o estado.">
        {moveState.error ? <p className="project-form-error">{moveState.error}</p> : null}
        {moveState.message ? <p className="project-form-success">{moveState.message}</p> : null}
        <div className={`project-kanban${isMoving ? ' is-moving' : ''}`} aria-label="Kanban de tarefas">
          {kanbanColumns.map((column) => {
            const tasks = project.tasks.filter((task) => task.status === column.id);
            const isDropTarget = dropTargetStatus === column.id;

            return (
              <section
                className={`project-kanban-column${isDropTarget ? ' is-drop-target' : ''}`}
                key={column.id}
                onDragLeave={() => setDropTargetStatus(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTargetStatus(column.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId;
                  setDraggedTaskId(null);
                  setDropTargetStatus(null);
                  if (taskId) moveTask(taskId, column.id);
                }}
              >
                <div className="project-kanban-column-header">
                  <span>{column.label}</span>
                  <strong>{tasks.length}</strong>
                </div>
                <div className="project-kanban-list">
                  {tasks.length > 0 ? tasks.map((task) => (
                    <TaskCard
                      activeTimer={activeTimer}
                      isSelected={selectedTaskId === task.id}
                      key={task.id}
                      onDragStart={(event) => {
                        setDraggedTaskId(task.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', task.id);
                      }}
                      onOpen={() => setSelectedTaskId(task.id)}
                      task={task}
                    />
                  )) : <div className="project-kanban-empty">Sem tarefas nesta coluna.</div>}
                </div>
                <ProjectKanbanCreateForm milestones={project.milestones} projectId={project.id} status={column.id} statusLabel={column.label} />
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
        <select className="admin-input" name="milestoneId" defaultValue="">
          <option value="">Sem milestone</option>
          {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}
        </select>
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
        <AdminPanel title="Time tracking" subtitle="Timer persistente por tarefa e registo manual quando for preciso." action={<ProjectTimeEntryForm project={project} />}>
          {project.timerSessions.length > 0 ? (
            <div className="project-active-timer-strip">
              {project.timerSessions.map((timer) => <ActiveTimerInline key={timer.id} projectId={project.id} timer={timer} />)}
            </div>
          ) : null}

          {project.timeEntries.length > 0 ? (
            <div className="admin-row-list">
              {project.timeEntries.map((entry) => (
                <AdminRow key={entry.id} title={`${formatHoursFromMinutes(entry.durationMinutes)} · ${entry.task?.title ?? 'Tarefa removida'}`} meta={`${formatProjectWorkCategory(entry.category)} · ${formatDateOnly(entry.entryDate)}`}>
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
          ) : <AdminEmptyState>Ainda não existem horas registadas.</AdminEmptyState>}
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

function TaskDrawer({ activeTimer, onClose, project, task }: { activeTimer: ProjectWorkspaceTimerSession | null; onClose: () => void; project: ProjectWorkspaceProject; task: ProjectWorkspaceTask }) {
  const taskTimer = activeTimer?.taskId === task.id ? activeTimer : null;
  const workedMinutes = task.timeEntries.reduce((sum, entry) => sum + Math.max(0, entry.durationMinutes), 0);
  const progress = getTaskProgress(task, workedMinutes);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <aside aria-label="Detalhe da tarefa" aria-modal="true" className="project-task-drawer" role="dialog">
      <div className="project-task-drawer-header">
        <div>
          <span>{task.milestone?.title ?? 'Sem milestone'}</span>
          <h2>{task.title}</h2>
        </div>
        <button aria-label="Fechar detalhe da tarefa" className="project-icon-button" onClick={onClose} type="button"><X size={16} /></button>
      </div>

      <div className="project-task-drawer-section">
        <div className="project-task-meta-grid">
          <AdminField label="Estado" value={formatProjectTaskStatus(task.status)} />
          <AdminField label="Categoria" value={formatProjectWorkCategory(task.category)} />
          <AdminField label="Estimativa" value={task.estimatedMinutes ? formatHoursFromMinutes(task.estimatedMinutes) : 'Sem estimativa'} />
          <AdminField label="Registado" value={formatHoursFromMinutes(workedMinutes)} />
        </div>
        <div className="project-progress-track" aria-label={`${progress}% de progresso`}><span style={{ width: `${progress}%` }} /></div>
        <p className="project-description">{task.description ?? 'Sem descrição.'}</p>
      </div>

      <form action={updateProjectTaskStatusAction} className="project-status-form project-task-drawer-section">
        <input name="projectId" type="hidden" value={project.id} />
        <input name="taskId" type="hidden" value={task.id} />
        <ProjectStatusSelect current={task.status} name="status" type="task" />
        <button className="admin-button admin-button-muted" type="submit">Atualizar estado</button>
      </form>

      <ProjectTimerControls activeTimer={activeTimer} projectId={project.id} task={task} timer={taskTimer} />
    </aside>
  );
}

function ProjectTimerControls({ activeTimer, projectId, task, timer }: { activeTimer: ProjectWorkspaceTimerSession | null; projectId: string; task: ProjectWorkspaceTask; timer: ProjectWorkspaceTimerSession | null }) {
  const [startState, startAction, startPending] = useActionState(startProjectTaskTimerAction, initialState);
  const [pauseState, pauseAction, pausePending] = useActionState(pauseProjectTaskTimerAction, initialState);
  const [resumeState, resumeAction, resumePending] = useActionState(resumeProjectTaskTimerAction, initialState);
  const [stopState, stopAction, stopPending] = useActionState(stopProjectTaskTimerAction, initialState);
  const blockedByOtherTask = Boolean(activeTimer && activeTimer.taskId !== task.id);

  return (
    <div className="project-task-drawer-section project-timer-box">
      <div className="project-timer-heading">
        <Clock3 size={16} />
        <span>Timer da tarefa</span>
      </div>
      {timer ? <TimerReadout timer={timer} /> : <p className="project-description">Inicie o timer quando começar trabalho real nesta tarefa.</p>}
      {blockedByOtherTask ? <p className="project-form-error">Existe um timer ativo noutra tarefa.</p> : null}

      {!timer ? (
        <form action={startAction} className="project-timer-actions">
          <input name="projectId" type="hidden" value={projectId} />
          <input name="taskId" type="hidden" value={task.id} />
          <input name="category" type="hidden" value={task.category} />
          <button className="admin-button" disabled={startPending || blockedByOtherTask} type="submit"><Play size={14} />Iniciar</button>
        </form>
      ) : null}

      {timer?.status === 'RUNNING' ? (
        <form action={pauseAction} className="project-timer-actions">
          <input name="projectId" type="hidden" value={projectId} />
          <input name="timerId" type="hidden" value={timer.id} />
          <button className="admin-button admin-button-muted" disabled={pausePending} type="submit"><Pause size={14} />Pausar</button>
        </form>
      ) : null}

      {timer?.status === 'PAUSED' ? (
        <form action={resumeAction} className="project-timer-actions">
          <input name="projectId" type="hidden" value={projectId} />
          <input name="timerId" type="hidden" value={timer.id} />
          <button className="admin-button admin-button-muted" disabled={resumePending} type="submit"><Play size={14} />Retomar</button>
        </form>
      ) : null}

      {timer ? (
        <form action={stopAction} className="project-timer-stop-form">
          <input name="projectId" type="hidden" value={projectId} />
          <input name="timerId" type="hidden" value={timer.id} />
          <label className="manual-intake-admin-field">
            <span>Nota ao guardar</span>
            <textarea className="admin-textarea" name="description" placeholder="Ex.: ajustes no layout, QA, reunião com cliente" />
          </label>
          <button className="admin-button" disabled={stopPending} type="submit"><Square size={14} />Parar e guardar</button>
        </form>
      ) : null}

      <ActionFeedback state={startState} />
      <ActionFeedback state={pauseState} />
      <ActionFeedback state={resumeState} />
      <ActionFeedback state={stopState} />
    </div>
  );
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
      <ActionFeedback state={stopState} />
    </div>
  );
}

function TaskCard({ activeTimer, isSelected, onDragStart, onOpen, task }: { activeTimer: ProjectWorkspaceTimerSession | null; isSelected: boolean; onDragStart: (event: DragEvent<HTMLElement>) => void; onOpen: () => void; task: ProjectWorkspaceTask }) {
  const workedMinutes = task.timeEntries.reduce((sum, entry) => sum + Math.max(0, entry.durationMinutes), 0);
  const progress = getTaskProgress(task, workedMinutes);
  const isTiming = activeTimer?.taskId === task.id;

  return (
    <article
      className={`project-task-card${isSelected ? ' is-selected' : ''}`}
      draggable
      onClick={onOpen}
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
        {isTiming ? <AdminBadge tone="cyan">Timer</AdminBadge> : <StatusDot status={task.status} />}
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

function getTaskProgress(task: ProjectWorkspaceTask, workedMinutes: number): number {
  if (task.status === 'DONE') return 100;
  if (task.status === 'TODO') return 0;
  if (!task.estimatedMinutes || task.estimatedMinutes <= 0) return task.status === 'IN_REVIEW' ? 75 : task.status === 'IN_PROGRESS' ? 50 : task.status === 'BLOCKED' ? 25 : 0;
  return Math.min(99, Math.round((workedMinutes / task.estimatedMinutes) * 100));
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