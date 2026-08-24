import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import { ProjectCreateForm } from '@/components/admin/projects/ProjectForms';
import { requireAdmin } from '@/lib/admin/auth';
import { getProjectFormOptions } from '@/lib/admin/projects';

export default async function NewProjectPage() {
  await requireAdmin();
  const options = await getProjectFormOptions();

  return (
    <div className="admin-page-grid projects-page">
      <AdminPanel
        title="Novo projeto"
        subtitle="Crie a camada operacional para acompanhar entrega, horas e rentabilidade."
        action={<Link className="admin-button admin-button-muted" href="/admin/projects"><ArrowLeft size={14} />Voltar</Link>}
      >
        <ProjectCreateForm options={options} />
      </AdminPanel>
    </div>
  );
}
