'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ProjectGrowthPhase, ProjectMilestoneStatus, ProjectStatus, ProjectTaskStatus, ProjectTimerStatus, ProjectWorkCategory } from '@/app/generated/prisma/client';
import { requireAdmin } from '@/lib/admin/auth';
import {
  createProject,
  createProjectMilestone,
  createProjectTask,
  createProjectTimeEntry,
  deleteProjectTimeEntry,
  updateProjectMilestone,
  updateProjectTask,
} from '@/lib/admin/projects';
import {
  projectGrowthPhases,
  projectMilestoneStatuses,
  projectStatuses,
  projectTaskStatuses,
  projectWorkCategories,
} from '@/lib/admin/project-presenters';
import { prisma } from '@/lib/db/prisma';
import { parseDurationToMinutes } from '@/lib/admin/project-time-formatters';
import { parseEuroToCents } from '@/lib/finance/formatters';

export type ProjectTimerSessionPayload = {
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

export type ProjectActionState = {
  error?: string;
  message?: string;
  resetTimerId?: string;
  stoppedTimerId?: string;
  success: boolean;
  timerSession?: ProjectTimerSessionPayload;
};

const genericProjectError = 'Não foi possível guardar o projeto. Confirme os dados e tente novamente.';
const genericMilestoneError = 'Não foi possível guardar a milestone. Confirme os dados e tente novamente.';
const genericTaskError = 'Não foi possível guardar a tarefa. Confirme os dados e tente novamente.';
const genericTimeEntryError = 'Não foi possível registar o tempo. Confirme os dados e tente novamente.';

export async function createProjectAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  let projectId: string | null = null;

  try {
    const parsed = parseProjectFormData(formData);
    if (!parsed.ok) return { success: false, error: parsed.error };

    const project = await createProject(parsed.data);
    projectId = project.id;
    revalidatePath('/admin/projects');
    revalidatePath(`/admin/projects/${project.id}`);
  } catch (error) {
    console.error('Failed to create project', error);
    return { success: false, error: mapProjectError(error, genericProjectError) };
  }

  redirect(`/admin/projects/${projectId}`);
}

export async function createAureusProjectAction(): Promise<void> {
  await requireAdmin();

  const existing = await prisma.project.findFirst({
    select: { id: true },
    where: { clientName: 'Aureus', name: 'Aureus - Digital Platform' },
  });

  if (existing) {
    redirect(`/admin/projects/${existing.id}`);
  }

  const project = await prisma.project.create({
    data: {
      clientName: 'Aureus',
      commercialCondition: 'Founder',
      contractedValueCents: 30000,
      currency: 'EUR',
      description: 'Projeto inicial da Aureus no fluxo Launch do Norm8 Growth System.',
      growthPhase: 'LAUNCH',
      name: 'Aureus - Digital Platform',
      planName: 'Business',
      status: 'IN_PROGRESS',
      milestones: {
        create: [
          { order: 1, title: 'Kickoff e alinhamento' },
          { order: 2, title: 'Estrutura da plataforma' },
          { order: 3, title: 'Design e interface' },
          { order: 4, title: 'Implementação funcional' },
          { order: 5, title: 'QA e ajustes' },
          { order: 6, title: 'Deploy e entrega' },
        ],
      },
    },
    include: { milestones: { orderBy: { order: 'asc' } } },
  });

  const tasks = [
    { category: 'MEETING' as ProjectWorkCategory, milestoneTitle: 'Kickoff e alinhamento', title: 'Reunião inicial' },
    { category: 'DEVELOPMENT' as ProjectWorkCategory, milestoneTitle: 'Estrutura da plataforma', title: 'Definir estrutura da plataforma' },
    { category: 'DESIGN' as ProjectWorkCategory, milestoneTitle: 'Design e interface', title: 'Criar layout principal' },
    { category: 'DEVELOPMENT' as ProjectWorkCategory, milestoneTitle: 'Implementação funcional', title: 'Implementar páginas principais' },
    { category: 'QA' as ProjectWorkCategory, milestoneTitle: 'QA e ajustes', title: 'Testar fluxo completo' },
    { category: 'DEPLOYMENT' as ProjectWorkCategory, milestoneTitle: 'Deploy e entrega', title: 'Preparar deploy' },
  ];

  await prisma.projectTask.createMany({
    data: tasks.map((task, index) => ({
      category: task.category,
      milestoneId: project.milestones.find((milestone) => milestone.title === task.milestoneTitle)?.id ?? null,
      order: index + 1,
      projectId: project.id,
      title: task.title,
    })),
  });

  revalidatePath('/admin/projects');
  revalidatePath(`/admin/projects/${project.id}`);
  redirect(`/admin/projects/${project.id}`);
}

