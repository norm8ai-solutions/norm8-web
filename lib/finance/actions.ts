'use server';

import { revalidatePath } from 'next/cache';
import type { FinanceRecurringCostFrequency, FinanceRecurringCostStatus, FinanceRecurringRevenueStatus, FinanceTransactionSource, FinanceTransactionStatus, FinanceTransactionType } from '@/app/generated/prisma/client';
import { requireAdmin } from '@/lib/admin/auth';
import { ensureRecurringCostDefaults } from '@/lib/admin/finance-recurring-costs';
import { syncFinanceIncomeForProposal } from '@/lib/admin/finance-commercial-sync';
import { prisma } from '@/lib/db/prisma';
import { parseEuroToCents } from './formatters';
import { ensureRecurringRevenueDefaults } from './recurring-revenue';

export type FinanceActionState = { success: boolean; message?: string; error?: string };

const genericSaveError = 'N\u00e3o foi poss\u00edvel guardar a transa\u00e7\u00e3o. Tente novamente.';
const recurringSaveError = 'N\u00e3o foi poss\u00edvel guardar a receita recorrente. Tente novamente.';
const recurringCostSaveError = 'N\u00e3o foi poss\u00edvel guardar o custo recorrente. Tente novamente.';

export async function createFinanceTransactionAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  await requireAdmin();
  try {
    const parsed = await parseTransactionFormData(formData);
    if (!parsed.ok) return { success: false, error: parsed.error };
    await prisma.financeTransaction.create({ data: parsed.data });
    revalidatePath('/admin/finance');
    return { success: true, message: 'Transa\u00e7\u00e3o criada com sucesso.' };
  } catch (error) {
    console.error('Failed to create finance transaction', error);
    return { success: false, error: genericSaveError };
  }
}

export async function updateFinanceTransactionAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  await requireAdmin();
  try {
    const id = String(formData.get('transactionId') ?? '').trim();
    if (!id) return { success: false, error: genericSaveError };
    const parsed = await parseTransactionFormData(formData);
    if (!parsed.ok) return { success: false, error: parsed.error };
    await prisma.financeTransaction.update({ data: parsed.data, where: { id } });
    revalidatePath('/admin/finance');
    return { success: true, message: 'Transa\u00e7\u00e3o atualizada com sucesso.' };
  } catch (error) {
    console.error('Failed to update finance transaction', error);
    return { success: false, error: genericSaveError };
  }
}

export async function confirmFinanceTransactionAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  return updateFinanceTransactionStatus(formData, 'CONFIRMED', 'Transa\u00e7\u00e3o confirmada com sucesso.');
}

export async function cancelFinanceTransactionAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  return updateFinanceTransactionStatus(formData, 'CANCELLED', 'Transa\u00e7\u00e3o cancelada com sucesso.');
}

export async function syncProposalFinanceIncomeAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const proposalId = String(formData.get('proposalId') ?? '').trim();
  if (!proposalId) return;

  try {
    await syncFinanceIncomeForProposal(proposalId);
    revalidatePath('/admin/finance');
    revalidatePath(`/admin/proposals/${proposalId}`);
  } catch (error) {
    console.error('Failed to sync proposal finance income', error);
  }
}

export async function createFinanceRecurringRevenueAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  await requireAdmin();
  try {
    const parsed = await parseRecurringRevenueFormData(formData);
    if (!parsed.ok) return { success: false, error: parsed.error };
    await prisma.financeRecurringRevenue.create({ data: parsed.data });
    revalidatePath('/admin/finance');
    return { success: true, message: 'Receita recorrente criada com sucesso.' };
  } catch (error) {
    console.error('Failed to create recurring revenue', error);
    return { success: false, error: recurringSaveError };
  }
}

export async function updateFinanceRecurringRevenueAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  await requireAdmin();
  try {
    const id = String(formData.get('recurringRevenueId') ?? '').trim();
    if (!id) return { success: false, error: recurringSaveError };
    const parsed = await parseRecurringRevenueFormData(formData);
    if (!parsed.ok) return { success: false, error: parsed.error };
    await prisma.financeRecurringRevenue.update({ data: parsed.data, where: { id } });
    revalidatePath('/admin/finance');
    return { success: true, message: 'Receita recorrente atualizada com sucesso.' };
  } catch (error) {
    console.error('Failed to update recurring revenue', error);
    return { success: false, error: recurringSaveError };
  }
}

