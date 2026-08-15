/**
 * ------------------------------------------------------------------
 * File: components/admin/CompleteDiscoveryForm.tsx
 * Description: Client-side completion action for the Discovery workspace.
 * ------------------------------------------------------------------
 */

'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import {
  completeDiscoveryAction,
  type DiscoveryActionState,
} from '@/app/admin/leads/[id]/discovery/actions';

const initialState: DiscoveryActionState = { success: false };

type CompleteDiscoveryFormProps = {
  baseOfferId?: string | null;
  discoverySessionId: string;
  disabled?: boolean;
  leadId: string;
  submitLabel?: string;
  variant?: 'primary' | 'secondary';
};

export function CompleteDiscoveryForm({
  baseOfferId,
  discoverySessionId,
  disabled,
  leadId,
  submitLabel = 'Marcar discovery como concluída',
  variant = 'primary',
}: CompleteDiscoveryFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(completeDiscoveryAction, initialState);
  const isDisabled = disabled || pending;
  const buttonClassName = variant === 'secondary' ? 'admin-button admin-button-muted' : 'admin-button';

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="discovery-complete-form">
      <input name="leadId" type="hidden" value={leadId} />
      <input name="discoverySessionId" type="hidden" value={discoverySessionId} />
      {baseOfferId ? <input name="baseOfferId" type="hidden" value={baseOfferId} /> : null}
      <button className={buttonClassName} disabled={isDisabled} type="submit">
        {disabled ? 'Discovery concluída' : pending ? 'A concluir discovery...' : submitLabel}
      </button>
      {state.message ? <p className="discovery-action-feedback discovery-action-feedback-success">{state.message}</p> : null}
      {state.error ? <p className="discovery-action-feedback discovery-action-feedback-error">{state.error}</p> : null}
    </form>
  );
}