export async function createProjectMilestoneAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  try {
    const projectId = requiredString(formData.get('projectId'));
    const title = requiredString(formData.get('title'));
    const dueDate = parseOptionalDateOnly(formData.get('dueDate'));

    if (!projectId) return { success: false, error: genericMilestoneError };
    if (!title) return { success: false, error: 'O título da milestone é obrigatório.' };
    if (dueDate === 'INVALID') return { success: false, error: 'Selecione uma data válida.' };

    await createProjectMilestone({ description: optionalString(formData.get('description')), dueDate, projectId, title });

    revalidateProjectPaths(projectId);
    return { success: true, message: 'Milestone criada com sucesso.' };
  } catch (error) {
    console.error('Failed to create project milestone', error);
    return { success: false, error: genericMilestoneError };
  }
}

export async function updateProjectMilestoneStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = requiredString(formData.get('milestoneId'));
  const projectId = requiredString(formData.get('projectId'));
  const status = parseMilestoneStatus(formData.get('status'));

  if (!id || !projectId || !status) return;

  try {
    await updateProjectMilestone(id, { status });
    revalidateProjectPaths(projectId);
  } catch (error) {
    console.error('Failed to update project milestone status', error);
  }
}

export async function updateProjectMilestoneAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  const id = requiredString(formData.get('milestoneId'));
  const projectId = requiredString(formData.get('projectId'));
  const title = requiredString(formData.get('title'));
  const description = optionalString(formData.get('description'));
  const dueDate = parseOptionalDateOnly(formData.get('dueDate'));
  const status = parseMilestoneStatus(formData.get('status'));

  if (!id || !projectId) return { success: false, error: genericMilestoneError };
  if (!title) return { success: false, error: 'O título da milestone é obrigatório.' };
  if (dueDate === 'INVALID') return { success: false, error: 'Selecione uma data válida.' };
  if (!status) return { success: false, error: 'O estado da milestone é obrigatório.' };

  try {
    const milestone = await prisma.projectMilestone.findFirst({ select: { id: true }, where: { id, projectId } });
    if (!milestone) return { success: false, error: 'A milestone selecionada não pertence a este projeto.' };

    await updateProjectMilestone(id, { description, dueDate, status, title });
    revalidateProjectPaths(projectId);
    return { success: true, message: 'Milestone atualizada.' };
  } catch (error) {
    console.error('Failed to update project milestone', { error, milestoneId: id, projectId });
    return { success: false, error: genericMilestoneError };
  }
}

export async function createProjectTaskAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  try {
    const projectId = requiredString(formData.get('projectId'));
    const title = requiredString(formData.get('title'));
    const category = parseWorkCategory(formData.get('category'));
    const status = parseTaskStatus(formData.get('status')) ?? 'TODO';
    const estimatedMinutes = parseOptionalHoursToMinutes(formData.get('estimatedHours'));

    if (!projectId) return { success: false, error: genericTaskError };
    if (!title) return { success: false, error: 'O título da tarefa é obrigatório.' };
    if (!category) return { success: false, error: 'A categoria é obrigatória.' };
    if (estimatedMinutes === 'INVALID') return { success: false, error: 'A estimativa deve ser um número de horas válido.' };

    await createProjectTask({
      category,
      description: optionalString(formData.get('description')),
      estimatedMinutes,
      milestoneId: optionalString(formData.get('milestoneId')),
      projectId,
      status,
      title,
    });

    revalidateProjectPaths(projectId);
    return { success: true, message: 'Tarefa criada com sucesso.' };
  } catch (error) {
    console.error('Failed to create project task', error);
    return { success: false, error: genericTaskError };
  }
}