export async function createFinanceRecurringCostAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  await requireAdmin();
  try {
    const parsed = await parseRecurringCostFormData(formData);
    if (!parsed.ok) return { success: false, error: parsed.error };
    await prisma.financeRecurringCost.create({ data: parsed.data });
    revalidatePath('/admin/finance');
    return { success: true, message: 'Custo recorrente criado com sucesso.' };
  } catch (error) {
    console.error('Failed to create recurring cost', error);
    return { success: false, error: recurringCostSaveError };
  }
}

export async function updateFinanceRecurringCostAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  await requireAdmin();
  try {
    const id = String(formData.get('recurringCostId') ?? '').trim();
    if (!id) return { success: false, error: recurringCostSaveError };
    const parsed = await parseRecurringCostFormData(formData);
    if (!parsed.ok) return { success: false, error: parsed.error };
    await prisma.financeRecurringCost.update({ data: parsed.data, where: { id } });
    revalidatePath('/admin/finance');
    return { success: true, message: 'Custo recorrente atualizado com sucesso.' };
  } catch (error) {
    console.error('Failed to update recurring cost', error);
    return { success: false, error: recurringCostSaveError };
  }
}

export async function pauseFinanceRecurringCostAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  return updateFinanceRecurringCostStatus(formData, 'PAUSED', 'Custo recorrente pausado com sucesso.');
}

export async function reactivateFinanceRecurringCostAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  return updateFinanceRecurringCostStatus(formData, 'ACTIVE', 'Custo recorrente reativado com sucesso.');
}

export async function cancelFinanceRecurringCostAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  return updateFinanceRecurringCostStatus(formData, 'CANCELLED', 'Custo recorrente cancelado com sucesso.');
}

export async function endFinanceRecurringCostAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  return updateFinanceRecurringCostStatus(formData, 'ENDED', 'Custo recorrente terminado com sucesso.');
}
export async function pauseFinanceRecurringRevenueAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  return updateFinanceRecurringRevenueStatus(formData, 'PAUSED', 'Receita recorrente pausada com sucesso.');
}

export async function reactivateFinanceRecurringRevenueAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  return updateFinanceRecurringRevenueStatus(formData, 'ACTIVE', 'Receita recorrente reativada com sucesso.');
}

export async function endFinanceRecurringRevenueAction(_previousState: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  return updateFinanceRecurringRevenueStatus(formData, 'ENDED', 'Receita recorrente terminada com sucesso.');
}

async function updateFinanceRecurringCostStatus(formData: FormData, status: FinanceRecurringCostStatus, message: string): Promise<FinanceActionState> {
  await requireAdmin();
  try {
    const id = String(formData.get('recurringCostId') ?? '').trim();
    if (!id) return { success: false, error: recurringCostSaveError };
    await prisma.financeRecurringCost.update({ data: { endDate: status === 'ENDED' ? new Date() : undefined, status }, where: { id } });
    revalidatePath('/admin/finance');
    return { success: true, message };
  } catch (error) {
    console.error('Failed to update recurring cost status', error);
    return { success: false, error: recurringCostSaveError };
  }
}
async function updateFinanceRecurringRevenueStatus(formData: FormData, status: FinanceRecurringRevenueStatus, message: string): Promise<FinanceActionState> {
  await requireAdmin();
  try {
    const id = String(formData.get('recurringRevenueId') ?? '').trim();
    if (!id) return { success: false, error: recurringSaveError };
    await prisma.financeRecurringRevenue.update({ data: { endDate: status === 'ENDED' ? new Date() : undefined, status }, where: { id } });
    revalidatePath('/admin/finance');
    return { success: true, message };
  } catch (error) {
    console.error('Failed to update recurring revenue status', error);
    return { success: false, error: recurringSaveError };
  }
}

async function updateFinanceTransactionStatus(formData: FormData, status: FinanceTransactionStatus, message: string): Promise<FinanceActionState> {
  await requireAdmin();
  try {
    const id = String(formData.get('transactionId') ?? '').trim();
    if (!id) return { success: false, error: genericSaveError };
    await prisma.financeTransaction.update({ data: { paidAt: status === 'CONFIRMED' ? new Date() : null, status }, where: { id } });
    revalidatePath('/admin/finance');
    return { success: true, message };
  } catch (error) {
    console.error('Failed to update finance transaction status', error);
    return { success: false, error: genericSaveError };
  }
}

