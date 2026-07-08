/**
 * ------------------------------------------------------------------
 * File: app/admin/leads/page.tsx
 * Description: Leads list page for the Norm8 admin dashboard.
 * Responsibilities:
 * - List leads with search, status, and priority filters.
 * - Link to lead detail pages.
 * - Keep lead triage visible without entering Supabase.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import { Filter } from 'lucide-react';
import { Norm8Select } from '@/components/ui/norm8-select';
import type { LeadPriority, LeadStatus } from '@/app/generated/prisma/client';
import {
  LeadPriorityBadge,
  LeadStatusBadge,
} from '@/components/admin/AdminBadge';
import {
  AdminEmptyState,
  AdminPanel,
  AdminTable,
} from '@/components/admin/AdminPrimitives';
import { getLeads } from '@/lib/admin/queries';
import { formatDatePt } from '@/lib/admin/formatters';

type AdminLeadsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: LeadStatus | 'ALL';
    priority?: LeadPriority | 'ALL';
  }>;
};

const leadStatuses: Array<LeadStatus | 'ALL'> = [
  'ALL',
  'NEW',
  'QUALIFIED',
  'CONTACTED',
  'CONVERTED',
  'LOST',
];

const leadPriorities: Array<LeadPriority | 'ALL'> = [
  'ALL',
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

/**
 * Renders the admin leads table.
 *
 * @param props Search params used as filters.
 * @returns Leads page.
 */
export default async function AdminLeadsPage({ searchParams }: AdminLeadsPageProps) {
  const params = await searchParams;
  const leads = await getLeads({
    search: params?.q,
    status: params?.status ?? 'ALL',
    priority: params?.priority ?? 'ALL',
  });

  return (
    <div className="admin-page-grid">
      <AdminPanel title="Leads" subtitle={`${leads.length} registos encontrados`}>
        <form action="/admin/leads" className="admin-filters">
          <input
            className="admin-input"
            defaultValue={params?.q ?? ''}
            name="q"
            placeholder="Pesquisar nome, empresa ou email"
          />
          <Norm8Select
            defaultValue={params?.status ?? 'ALL'}
            name="status"
            options={leadStatuses.map((status) => ({
              value: status,
              label: status === 'ALL' ? 'Todos os estados' : status,
            }))}
          />
          <Norm8Select
            defaultValue={params?.priority ?? 'ALL'}
            name="priority"
            options={leadPriorities.map((priority) => ({
              value: priority,
              label: priority === 'ALL' ? 'Todas as prioridades' : priority,
            }))}
          />
          <button className="admin-filter-button" type="submit">
            <Filter size={14} />
            Filtrar
          </button>
        </form>
      </AdminPanel>

      <AdminPanel>
        {leads.length > 0 ? (
          <AdminTable
            headers={[
              'Nome',
              'Empresa',
              'Email',
              'Telefone',
              'Origem',
              'Estado',
              'Prioridade',
              'Submissões',
              'Criado em',
              'Atualizado',
            ]}
          >
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <Link className="admin-link" href={`/admin/leads/${lead.id}`}>
                    {lead.name ?? 'Sem nome'}
                  </Link>
                </td>
                <td>{lead.company}</td>
                <td>{lead.email}</td>
                <td>{lead.phone ?? '—'}</td>
                <td>{lead.source}</td>
                <td>
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td>
                  <LeadPriorityBadge priority={lead.priority} />
                </td>
                <td>{lead.submissions.length}</td>
                <td>{formatDatePt(lead.createdAt)}</td>
                <td>{formatDatePt(lead.updatedAt)}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState>Nenhum lead corresponde aos filtros atuais.</AdminEmptyState>
        )}
      </AdminPanel>
    </div>
  );
}
