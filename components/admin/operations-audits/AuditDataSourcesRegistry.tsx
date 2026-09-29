'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createAuditDataSourceAction, deleteAuditDataSourceAction, updateAuditDataSourceAction, type DataSourceActionState } from '@/lib/operations-audits/actions';

const initialState: DataSourceActionState = { success: false };
type SystemOption = { id: string; name: string };
type DataSource = {
  id: string; name: string; type: string | null; description: string | null;
  structure: 'STRUCTURED' | 'SEMI_STRUCTURED' | 'UNSTRUCTURED' | 'UNKNOWN';
  accessibility: string | null; quality: number | null;
  sensitivity: 'CLIENT_PRIVATE' | 'CLIENT_DERIVED' | 'AGGREGATED' | 'NORM8_KNOWLEDGE' | 'UNKNOWN';
  updateFrequency: string | null; systemId: string | null; system: SystemOption | null; notes: string | null;
  _count: { processes: number };
};

export function AuditDataSourcesRegistry({ auditId, dataSources, systems }: { auditId: string; dataSources: DataSource[]; systems: SystemOption[] }) {
  return <div className="operations-systems">
    <DataSourceQuickCreate auditId={auditId} key={dataSources.length} />
    {dataSources.length ? <div className="operations-system-list">{dataSources.map((source) => <DataSourceRow auditId={auditId} key={source.id} source={source} systems={systems} />)}</div> :
      <div className="operations-steps-empty"><strong>Ainda não existem data sources.</strong><span>Capture as fontes de informação observadas durante a auditoria.</span></div>}
  </div>;
}

function DataSourceQuickCreate({ auditId }: { auditId: string }) {
  const [state, action, pending] = useActionState(createAuditDataSourceAction, initialState); const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) ref.current?.reset(); }, [state]);
  return <form action={action} className="operations-system-quick" ref={ref}>
    <input name="auditId" type="hidden" value={auditId} />
    <label className="manual-intake-admin-field"><span>Name / Source *</span><input className="admin-input" maxLength={160} name="name" placeholder="Ex.: Client invoices" required /></label>
    <label className="manual-intake-admin-field"><span>Type</span><input className="admin-input" name="type" placeholder="Ex.: Documents" /></label>
    <button className="admin-button" disabled={pending} type="submit"><Plus size={14} />{pending ? 'A criar…' : 'Criar data source'}</button>
    {state.error ? <p className="project-form-error" role="alert">{state.error}</p> : null}
  </form>;
}

