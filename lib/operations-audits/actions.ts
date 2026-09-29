'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db/prisma';
import type { AutomationOpportunityStatus, BottleneckCategory, DataSensitivity, DataStructureType, EvidenceAnswer, EvidenceQuality, IntegrationDifficulty, StakeholderInterviewStatus, TaskExecutionMode } from '@/app/generated/prisma/client';
import { createAndLinkDataSourceToProcess, createAndLinkStakeholderToProcess, createAndLinkSystemToProcess, createAuditBottleneck, createAutomationOpportunity, createBaselineMetric, createAuditDataSource, createAuditStakeholder, createAuditSystem, createOperationsProcess, createOperationsTask, deleteAuditBottleneck, deleteAutomationOpportunity, deleteBaselineMetric, deleteAuditDataSource, deleteAuditStakeholder, deleteAuditSystem, deleteOperationsTask, linkBaselineToOpportunity, linkBottleneckToOpportunity, linkDataSourceToProcess, linkStakeholderToProcess, linkSystemToProcess, linkSystemToTask, moveOperationsTask, setProcessOwnerStakeholder, setTaskStakeholder, unlinkBaselineFromOpportunity, unlinkBottleneckFromOpportunity, unlinkDataSourceFromProcess, unlinkStakeholderFromProcess, unlinkSystemFromProcess, unlinkSystemFromTask, updateAuditBottleneck, updateAutomationOpportunity, updateBaselineMetric, updateAuditDataSource, updateAuditStakeholder, updateAuditSystem, updateOperationsProcessOverview, updateOperationsTask } from '@/lib/operations-audits/service';
import { criterionKeys, type AutomationAssessment } from '@/lib/operations-audits/scoring';
import { saveAutomationOpportunityEvaluation, scoreAutomationOpportunity } from '@/lib/operations-audits/scoring-service';

export type ProcessActionState = { success: boolean; error?: string; message?: string; processId?: string };
export type SystemActionState = { success: boolean; error?: string; message?: string };
export type DataSourceActionState = { success: boolean; error?: string; message?: string };
export type StakeholderActionState = { success: boolean; error?: string; message?: string };
export type BottleneckActionState = { success:boolean;error?:string;message?:string };
export type BaselineActionState = { success:boolean;error?:string;message?:string };
export type OpportunityActionState = { success:boolean;error?:string;message?:string;opportunityId?:string };
export type EvaluationActionState = { success:boolean;error?:string;message?:string };
export type ScoreActionState = { success:boolean;error?:string;message?:string };

export async function createOperationsAuditAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const leadId = String(formData.get('leadId') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const scope = optionalString(formData.get('scope'));
  const objectives = optionalString(formData.get('objectives'));

  if (!leadId || !name) redirect('/admin/operations-audits/new?error=required');

  const [lead, owner] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } }),
    prisma.adminUser.findUnique({ where: { id: admin.id }, select: { id: true } }),
  ]);
  if (!lead) redirect('/admin/operations-audits/new?error=company');

  const audit = await prisma.operationsAudit.create({
    data: { leadId, name, objectives, ownerId: owner?.id ?? null, scope },
  });

  redirect(`/admin/operations-audits/${audit.id}`);
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

export async function createOperationsProcessAction(_state: ProcessActionState, formData: FormData): Promise<ProcessActionState> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId'));
  const name = requiredString(formData.get('name'));
  if (!auditId) return { success: false, error: 'Auditoria inválida.' };
  if (!name) return { success: false, error: 'O nome do processo é obrigatório.' };
  if (name.length > 160) return { success: false, error: 'O nome não pode exceder 160 caracteres.' };

  try {
    const process = await createOperationsProcess({
      auditId,
      name,
      department: optionalString(formData.get('department')),
      trigger: optionalString(formData.get('trigger')),
      endState: optionalString(formData.get('endState')),
      notes: optionalString(formData.get('notes')),
    });
    revalidateAuditProcessPaths(auditId, process.id);
    return { success: true, message: 'Processo capturado.', processId: process.id };
  } catch (error) {
    if (error instanceof Error && error.message === 'AUDIT_NOT_FOUND') return { success: false, error: 'A auditoria já não existe.' };
    console.error('Failed to create operations process', { auditId, error });
    return { success: false, error: 'Não foi possível guardar o processo.' };
  }
}

export async function updateOperationsProcessOverviewAction(_state: ProcessActionState, formData: FormData): Promise<ProcessActionState> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId'));
  const processId = requiredString(formData.get('processId'));
  const name = requiredString(formData.get('name'));
  if (!auditId || !processId) return { success: false, error: 'Processo inválido.' };
  if (!name) return { success: false, error: 'O nome do processo é obrigatório.' };
  if (name.length > 160) return { success: false, error: 'O nome não pode exceder 160 caracteres.' };

  try {
    await updateOperationsProcessOverview({
      auditId,
      processId,
      name,
      department: optionalString(formData.get('department')),
      description: optionalString(formData.get('description')),
      trigger: optionalString(formData.get('trigger')),
      endState: optionalString(formData.get('endState')),
      notes: optionalString(formData.get('notes')),
    });
    revalidateAuditProcessPaths(auditId, processId);
    return { success: true, message: 'Overview guardado.' };
  } catch (error) {
    if (error instanceof Error && error.message === 'PROCESS_NOT_FOUND') return { success: false, error: 'O processo não pertence a esta auditoria ou já não existe.' };
    console.error('Failed to update operations process', { auditId, processId, error });
    return { success: false, error: 'Não foi possível guardar o processo.' };
  }
}

function requiredString(value: FormDataEntryValue | null): string { return String(value ?? '').trim(); }
function revalidateAuditProcessPaths(auditId: string, processId: string): void {
  revalidatePath('/admin/operations-audits');
  revalidatePath(`/admin/operations-audits/${auditId}`);
  revalidatePath(`/admin/operations-audits/${auditId}/processes/${processId}`);
}

