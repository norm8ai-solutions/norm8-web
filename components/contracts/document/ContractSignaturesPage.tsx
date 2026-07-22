import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, SectionHeading } from './ContractPageFrame';

export function ContractSignaturesPage({ contract, pageNumber, totalPages }: { contract: ContractDocumentData; pageNumber: number; totalPages: number }) {
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title="Assinaturas">
      <SectionHeading title="Assinaturas" lead="Espaço de assinatura das partes." />
      <div className="contract-signature-grid">
        <SignatureBlock company="Norm8" name={contract.provider.representative} role={contract.provider.representativeRole} />
        <SignatureBlock company={contract.client.legalName ?? contract.client.tradeName ?? 'Cliente'} name={contract.client.representative} role={contract.client.representativeRole} />
      </div>
    </ContractPageFrame>
  );
}

function SignatureBlock({ company, name, role }: { company: string; name: string | null; role: string | null }) {
  return <div className="contract-card"><strong>{company}</strong><span>Nome: {name ?? 'Por definir'}</span><span>Cargo: {role ?? 'Por definir'}</span><span>Data: ____ / ____ / ______</span><div className="contract-signature-line"><span>Assinatura</span></div></div>;
}