type ParsedTransaction = { ok: true; data: { accountId: string | null; amountCents: number; categoryId: string | null; clientName: string | null; currency: string; description: string | null; dueDate: Date | null; leadId: string | null; occurredAt: Date; paidAt: Date | null; source: FinanceTransactionSource; status: FinanceTransactionStatus; title: string; type: FinanceTransactionType } } | { ok: false; error: string };
type ParsedRecurringRevenue = { ok: true; data: { accountId: string | null; billingDay: number | null; categoryId: string | null; clientName: string; contractId: string | null; currency: string; description: string | null; endDate: Date | null; leadId: string | null; monthlyAmountCents: number; proposalId: string | null; startDate: Date; status: FinanceRecurringRevenueStatus; title: string } } | { ok: false; error: string };
type ParsedRecurringCost = { ok: true; data: { accountId: string | null; amountCents: number; billingDay: number | null; categoryId: string | null; currency: string; description: string | null; endDate: Date | null; frequency: FinanceRecurringCostFrequency; renewalDate: Date | null; startDate: Date; status: FinanceRecurringCostStatus; title: string; vendorName: string | null; websiteUrl: string | null } } | { ok: false; error: string };

async function parseTransactionFormData(formData: FormData): Promise<ParsedTransaction> {
  const title = String(formData.get('title') ?? '').trim();
  const type = parseType(formData.get('type'));
  const status = parseStatus(formData.get('status'));
  const source = parseSource(formData.get('source'));
  const amountCents = parseEuroToCents(formData.get('amount'));
  const occurredAt = parseDate(formData.get('occurredAt'));
  const currency = String(formData.get('currency') ?? 'EUR').trim().toUpperCase() || 'EUR';
  const leadId = optionalString(formData.get('leadId'));
  let clientName = optionalString(formData.get('clientName'));

  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { company: true },
    });

    if (!lead) return { ok: false, error: 'Cliente selecionado inv\u00e1lido.' };
    clientName = lead.company;
  }

  if (!title) return { ok: false, error: 'O t\u00edtulo \u00e9 obrigat\u00f3rio.' };
  if (!type) return { ok: false, error: 'O tipo de transa\u00e7\u00e3o \u00e9 obrigat\u00f3rio.' };
  if (!status) return { ok: false, error: 'O estado da transa\u00e7\u00e3o \u00e9 obrigat\u00f3rio.' };
  if (!source) return { ok: false, error: 'A origem da transa\u00e7\u00e3o \u00e9 obrigat\u00f3ria.' };
  if (!amountCents || amountCents <= 0) return { ok: false, error: 'O valor deve ser superior a zero.' };
  if (!occurredAt) return { ok: false, error: 'Selecione uma data v\u00e1lida.' };
  if (!currency) return { ok: false, error: genericSaveError };

  return {
    ok: true,
    data: {
      accountId: optionalString(formData.get('accountId')),
      amountCents,
      categoryId: optionalString(formData.get('categoryId')),
      clientName,
      currency,
      description: optionalString(formData.get('description')),
      dueDate: parseDate(formData.get('dueDate')),
      leadId,
      occurredAt,
      paidAt: status === 'CONFIRMED' ? new Date() : null,
      source,
      status,
      title,
      type,
    },
  };
}

async function parseRecurringRevenueFormData(formData: FormData): Promise<ParsedRecurringRevenue> {
  const defaults = await ensureRecurringRevenueDefaults();
  const leadId = optionalString(formData.get('leadId'));
  let clientName = '';
  const title = String(formData.get('title') ?? '').trim();
  const monthlyAmountCents = parseEuroToCents(formData.get('monthlyAmount'));
  const status = parseRecurringStatus(formData.get('status'));
  const startDate = parseDate(formData.get('startDate'));
  const endDate = parseDate(formData.get('endDate'));
  const currency = String(formData.get('currency') ?? 'EUR').trim().toUpperCase() || 'EUR';
  const proposalId = optionalString(formData.get('proposalId'));

  if (!leadId) return { ok: false, error: 'Selecione um cliente.' };

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { company: true },
  });

  if (!lead) return { ok: false, error: 'Cliente selecionado inválido.' };
  clientName = lead.company;

  if (proposalId) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { leadId: true },
    });

    if (!proposal) return { ok: false, error: 'Proposta selecionada inválida.' };
    if (proposal.leadId !== leadId) return { ok: false, error: 'A proposta selecionada não pertence ao cliente escolhido.' };
  }
  if (!title) return { ok: false, error: 'O t\u00edtulo \u00e9 obrigat\u00f3rio.' };
  if (!monthlyAmountCents || monthlyAmountCents <= 0) return { ok: false, error: 'O valor mensal deve ser superior a zero.' };
  if (!status) return { ok: false, error: 'O estado da receita recorrente \u00e9 obrigat\u00f3rio.' };
  if (!startDate) return { ok: false, error: 'Selecione uma data de in\u00edcio v\u00e1lida.' };
  if (endDate && endDate < startDate) return { ok: false, error: 'A data de fim não pode ser anterior ao início.' };

  const billingDay = startDate.getDate();

  return {
    ok: true,
    data: {
      accountId: optionalString(formData.get('accountId')) ?? defaults.account.id,
      billingDay,
      categoryId: optionalString(formData.get('categoryId')) ?? defaults.category.id,
      clientName,
      contractId: optionalString(formData.get('contractId')),
      currency,
      description: optionalString(formData.get('description')),
      endDate,
      leadId,
      monthlyAmountCents,
      proposalId,
      startDate,
      status,
      title,
    },
  };
}

