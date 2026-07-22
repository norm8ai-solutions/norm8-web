import { formatShortDate } from '@/lib/contracts/document/formatters';
import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, SectionHeading } from './ContractPageFrame';

export function ContractTimelinePage({ contract, pageNumber, totalPages }: { contract: ContractDocumentData; pageNumber: number; totalPages: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title="Cronograma">
      <SectionHeading title="Cronograma" lead="Fases previstas, responsáveis, entregáveis associados e critérios de conclusão." />
      {contract.phases.length > 0 ? (
        <div className="contract-table-wrap"><table className="contract-table"><thead><tr><th>Fase</th><th>Datas</th><th>Detalhe</th><th>Conclusão</th></tr></thead><tbody>{contract.phases.map((phase) => <tr key={phase.id}><td>{phase.order}. {phase.name}<br />{phase.phaseType ?? 'Sem tipo'}</td><td>{formatShortDate(phase.startsAt)}<br />{formatShortDate(phase.endsAt)}<br />{phase.duration ?? ''}</td><td>{phase.description ?? ''}<br />{phase.dependencies ? `Entregáveis: ${phase.dependencies}` : ''}<br />{phase.paymentMilestone ? `Responsável: ${phase.paymentMilestone}` : ''}</td><td>{phase.approvalCriteria ?? ''}</td></tr>)}</tbody></table></div>
      ) : <div className="contract-warning">Sem fases definidas.</div>}
    </ContractPageFrame>
  );
}