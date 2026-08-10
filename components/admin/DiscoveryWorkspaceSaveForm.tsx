/**
 * ------------------------------------------------------------------
 * File: components/admin/DiscoveryWorkspaceSaveForm.tsx
 * Description: Client-side wrapper for saving the Discovery workspace in one action.
 * ------------------------------------------------------------------
 */

'use client';

import { useActionState, type ReactNode } from 'react';
import {
  saveDiscoveryNotesAction,
  type DiscoveryActionState,
} from '@/app/admin/leads/[id]/discovery/actions';

const initialState: DiscoveryActionState = { success: false };

type DiscoveryWorkspaceSaveFormProps = {
  children: ReactNode;
  discoverySessionId: string;
  leadId: string;
};

export function DiscoveryWorkspaceSaveForm({
  children,
  discoverySessionId,
  leadId,
}: DiscoveryWorkspaceSaveFormProps) {
  const [state, formAction, pending] = useActionState(saveDiscoveryNotesAction, initialState);

  return (
    <form action={formAction} className="admin-page-grid discovery-workspace-save-form">
      <input name="leadId" type="hidden" value={leadId} />
      <input name="discoverySessionId" type="hidden" value={discoverySessionId} />
      {children}

      {state.message ? <p className="discovery-action-feedback discovery-action-feedback-success">{state.message}</p> : null}
      {state.error ? <p className="discovery-action-feedback discovery-action-feedback-error">{state.error}</p> : null}

      <div className="manual-intake-actions">
        <button className="admin-button" disabled={pending} type="submit">
          {pending ? 'A guardar notas...' : 'Guardar notas da Discovery'}
        </button>
      </div>
    </form>
  );
}