function revalidateAuditPaths(auditId: string): void {
  revalidatePath('/admin/operations-audits');
  revalidatePath(`/admin/operations-audits/${auditId}`);
}

export async function createAuditSystemAction(_state: SystemActionState, formData: FormData): Promise<SystemActionState> {
  await requireAdmin();
  const input = parseSystemInput(formData);
  if ('error' in input) return { success: false, error: input.error };
  try {
    await createAuditSystem(input);
    revalidateAuditPaths(input.auditId);
    return { success: true, message: 'Sistema criado.' };
  } catch (error) { return systemError(error, 'criar'); }
}

export async function updateAuditSystemAction(_state: SystemActionState, formData: FormData): Promise<SystemActionState> {
  await requireAdmin();
  const input = parseSystemInput(formData);
  const systemId = requiredString(formData.get('systemId'));
  if ('error' in input) return { success: false, error: input.error };
  if (!systemId) return { success: false, error: 'Sistema inválido.' };
  try {
    await updateAuditSystem({ ...input, systemId });
    revalidateAuditPaths(input.auditId);
    return { success: true, message: 'Sistema guardado.' };
  } catch (error) { return systemError(error, 'guardar'); }
}

export async function deleteAuditSystemAction(_state: SystemActionState, formData: FormData): Promise<SystemActionState> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId'));
  const systemId = requiredString(formData.get('systemId'));
  if (!auditId || !systemId) return { success: false, error: 'Sistema inválido.' };
  try {
    await deleteAuditSystem({ auditId, systemId });
    revalidateAuditPaths(auditId);
    return { success: true, message: 'Sistema apagado.' };
  } catch (error) { return systemError(error, 'apagar'); }
}

export async function linkSystemToProcessAction(_state: SystemActionState, formData: FormData): Promise<SystemActionState> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId')), processId = requiredString(formData.get('processId')), systemId = requiredString(formData.get('systemId'));
  if (!auditId || !processId || !systemId) return { success: false, error: 'Selecione um sistema válido.' };
  try { await linkSystemToProcess({ auditId, processId, systemId }); revalidateAuditProcessPaths(auditId, processId); return { success: true, message: 'Sistema associado.' }; }
  catch (error) { return scopeError(error); }
}

export async function createAndLinkSystemToProcessAction(_state: SystemActionState, formData: FormData): Promise<SystemActionState> {
  await requireAdmin();
  const input = parseSystemInput(formData);
  const processId = requiredString(formData.get('processId'));
  if ('error' in input) return { success: false, error: input.error };
  if (!processId) return { success: false, error: 'Processo inválido.' };
  try { await createAndLinkSystemToProcess({ ...input, processId }); revalidateAuditProcessPaths(input.auditId, processId); return { success: true, message: 'Sistema criado e associado.' }; }
  catch (error) { return scopeError(error); }
}

export async function unlinkSystemFromProcessAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId')), processId = requiredString(formData.get('processId')), systemId = requiredString(formData.get('systemId'));
  if (!auditId || !processId || !systemId) return;
  try { await unlinkSystemFromProcess({ auditId, processId, systemId }); revalidateAuditProcessPaths(auditId, processId); }
  catch (error) { console.error('Failed to unlink process system', { auditId, processId, systemId, error }); }
}

export async function linkSystemToTaskAction(_state: SystemActionState, formData: FormData): Promise<SystemActionState> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId')), processId = requiredString(formData.get('processId'));
  const taskId = requiredString(formData.get('taskId')), systemId = requiredString(formData.get('systemId'));
  if (!auditId || !processId || !taskId || !systemId) return { success: false, error: 'Selecione um sistema válido.' };
  try { await linkSystemToTask({ auditId, processId, taskId, systemId }); revalidateAuditProcessPaths(auditId, processId); return { success: true, message: 'Sistema associado ao step.' }; }
  catch (error) { return scopeError(error); }
}

export async function unlinkSystemFromTaskAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId')), processId = requiredString(formData.get('processId'));
  const taskId = requiredString(formData.get('taskId')), systemId = requiredString(formData.get('systemId'));
  if (!auditId || !processId || !taskId || !systemId) return;
  try { await unlinkSystemFromTask({ auditId, processId, taskId, systemId }); revalidateAuditProcessPaths(auditId, processId); }
  catch (error) { console.error('Failed to unlink task system', { auditId, processId, taskId, systemId, error }); }
}

