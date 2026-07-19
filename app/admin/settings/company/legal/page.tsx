import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { updateCompanyLegalSettingsAction } from '@/lib/contracts/actions';
import { getCompanyLegalSettings } from '@/lib/contracts/queries';

type CompanyLegalSettingsPageProps = {
  searchParams?: Promise<{ error?: string; saved?: string }>;
};

export default async function CompanyLegalSettingsPage({ searchParams }: CompanyLegalSettingsPageProps) {
  const params = await searchParams;
  const settings = await getCompanyLegalSettings();

  return (
    <div className="admin-page-grid">
      <AdminPanel
        title="Dados contratuais da empresa"
        subtitle="Dados legais da Norm8 usados no providerSnapshot de novos contratos."
        action={
          <Link className="admin-button admin-button-muted" href="/admin/contracts/new">
            <ArrowLeft size={14} />
            Voltar
          </Link>
        }
      >
        {params?.saved === '1' ? <p className="admin-execution-success">Dados contratuais guardados.</p> : null}
        {params?.error === 'invalid' ? <p className="admin-action-execution-error">Confirme todos os campos obrigatórios.</p> : null}
        <form action={updateCompanyLegalSettingsAction} className="admin-page-grid">
          <div className="admin-grid-2">
            <TextField defaultValue={settings?.legalName} label="Nome legal do prestador" name="legalName" />
            <TextField defaultValue={settings?.tradeName} label="Nome comercial" name="tradeName" />
          </div>
          <div className="admin-grid-2">
            <TextField defaultValue={settings?.taxId} label="NIF" name="taxId" />
            <TextField defaultValue={settings?.website} label="Website" name="website" />
          </div>
          <TextField defaultValue={settings?.address} label="Morada" name="address" />
          <div className="admin-grid-2">
            <TextField defaultValue={settings?.email} label="Email" name="email" type="email" />
            <TextField defaultValue={settings?.phone} label="Telefone" name="phone" />
          </div>
          <div className="admin-grid-2">
            <TextField defaultValue={settings?.representative} label="Representante" name="representative" />
            <TextField defaultValue={settings?.representativeRole} label="Cargo" name="representativeRole" />
          </div>
          <div className="admin-grid-2">
            <TextField defaultValue={settings?.iban} label="IBAN" name="iban" />
            <TextField defaultValue={settings?.bankName} label="Banco" name="bankName" />
          </div>
          <TextField defaultValue={settings?.swiftBic ?? undefined} label="SWIFT/BIC opcional" name="swiftBic" required={false} />
          <div className="admin-execution-summary">
            <strong>Nota interna obrigatória</strong>
            <span>Este template deve ser revisto por um advogado antes da utilização definitiva.</span>
          </div>
          <button className="admin-button" style={{ width: 180 }} type="submit">
            <Save size={14} />
            Guardar
          </button>
        </form>
      </AdminPanel>
    </div>
  );
}

function TextField({ defaultValue, label, name, required = true, type = 'text' }: { defaultValue?: string | null; label: string; name: string; required?: boolean; type?: string }) {
  return (
    <label className="admin-form-control">
      <span>{label}</span>
      <input className="admin-input" defaultValue={defaultValue ?? ''} name={name} required={required} type={type} />
    </label>
  );
}