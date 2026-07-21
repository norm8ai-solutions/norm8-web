export const CONTRACT_WIZARD_STEP_IDS = [
 'client',
 'provider',
 'service',
 'scope',
 'timeline',
 'financials',
 'clauses',
 'review',
] as const;

export type ContractWizardStepId = (typeof CONTRACT_WIZARD_STEP_IDS)[number];

export type ContractWizardValidationSeverity = 'error' | 'warning';

export type ContractWizardValidationError = {
 stepId: ContractWizardStepId;
 field: string;
 label: string;
 message: string;
 severity: ContractWizardValidationSeverity;
 blocking: boolean;
};

type WizardValidationPayload = {
 title?: string | null;
 client?: Record<string, string | null | undefined>;
 provider?: Record<string, string | null | undefined>;
 service?: {
 serviceType?: string | null;
 serviceTypeOther?: string | null;
 plan?: string | null;
 includesLaunch?: boolean;
 includesOperate?: boolean;
 includesScale?: boolean;
 includedServices?: string[];
 };
 scope?: Record<string, string | null | undefined>;
 deliverables?: Array<Record<string, string | null | undefined>>;
 phases?: Array<Record<string, string | null | undefined>>;
 financials?: Record<string, string | boolean | null | undefined>;
 paymentMilestones?: Array<Record<string, string | null | undefined>>;
 sections?: Array<Record<string, string | boolean | number | null | undefined>>;
 assignedToId?: string | null;
 validUntil?: string | Date | null;
};

