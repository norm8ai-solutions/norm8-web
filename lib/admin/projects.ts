import 'server-only';

import type {
  Prisma,
  ProjectGrowthPhase,
  ProjectMilestoneStatus,
  ProjectStatus,
  ProjectTaskStatus,
  ProjectWorkCategory,
} from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import { formatCurrencyCents } from '@/lib/finance/formatters';

export const projectStatuses: ProjectStatus[] = ['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'];
export const projectGrowthPhases: ProjectGrowthPhase[] = ['LAUNCH', 'OPERATE', 'SCALE'];
export const projectMilestoneStatuses: ProjectMilestoneStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
export const projectTaskStatuses: ProjectTaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'CANCELLED'];
export const projectWorkCategories: ProjectWorkCategory[] = ['DEVELOPMENT', 'DESIGN', 'MEETING', 'CLIENT_COMMUNICATION', 'QA', 'DEPLOYMENT', 'ADMIN'];

export type ProjectDetail = Prisma.ProjectGetPayload<{
  include: {
    contract: { select: { id: true; number: true; title: true } };
    lead: { select: { id: true; company: true; email: true; name: true } };
    milestones: { include: { tasks: true }; orderBy: { order: 'asc' } };
    proposal: { select: { id: true; title: true; status: true } };
    tasks: { include: { milestone: { select: { id: true; title: true } }; timeEntries: true }; orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] };
    timeEntries: { include: { task: { select: { id: true; title: true } } }; orderBy: { entryDate: 'desc' } };
    timerSessions: { include: { task: { select: { id: true; title: true } } }; orderBy: { updatedAt: 'desc' } };
  };
}>;

export type ProjectSummary = Prisma.ProjectGetPayload<{
  include: { milestones: true; tasks: true; timeEntries: true };
}>;

export type ProjectMetrics = {
  completedMilestones: number;
  completedTasks: number;
  contractedValueCents: number;
  effectiveHourlyRateCents: number | null;
  milestoneProgressPercentage: number;
  projectProgressPercentage: number;
  taskProgressPercentage: number;
  totalMilestones: number;
  totalTasks: number;
  totalWorkedHours: number;
  totalWorkedMinutes: number;
  workedHoursByCategory: Record<ProjectWorkCategory, number>;
  workedMinutesByCategory: Record<ProjectWorkCategory, number>;
};

export type ProjectFormOptions = {
  contracts: Array<{ id: string; label: string; leadId: string | null; proposalId: string | null }>;
  leads: Array<{ id: string; label: string }>;
  proposals: Array<{ id: string; label: string; leadId: string }>;
};

export type CreateProjectInput = {
  clientName: string;
  commercialCondition?: string | null;
  contractedValueCents: number;
  contractId?: string | null;
  currency?: string;
  description?: string | null;
  growthPhase: ProjectGrowthPhase;
  leadId?: string | null;
  name: string;
  planName?: string | null;
  proposalId?: string | null;
  startDate?: Date | null;
  status: ProjectStatus;
  targetEndDate?: Date | null;
};

export async function getProjects(): Promise<ProjectSummary[]> {
  return prisma.project.findMany({
    include: { milestones: true, tasks: true, timeEntries: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getProjectById(projectId: string): Promise<ProjectDetail | null> {
  if (!projectId.trim()) return null;

  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      contract: { select: { id: true, number: true, title: true } },
      lead: { select: { id: true, company: true, email: true, name: true } },
      milestones: { include: { tasks: true }, orderBy: { order: 'asc' } },
      proposal: { select: { id: true, title: true, status: true } },
      tasks: {
        include: { milestone: { select: { id: true, title: true } }, timeEntries: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      },
      timeEntries: { include: { task: { select: { id: true, title: true } } }, orderBy: { entryDate: 'desc' } },
      timerSessions: {
        include: { task: { select: { id: true, title: true } } },
        orderBy: { updatedAt: 'desc' },
        where: { status: { in: ['RUNNING', 'PAUSED'] } },
      },
    },
  });
}

export async function getProjectFormOptions(): Promise<ProjectFormOptions> {
  const [leads, proposals, contracts] = await Promise.all([
    prisma.lead.findMany({ orderBy: { company: 'asc' }, select: { company: true, email: true, id: true } }),
    prisma.proposal.findMany({ orderBy: { createdAt: 'desc' }, select: { companyName: true, id: true, leadId: true, status: true, title: true } }),
    prisma.contract.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, leadId: true, number: true, proposalId: true, title: true } }),
  ]);

  return {
    contracts: contracts.map((contract) => ({
      id: contract.id,
      label: `${contract.number} - ${contract.title}`,
      leadId: contract.leadId,
      proposalId: contract.proposalId,
    })),
    leads: leads.map((lead) => ({
      id: lead.id,
      label: `${lead.company}${lead.email ? ` - ${lead.email}` : ''}`,
    })),
    proposals: proposals.map((proposal) => ({
      id: proposal.id,
      label: `${proposal.title} - ${proposal.companyName} (${proposal.status})`,
      leadId: proposal.leadId,
    })),
  };
}

