import Link from 'next/link';
import { AlertTriangle, Banknote, CalendarClock, Clock3, Euro, Info, Percent, ReceiptText, Repeat, Target, TrendingDown, TrendingUp, Users } from 'lucide-react';
import type { FinanceRecurringCostStatus, FinanceRecurringRevenueStatus, FinanceTransactionStatus, FinanceTransactionType } from '@/app/generated/prisma/client';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminEmptyState, AdminPanel, AdminStatCard, AdminTable } from '@/components/admin/AdminPrimitives';
import { Norm8Select, type Norm8SelectOption } from '@/components/ui/norm8-select';
import { FinanceFiltersForm, FinanceQuickStatusAction, FinanceRecurringCostModal, FinanceRecurringCostStatusAction, FinanceRecurringRevenueModal, FinanceRecurringRevenueStatusAction, FinanceTransactionModal } from '@/components/admin/FinanceTransactionControls';
import { requireAdmin } from '@/lib/admin/auth';
import { formatDatePt } from '@/lib/admin/formatters';
import { calculateMonthlyEquivalentCents, formatRecurringCostFrequency, formatRecurringCostStatus, getNextRecurringCostRenewalDate, getNextRenewalLabel } from '@/lib/admin/finance-recurring-costs';
import { formatCurrencyCents, formatDateOnly, formatFinanceSource, formatFinanceTransactionStatus, formatFinanceTransactionType, formatPercentage, formatRunwayMonths, formatSignedCurrencyCents } from '@/lib/finance/formatters';
import { getFinanceDashboard, parseFinanceFilters } from '@/lib/finance/queries';
import { formatRecurringRevenueStatus } from '@/lib/finance/recurring-revenue';

type FinancePageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminFinancePage({ searchParams }: FinancePageProps) {
  await requireAdmin();
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseFinanceFilters(resolvedSearchParams);
  const data = await getFinanceDashboard(filters);
  const hasTransactions = data.transactions.length > 0 || data.recentTransactions.length > 0;
  const hasRecurringRevenues = data.recurringRevenue.recurringRevenues.length > 0;
  const hasRecurringCosts = data.recurringCosts.costs.length > 0;
  const mrrCents = data.recurringRevenue.metrics.mrrCents;
  const burnRateCents = data.recurringCosts.metrics.monthlyBurnRateCents;
  const estimatedNetMrrCents = mrrCents - burnRateCents;
  const costCoverage = burnRateCents > 0 ? Math.round((mrrCents / burnRateCents) * 10) / 10 : null;

  return (
    <div className="admin-page-grid finance-page">
      <AdminPanel title="Finance" subtitle={'Gest\u00e3o interna de entradas, despesas, lucro e transa\u00e7\u00f5es da Norm8.'} action={<FinanceTransactionModal accounts={data.accounts} categories={data.categories} clientOptions={data.clientOptions} />}>
        <div className="admin-kpi-grid finance-kpi-grid">
          <AdminStatCard icon={<TrendingUp size={16} />} label="Entradas" value={formatCurrencyCents(data.metrics.confirmedIncomeCents)} context={'Entradas confirmadas no per\u00edodo selecionado.'} />
          <AdminStatCard icon={<TrendingDown size={16} />} label="Despesas" value={formatCurrencyCents(data.metrics.confirmedExpenseCents)} context={'Despesas confirmadas no per\u00edodo selecionado.'} />
          <AdminStatCard icon={<Euro size={16} />} label="Lucro" value={formatCurrencyCents(data.metrics.profitCents)} context="Entradas confirmadas menos despesas confirmadas." />
          <AdminStatCard icon={<Percent size={16} />} label="Margem" value={String(data.metrics.margin) + '%'} context="Lucro dividido pelas entradas confirmadas." />
          <AdminStatCard icon={<Clock3 size={16} />} label={'Transa\u00e7\u00f5es pendentes'} value={formatCurrencyCents(data.metrics.pendingCents)} context="Soma de entradas e despesas ainda pendentes." />
          <AdminStatCard icon={<Banknote size={16} />} label="Saldo estimado" value={formatCurrencyCents(data.metrics.estimatedBalanceCents)} context={'Confirmado l\u00edquido ajustado por pendentes.'} />
        </div>
      </AdminPanel>

      <AdminPanel title="Alertas financeiros" subtitle="Sinais internos para acompanhar riscos, pendentes e custos da Norm8.">
        {data.alerts.length > 0 ? (
          <div className="finance-alert-list">
            {data.alerts.map((alert) => (
              <article className={`finance-alert-item finance-alert-item-${alert.severity}`} key={alert.id}>
                <div className="finance-alert-icon">{getFinanceAlertIcon(alert.severity)}</div>
                <div>
                  <div className="finance-alert-heading"><strong>{alert.title}</strong><span className={`admin-badge ${getFinanceAlertBadgeClass(alert.severity)}`}>{formatFinanceAlertSeverity(alert.severity)}</span></div>
                  <p>{alert.description}</p>
                </div>
                {alert.actionHref && alert.actionLabel ? <Link className="admin-link finance-table-link" href={alert.actionHref}>{alert.actionLabel}</Link> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="finance-empty-state">
            <AdminEmptyState>Sem alertas financeiros neste momento.</AdminEmptyState>
            <p className="admin-panel-subtitle">Não foram encontrados riscos financeiros relevantes com base nos dados atuais.</p>
          </div>
        )}
      </AdminPanel>

      <AdminPanel className="finance-section-anchor" id="receita-recorrente" title="Receita recorrente" subtitle="Acompanhe MRR, ARR, clientes ativos e mensalidade média da Norm8." action={<FinanceRecurringRevenueModal accounts={data.accounts} categories={data.categories} clientOptions={data.clientOptions} proposalOptionsByLeadId={data.proposalOptionsByLeadId} />}>
        <div className="admin-kpi-grid finance-kpi-grid">
          <AdminStatCard icon={<Euro size={16} />} label="MRR" value={formatCurrencyCents(data.recurringRevenue.metrics.mrrCents)} context="Mensalidades ativas no momento atual." />
          <AdminStatCard icon={<TrendingUp size={16} />} label="ARR" value={formatCurrencyCents(data.recurringRevenue.metrics.arrCents)} context="MRR multiplicado por 12." />
          <AdminStatCard icon={<Users size={16} />} label="Clientes ativos" value={String(data.recurringRevenue.metrics.activeClients)} context="Clientes únicos com receita recorrente ativa." />
          <AdminStatCard icon={<Banknote size={16} />} label="Mensalidade média" value={formatCurrencyCents(data.recurringRevenue.metrics.averageMonthlyRevenueCents)} context="MRR dividido por clientes ativos." />
          <AdminStatCard icon={<ReceiptText size={16} />} label="Receita pontual" value={formatCurrencyCents(data.recurringRevenue.metrics.oneOffRevenueCents)} context="Entradas pontuais confirmadas ou pendentes no período." />
          <AdminStatCard icon={<Clock3 size={16} />} label="Receita recorrente mensal" value={formatCurrencyCents(data.recurringRevenue.metrics.recurringMonthlyRevenueCents)} context="MRR atual separado das implementações pontuais." />
        </div>
      </AdminPanel>

      <AdminPanel title="Meta mensal" subtitle="Progresso simples para a meta interna de 10k€/mês.">
        <div className="finance-target-card">
          <div>
            <span className="finance-target-label">Progresso MRR</span>
            <strong>{formatCurrencyCents(data.recurringRevenue.metrics.mrrCents)} / {formatCurrencyCents(data.recurringRevenue.metrics.targetMrrCents)}</strong>
          </div>
          <span className="admin-badge admin-badge-blue"><Target size={13} /> {data.recurringRevenue.metrics.targetProgress}%</span>
        </div>
        <div className="finance-target-track" aria-hidden="true"><span style={{ width: String(data.recurringRevenue.metrics.targetProgress) + '%' }} /></div>
      </AdminPanel>

      <AdminPanel className="finance-section-anchor" id="previsao-financeira" title="Previsão financeira" subtitle={`Veja a receita, despesas, lucro e saldo estimado para ${data.forecast.monthLabel}.`}>
        <div className="admin-kpi-grid finance-kpi-grid">
          <AdminStatCard icon={<TrendingUp size={16} />} label="Receita prevista este mês" value={formatCurrencyCents(data.forecast.expectedMonthIncomeCents)} context="Entradas confirmadas do mês somadas às receitas ainda previstas." />
          <AdminStatCard icon={<TrendingDown size={16} />} label="Despesas previstas este mês" value={formatCurrencyCents(data.forecast.expectedMonthExpenseCents)} context="Despesas confirmadas do mês somadas aos custos ainda previstos." />
          <AdminStatCard icon={<Euro size={16} />} label="Lucro previsto" value={formatCurrencyCents(data.forecast.expectedProfitCents)} context="Resultado confirmado do mês somado ao resultado futuro restante." />
          <AdminStatCard icon={<Banknote size={16} />} label="Saldo estimado no fim do mês" value={formatCurrencyCents(data.forecast.estimatedEndOfMonthBalanceCents)} context="Saldo confirmado atual somado ao resultado previsto restante do mês." />
          <AdminStatCard icon={<CalendarClock size={16} />} label="Runway" value={formatRunwayMonths(data.forecast.runwayMonths)} context="Meses estimados que o saldo consegue cobrir com o burn rate atual." />
        </div>
        <div className="finance-forecast-breakdown" aria-label="Breakdown da previsão">
          <FinanceForecastBreakdownItem label="Saldo atual" value={formatCurrencyCents(data.forecast.estimatedCurrentBalanceCents)} />
          <FinanceForecastBreakdownItem label="Resultado confirmado do mês" value={formatCurrencyCents(data.forecast.breakdown.confirmedMonthProfitCents)} />
          <FinanceForecastBreakdownItem label="Entradas pendentes" value={formatCurrencyCents(data.forecast.breakdown.pendingIncomeFutureCents)} />
          <FinanceForecastBreakdownItem label="Receitas recorrentes futuras" value={formatCurrencyCents(data.forecast.breakdown.recurringRevenueFutureCents)} />
          <FinanceForecastBreakdownItem label="Despesas pendentes" value={formatCurrencyCents(data.forecast.breakdown.pendingExpensesFutureCents)} />
          <FinanceForecastBreakdownItem label="Custos recorrentes a renovar" value={formatCurrencyCents(data.forecast.breakdown.recurringCostsFutureCents)} />
        </div>
      </AdminPanel>

      <AdminPanel className="finance-section-anchor" id="lucro-por-cliente" title="Lucro por cliente" subtitle="Acompanhe receita, despesas, lucro e margem por cliente ou projeto." action={<FinanceProfitabilityFiltersForm filters={filters} />}>
        <div className="admin-kpi-grid finance-kpi-grid">
          <AdminStatCard icon={<Users size={16} />} label="Cliente mais rentável" value={data.profitability.metrics.mostProfitableClient?.clientName ?? '—'} context={data.profitability.metrics.mostProfitableClient ? 'Lucro: ' + formatCurrencyCents(data.profitability.metrics.mostProfitableClient.profitCents) : 'Sem clientes analisados.'} />
          <AdminStatCard icon={<TrendingUp size={16} />} label="Receita por clientes" value={formatCurrencyCents(data.profitability.metrics.associatedRevenueCents)} context="Entradas associadas a clientes no período." />
          <AdminStatCard icon={<TrendingDown size={16} />} label="Despesas associadas" value={formatCurrencyCents(data.profitability.metrics.associatedExpenseCents)} context="Despesas associadas a clientes no período." />
          <AdminStatCard icon={<Euro size={16} />} label="Lucro por clientes" value={formatCurrencyCents(data.profitability.metrics.associatedProfitCents)} context="Receita associada menos despesas associadas." />
          <AdminStatCard icon={<Percent size={16} />} label="Maior margem" value={formatPercentage(data.profitability.metrics.bestMarginClient?.marginPercentage)} context={data.profitability.metrics.bestMarginClient?.clientName ?? 'Sem receita associada.'} />
        </div>
        {data.profitability.items.length > 0 ? (
          <AdminTable headers={['Cliente', 'Receita', 'Despesas', 'Lucro', 'Margem', 'Transações', 'Última transação', 'Ações']}>
            {data.profitability.items.map((client) => (
              <tr key={client.id}>
                <td>
                  <strong className="finance-table-title">{client.clientName}</strong>
                  <span className="finance-table-meta">{client.activeRecurringRevenueCents > 0 ? 'MRR associado: ' + formatCurrencyCents(client.activeRecurringRevenueCents) : 'Sem MRR associado'}{client.proposalCount > 0 || client.contractCount > 0 ? ' · ' + formatCommercialCount(client.proposalCount, client.contractCount) : ''}</span>
                </td>
                <td className="finance-amount-income">{formatCurrencyCents(client.totalRevenueCents)}</td>
                <td className="finance-amount-expense">{formatCurrencyCents(client.totalExpensesCents)}</td>
                <td className={client.profitCents >= 0 ? 'finance-amount-income' : 'finance-amount-expense'}>{formatCurrencyCents(client.profitCents)}</td>
                <td>{formatPercentage(client.marginPercentage)}</td>
                <td>{client.transactionCount}</td>
                <td>{formatDateOnly(client.latestTransactionAt)}</td>
                <td><div className="finance-table-actions"><FinanceProfitabilityActions clientName={client.clientName} contractId={client.primaryContractId} leadId={client.leadId} proposalId={client.primaryProposalId} /></div></td>
              </tr>
            ))}
          </AdminTable>
        ) : <FinanceProfitabilityEmptyState />}
      </AdminPanel>

      <AdminPanel className="finance-section-anchor" id="custos-recorrentes" title="Custos recorrentes" subtitle="Acompanhe custos fixos, renovações e burn rate mensal da Norm8." action={<FinanceRecurringCostModal accounts={data.accounts} categories={data.categories} />}>
        <div className="admin-kpi-grid finance-kpi-grid">
          <AdminStatCard icon={<Euro size={16} />} label="Custos fixos mensais" value={formatCurrencyCents(data.recurringCosts.metrics.monthlyFixedCostsCents)} context="Custos ativos normalizados para valor mensal." />
          <AdminStatCard icon={<TrendingDown size={16} />} label="Custos fixos anuais" value={formatCurrencyCents(data.recurringCosts.metrics.annualFixedCostsCents)} context="Burn rate mensal multiplicado por 12." />
          <AdminStatCard icon={<Repeat size={16} />} label="Burn rate mensal" value={formatCurrencyCents(data.recurringCosts.metrics.monthlyBurnRateCents)} context="Custo fixo mensal atual da operação." />
          <AdminStatCard icon={<CalendarClock size={16} />} label="Próximas renovações" value={String(data.recurringCosts.metrics.upcomingRenewalsCount)} context="Renovações ativas nos próximos 30 dias." />
          <AdminStatCard icon={<ReceiptText size={16} />} label="Custos ativos" value={String(data.recurringCosts.metrics.activeCosts)} context="Subscrições e custos recorrentes ativos." />
          <AdminStatCard icon={<Banknote size={16} />} label="Maior custo recorrente" value={formatCurrencyCents(data.recurringCosts.metrics.largestRecurringCostCents)} context="Maior equivalente mensal ativo." />
        </div>
        <div className="finance-target-card">
          <div>
            <span className="finance-target-label">MRR líquido estimado</span>
            <strong>{formatCurrencyCents(estimatedNetMrrCents)}</strong>
          </div>
          <span className="admin-badge admin-badge-blue">Cobertura {costCoverage === null ? 'sem custos' : String(costCoverage) + 'x'}</span>
        </div>
        <p className="admin-panel-subtitle">MRR atual: {formatCurrencyCents(mrrCents)} · Burn rate mensal: {formatCurrencyCents(burnRateCents)}</p>
      </AdminPanel>

      <AdminPanel title="Próximas renovações" subtitle="Custos ativos com renovação nos próximos 30 dias.">
        {data.recurringCosts.upcomingRenewals.length > 0 ? (
          <div className="finance-recent-list">
            {data.recurringCosts.upcomingRenewals.map((cost) => (
              <article className="finance-recent-item" key={cost.id}>
                <div className="finance-recent-icon"><CalendarClock size={15} /></div>
                <div><strong>{cost.title}</strong><p>{cost.vendorName ?? cost.category?.name ?? 'Custo recorrente'} · {getNextRenewalLabel(cost.nextRenewalDate)}</p></div>
                <span className="finance-amount-expense">{formatCurrencyCents(cost.amountCents, cost.currency)}</span>
              </article>
            ))}
          </div>
        ) : <AdminEmptyState>Sem renovações próximas.</AdminEmptyState>}
      </AdminPanel>

      <AdminPanel title="Subscrições e custos recorrentes" subtitle={String(data.recurringCosts.costs.length) + ' custos registados'} action={<FinanceRecurringCostModal accounts={data.accounts} categories={data.categories} />}>
        {hasRecurringCosts ? (
          <AdminTable headers={['Custo', 'Fornecedor', 'Categoria', 'Frequência', 'Valor', 'Equiv. mensal', 'Renovação', 'Estado', 'Ações']}>
            {data.recurringCosts.costs.map((cost) => (
              <tr key={cost.id}>
                <td><strong className="finance-table-title">{cost.title}</strong>{cost.description ? <span className="finance-table-meta">{cost.description}</span> : null}</td>
                <td>{cost.websiteUrl ? <Link className="admin-link finance-table-link" href={cost.websiteUrl} target="_blank">{cost.vendorName ?? 'Abrir website'}</Link> : cost.vendorName ?? 'Sem fornecedor'}</td>
                <td>{cost.category?.name ?? 'Sem categoria'}</td>
                <td>{formatRecurringCostFrequency(cost.frequency)}</td>
                <td className="finance-amount-expense">{formatCurrencyCents(cost.amountCents, cost.currency)}</td>
                <td className="finance-amount-expense">{formatCurrencyCents(calculateMonthlyEquivalentCents(cost), cost.currency)}</td>
                <td>{formatDateOnly(getNextRecurringCostRenewalDate(cost))}</td>
                <td><FinanceRecurringCostStatusBadge status={cost.status} /></td>
                <td><div className="finance-table-actions"><FinanceRecurringCostModal accounts={data.accounts} categories={data.categories} recurringCost={cost} />{cost.status === 'ACTIVE' ? <FinanceRecurringCostStatusAction action="pause" recurringCostId={cost.id} /> : null}{cost.status === 'PAUSED' ? <FinanceRecurringCostStatusAction action="reactivate" recurringCostId={cost.id} /> : null}{cost.status !== 'CANCELLED' && cost.status !== 'ENDED' ? <FinanceRecurringCostStatusAction action="cancel" recurringCostId={cost.id} /> : null}{cost.status !== 'ENDED' ? <FinanceRecurringCostStatusAction action="end" recurringCostId={cost.id} /> : null}</div></td>
              </tr>
            ))}
          </AdminTable>
        ) : <FinanceRecurringCostEmptyState accounts={data.accounts} categories={data.categories} />}
      </AdminPanel>
      <AdminPanel title="Filtros" subtitle="Pesquise e refine a listagem financeira."><FinanceFiltersForm categories={data.categories} filters={filters} /></AdminPanel>

      <AdminPanel title={'Transa\u00e7\u00f5es recentes'} subtitle={'\u00daltimos movimentos registados no Finance.'}>
        {data.recentTransactions.length > 0 ? (
          <div className="finance-recent-list">
            {data.recentTransactions.map((transaction) => (
              <article className="finance-recent-item" key={transaction.id}>
                <div className="finance-recent-icon"><ReceiptText size={15} /></div>
                <div><strong>{transaction.title}</strong><p>{transaction.category?.name ?? 'Sem categoria'} {'\u00b7'} {formatFinanceTransactionType(transaction.type)} {'\u00b7'} {formatFinanceTransactionStatus(transaction.status)} {'\u00b7'} {formatFinanceSource(transaction.source)}</p></div>
                <span className={transaction.type === 'INCOME' ? 'finance-amount-income' : 'finance-amount-expense'}>{formatSignedCurrencyCents(transaction.amountCents, transaction.type, transaction.currency)}</span>
              </article>
            ))}
          </div>
        ) : <FinanceEmptyState accounts={data.accounts} categories={data.categories} clientOptions={data.clientOptions} />}
      </AdminPanel>

      <AdminPanel title="Receitas recorrentes" subtitle={String(data.recurringRevenue.recurringRevenues.length) + ' mensalidades registadas'} action={<FinanceRecurringRevenueModal accounts={data.accounts} categories={data.categories} clientOptions={data.clientOptions} proposalOptionsByLeadId={data.proposalOptionsByLeadId} />}>
        {hasRecurringRevenues ? (
          <AdminTable headers={['Cliente', 'Título', 'Valor mensal', 'Estado', 'Início', 'Fim', 'Ligações', 'Ações']}>
            {data.recurringRevenue.recurringRevenues.map((recurringRevenue) => (
              <tr key={recurringRevenue.id}>
                <td><strong className="finance-table-title">{recurringRevenue.clientName}</strong>{recurringRevenue.billingDay ? <span className="finance-table-meta">Cobrança dia {recurringRevenue.billingDay}</span> : null}</td>
                <td><strong className="finance-table-title">{recurringRevenue.title}</strong>{recurringRevenue.description ? <span className="finance-table-meta">{recurringRevenue.description}</span> : null}</td>
                <td className="finance-amount-income">{formatCurrencyCents(recurringRevenue.monthlyAmountCents, recurringRevenue.currency)}</td>
                <td><FinanceRecurringStatusBadge status={recurringRevenue.status} /></td>
                <td>{formatDatePt(recurringRevenue.startDate)}</td>
                <td>{recurringRevenue.endDate ? formatDatePt(recurringRevenue.endDate) : 'Sem fim definido'}</td>
                <td><div className="finance-table-actions"><FinanceCommercialLinks contractId={recurringRevenue.contractId} proposalId={recurringRevenue.proposalId} /></div></td>
                <td><div className="finance-table-actions"><FinanceRecurringRevenueModal accounts={data.accounts} categories={data.categories} clientOptions={data.clientOptions} proposalOptionsByLeadId={data.proposalOptionsByLeadId} recurringRevenue={recurringRevenue} />{recurringRevenue.status === 'ACTIVE' ? <FinanceRecurringRevenueStatusAction action="pause" recurringRevenueId={recurringRevenue.id} /> : null}{recurringRevenue.status === 'PAUSED' ? <FinanceRecurringRevenueStatusAction action="reactivate" recurringRevenueId={recurringRevenue.id} /> : null}{recurringRevenue.status !== 'ENDED' && recurringRevenue.status !== 'CANCELLED' ? <FinanceRecurringRevenueStatusAction action="end" recurringRevenueId={recurringRevenue.id} /> : null}</div></td>
              </tr>
            ))}
          </AdminTable>
        ) : <FinanceRecurringEmptyState accounts={data.accounts} categories={data.categories} clientOptions={data.clientOptions} proposalOptionsByLeadId={data.proposalOptionsByLeadId} />}
      </AdminPanel>

      <AdminPanel className="finance-section-anchor" id="transacoes" title={'Transa\u00e7\u00f5es'} subtitle={String(data.transactions.length) + ' movimentos encontrados'}>
        {hasTransactions ? (
          <AdminTable headers={['Data', 'T\u00edtulo', 'Categoria', 'Tipo', 'Estado', 'Origem', 'Valor', 'A\u00e7\u00f5es']}>
            {data.transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{formatDateOnly(transaction.occurredAt)}</td>
                <td><strong className="finance-table-title">{transaction.title}</strong>{transaction.clientName ? <span className="finance-table-meta">{transaction.clientName}</span> : null}</td>
                <td>{transaction.category?.name ?? 'Sem categoria'}</td>
                <td>{formatFinanceTransactionType(transaction.type)}</td>
                <td><FinanceStatusBadge status={transaction.status} /></td>
                <td>{formatFinanceSource(transaction.source)}</td>
                <td className={transaction.type === 'INCOME' ? 'finance-amount-income' : 'finance-amount-expense'}>{formatSignedCurrencyCents(transaction.amountCents, transaction.type, transaction.currency)}</td>
                <td><div className="finance-table-actions"><FinanceCommercialLinks contractId={transaction.contractId} proposalId={transaction.proposalId} /><FinanceTransactionModal accounts={data.accounts} categories={data.categories} clientOptions={data.clientOptions} transaction={transaction} />{transaction.status === 'PENDING' ? <FinanceQuickStatusAction action="confirm" transactionId={transaction.id} /> : null}{transaction.status !== 'CANCELLED' ? <FinanceQuickStatusAction action="cancel" transactionId={transaction.id} /> : null}</div></td>
              </tr>
            ))}
          </AdminTable>
        ) : <FinanceEmptyState accounts={data.accounts} categories={data.categories} clientOptions={data.clientOptions} />}
      </AdminPanel>
    </div>
  );
}

function getFinanceAlertIcon(severity: 'danger' | 'warning' | 'info') {
  if (severity === 'danger') return <AlertTriangle size={15} />;
  if (severity === 'warning') return <AlertTriangle size={15} />;
  return <Info size={15} />;
}

function getFinanceAlertBadgeClass(severity: 'danger' | 'warning' | 'info'): string {
  if (severity === 'danger') return 'admin-badge-red';
  if (severity === 'warning') return 'admin-badge-yellow';
  return 'admin-badge-blue';
}

function formatFinanceAlertSeverity(severity: 'danger' | 'warning' | 'info'): string {
  if (severity === 'danger') return 'Crítico';
  if (severity === 'warning') return 'Atenção';
  return 'Info';
}

const profitabilityPeriodOptions: Norm8SelectOption[] = [
  { label: 'Este mês', value: 'month' },
  { label: 'Últimos 30 dias', value: 'last30' },
  { label: 'Este trimestre', value: 'quarter' },
  { label: 'Este ano', value: 'year' },
  { label: 'Todo o período', value: 'all' },
];

const profitabilityStatusOptions: Norm8SelectOption[] = [
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Confirmado + pendente', value: 'withPending' },
];

const profitabilitySortOptions: Norm8SelectOption[] = [
  { label: 'Maior lucro', value: 'profit' },
  { label: 'Maior receita', value: 'revenue' },
  { label: 'Maior margem', value: 'margin' },
  { label: 'Mais despesas', value: 'expenses' },
  { label: 'Mais recente', value: 'recent' },
];

function FinanceProfitabilityFiltersForm({ filters }: { filters: Awaited<ReturnType<typeof getFinanceDashboard>>['filters'] }) {
  return (
    <form action="/admin/finance" className="finance-profitability-filters" method="get">
      <input name="q" type="hidden" value={filters.query ?? ''} />
      <input name="period" type="hidden" value={filters.period} />
      <input name="type" type="hidden" value={filters.type ?? 'ALL'} />
      <input name="status" type="hidden" value={filters.status ?? 'ALL'} />
      <input name="categoryId" type="hidden" value={filters.categoryId ?? 'ALL'} />
      <label><span>Período</span><Norm8Select defaultValue={filters.profitability.period} name="profitabilityPeriod" options={profitabilityPeriodOptions} /></label>
      <label><span>Estado</span><Norm8Select defaultValue={filters.profitability.status} name="profitabilityStatus" options={profitabilityStatusOptions} /></label>
      <label><span>Ordenação</span><Norm8Select defaultValue={filters.profitability.sort} name="profitabilitySort" options={profitabilitySortOptions} /></label>
      <button className="admin-button" type="submit">Aplicar</button>
    </form>
  );
}

function FinanceProfitabilityActions({ clientName, contractId, leadId, proposalId }: { clientName: string; contractId: string | null; leadId: string | null; proposalId: string | null }) {
  return (
    <>
      {leadId ? <Link className="admin-link finance-table-link" href={`/admin/leads/${leadId}`}>Ver lead</Link> : null}
      {proposalId ? <Link className="admin-link finance-table-link" href={`/admin/proposals/${proposalId}`}>Ver proposta</Link> : null}
      {contractId ? <Link className="admin-link finance-table-link" href={`/admin/contracts/${contractId}`}>Ver contrato</Link> : null}
      <Link className="admin-link finance-table-link" href={`/admin/finance?q=${encodeURIComponent(clientName)}`}>Ver transações</Link>
    </>
  );
}

function FinanceProfitabilityEmptyState() {
  return (
    <div className="finance-empty-state">
      <AdminEmptyState>Ainda não existem transações associadas a clientes.</AdminEmptyState>
      <p className="admin-panel-subtitle">Associe entradas e despesas a uma Lead para acompanhar lucro, margem e rentabilidade por cliente.</p>
    </div>
  );
}

function formatCommercialCount(proposalCount: number, contractCount: number): string {
  const parts = [];
  if (proposalCount > 0) parts.push(String(proposalCount) + ' ' + (proposalCount === 1 ? 'proposta' : 'propostas'));
  if (contractCount > 0) parts.push(String(contractCount) + ' ' + (contractCount === 1 ? 'contrato' : 'contratos'));
  return parts.join(' · ');
}

function FinanceCommercialLinks({ contractId, proposalId }: { contractId?: string | null; proposalId?: string | null }) {
  return (
    <>
      {proposalId ? <Link className="admin-link finance-table-link" href={`/admin/proposals/${proposalId}`}>Ver proposta</Link> : null}
      {contractId ? <Link className="admin-link finance-table-link" href={`/admin/contracts/${contractId}`}>Ver contrato</Link> : null}
    </>
  );
}

function FinanceForecastBreakdownItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="finance-forecast-breakdown-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FinanceRecurringCostEmptyState({ accounts, categories }: { accounts: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string; type: FinanceTransactionType }> }) {
  return <div className="finance-empty-state"><AdminEmptyState>{'Ainda não existem custos recorrentes. Adicione subscrições, ferramentas e custos fixos para acompanhar o burn rate mensal da Norm8.'}</AdminEmptyState><FinanceRecurringCostModal accounts={accounts} categories={categories} /></div>;
}
function FinanceRecurringEmptyState({ accounts, categories, clientOptions, proposalOptionsByLeadId }: { accounts: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string; type: FinanceTransactionType }>; clientOptions: Array<{ companyName: string; contactName?: string | null; email?: string | null; id: string; label: string; searchValue: string }>; proposalOptionsByLeadId: Record<string, Array<{ createdAt: Date; id: string; label: string; leadId: string; status?: string | null; title: string }>> }) {
  return <div className="finance-empty-state"><AdminEmptyState>{'Ainda n\u00e3o existem receitas recorrentes. Adicione a primeira mensalidade para come\u00e7ar a acompanhar o MRR da Norm8.'}</AdminEmptyState><FinanceRecurringRevenueModal accounts={accounts} categories={categories} clientOptions={clientOptions} proposalOptionsByLeadId={proposalOptionsByLeadId} /></div>;
}