export function validateContractWizardStep(
 stepId: ContractWizardStepId,
 data: WizardValidationPayload,
): ContractWizardValidationError[] {
 const errors: ContractWizardValidationError[] = [];
 const addError = (field: string, label: string, message: string): void => {
 errors.push({ stepId, field, label, message, severity: 'error', blocking: true });
 };

 if (stepId === 'client') {
 if (!hasText(data.title)) addError('title', 'Título do contrato', 'Indique o título do contrato.');
 if (!hasText(data.client?.tradeName)) addError('client.tradeName', 'Nome comercial', 'Indique o nome comercial do cliente.');
 if (!hasText(data.client?.legalName)) addError('client.legalName', 'Denominação social', 'Indique a denominação social do cliente.');
 if (!isValidBasicPortugueseTaxId(data.client?.taxId)) addError('client.taxId', 'NIF', 'Indique o NIF do cliente.');
 if (!hasText(data.client?.fiscalAddress)) addError('client.fiscalAddress', 'Morada fiscal', 'Indique a morada fiscal do cliente.');
 if (!hasText(data.client?.postalCode)) addError('client.postalCode', 'Código postal', 'Indique o código postal do cliente.');
 if (!hasText(data.client?.city)) addError('client.city', 'Localidade', 'Indique a localidade do cliente.');
 if (!hasText(data.client?.country)) addError('client.country', 'País', 'Selecione o país do cliente.');
 if (!isValidEmail(data.client?.email)) addError('client.email', 'Email', 'Indique um email válido.');
 if (!hasText(data.client?.representative)) addError('client.representative', 'Nome do representante', 'Indique o nome do representante.');
 if (!hasText(data.client?.representativeRole)) addError('client.representativeRole', 'Cargo do representante', 'Indique o cargo do representante.');
 if (!isValidEmail(data.client?.representativeEmail)) addError('client.representativeEmail', 'Email do representante', 'Indique o email do representante.');
 if (!hasText(data.client?.projectName)) addError('client.projectName', 'Nome do projeto', 'Indique o nome do projeto.');
 if (!hasText(data.assignedToId)) addError('assignedToId', 'Responsável interno', 'Selecione o responsável interno.');
 if (!hasText(data.client?.leadId) && !hasText(data.client?.tradeName) && !hasText(data.client?.legalName)) {
 addError('client.leadId', 'Lead ou cliente', 'Selecione uma lead ou preencha os dados do cliente manualmente.');
 }
 }

 if (stepId === 'provider') {
 providerRequiredFields.forEach(([field, label, message, validator]) => {
 if (!validator(data.provider?.[field])) addError(`provider.${field}`, label, message);
 });
 }

 if (stepId === 'service') {
 if (!hasText(data.service?.serviceType)) addError('service.serviceType', 'Tipo de serviço', 'Selecione um tipo de serviço.');
 if (data.service?.serviceType === 'OTHER' && !hasText(data.service?.serviceTypeOther)) {
 addError('service.serviceTypeOther', 'Outro tipo de serviço', 'Descreva o outro tipo de serviço.');
 }
 if (!hasText(data.service?.plan)) addError('service.plan', 'Plano', 'Selecione o plano.');
 if (!hasText(data.validUntil)) {
 addError('validUntil', 'Validade', 'Selecione a data de validade.');
 } else if (isPastDate(data.validUntil)) {
 addError('validUntil', 'Validade', 'A validade não pode ser anterior à data atual.');
 }
 if (!data.service?.includesLaunch && !data.service?.includesOperate && !data.service?.includesScale) {
 addError('service.phases', 'Fases', 'Selecione pelo menos uma fase do serviço.');
 }
 if (!data.service?.includedServices || data.service.includedServices.length === 0) {
 addError('service.includedServices', 'Serviços incluídos', 'Selecione pelo menos um serviço incluído.');
 }
 }

 if (stepId === 'scope') {
 if (!hasText(data.scope?.projectObjective)) addError('scope.projectObjective', 'Objetivo do projeto', 'Indique o objetivo do projeto.');
 if (!hasText(data.scope?.proposedSolution)) addError('scope.proposedSolution', 'Solução proposta', 'Indique a solução proposta.');
 if (!hasText(data.scope?.includedScope)) addError('scope.includedScope', 'Âmbito incluído', 'Adicione pelo menos um item ao âmbito incluído.');
 if (!hasText(data.scope?.excludedScope)) addError('scope.excludedScope', 'Âmbito excluído', 'Adicione pelo menos um item ao âmbito excluído.');
 if (!hasText(data.scope?.acceptanceCriteria)) addError('scope.acceptanceCriteria', 'Critérios de aceitação gerais', 'Adicione pelo menos um critério de aceitação geral.');

 const deliverables = data.deliverables ?? [];
 const validDeliverables = deliverables.filter(isCompleteDeliverable);
 if (validDeliverables.length === 0) {
 addError('deliverables', 'Entregáveis', 'Adicione pelo menos um entregável completo.');
 }

 deliverables.forEach((deliverable, index) => {
 const label = getDeliverableValidationLabel(deliverable, index);
 if (!hasText(deliverable.title)) addError(`deliverables.${index}.title`, `Título do ${label}`, 'Indique o título do entregável.');
 if (!hasText(deliverable.description)) addError(`deliverables.${index}.description`, `Descrição do ${label}`, 'Descreva o entregável.');
 if (!hasText(deliverable.phase)) addError(`deliverables.${index}.phase`, `Fase do ${label}`, 'Selecione a fase do entregável.');
 if (!hasText(deliverable.estimatedDate)) {
 addError(`deliverables.${index}.estimatedDate`, `Data estimada do ${label}`, 'Selecione a data estimada do entregável.');
 } else if (!parseDateOnly(deliverable.estimatedDate)) {
 addError(`deliverables.${index}.estimatedDate`, `Data estimada do ${label}`, 'Selecione uma data estimada válida.');
 } else if (isPastDate(deliverable.estimatedDate)) {
 addError(`deliverables.${index}.estimatedDate`, `Data estimada do ${label}`, 'A data estimada do entregável não pode ser anterior à data atual.');
 }
 if (!hasText(deliverable.responsible)) addError(`deliverables.${index}.responsible`, `Responsável do ${label}`, 'Indique o responsável pelo entregável.');
 if (!hasText(deliverable.acceptanceCriteria)) addError(`deliverables.${index}.acceptanceCriteria`, `Critérios de aceitação do ${label}`, 'Adicione critérios de aceitação ao entregável.');
 });
 }

 if (stepId === 'timeline') {
 if (!data.phases || data.phases.length === 0) addError('phases', 'Fases', 'Adicione pelo menos uma fase ao cronograma.');
 data.phases?.forEach((phase, index) => {
 const label = getPhaseValidationLabel(phase, index);
 const startsAt = parseDateOnly(phase.startsAt);
 const endsAt = parseDateOnly(phase.endsAt);

 if (!hasText(phase.name)) addError(`phases.${index}.name`, label, 'Indique o nome da fase.');
 if (!hasText(phase.description)) addError(`phases.${index}.description`, `Descrição da ${label}`, 'Descreva a fase do cronograma.');
 if (!hasText(phase.startsAt)) {
 addError(`phases.${index}.startsAt`, `Data de início da ${label}`, 'Selecione a data de início.');
 } else if (!startsAt) {
 addError(`phases.${index}.startsAt`, `Data de início da ${label}`, 'Selecione uma data de início válida.');
 } else if (isPastDate(phase.startsAt)) {
 addError(`phases.${index}.startsAt`, `Data de início da ${label}`, 'A data de início não pode ser anterior à data atual.');
 }
 if (!hasText(phase.endsAt)) {
 addError(`phases.${index}.endsAt`, `Data de fim da ${label}`, 'Selecione a data de fim.');
 } else if (!endsAt) {
 addError(`phases.${index}.endsAt`, `Data de fim da ${label}`, 'Selecione uma data de fim válida.');
 } else if (startsAt && endsAt.getTime() < startsAt.getTime()) {
 addError(`phases.${index}.endsAt`, `Data de fim da ${label}`, 'A data de fim deve ser igual ou posterior à data de início.');
 }
 if (!hasText(phase.duration)) addError(`phases.${index}.duration`, `Duração estimada da ${label}`, 'Indique a duração estimada.');
 if (!hasText(phase.paymentMilestone)) addError(`phases.${index}.paymentMilestone`, `Responsável da ${label}`, 'Indique o responsável pela fase.');
 if (!hasText(phase.dependencies)) addError(`phases.${index}.dependencies`, `Entregáveis associados da ${label}`, 'Associe pelo menos um entregável à fase.');
 if (!hasText(phase.approvalCriteria)) addError(`phases.${index}.approvalCriteria`, `Critérios de conclusão da ${label}`, 'Adicione critérios de conclusão à fase.');
 });
 }

 if (stepId === 'financials') {
 const commercialValue = parsePositiveNumber(data.financials?.commercialValue);
 const finalValue = parsePositiveNumber(data.financials?.finalValue);
 const discount = parsePositiveNumber(data.financials?.discount);
 const vatRate = parsePositiveNumber(data.financials?.vatRate);
 const valueWithVat = parsePositiveNumber(data.financials?.valueWithVat);

 if (!hasText(data.financials?.commercialValue)) {
 addError('financials.commercialValue', 'Valor comercial', 'Indique o valor comercial.');
 } else if (!commercialValue || commercialValue <= 0) {
 addError('financials.commercialValue', 'Valor comercial', 'O valor comercial deve ser superior a zero.');
 }
 if (!hasText(data.financials?.finalValue)) {
 addError('financials.finalValue', 'Valor final', 'Indique o valor final.');
 } else if (!finalValue || finalValue <= 0) {
 addError('financials.finalValue', 'Valor final', 'O valor final deve ser superior a zero.');
 }
 if (commercialValue !== null && finalValue !== null && finalValue > commercialValue) {
 addError('financials.finalValue', 'Valor final', 'O valor final não pode ser superior ao valor comercial.');
 }
 if (!hasText(data.financials?.discount)) {
 addError('financials.discount', 'Desconto', 'Confirme o desconto calculado.');
 } else if (discount === null) {
 addError('financials.discount', 'Desconto', 'O desconto não pode ser negativo.');
 }
 if (!hasText(data.financials?.vatRate)) {
 addError('financials.vatRate', 'IVA', 'Selecione a taxa de IVA.');
 } else if (vatRate === null) {
 addError('financials.vatRate', 'IVA', 'Selecione uma taxa de IVA válida.');
 }
 if (!hasText(data.financials?.valueWithVat)) {
 addError('financials.valueWithVat', 'Valor com IVA', 'Confirme o valor com IVA.');
 } else if (valueWithVat === null) {
 addError('financials.valueWithVat', 'Valor com IVA', 'Indique um valor com IVA válido.');
 }
 if (!hasText(data.financials?.currency)) addError('financials.currency', 'Moeda', 'Indique a moeda.');
 if (!hasText(data.financials?.paymentPlan)) addError('financials.paymentPlan', 'Plano de pagamento', 'Selecione o plano de pagamento.');
 if (!data.paymentMilestones || data.paymentMilestones.length === 0) {
 addError('paymentMilestones', 'Pagamentos', 'Adicione pelo menos um marco de pagamento.');
 }

 data.paymentMilestones?.forEach((payment, index) => {
 const label = getPaymentValidationLabel(payment, index);
 const percentage = parsePositiveNumber(payment.percentage);
 const amount = parsePositiveNumber(payment.amount);
 if (!hasText(payment.description)) addError(`paymentMilestones.${index}.description`, `Título do ${label}`, 'Indique o título do pagamento.');
 if (!hasText(payment.percentage)) {
 addError(`paymentMilestones.${index}.percentage`, `Percentagem do ${label}`, 'Indique a percentagem do pagamento.');
 } else if (percentage === null || percentage <= 0) {
 addError(`paymentMilestones.${index}.percentage`, `Percentagem do ${label}`, 'Indique uma percentagem válida.');
 }
 if (!hasText(payment.amount)) {
 addError(`paymentMilestones.${index}.amount`, `Valor do ${label}`, 'Indique o valor do pagamento.');
 } else if (amount === null || amount <= 0) {
 addError(`paymentMilestones.${index}.amount`, `Valor do ${label}`, 'Indique um valor de pagamento válido.');
 }
 if (!hasText(payment.invoiceMoment)) addError(`paymentMilestones.${index}.invoiceMoment`, `Momento de faturação do ${label}`, 'Selecione o momento de faturação.');
 if (payment.invoiceMoment === 'Outro' && !hasText(payment.billingCondition)) addError(`paymentMilestones.${index}.billingCondition`, `Condição do ${label}`, 'Indique a condição de pagamento.');
 if (!hasText(payment.expectedDate)) {
 addError(`paymentMilestones.${index}.expectedDate`, `Data prevista do ${label}`, 'Selecione a data prevista.');
 } else if (!parseDateOnly(payment.expectedDate)) {
 addError(`paymentMilestones.${index}.expectedDate`, `Data prevista do ${label}`, 'Selecione uma data prevista válida.');
 } else if (isPastDate(payment.expectedDate)) {
 addError(`paymentMilestones.${index}.expectedDate`, `Data prevista do ${label}`, 'A data prevista não pode ser anterior à data atual.');
 }
 if (!hasText(payment.billingCondition)) addError(`paymentMilestones.${index}.billingCondition`, `Condição do ${label}`, 'Indique a condição de pagamento.');
 });

 const percentages = data.paymentMilestones?.map((payment) => parsePositiveNumber(payment.percentage)).filter((value): value is number => value !== null) ?? [];
 if (percentages.length > 0) {
 const total = percentages.reduce((sum, value) => sum + value, 0);
 if (Math.abs(total - 100) > 0.01) addError('paymentMilestones.percentages', 'Percentagens', 'As percentagens dos pagamentos devem somar 100%.');
 }
 const amounts = data.paymentMilestones?.map((payment) => parsePositiveNumber(payment.amount)).filter((value): value is number => value !== null) ?? [];
 if (finalValue !== null && amounts.length > 0) {
 const totalAmount = amounts.reduce((sum, value) => sum + value, 0);
 if (Math.abs(totalAmount - finalValue) > 0.05) addError('paymentMilestones.amounts', 'Valores dos pagamentos', 'Os valores dos pagamentos devem somar o valor final.');
 }
 }

 if (stepId === 'clauses') {
 const enabledSections = data.sections?.filter((section) => section.enabled !== false) ?? [];
 if (enabledSections.length === 0) addError('sections', 'Cláusulas', 'Selecione pelo menos uma cláusula ativa.');
 enabledSections.forEach((section, index) => {
 if (!hasText(section.title)) addError(`sections.${index}.title`, `Título da cláusula ${index + 1}`, 'Indique o título da cláusula.');
 if (section.isRequired === true && !hasText(section.content)) {
 addError(`sections.${index}.content`, `Conteúdo da cláusula ${index + 1}`, 'Preencha o conteúdo da cláusula obrigatória.');
 }
 });
 }

 if (stepId === 'review') {
 CONTRACT_WIZARD_STEP_IDS.filter((id) => id !== 'review').forEach((id) => {
 errors.push(...validateContractWizardStep(id, data));
 });
 }

 return errors;
}

