import { Fragment, type ReactNode } from 'react';
import { CONTRACT_DOCUMENT_LOGO_PATH } from '@/lib/contracts/document/assets';
import { documentCss } from '@/lib/contracts/document/theme';
import type { ContractDocumentData, ContractDocumentDeliverable, ContractDocumentPayment, ContractDocumentPhase, ContractDocumentSection, ContractRenderedPage } from '@/lib/contracts/document/types';
import { formatMoneyValue, formatShortDate, resolveClauseVariables } from '@/lib/contracts/document/formatters';
import { ContractCoverPage } from './ContractCoverPage';
import { ContractIndexPage } from './ContractIndexPage';
import { ContractHowWeWorkPage } from './ContractHowWeWorkPage';
import { ContractPartiesPage } from './ContractPartiesPage';
import { ContractGrowthSystemPage } from './ContractGrowthSystemPage';
import { ContractSlaPage } from './ContractSlaPage';
import { ContractSignaturesPage } from './ContractSignaturesPage';
import { ContractPageFrame, InfoCard, SectionHeading, WarningList } from './ContractPageFrame';

type PhysicalPage = ContractRenderedPage & {
  render: (pageNumber: number, totalPages: number) => ReactNode;
};

type TextBlock = {
  key: string;
  label: string;
  value: string | null;
};

const TEXT_BLOCK_BUDGET = 1700;
const FIRST_PAGE_TEXT_BUDGET = 1200;
const CONTINUATION_TEXT_BUDGET = 2200;
const DELIVERABLES_PER_PAGE = 4;
const CLAUSES_PER_PAGE = 4;
const PHASES_PER_PAGE = 5;
const PAYMENTS_PER_PAGE = 8;
const ANNEX_PHASES_PER_PAGE = 10;

export function ContractDocument({ contract, includeStyles = true, logoSrc = CONTRACT_DOCUMENT_LOGO_PATH }: { contract: ContractDocumentData; includeStyles?: boolean; logoSrc?: string | null }) {
  const physicalPages = buildContractPhysicalPages(contract, logoSrc);
  const totalPages = physicalPages.length;

  return (
    <>
      {includeStyles ? <style dangerouslySetInnerHTML={{ __html: documentCss }} /> : null}
      <div className="contract-document">
        {physicalPages.map((page) => (
          <Fragment key={page.id}>{page.render(page.pageNumber, totalPages)}</Fragment>
        ))}
      </div>
    </>
  );
}

export function getContractDocumentPages(contract: ContractDocumentData): ContractRenderedPage[] {
  return buildContractPhysicalPages(contract, CONTRACT_DOCUMENT_LOGO_PATH).map(({ render: _render, ...page }) => page);
}

function buildContractPhysicalPages(contract: ContractDocumentData, logoSrc?: string | null): PhysicalPage[] {
  const pages: PhysicalPage[] = [];
  const addPage = (page: Omit<PhysicalPage, 'pageNumber'>) => {
    pages.push({ ...page, pageNumber: pages.length + 1 });
  };

  addPage({
    id: 'cover',
    sectionId: 'cover',
    title: 'Capa',
    showPageNumber: false,
    render: () => <ContractCoverPage contract={contract} logoSrc={logoSrc} />,
  });

  addPage({
    id: 'index',
    sectionId: 'index',
    title: 'Índice',
    showPageNumber: true,
    render: (pageNumber, totalPages) => <ContractIndexPage contract={contract} pageNumber={pageNumber} pages={pages.map(({ render: _render, ...page }) => page)} totalPages={totalPages} />,
  });

  addStaticPage(pages, 'how-we-work', 'Como trabalhamos', (pageNumber, totalPages) => <ContractHowWeWorkPage contract={contract} pageNumber={pageNumber} totalPages={totalPages} />);
  addStaticPage(pages, 'parties', 'Identificação das partes', (pageNumber, totalPages) => <ContractPartiesPage contract={contract} pageNumber={pageNumber} totalPages={totalPages} />);

  if (hasContext(contract)) addContextPages(pages, contract);

  addStaticPage(pages, 'growth-system', 'Norm8 Growth System', (pageNumber, totalPages) => <ContractGrowthSystemPage contract={contract} pageNumber={pageNumber} totalPages={totalPages} />);

  if (hasScope(contract)) addScopePages(pages, contract);
  if (contract.sections.length > 0) addClausePages(pages, contract);

  addStaticPage(pages, 'sla', 'SLA', (pageNumber, totalPages) => <ContractSlaPage contract={contract} pageNumber={pageNumber} totalPages={totalPages} />);

  if (contract.phases.length > 0) addTimelinePages(pages, contract);

  addInvestmentPages(pages, contract);
  addStaticPage(pages, 'signatures', 'Assinaturas', (pageNumber, totalPages) => <ContractSignaturesPage contract={contract} pageNumber={pageNumber} totalPages={totalPages} />);
  addAnnexPages(pages, contract);

  return pages;
}

