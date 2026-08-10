/**
 * ------------------------------------------------------------------
 * File: components/admin/GenerateFinalProposalWithWarning.tsx
 * Description: Secondary proposal generation flow with an inline Discovery warning.
 * ------------------------------------------------------------------
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { generateFinalProposalFromBaseOfferAction } from '@/lib/manual-client-intake/actions';

type GenerateFinalProposalWithWarningProps = {
  baseOfferId: string;
  discoveryHref: string;
};

export function GenerateFinalProposalWithWarning({
  baseOfferId,
  discoveryHref,
}: GenerateFinalProposalWithWarningProps) {
  const [showWarning, setShowWarning] = useState(false);

  if (!showWarning) {
    return (
      <button className="admin-button admin-button-muted" onClick={() => setShowWarning(true)} type="button">
        Gerar Proposta Final
      </button>
    );
  }

  return (
    <div className="discovery-warning discovery-generate-warning">
      <p>A discovery ainda n&atilde;o foi conclu&iacute;da. Pode gerar a proposta, mas recomenda-se validar primeiro as informa&ccedil;&otilde;es principais.</p>
      <div className="base-offer-summary-actions">
        <Link className="admin-button admin-button-muted" href={discoveryHref}>Continuar Discovery</Link>
        <form action={generateFinalProposalFromBaseOfferAction}>
          <input name="baseOfferId" type="hidden" value={baseOfferId} />
          <button className="admin-button" type="submit">Gerar proposta mesmo assim</button>
        </form>
      </div>
    </div>
  );
}