export async function updateProjectTaskAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  const id = requiredString(formData.get('taskId'));
  const projectId = requiredString(formData.get('projectId'));
  const title = requiredString(formData.get('title'));
  const description = optionalString(formData.get('description'));
  const status = parseTaskStatus(formData.get('status'));
  const category = parseWorkCategory(formData.get('category'));
  const milestoneId = optionalString(formData.get('milestoneId'));
  const estimatedMinutes = parseOptionalHoursToMinutes(formData.get('estimatedHours'));

  if (!id || !projectId) return { success: false, error: genericTaskError };
  if (!title) return { success: false, error: 'O título da tarefa é obrigatório.' };
  if (!status) return { success: false, error: 'O estado da tarefa é obrigatório.' };
  if (!category) return { success: false, error: 'A categoria é obrigatória.' };
  if (estimatedMinutes === 'INVALID') return { success: false, error: 'A estimativa deve ser um número de horas válido.' };

  try {
    const task = await prisma.projectTask.findFirst({ select: { id: true }, where: { id, projectId } });
    if (!task) return { success: false, error: 'A tarefa selecionada não pertence a este projeto.' };

    if (milestoneId) {
      const milestone = await prisma.projectMilestone.findFirst({ select: { id: true }, where: { id: milestoneId, projectId } });
      if (!milestone) return { success: false, error: 'A milestone selecionada não pertence a este projeto.' };
    }

    await updateProjectTask(id, { category, description, estimatedMinutes, milestoneId, status, title });
    revalidateProjectPaths(projectId);
    return { success: true, message: 'Tarefa atualizada.' };
  } catch (error) {
    console.error('Failed to update project task', { error, projectId, taskId: id });
    return { success: false, error: genericTaskError };
  }
}
export async function updateProjectTaskTitleAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  const id = requiredString(formData.get('taskId'));
  const projectId = requiredString(formData.get('projectId'));
  const title = requiredString(formData.get('title'));

  if (!id || !projectId) return { success: false, error: genericTaskError };
  if (!title) return { success: false, error: 'O título da tarefa é obrigatório.' };

  try {
    const task = await prisma.projectTask.findFirst({ select: { id: true }, where: { id, projectId } });
    if (!task) return { success: false, error: 'A tarefa selecionada não pertence a este projeto.' };

    await updateProjectTask(id, { title });
    revalidateProjectPaths(projectId);
    return { success: true, message: 'Guardado' };
  } catch (error) {
    console.error('Failed to update project task title', { error, projectId, taskId: id });
    return { success: false, error: genericTaskError };
  }
}

export async function updateProjectTaskDescriptionAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  const id = requiredString(formData.get('taskId'));
  const projectId = requiredString(formData.get('projectId'));
  const description = optionalString(formData.get('description'));

  if (!id || !projectId) return { success: false, error: genericTaskError };

  try {
    const task = await prisma.projectTask.findFirst({ select: { id: true }, where: { id, projectId } });
    if (!task) return { success: false, error: 'A tarefa selecionada não pertence a este projeto.' };

    await updateProjectTask(id, { description });
    revalidateProjectPaths(projectId);
    return { success: true, message: 'Guardado' };
  } catch (error) {
    console.error('Failed to update project task description', { error, projectId, taskId: id });
    return { success: false, error: genericTaskError };
  }
}
export async function updateProjectTaskEstimateAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  const id = requiredString(formData.get('taskId'));
  const projectId = requiredString(formData.get('projectId'));
  const rawEstimate = requiredString(formData.get('estimate'));
  const estimatedMinutes = parseOptionalEstimateToMinutes(rawEstimate);

  if (!id || !projectId) return { success: false, error: genericTaskError };
  if (estimatedMinutes === 'INVALID') return { success: false, error: 'Use um formato como 2h, 30m ou 1h 30m.' };

  try {
    const task = await prisma.projectTask.findFirst({ select: { id: true }, where: { id, projectId } });
    if (!task) return { success: false, error: 'A tarefa selecionada não pertence a este projeto.' };

    await updateProjectTask(id, { estimatedMinutes });
    revalidateProjectPaths(projectId);
    return { success: true, message: 'Guardado' };
  } catch (error) {
    console.error('Failed to update project task estimate', { error, projectId, taskId: id });
    return { success: false, error: genericTaskError };
  }
}
export async function updateProjectTaskStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = requiredString(formData.get('taskId'));
  const projectId = requiredString(formData.get('projectId'));
  const status = parseTaskStatus(formData.get('status'));

  if (!id || !projectId || !status) return;

  try {
    await updateProjectTask(id, { status });
    revalidateProjectPaths(projectId);
  } catch (error) {
    console.error('Failed to update project task status', error);
  }
}