function addStaticPage(pages: PhysicalPage[], id: string, title: string, render: PhysicalPage['render']) {
  pages.push({ id, sectionId: id, title, showPageNumber: true, pageNumber: pages.length + 1, render });
}

function addContextPages(pages: PhysicalPage[], contract: ContractDocumentData) {
  const title = 'Objeto e contexto';
  const blocks = paginateTextBlocks([
    { key: 'executive-summary', label: 'Resumo executivo', value: contract.context.executiveSummary },
    { key: 'objective', label: 'Objetivo', value: contract.context.projectObjective },
    { key: 'identified-problems', label: 'Problemas identificados', value: contract.context.identifiedProblems },
    { key: 'proposed-solution', label: 'Solução proposta', value: contract.context.proposedSolution },
  ], TEXT_BLOCK_BUDGET);
  const chunks = chunkByWeight(blocks, (block) => textWeight(block.value), FIRST_PAGE_TEXT_BUDGET, CONTINUATION_TEXT_BUDGET);

  chunks.forEach((chunk, index) => {
    pages.push({
      id: index === 0 ? 'context' : `context-${index + 1}`,
      sectionId: 'context',
      title: index === 0 ? title : `${title} (continuação ${index + 1})`,
      showPageNumber: true,
      isContinuation: index > 0,
      pageNumber: pages.length + 1,
      render: (pageNumber, totalPages) => (
        <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title={index === 0 ? title : `${title} - continuação`}>
          <SectionHeading title={index === 0 ? title : `${title} - continuação`} lead={index === 0 ? 'Contexto comercial, objetivo e solução proposta.' : 'Continuação do contexto do contrato.'} />
          {index === 0 ? (
            <div className="contract-grid-2 contract-avoid-break">
              <InfoCard label="Projeto" value={contract.projectName} />
              <InfoCard label="Proposta associada" value={contract.proposal?.title} />
              <InfoCard label="Lead associada" value={contract.lead ? `${contract.lead.company} - ${contract.lead.email}` : null} />
              <InfoCard label="Serviços incluídos" value={contract.includedServices.join(', ')} />
            </div>
          ) : null}
          {chunk.map((block) => <InfoCard key={block.key} label={block.label} value={block.value} />)}
        </ContractPageFrame>
      ),
    });
  });
}

function addScopePages(pages: PhysicalPage[], contract: ContractDocumentData) {
  const title = 'Âmbito e entregáveis';
  const scopeBlocks = paginateTextBlocks([
    { key: 'included-scope', label: 'Âmbito incluído', value: contract.context.includedScope },
    { key: 'excluded-scope', label: 'Âmbito excluído', value: contract.context.excludedScope },
    { key: 'dependencies', label: 'Dependências', value: contract.context.dependencies },
    { key: 'assumptions', label: 'Assunções', value: contract.context.assumptions },
    { key: 'acceptance-criteria', label: 'Critérios gerais de aceitação', value: contract.context.acceptanceCriteria },
  ], TEXT_BLOCK_BUDGET);
  const firstDeliverables = contract.deliverables.slice(0, 2);
  const remainingDeliverables = contract.deliverables.slice(2);
  const chunks: Array<{ blocks: TextBlock[]; deliverables: ContractDocumentDeliverable[] }> = [];

  chunks.push({ blocks: scopeBlocks.slice(0, 3), deliverables: firstDeliverables });
  const remainingBlocks = scopeBlocks.slice(3);
  chunkByWeight(remainingBlocks, (block) => textWeight(block.value), FIRST_PAGE_TEXT_BUDGET, CONTINUATION_TEXT_BUDGET).forEach((blocks) => chunks.push({ blocks, deliverables: [] }));
  chunkArray(remainingDeliverables, DELIVERABLES_PER_PAGE).forEach((deliverables) => chunks.push({ blocks: [], deliverables }));
  if (chunks.length === 0) chunks.push({ blocks: [], deliverables: [] });

  chunks.forEach((chunk, index) => {
    pages.push({
      id: index === 0 ? 'scope' : `scope-${index + 1}`,
      sectionId: 'scope',
      title: index === 0 ? title : `${title} (continuação ${index + 1})`,
      showPageNumber: true,
      isContinuation: index > 0,
      pageNumber: pages.length + 1,
      render: (pageNumber, totalPages) => (
        <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title={index === 0 ? title : `${title} - continuação`}>
          <SectionHeading title={index === 0 ? 'Âmbito, entregáveis e critérios de aceitação' : `${title} - continuação`} lead={index === 0 ? 'O que está incluído, excluído e preparado para validação.' : 'Continuação dos blocos de âmbito e entregáveis.'} />
          {chunk.blocks.length > 0 ? <div className="contract-grid-2">{chunk.blocks.map((block) => <InfoCard key={block.key} label={block.label} value={block.value} />)}</div> : null}
          {chunk.deliverables.length > 0 ? <DeliverableGrid deliverables={chunk.deliverables} /> : index === 0 && contract.deliverables.length === 0 ? <div className="contract-warning">Sem entregáveis definidos.</div> : null}
        </ContractPageFrame>
      ),
    });
  });
}