function parseSystemInput(formData: FormData) {
  const auditId = requiredString(formData.get('auditId')), name = requiredString(formData.get('name'));
  if (!auditId) return { error: 'Auditoria inválida.' } as const;
  if (!name) return { error: 'O nome do sistema é obrigatório.' } as const;
  if (name.length > 160) return { error: 'O nome não pode exceder 160 caracteres.' } as const;
  const apiAvailable = parseEvidenceAnswer(formData.get('apiAvailable'));
  const exportAvailable = parseEvidenceAnswer(formData.get('exportAvailable'));
  const integrationDifficulty = parseIntegrationDifficulty(formData.get('integrationDifficulty'));
  if (!apiAvailable || !exportAvailable || !integrationDifficulty) return { error: 'Metadados de integração inválidos.' } as const;
  return {
    auditId, name, category: optionalString(formData.get('category')), vendor: optionalString(formData.get('vendor')),
    purpose: optionalString(formData.get('purpose')), apiAvailable, exportAvailable, integrationDifficulty,
    dataOwner: optionalString(formData.get('dataOwner')), notes: optionalString(formData.get('notes')),
  };
}
function parseEvidenceAnswer(value: FormDataEntryValue | null): EvidenceAnswer | null {
  const raw = requiredString(value) || 'UNKNOWN'; return ['YES', 'NO', 'UNKNOWN'].includes(raw) ? raw as EvidenceAnswer : null;
}
function parseIntegrationDifficulty(value: FormDataEntryValue | null): IntegrationDifficulty | null {
  const raw = requiredString(value) || 'UNKNOWN'; return ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'].includes(raw) ? raw as IntegrationDifficulty : null;
}
function systemError(error: unknown, operation: string): SystemActionState {
  if (error instanceof Error && error.message === 'SYSTEM_DUPLICATE') return { success: false, error: 'Já existe um sistema com este nome nesta auditoria.' };
  if (error instanceof Error && error.message === 'SYSTEM_IN_USE') return { success: false, error: 'Este sistema ainda está associado a processos, steps ou data sources. Remova as associações antes de o apagar.' };
  if (error instanceof Error && (error.message === 'SYSTEM_NOT_FOUND' || error.message === 'AUDIT_NOT_FOUND')) return { success: false, error: 'O sistema ou auditoria já não existe.' };
  console.error(`Failed to ${operation} audit system`, error); return { success: false, error: `Não foi possível ${operation} o sistema.` };
}
function scopeError(error: unknown): SystemActionState {
  if (error instanceof Error && ['PROCESS_NOT_FOUND', 'PROCESS_SYSTEM_SCOPE_MISMATCH', 'TASK_SYSTEM_SCOPE_MISMATCH'].includes(error.message)) return { success: false, error: 'O processo, step ou sistema não pertence a esta auditoria.' };
  console.error('Failed to associate audit system', error); return { success: false, error: 'Não foi possível alterar a associação.' };
}

export async function createAuditDataSourceAction(_state: DataSourceActionState, formData: FormData): Promise<DataSourceActionState> {
  await requireAdmin(); const input = parseDataSourceInput(formData);
  if ('error' in input) return { success: false, error: input.error };
  try { await createAuditDataSource(input); revalidateAuditPaths(input.auditId); return { success: true, message: 'Data source criado.' }; }
  catch (error) { return dataSourceError(error, 'criar'); }
}

export async function updateAuditDataSourceAction(_state: DataSourceActionState, formData: FormData): Promise<DataSourceActionState> {
  await requireAdmin(); const input = parseDataSourceInput(formData); const dataSourceId = requiredString(formData.get('dataSourceId'));
  if ('error' in input) return { success: false, error: input.error };
  if (!dataSourceId) return { success: false, error: 'Data source inválido.' };
  try { await updateAuditDataSource({ ...input, dataSourceId }); revalidateAuditPaths(input.auditId); return { success: true, message: 'Data source guardado.' }; }
  catch (error) { return dataSourceError(error, 'guardar'); }
}

export async function deleteAuditDataSourceAction(_state: DataSourceActionState, formData: FormData): Promise<DataSourceActionState> {
  await requireAdmin(); const auditId = requiredString(formData.get('auditId')), dataSourceId = requiredString(formData.get('dataSourceId'));
  if (!auditId || !dataSourceId) return { success: false, error: 'Data source inválido.' };
  try { await deleteAuditDataSource({ auditId, dataSourceId }); revalidateAuditPaths(auditId); return { success: true, message: 'Data source apagado.' }; }
  catch (error) { return dataSourceError(error, 'apagar'); }
}

export async function linkDataSourceToProcessAction(_state: DataSourceActionState, formData: FormData): Promise<DataSourceActionState> {
  await requireAdmin(); const auditId = requiredString(formData.get('auditId')), processId = requiredString(formData.get('processId')), dataSourceId = requiredString(formData.get('dataSourceId'));
  if (!auditId || !processId || !dataSourceId) return { success: false, error: 'Selecione um data source válido.' };
  try { await linkDataSourceToProcess({ auditId, processId, dataSourceId }); revalidateAuditProcessPaths(auditId, processId); return { success: true, message: 'Data source associado.' }; }
  catch (error) { return dataSourceScopeError(error); }
}

export async function createAndLinkDataSourceToProcessAction(_state: DataSourceActionState, formData: FormData): Promise<DataSourceActionState> {
  await requireAdmin(); const input = parseDataSourceInput(formData); const processId = requiredString(formData.get('processId'));
  if ('error' in input) return { success: false, error: input.error };
  if (!processId) return { success: false, error: 'Processo inválido.' };
  try { await createAndLinkDataSourceToProcess({ ...input, processId }); revalidateAuditProcessPaths(input.auditId, processId); return { success: true, message: 'Data source criado e associado.' }; }
  catch (error) { return dataSourceScopeError(error); }
}

export async function unlinkDataSourceFromProcessAction(formData: FormData): Promise<void> {
  await requireAdmin(); const auditId = requiredString(formData.get('auditId')), processId = requiredString(formData.get('processId')), dataSourceId = requiredString(formData.get('dataSourceId'));
  if (!auditId || !processId || !dataSourceId) return;
  try { await unlinkDataSourceFromProcess({ auditId, processId, dataSourceId }); revalidateAuditProcessPaths(auditId, processId); }
  catch (error) { console.error('Failed to unlink process data source', { auditId, processId, dataSourceId, error }); }
}

