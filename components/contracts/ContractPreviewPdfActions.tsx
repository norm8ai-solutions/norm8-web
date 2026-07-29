'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, FileText, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

type ContractPreviewPdfActionsProps = {
  canGenerate: boolean;
  contractId: string;
  hasExistingPdf: boolean;
  hasUnpublishedChanges: boolean;
  pendingChangeReason?: string | null;
  pdfUrl?: string | null;
  zoom: 75 | 100 | 125;
};

type GenerationResponse = {
  success: boolean;
  operation?: 'current' | 'generated' | 'regenerated';
  pdfUrl?: string;
  error?: string;
  message?: string;
  missingFields?: string[];
};

export function ContractPreviewPdfActions({ canGenerate, contractId, hasExistingPdf, hasUnpublishedChanges, pendingChangeReason, pdfUrl, zoom }: ContractPreviewPdfActionsProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [visiblePdfUrl, setVisiblePdfUrl] = useState<string | null>(pdfUrl ?? null);

  const operationLabel = hasExistingPdf || visiblePdfUrl ? 'Regenerar PDF' : 'Gerar PDF';
  const hasPendingReason = Boolean(pendingChangeReason?.trim() && pendingChangeReason.trim().length >= 8);
  const loadingLabel = hasExistingPdf || visiblePdfUrl ? 'A regenerar PDF...' : 'A gerar PDF...';

  async function handleGenerate() {
    if (isGenerating || !canGenerate) return;
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/contracts/${contractId}/generate-pdf`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'fetch',
        },
      });
      const result = await response.json() as GenerationResponse;

      if (!response.ok || !result.success || !result.operation) {
        const errorParams: Record<string, string> = { error: result.error ?? 'unknown' };
        if (result.message) errorParams.message = result.message;
        if (result.missingFields?.length) errorParams.missing = result.missingFields.join(', ');
        const params = buildPreviewParams(zoom, errorParams);
        router.replace(`/admin/contracts/${contractId}/preview?${params}`);
        return;
      }

      if (result.pdfUrl) setVisiblePdfUrl(result.pdfUrl);
      const params = buildPreviewParams(zoom, { pdf: result.operation });
      router.replace(`/admin/contracts/${contractId}/preview?${params}`);
      router.refresh();
    } catch {
      const params = buildPreviewParams(zoom, { error: 'unknown' });
      router.replace(`/admin/contracts/${contractId}/preview?${params}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="admin-filters contract-preview-header-actions">
      {visiblePdfUrl ? <Link className="admin-button" href={visiblePdfUrl} target="_blank"><Download size={14} />Descarregar PDF</Link> : null}
      {(hasExistingPdf || visiblePdfUrl) && hasPendingReason ? <span className="admin-pill">Motivo pendente aplicado</span> : null}
      {canGenerate ? (
        <button className="admin-button" disabled={isGenerating} onClick={handleGenerate} type="button">
          {isGenerating ? <LoaderCircle className="contract-preview-spinner" size={14} /> : <FileText size={14} />}
          {isGenerating ? loadingLabel : operationLabel}
        </button>
      ) : hasExistingPdf && hasUnpublishedChanges && !hasPendingReason ? (
        <Link className="admin-button admin-button-muted" href={`/admin/contracts/${contractId}/edit`}>Voltar ao editor</Link>
      ) : <span className="admin-pill">{hasExistingPdf && !hasUnpublishedChanges ? 'PDF atualizado' : 'PDF bloqueado neste estado'}</span>}
    </div>
  );
}
function buildPreviewParams(zoom: 75 | 100 | 125, params: Record<string, string>): string {
  const searchParams = new URLSearchParams(params);
  if (zoom !== 100) searchParams.set('zoom', String(zoom));
  return searchParams.toString();
}
