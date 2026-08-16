'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useState } from 'react';
import type { FinanceRecurringCostFrequency, FinanceRecurringCostStatus, FinanceRecurringRevenueStatus, FinanceTransactionSource, FinanceTransactionStatus, FinanceTransactionType } from '@/app/generated/prisma/client';
import { FinanceClientSelect, type FinanceClientOption } from '@/components/admin/finance/FinanceClientSelect';
import { FinanceProposalSelect, type FinanceProposalOption } from '@/components/admin/finance/FinanceProposalSelect';
import { Norm8DateTimePicker } from '@/components/ui/norm8-date-time-picker';
import { Norm8Select, type Norm8SelectOption } from '@/components/ui/norm8-select';
import { cancelFinanceRecurringCostAction, cancelFinanceTransactionAction, confirmFinanceTransactionAction, createFinanceRecurringCostAction, createFinanceRecurringRevenueAction, createFinanceTransactionAction, endFinanceRecurringCostAction, endFinanceRecurringRevenueAction, pauseFinanceRecurringCostAction, pauseFinanceRecurringRevenueAction, reactivateFinanceRecurringCostAction, reactivateFinanceRecurringRevenueAction, updateFinanceRecurringCostAction, updateFinanceRecurringRevenueAction, updateFinanceTransactionAction, type FinanceActionState } from '@/lib/finance/actions';
import { formatCurrencyCents } from '@/lib/finance/formatters';
import { financePeriodOptions, type FinancePeriodKey } from '@/lib/finance/constants';

type FinanceCategoryOption = { id: string; name: string; type: FinanceTransactionType };
type FinanceAccountOption = { id: string; name: string };
type EditableFinanceTransaction = { id: string; accountId: string | null; amountCents: number; categoryId: string | null; clientName: string | null; currency: string; description: string | null; dueDate: Date | null; leadId: string | null; occurredAt: Date; source: FinanceTransactionSource; status: FinanceTransactionStatus; title: string; type: FinanceTransactionType };
type FinanceTransactionModalProps = { accounts: FinanceAccountOption[]; categories: FinanceCategoryOption[]; clientOptions: FinanceClientOption[]; transaction?: EditableFinanceTransaction };
type EditableFinanceRecurringRevenue = { id: string; accountId: string | null; billingDay: number | null; categoryId: string | null; clientName: string; contractId: string | null; currency: string; description: string | null; endDate: Date | null; leadId: string | null; monthlyAmountCents: number; proposalId: string | null; startDate: Date; status: FinanceRecurringRevenueStatus; title: string };
type EditableFinanceRecurringCost = { id: string; accountId: string | null; amountCents: number; billingDay: number | null; categoryId: string | null; currency: string; description: string | null; endDate: Date | null; frequency: FinanceRecurringCostFrequency; renewalDate: Date | null; startDate: Date; status: FinanceRecurringCostStatus; title: string; vendorName: string | null; websiteUrl: string | null };
type FinanceRecurringCostModalProps = { accounts: FinanceAccountOption[]; categories: FinanceCategoryOption[]; recurringCost?: EditableFinanceRecurringCost };
type FinanceProposalOptionsByLeadId = Record<string, FinanceProposalOption[]>;
type FinanceRecurringRevenueModalProps = { accounts: FinanceAccountOption[]; categories: FinanceCategoryOption[]; clientOptions: FinanceClientOption[]; proposalOptionsByLeadId: FinanceProposalOptionsByLeadId; recurringRevenue?: EditableFinanceRecurringRevenue };
type FinanceFiltersFormProps = { categories: FinanceCategoryOption[]; filters: { categoryId?: string; period: FinancePeriodKey; query?: string; status?: FinanceTransactionStatus | 'ALL'; type?: FinanceTransactionType | 'ALL' } };

