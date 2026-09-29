'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Plus, Unlink } from 'lucide-react';
import { createAndLinkSystemToProcessAction, linkSystemToProcessAction, unlinkSystemFromProcessAction, type SystemActionState } from '@/lib/operations-audits/actions';

const initialState: SystemActionState = { success: false };
type SystemOption = { id: string; name: string; category: string | null };

export function ProcessSystems({ auditId, processId, systems, linked }: { auditId: string; processId: string; systems: SystemOption[]; linked: SystemOption[] }) {
  const linkedIds = new Set(linked.map((system) => system.id));
  const available = systems.filter((system) => !linkedIds.has(system.id));
  return <div className="operations-process-systems">
    {linked.length ? <div className="operations-system-chips">{linked.map((system) => <div className="operations-system-chip" key={system.id}><span><strong>{system.name}</strong>{system.category ? ` · ${system.category}` : ''}</span><form action={unlinkSystemFromProcessAction}><Ids auditId={auditId} processId={processId} systemId={system.id} /><button aria-label={`Desassociar ${system.name}`} className="project-icon-button" type="submit"><Unlink size={13} /></button></form></div>)}</div> : <div className="operations-steps-empty"><strong>Sem sistemas associados.</strong><span>Associe um sistema do registry ou crie um novo.</span></div>}
    <div className="admin-grid-2"><LinkExisting auditId={auditId} available={available} processId={processId} /><CreateLinked auditId={auditId} processId={processId} /></div>
  </div>;
}
function LinkExisting({ auditId, processId, available }: { auditId: string; processId: string; available: SystemOption[] }) {
  const [state, action, pending] = useActionState(linkSystemToProcessAction, initialState);
  return <form action={action} className="operations-system-associate"><Ids auditId={auditId} processId={processId} /><label className="manual-intake-admin-field"><span>Associar existente</span><select className="admin-input" disabled={!available.length} name="systemId" required><option value="">Selecionar sistema…</option>{available.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}</select></label><button className="admin-button admin-button-muted" disabled={pending || !available.length} type="submit">Associar</button>{state.error ? <p className="project-form-error">{state.error}</p> : null}</form>;
}
function CreateLinked({ auditId, processId }: { auditId: string; processId: string }) {
  const [state, action, pending] = useActionState(createAndLinkSystemToProcessAction, initialState); const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) ref.current?.reset(); }, [state]);
  return <form action={action} className="operations-system-associate" ref={ref}><Ids auditId={auditId} processId={processId} /><label className="manual-intake-admin-field"><span>Criar e associar</span><input className="admin-input" maxLength={160} name="name" placeholder="Nome do sistema" required /></label><label className="manual-intake-admin-field"><span>Categoria</span><input className="admin-input" name="category" placeholder="Opcional" /></label><button className="admin-button" disabled={pending} type="submit"><Plus size={14} />Criar e associar</button>{state.error ? <p className="project-form-error">{state.error}</p> : null}</form>;
}
function Ids({ auditId, processId, systemId }: { auditId: string; processId: string; systemId?: string }) { return <><input name="auditId" type="hidden" value={auditId} /><input name="processId" type="hidden" value={processId} />{systemId ? <input name="systemId" type="hidden" value={systemId} /> : null}</>; }