function parseDataSourceInput(formData: FormData) {
  const auditId = requiredString(formData.get('auditId')), name = requiredString(formData.get('name'));
  if (!auditId) return { error: 'Auditoria inválida.' } as const;
  if (!name) return { error: 'O nome do data source é obrigatório.' } as const;
  if (name.length > 160) return { error: 'O nome não pode exceder 160 caracteres.' } as const;
  const structure = parseDataStructure(formData.get('structure')), sensitivity = parseDataSensitivity(formData.get('sensitivity'));
  const accessibility = requiredString(formData.get('accessibility')) || 'UNKNOWN', qualityRaw = requiredString(formData.get('quality'));
  const quality = qualityRaw === 'UNKNOWN' || !qualityRaw ? null : Number(qualityRaw);
  if (!structure || !sensitivity || !['UNKNOWN', 'EASY', 'MODERATE', 'DIFFICULT'].includes(accessibility) || (quality !== null && ![1, 2, 3].includes(quality))) return { error: 'Metadados de data readiness inválidos.' } as const;
  return {
    auditId, name, type: optionalString(formData.get('type')), description: optionalString(formData.get('description')),
    structure, accessibility, quality, sensitivity, updateFrequency: optionalString(formData.get('updateFrequency')),
    systemId: optionalString(formData.get('systemId')), notes: optionalString(formData.get('notes')),
  };
}
function parseDataStructure(value: FormDataEntryValue | null): DataStructureType | null {
  const raw = requiredString(value) || 'UNKNOWN'; return ['STRUCTURED', 'SEMI_STRUCTURED', 'UNSTRUCTURED', 'UNKNOWN'].includes(raw) ? raw as DataStructureType : null;
}
function parseDataSensitivity(value: FormDataEntryValue | null): DataSensitivity | null {
  const raw = requiredString(value) || 'UNKNOWN'; return ['CLIENT_PRIVATE', 'CLIENT_DERIVED', 'AGGREGATED', 'NORM8_KNOWLEDGE', 'UNKNOWN'].includes(raw) ? raw as DataSensitivity : null;
}
function dataSourceError(error: unknown, operation: string): DataSourceActionState {
  if (error instanceof Error && error.message === 'DATA_SOURCE_DUPLICATE') return { success: false, error: 'Já existe um data source com este nome nesta auditoria.' };
  if (error instanceof Error && error.message === 'DATA_SOURCE_IN_USE') return { success: false, error: 'Este data source ainda está associado a processos. Remova as associações antes de o apagar.' };
  if (error instanceof Error && error.message === 'DATA_SOURCE_SYSTEM_SCOPE_MISMATCH') return { success: false, error: 'O sistema selecionado não pertence a esta auditoria.' };
  if (error instanceof Error && ['DATA_SOURCE_NOT_FOUND', 'AUDIT_NOT_FOUND'].includes(error.message)) return { success: false, error: 'O data source ou auditoria já não existe.' };
  console.error(`Failed to ${operation} audit data source`, error); return { success: false, error: `Não foi possível ${operation} o data source.` };
}
function dataSourceScopeError(error: unknown): DataSourceActionState {
  if (error instanceof Error && ['PROCESS_NOT_FOUND', 'PROCESS_DATA_SOURCE_SCOPE_MISMATCH', 'DATA_SOURCE_SYSTEM_SCOPE_MISMATCH'].includes(error.message)) return { success: false, error: 'O processo, data source ou sistema não pertence a esta auditoria.' };
  console.error('Failed to associate audit data source', error); return { success: false, error: 'Não foi possível alterar a associação.' };
}