async function parseRecurringCostFormData(formData: FormData): Promise<ParsedRecurringCost> {
  const defaults = await ensureRecurringCostDefaults();
  const title = String(formData.get('title') ?? '').trim();
  const amountCents = parseEuroToCents(formData.get('amount'));
  const frequency = parseRecurringCostFrequency(formData.get('frequency'));
  const status = parseRecurringCostStatus(formData.get('status'));
  const startDate = parseDate(formData.get('startDate'));
  const endDate = parseDate(formData.get('endDate'));
  const renewalDate = parseDate(formData.get('renewalDate'));
  const currency = String(formData.get('currency') ?? 'EUR').trim().toUpperCase() || 'EUR';
  const websiteUrl = optionalString(formData.get('websiteUrl'));

  if (!title) return { ok: false, error: 'O título é obrigatório.' };
  if (!amountCents || amountCents <= 0) return { ok: false, error: 'O valor deve ser superior a zero.' };
  if (!frequency) return { ok: false, error: 'A frequência é obrigatória.' };
  if (!status) return { ok: false, error: 'O estado do custo recorrente é obrigatório.' };
  if (!startDate) return { ok: false, error: 'Selecione uma data de início válida.' };
  if (endDate && endDate < startDate) return { ok: false, error: 'A data de fim não pode ser anterior ao início.' };
  if (websiteUrl && !isValidUrl(websiteUrl)) return { ok: false, error: 'Introduza um website válido.' };

  return {
    ok: true,
    data: {
      accountId: optionalString(formData.get('accountId')) ?? defaults.account.id,
      amountCents,
      billingDay: startDate.getDate(),
      categoryId: optionalString(formData.get('categoryId')) ?? defaults.category.id,
      currency,
      description: optionalString(formData.get('description')),
      endDate,
      frequency,
      renewalDate,
      startDate,
      status,
      title,
      vendorName: optionalString(formData.get('vendorName')),
      websiteUrl,
    },
  };
}
function optionalString(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

function parseDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseType(value: FormDataEntryValue | null): FinanceTransactionType | null {
  return value === 'INCOME' || value === 'EXPENSE' ? value : null;
}

function parseStatus(value: FormDataEntryValue | null): FinanceTransactionStatus | null {
  return value === 'PENDING' || value === 'CONFIRMED' || value === 'CANCELLED' ? value : null;
}

function parseRecurringStatus(value: FormDataEntryValue | null): FinanceRecurringRevenueStatus | null {
  return value === 'ACTIVE' || value === 'PAUSED' || value === 'CANCELLED' || value === 'ENDED' ? value : null;
}

function parseRecurringCostStatus(value: FormDataEntryValue | null): FinanceRecurringCostStatus | null {
  return value === 'ACTIVE' || value === 'PAUSED' || value === 'CANCELLED' || value === 'ENDED' ? value : null;
}

function parseRecurringCostFrequency(value: FormDataEntryValue | null): FinanceRecurringCostFrequency | null {
  return value === 'MONTHLY' || value === 'YEARLY' ? value : null;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}


function parseSource(value: FormDataEntryValue | null): FinanceTransactionSource | null {
  return value === 'MANUAL' || value === 'PROPOSAL' || value === 'CONTRACT' || value === 'SUBSCRIPTION' || value === 'OTHER' ? value : null;
}