export function validateContractWizardField(
 stepId: ContractWizardStepId,
 field: string,
 data: WizardValidationPayload,
): ContractWizardValidationError[] {
 return validateContractWizardStep(stepId, data).filter((error) => error.field === field);
}
export function validateContractWizard(data: WizardValidationPayload): Record<ContractWizardStepId, ContractWizardValidationError[]> {
 return Object.fromEntries(
 CONTRACT_WIZARD_STEP_IDS.map((stepId) => [stepId, validateContractWizardStep(stepId, data)]),
 ) as Record<ContractWizardStepId, ContractWizardValidationError[]>;
}


export const CLIENT_LEGAL_DRAFT_WARNING_FIELDS = new Set([
 'client.tradeName',
 'client.legalName',
 'client.taxId',
 'client.fiscalAddress',
 'client.postalCode',
 'client.city',
 'client.country',
 'client.email',
 'client.representative',
 'client.representativeRole',
 'client.representativeEmail',
 'client.projectName',
 'assignedToId',
]);

export const PROVIDER_LEGAL_DRAFT_WARNING_FIELDS = new Set([
 'provider.legalName',
 'provider.taxId',
 'provider.address',
 'provider.email',
 'provider.representative',
 'provider.representativeRole',
]);

export const SERVICE_DRAFT_WARNING_FIELDS = new Set([
 'service.serviceType',
 'service.serviceTypeOther',
 'service.plan',
 'validUntil',
 'service.phases',
 'service.includedServices',
]);