function FinanceEmptyState({ accounts, categories, clientOptions }: { accounts: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string; type: FinanceTransactionType }>; clientOptions: Array<{ companyName: string; contactName?: string | null; email?: string | null; id: string; label: string; searchValue: string }> }) {
  return <div className="finance-empty-state"><AdminEmptyState>{'Ainda n\u00e3o existem transa\u00e7\u00f5es financeiras. Adicione a primeira entrada ou despesa para come\u00e7ar a acompanhar os resultados da Norm8.'}</AdminEmptyState><FinanceTransactionModal accounts={accounts} categories={categories} clientOptions={clientOptions} /></div>;
}

function FinanceRecurringCostStatusBadge({ status }: { status: FinanceRecurringCostStatus }) {
  const tone = status === 'ACTIVE' ? 'green' : status === 'PAUSED' ? 'yellow' : 'red';
  return <AdminBadge tone={tone}>{formatRecurringCostStatus(status)}</AdminBadge>;
}
function FinanceRecurringStatusBadge({ status }: { status: FinanceRecurringRevenueStatus }) {
  const tone = status === 'ACTIVE' ? 'green' : status === 'PAUSED' ? 'yellow' : 'red';
  return <AdminBadge tone={tone}>{formatRecurringRevenueStatus(status)}</AdminBadge>;
}

function FinanceStatusBadge({ status }: { status: FinanceTransactionStatus }) {
  const tone = status === 'CONFIRMED' ? 'green' : status === 'PENDING' ? 'yellow' : 'red';
  return <AdminBadge tone={tone}>{formatFinanceTransactionStatus(status)}</AdminBadge>;
}
