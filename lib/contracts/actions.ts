'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { ContractPlan, ContractSectionCategory, ContractServiceType } from '@/app/generated/prisma/client';
import { requireAdmin } from '@/lib/admin/auth';
import { ContractAdminResolutionError, createContractDraft, updateCompanyLegalSettings, updateContractFromWizard, type ContractWizardInput } from './service';
import { getMissingContractClientLegalFields, getMissingContractFinancialFields, getMissingContractProviderLegalFields, getMissingContractScopeFields, getMissingContractServiceFields, getStepMissingFields } from './wizard/validation';

const contractServiceTypes: ContractServiceType[] = ['WEBSITE', 'CUSTOM_SOFTWARE', 'PROCESS_AUTOMATION', 'AI_AGENTS', 'SYSTEM_INTEGRATION', 'TECHNOLOGY_CONSULTING', 'COMMERCIAL_PLATFORM', 'MAINTENANCE_EVOLUTION', 'OTHER'];
const contractPlans: ContractPlan[] = ['STARTER', 'PROFESSIONAL', 'BUSINESS', 'CUSTOM'];
const sectionCategories: ContractSectionCategory[] = ['OBJECT', 'SCOPE', 'RESPONSIBILITIES', 'TIMELINE', 'APPROVALS', 'SCOPE_CHANGE', 'PAYMENTS', 'DELAYS', 'SUSPENSION', 'OPERATE', 'SLA', 'WARRANTY', 'INTELLECTUAL_PROPERTY', 'CONFIDENTIALITY', 'DATA_PROTECTION', 'THIRD_PARTY_SERVICES', 'LIABILITY_LIMITATION', 'TERMINATION', 'FORCE_MAJEURE', 'COMMUNICATIONS', 'APPLICABLE_LAW', 'JURISDICTION', 'SIGNATURES', 'ANNEX'];

const providerSchema = z.object({
 legalName: z.string().trim().min(1),
 tradeName: z.string().trim().min(1),
 taxId: z.string().trim().min(1),
 address: z.string().trim().min(1),
 email: z.string().trim().email(),
 phone: z.string().trim().min(1),
 website: z.string().trim().min(1),
 representative: z.string().trim().min(1),
 representativeRole: z.string().trim().min(1),
 iban: z.string().trim().min(1),
 bankName: z.string().trim().min(1),
 swiftBic: z.string().trim().optional().nullable(),
});

const wizardProviderTextSchema = z.string().trim().optional().nullable().transform((value) => value ?? '');

const wizardProviderSchema = z.object({
 legalName: wizardProviderTextSchema,
 tradeName: wizardProviderTextSchema,
 taxId: wizardProviderTextSchema,
 address: wizardProviderTextSchema,
 email: wizardProviderTextSchema,
 phone: wizardProviderTextSchema,
 website: wizardProviderTextSchema,
 representative: wizardProviderTextSchema,
 representativeRole: wizardProviderTextSchema,
 iban: wizardProviderTextSchema,
 bankName: wizardProviderTextSchema,
 swiftBic: z.string().trim().optional().nullable(),
});
const wizardPayloadSchema = z.object({
 title: z.string().trim().min(1),
 client: z.object({
 leadId: z.string().optional().nullable(),
 proposalId: z.string().optional().nullable(),
 tradeName: z.string().optional().nullable(),
 legalName: z.string().optional().nullable(),
 taxId: z.string().optional().nullable(),
 fiscalAddress: z.string().optional().nullable(),
 postalCode: z.string().optional().nullable(),
 city: z.string().optional().nullable(),
 country: z.string().optional().nullable(),
 email: z.string().optional().nullable(),
 phone: z.string().optional().nullable(),
 representative: z.string().optional().nullable(),
 representativeRole: z.string().optional().nullable(),
 representativeEmail: z.string().optional().nullable(),
 projectName: z.string().optional().nullable(),
 }),
 provider: wizardProviderSchema,
 service: z.object({
 serviceType: z.enum(contractServiceTypes).optional().nullable(),
 serviceTypeOther: z.string().optional().nullable(),
 plan: z.enum(contractPlans).optional().nullable(),
 includesLaunch: z.boolean(),
 includesOperate: z.boolean(),
 includesScale: z.boolean(),
 includedServices: z.array(z.string()),
 }),
 scope: z.record(z.string(), z.string().optional().nullable()),
 deliverables: z.array(z.object({
 title: z.string().trim(),
 description: z.string().optional().nullable(),
 phase: z.string().optional().nullable(),
 status: z.string().optional().nullable(),
 estimatedDate: z.string().optional().nullable(),
 responsible: z.string().optional().nullable(),
 acceptanceCriteria: z.string().optional().nullable(),
 })),
 phases: z.array(z.object({
 name: z.string().trim(),
 phaseType: z.string().optional().nullable(),
 startsAt: z.string().optional().nullable(),
 endsAt: z.string().optional().nullable(),
 duration: z.string().optional().nullable(),
 description: z.string().optional().nullable(),
 dependencies: z.string().optional().nullable(),
 paymentMilestone: z.string().optional().nullable(),
 approvalCriteria: z.string().optional().nullable(),
 })),
 financials: z.record(z.string(), z.union([z.string(), z.boolean(), z.null()]).optional()),
 paymentMilestones: z.array(z.object({
 percentage: z.string().optional().nullable(),
 amount: z.string().optional().nullable(),
 invoiceMoment: z.string().optional().nullable(),
 expectedDate: z.string().optional().nullable(),
 description: z.string().optional().nullable(),
 status: z.string().optional().nullable(),
 billingCondition: z.string().optional().nullable(),
 })),
 sections: z.array(z.object({
 id: z.string().optional().nullable(),
 templateSectionId: z.string().optional().nullable(),
 category: z.enum(sectionCategories),
 title: z.string().trim().min(1),
 content: z.string().trim().min(1),
 order: z.number(),
 isRequired: z.boolean(),
 enabled: z.boolean(),
 sourceVersion: z.number().optional().nullable(),
 })),
 assignedToId: z.string().optional().nullable(),
 validUntil: z.string().optional().nullable(),
});

