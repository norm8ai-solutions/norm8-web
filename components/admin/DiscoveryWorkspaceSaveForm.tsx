/**
 * ------------------------------------------------------------------
 * File: components/admin/DiscoveryWorkspaceSaveForm.tsx
 * Description: Client-side wrapper for saving the Discovery workspace in one action.
 * ------------------------------------------------------------------
 */

'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, type ReactNode } from 'react';
import {
  saveDiscoveryNotesAction,
  type DiscoveryActionState,
} from '@/app/admin/leads/[id]/discovery/actions';

const initialState: DiscoveryActionState = { success: false };

type DiscoveryWorkspaceSaveFormProps = {
  children: ReactNode;
  discoverySessionId: string;
  hasBaseOffer?: boolean;
  leadId: string;
};

export function DiscoveryWorkspaceSaveForm({
  children,
  discoverySessionId,
  hasBaseOffer = false,
  leadId,
}: DiscoveryWorkspaceSaveFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveDiscoveryNotesAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="admin-page-grid discovery-workspace-save-form">
      <input name="leadId" type="hidden" value={leadId} />
      <input name="discoverySessionId" type="hidden" value={discoverySessionId} />
      {children}

      {state.message ? <p className="discovery-action-feedback discovery-action-feedback-success">{state.message}</p> : null}
      {state.error ? <p className="discovery-action-feedback discovery-action-feedback-error">{state.error}</p> : null}

      <div className="manual-intake-actions">
        <button className="admin-button" disabled={pending} name="intent" type="submit" value="discovery">
          {pending ? 'A guardar discovery...' : 'Guardar notas da Discovery'}
        </button>
        <button className="admin-button admin-button-muted" disabled={pending || !hasBaseOffer} name="intent" type="submit" value="base-offer">
          {pending ? 'A guardar Oferta Base...' : 'Guardar Oferta Base'}
        </button>
      </div>
    </form>
  );
}