function addClausePages(pages: PhysicalPage[], contract: ContractDocumentData) {
  const chunks = chunkArray(contract.sections, CLAUSES_PER_PAGE);
  chunks.forEach((sections, index) => {
    const title = index === 0 ? 'Cláusulas contratuais' : `Cláusulas contratuais (continuação ${index + 1})`;
    pages.push({
      id: index === 0 ? 'clauses' : `clauses-${index + 1}`,
      sectionId: 'clauses',
      title,
      showPageNumber: true,
      isContinuation: index > 0,
      pageNumber: pages.length + 1,
      render: (pageNumber, totalPages) => (
        <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title={title.replace(' (', ' - ').replace(')', '')}>
          <SectionHeading title={index === 0 ? 'Cláusulas contratuais' : 'Cláusulas contratuais - continuação'} lead={index === 0 ? 'Condições selecionadas para este contrato.' : 'Continuação das condições selecionadas.'} />
          {index === 0 ? <WarningList warnings={contract.warnings.filter((warning) => warning.includes('clausulas') || warning.includes('cláusulas'))} /> : null}
          {sections.map((section) => <ClauseBlock contract={contract} key={section.id} section={section} />)}
        </ContractPageFrame>
      ),
    });
  });
}

function addTimelinePages(pages: PhysicalPage[], contract: ContractDocumentData) {
  const chunks = chunkArray(contract.phases, PHASES_PER_PAGE);
  chunks.forEach((phases, index) => {
    const title = index === 0 ? 'Cronograma' : `Cronograma (continuação ${index + 1})`;
    pages.push({
      id: index === 0 ? 'timeline' : `timeline-${index + 1}`,
      sectionId: 'timeline',
      title,
      showPageNumber: true,
      isContinuation: index > 0,
      pageNumber: pages.length + 1,
      render: (pageNumber, totalPages) => (
        <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title={title.replace(' (', ' - ').replace(')', '')}>
          <SectionHeading title={index === 0 ? 'Cronograma' : 'Cronograma - continuação'} lead={index === 0 ? 'Fases previstas, responsáveis, entregáveis associados e critérios de conclusão.' : 'Continuação das fases previstas.'} />
          <TimelineTable phases={phases} />
        </ContractPageFrame>
      ),
    });
  });
}

function addInvestmentPages(pages: PhysicalPage[], contract: ContractDocumentData) {
  const title = 'Investimento e pagamentos';
  const f = contract.financials;
  const paymentChunks = chunkArray(contract.payments, PAYMENTS_PER_PAGE);
  const recurring = f.operateMonthlyFee || f.setupFee || f.thirdPartyCosts;
  const chunks = paymentChunks.length > 0 ? paymentChunks : [[]];

  chunks.forEach((payments, index) => {
    pages.push({
      id: index === 0 ? 'investment' : `investment-${index + 1}`,
      sectionId: 'investment',
      title: index === 0 ? title : `${title} (continuação ${index + 1})`,
      showPageNumber: true,
      isContinuation: index > 0,
      pageNumber: pages.length + 1,
      render: (pageNumber, totalPages) => (
        <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title={index === 0 ? title : `${title} - continuação`}>
          <SectionHeading title={index === 0 ? title : `${title} - continuação`} lead={index === 0 ? 'Valores, impostos, validade e milestones de faturação.' : 'Continuação dos milestones de faturação.'} />
          {index === 0 ? <InvestmentSummary contract={contract} /> : null}
          {payments.length > 0 ? <PaymentsTable contract={contract} payments={payments} /> : <div className="contract-warning">Sem milestones de pagamento definidos.</div>}
          {index === chunks.length - 1 && recurring ? <InfoCard label="Serviços recorrentes" value={`Fee mensal: ${formatMoneyValue(f.operateMonthlyFee, f.currency)}. Periodicidade: ${f.operatePeriodicity ?? 'Por definir'}. Pré-aviso: ${f.operateNoticePeriod ?? 'Por definir'}.`} /> : null}
        </ContractPageFrame>
      ),
    });
  });
}

