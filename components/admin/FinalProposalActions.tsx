/**
 * ------------------------------------------------------------------
 * File: components/admin/FinalProposalActions.tsx
 * Description: Client-side feedback controls for Final Proposal actions.
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import {
  generateFinalProposalFromBaseOfferFeedbackAction,
  type FinalProposalActionState,
} from '@/lib/manual-client-intake/actions';

const initialProposalState: FinalProposalActionState = {
  success: false,
};

type GenerateFinalProposalFormProps = {
  baseOfferId?: string | null;
  className?: string;
  disabled?: boolean;
  label?: string;
};

export function GenerateFinalProposalForm({
  baseOfferId,
  className = 'admin-button',
  disabled = false,
  label = 'Gerar Proposta Final',
}: GenerateFinalProposalFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    generateFinalProposalFromBaseOfferFeedbackAction,
    initialProposalState,
  );
  const isDisabled = disabled || pending || !baseOfferId;

  useEffect(() => {
    if (state.success && state.proposalId) {
      router.refresh();
      router.push(`/admin/proposals/${state.proposalId}`);
    }
  }, [router, state.proposalId, state.success]);

  return (
    <form action={formAction} className="admin-action-feedback-stack">
      <input name="baseOfferId" type="hidden" value={baseOfferId ?? ''} />
      <button className={className} disabled={isDisabled} type="submit">
        {pending ? 'A gerar proposta...' : label}
      </button>
      {state.message ? (
        <p className="discovery-action-feedback discovery-action-feedback-success">{state.message}</p>
      ) : null}
      {state.error ? (
        <p className="discovery-action-feedback discovery-action-feedback-error">{state.error}</p>
      ) : null}
    </form>
  );
}

type FinalProposalLinkProps = {
  className?: string;
  disabled?: boolean;
  href?: string | null;
  label?: string;
};

export function FinalProposalLink({
  className = 'admin-button',
  disabled = false,
  href,
  label = 'Ver Proposta Final',
}: FinalProposalLinkProps) {
  const [isOpening, setIsOpening] = useState(false);
  const isDisabled = disabled || !href;

  if (isDisabled) {
    return (
      <div className="admin-action-feedback-stack">
        <button className={className} disabled type="button">
          {label}
        </button>
        <p className="discovery-action-feedback discovery-action-feedback-error">
          Não foi encontrada uma Proposta Final associada.
        </p>
      </div>
    );
  }

  return (
    <Link
      className={className}
      href={href}
      onClick={() => setIsOpening(true)}
    >
      {isOpening ? 'A abrir proposta...' : label}
    </Link>
  );
}
