import { resolveClauseVariables } from '@/lib/contracts/document/formatters';
import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, SectionHeading, WarningList } from './ContractPageFrame';

export function ContractClausesPage({ contract, pageNumber, totalPages }: { contract: ContractDocumentData; pageNumber: number; totalPages: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title="Cláusulas contratuais">
      <SectionHeading title="Cláusulas contratuais" lead="Condições selecionadas para este contrato." />
      <WarningList warnings={contract.warnings.filter((warning) => warning.includes('clausulas'))} />
      {contract.sections.map((section, index) => (
        <section className="contract-clause" key={section.id}>
          <h3>{index + 1}. {section.title}</h3>
          <p>{resolveClauseVariables(section.content, contract)}</p>
        </section>
      ))}
    </ContractPageFrame>
  );
}