const companyLegalSettingsSchema = providerSchema;

export async function createContractDraftAction(formData: FormData): Promise<void> {
 const admin = await requireAdmin();
 const parsed = parseWizardForm(formData, admin);

 if (!parsed.success) redirect('/admin/contracts/new?error=invalid');

 try {
 const contract = await createContractDraft(parsed.data);
 revalidatePath('/admin/contracts');
 redirect(buildContractDraftRedirect(contract.id, parsed.data));
 } catch (error) {
 if (error instanceof ContractAdminResolutionError) {
 console.error('Failed to create contract draft because no persistent admin user was available', error);
 redirect('/admin/contracts/new?error=admin');
 }

 throw error;
 }
}

export async function updateContractWizardAction(formData: FormData): Promise<void> {
 const admin = await requireAdmin();
 const contractId = optionalFormValue(formData.get('contractId'));
 if (!contractId) redirect('/admin/contracts?error=invalid');

 const parsed = parseWizardForm(formData, admin);
 if (!parsed.success) redirect(`/admin/contracts/${contractId}/edit?error=invalid`);

 try {
 await updateContractFromWizard(contractId, parsed.data);
 } catch (error) {
 console.error('Failed to update contract wizard', error);
 if (error instanceof ContractAdminResolutionError) redirect(`/admin/contracts/${contractId}/edit?error=admin`);
 redirect(`/admin/contracts/${contractId}/edit?error=locked`);
 }

 revalidatePath('/admin/contracts');
 revalidatePath(`/admin/contracts/${contractId}`);
 redirect(buildContractDraftRedirect(contractId, parsed.data));
}

export async function updateCompanyLegalSettingsAction(formData: FormData): Promise<void> {
 const admin = await requireAdmin(['ADMIN']);
 const parsed = companyLegalSettingsSchema.safeParse({
 legalName: formData.get('legalName'),
 tradeName: formData.get('tradeName'),
 taxId: formData.get('taxId'),
 address: formData.get('address'),
 email: formData.get('email'),
 phone: formData.get('phone'),
 website: formData.get('website'),
 representative: formData.get('representative'),
 representativeRole: formData.get('representativeRole'),
 iban: formData.get('iban'),
 bankName: formData.get('bankName'),
 swiftBic: optionalFormValue(formData.get('swiftBic')),
 });

 if (!parsed.success) redirect('/admin/settings/company/legal?error=invalid');

 await updateCompanyLegalSettings({ ...parsed.data, updatedById: admin.id });
 revalidatePath('/admin/settings/company/legal');
 revalidatePath('/admin/contracts/new');
 redirect('/admin/settings/company/legal?saved=1');
}