const initialState: FinanceActionState = { success: false };
const typeOptions: Norm8SelectOption[] = [{ label: 'Entrada', value: 'INCOME' }, { label: 'Despesa', value: 'EXPENSE' }];
const typeFilterOptions: Norm8SelectOption[] = [{ label: 'Todos', value: 'ALL' }, ...typeOptions];
const statusOptions: Norm8SelectOption[] = [{ label: 'Confirmada', value: 'CONFIRMED' }, { label: 'Pendente', value: 'PENDING' }, { label: 'Cancelada', value: 'CANCELLED' }];
const statusFilterOptions: Norm8SelectOption[] = [{ label: 'Todos', value: 'ALL' }, ...statusOptions];
const sourceOptions: Norm8SelectOption[] = [{ label: 'Manual', value: 'MANUAL' }, { label: 'Proposta', value: 'PROPOSAL' }, { label: 'Contrato', value: 'CONTRACT' }, { label: 'Subscri\u00e7\u00e3o', value: 'SUBSCRIPTION' }, { label: 'Outro', value: 'OTHER' }];
const recurringStatusOptions: Norm8SelectOption[] = [{ label: 'Ativa', value: 'ACTIVE' }, { label: 'Pausada', value: 'PAUSED' }, { label: 'Cancelada', value: 'CANCELLED' }, { label: 'Terminada', value: 'ENDED' }];
const recurringCostStatusOptions: Norm8SelectOption[] = [{ label: 'Ativo', value: 'ACTIVE' }, { label: 'Pausado', value: 'PAUSED' }, { label: 'Cancelado', value: 'CANCELLED' }, { label: 'Terminado', value: 'ENDED' }];
const recurringCostFrequencyOptions: Norm8SelectOption[] = [{ label: 'Mensal', value: 'MONTHLY' }, { label: 'Anual', value: 'YEARLY' }];

export function FinanceFiltersForm({ categories, filters }: FinanceFiltersFormProps) {
  const categoryOptions = useMemo<Norm8SelectOption[]>(() => [
    { label: 'Todas as categorias', value: 'ALL' },
    ...categories.map((category) => ({ label: (category.type === 'INCOME' ? 'Entrada' : 'Despesa') + ' \u00b7 ' + category.name, value: category.id })),
  ], [categories]);

  return (
    <form action="/admin/finance" className="finance-filters" method="get">
      <input className="admin-input finance-search-input" defaultValue={filters.query ?? ''} name="q" placeholder={'Pesquisar t\u00edtulo ou cliente...'} />
      <Norm8Select defaultValue={filters.period} name="period" options={financePeriodOptions} />
      <Norm8Select defaultValue={filters.type ?? 'ALL'} name="type" options={typeFilterOptions} />
      <Norm8Select defaultValue={filters.status ?? 'ALL'} name="status" options={statusFilterOptions} />
      <Norm8Select defaultValue={filters.categoryId ?? 'ALL'} name="categoryId" options={categoryOptions} />
      <button className="admin-button" type="submit">Filtrar</button>
    </form>
  );
}

