import Link from 'next/link';
import { ArrowUpRight, ClipboardCheck, Plus, Route, Sparkles, Users } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminEmptyState, AdminPanel, AdminStatCard, AdminTable } from '@/components/admin/AdminPrimitives';
import { requireAdmin } from '@/lib/admin/auth';
import { formatOperationsAuditStatus, getOperationsAudits } from '@/lib/operations-audits/service';

export default async function OperationsAuditsPage() {
  await requireAdmin();
  const audits = await getOperationsAudits();
  const active = audits.filter((audit) => ['PLANNED', 'IN_PROGRESS', 'ANALYSIS'].includes(audit.status)).length;
  const processes = audits.reduce((sum, audit) => sum + audit._count.processes, 0);
  const opportunities = audits.reduce((sum, audit) => sum + audit._count.opportunities, 0);

  return <div className="admin-page-grid">
    <AdminPanel title="AI Operations Audit" subtitle="Transformar observação operacional em decisões de produto baseadas em evidência." action={<Link className="admin-button" href="/admin/operations-audits/new"><Plus size={14} />Nova auditoria</Link>}>
      <div className="admin-kpi-grid">
        <AdminStatCard icon={<ClipboardCheck size={16} />} label="Auditorias" value={audits.length} context={`${active} planeadas ou em curso.`} />
        <AdminStatCard icon={<Route size={16} />} label="Processos mapeados" value={processes} context="Workflows estruturados em todas as auditorias." />
        <AdminStatCard icon={<Sparkles size={16} />} label="Oportunidades" value={opportunities} context="Hipóteses de automação identificadas." />
        <AdminStatCard icon={<Users size={16} />} label="Empresas" value={new Set(audits.map((audit) => audit.leadId)).size} context="Empresas com evidência operacional." />
      </div>
    </AdminPanel>
    <AdminPanel title="Auditorias" subtitle={`${audits.length} registos`}>
      {audits.length ? <AdminTable headers={['Auditoria', 'Empresa', 'Estado', 'Owner', 'Processos', 'Oportunidades', 'Atualizada', '']}>
        {audits.map((audit) => <tr key={audit.id}>
          <td><strong className="finance-table-title">{audit.name}</strong></td>
          <td>{audit.lead.company}</td>
          <td><AdminBadge tone={audit.status === 'COMPLETED' ? 'green' : audit.status === 'IN_PROGRESS' ? 'blue' : 'slate'}>{formatOperationsAuditStatus(audit.status)}</AdminBadge></td>
          <td>{audit.owner?.name ?? 'Sem owner'}</td><td>{audit._count.processes}</td><td>{audit._count.opportunities}</td>
          <td>{new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(audit.updatedAt)}</td>
          <td><Link className="admin-link finance-table-link" href={`/admin/operations-audits/${audit.id}`}>Abrir <ArrowUpRight size={13} /></Link></td>
        </tr>)}
      </AdminTable> : <AdminEmptyState>Ainda não existem auditorias. Crie a primeira a partir de uma empresa já existente no CRM.</AdminEmptyState>}
    </AdminPanel>
  </div>;
}