export async function createAuditStakeholderAction(_state: StakeholderActionState, formData: FormData): Promise<StakeholderActionState> { await requireAdmin(); const input = parseStakeholderInput(formData); if ('error' in input) return { success: false, error: input.error }; try { const result = await createAuditStakeholder(input); revalidateAuditPaths(input.auditId); return { success: true, message: result.duplicateName ? 'Stakeholder criado. Já existia outro stakeholder com o mesmo nome.' : 'Stakeholder criado.' }; } catch (error) { return stakeholderError(error); } }
export async function updateAuditStakeholderAction(_state: StakeholderActionState, formData: FormData): Promise<StakeholderActionState> { await requireAdmin(); const input = parseStakeholderInput(formData), stakeholderId = requiredString(formData.get('stakeholderId')); if ('error' in input) return { success: false, error: input.error }; if (!stakeholderId) return { success: false, error: 'Stakeholder inválido.' }; try { await updateAuditStakeholder({ ...input, stakeholderId }); revalidateAuditPaths(input.auditId); return { success: true, message: 'Stakeholder guardado.' }; } catch (error) { return stakeholderError(error); } }
export async function deleteAuditStakeholderAction(_state: StakeholderActionState, formData: FormData): Promise<StakeholderActionState> { await requireAdmin(); const auditId = requiredString(formData.get('auditId')), stakeholderId = requiredString(formData.get('stakeholderId')); if (!auditId || !stakeholderId) return { success: false, error: 'Stakeholder inválido.' }; try { await deleteAuditStakeholder({ auditId, stakeholderId }); revalidateAuditPaths(auditId); return { success: true, message: 'Stakeholder apagado.' }; } catch (error) { return stakeholderError(error); } }
export async function setProcessOwnerStakeholderAction(_state: StakeholderActionState, formData: FormData): Promise<StakeholderActionState> { await requireAdmin(); const auditId=requiredString(formData.get('auditId')), processId=requiredString(formData.get('processId')), stakeholderId=optionalString(formData.get('stakeholderId')); try { await setProcessOwnerStakeholder({ auditId, processId, stakeholderId }); revalidateAuditProcessPaths(auditId, processId); return { success: true, message: 'Process owner atualizado.' }; } catch(error) { return stakeholderScopeError(error); } }
export async function linkStakeholderToProcessAction(_state: StakeholderActionState, formData: FormData): Promise<StakeholderActionState> { await requireAdmin(); const auditId=requiredString(formData.get('auditId')), processId=requiredString(formData.get('processId')), stakeholderId=requiredString(formData.get('stakeholderId')); try { await linkStakeholderToProcess({ auditId, processId, stakeholderId }); revalidateAuditProcessPaths(auditId, processId); return { success: true, message: 'Participant associado.' }; } catch(error) { return stakeholderScopeError(error); } }
export async function createAndLinkStakeholderToProcessAction(_state: StakeholderActionState, formData: FormData): Promise<StakeholderActionState> { await requireAdmin(); const input=parseStakeholderInput(formData), processId=requiredString(formData.get('processId')); if('error' in input) return {success:false,error:input.error}; try { await createAndLinkStakeholderToProcess({...input,processId}); revalidateAuditProcessPaths(input.auditId,processId); return {success:true,message:'Stakeholder criado e associado.'}; } catch(error){return stakeholderScopeError(error);} }
export async function unlinkStakeholderFromProcessAction(formData: FormData): Promise<void> { await requireAdmin(); const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),stakeholderId=requiredString(formData.get('stakeholderId')); try{await unlinkStakeholderFromProcess({auditId,processId,stakeholderId});revalidateAuditProcessPaths(auditId,processId);}catch(error){console.error('Failed to unlink stakeholder',error);} }
export async function setTaskStakeholderAction(_state: StakeholderActionState, formData: FormData): Promise<StakeholderActionState> { await requireAdmin(); const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),taskId=requiredString(formData.get('taskId')),stakeholderId=optionalString(formData.get('stakeholderId')); try{await setTaskStakeholder({auditId,processId,taskId,stakeholderId});revalidateAuditProcessPaths(auditId,processId);return{success:true,message:'Stakeholder do step atualizado.'};}catch(error){return stakeholderScopeError(error);} }
function parseStakeholderInput(formData:FormData){const auditId=requiredString(formData.get('auditId')),name=requiredString(formData.get('name'));if(!auditId)return{error:'Auditoria inválida.'}as const;if(!name)return{error:'O nome do stakeholder é obrigatório.'}as const;if(name.length>160)return{error:'O nome não pode exceder 160 caracteres.'}as const;const raw=requiredString(formData.get('interviewStatus'))||'NOT_PLANNED';if(!['NOT_PLANNED','PLANNED','INTERVIEWED','FOLLOW_UP'].includes(raw))return{error:'Interview status inválido.'}as const;return{auditId,name,role:optionalString(formData.get('role')),department:optionalString(formData.get('department')),seniority:optionalString(formData.get('seniority')),responsibilities:optionalString(formData.get('responsibilities')),interviewStatus:raw as StakeholderInterviewStatus,notes:optionalString(formData.get('notes'))};}
function stakeholderError(error:unknown):StakeholderActionState{if(error instanceof Error&&error.message==='STAKEHOLDER_IN_USE')return{success:false,error:'Este stakeholder ainda está associado a processos ou steps. Remova as associações antes de o apagar.'};if(error instanceof Error&&['STAKEHOLDER_NOT_FOUND','AUDIT_NOT_FOUND'].includes(error.message))return{success:false,error:'O stakeholder ou auditoria já não existe.'};console.error('Stakeholder mutation failed',error);return{success:false,error:'Não foi possível alterar o stakeholder.'};}
function stakeholderScopeError(error:unknown):StakeholderActionState{if(error instanceof Error&&['PROCESS_NOT_FOUND','TASK_NOT_FOUND','PROCESS_STAKEHOLDER_SCOPE_MISMATCH','TASK_STAKEHOLDER_SCOPE_MISMATCH'].includes(error.message))return{success:false,error:'O processo, step ou stakeholder não pertence a esta auditoria.'};console.error('Stakeholder association failed',error);return{success:false,error:'Não foi possível alterar a associação.'};}

export async function createOperationsTaskAction(_state: ProcessActionState, formData: FormData): Promise<ProcessActionState> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId'));
  const processId = requiredString(formData.get('processId'));
  const name = requiredString(formData.get('name'));
  if (!auditId || !processId) return { success: false, error: 'Processo inválido.' };
  if (!name) return { success: false, error: 'O nome do step é obrigatório.' };
  if (name.length > 160) return { success: false, error: 'O nome não pode exceder 160 caracteres.' };
  try {
    const task = await createOperationsTask({ auditId, processId, name });
    revalidateAuditProcessPaths(auditId, processId);
    return { success: true, message: 'Step adicionado.', processId: task.id };
  } catch (error) {
    if (error instanceof Error && error.message === 'PROCESS_NOT_FOUND') return { success: false, error: 'O processo não pertence a esta auditoria ou já não existe.' };
    console.error('Failed to create operations task', { auditId, processId, error });
    return { success: false, error: 'Não foi possível adicionar o step.' };
  }
}

export async function updateOperationsTaskAction(_state: ProcessActionState, formData: FormData): Promise<ProcessActionState> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId'));
  const processId = requiredString(formData.get('processId'));
  const taskId = requiredString(formData.get('taskId'));
  const name = requiredString(formData.get('name'));
  const executionMode = parseExecutionMode(formData.get('executionMode'));
  const averageTimeMinutes = parseOptionalNonNegativeInt(formData.get('averageTimeMinutes'));
  if (!auditId || !processId || !taskId) return { success: false, error: 'Step inválido.' };
  if (!name) return { success: false, error: 'O nome do step é obrigatório.' };
  if (name.length > 160) return { success: false, error: 'O nome não pode exceder 160 caracteres.' };
  if (!executionMode) return { success: false, error: 'Selecione um tipo de execução válido.' };
  if (averageTimeMinutes === 'INVALID') return { success: false, error: 'O tempo médio deve ser um número inteiro igual ou superior a zero.' };
  try {
    await updateOperationsTask({
      auditId, processId, taskId, name, executionMode, averageTimeMinutes,
      description: optionalString(formData.get('description')), actor: optionalString(formData.get('actor')),
      frequency: optionalString(formData.get('frequency')), input: optionalString(formData.get('input')),
      output: optionalString(formData.get('output')), decisionRequired: formData.get('decisionRequired') === 'on',
      exceptionFrequency: optionalString(formData.get('exceptionFrequency')),
    });
    revalidateAuditProcessPaths(auditId, processId);
    return { success: true, message: 'Step guardado.' };
  } catch (error) {
    if (error instanceof Error && error.message === 'TASK_NOT_FOUND') return { success: false, error: 'O step não pertence a este processo ou já não existe.' };
    console.error('Failed to update operations task', { auditId, processId, taskId, error });
    return { success: false, error: 'Não foi possível guardar o step.' };
  }
}

