'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Plus, Unlink } from 'lucide-react';
import { createAndLinkDataSourceToProcessAction, linkDataSourceToProcessAction, unlinkDataSourceFromProcessAction, type DataSourceActionState } from '@/lib/operations-audits/actions';

const initialState: DataSourceActionState = { success: false };
type DataSourceOption = { id: string; name: string; type: string | null; system: { id: string; name: string } | null };

export function ProcessDataSources({ auditId, processId, dataSources, linked }: { auditId: string; processId: string; dataSources: DataSourceOption[]; linked: DataSourceOption[] }) {
  const linkedIds = new Set(linked.map((source) => source.id)); const available = dataSources.filter((source) => !linkedIds.has(source.id));
  return <div className="operations-process-systems">
    {linked.length ? <div className="operations-system-chips">{linked.map((source) => <div className="operations-system-chip" key={source.id}><span><strong>{source.name}</strong>{source.type ? ` · ${source.type}` : ''}{source.system ? ` · ${source.system.name}` : ''}</span><form action={unlinkDataSourceFromProcessAction}><Ids auditId={auditId} dataSourceId={source.id} processId={processId} /><button aria-label={`Desassociar ${source.name}`} className="project-icon-button" type="submit"><Unlink size={13} /></button></form></div>)}</div> : <div className="operations-steps-empty"><strong>Sem data sources associados.</strong><span>Associe uma fonte do registry ou capture uma nova.</span></div>}
    <div className="admin-grid-2"><LinkExisting auditId={auditId} available={available} processId={processId} /><CreateLinked auditId={auditId} processId={processId} /></div>
  </div>;
}
function LinkExisting({ auditId, processId, available }: { auditId: string; processId: string; available: DataSourceOption[] }) {
  const [state, action, pending] = useActionState(linkDataSourceToProcessAction, initialState);
  return <form action={action} className="operations-system-associate"><Ids auditId={auditId} processId={processId} /><label className="manual-intake-admin-field"><span>Associar existente</span><select className="admin-input" disabled={!available.length} name="dataSourceId" required><option value="">Selecionar data source…</option>{available.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label><button className="admin-button admin-button-muted" disabled={pending || !available.length} type="submit">Associar</button>{state.error ? <p className="project-form-error">{state.error}</p> : null}</form>;
}
function CreateLinked({ auditId, processId }: { auditId: string; processId: string }) {
  const [state, action, pending] = useActionState(createAndLinkDataSourceToProcessAction, initialState); const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) ref.current?.reset(); }, [state]);
  return <form action={action} className="operations-system-associate" ref={ref}><Ids auditId={auditId} processId={processId} /><label className="manual-intake-admin-field"><span>Criar e associar</span><input className="admin-input" maxLength={160} name="name" placeholder="Name / Source" required /></label><label className="manual-intake-admin-field"><span>Type</span><input className="admin-input" name="type" placeholder="Opcional" /></label><button className="admin-button" disabled={pending} type="submit"><Plus size={14} />Criar e associar</button>{state.error ? <p className="project-form-error">{state.error}</p> : null}</form>;
}
function Ids({ auditId, processId, dataSourceId }: { auditId: string; processId: string; dataSourceId?: string }) { return <><input name="auditId" type="hidden" value={auditId} /><input name="processId" type="hidden" value={processId} />{dataSourceId ? <input name="dataSourceId" type="hidden" value={dataSourceId} /> : null}</>; }
