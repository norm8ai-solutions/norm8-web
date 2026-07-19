import { formatMoneyValue, formatShortDate } from '@/lib/contracts/document/formatters';
import type { ContractDocumentData } from '@/lib/contracts/document/types';
import { ContractPageFrame, InfoCard, SectionHeading, WarningList } from './ContractPageFrame';

export function ContractInvestmentPage({ contract, pageNumber }: { contract: ContractDocumentData; pageNumber: number }) {
  const f = contract.financials;
  return (
    <ContractPageFrame contract={contract} pageNumber={pageNumber} title="Investimento e pagamentos">
      <SectionHeading title="Investimento e pagamentos" lead="Valores, impostos, validade e milestones de faturação." />
      <WarningList warnings={contract.warnings.filter((warning) => warning.includes('financeiros'))} />
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
      {contract.payments.length > 0 ? (
        <div className="contract-table-wrap"><table className="contract-table"><thead><tr><th>%</th><th>Valor</th><th>Momento</th><th>Data</th><th>Condição</th></tr></thead><tbody>{contract.payments.map((payment) => <tr key={payment.id}><td>{payment.percentage ?? '-'}</td><td>{formatMoneyValue(payment.amount, payment.currency)}</td><td>{payment.invoiceMoment ?? 'Por definir'}</td><td>{formatShortDate(payment.expectedDate)}</td><td>{payment.billingCondition ?? payment.description ?? 'Por definir'}</td></tr>)}</tbody></table></div>
      ) : <div className="contract-warning">Sem milestones de pagamento definidos.</div>}
      {(f.operateMonthlyFee || f.setupFee || f.thirdPartyCosts) ? <InfoCard label="Serviços recorrentes" value={`Fee mensal: ${formatMoneyValue(f.operateMonthlyFee, f.currency)}. Periodicidade: ${f.operatePeriodicity ?? 'Por definir'}. Pré-aviso: ${f.operateNoticePeriod ?? 'Por definir'}.`} /> : null}
    </ContractPageFrame>
  );
}