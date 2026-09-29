import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { requireAdmin } from '@/lib/admin/auth';
import { createOperationsAuditAction } from '@/lib/operations-audits/actions';
import { getAuditCompanyOptions } from '@/lib/operations-audits/service';

export default async function NewOperationsAuditPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const [companies, query] = await Promise.all([getAuditCompanyOptions(), searchParams]);
  return <div className="admin-page-grid">
    <AdminPanel title="Nova AI Operations Audit" subtitle="Comece pelo contexto e âmbito. A estrutura operacional é enriquecida no workspace." action={<Link className="admin-button admin-button-muted" href="/admin/operations-audits"><ArrowLeft size={14} />Voltar</Link>}>
      <form action={createOperationsAuditAction} className="project-form">
        <div className="admin-grid-2">
          <label className="manual-intake-admin-field"><span>Empresa no CRM</span><select className="admin-input" name="leadId" required defaultValue=""><option value="" disabled>Selecionar empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.company} · {company.email}</option>)}</select></label>
          <label className="manual-intake-admin-field"><span>Nome da auditoria</span><input className="admin-input" name="name" placeholder="AI Operations Audit — Empresa" required /></label>
        </div>
        <label className="manual-intake-admin-field"><span>Âmbito</span><textarea className="admin-textarea" name="scope" placeholder="Equipas, operações e limites desta auditoria." /></label>
        <label className="manual-intake-admin-field"><span>Objetivos</span><textarea className="admin-textarea" name="objectives" placeholder="Decisões que esta auditoria deve permitir tomar." /></label>
        {query.error ? <p className="project-form-error">Preencha a empresa e o nome com valores válidos.</p> : null}
        <button className="admin-button" type="submit">Criar auditoria</button>
      </form>
    </AdminPanel>
  </div>;
}
