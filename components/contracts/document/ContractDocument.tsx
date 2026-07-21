import type { ReactNode } from 'react';
import { CONTRACT_DOCUMENT_LOGO_PATH } from '@/lib/contracts/document/assets';
import { documentCss } from '@/lib/contracts/document/theme';
import type { ContractDocumentData, ContractRenderedPage } from '@/lib/contracts/document/types';
import { ContractAnnexesPage } from './ContractAnnexesPage';
import { ContractClausesPage } from './ContractClausesPage';
import { ContractContextPage } from './ContractContextPage';
import { ContractCoverPage } from './ContractCoverPage';
import { ContractGrowthSystemPage } from './ContractGrowthSystemPage';
import { ContractHowWeWorkPage } from './ContractHowWeWorkPage';
import { ContractIndexPage } from './ContractIndexPage';
import { ContractInvestmentPage } from './ContractInvestmentPage';
import { ContractPartiesPage } from './ContractPartiesPage';
import { ContractScopePage } from './ContractScopePage';
import { ContractSignaturesPage } from './ContractSignaturesPage';
import { ContractSlaPage } from './ContractSlaPage';
import { ContractTimelinePage } from './ContractTimelinePage';

export function ContractDocument({ contract, logoSrc = CONTRACT_DOCUMENT_LOGO_PATH }: { contract: ContractDocumentData; logoSrc?: string | null }) {
  const pages = getContractDocumentPages(contract);
  let pageNumber = 1;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: documentCss }} />
      <div className="contract-document">
        <ContractCoverPage contract={contract} logoSrc={logoSrc} />
        <ContractIndexPage contract={contract} pages={pages} />
        {pages.filter((page) => page.id !== 'cover' && page.id !== 'index').map((page) => {
          pageNumber += 1;
          return <PageRenderer contract={contract} key={page.id} pageId={page.id} pageNumber={pageNumber} />;
        })}
      </div>
    </>
  );
}

export function getContractDocumentPages(contract: ContractDocumentData): ContractRenderedPage[] {
  const definitions: Array<{ id: string; title: string; show: boolean }> = [
    { id: 'cover', title: 'Capa', show: true },
    { id: 'index', title: 'Índice', show: true },
    { id: 'how-we-work', title: 'Como trabalhamos', show: true },
    { id: 'parties', title: 'Identificação das partes', show: true },
    { id: 'context', title: 'Objeto e contexto', show: hasContext(contract) },
    { id: 'growth-system', title: 'Norm8 Growth System', show: true },
    { id: 'scope', title: 'Âmbito, entregáveis e critérios de aceitação', show: hasScope(contract) },
    { id: 'clauses', title: 'Cláusulas contratuais', show: contract.sections.length > 0 },
    { id: 'sla', title: 'SLA', show: true },
    { id: 'timeline', title: 'Cronograma', show: contract.phases.length > 0 },
    { id: 'investment', title: 'Investimento e pagamentos', show: true },
    { id: 'signatures', title: 'Assinaturas', show: true },
    { id: 'annexes', title: 'Anexos', show: true },
  ];

  return definitions.filter((page) => page.show).map((page, index) => ({ ...page, estimatedPage: index + 1 }));
}

function PageRenderer({ contract, pageId, pageNumber }: { contract: ContractDocumentData; pageId: string; pageNumber: number }): ReactNode {
  switch (pageId) {
    case 'how-we-work': return <ContractHowWeWorkPage contract={contract} pageNumber={pageNumber} />;
    case 'parties': return <ContractPartiesPage contract={contract} pageNumber={pageNumber} />;
    case 'context': return <ContractContextPage contract={contract} pageNumber={pageNumber} />;
    case 'growth-system': return <ContractGrowthSystemPage contract={contract} pageNumber={pageNumber} />;
    case 'scope': return <ContractScopePage contract={contract} pageNumber={pageNumber} />;
    case 'clauses': return <ContractClausesPage contract={contract} pageNumber={pageNumber} />;
    case 'sla': return <ContractSlaPage contract={contract} pageNumber={pageNumber} />;
    case 'timeline': return <ContractTimelinePage contract={contract} pageNumber={pageNumber} />;
    case 'investment': return <ContractInvestmentPage contract={contract} pageNumber={pageNumber} />;
    case 'signatures': return <ContractSignaturesPage contract={contract} pageNumber={pageNumber} />;
    case 'annexes': return <ContractAnnexesPage contract={contract} pageNumber={pageNumber} />;
    default: return null;
  }
}

function hasContext(contract: ContractDocumentData): boolean {
  return Boolean(contract.projectName || contract.context.executiveSummary || contract.context.projectObjective || contract.context.identifiedProblems || contract.context.proposedSolution || contract.proposal || contract.lead);
}

function hasScope(contract: ContractDocumentData): boolean {
  return Boolean(contract.context.includedScope || contract.context.excludedScope || contract.context.dependencies || contract.context.assumptions || contract.context.acceptanceCriteria || contract.deliverables.length > 0);
}