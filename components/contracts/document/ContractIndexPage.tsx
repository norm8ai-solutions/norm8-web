import type { ContractDocumentData, ContractRenderedPage } from '@/lib/contracts/document/types';
import { ContractPageFrame, SectionHeading } from './ContractPageFrame';

export function ContractIndexPage({ contract, pages }: { contract: ContractDocumentData; pages: ContractRenderedPage[] }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={2} title="Índice">
      <SectionHeading title="Índice" lead="Estrutura visual do contrato gerada a partir das secções disponíveis." />
      <ol className="contract-index-list">
        {pages.map((page, index) => (
          <li className="contract-index-item" key={page.id}>
            <span className="contract-index-number">{String(index + 1).padStart(2, '0')}</span>
            <strong>{page.title}</strong>
            <span>p. {page.estimatedPage}</span>
          </li>
        ))}
      </ol>
    </ContractPageFrame>
  );
}