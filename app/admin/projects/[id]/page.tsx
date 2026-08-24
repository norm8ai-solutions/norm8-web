import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock3, Euro, Percent } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { ProjectDetailWorkspace } from '@/components/admin/projects/ProjectDetailWorkspace';
import { requireAdmin } from '@/lib/admin/auth';
import {
  formatEffectiveHourlyRate,
  formatHoursFromMinutes,
  formatProjectGrowthPhase,
  formatProjectStatus,
  getProjectById,
  getProjectMetrics,
} from '@/lib/admin/projects';
import { formatCurrencyCents } from '@/lib/finance/formatters';

type ProjectDetailPageProps = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  await requireAdmin();
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) notFound();

  const metrics = getProjectMetrics(project);

  return (
    <div className="admin-page-grid projects-page">
      <AdminPanel
        title={project.name}
        subtitle={`${project.clientName} · ${formatProjectGrowthPhase(project.growthPhase)} · ${formatCurrencyCents(project.contractedValueCents, project.currency)}`}
        action={
          <div className="admin-filters">
            <ProjectStatusBadge status={project.status} />
            <AdminBadge tone="cyan">{formatProjectGrowthPhase(project.growthPhase)}</AdminBadge>
            <Link className="admin-button admin-button-muted" href="/admin/projects"><ArrowLeft size={14} />Voltar</Link>
          </div>
        }
      >
        <div className="admin-kpi-grid">
          <AdminStat label="Valor contratado" icon={<Euro size={16} />} value={formatCurrencyCents(project.contractedValueCents, project.currency)} />
          <AdminStat label="Horas trabalhadas" icon={<Clock3 size={16} />} value={formatHoursFromMinutes(metrics.totalWorkedMinutes)} />
          <AdminStat label="Receita efetiva por hora" icon={<Percent size={16} />} value={formatEffectiveHourlyRate(metrics.effectiveHourlyRateCents, project.currency)} />
          <AdminStat label="Progresso" icon={<BriefcaseBusiness size={16} />} value={`${metrics.projectProgressPercentage}%`} />
          <AdminStat label="Tarefas concluídas" icon={<CheckCircle2 size={16} />} value={`${metrics.completedTasks}/${metrics.totalTasks}`} />
          <AdminStat label="Milestones concluídas" icon={<CheckCircle2 size={16} />} value={`${metrics.completedMilestones}/${metrics.totalMilestones}`} />
        </div>
        <div className="project-progress-summary">
          <div className="project-progress-track" aria-label={`${metrics.projectProgressPercentage}% de progresso`}><span style={{ width: `${metrics.projectProgressPercentage}%` }} /></div>
          <span>{metrics.completedTasks} de {metrics.totalTasks} tarefas concluídas</span>
        </div>
      </AdminPanel>

      <ProjectDetailWorkspace metrics={metrics} project={project} />
    </div>
  );
}

function AdminStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="admin-stat-card" style={{ minHeight: 92 }}>
      <div className="admin-stat-top"><div className="admin-stat-icon">{icon}</div></div>
      <p className="admin-stat-label">{label}</p>
      <p className="admin-row-title">{value}</p>
    </article>
  );
}

function ProjectStatusBadge({ status }: { status: Parameters<typeof formatProjectStatus>[0] }) {
  const tone = status === 'COMPLETED' ? 'green' : status === 'PAUSED' ? 'yellow' : status === 'CANCELLED' ? 'red' : status === 'IN_PROGRESS' ? 'blue' : 'slate';
  return <AdminBadge tone={tone}>{formatProjectStatus(status)}</AdminBadge>;
}