import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, SectionHeading } from './ContractPageFrame';

const principles = ['Clareza', 'Estrutura', 'Impacto', 'Colaboração', 'Evolução contínua'];

export function ContractHowWeWorkPage({ contract, pageNumber }: { contract: ContractDocumentData; pageNumber: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} title="Como trabalhamos">
      <SectionHeading title="Como trabalhamos" lead="Uma colaboração transparente, estruturada e orientada para resultados." />
      <p className="contract-section-lead">Na Norm8 acreditamos que os melhores resultados surgem através de uma colaboração transparente, estruturada e orientada para resultados. Não entregamos apenas projetos isolados. Construímos sistemas que acompanham a evolução do negócio.</p>
      <div className="contract-grid-3">
        {principles.map((principle) => <div className="contract-card" key={principle}><strong>{principle}</strong><span>Princípio operacional aplicado durante todo o ciclo de trabalho.</span></div>)}
      </div>
      <div className="contract-card"><strong>Princípio final</strong><span>Não entregamos apenas projetos. Construímos plataformas que evoluem com o negócio.</span></div>
    </ContractPageFrame>
  );
}