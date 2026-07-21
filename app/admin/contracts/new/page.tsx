import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { ContractWizard } from '@/components/contracts/ContractWizard';
import { createContractDraftAction } from '@/lib/contracts/actions';
import { getContractCreationContext } from '@/lib/contracts/queries';

export default async function NewContractPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const context = await getContractCreationContext();

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title="Novo contrato"
        subtitle="Wizard de criação de rascunho com snapshots, âmbito, pagamentos e cláusulas."
        action={
          <Link className="admin-button admin-button-muted" href="/admin/contracts">
            <ArrowLeft size={14} />Voltar
          </Link>
        }
      >
        {params?.error === 'invalid' ? (
          <p className="admin-action-execution-error">Confirme os campos obrigatórios antes de guardar o contrato.</p>
        ) : null}
        {params?.error === 'admin' ? (
          <p className="admin-action-execution-error">Não foi possível criar o contrato porque não existe um administrador ativo associado. Crie um utilizador admin ou ative o modo demo corretamente.</p>
        ) : null}
        {!context.legalSettings ? (
          <div className="admin-execution-summary admin-execution-summary-danger" style={{ marginBottom: 14 }}>
            <strong>Dados legais por configurar</strong>
            <span>Foram usados dados temporários. Reveja os dados legais antes de gerar versões finais.</span>
            <Link className="admin-link" href="/admin/settings/company/legal">Abrir dados contratuais</Link>
          </div>
        ) : null}
        <ContractWizard
          action={createContractDraftAction}
          admins={context.admins}
          currentAdminId={context.currentAdminId}
          leads={context.leads}
          legalSettings={context.legalSettings ? mapLegalSettings(context.legalSettings) : null}
          mode="create"
          proposals={context.proposals.map((proposal) => ({ ...proposal, estimatedValue: proposal.estimatedValue?.toString() ?? null, createdAt: proposal.createdAt.toISOString(), updatedAt: proposal.updatedAt.toISOString() }))}
          templates={context.templates.map(mapTemplate)}
        />
      </AdminPanel>
    </div>
  );
}

function mapLegalSettings(settings: NonNullable<Awaited<ReturnType<typeof getContractCreationContext>>['legalSettings']>) {
  return {
    legalName: settings.legalName,
    tradeName: settings.tradeName,
    taxId: settings.taxId,
    address: settings.address,
    email: settings.email,
    phone: settings.phone,
    website: settings.website,
    representative: settings.representative,
    representativeRole: settings.representativeRole,
    iban: settings.iban,
    bankName: settings.bankName,
    swiftBic: settings.swiftBic,
  };
}

function mapTemplate(template: Awaited<ReturnType<typeof getContractCreationContext>>['templates'][number]) {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    sections: template.sections.map((section) => ({
      id: section.id,
      category: section.category,
      title: section.title,
      content: section.content,
      order: section.order,
      isRequired: section.isRequired,
      version: section.version,
    })),
  };
}