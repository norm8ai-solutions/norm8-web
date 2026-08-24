import Link from 'next/link';
import { ArrowUpRight, BriefcaseBusiness, Clock3, Euro, Percent, Plus } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminEmptyState, AdminPanel, AdminStatCard, AdminTable } from '@/components/admin/AdminPrimitives';
import { createAureusProjectAction } from '@/lib/admin/project-actions';
import { requireAdmin } from '@/lib/admin/auth';
import {
  formatDecimalHours,
  formatEffectiveHourlyRate,
  formatProjectGrowthPhase,
  formatProjectStatus,
  getProjectMetrics,
  getProjects,
  getProjectsOverviewMetrics,
} from '@/lib/admin/projects';
import { formatCurrencyCents } from '@/lib/finance/formatters';

export default async function AdminProjectsPage() {
  await requireAdmin();
  const projects = await getProjects();
  const overview = getProjectsOverviewMetrics(projects);

  return (
    <div className="admin-page-grid projects-page">
      <AdminPanel
        title="Projetos"
        subtitle={'Gestão operacional, progresso e rentabilidade das implementações da Norm8.'}
        action={<Link className="admin-button" href="/admin/projects/new"><Plus size={14} />Novo projeto</Link>}
      >
        <div className="admin-kpi-grid">
          <AdminStatCard icon={<BriefcaseBusiness size={16} />} label="Projetos ativos" value={String(overview.activeProjects)} context="Projetos planeados ou em curso." />
          <AdminStatCard icon={<Clock3 size={16} />} label="Horas registadas" value={formatDecimalHours(overview.totalWorkedHours)} context="Tempo total registado em projetos." />
          <AdminStatCard icon={<Euro size={16} />} label="Valor contratado" value={formatCurrencyCents(overview.contractedValueCents)} context="Soma do valor contratado nos projetos." />
          <AdminStatCard icon={<Percent size={16} />} label={'Receita efetiva média por hora'} value={formatEffectiveHourlyRate(overview.effectiveHourlyRateCents)} context={'Média dos projetos com horas registadas.'} />
        </div>
      </AdminPanel>

      <AdminPanel title="Lista de projetos" subtitle={`${projects.length} projetos registados`}>
        {projects.length > 0 ? (
          <AdminTable headers={['Projeto', 'Cliente', 'Fase', 'Estado', 'Valor contratado', 'Horas trabalhadas', 'Progresso', 'Receita/hora', 'Ações']}>
            {projects.map((project) => {
              const metrics = getProjectMetrics(project);

              return (
                <tr key={project.id}>
                  <td><strong className="finance-table-title">{project.name}</strong><span className="finance-table-meta">{project.planName ?? 'Sem plano'}{project.commercialCondition ? ` · ${project.commercialCondition}` : ''}</span></td>
                  <td>{project.clientName}</td>
                  <td><AdminBadge tone="cyan">{formatProjectGrowthPhase(project.growthPhase)}</AdminBadge></td>
                  <td><ProjectStatusBadge status={project.status} /></td>
                  <td>{formatCurrencyCents(project.contractedValueCents, project.currency)}</td>
                  <td>{formatDecimalHours(metrics.totalWorkedHours)}</td>
                  <td><ProjectProgress value={metrics.projectProgressPercentage} label={`${metrics.completedTasks} de ${metrics.totalTasks}`} /></td>
                  <td>{formatEffectiveHourlyRate(metrics.effectiveHourlyRateCents, project.currency)}</td>
                  <td><Link className="admin-link finance-table-link" href={`/admin/projects/${project.id}`}>Ver projeto <ArrowUpRight size={13} /></Link></td>
                </tr>
              );
            })}
          </AdminTable>
        ) : (
          <div className="finance-empty-state">
            <AdminEmptyState>
              <div className="projects-empty-state">
                <p className="projects-empty-state-title">{'Ainda não existem projetos.'}</p>
                <p className="projects-empty-state-description">{'Crie o primeiro projeto para acompanhar horas, progresso e rentabilidade de uma implementação.'}</p>
              </div>
            </AdminEmptyState>
            <form action={createAureusProjectAction}>
              <button className="admin-button" type="submit"><Plus size={14} />Criar projeto Aureus</button>
            </form>
          </div>
        )}
      </AdminPanel>
    </div>
  );
}

function ProjectProgress({ label, value }: { label: string; value: number }) {
  return (
    <div className="project-progress-cell">
      <div className="project-progress-track" aria-label={`${value}% de progresso`}><span style={{ width: `${value}%` }} /></div>
      <span>{value}% {'·'} {label}</span>
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: Parameters<typeof formatProjectStatus>[0] }) {
  const tone = status === 'COMPLETED' ? 'green' : status === 'PAUSED' ? 'yellow' : status === 'CANCELLED' ? 'red' : status === 'IN_PROGRESS' ? 'blue' : 'slate';
  return <AdminBadge tone={tone}>{formatProjectStatus(status)}</AdminBadge>;
}