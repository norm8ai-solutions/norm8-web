'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createOperationsProcessAction, type ProcessActionState } from '@/lib/operations-audits/actions';

const initialState: ProcessActionState = { success: false };

export function ProcessQuickCapture({ auditId }: { auditId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createOperationsProcessAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    setOpen(false);
  }, [state]);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button className="admin-button" type="button"><Plus size={14} />Adicionar processo</button></DialogTrigger>
    <DialogContent className="operations-process-dialog">
      <DialogHeader><DialogTitle>Quick Capture</DialogTitle><DialogDescription>Registe a definição essencial e continue a entrevista. Pode enriquecer o processo depois.</DialogDescription></DialogHeader>
      <form action={formAction} className="operations-process-form" ref={formRef}>
        <input name="auditId" type="hidden" value={auditId} />
        <label className="manual-intake-admin-field"><span>Nome do processo *</span><input autoFocus className="admin-input" maxLength={160} name="name" placeholder="Ex.: Recolha de documentos do cliente" required /></label>
        <label className="manual-intake-admin-field"><span>Departamento</span><input className="admin-input" name="department" placeholder="Ex.: Contabilidade" /></label>
        <label className="manual-intake-admin-field"><span>Trigger</span><input className="admin-input" name="trigger" placeholder="O que faz este processo começar?" /></label>
        <label className="manual-intake-admin-field"><span>Outcome</span><input className="admin-input" name="endState" placeholder="Que resultado marca o processo como concluído?" /></label>
        <label className="manual-intake-admin-field"><span>Pain / notas</span><textarea className="admin-textarea" name="notes" placeholder="Dor observada ou contexto útil da conversa." rows={3} /></label>
        {state.error ? <p className="project-form-error" role="alert">{state.error}</p> : null}
        <div className="operations-process-form-actions"><button className="admin-button admin-button-muted" onClick={() => setOpen(false)} type="button">Cancelar</button><button className="admin-button" disabled={pending} type="submit">{pending ? 'A guardar…' : 'Guardar processo'}</button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