export async function moveOperationsTaskAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId'));
  const processId = requiredString(formData.get('processId'));
  const taskId = requiredString(formData.get('taskId'));
  const direction = requiredString(formData.get('direction'));
  if (!auditId || !processId || !taskId || (direction !== 'UP' && direction !== 'DOWN')) return;
  try { await moveOperationsTask({ auditId, processId, taskId, direction }); revalidateAuditProcessPaths(auditId, processId); }
  catch (error) { console.error('Failed to move operations task', { auditId, processId, taskId, error }); }
}

export async function deleteOperationsTaskAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const auditId = requiredString(formData.get('auditId'));
  const processId = requiredString(formData.get('processId'));
  const taskId = requiredString(formData.get('taskId'));
  if (!auditId || !processId || !taskId) return;
  try { await deleteOperationsTask({ auditId, processId, taskId }); revalidateAuditProcessPaths(auditId, processId); }
  catch (error) { console.error('Failed to delete operations task', { auditId, processId, taskId, error }); }
}

export async function createAuditBottleneckAction(_state:BottleneckActionState,formData:FormData):Promise<BottleneckActionState>{await requireAdmin();const input=parseBottleneckInput(formData);if('error'in input)return{success:false,error:input.error};try{await createAuditBottleneck(input);revalidateAuditProcessPaths(input.auditId,input.processId);return{success:true,message:'Bottleneck criado.'}}catch(error){return bottleneckError(error)}}
export async function updateAuditBottleneckAction(_state:BottleneckActionState,formData:FormData):Promise<BottleneckActionState>{await requireAdmin();const input=parseBottleneckInput(formData),bottleneckId=requiredString(formData.get('bottleneckId'));if('error'in input)return{success:false,error:input.error};try{await updateAuditBottleneck({...input,bottleneckId});revalidateAuditProcessPaths(input.auditId,input.processId);return{success:true,message:'Bottleneck guardado.'}}catch(error){return bottleneckError(error)}}
export async function deleteAuditBottleneckAction(formData:FormData):Promise<void>{await requireAdmin();const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),bottleneckId=requiredString(formData.get('bottleneckId'));try{await deleteAuditBottleneck({auditId,processId,bottleneckId});revalidateAuditProcessPaths(auditId,processId)}catch(error){console.error('Delete bottleneck failed',error)}}
function parseBottleneckInput(formData:FormData){const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),description=requiredString(formData.get('description'));if(!auditId||!processId)return{error:'Processo inválido.'}as const;if(!description)return{error:'A descrição do problema é obrigatória.'}as const;const category=requiredString(formData.get('category'))||'OTHER',evidenceQuality=requiredString(formData.get('evidenceQuality'))||'UNKNOWN';const categories=['MANUAL_WORK','WAITING','DUPLICATE_ENTRY','MISSING_INFORMATION','POOR_INTEGRATION','ERRORS','COMMUNICATION','APPROVAL','SEARCH_RETRIEVAL','RECONCILIATION','DATA_QUALITY','OTHER'];if(!categories.includes(category)||!['MEASURED','ESTIMATED','UNKNOWN'].includes(evidenceQuality))return{error:'Categoria ou evidence quality inválida.'}as const;const cost=requiredString(formData.get('costImpactCents')),captured=requiredString(formData.get('capturedAt'));return{auditId,processId,taskId:optionalString(formData.get('taskId')),description,category:category as BottleneckCategory,timeImpact:optionalString(formData.get('timeImpact')),costImpactCents:cost?Math.round(Number(cost)*100):null,errorImpact:optionalString(formData.get('errorImpact')),revenueImpact:optionalString(formData.get('revenueImpact')),customerImpact:optionalString(formData.get('customerImpact')),evidence:optionalString(formData.get('evidence')),evidenceQuality:evidenceQuality as EvidenceQuality,source:optionalString(formData.get('source')),evidenceReference:optionalString(formData.get('evidenceReference')),capturedAt:captured?new Date(captured):null}}
function bottleneckError(error:unknown):BottleneckActionState{if(error instanceof Error&&['PROCESS_NOT_FOUND','BOTTLENECK_TASK_SCOPE_MISMATCH','BOTTLENECK_NOT_FOUND'].includes(error.message))return{success:false,error:'O bottleneck, processo ou task não pertence a este contexto.'};console.error('Bottleneck mutation failed',error);return{success:false,error:'Não foi possível guardar o bottleneck.'}}

function parseExecutionMode(value: FormDataEntryValue | null): TaskExecutionMode | null {
  const raw = requiredString(value) as TaskExecutionMode;
  return ['MANUAL', 'AUTOMATED', 'HYBRID'].includes(raw) ? raw : null;
}

