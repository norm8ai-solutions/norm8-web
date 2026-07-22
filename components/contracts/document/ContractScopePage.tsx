import { formatShortDate } from '@/lib/contracts/document/formatters';
import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, InfoCard, SectionHeading } from './ContractPageFrame';

export function ContractScopePage({ contract, pageNumber, totalPages }: { contract: ContractDocumentData; pageNumber: number; totalPages: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title="Âmbito e entregáveis">
      <SectionHeading title="Âmbito, entregáveis e critérios de aceitação" lead="O que está incluído, excluído e preparado para validação." />
      <div className="contract-grid-2">
        <InfoCard label="Âmbito incluído" value={contract.context.includedScope} />
        <InfoCard label="Âmbito excluído" value={contract.context.excludedScope} />
        <InfoCard label="Dependências" value={contract.context.dependencies} />
        <InfoCard label="Assunções" value={contract.context.assumptions} />
      </div>
      <InfoCard label="Critérios gerais de aceitação" value={contract.context.acceptanceCriteria} />
      {contract.deliverables.length > 0 ? (
        <div className="contract-grid-2">
          {contract.deliverables.map((deliverable) => (
            <div className="contract-card" key={deliverable.id}>
              <strong>{deliverable.title}</strong>
              <span>{deliverable.description || 'Sem descrição adicional.'}</span>
              <span>Fase: {deliverable.phase ?? 'Por definir'} - Data: {formatShortDate(deliverable.estimatedDate)}</span>
              <span>Responsável: {deliverable.responsible ?? 'Por definir'}</span>
              <span>Critério: {deliverable.acceptanceCriteria ?? 'Por definir'}</span>
            </div>
          ))}
        </div>
      ) : <div className="contract-warning">Sem entregáveis definidos.</div>}
    </ContractPageFrame>
  );
}