function buildContractDraftRedirect(contractId: string, data: ContractWizardInput): string {
 const missingClientFields = getMissingContractClientLegalFields({ title: data.title, client: data.client, assignedToId: data.assignedToId });
 const missingProviderFields = getMissingContractProviderLegalFields({ provider: data.provider });
 const missingServiceFields = getMissingContractServiceFields({ service: data.service, validUntil: data.validUntil });
 const missingScopeFields = getMissingContractScopeFields({
 scope: data.scope,
 deliverables: data.deliverables.map((item) => ({ ...item, estimatedDate: item.estimatedDate?.toISOString() ?? null })),
 });
 const missingFinancialFields = getMissingContractFinancialFields({
 financials: mapFinancialsForValidation(data.financials),
 paymentMilestones: data.paymentMilestones.map((item) => ({
 percentage: valueToString(item.percentage),
 amount: valueToString(item.amount),
 invoiceMoment: item.invoiceMoment ?? null,
 expectedDate: item.expectedDate?.toISOString() ?? null,
 description: item.description ?? null,
 billingCondition: item.billingCondition ?? null,
 })),
 });
 const missingTimelineFields = getStepMissingFields('timeline', {
 phases: data.phases.map((item) => ({
 ...item,
 startsAt: item.startsAt?.toISOString() ?? null,
 endsAt: item.endsAt?.toISOString() ?? null,
 })),
 });
 const missingFields = [
 ...missingClientFields.map((field) => `Cliente: ${field}`),
 ...missingProviderFields.map((field) => `Norm8: ${field}`),
 ...missingServiceFields.map((field) => `Serviço: ${field}`),
 ...missingScopeFields.map((field) => `Âmbito: ${field}`),
 ...missingTimelineFields.map((field) => 'Cronograma: ' + field),
 ...missingFinancialFields.map((field) => 'Investimento: ' + field),
 ];

 if (missingFields.length === 0) return `/admin/contracts/${contractId}`;

 const params = new URLSearchParams({
 warning: 'missing_contract_legal',
 missing: missingFields.join(', '),
 });
 return `/admin/contracts/${contractId}?${params.toString()}`;
}
function mapFinancialsForValidation(financials: ContractWizardInput['financials']): Record<string, string | boolean | null | undefined> {
 return Object.fromEntries(
 Object.entries(financials).map(([key, value]) => [key, typeof value === 'boolean' || value === null || value === undefined ? value : String(value)]),
 );
}

function valueToString(value: unknown): string | null {
 return value === null || value === undefined ? null : String(value);
}
function parseWizardForm(formData: FormData, admin: { id: string; email: string }): { success: true; data: ContractWizardInput } | { success: false } {
 const rawPayload = String(formData.get('wizardPayload') ?? '');
 try {
 const payload = wizardPayloadSchema.parse(JSON.parse(rawPayload));
 return {
 success: true,
 data: {
 ...payload,
 scope: payload.scope,
 financials: {
 ...payload.financials,
 operateAutoRenewal: payload.financials.operateAutoRenewal === true || payload.financials.operateAutoRenewal === 'true',
 proposalValidity: parseDate(payload.financials.proposalValidity),
 paymentDueDate: parseDate(payload.financials.paymentDueDate),
 operateBillingStartDate: parseDate(payload.financials.operateBillingStartDate),
 },
 deliverables: payload.deliverables.map((item) => ({ ...item, estimatedDate: parseDate(item.estimatedDate) })),
 phases: payload.phases.map((item) => ({ ...item, startsAt: parseDate(item.startsAt), endsAt: parseDate(item.endsAt) })),
 paymentMilestones: payload.paymentMilestones.map((item) => ({ ...item, expectedDate: parseDate(item.expectedDate) })),
 validUntil: parseDate(payload.validUntil),
 adminUserId: admin.id,
 adminEmail: admin.email,
 },
 };
 } catch (error) {
 console.error('Invalid contract wizard payload', error);
 return { success: false };
 }
}

function parseDate(value: unknown): Date | null {
 if (typeof value !== 'string' || !value.trim()) return null;
 const date = new Date(value);
 return Number.isNaN(date.getTime()) ? null : date;
}

function optionalFormValue(value: FormDataEntryValue | null): string | undefined {
 if (typeof value !== 'string') return undefined;
 const trimmed = value.trim();
 return trimmed || undefined;
}