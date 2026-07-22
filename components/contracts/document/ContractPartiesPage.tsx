import type { ContractDocumentData, ContractDocumentParty } from '@/lib/contracts/document/types';
import { ContractPageFrame, InfoCard, SectionHeading, WarningList } from './ContractPageFrame';

export function ContractPartiesPage({ contract, pageNumber, totalPages }: { contract: ContractDocumentData; pageNumber: number; totalPages: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title="Identificação das partes">
      <SectionHeading title="Identificação das partes" lead="Dados legais preservados no momento de criação ou edição do contrato." />
      <WarningList warnings={contract.warnings.filter((warning) => warning.includes('Norm8') || warning.includes('Cliente'))} />
      <PartyBlock title="Norm8" party={contract.provider} />
      <PartyBlock title="Cliente" party={contract.client} />
    </ContractPageFrame>
  );
}

function PartyBlock({ party, title }: { party: ContractDocumentParty; title: string }) {
  return (
    <div>
      <h3 className="contract-section-title" style={{ fontSize: 16, marginBottom: 12 }}>{title}</h3>
      <div className="contract-grid-2">
        <InfoCard label="Nome legal" value={party.legalName} />
        <InfoCard label="Nome comercial" value={party.tradeName} />
        <InfoCard label="NIF" value={party.taxId} />
        <InfoCard label="Morada" value={[party.address, party.postalCode, party.city, party.country].filter(Boolean).join(', ')} />
        <InfoCard label="Email" value={party.email} />
        <InfoCard label="Telefone" value={party.phone} />
        <InfoCard label="Representante" value={party.representative} />
        <InfoCard label="Cargo" value={party.representativeRole} />
        <InfoCard label="Website" value={party.website} />
      </div>
    </div>
  );
}