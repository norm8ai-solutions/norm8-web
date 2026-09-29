'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createAuditSystemAction, deleteAuditSystemAction, updateAuditSystemAction, type SystemActionState } from '@/lib/operations-audits/actions';

const initialState: SystemActionState = { success: false };
type System = {
  id: string; name: string; category: string | null; vendor: string | null; purpose: string | null;
  apiAvailable: 'YES' | 'NO' | 'UNKNOWN'; exportAvailable: 'YES' | 'NO' | 'UNKNOWN';
  integrationDifficulty: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' | null;
  dataOwner: string | null; notes: string | null; _count: { processes: number; tasks: number };
};

export function AuditSystemsRegistry({ auditId, systems }: { auditId: string; systems: System[] }) {
  return <div className="operations-systems">
    <SystemQuickCreate auditId={auditId} key={systems.length} />
    {systems.length ? <div className="operations-system-list">{systems.map((system) => <SystemRow auditId={auditId} key={system.id} system={system} />)}</div> :
      <div className="operations-steps-empty"><strong>Ainda não existem sistemas.</strong><span>Registe as ferramentas encontradas durante o discovery.</span></div>}
  </div>;
}

function SystemQuickCreate({ auditId }: { auditId: string }) {
  const [state, action, pending] = useActionState(createAuditSystemAction, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) ref.current?.reset(); }, [state]);
  return <form action={action} className="operations-system-quick" ref={ref}>
    <input name="auditId" type="hidden" value={auditId} />
    <label className="manual-intake-admin-field"><span>Nome *</span><input className="admin-input" maxLength={160} name="name" placeholder="Ex.: Microsoft Excel" required /></label>
    <label className="manual-intake-admin-field"><span>Categoria</span><input className="admin-input" name="category" placeholder="Ex.: Spreadsheet" /></label>
    <button className="admin-button" disabled={pending} type="submit"><Plus size={14} />{pending ? 'A criar…' : 'Criar sistema'}</button>
    {state.error ? <p className="project-form-error" role="alert">{state.error}</p> : null}
  </form>;
}

function SystemRow({ auditId, system }: { auditId: string; system: System }) {
  const [deleteState, deleteAction, deleting] = useActionState(deleteAuditSystemAction, initialState);
  return <article className="operations-system-row">
    <div><strong>{system.name}</strong><span>{system.category ?? 'Sem categoria'}{system.vendor ? ` · ${system.vendor}` : ''}</span></div>
    <div className="operations-system-usage"><span>{system._count.processes} processos</span><span>{system._count.tasks} steps</span></div>
    <div className="operations-step-actions"><SystemEditDialog auditId={auditId} system={system} />
      <form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Apagar o sistema “${system.name}”?`)) event.preventDefault(); }}>
        <input name="auditId" type="hidden" value={auditId} /><input name="systemId" type="hidden" value={system.id} />
        <button aria-label={`Apagar ${system.name}`} className="project-icon-button operations-step-delete" disabled={deleting} type="submit"><Trash2 size={14} /></button>
      </form>
    </div>
    {deleteState.error ? <p className="project-form-error operations-system-row-error" role="alert">{deleteState.error}</p> : null}
  </article>;
}

function SystemEditDialog({ auditId, system }: { auditId: string; system: System }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateAuditSystemAction, initialState);
  useEffect(() => { if (state.success) setOpen(false); }, [state]);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button aria-label={`Editar ${system.name}`} className="project-icon-button" type="button"><Pencil size={14} /></button></DialogTrigger>
    <DialogContent className="operations-process-dialog"><DialogHeader><DialogTitle>{system.name}</DialogTitle><DialogDescription>Core identity e contexto de integração do sistema.</DialogDescription></DialogHeader>
      <form action={action} className="operations-process-form">
        <input name="auditId" type="hidden" value={auditId} /><input name="systemId" type="hidden" value={system.id} />
        <div className="admin-grid-2"><Field label="Nome *" name="name" value={system.name} required /><Field label="Categoria" name="category" value={system.category} /></div>
        <div className="admin-grid-2"><Field label="Vendor" name="vendor" value={system.vendor} /><Field label="Data owner" name="dataOwner" value={system.dataOwner} /></div>
        <label className="manual-intake-admin-field"><span>Purpose</span><textarea className="admin-textarea" defaultValue={system.purpose ?? ''} name="purpose" rows={2} /></label>
        <details className="operations-step-details" open><summary>Integration context</summary><div className="operations-step-details-body">
          <div className="admin-grid-2"><Select label="API available" name="apiAvailable" value={system.apiAvailable} /><Select label="Export available" name="exportAvailable" value={system.exportAvailable} /></div>
          <label className="manual-intake-admin-field"><span>Integration difficulty</span><select className="admin-input" defaultValue={system.integrationDifficulty ?? 'UNKNOWN'} name="integrationDifficulty"><option value="UNKNOWN">Unknown</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
          <label className="manual-intake-admin-field"><span>Notes</span><textarea className="admin-textarea" defaultValue={system.notes ?? ''} name="notes" rows={3} /></label>
        </div></details>
        {state.error ? <p className="project-form-error" role="alert">{state.error}</p> : null}
        <div className="operations-process-form-actions"><button className="admin-button admin-button-muted" onClick={() => setOpen(false)} type="button">Cancelar</button><button className="admin-button" disabled={pending} type="submit">{pending ? 'A guardar…' : 'Guardar'}</button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
function Field({ label, name, value, required }: { label: string; name: string; value: string | null; required?: boolean }) { return <label className="manual-intake-admin-field"><span>{label}</span><input className="admin-input" defaultValue={value ?? ''} maxLength={160} name={name} required={required} /></label>; }
function Select({ label, name, value }: { label: string; name: string; value: string }) { return <label className="manual-intake-admin-field"><span>{label}</span><select className="admin-input" defaultValue={value} name={name}><option value="UNKNOWN">Unknown</option><option value="YES">Yes</option><option value="NO">No</option></select></label>; }
