import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Database, Route, Sparkles, Users } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminEmptyState, AdminPanel, AdminStatCard, AdminTable } from '@/components/admin/AdminPrimitives';
import { ProcessQuickCapture } from '@/components/admin/operations-audits/ProcessQuickCapture';
import { AuditSystemsRegistry } from '@/components/admin/operations-audits/AuditSystemsRegistry';
import { AuditDataSourcesRegistry } from '@/components/admin/operations-audits/AuditDataSourcesRegistry';
import { AuditStakeholdersRegistry } from '@/components/admin/operations-audits/AuditStakeholdersRegistry';
import { requireAdmin } from '@/lib/admin/auth';
import { formatOperationsAuditStatus, formatProcessMappingStatus, getOperationsAuditById } from '@/lib/operations-audits/service';

export default async function OperationsAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const audit = await getOperationsAuditById(id);
  if (!audit) notFound();

  return <div className="admin-page-grid">
    <AdminPanel title={audit.name} subtitle={`${audit.lead.company} · ${audit.scope ?? 'Âmbito por definir'}`} action={<div className="admin-filters"><AdminBadge tone="blue">{formatOperationsAuditStatus(audit.status)}</AdminBadge><Link className="admin-button admin-button-muted" href="/admin/operations-audits"><ArrowLeft size={14} />Voltar</Link></div>}>
      <div className="admin-kpi-grid">
        <AdminStatCard icon={<Route size={16} />} label="Processos" value={audit._count.processes} context="Workflows capturados e estruturados." />
        <AdminStatCard icon={<Users size={16} />} label="People mapped" value={audit._count.stakeholders} context={`${audit.stakeholders.filter((stakeholder) => stakeholder.interviewStatus === 'INTERVIEWED').length} interviewed.`} />
        <AdminStatCard icon={<Database size={16} />} label="Sistemas" value={audit._count.systems} context={`${audit._count.dataSources} fontes de dados.`} />
        <AdminStatCard icon={<Sparkles size={16} />} label="Oportunidades" value={audit._count.opportunities} context="Oportunidades avaliadas." />
      </div>
    </AdminPanel>
    <AdminPanel title="Overview" subtitle="A fundação desta auditoria e o progresso de mapeamento.">
      <div className="admin-grid-2">
        <div><p className="admin-field-label">Empresa</p><p className="admin-row-title">{audit.lead.company}</p><p className="admin-row-meta">{audit.lead.name ?? audit.lead.email}</p></div>
        <div><p className="admin-field-label">Owner</p><p className="admin-row-title">{audit.owner?.name ?? 'Sem owner atribuído'}</p></div>
        <div><p className="admin-field-label">Objetivos</p><p className="admin-row-text">{audit.objectives ?? 'Ainda não definidos.'}</p></div>
        <div><p className="admin-field-label">Âmbito</p><p className="admin-row-text">{audit.scope ?? 'Ainda não definido.'}</p></div>
      </div>
    </AdminPanel>
    <AdminPanel title="Processos" subtitle={`${audit._count.processes} processos capturados · defina claramente START → WORK → OUTCOME.`} action={<ProcessQuickCapture auditId={audit.id} key={audit._count.processes} />}>
      {audit.processes.length ? <AdminTable headers={['Processo', 'Departamento', 'Trigger', 'Outcome', 'Estado', '']}>
        {audit.processes.map((process) => <tr key={process.id}>
          <td><strong className="finance-table-title">{process.name}</strong>{process.notes ? <span className="finance-table-meta">{process.notes}</span> : null}</td>
          <td>{process.department ?? '—'}</td><td>{process.trigger ?? 'Por definir'}</td><td>{process.endState ?? 'Por definir'}</td>
          <td><AdminBadge tone={process.status === 'VALIDATED' ? 'green' : process.status === 'MAPPED' ? 'blue' : 'slate'}>{formatProcessMappingStatus(process.status)}</AdminBadge></td>
          <td><Link className="admin-link finance-table-link" href={`/admin/operations-audits/${audit.id}/processes/${process.id}`}>Abrir <ArrowUpRight size={13} /></Link></td>
        </tr>)}
      </AdminTable> : <AdminEmptyState><div className="operations-process-empty"><strong>Ainda não existem processos.</strong><span>Capture apenas o nome e, se possível, o trigger e outcome. Enriqueça os detalhes depois.</span><ProcessQuickCapture auditId={audit.id} /></div></AdminEmptyState>}
    </AdminPanel>
    <AdminPanel id="opportunities" title="Automation Opportunities" subtitle={`${audit._count.opportunities} oportunidades identificadas na auditoria.`}>
      {audit.opportunities.length?<AdminTable headers={['Oportunidade','Processo','Estado','']}>
        {audit.opportunities.map(opportunity=><tr key={opportunity.id}><td><strong className="finance-table-title">{opportunity.title??'Untitled opportunity'}</strong><span className="finance-table-meta">{opportunity.problem}</span></td><td>{opportunity.process.name}</td><td><AdminBadge tone="slate">{opportunity.status}</AdminBadge></td><td><Link className="admin-link finance-table-link" href={`/admin/operations-audits/${audit.id}/processes/${opportunity.process.id}/opportunities/${opportunity.id}`}>Abrir <ArrowUpRight size={13}/></Link></td></tr>)}
      </AdminTable>:<AdminEmptyState>As oportunidades são criadas no detalhe de cada processo.</AdminEmptyState>}
    </AdminPanel>
    <AdminPanel id="systems" title="Systems" subtitle={`${audit._count.systems} sistemas no registry desta auditoria.`}>
      <AuditSystemsRegistry auditId={audit.id} systems={audit.systems} />
    </AdminPanel>
    <AdminPanel id="data-sources" title="Data Sources" subtitle={`${audit._count.dataSources} fontes de informação identificadas nesta auditoria.`}>
      <AuditDataSourcesRegistry auditId={audit.id} dataSources={audit.dataSources} systems={audit.systems} />
    </AdminPanel>
    <AdminPanel id="people" title="People" subtitle={`${audit._count.stakeholders} stakeholders mapeados · ${audit.stakeholders.filter((stakeholder) => stakeholder.interviewStatus === 'INTERVIEWED').length} interviewed.`}>
      <AuditStakeholdersRegistry auditId={audit.id} stakeholders={audit.stakeholders} />
    </AdminPanel>
  </div>;
}