export function FinanceTransactionModal({ accounts, categories, clientOptions, transaction }: FinanceTransactionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<FinanceClientOption | null>(() => clientOptions.find((client) => client.id === transaction?.leadId) ?? null);
  const action = transaction ? updateFinanceTransactionAction : createFinanceTransactionAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const categoryOptions = useMemo<Norm8SelectOption[]>(() => categories.map((category) => ({ label: (category.type === 'INCOME' ? 'Entrada' : 'Despesa') + ' \u00b7 ' + category.name, value: category.id })), [categories]);
  const accountOptions = useMemo<Norm8SelectOption[]>(() => accounts.map((account) => ({ label: account.name, value: account.id })), [accounts]);
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);

  useEffect(() => {
    if (isOpen) {
      const initialClient = clientOptions.find((client) => client.id === transaction?.leadId) ?? null;
      setSelectedClient(initialClient);
    }
  }, [clientOptions, isOpen, transaction?.leadId]);

  const title = transaction ? 'Editar transa\u00e7\u00e3o' : 'Nova transa\u00e7\u00e3o';

  return (
    <>
      <button className={transaction ? 'admin-link' : 'admin-button'} onClick={() => setIsOpen(true)} type="button">{transaction ? 'Editar' : 'Nova transa\u00e7\u00e3o'}</button>
      {isOpen ? (
        <div className="finance-modal-backdrop" role="presentation">
          <div aria-modal="true" className="finance-modal" role="dialog">
            <div className="finance-modal-header">
              <div><h2 className="admin-panel-title">{title}</h2><p className="admin-panel-subtitle">Registe entradas e despesas internas em EUR.</p></div>
              <button className="admin-button admin-button-muted" onClick={() => setIsOpen(false)} type="button">Fechar</button>
            </div>
            <form action={formAction} className="finance-transaction-form">
              {transaction ? <input name="transactionId" type="hidden" value={transaction.id} /> : null}
              <input name="currency" type="hidden" value="EUR" />
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field"><span>Tipo</span><Norm8Select defaultValue={transaction?.type ?? 'INCOME'} name="type" options={typeOptions} /></label>
                <label className="manual-intake-admin-field"><span>Estado</span><Norm8Select defaultValue={transaction?.status ?? 'CONFIRMED'} name="status" options={statusOptions} /></label>
              </div>
              <label className="manual-intake-admin-field"><span>{'T\u00edtulo'}</span><input className="admin-input" defaultValue={transaction?.title ?? ''} name="title" required /></label>
              <label className="manual-intake-admin-field"><span>{'Descri\u00e7\u00e3o opcional'}</span><textarea className="admin-textarea" defaultValue={transaction?.description ?? ''} name="description" /></label>
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field"><span>Valor</span><input className="admin-input" defaultValue={transaction ? centsToInput(transaction.amountCents) : ''} inputMode="decimal" name="amount" placeholder="300,00" required /></label>
                <label className="manual-intake-admin-field">
                  <span>{'Data da transa\u00e7\u00e3o'}</span>
                  <Norm8DateTimePicker
                    ariaRequired
                    defaultValue={transaction?.occurredAt ?? new Date()}
                    error={state.error === 'Selecione uma data v\u00e1lida.'}
                    errorId="finance-occurredAt-error"
                    mode="date"
                    name="occurredAt"
                    submitFormat="date"
                    placeholder="Selecionar data"
                  />
                  {state.error === 'Selecione uma data v\u00e1lida.' ? <small className="admin-field-error" id="finance-occurredAt-error">{state.error}</small> : null}
                </label>
              </div>
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field"><span>Categoria</span><Norm8Select defaultValue={transaction?.categoryId ?? categoryOptions[0]?.value ?? ''} name="categoryId" options={categoryOptions} /></label>
                <label className="manual-intake-admin-field"><span>Conta</span><Norm8Select defaultValue={transaction?.accountId ?? accountOptions[0]?.value ?? ''} name="accountId" options={accountOptions} /></label>
              </div>
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field">
                  <span>Data de vencimento</span>
                  <Norm8DateTimePicker
                    defaultValue={transaction?.dueDate ?? null}
                    mode="date"
                    name="dueDate"
                    submitFormat="date"
                    placeholder="Selecionar data"
                  />
                </label>
                <div className="manual-intake-admin-field">
                  <span>Cliente</span>
                  <FinanceClientSelect clients={clientOptions} onChange={setSelectedClient} value={selectedClient?.id ?? null} />
                  <input name="leadId" type="hidden" value={selectedClient?.id ?? ''} />
                  <input name="clientName" type="hidden" value={selectedClient?.companyName ?? ''} />
                  {!selectedClient && transaction?.clientName ? <small className="admin-row-meta">Cliente registado anteriormente: {transaction.clientName}</small> : null}
                </div>
              </div>
              <label className="manual-intake-admin-field"><span>Origem</span><Norm8Select defaultValue={transaction?.source ?? 'MANUAL'} name="source" options={sourceOptions} /></label>
              {state.message ? <p className="discovery-action-feedback discovery-action-feedback-success">{state.message}</p> : null}
              {state.error && state.error !== 'Selecione uma data v\u00e1lida.' ? <p className="discovery-action-feedback discovery-action-feedback-error">{state.error}</p> : null}
              <div className="manual-intake-actions">
                <button className="admin-button admin-button-muted" disabled={pending} onClick={() => setIsOpen(false)} type="button">Cancelar</button>
                <button className="admin-button" disabled={pending} type="submit">{pending ? 'A guardar transa\u00e7\u00e3o...' : transaction ? 'Guardar altera\u00e7\u00f5es' : 'Criar transa\u00e7\u00e3o'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function FinanceRecurringRevenueModal({ accounts, categories, clientOptions, proposalOptionsByLeadId, recurringRevenue }: FinanceRecurringRevenueModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<FinanceClientOption | null>(() => clientOptions.find((client) => client.id === recurringRevenue?.leadId) ?? null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(() => recurringRevenue?.proposalId ?? null);
  const action = recurringRevenue ? updateFinanceRecurringRevenueAction : createFinanceRecurringRevenueAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const incomeCategories = useMemo(() => categories.filter((category) => category.type === 'INCOME'), [categories]);
  const categoryOptions = useMemo<Norm8SelectOption[]>(() => incomeCategories.map((category) => ({ label: category.name, value: category.id })), [incomeCategories]);
  const accountOptions = useMemo<Norm8SelectOption[]>(() => accounts.map((account) => ({ label: account.name, value: account.id })), [accounts]);
  const defaultCategoryId = recurringRevenue?.categoryId ?? categoryOptions.find((option) => option.label === 'Mensalidade')?.value ?? categoryOptions[0]?.value ?? '';
  const proposalsForClient = useMemo(() => selectedClient ? proposalOptionsByLeadId[selectedClient.id] ?? [] : [], [proposalOptionsByLeadId, selectedClient]);
  const proposalHelperText = selectedClient && proposalsForClient.length === 0
    ? 'Nenhuma proposta associada a este cliente.'
    : undefined;

  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  useEffect(() => {
    if (isOpen) {
      const initialClient = clientOptions.find((client) => client.id === recurringRevenue?.leadId) ?? null;
      const initialProposals = initialClient ? proposalOptionsByLeadId[initialClient.id] ?? [] : [];
      const currentProposalBelongsToClient = initialProposals.some((proposal) => proposal.id === recurringRevenue?.proposalId);
      setSelectedClient(initialClient);
      setSelectedProposalId(currentProposalBelongsToClient ? recurringRevenue?.proposalId ?? null : initialProposals[0]?.id ?? null);
    }
  }, [clientOptions, isOpen, proposalOptionsByLeadId, recurringRevenue?.leadId, recurringRevenue?.proposalId]);

  function handleRecurringClientChange(client: FinanceClientOption | null) {
    const proposals = client ? proposalOptionsByLeadId[client.id] ?? [] : [];
    setSelectedClient(client);
    setSelectedProposalId(proposals[0]?.id ?? null);
  }

  const title = recurringRevenue ? 'Editar receita recorrente' : 'Nova receita recorrente';

  return (
    <>
      <button className={recurringRevenue ? 'admin-link' : 'admin-button'} onClick={() => setIsOpen(true)} type="button">{recurringRevenue ? 'Editar' : 'Nova receita recorrente'}</button>
      {isOpen ? (
        <div className="finance-modal-backdrop" role="presentation">
          <div aria-modal="true" className="finance-modal" role="dialog">
            <div className="finance-modal-header">
              <div><h2 className="admin-panel-title">{title}</h2><p className="admin-panel-subtitle">Registe mensalidades e acompanhe MRR em EUR.</p></div>
              <button className="admin-button admin-button-muted" onClick={() => setIsOpen(false)} type="button">Fechar</button>
            </div>
            <form action={formAction} className="finance-transaction-form">
              {recurringRevenue ? <input name="recurringRevenueId" type="hidden" value={recurringRevenue.id} /> : null}
              <input name="currency" type="hidden" value="EUR" />
              <div className="manual-intake-two-cols">
                <div className="manual-intake-admin-field">
                  <span>Cliente</span>
                  <FinanceClientSelect clients={clientOptions} error={state.error === 'Selecione um cliente.' ? state.error : undefined} onChange={handleRecurringClientChange} value={selectedClient?.id ?? null} />
                  <input name="leadId" type="hidden" value={selectedClient?.id ?? ''} />
                  <input name="clientName" type="hidden" value={selectedClient?.companyName ?? ''} />
                  {!selectedClient && recurringRevenue?.clientName ? <small className="admin-row-meta">Cliente registado anteriormente: {recurringRevenue.clientName}</small> : null}
                </div>
                <label className="manual-intake-admin-field"><span>Título</span><input className="admin-input" defaultValue={recurringRevenue?.title ?? ''} name="title" required /></label>
              </div>
              <label className="manual-intake-admin-field"><span>Descrição opcional</span><textarea className="admin-textarea" defaultValue={recurringRevenue?.description ?? ''} name="description" /></label>
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field"><span>Valor mensal</span><input className="admin-input" defaultValue={recurringRevenue ? centsToInput(recurringRevenue.monthlyAmountCents) : ''} inputMode="decimal" name="monthlyAmount" placeholder="300,00" required /></label>
                <label className="manual-intake-admin-field"><span>Estado</span><Norm8Select defaultValue={recurringRevenue?.status ?? 'ACTIVE'} name="status" options={recurringStatusOptions} /></label>
              </div>
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field">
                  <span>Data de início</span>
                  <Norm8DateTimePicker ariaRequired defaultValue={recurringRevenue?.startDate ?? new Date()} error={state.error === 'Selecione uma data de in\u00edcio v\u00e1lida.'} errorId="finance-recurring-startDate-error" mode="date" name="startDate" placeholder="Selecionar data" />
                  {state.error === 'Selecione uma data de in\u00edcio v\u00e1lida.' ? <small className="admin-field-error" id="finance-recurring-startDate-error">{state.error}</small> : null}
                </label>
                <label className="manual-intake-admin-field"><span>Data de fim opcional</span><Norm8DateTimePicker defaultValue={recurringRevenue?.endDate ?? null} mode="date" name="endDate" placeholder="Selecionar data" /></label>
              </div>
              <p className="admin-row-meta">O dia de cobrança é definido automaticamente pela data de início.</p>
              <label className="manual-intake-admin-field"><span>Categoria</span><Norm8Select defaultValue={defaultCategoryId} name="categoryId" options={categoryOptions} /></label>
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field"><span>Conta</span><Norm8Select defaultValue={recurringRevenue?.accountId ?? accountOptions[0]?.value ?? ''} name="accountId" options={accountOptions} /></label>
                <div className="manual-intake-admin-field">
                  <span>Proposta opcional</span>
                  <FinanceProposalSelect disabled={!selectedClient || proposalsForClient.length === 0} helperText={proposalHelperText} onChange={setSelectedProposalId} proposals={proposalsForClient} value={selectedProposalId} />
                  <input name="proposalId" type="hidden" value={selectedProposalId ?? ''} />
                </div>
              </div>
              <label className="manual-intake-admin-field"><span>Contrato opcional</span><input className="admin-input" defaultValue={recurringRevenue?.contractId ?? ''} name="contractId" /></label>
              {state.message ? <p className="discovery-action-feedback discovery-action-feedback-success">{state.message}</p> : null}
              {state.error && state.error !== 'Selecione uma data de in\u00edcio v\u00e1lida.' && state.error !== 'Selecione um cliente.' ? <p className="discovery-action-feedback discovery-action-feedback-error">{state.error}</p> : null}
              <div className="manual-intake-actions">
                <button className="admin-button admin-button-muted" disabled={pending} onClick={() => setIsOpen(false)} type="button">Cancelar</button>
                <button className="admin-button" disabled={pending} type="submit">{pending ? 'A guardar receita...' : recurringRevenue ? 'Guardar alterações' : 'Criar receita recorrente'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
export function FinanceRecurringCostModal({ accounts, categories, recurringCost }: FinanceRecurringCostModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const action = recurringCost ? updateFinanceRecurringCostAction : createFinanceRecurringCostAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const expenseCategories = useMemo(() => categories.filter((category) => category.type === 'EXPENSE'), [categories]);
  const categoryOptions = useMemo<Norm8SelectOption[]>(() => expenseCategories.map((category) => ({ label: category.name, value: category.id })), [expenseCategories]);
  const accountOptions = useMemo<Norm8SelectOption[]>(() => accounts.map((account) => ({ label: account.name, value: account.id })), [accounts]);
  const defaultCategoryId = recurringCost?.categoryId ?? categoryOptions.find((option) => option.label === 'Software')?.value ?? categoryOptions[0]?.value ?? '';

  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);

  const title = recurringCost ? 'Editar custo recorrente' : 'Novo custo recorrente';

  return (
    <>
      <button className={recurringCost ? 'admin-link' : 'admin-button'} onClick={() => setIsOpen(true)} type="button">{recurringCost ? 'Editar' : 'Novo custo recorrente'}</button>
      {isOpen ? (
        <div className="finance-modal-backdrop" role="presentation">
          <div aria-modal="true" className="finance-modal" role="dialog">
            <div className="finance-modal-header">
              <div><h2 className="admin-panel-title">{title}</h2><p className="admin-panel-subtitle">Registe subscrições, ferramentas e custos fixos em EUR.</p></div>
              <button className="admin-button admin-button-muted" onClick={() => setIsOpen(false)} type="button">Fechar</button>
            </div>
            <form action={formAction} className="finance-transaction-form">
              {recurringCost ? <input name="recurringCostId" type="hidden" value={recurringCost.id} /> : null}
              <input name="currency" type="hidden" value="EUR" />
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field"><span>Título</span><input className="admin-input" defaultValue={recurringCost?.title ?? ''} name="title" placeholder="ChatGPT Plus" required /></label>
                <label className="manual-intake-admin-field"><span>Fornecedor opcional</span><input className="admin-input" defaultValue={recurringCost?.vendorName ?? ''} name="vendorName" placeholder="OpenAI" /></label>
              </div>
              <label className="manual-intake-admin-field"><span>Descrição opcional</span><textarea className="admin-textarea" defaultValue={recurringCost?.description ?? ''} name="description" /></label>
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field"><span>Valor por ciclo</span><input className="admin-input" defaultValue={recurringCost ? centsToInput(recurringCost.amountCents) : ''} inputMode="decimal" name="amount" placeholder="23,00" required /></label>
                <label className="manual-intake-admin-field"><span>Frequência</span><Norm8Select defaultValue={recurringCost?.frequency ?? 'MONTHLY'} name="frequency" options={recurringCostFrequencyOptions} /></label>
              </div>
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field"><span>Estado</span><Norm8Select defaultValue={recurringCost?.status ?? 'ACTIVE'} name="status" options={recurringCostStatusOptions} /></label>
                <label className="manual-intake-admin-field"><span>Website opcional</span><input className="admin-input" defaultValue={recurringCost?.websiteUrl ?? ''} name="websiteUrl" placeholder="https://..." /></label>
              </div>
              <div className="manual-intake-two-cols">
                <label className="manual-intake-admin-field">
                  <span>Data de início</span>
                  <Norm8DateTimePicker ariaRequired defaultValue={recurringCost?.startDate ?? new Date()} error={state.error === 'Selecione uma data de início válida.'} errorId="finance-recurring-cost-startDate-error" mode="date" name="startDate" placeholder="Selecionar data" />
                  {state.error === 'Selecione uma data de início válida.' ? <small className="admin-field-error" id="finance-recurring-cost-startDate-error">{state.error}</small> : null}
                </label>
                <label className="manual-intake-admin-field"><span>Data de fim opcional</span><Norm8DateTimePicker defaultValue={recurringCost?.endDate ?? null} mode="date" name="endDate" placeholder="Selecionar data" /></label>
              </div>
              <p className="admin-row-meta">A próxima renovação será calculada automaticamente um mês após a data de início.</p>
              <label className="manual-intake-admin-field"><span>Categoria</span><Norm8Select defaultValue={defaultCategoryId} name="categoryId" options={categoryOptions} /></label>
              <label className="manual-intake-admin-field"><span>Conta</span><Norm8Select defaultValue={recurringCost?.accountId ?? accountOptions[0]?.value ?? ''} name="accountId" options={accountOptions} /></label>
              {state.message ? <p className="discovery-action-feedback discovery-action-feedback-success">{state.message}</p> : null}
              {state.error && state.error !== 'Selecione uma data de início válida.' ? <p className="discovery-action-feedback discovery-action-feedback-error">{state.error}</p> : null}
              <div className="manual-intake-actions">
                <button className="admin-button admin-button-muted" disabled={pending} onClick={() => setIsOpen(false)} type="button">Cancelar</button>
                <button className="admin-button" disabled={pending} type="submit">{pending ? 'A guardar custo...' : recurringCost ? 'Guardar alterações' : 'Criar custo recorrente'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function FinanceRecurringCostStatusAction({ action, recurringCostId }: { action: 'pause' | 'reactivate' | 'cancel' | 'end'; recurringCostId: string }) {
  const router = useRouter();
  const serverAction = action === 'pause' ? pauseFinanceRecurringCostAction : action === 'reactivate' ? reactivateFinanceRecurringCostAction : action === 'cancel' ? cancelFinanceRecurringCostAction : endFinanceRecurringCostAction;
  const [state, formAction, pending] = useActionState(serverAction, initialState);
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  const label = action === 'pause' ? 'Pausar' : action === 'reactivate' ? 'Reativar' : action === 'cancel' ? 'Cancelar' : 'Terminar';
  return (
    <form action={formAction} className="finance-inline-action">
      <input name="recurringCostId" type="hidden" value={recurringCostId} />
      <button className="admin-link" disabled={pending} type="submit">{pending ? 'A atualizar...' : label}</button>
      {state.error ? <span className="finance-inline-error">{state.error}</span> : null}
    </form>
  );
}
export function FinanceRecurringRevenueStatusAction({ action, recurringRevenueId }: { action: 'pause' | 'reactivate' | 'end'; recurringRevenueId: string }) {
  const router = useRouter();
  const serverAction = action === 'pause' ? pauseFinanceRecurringRevenueAction : action === 'reactivate' ? reactivateFinanceRecurringRevenueAction : endFinanceRecurringRevenueAction;
  const [state, formAction, pending] = useActionState(serverAction, initialState);
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  const label = action === 'pause' ? 'Pausar' : action === 'reactivate' ? 'Reativar' : 'Terminar';
  return (
    <form action={formAction} className="finance-inline-action">
      <input name="recurringRevenueId" type="hidden" value={recurringRevenueId} />
      <button className="admin-link" disabled={pending} type="submit">{pending ? 'A atualizar...' : label}</button>
      {state.error ? <span className="finance-inline-error">{state.error}</span> : null}
    </form>
  );
}

export function FinanceQuickStatusAction({ action, transactionId }: { action: 'confirm' | 'cancel'; transactionId: string }) {
  const router = useRouter();
  const serverAction = action === 'confirm' ? confirmFinanceTransactionAction : cancelFinanceTransactionAction;
  const [state, formAction, pending] = useActionState(serverAction, initialState);
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return (
    <form action={formAction} className="finance-inline-action">
      <input name="transactionId" type="hidden" value={transactionId} />
      <button className="admin-link" disabled={pending} type="submit">{pending ? 'A atualizar...' : action === 'confirm' ? 'Confirmar' : 'Cancelar'}</button>
      {state.error ? <span className="finance-inline-error">{state.error}</span> : null}
    </form>
  );
}


function centsToInput(amountCents: number): string {
  return formatCurrencyCents(amountCents, 'EUR').replace(/\s?\u20ac/g, '').trim();
}
