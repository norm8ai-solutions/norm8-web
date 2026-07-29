'use client';

import { useRouter } from 'next/navigation';
import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

type ContractDetailPdfGenerateButtonProps = {
  contractId: string;
  hasExistingPdf: boolean;
};

type GenerationResponse = {
  success: boolean;
  operation?: 'current' | 'generated' | 'regenerated';
  error?: string;
  message?: string;
  missingFields?: string[];
};

export function ContractDetailPdfGenerateButton({ contractId, hasExistingPdf }: ContractDetailPdfGenerateButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const actionLabel = hasExistingPdf ? 'Regenerar PDF' : 'Gerar PDF';
  const loadingLabel = hasExistingPdf ? 'A regenerar PDF...' : 'A gerar PDF...';

  async function handleGenerate() {
    if (isGenerating) return;
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

      if (!response.ok || !result.success) {
        const params = new URLSearchParams({ error: result.error ?? 'unknown' });
        if (result.message) params.set('message', result.message);
        if (result.missingFields?.length) params.set('missing', result.missingFields.join(', '));
        router.replace(`/admin/contracts/${contractId}?${params.toString()}`);
        return;
      }

      router.replace(`/admin/contracts/${contractId}`);
      router.refresh();
    } catch {
      router.replace(`/admin/contracts/${contractId}?error=unknown`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button className="admin-button admin-button-muted contract-detail-pdf-action-button" disabled={isGenerating} onClick={handleGenerate} type="button">
      {isGenerating ? <LoaderCircle className="contract-preview-spinner" size={14} /> : <Download size={14} />}
      {isGenerating ? loadingLabel : actionLabel}
    </button>
  );
}