export const SCOPE_DRAFT_WARNING_FIELDS = new Set([
 'scope.projectObjective',
 'scope.proposedSolution',
 'scope.includedScope',
 'scope.excludedScope',
 'scope.acceptanceCriteria',
 'deliverables',
]);

export const TIMELINE_DRAFT_WARNING_FIELDS = new Set([
 'phases',
]);
export const FINANCIALS_DRAFT_WARNING_FIELDS = new Set([
 'financials.commercialValue',
 'financials.finalValue',
 'financials.discount',
 'financials.vatRate',
 'financials.valueWithVat',
 'financials.currency',
 'financials.paymentPlan',
 'paymentMilestones',
 'paymentMilestones.percentages',
 'paymentMilestones.amounts',
]);

export function getMissingContractClientLegalFields(data: WizardValidationPayload): string[] {
 return validateContractWizardStep('client', data)
 .filter((error) => CLIENT_LEGAL_DRAFT_WARNING_FIELDS.has(error.field))
 .map((error) => error.label);
}

export function getMissingContractProviderLegalFields(data: WizardValidationPayload): string[] {
 return validateContractWizardStep('provider', data)
 .filter((error) => PROVIDER_LEGAL_DRAFT_WARNING_FIELDS.has(error.field))
 .map((error) => error.label);
}

