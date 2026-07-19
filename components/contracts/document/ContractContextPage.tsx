import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, InfoCard, SectionHeading } from './ContractPageFrame';

export function ContractContextPage({ contract, pageNumber }: { contract: ContractDocumentData; pageNumber: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} title="Objeto e contexto">
      <SectionHeading title="Objeto e contexto" lead="Contexto comercial, objetivo e solução proposta." />
      <div className="contract-grid-2">
        <InfoCard label="Projeto" value={contract.projectName} />
        <InfoCard label="Proposta associada" value={contract.proposal?.title} />
        <InfoCard label="Lead associada" value={contract.lead ? `${contract.lead.company} - ${contract.lead.email}` : null} />
        <InfoCard label="Serviços incluídos" value={contract.includedServices.join(', ')} />
      </div>
      <InfoCard label="Resumo executivo" value={contract.context.executiveSummary} />
      <InfoCard label="Objetivo" value={contract.context.projectObjective} />
      <InfoCard label="Problemas identificados" value={contract.context.identifiedProblems} />
      <InfoCard label="Solução proposta" value={contract.context.proposedSolution} />
    </ContractPageFrame>
  );
}