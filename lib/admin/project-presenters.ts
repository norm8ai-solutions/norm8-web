import type {
  ProjectGrowthPhase,
  ProjectMilestoneStatus,
  ProjectStatus,
  ProjectTaskStatus,
  ProjectWorkCategory,
} from '@/app/generated/prisma/client';
import { formatCurrencyCents } from '@/lib/finance/formatters';

export type ProjectFormOptions = {
  contracts: Array<{ id: string; label: string; leadId: string | null; proposalId: string | null }>;
  leads: Array<{ id: string; label: string }>;
  proposals: Array<{ id: string; label: string; leadId: string }>;
};

export type ProjectFormProject = {
  id: string;
  milestones: Array<{ id: string; status: ProjectMilestoneStatus; title: string }>;
  tasks: Array<{ id: string; status: ProjectTaskStatus; title: string }>;
};

export const projectStatuses: ProjectStatus[] = ['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'];
export const projectGrowthPhases: ProjectGrowthPhase[] = ['LAUNCH', 'OPERATE', 'SCALE'];
export const projectMilestoneStatuses: ProjectMilestoneStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
export const projectTaskStatuses: ProjectTaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'CANCELLED'];
export const projectWorkCategories: ProjectWorkCategory[] = ['DEVELOPMENT', 'DESIGN', 'MEETING', 'CLIENT_COMMUNICATION', 'QA', 'DEPLOYMENT', 'ADMIN'];

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
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  if (safeMinutes === 0) return '0h';

  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function formatDecimalHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0h';

  return `${new Intl.NumberFormat('pt-PT', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(hours) ? 0 : 1,
  }).format(hours)}h`;
}

export function formatEffectiveHourlyRate(value: number | null, currency = 'EUR'): string {
  return value === null || !Number.isFinite(value) ? '—' : `${formatCurrencyCents(value, currency)}/h`;
}