export function getMissingContractServiceFields(data: WizardValidationPayload): string[] {
 return validateContractWizardStep('service', data)
 .filter((error) => SERVICE_DRAFT_WARNING_FIELDS.has(error.field))
 .map((error) => error.label);
}

export function getMissingContractScopeFields(data: WizardValidationPayload): string[] {
 return validateContractWizardStep('scope', data)
 .filter((error) => SCOPE_DRAFT_WARNING_FIELDS.has(error.field) || error.field.startsWith('deliverables.'))
 .map((error) => error.label);
}
export function getMissingContractFinancialFields(data: WizardValidationPayload): string[] {
 return validateContractWizardStep('financials', data)
 .filter((error) => FINANCIALS_DRAFT_WARNING_FIELDS.has(error.field) || error.field.startsWith('paymentMilestones.'))
 .map((error) => error.label);
}export function getStepMissingFields(stepId: ContractWizardStepId, data: WizardValidationPayload): string[] {
 return validateContractWizardStep(stepId, data)
 .filter((error) => error.blocking)
 .map((error) => error.label);
}

export function formatStepValidationErrors(errors: ContractWizardValidationError[]): string {
 const labels = errors.filter((error) => error.blocking).map((error) => error.label);
 if (labels.length === 0) return '';
 if (labels.length === 1) return `Para continuar, preencha: ${labels[0]}.`;
 return `Para continuar, preencha: ${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}.`;
}