export async function moveProjectTaskStatusAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  const id = requiredString(formData.get('taskId'));
  const projectId = requiredString(formData.get('projectId'));
  const status = parseTaskStatus(formData.get('status'));

  if (!id || !projectId || !status) return { success: false, error: 'Não foi possível atualizar o estado da tarefa.' };

  try {
    const task = await prisma.projectTask.findFirst({ select: { id: true }, where: { id, projectId } });
    if (!task) return { success: false, error: 'A tarefa selecionada não pertence a este projeto.' };

    await updateProjectTask(id, { status });
    revalidateProjectPaths(projectId);
    return { success: true };
  } catch (error) {
    console.error('Failed to move project task status', { error, projectId, status, taskId: id });
    return { success: false, error: 'Não foi possível atualizar o estado da tarefa.' };
  }
}

export async function createProjectTimeEntryAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  try {
    const projectId = requiredString(formData.get('projectId'));
    const taskId = requiredString(formData.get('taskId'));
    const category = parseWorkCategory(formData.get('category'));
    const durationMinutes = parseHoursToMinutes(formData.get('durationHours'));
    const entryDate = parseDateOnly(formData.get('entryDate'));

    if (!projectId) return { success: false, error: genericTimeEntryError };
    if (!taskId) return { success: false, error: 'A tarefa é obrigatória.' };
    if (!category) return { success: false, error: 'A categoria é obrigatória.' };
    if (entryDate === 'INVALID') return { success: false, error: 'A data é obrigatória e tem de ser válida.' };
    if (durationMinutes === 'INVALID') return { success: false, error: 'Use um formato como 30m, 1h ou 1h 30m.' };

    const task = await prisma.projectTask.findFirst({ select: { id: true }, where: { id: taskId, projectId } });
    if (!task) return { success: false, error: 'A tarefa selecionada não pertence a este projeto.' };

    await createProjectTimeEntry({ category, description: optionalString(formData.get('description')), durationMinutes, entryDate, projectId, taskId });

    revalidateProjectPaths(projectId);
    return { success: true, message: 'Tempo registado com sucesso.' };
  } catch (error) {
    console.error('Failed to create project time entry', error);
    return { success: false, error: genericTimeEntryError };
  }
}

export async function deleteProjectTimeEntryAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = requiredString(formData.get('timeEntryId'));
  const projectId = requiredString(formData.get('projectId'));

  if (!id || !projectId) return;

  try {
    await deleteProjectTimeEntry(id);
    revalidateProjectPaths(projectId);
  } catch (error) {
    console.error('Failed to delete project time entry', error);
  }
}

export async function startProjectTaskTimerAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  try {
    const projectId = requiredString(formData.get('projectId'));
    const taskId = requiredString(formData.get('taskId'));
    const category = parseWorkCategory(formData.get('category'));

    if (!projectId || !taskId || !category) return { success: false, error: genericTimeEntryError };

    const task = await prisma.projectTask.findFirst({ select: { id: true }, where: { id: taskId, projectId } });
    if (!task) return { success: false, error: 'A tarefa selecionada não pertence a este projeto.' };

    const activeTimer = await prisma.projectTimerSession.findFirst({
      select: { id: true },
      where: { projectId, status: { in: ['RUNNING', 'PAUSED'] } },
    });

    if (activeTimer) return { success: false, error: 'Já existe um timer ativo neste projeto.' };

    const timerSession = await prisma.projectTimerSession.create({
      data: {
        category,
        description: optionalString(formData.get('description')),
        projectId,
        startedAt: new Date(),
        taskId,
      },
      include: { task: { select: { id: true, title: true } } },
    });

    revalidateProjectPaths(projectId);
    return { success: true, timerSession };
  } catch (error) {
    console.error('Failed to start project task timer', error);
    return { success: false, error: 'Não foi possível iniciar o timer.' };
  }
}

export async function pauseProjectTaskTimerAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  try {
    const projectId = requiredString(formData.get('projectId'));
    const timerId = requiredString(formData.get('timerId'));
    if (!projectId || !timerId) return { success: false, error: genericTimeEntryError };

    const timer = await prisma.projectTimerSession.findFirst({ where: { id: timerId, projectId, status: 'RUNNING' } });
    if (!timer) return { success: false, error: 'Timer ativo não encontrado.' };

    const timerSession = await prisma.projectTimerSession.update({
      data: {
        accumulatedSeconds: timer.accumulatedSeconds + elapsedSecondsSince(timer.startedAt),
        pausedAt: new Date(),
        status: 'PAUSED',
      },
      include: { task: { select: { id: true, title: true } } },
      where: { id: timer.id },
    });

    revalidateProjectPaths(projectId);
    return { success: true, timerSession };
  } catch (error) {
    console.error('Failed to pause project task timer', error);
    return { success: false, error: 'Não foi possível pausar o timer.' };
  }
}

export async function resumeProjectTaskTimerAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  try {
    const projectId = requiredString(formData.get('projectId'));
    const timerId = requiredString(formData.get('timerId'));
    if (!projectId || !timerId) return { success: false, error: genericTimeEntryError };

    const timer = await prisma.projectTimerSession.findFirst({ where: { id: timerId, projectId, status: 'PAUSED' } });
    if (!timer) return { success: false, error: 'Timer pausado não encontrado.' };

    const timerSession = await prisma.projectTimerSession.update({
      data: { pausedAt: null, startedAt: new Date(), status: 'RUNNING' },
      include: { task: { select: { id: true, title: true } } },
      where: { id: timer.id },
    });

    revalidateProjectPaths(projectId);
    return { success: true, timerSession };
  } catch (error) {
    console.error('Failed to resume project task timer', error);
    return { success: false, error: 'Não foi possível retomar o timer.' };
  }
}

export async function resetProjectTaskTimerAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  try {
    const projectId = requiredString(formData.get('projectId'));
    const timerId = requiredString(formData.get('timerId'));
    if (!projectId || !timerId) return { success: false, error: genericTimeEntryError };

    const timer = await prisma.projectTimerSession.findFirst({
      select: { id: true, projectId: true, taskId: true },
      where: { id: timerId, projectId, status: { in: ['RUNNING', 'PAUSED'] } },
    });
    if (!timer) return { success: false, error: 'Timer não encontrado.' };

    await prisma.projectTimerSession.update({
      data: {
        accumulatedSeconds: 0,
        pausedAt: null,
        status: 'STOPPED',
      },
      where: { id: timer.id },
    });

    revalidateProjectPaths(projectId);
    return { resetTimerId: timer.id, success: true };
  } catch (error) {
    console.error('Failed to reset project task timer', error);
    return { success: false, error: 'Não foi possível reiniciar o timer.' };
  }
}
export async function stopProjectTaskTimerAction(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdmin();

  try {
    const projectId = requiredString(formData.get('projectId'));
    const timerId = requiredString(formData.get('timerId'));
    if (!projectId || !timerId) return { success: false, error: genericTimeEntryError };

    const timer = await prisma.projectTimerSession.findFirst({ where: { id: timerId, projectId, status: { in: ['RUNNING', 'PAUSED'] } } });
    if (!timer) return { success: false, error: 'Timer não encontrado.' };

    const totalSeconds = timer.accumulatedSeconds + (timer.status === 'RUNNING' ? elapsedSecondsSince(timer.startedAt) : 0);
    const durationMinutes = Math.max(1, Math.round(totalSeconds / 60));

    await prisma.$transaction([
      prisma.projectTimeEntry.create({
        data: {
          category: timer.category,
          description: optionalString(formData.get('description')) ?? timer.description,
          durationMinutes,
          entryDate: new Date(),
          projectId,
          taskId: timer.taskId,
        },
      }),
      prisma.projectTimerSession.update({
        data: {
          accumulatedSeconds: totalSeconds,
          pausedAt: null,
          status: 'STOPPED',
        },
        where: { id: timer.id },
      }),
    ]);

    revalidateProjectPaths(projectId);
    return { success: true, message: 'Timer parado e tempo registado.' };
  } catch (error) {
    console.error('Failed to stop project task timer', error);
    return { success: false, error: 'Não foi possível parar o timer.' };
  }
}

