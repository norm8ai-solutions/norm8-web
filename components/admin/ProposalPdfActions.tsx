'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  generateProposalPdfExecution,
  type ProposalPdfGenerationResult,
} from '@/lib/admin/actions';

type ProposalPdfActionsProps = {
  generateLabel?: string;
  leadId: string;
  pdfUrl?: string | null;
  proposalId: string;
  regenerateLabel?: string;
  showSuccessMessage?: boolean;
  viewLabel?: string;
};

const initialState: ProposalPdfGenerationResult = {
  success: false,
  pdfGenerated: false,
};

export function ProposalPdfActions({
  generateLabel = 'Gerar PDF',
  leadId,
  pdfUrl,
  proposalId,
  regenerateLabel = 'Regenerar PDF',
  showSuccessMessage = true,
  viewLabel = 'Ver PDF',
}: ProposalPdfActionsProps) {
  const [state, formAction, pending] = useActionState(
    generateProposalPdfExecution,
    initialState,
  );
  const visiblePdfUrl = state.pdfUrl ?? pdfUrl;

  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <form action={formAction}>
          <input name="leadId" type="hidden" value={leadId} />
          <input name="proposalId" type="hidden" value={proposalId} />
          <button className="admin-button admin-button-muted" disabled={pending} type="submit">
            {pending ? 'A gerar PDF...' : visiblePdfUrl ? regenerateLabel : generateLabel}
          </button>
        </form>

        {visiblePdfUrl ? (
          <Link
            className="admin-button"
            href={visiblePdfUrl}
            rel="noreferrer"
            target="_blank"
          >
            {viewLabel}
          </Link>
        ) : null}
      </div>

      {state.error ? (
        <p className="admin-row-meta" style={{ color: '#fca5a5' }}>
          {state.error}
        </p>
      ) : null}

      {showSuccessMessage && state.success && state.pdfGenerated ? (
        <p className="admin-row-meta" style={{ color: '#86efac' }}>
          PDF gerado e associado à proposta.
        </p>
      ) : null}
    </div>
  );
}
