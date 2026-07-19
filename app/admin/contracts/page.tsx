import Link from 'next/link';
import { Clock3, FileSignature, FileText, PenLine, ShieldCheck, Sigma } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminEmptyState, AdminPanel, AdminStatCard, AdminTable } from '@/components/admin/AdminPrimitives';
import { formatDatePt } from '@/lib/admin/formatters';
import { formatContractPlan, formatContractStatus, formatContractValue } from '@/lib/contracts/formatters';
import { getContractsOverview } from '@/lib/contracts/queries';

export default async function AdminContractsPage() {
  const { contracts, metrics } = await getContractsOverview();

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title="Contratos"
        subtitle="Crie, personalize e acompanhe os contratos comerciais da Norm8."
        action={
          <Link className="admin-button" href="/admin/contracts/new">
            <FileSignature size={14} />
            Novo contrato
          </Link>
        }
      >
        <div className="admin-kpi-grid">
          <AdminStatCard icon={<FileText size={16} />} label="Total de contratos" value={metrics.total} context="Contratos registados no módulo." />
          <AdminStatCard icon={<PenLine size={16} />} label="Rascunhos" value={metrics.drafts} context="Contratos ainda editáveis." />
          <AdminStatCard icon={<Clock3 size={16} />} label="A aguardar assinatura" value={metrics.awaitingSignature} context="Preparado para fases futuras de assinatura." />
          <AdminStatCard icon={<ShieldCheck size={16} />} label="Assinados" value={metrics.signed} context="Contratos marcados como assinados." />
          <AdminStatCard icon={<Sigma size={16} />} label="Valor contratado" value={formatContractValue(metrics.contractedValue)} context="Soma dos contratos assinados." />
          <AdminStatCard icon={<Clock3 size={16} />} label="Expirados/Cancelados" value={metrics.expiredOrCancelled} context="Contratos fora do fluxo ativo." />
        </div>
      </AdminPanel>

      <AdminPanel title="Lista de contratos" subtitle={`${contracts.length} contratos encontrados`}>
        {contracts.length > 0 ? (
          <AdminTable headers={['Número', 'Cliente', 'Projeto', 'Plano', 'Valor', 'Estado', 'Data de criação', 'Última atualização', 'Responsável', 'Ações']}>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td>
                  <Link className="admin-link" href={`/admin/contracts/${contract.id}`}>
                    {contract.number}
                  </Link>
                </td>
                <td>{contract.lead?.company ?? getSnapshotText(contract.clientSnapshot, 'companyName') ?? 'Cliente por definir'}</td>
                <td>{contract.projectName ?? 'Projeto por definir'}</td>
                <td>{formatContractPlan(contract.plan)}</td>
                <td>{formatContractValue(contract.estimatedValue)}</td>
                <td><ContractStatusBadge status={contract.status} /></td>
                <td>{formatDatePt(contract.createdAt)}</td>
                <td>{formatDatePt(contract.updatedAt)}</td>
                <td>{contract.assignedTo?.name ?? contract.assignedTo?.email ?? contract.createdBy.name ?? contract.createdBy.email}</td>
                <td>
                  <div className="admin-filters">
                    <Link className="admin-link" href={`/admin/contracts/${contract.id}`}>Abrir</Link>
                    {contract.status === 'DRAFT' ? <Link className="admin-link" href={`/admin/contracts/${contract.id}?mode=edit`}>Editar</Link> : null}
                    <span className="admin-muted">PDF futuro</span>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState>Nenhum contrato criado ainda.</AdminEmptyState>
        )}
      </AdminPanel>
    </div>
  );
}

function ContractStatusBadge({ status }: { status: Parameters<typeof formatContractStatus>[0] }) {
  const tone = status === 'SIGNED' ? 'green' : status === 'DRAFT' ? 'yellow' : status === 'CANCELLED' || status === 'EXPIRED' || status === 'REJECTED' ? 'red' : 'blue';
  return <AdminBadge tone={tone}>{formatContractStatus(status)}</AdminBadge>;
}

function getSnapshotText(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
}