function parseProjectFormData(formData: FormData) {
  const name = requiredString(formData.get('name'));
  const clientName = requiredString(formData.get('clientName'));
  const status = parseProjectStatus(formData.get('status'));
  const growthPhase = parseGrowthPhase(formData.get('growthPhase'));
  const contractedValueCents = parseEuroToCents(formData.get('contractedValue'));
  const startDate = parseOptionalDateOnly(formData.get('startDate'));
  const targetEndDate = parseOptionalDateOnly(formData.get('targetEndDate'));

  if (!name) return { ok: false as const, error: 'O nome do projeto é obrigatório.' };
  if (!clientName) return { ok: false as const, error: 'O cliente é obrigatório.' };
  if (!status) return { ok: false as const, error: 'O estado é obrigatório.' };
  if (!growthPhase) return { ok: false as const, error: 'A fase é obrigatória.' };
  if (!contractedValueCents || contractedValueCents < 0) return { ok: false as const, error: 'O valor contratado deve ser superior a zero.' };
  if (startDate === 'INVALID' || targetEndDate === 'INVALID') return { ok: false as const, error: 'Selecione datas válidas.' };
  if (startDate && targetEndDate && targetEndDate < startDate) return { ok: false as const, error: 'A data prevista não pode ser anterior ao início.' };

  return {
    ok: true as const,
    data: {
      clientName,
      commercialCondition: optionalString(formData.get('commercialCondition')),
      contractedValueCents,
      contractId: optionalString(formData.get('contractId')),
      currency: 'EUR',
      description: optionalString(formData.get('description')),
      growthPhase,
      leadId: optionalString(formData.get('leadId')),
      name,
      planName: optionalString(formData.get('planName')),
      proposalId: optionalString(formData.get('proposalId')),
      startDate,
      status,
      targetEndDate,
    },
  };
}

function revalidateProjectPaths(projectId: string): void {
  revalidatePath('/admin/projects');
  revalidatePath(`/admin/projects/${projectId}`);
}

function requiredString(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim();
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const trimmed = requiredString(value);
  return trimmed || null;
}

function parseProjectStatus(value: FormDataEntryValue | null): ProjectStatus | null {
  const raw = requiredString(value) as ProjectStatus;
  return projectStatuses.includes(raw) ? raw : null;
}

function parseGrowthPhase(value: FormDataEntryValue | null): ProjectGrowthPhase | null {
  const raw = requiredString(value) as ProjectGrowthPhase;
  return projectGrowthPhases.includes(raw) ? raw : null;
}

function parseMilestoneStatus(value: FormDataEntryValue | null): ProjectMilestoneStatus | null {
  const raw = requiredString(value) as ProjectMilestoneStatus;
  return projectMilestoneStatuses.includes(raw) ? raw : null;
}

function parseTaskStatus(value: FormDataEntryValue | null): ProjectTaskStatus | null {
  const raw = requiredString(value) as ProjectTaskStatus;
  return projectTaskStatuses.includes(raw) ? raw : null;
}

function parseWorkCategory(value: FormDataEntryValue | null): ProjectWorkCategory | null {
  const raw = requiredString(value) as ProjectWorkCategory;
  return projectWorkCategories.includes(raw) ? raw : null;
}

function elapsedSecondsSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
}

type ParsedDateOnly = Date | null | 'INVALID';

function parseDateOnly(value: FormDataEntryValue | null): Date | 'INVALID' {
  return parseOptionalDateOnly(value) ?? 'INVALID';
}

function parseOptionalDateOnly(value: FormDataEntryValue | null): ParsedDateOnly {
  const raw = requiredString(value);
  if (!raw) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return 'INVALID';

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) {
    return 'INVALID';
  }

  return date;
}

function parseHoursToMinutes(value: FormDataEntryValue | null): number | 'INVALID' {
  const minutes = parseDurationToMinutes(requiredString(value));

  if (minutes === null || minutes <= 0 || minutes > 12 * 60) return 'INVALID';
  return minutes;
}

function parseOptionalHoursToMinutes(value: FormDataEntryValue | null): number | null | 'INVALID' {
  return parseOptionalEstimateToMinutes(requiredString(value));
}

function parseOptionalEstimateToMinutes(value: string): number | null | 'INVALID' {
  if (!value.trim()) return null;

  const minutes = parseDurationToMinutes(value);
  return minutes === null || minutes < 0 ? 'INVALID' : minutes;
}

function mapProjectError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const labels: Record<string, string> = {
      CONTRACT_LEAD_MISMATCH: 'O contrato selecionado não pertence à lead escolhida.',
      CONTRACT_PROPOSAL_MISMATCH: 'O contrato selecionado não pertence à proposta escolhida.',
      INVALID_CONTRACT: 'O contrato selecionado é inválido.',
      INVALID_LEAD: 'A lead selecionada é inválida.',
      INVALID_PROPOSAL: 'A proposta selecionada é inválida.',
      PROPOSAL_LEAD_MISMATCH: 'A proposta selecionada não pertence à lead escolhida.',
    };

    return labels[error.message] ?? fallback;
  }

  return fallback;
}