export async function createBaselineMetricAction(_state:BaselineActionState,formData:FormData):Promise<BaselineActionState>{await requireAdmin();const input=parseBaselineInput(formData);if('error'in input)return{success:false,error:input.error};try{await createBaselineMetric(input);revalidateAuditProcessPaths(input.auditId,input.processId);return{success:true,message:'Métrica criada.'}}catch(error){return baselineError(error)}}
export async function updateBaselineMetricAction(_state:BaselineActionState,formData:FormData):Promise<BaselineActionState>{await requireAdmin();const input=parseBaselineInput(formData),metricId=requiredString(formData.get('metricId'));if('error'in input)return{success:false,error:input.error};try{await updateBaselineMetric({...input,metricId});revalidateAuditProcessPaths(input.auditId,input.processId);return{success:true,message:'Métrica guardada.'}}catch(error){return baselineError(error)}}
export async function deleteBaselineMetricAction(formData:FormData):Promise<void>{await requireAdmin();const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),metricId=requiredString(formData.get('metricId'));try{await deleteBaselineMetric({auditId,processId,metricId});revalidateAuditProcessPaths(auditId,processId)}catch(error){console.error('Delete baseline failed',error)}}
function parseBaselineInput(formData:FormData){const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),label=requiredString(formData.get('label')),value=requiredString(formData.get('numericValue'));if(!auditId||!processId)return{error:'Processo inválido.'}as const;if(!label)return{error:'O nome da métrica é obrigatório.'}as const;if(value&&!/^-?\d+(\.\d+)?$/.test(value))return{error:'O valor deve ser numérico ou ficar vazio para Unknown.'}as const;const quality=requiredString(formData.get('evidenceQuality'))||'UNKNOWN',observed=requiredString(formData.get('observedAt'));if(!['UNKNOWN','ESTIMATED','MEASURED'].includes(quality))return{error:'Evidence quality inválida.'}as const;return{auditId,processId,label,numericValue:value||null,textValue:null,unit:optionalString(formData.get('unit')),period:optionalString(formData.get('period')),evidenceQuality:quality as EvidenceQuality,source:optionalString(formData.get('source')),evidence:optionalString(formData.get('evidence')),evidenceReference:optionalString(formData.get('evidenceReference')),notes:optionalString(formData.get('notes')),observedAt:observed?new Date(observed):null}}
function baselineError(error:unknown):BaselineActionState{if(error instanceof Error&&['PROCESS_NOT_FOUND','BASELINE_NOT_FOUND'].includes(error.message))return{success:false,error:'A métrica não pertence a este processo/auditoria.'};console.error('Baseline mutation failed',error);return{success:false,error:'Não foi possível guardar a métrica.'}}

function parseOptionalNonNegativeInt(value: FormDataEntryValue | null): number | null | 'INVALID' {
  const raw = requiredString(value); if (!raw) return null;
  const parsed = Number(raw); return Number.isInteger(parsed) && parsed >= 0 && parsed <= 1000000 ? parsed : 'INVALID';
}

export async function createAutomationOpportunityAction(_state:OpportunityActionState,formData:FormData):Promise<OpportunityActionState>{await requireAdmin();const input=parseOpportunityInput(formData);if('error'in input)return{success:false,error:input.error};try{const opportunity=await createAutomationOpportunity(input);revalidateAuditProcessPaths(input.auditId,input.processId);return{success:true,message:'Oportunidade criada.',opportunityId:opportunity.id}}catch(error){return opportunityError(error)}}
export async function updateAutomationOpportunityAction(_state:OpportunityActionState,formData:FormData):Promise<OpportunityActionState>{await requireAdmin();const input=parseOpportunityInput(formData),opportunityId=requiredString(formData.get('opportunityId'));if('error'in input)return{success:false,error:input.error};if(!opportunityId)return{success:false,error:'Oportunidade inválida.'};try{await updateAutomationOpportunity({...input,opportunityId});revalidateOpportunityPaths(input.auditId,input.processId,opportunityId);return{success:true,message:'Oportunidade guardada.'}}catch(error){return opportunityError(error)}}
export async function deleteAutomationOpportunityAction(formData:FormData){await requireAdmin();const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),opportunityId=requiredString(formData.get('opportunityId'));if(!auditId||!processId||!opportunityId)return;await deleteAutomationOpportunity({auditId,processId,opportunityId});revalidateAuditProcessPaths(auditId,processId)}
export async function linkBottleneckToOpportunityAction(_state:OpportunityActionState,formData:FormData):Promise<OpportunityActionState>{await requireAdmin();const ids=opportunityAssociationIds(formData,'bottleneckId');if('error'in ids)return{success:false,error:ids.error};try{await linkBottleneckToOpportunity({...ids,bottleneckId:ids.evidenceId});revalidateOpportunityPaths(ids.auditId,ids.processId,ids.opportunityId);return{success:true,message:'Bottleneck associado.'}}catch(error){return opportunityError(error)}}
export async function unlinkBottleneckFromOpportunityAction(formData:FormData){await requireAdmin();const ids=opportunityAssociationIds(formData,'bottleneckId');if('error'in ids)return;await unlinkBottleneckFromOpportunity({...ids,bottleneckId:ids.evidenceId});revalidateOpportunityPaths(ids.auditId,ids.processId,ids.opportunityId)}
export async function linkBaselineToOpportunityAction(_state:OpportunityActionState,formData:FormData):Promise<OpportunityActionState>{await requireAdmin();const ids=opportunityAssociationIds(formData,'baselineId');if('error'in ids)return{success:false,error:ids.error};try{await linkBaselineToOpportunity({...ids,baselineId:ids.evidenceId});revalidateOpportunityPaths(ids.auditId,ids.processId,ids.opportunityId);return{success:true,message:'Baseline associada.'}}catch(error){return opportunityError(error)}}
export async function unlinkBaselineFromOpportunityAction(formData:FormData){await requireAdmin();const ids=opportunityAssociationIds(formData,'baselineId');if('error'in ids)return;await unlinkBaselineFromOpportunity({...ids,baselineId:ids.evidenceId});revalidateOpportunityPaths(ids.auditId,ids.processId,ids.opportunityId)}
function parseOpportunityInput(formData:FormData){const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),title=requiredString(formData.get('title')),problem=requiredString(formData.get('problem')),status=requiredString(formData.get('status'))||'DISCOVERED';if(!auditId||!processId)return{error:'Processo inválido.'}as const;if(!title)return{error:'O título da oportunidade é obrigatório.'}as const;if(!problem)return{error:'O problema é obrigatório.'}as const;if(title.length>180)return{error:'O título não pode exceder 180 caracteres.'}as const;const statuses=['DISCOVERED','VALIDATING','RECOMMENDED','PILOT_PROPOSED','PILOT_ACCEPTED','IMPLEMENTED','REJECTED'];if(!statuses.includes(status))return{error:'Estado inválido.'}as const;return{auditId,processId,title,problem,currentState:optionalString(formData.get('currentState')),proposedOutcome:optionalString(formData.get('proposedOutcome')),automationConcept:optionalString(formData.get('automationConcept')),expectedFutureState:optionalString(formData.get('expectedFutureState')),status:status as AutomationOpportunityStatus,recommendation:optionalString(formData.get('recommendation'))}}
function opportunityAssociationIds(formData:FormData,evidenceName:'bottleneckId'|'baselineId'){const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),opportunityId=requiredString(formData.get('opportunityId')),evidenceId=requiredString(formData.get(evidenceName));if(!auditId||!processId||!opportunityId||!evidenceId)return{error:'Associação inválida.'}as const;return{auditId,processId,opportunityId,evidenceId}}
function revalidateOpportunityPaths(auditId:string,processId:string,opportunityId:string){revalidateAuditProcessPaths(auditId,processId);revalidatePath(`/admin/operations-audits/${auditId}/processes/${processId}/opportunities/${opportunityId}`)}
function opportunityError(error:unknown):OpportunityActionState{const code=error instanceof Error?error.message:'';if(code==='PROCESS_NOT_FOUND')return{success:false,error:'O processo não pertence a esta auditoria.'};if(code==='OPPORTUNITY_NOT_FOUND')return{success:false,error:'A oportunidade não pertence a este processo.'};if(code==='EVIDENCE_SCOPE_MISMATCH')return{success:false,error:'A evidência não pertence a este processo.'};if(code==='LINK_NOT_FOUND')return{success:false,error:'A associação já não existe.'};console.error(error);return{success:false,error:'Não foi possível guardar a oportunidade.'}}

