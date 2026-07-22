import { formatDocumentDate } from '@/lib/contracts/document/formatters';
import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractLogo, ContractPageFrame } from './ContractPageFrame';

export function ContractCoverPage({ contract, logoSrc }: { contract: ContractDocumentData; logoSrc?: string | null }) {
  const clientName = contract.client.legalName ?? contract.client.tradeName ?? 'Cliente por definir';
  return (
    <ContractPageFrame contract={contract} showPageNumber={false} title="Capa" variant="cover">
      <div className="contract-cover-logo-wrap">
        <ContractLogo src={logoSrc} variant="cover" />
      </div>
      <div className="contract-cover-title-block">
        <p className="contract-eyebrow">Contrato de prestação de serviços</p>
        <h1 className="contract-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
        <p className="contract-subtitle">Norm8 para {clientName}</p>
        <p className="contract-subtitle">Sistemas de IA para operações mais claras, rápidas e escaláveis.</p>
      </div>
      <div className="contract-meta-grid">
        <Meta label="Cliente" value={clientName} />
        <Meta label="Representante" value={contract.client.representative ?? 'Por definir'} />
        <Meta label="Data" value={formatDocumentDate(contract.issueDate)} />
        <Meta label="Número" value={contract.number} />
        <Meta label="Versão" value={`v${contract.version}`} />
        <Meta label="Estado" value={contract.status} />
      </div>
    </ContractPageFrame>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="contract-meta-item"><span>{label}</span><strong>{value}</strong></div>;
}