export async function createProject(input: CreateProjectInput) {
  await validateCommercialLinks(input);

  return prisma.project.create({
    data: {
      clientName: input.clientName,
      commercialCondition: input.commercialCondition ?? null,
      contractedValueCents: input.contractedValueCents,
      contractId: input.contractId ?? null,
      currency: input.currency ?? 'EUR',
      description: input.description ?? null,
      growthPhase: input.growthPhase,
      leadId: input.leadId ?? null,
      name: input.name,
      planName: input.planName ?? null,
      proposalId: input.proposalId ?? null,
      startDate: input.startDate ?? null,
      status: input.status,
      targetEndDate: input.targetEndDate ?? null,
    },
  });
}

export async function updateProject(projectId: string, input: Partial<CreateProjectInput>) {
  await validateCommercialLinks(input);

  return prisma.project.update({
    data: {
      clientName: input.clientName,
      commercialCondition: input.commercialCondition,
      contractedValueCents: input.contractedValueCents,
      contractId: input.contractId,
      currency: input.currency,
      description: input.description,
      growthPhase: input.growthPhase,
      leadId: input.leadId,
      name: input.name,
      planName: input.planName,
      proposalId: input.proposalId,
      startDate: input.startDate,
      status: input.status,
      targetEndDate: input.targetEndDate,
    },
    where: { id: projectId },
  });
}

export async function createProjectMilestone(input: { description?: string | null; dueDate?: Date | null; projectId: string; title: string }) {
  const order = await prisma.projectMilestone.count({ where: { projectId: input.projectId } });

  return prisma.projectMilestone.create({
    data: {
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      order: order + 1,
      projectId: input.projectId,
      title: input.title,
    },
  });
}

export async function updateProjectMilestone(id: string, input: { description?: string | null; dueDate?: Date | null; status?: ProjectMilestoneStatus; title?: string }) {
  return prisma.projectMilestone.update({
    data: {
      completedAt: input.status === 'DONE' ? new Date() : input.status ? null : undefined,
      description: input.description,
      dueDate: input.dueDate,
      status: input.status,
      title: input.title,
    },
    where: { id },
  });
}

export async function createProjectTask(input: { category: ProjectWorkCategory; description?: string | null; estimatedMinutes?: number | null; milestoneId?: string | null; projectId: string; status?: ProjectTaskStatus; title: string }) {
  const order = await prisma.projectTask.count({ where: { projectId: input.projectId } });

  return prisma.projectTask.create({
    data: {
      category: input.category,
      description: input.description ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      milestoneId: input.milestoneId ?? null,
      order: order + 1,
      projectId: input.projectId,
      status: input.status ?? 'TODO',
      title: input.title,
    },
  });
}

export async function updateProjectTask(id: string, input: { category?: ProjectWorkCategory; description?: string | null; estimatedMinutes?: number | null; milestoneId?: string | null; status?: ProjectTaskStatus; title?: string }) {
  return prisma.projectTask.update({
    data: {
      category: input.category,
      completedAt: input.status === 'DONE' ? new Date() : input.status ? null : undefined,
      description: input.description,
      estimatedMinutes: input.estimatedMinutes,
      milestoneId: input.milestoneId,
      status: input.status,
      title: input.title,
    },
    where: { id },
  });
}

export async function createProjectTimeEntry(input: { category: ProjectWorkCategory; description?: string | null; durationMinutes: number; entryDate: Date; projectId: string; taskId: string }) {
  return prisma.projectTimeEntry.create({
    data: {
      category: input.category,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      entryDate: input.entryDate,
      projectId: input.projectId,
      taskId: input.taskId,
    },
  });
}

export async function deleteProjectTimeEntry(id: string) {
  return prisma.projectTimeEntry.delete({ where: { id } });
}

export function getProjectMetrics(project: Pick<ProjectSummary, 'contractedValueCents' | 'milestones' | 'tasks' | 'timeEntries'>): ProjectMetrics {
  const totalWorkedMinutes = project.timeEntries.reduce((sum, entry) => sum + safePositiveNumber(entry.durationMinutes), 0);
  const totalWorkedHours = roundHours(totalWorkedMinutes / 60);
  const completedTasks = project.tasks.filter((task) => task.status === 'DONE').length;
  const totalTasks = project.tasks.length;
  const completedMilestones = project.milestones.filter((milestone) => milestone.status === 'DONE').length;
  const totalMilestones = project.milestones.length;
  const workedMinutesByCategory = Object.fromEntries(projectWorkCategories.map((category) => [category, 0])) as Record<ProjectWorkCategory, number>;

  for (const entry of project.timeEntries) {
    workedMinutesByCategory[entry.category] += safePositiveNumber(entry.durationMinutes);
  }

  const workedHoursByCategory = Object.fromEntries(
    projectWorkCategories.map((category) => [category, roundHours(workedMinutesByCategory[category] / 60)]),
  ) as Record<ProjectWorkCategory, number>;

  return {
    completedMilestones,
    completedTasks,
    contractedValueCents: project.contractedValueCents,
    effectiveHourlyRateCents: totalWorkedHours > 0 ? Math.round(project.contractedValueCents / totalWorkedHours) : null,
    milestoneProgressPercentage: percentage(completedMilestones, totalMilestones),
    projectProgressPercentage: percentage(completedTasks, totalTasks),
    taskProgressPercentage: percentage(completedTasks, totalTasks),
    totalMilestones,
    totalTasks,
    totalWorkedHours,
    totalWorkedMinutes,
    workedHoursByCategory,
    workedMinutesByCategory,
  };
}

