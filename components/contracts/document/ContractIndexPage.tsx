import type { ContractDocumentData, ContractRenderedPage } from '@/lib/contracts/document/types';
import { ContractPageFrame, SectionHeading } from './ContractPageFrame';

export function ContractIndexPage({ contract, pageNumber, pages, totalPages }: { contract: ContractDocumentData; pageNumber: number; pages: ContractRenderedPage[]; totalPages: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title="Índice">
      <SectionHeading title="Índice" lead="Estrutura visual do contrato gerada a partir das páginas finais." />
      <ol className="contract-index-list">
        {pages.map((page, index) => (
          <li className="contract-index-item" key={page.id}>
            <span className="contract-index-number">{String(index + 1).padStart(2, '0')}</span>
            <strong>{page.title}</strong>
            <span>p. {page.pageNumber}</span>
          </li>
        ))}
      </ol>
    </ContractPageFrame>
  );
}