function addAnnexPages(pages: PhysicalPage[], contract: ContractDocumentData) {
  const phaseChunks = chunkArray(contract.phases, ANNEX_PHASES_PER_PAGE);
  const chunks = phaseChunks.length > 0 ? phaseChunks : [[]];
  chunks.forEach((phases, index) => {
    pages.push({
      id: index === 0 ? 'annexes' : `annexes-${index + 1}`,
      sectionId: 'annexes',
      title: index === 0 ? 'Anexos' : `Anexos (continuação ${index + 1})`,
      showPageNumber: true,
      isContinuation: index > 0,
      pageNumber: pages.length + 1,
      render: (pageNumber, totalPages) => (
        <ContractPageFrame contract={contract} pageNumber={pageNumber} totalPages={totalPages} title={index === 0 ? 'Anexos' : 'Anexos - continuação'}>
          <SectionHeading title={index === 0 ? 'Anexos' : 'Anexos - continuação'} lead="Referências complementares do contrato." />
          {index === 0 ? <InfoCard label="Anexo A - Proposta Comercial" value={contract.proposal ? `A Proposta Comercial ${contract.proposal.title} constitui parte integrante deste contrato.` : 'Sem proposta comercial associada.'} /> : null}
          <InfoCard label="Anexo B - Cronograma" value={phases.map((phase) => `${phase.order}. ${phase.name} (${formatShortDate(phase.startsAt)} - ${formatShortDate(phase.endsAt)})`).join('\n') || 'Sem cronograma detalhado.'} />
          {index === chunks.length - 1 ? <InfoCard label="Anexo C - Kick-off Checklist" value="A checklist de kick-off será preparada após assinatura do contrato e confirmação do pagamento inicial." /> : null}
        </ContractPageFrame>
      ),
    });
  });
}

function DeliverableGrid({ deliverables }: { deliverables: ContractDocumentDeliverable[] }) {
  return (
    <div className="contract-grid-2">
      {deliverables.map((deliverable) => (
        <div className="contract-card contract-avoid-break" key={deliverable.id}>
          <strong>{deliverable.title}</strong>
          <span>{deliverable.description || 'Sem descrição adicional.'}</span>
          <span>Fase: {deliverable.phase ?? 'Por definir'} - Data: {formatShortDate(deliverable.estimatedDate)}</span>
          <span>Responsável: {deliverable.responsible ?? 'Por definir'}</span>
          <span>Critério: {deliverable.acceptanceCriteria ?? 'Por definir'}</span>
        </div>
      ))}
    </div>
  );
}

function ClauseBlock({ contract, section }: { contract: ContractDocumentData; section: ContractDocumentSection }) {
  return (
    <section className="contract-clause contract-avoid-break">
      <h3>{section.order}. {section.title}</h3>
      <p>{resolveClauseVariables(section.content, contract)}</p>
    </section>
  );
}

function TimelineTable({ phases }: { phases: ContractDocumentPhase[] }) {
  return <div className="contract-table-wrap contract-avoid-break"><table className="contract-table"><thead><tr><th>Fase</th><th>Datas</th><th>Detalhe</th><th>Conclusão</th></tr></thead><tbody>{phases.map((phase) => <tr className="contract-avoid-break" key={phase.id}><td>{phase.order}. {phase.name}<br />{phase.phaseType ?? 'Sem tipo'}</td><td>{formatShortDate(phase.startsAt)}<br />{formatShortDate(phase.endsAt)}<br />{phase.duration ?? ''}</td><td>{phase.description ?? ''}<br />{phase.dependencies ? `Entregáveis: ${phase.dependencies}` : ''}<br />{phase.paymentMilestone ? `Responsável: ${phase.paymentMilestone}` : ''}</td><td>{phase.approvalCriteria ?? ''}</td></tr>)}</tbody></table></div>;
}