export function getProjectsOverviewMetrics(projects: ProjectSummary[]) {
  const activeProjects = projects.filter((project) => project.status === 'IN_PROGRESS' || project.status === 'PLANNED').length;
  const totalWorkedMinutes = projects.reduce((sum, project) => sum + getProjectMetrics(project).totalWorkedMinutes, 0);
  const contractedValueCents = projects.reduce((sum, project) => sum + project.contractedValueCents, 0);
  const workedProjects = projects.map(getProjectMetrics).filter((metrics) => metrics.totalWorkedHours > 0);
  const effectiveHourlyRateCents = workedProjects.length > 0
    ? Math.round(workedProjects.reduce((sum, metrics) => sum + (metrics.effectiveHourlyRateCents ?? 0), 0) / workedProjects.length)
    : null;

  return {
    activeProjects,
    contractedValueCents,
    effectiveHourlyRateCents,
    totalWorkedHours: roundHours(totalWorkedMinutes / 60),
    totalWorkedMinutes,
  };
}

export function formatProjectStatus(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    CANCELLED: 'Cancelado',
    COMPLETED: 'Concluído',
    IN_PROGRESS: 'Em curso',
    PAUSED: 'Pausado',
    PLANNED: 'Planeado',
  };

  return labels[status];
}

export function formatProjectGrowthPhase(phase: ProjectGrowthPhase): string {
  const labels: Record<ProjectGrowthPhase, string> = {
    LAUNCH: 'Launch',
    OPERATE: 'Operate',
    SCALE: 'Scale',
  };

  return labels[phase];
}

export function formatProjectMilestoneStatus(status: ProjectMilestoneStatus): string {
  const labels: Record<ProjectMilestoneStatus, string> = {
    DONE: 'Concluída',
    IN_PROGRESS: 'Em curso',
    TODO: 'Por fazer',
  };

  return labels[status];
}

export function formatProjectTaskStatus(status: ProjectTaskStatus): string {
  const labels: Record<ProjectTaskStatus, string> = {
    BLOCKED: 'Bloqueado',
    CANCELLED: 'Cancelado',
    DONE: 'Concluído',
    IN_PROGRESS: 'Em progresso',
    IN_REVIEW: 'Em validação',
    TODO: 'Por fazer',
  };

  return labels[status];
}

export function formatProjectWorkCategory(category: ProjectWorkCategory): string {
  const labels: Record<ProjectWorkCategory, string> = {
    ADMIN: 'Admin',
    CLIENT_COMMUNICATION: 'Client Communication',
    DEPLOYMENT: 'Deployment',
    DESIGN: 'Design',
    DEVELOPMENT: 'Development',
    MEETING: 'Meeting',
    QA: 'QA',
  };

  return labels[category];
}

export function formatHoursFromMinutes(minutes: number): string {
  const safeMinutes = safePositiveNumber(minutes);
  if (safeMinutes === 0) return '0h';

  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function formatDecimalHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0h';

  return `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(hours) ? 0 : 1 }).format(hours)}h`;
}

export function formatEffectiveHourlyRate(value: number | null, currency = 'EUR'): string {
  return value === null || !Number.isFinite(value) ? '—' : `${formatCurrencyCents(value, currency)}/h`;
}

function percentage(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function roundHours(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

function safePositiveNumber(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function validateCommercialLinks(input: Partial<CreateProjectInput>): Promise<void> {
  const [lead, proposal, contract] = await Promise.all([
    input.leadId ? prisma.lead.findUnique({ select: { id: true }, where: { id: input.leadId } }) : null,
    input.proposalId ? prisma.proposal.findUnique({ select: { id: true, leadId: true }, where: { id: input.proposalId } }) : null,
    input.contractId ? prisma.contract.findUnique({ select: { id: true, leadId: true, proposalId: true }, where: { id: input.contractId } }) : null,
  ]);

  if (input.leadId && !lead) throw new Error('INVALID_LEAD');
  if (input.proposalId && !proposal) throw new Error('INVALID_PROPOSAL');
  if (input.contractId && !contract) throw new Error('INVALID_CONTRACT');
  if (input.leadId && proposal && proposal.leadId !== input.leadId) throw new Error('PROPOSAL_LEAD_MISMATCH');
  if (input.leadId && contract?.leadId && contract.leadId !== input.leadId) throw new Error('CONTRACT_LEAD_MISMATCH');
  if (input.proposalId && contract?.proposalId && contract.proposalId !== input.proposalId) throw new Error('CONTRACT_PROPOSAL_MISMATCH');
}
