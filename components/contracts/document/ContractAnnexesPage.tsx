import { formatShortDate } from '@/lib/contracts/document/formatters';
import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, InfoCard, SectionHeading } from './ContractPageFrame';

export function ContractAnnexesPage({ contract, pageNumber, totalPages }: { contract: ContractDocumentData; pageNumber: number; totalPages: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title="Anexos">
      <SectionHeading title="Anexos" lead="Referências complementares do contrato." />
      <InfoCard label="Anexo A - Proposta Comercial" value={contract.proposal ? `A Proposta Comercial ${contract.proposal.title} constitui parte integrante deste contrato.` : 'Sem proposta comercial associada.'} />
      <InfoCard label="Anexo B - Cronograma" value={contract.phases.map((phase) => `${phase.order}. ${phase.name} (${formatShortDate(phase.startsAt)} - ${formatShortDate(phase.endsAt)})`).join('\n') || 'Sem cronograma detalhado.'} />
      <InfoCard label="Anexo C - Kick-off Checklist" value="A checklist de kick-off será preparada após assinatura do contrato e confirmação do pagamento inicial." />
    </ContractPageFrame>
  );
}