function DataSourceRow({ auditId, source, systems }: { auditId: string; source: DataSource; systems: SystemOption[] }) {
  const [deleteState, deleteAction, deleting] = useActionState(deleteAuditDataSourceAction, initialState);
  return <article className="operations-system-row">
    <div><strong>{source.name}</strong><span>{source.type ?? 'Sem tipo'} · {structureLabel(source.structure)}{source.system ? ` · ${source.system.name}` : ''}</span></div>
    <div className="operations-system-usage"><span>{source._count.processes} processos</span></div>
    <div className="operations-step-actions"><DataSourceEditDialog auditId={auditId} source={source} systems={systems} />
      <form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Apagar o data source “${source.name}”?`)) event.preventDefault(); }}>
        <input name="auditId" type="hidden" value={auditId} /><input name="dataSourceId" type="hidden" value={source.id} />
        <button aria-label={`Apagar ${source.name}`} className="project-icon-button operations-step-delete" disabled={deleting} type="submit"><Trash2 size={14} /></button>
      </form>
    </div>
    {deleteState.error ? <p className="project-form-error operations-system-row-error" role="alert">{deleteState.error}</p> : null}
  </article>;
}

function DataSourceEditDialog({ auditId, source, systems }: { auditId: string; source: DataSource; systems: SystemOption[] }) {
  const [open, setOpen] = useState(false); const [state, action, pending] = useActionState(updateAuditDataSourceAction, initialState);
  useEffect(() => { if (state.success) setOpen(false); }, [state]);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button aria-label={`Editar ${source.name}`} className="project-icon-button" type="button"><Pencil size={14} /></button></DialogTrigger>
    <DialogContent className="operations-process-dialog"><DialogHeader><DialogTitle>{source.name}</DialogTitle><DialogDescription>Identidade da fonte e metadata manual de data readiness.</DialogDescription></DialogHeader>
      <form action={action} className="operations-process-form">
        <input name="auditId" type="hidden" value={auditId} /><input name="dataSourceId" type="hidden" value={source.id} />
        <div className="admin-grid-2"><Field label="Name / Source *" name="name" value={source.name} required /><Field label="Type" name="type" value={source.type} /></div>
        <label className="manual-intake-admin-field"><span>Description</span><textarea className="admin-textarea" defaultValue={source.description ?? ''} name="description" rows={2} /></label>
        <label className="manual-intake-admin-field"><span>System</span><select className="admin-input" defaultValue={source.systemId ?? ''} name="systemId"><option value="">No system / Unknown</option>{systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}</select></label>
        <details className="operations-step-details" open><summary>Data readiness</summary><div className="operations-step-details-body">
          <div className="admin-grid-2"><label className="manual-intake-admin-field"><span>Structure</span><select className="admin-input" defaultValue={source.structure} name="structure"><option value="UNKNOWN">Unknown</option><option value="STRUCTURED">Structured</option><option value="SEMI_STRUCTURED">Semi-structured</option><option value="UNSTRUCTURED">Unstructured</option></select></label><label className="manual-intake-admin-field"><span>Accessibility</span><select className="admin-input" defaultValue={source.accessibility ?? 'UNKNOWN'} name="accessibility"><option value="UNKNOWN">Unknown</option><option value="EASY">Easy</option><option value="MODERATE">Moderate</option><option value="DIFFICULT">Difficult</option></select></label></div>
          <div className="admin-grid-2"><label className="manual-intake-admin-field"><span>Quality</span><select className="admin-input" defaultValue={source.quality ?? 'UNKNOWN'} name="quality"><option value="UNKNOWN">Unknown</option><option value="3">High</option><option value="2">Medium</option><option value="1">Low</option></select></label><label className="manual-intake-admin-field"><span>Sensitivity</span><select className="admin-input" defaultValue={source.sensitivity} name="sensitivity"><option value="UNKNOWN">Unknown</option><option value="CLIENT_PRIVATE">Client private</option><option value="CLIENT_DERIVED">Client derived</option><option value="AGGREGATED">Aggregated</option><option value="NORM8_KNOWLEDGE">Norm8 knowledge</option></select></label></div>
          <Field label="Update frequency" name="updateFrequency" value={source.updateFrequency} />
          <label className="manual-intake-admin-field"><span>Notes</span><textarea className="admin-textarea" defaultValue={source.notes ?? ''} name="notes" rows={3} /></label>
        </div></details>
        {state.error ? <p className="project-form-error" role="alert">{state.error}</p> : null}
        <div className="operations-process-form-actions"><button className="admin-button admin-button-muted" onClick={() => setOpen(false)} type="button">Cancelar</button><button className="admin-button" disabled={pending} type="submit">{pending ? 'A guardar…' : 'Guardar'}</button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
function Field({ label, name, value, required }: { label: string; name: string; value: string | null; required?: boolean }) { return <label className="manual-intake-admin-field"><span>{label}</span><input className="admin-input" defaultValue={value ?? ''} maxLength={160} name={name} required={required} /></label>; }
function structureLabel(value: DataSource['structure']) { return ({ STRUCTURED: 'Structured', SEMI_STRUCTURED: 'Semi-structured', UNSTRUCTURED: 'Unstructured', UNKNOWN: 'Unknown structure' })[value]; }
