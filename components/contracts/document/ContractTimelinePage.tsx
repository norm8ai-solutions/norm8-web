import { formatShortDate } from '@/lib/contracts/document/formatters';
import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, SectionHeading } from './ContractPageFrame';

export function ContractTimelinePage({ contract, pageNumber }: { contract: ContractDocumentData; pageNumber: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} title="Cronograma">
      <SectionHeading title="Cronograma" lead="Fases previstas, dependências e critérios de aprovação." />
      {contract.phases.length > 0 ? (
        <div className="contract-table-wrap"><table className="contract-table"><thead><tr><th>Fase</th><th>Datas</th><th>Detalhe</th><th>Aprovação</th></tr></thead><tbody>{contract.phases.map((phase) => <tr key={phase.id}><td>{phase.order}. {phase.name}<br />{phase.phaseType ?? 'Sem tipo'}</td><td>{formatShortDate(phase.startsAt)}<br />{formatShortDate(phase.endsAt)}<br />{phase.duration ?? ''}</td><td>{phase.description ?? 'Sem descrição.'}<br />{phase.dependencies ? `Dependências: ${phase.dependencies}` : ''}<br />{phase.paymentMilestone ? `Pagamento: ${phase.paymentMilestone}` : ''}</td><td>{phase.approvalCriteria ?? 'Por definir'}</td></tr>)}</tbody></table></div>
      ) : <div className="contract-warning">Sem fases definidas.</div>}
    </ContractPageFrame>
  );
}