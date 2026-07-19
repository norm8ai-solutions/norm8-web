import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, SectionHeading } from './ContractPageFrame';

const phases = [
  { key: 'Launch', text: 'Implementação inicial da solução.' },
  { key: 'Operate', text: 'Monitorização, suporte, melhoria e evolução contínua.' },
  { key: 'Scale', text: 'Expansão da solução através de novas funcionalidades, integrações, automações e sistemas.' },
];

export function ContractGrowthSystemPage({ contract, pageNumber }: { contract: ContractDocumentData; pageNumber: number }) {
  const active = { Launch: contract.includesLaunch, Operate: contract.includesOperate, Scale: contract.includesScale };
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} title="Norm8 Growth System">
      <SectionHeading title="Norm8 Growth System" lead="Launch → Operate → Scale" />
      <div className="contract-growth">
        {phases.map((phase) => (
          <div className={`contract-growth-card ${active[phase.key as keyof typeof active] ? 'contract-growth-card-active' : ''}`} key={phase.key}>
            <strong>{phase.key}</strong>
            <span>{phase.text}</span>
            <span>{active[phase.key as keyof typeof active] ? 'Incluído neste contrato' : 'Não incluído nesta fase'}</span>
          </div>
        ))}
      </div>
    </ContractPageFrame>
  );
}