export async function saveOpportunityEvaluationAction(_state:EvaluationActionState,formData:FormData):Promise<EvaluationActionState>{
  await requireAdmin();
  const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),opportunityId=requiredString(formData.get('opportunityId')),scoringModelId=requiredString(formData.get('scoringModelId'));
  if(!auditId||!processId||!opportunityId||!scoringModelId)return{success:false,error:'Evaluation inválida.'};
  const assessment={} as AutomationAssessment;
  for(const key of criterionKeys){
    const raw=requiredString(formData.get(`${key}.value`))||'UNKNOWN';
    const value=raw==='UNKNOWN'?null:Number(raw);
    if(value!==null&&(!Number.isInteger(value)||value<1||value>5))return{success:false,error:`Valor inválido em ${key}.`};
    const evidenceQuality=requiredString(formData.get(`${key}.evidenceQuality`))||'UNKNOWN';
    if(!['UNKNOWN','ESTIMATED','MEASURED'].includes(evidenceQuality))return{success:false,error:`Evidence quality inválida em ${key}.`};
    const capturedRaw=requiredString(formData.get(`${key}.capturedAt`));
    const capturedAt=capturedRaw?new Date(capturedRaw):null;
    if(capturedAt&&Number.isNaN(capturedAt.getTime()))return{success:false,error:`Captured at inválido em ${key}.`};
    assessment[key]={value,evidenceQuality:evidenceQuality as 'UNKNOWN'|'ESTIMATED'|'MEASURED',source:optionalString(formData.get(`${key}.source`)),reference:optionalString(formData.get(`${key}.reference`)),note:optionalString(formData.get(`${key}.note`)),capturedAt:capturedAt?.toISOString()??null};
  }
  try{await saveAutomationOpportunityEvaluation({auditId,processId,opportunityId,scoringModelId,assessment});revalidateOpportunityPaths(auditId,processId,opportunityId);return{success:true,message:'Evaluation guardada.'}}catch(error){const code=error instanceof Error?error.message:'';if(code==='OPPORTUNITY_NOT_FOUND')return{success:false,error:'A oportunidade não pertence a este processo.'};if(code==='SCORING_MODEL_INVALID')return{success:false,error:'O scoring model não é válido ou já não está ativo.'};console.error(error);return{success:false,error:'Não foi possível guardar a evaluation.'}}
}

export async function calculateOpportunityScoreAction(_state:ScoreActionState,formData:FormData):Promise<ScoreActionState>{await requireAdmin();const auditId=requiredString(formData.get('auditId')),processId=requiredString(formData.get('processId')),opportunityId=requiredString(formData.get('opportunityId'));if(!auditId||!processId||!opportunityId)return{success:false,error:'Oportunidade inválida.'};try{await scoreAutomationOpportunity({auditId,processId,opportunityId});revalidateOpportunityPaths(auditId,processId,opportunityId);return{success:true,message:'Score snapshot calculado.'}}catch(error){const code=error instanceof Error?error.message:'';if(code==='OPPORTUNITY_NOT_FOUND')return{success:false,error:'A oportunidade não pertence a este processo.'};if(code==='SCORING_MODEL_INVALID'||code==='ACTIVE_SCORING_MODEL_NOT_FOUND')return{success:false,error:'O scoring model associado não é válido.'};if(code==='ASSESSMENT_INVALID')return{success:false,error:'O assessment não é estruturalmente válido.'};if(code==='SCORING_CONFIG_INVALID')return{success:false,error:'A configuração do scoring model é inválida.'};console.error(error);return{success:false,error:'Não foi possível calcular o score.'}}}