function parsePositiveNumber(value: unknown): number | null {
 if (typeof value !== 'string' && typeof value !== 'number') return null;
 const normalized = String(value).trim().replace(/\s+/g, '').replace(',', '.');
 if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
 const parsed = Number(normalized);
 return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
function hasText(value: unknown): boolean {
 return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function isCompleteDeliverable(deliverable: Record<string, string | null | undefined>): boolean {
  return hasText(deliverable.title)
    && hasText(deliverable.description)
    && hasText(deliverable.phase)
    && hasText(deliverable.estimatedDate)
    && Boolean(parseDateOnly(deliverable.estimatedDate))
    && !isPastDate(deliverable.estimatedDate)
    && hasText(deliverable.responsible)
    && hasText(deliverable.acceptanceCriteria);
}

function getDeliverableValidationLabel(deliverable: Record<string, string | null | undefined>, index: number): string {
  const title = typeof deliverable.title === 'string' ? deliverable.title.trim() : '';
  return title ? `entregável '${title}'` : `entregável ${index + 1}`;
}
function getPhaseValidationLabel(phase: Record<string, string | null | undefined>, index: number): string {
  const name = typeof phase.name === 'string' ? phase.name.trim() : '';
  return name ? `fase '${name}'` : `fase ${index + 1}`;
}
function getPaymentValidationLabel(payment: Record<string, string | null | undefined>, index: number): string {
  const description = typeof payment.description === 'string' ? payment.description.trim() : '';
  return description ? `pagamento '${description}'` : `pagamento ${index + 1}`;
}
export function hasMeaningfulLegalText(value: unknown): boolean {
 if (typeof value !== 'string') return Boolean(value);
 const normalized = normalizePlaceholderText(value);
 if (!normalized) return false;
 if (PLACEHOLDER_VALUES.has(normalized)) return false;
 return !normalized.includes('por preencher');
}

function isPastDate(value: unknown): boolean {
 const date = parseDateOnly(value);
 if (!date) return true;

 const today = new Date();
 today.setHours(0, 0, 0, 0);
 return date.getTime() < today.getTime();
}

function parseDateOnly(value: unknown): Date | null {
 if (value instanceof Date) {
 if (Number.isNaN(value.getTime())) return null;
 const date = new Date(value);
 date.setHours(0, 0, 0, 0);
 return date;
 }

 if (typeof value !== 'string' || !value.trim()) return null;
 const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
 const date = match
 ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
 : new Date(value);

 if (Number.isNaN(date.getTime())) return null;
 date.setHours(0, 0, 0, 0);
 return date;
}
export function isValidEmail(value: unknown): boolean {
 return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeBasicPortugueseTaxId(value: unknown): string {
 if (typeof value !== 'string') return '';
 return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidBasicPortugueseTaxId(value: unknown): boolean {
 return /^(PT)?\d{9}$/.test(normalizeBasicPortugueseTaxId(value));
}

export function isValidRequiredProviderTaxId(value: unknown): boolean {
 const normalized = normalizeBasicPortugueseTaxId(value);
 return isValidBasicPortugueseTaxId(normalized) && normalized !== '000000000' && normalized !== 'PT000000000';
}

function normalizePlaceholderText(value: string): string {
 return value
 .trim()
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .replace(/\s+/g, ' ')
 .toLowerCase();
}

const PLACEHOLDER_VALUES = new Set(['por definir', 'n/a', 'na', 'nao definido', '-', '']);

const providerRequiredFields: Array<[string, string, string, (value: unknown) => boolean]> = [
 ['legalName', 'Nome legal da entidade prestadora', 'Indique o nome legal da entidade prestadora.', hasMeaningfulLegalText],
 ['taxId', 'NIF da entidade prestadora', 'Indique o NIF da entidade prestadora.', isValidRequiredProviderTaxId],
 ['address', 'Morada fiscal', 'Indique a morada fiscal da entidade prestadora.', hasMeaningfulLegalText],
 ['email', 'Email', 'Indique um email válido.', isValidEmail],
 ['representative', 'Nome do representante', 'Indique o nome do representante da Norm8.', hasMeaningfulLegalText],
 ['representativeRole', 'Cargo do representante', 'Indique o cargo do representante da Norm8.', hasMeaningfulLegalText],
];