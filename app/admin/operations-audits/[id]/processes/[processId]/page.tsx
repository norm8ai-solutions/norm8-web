import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Blocks, Database, ListOrdered, OctagonAlert, Sparkles } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminPanel, AdminStatCard } from '@/components/admin/AdminPrimitives';
import { ProcessOverviewForm } from '@/components/admin/operations-audits/ProcessOverviewForm';
import { ProcessSteps } from '@/components/admin/operations-audits/ProcessSteps';
import { ProcessSystems } from '@/components/admin/operations-audits/ProcessSystems';
import { ProcessDataSources } from '@/components/admin/operations-audits/ProcessDataSources';
import { ProcessStakeholders } from '@/components/admin/operations-audits/ProcessStakeholders';
import { ProcessBottlenecks } from '@/components/admin/operations-audits/ProcessBottlenecks';
import { ProcessBaseline } from '@/components/admin/operations-audits/ProcessBaseline';
import { ProcessOpportunities } from '@/components/admin/operations-audits/ProcessOpportunities';
import { requireAdmin } from '@/lib/admin/auth';
import { formatProcessMappingStatus, getOperationsProcessById } from '@/lib/operations-audits/service';

export default async function OperationsProcessDetailPage({ params }: { params: Promise<{ id: string; processId: string }> }) {
  await requireAdmin();
  const { id: auditId, processId } = await params;
  const process = await getOperationsProcessById(auditId, processId);
  if (!process) notFound();

  return <div className="admin-page-grid operations-process-page">
    <AdminPanel title={process.name} subtitle={`${process.audit.lead.company} · ${process.audit.name}`} action={<div className="admin-filters"><AdminBadge tone="slate">{formatProcessMappingStatus(process.status)}</AdminBadge><Link className="admin-button admin-button-muted" href={`/admin/operations-audits/${auditId}`}><ArrowLeft size={14} />Voltar à auditoria</Link></div>}>
      <div className="admin-kpi-grid">
        <AdminStatCard icon={<ListOrdered size={16} />} label="Steps" value={process._count.tasks} context="Sequência operacional mapeada." />
        <AdminStatCard icon={<Blocks size={16} />} label="Sistemas" value={process._count.systems} context="Ferramentas associadas ao processo." />
        <AdminStatCard icon={<Database size={16} />} label="Data sources" value={process._count.dataSources} context="Fontes de informação associadas ao processo." />
        <AdminStatCard icon={<OctagonAlert size={16} />} label="Bottlenecks" value={process._count.bottlenecks} context={`${process._count.baselines} métricas de baseline.`} />
        <AdminStatCard icon={<Sparkles size={16} />} label="Opportunities" value={process._count.opportunities} context="Hipóteses de automação descobertas." />
      </div>
    </AdminPanel>
    <nav aria-label="Secções do processo" className="operations-process-section-nav"><a href="#overview">Overview</a><a href="#people">People</a><a href="#steps">Steps</a><a href="#systems">Systems</a><a href="#data">Data</a><a href="#bottlenecks">Bottlenecks</a><a href="#baseline">Baseline</a><a href="#opportunities">Opportunities</a></nav>
    <AdminPanel id="overview" title="Core Definition" subtitle="Defina onde o processo começa, o trabalho observado e o resultado que marca a conclusão."><ProcessOverviewForm auditId={auditId} process={process} /></AdminPanel>
    <AdminPanel id="people" title="People" subtitle="Owner operacional e participants deste processo."><ProcessStakeholders auditId={auditId} processId={process.id} stakeholders={process.audit.stakeholders} owner={process.ownerStakeholder} participants={process.stakeholderLinks.map(({ stakeholder }) => stakeholder)} /></AdminPanel>
    <AdminPanel id="steps" title="Steps" subtitle={`${process._count.tasks} steps · sequência operacional do trigger ao outcome.`}><ProcessSteps auditId={auditId} availableStakeholders={process.audit.stakeholders} availableSystems={process.audit.systems} processId={process.id} trigger={process.trigger} outcome={process.endState} tasks={process.tasks} /></AdminPanel>
    <AdminPanel id="systems" title="Systems" subtitle="Ferramentas usadas neste workflow; o registry continua centralizado na auditoria."><ProcessSystems auditId={auditId} processId={process.id} systems={process.audit.systems} linked={process.systems.map(({ system }) => system)} /></AdminPanel>
    <AdminPanel id="data" title="Data" subtitle="Fontes de informação das quais este workflow depende."><ProcessDataSources auditId={auditId} processId={process.id} dataSources={process.audit.dataSources} linked={process.dataSources.map(({ dataSource }) => dataSource)} /></AdminPanel>
    <AdminPanel id="bottlenecks" title="Bottlenecks" subtitle={`${process._count.bottlenecks} problemas observados neste processo.`}><ProcessBottlenecks auditId={auditId} processId={process.id} tasks={process.tasks} bottlenecks={process.bottlenecks} /></AdminPanel>
    <AdminPanel id="baseline" title="Baseline" subtitle={`${process._count.baselines} métricas do current state.`}><ProcessBaseline auditId={auditId} processId={process.id} metrics={process.baselines.map(metric=>({...metric,numericValue:metric.numericValue?.toString()??null}))} /></AdminPanel>
    <AdminPanel id="opportunities" title="Automation Opportunities" subtitle={`${process._count.opportunities} hipóteses identificadas neste processo.`}><ProcessOpportunities auditId={auditId} processId={process.id} opportunities={process.opportunities} /></AdminPanel>
  </div>;
}