function InvestmentSummary({ contract }: { contract: ContractDocumentData }) {
  const f = contract.financials;
  return (
    <>
      <WarningList warnings={contract.warnings.filter((warning) => warning.includes('financeiros') || warning.includes('investimento'))} />
      <div className="contract-grid-3">
        <InfoCard label="Valor comercial" value={formatMoneyValue(f.commercialValue, f.currency)} />
        <InfoCard label="Desconto" value={f.discount ? formatMoneyValue(f.discount, f.currency) : 'Sem desconto'} />
        <InfoCard label="Valor final" value={formatMoneyValue(f.finalValue, f.currency)} />
        <InfoCard label="IVA" value={f.vatRate ? `${f.vatRate}%` : 'Por definir'} />
        <InfoCard label="Valor com IVA" value={formatMoneyValue(f.valueWithVat, f.currency)} />
        <InfoCard label="Moeda" value={f.currency} />
        <InfoCard label="Estado fiscal" value={f.taxStatus} />
        <InfoCard label="Validade" value={f.proposalValidity ? formatShortDate(f.proposalValidity) : formatShortDate(contract.validUntil)} />
        <InfoCard label="Data limite" value={formatShortDate(f.paymentDueDate)} />
      </div>
    </>
  );
}

function PaymentsTable({ contract, payments }: { contract: ContractDocumentData; payments: ContractDocumentPayment[] }) {
  const f = contract.financials;
  return <div className="contract-table-wrap contract-avoid-break"><table className="contract-table"><thead><tr><th>%</th><th>Valor</th><th>Valor c/ IVA</th><th>Momento</th><th>Data</th><th>Condição</th></tr></thead><tbody>{payments.map((payment) => <tr className="contract-avoid-break" key={payment.id}><td>{payment.percentage ?? '-'}</td><td>{formatMoneyValue(payment.amount, payment.currency)}</td><td>{formatMoneyValue(calculatePaymentValueWithVat(payment.amount, f.vatRate), payment.currency)}</td><td>{payment.invoiceMoment ?? 'Por definir'}</td><td>{formatShortDate(payment.expectedDate)}</td><td>{payment.billingCondition ?? payment.description ?? 'Por definir'}</td></tr>)}</tbody></table></div>;
}

function paginateTextBlocks(blocks: TextBlock[], maxLength: number): TextBlock[] {
  return blocks.flatMap((block) => {
    if (!block.value || block.value.length <= maxLength) return [block];
    return splitText(block.value, maxLength).map((value, index) => ({
      key: `${block.key}-${index + 1}`,
      label: index === 0 ? block.label : `${block.label} (continuação)`,
      value,
    }));
  });
}

function splitText(value: string, maxLength: number): string[] {
  const paragraphs = value.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const paragraph of paragraphs.length > 0 ? paragraphs : [value]) {
    if (paragraph.length > maxLength) {
      pushCurrent();
      for (let index = 0; index < paragraph.length; index += maxLength) chunks.push(paragraph.slice(index, index + maxLength).trim());
      continue;
    }
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxLength) {
      pushCurrent();
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  pushCurrent();
  return chunks.length > 0 ? chunks : [value];
}

function chunkByWeight<T>(items: T[], getWeight: (item: T) => number, firstBudget: number, nextBudget: number): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let currentWeight = 0;

  items.forEach((item) => {
    const budget = chunks.length === 0 ? firstBudget : nextBudget;
    const weight = getWeight(item);
    if (current.length > 0 && currentWeight + weight > budget) {
      chunks.push(current);
      current = [];
      currentWeight = 0;
    }
    current.push(item);
    currentWeight += weight;
  });

  if (current.length > 0) chunks.push(current);
  return chunks;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function textWeight(value: string | null): number {
  return Math.max(180, value?.length ?? 0);
}

function calculatePaymentValueWithVat(amount: string | null, vatRate: string | null): string | null {
  const parsedAmount = parseMoney(amount);
  const parsedVat = parseMoney(vatRate) ?? 0;
  if (parsedAmount === null) return null;
  return String(Math.round((parsedAmount * (1 + parsedVat / 100) + Number.EPSILON) * 100) / 100);
}

function parseMoney(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function hasContext(contract: ContractDocumentData): boolean {
  return Boolean(contract.projectName || contract.context.executiveSummary || contract.context.projectObjective || contract.context.identifiedProblems || contract.context.proposedSolution || contract.proposal || contract.lead);
}

function hasScope(contract: ContractDocumentData): boolean {
  return Boolean(contract.context.includedScope || contract.context.excludedScope || contract.context.dependencies || contract.context.assumptions || contract.context.acceptanceCriteria || contract.deliverables.length > 0);
}
