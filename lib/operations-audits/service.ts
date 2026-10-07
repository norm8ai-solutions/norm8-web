import 'server-only';

import type { AutomationOpportunityStatus, BottleneckCategory, DataSensitivity, DataStructureType, EvidenceAnswer, EvidenceQuality, IntegrationDifficulty, OpportunityDecision, PilotProposalStatus, Prisma, ProjectGrowthPhase, ProjectStatus, StakeholderInterviewStatus, StrategicFit, TaskExecutionMode } from '@/app/generated/prisma/client';
import { canTransitionPilotStatus, pilotCompleteness } from '@/lib/operations-audits/pilot-lifecycle';
import { prisma } from '@/lib/db/prisma';

export const operationsAuditStatuses = ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'ANALYSIS', 'COMPLETED', 'ARCHIVED'] as const;

export async function getOperationsAudits() {
  return prisma.operationsAudit.findMany({
    include: {
      lead: { select: { company: true, id: true } },
      owner: { select: { name: true } },
      _count: { select: { opportunities: true, processes: true, stakeholders: true, systems: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOperationsAuditById(id: string) {
  return prisma.operationsAudit.findUnique({
    where: { id },
    include: {
      lead: { select: { company: true, email: true, id: true, name: true, website: true } },
      owner: { select: { name: true } },
      processes: {
        include: { _count: { select: { baselines: true, bottlenecks: true, tasks: true } } },
        orderBy: { createdAt: 'desc' },
      },
      systems: {
        include: { _count: { select: { dataSources: true, processes: true, tasks: true } } },
        orderBy: { name: 'asc' },
      },
      dataSources: {
        include: { system: { select: { id: true, name: true } }, _count: { select: { processes: true } } },
        orderBy: { name: 'asc' },
      },
      stakeholders: {
        include: { _count: { select: { ownedProcesses: true, processLinks: true, tasks: true } } },
        orderBy: { name: 'asc' },
      },
      _count: { select: { dataSources: true, opportunities: true, processes: true, stakeholders: true, systems: true } },
    },
  });
}

export async function getOpportunityPortfolio(auditId:string){return prisma.automationOpportunity.findMany({where:{auditId,process:{auditId}},select:{id:true,title:true,problem:true,proposedOutcome:true,status:true,strategicFit:true,recommendation:true,decision:true,decisionRationale:true,decisionOwner:true,decidedAt:true,nextStep:true,assessment:true,scoreSnapshot:true,scoredAt:true,createdAt:true,process:{select:{id:true,name:true}}},orderBy:{createdAt:'desc'}})}

export async function getOperationsProcessById(auditId: string, processId: string) {
  return prisma.operationsProcess.findFirst({
    where: { id: processId, auditId },
    include: {
      audit: { select: { id: true, name: true, lead: { select: { company: true } }, systems: { orderBy: { name: 'asc' } }, dataSources: { include: { system: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }, stakeholders: { orderBy: { name: 'asc' } } } },
      ownerStakeholder: true,
      stakeholderLinks: { include: { stakeholder: true }, orderBy: { stakeholder: { name: 'asc' } } },
      systems: { include: { system: true }, orderBy: { system: { name: 'asc' } } },
      dataSources: { include: { dataSource: { include: { system: { select: { id: true, name: true } } } } }, orderBy: { dataSource: { name: 'asc' } } },
      bottlenecks: { include: { task: { select: { id: true, sequence: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      baselines: { orderBy: { createdAt: 'desc' } },
      opportunities: { orderBy: { createdAt: 'desc' } },
      tasks: { include: { stakeholder: true, systems: { include: { system: true }, orderBy: { system: { name: 'asc' } } } }, orderBy: { sequence: 'asc' } },
      _count: { select: { baselines: true, bottlenecks: true, dataSources: true, opportunities: true, systems: true, tasks: true } },
    },
  });
}

export type OpportunityInput={auditId:string;processId:string;title:string;problem:string;currentState?:string|null;proposedOutcome?:string|null;automationConcept?:string|null;expectedFutureState?:string|null;status:AutomationOpportunityStatus;recommendation?:string|null};
function opportunityData(input:OpportunityInput){return{title:input.title,problem:input.problem,currentState:input.currentState,proposedOutcome:input.proposedOutcome,automationConcept:input.automationConcept,expectedFutureState:input.expectedFutureState,status:input.status,recommendation:input.recommendation}}
export async function createAutomationOpportunity(input:OpportunityInput){const process=await prisma.operationsProcess.findFirst({where:{id:input.processId,auditId:input.auditId},select:{id:true}});if(!process)throw new Error('PROCESS_NOT_FOUND');return prisma.automationOpportunity.create({data:{auditId:input.auditId,processId:input.processId,...opportunityData(input)}})}
export async function updateAutomationOpportunity(input:OpportunityInput&{opportunityId:string}){const result=await prisma.automationOpportunity.updateMany({where:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}},data:opportunityData(input)});if(result.count!==1)throw new Error('OPPORTUNITY_NOT_FOUND')}
export async function deleteAutomationOpportunity(input:{auditId:string;processId:string;opportunityId:string}){const result=await prisma.automationOpportunity.deleteMany({where:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}});if(result.count!==1)throw new Error('OPPORTUNITY_NOT_FOUND')}
export async function updateOpportunityDecision(input:{auditId:string;processId:string;opportunityId:string;status:AutomationOpportunityStatus;strategicFit:StrategicFit|null;recommendation:string|null}){const result=await prisma.automationOpportunity.updateMany({where:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}},data:{status:input.status,strategicFit:input.strategicFit,recommendation:input.recommendation}});if(result.count!==1)throw new Error('OPPORTUNITY_NOT_FOUND')}

export async function updateHumanOpportunityDecision(input:{auditId:string;processId:string;opportunityId:string;decision:OpportunityDecision;decisionRationale:string|null;decisionOwner:string|null;nextStep:string|null}){const result=await prisma.automationOpportunity.updateMany({where:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}},data:{decision:input.decision,decisionRationale:input.decisionRationale,decisionOwner:input.decisionOwner,nextStep:input.nextStep,decidedAt:input.decision==='UNDECIDED'?null:new Date()}});if(result.count!==1)throw new Error('OPPORTUNITY_NOT_FOUND')}

export async function getPilotProposalByOpportunity(auditId:string,processId:string,opportunityId:string){return prisma.auditPilotProposal.findFirst({where:{opportunityId,opportunity:{id:opportunityId,auditId,processId,process:{auditId}}},include:{opportunity:{select:{id:true,title:true,problem:true,proposedOutcome:true,decision:true,strategicFit:true,status:true,process:{select:{id:true,name:true}},scoreSnapshot:true,assessment:true,scoredAt:true}}}})}
export async function createPilotProposal(input:{auditId:string;processId:string;opportunityId:string;title:string;objective:string}){return prisma.$transaction(async tx=>{const opportunity=await tx.automationOpportunity.findFirst({where:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,decision:'PROCEED_TO_PILOT',process:{auditId:input.auditId}},select:{id:true,title:true,problem:true,proposedOutcome:true,expectedFutureState:true}});if(!opportunity)throw new Error('PILOT_ELIGIBILITY_FAILED');const existing=await tx.auditPilotProposal.findUnique({where:{opportunityId:input.opportunityId},select:{id:true}});if(existing)throw new Error('PILOT_PROPOSAL_EXISTS');return tx.auditPilotProposal.create({data:{opportunityId:opportunity.id,title:input.title,objective:input.objective,problem:opportunity.problem,targetBusinessOutcome:opportunity.proposedOutcome??opportunity.expectedFutureState,status:'DRAFT'}})})}
export async function updatePilotProposal(input:{auditId:string;processId:string;opportunityId:string;pilotId:string;title:string;objective:string;problem:string;scope:string|null;outOfScope:string|null;successCriteria:string|null;successMetrics:Prisma.InputJsonValue|null;targetBusinessOutcome:string|null;duration:string|null;owner:string|null;dependencies:string|null;risks:string|null;priceCents:number|null;currency:string|null;commercialNotes:string|null;status:PilotProposalStatus}){const result=await prisma.auditPilotProposal.updateMany({where:{id:input.pilotId,opportunityId:input.opportunityId,opportunity:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}},data:{title:input.title,objective:input.objective,problem:input.problem,scope:input.scope,outOfScope:input.outOfScope,successCriteria:input.successCriteria,successMetrics:input.successMetrics??undefined,targetBusinessOutcome:input.targetBusinessOutcome,duration:input.duration,owner:input.owner,dependencies:input.dependencies,risks:input.risks,priceCents:input.priceCents,currency:input.currency,commercialNotes:input.commercialNotes,status:input.status}});if(result.count!==1)throw new Error('PILOT_NOT_FOUND')}
export async function transitionPilotProposal(input:{auditId:string;processId:string;opportunityId:string;pilotId:string;target:PilotProposalStatus;actor?:string|null;rejectionReason?:string|null}){return prisma.$transaction(async tx=>{const pilot=await tx.auditPilotProposal.findFirst({where:{id:input.pilotId,opportunityId:input.opportunityId,opportunity:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}}});if(!pilot)throw new Error('PILOT_NOT_FOUND');if(!canTransitionPilotStatus(pilot.status,input.target))throw new Error('PILOT_INVALID_TRANSITION');if(input.target==='PROPOSED'){const missing=pilotCompleteness({title:pilot.title,objective:pilot.objective,scope:pilot.scope,successCriteria:pilot.successCriteria,successMetrics:pilot.successMetrics});if(missing.length)throw new Error(`PILOT_INCOMPLETE:${missing.join(', ')}`)}if(input.target==='REJECTED'&&!input.rejectionReason?.trim())throw new Error('PILOT_REJECTION_REASON_REQUIRED');const now=new Date();const data:{status:PilotProposalStatus;proposedAt?:Date;acceptedAt?:Date;acceptedBy?:string|null;rejectedAt?:Date;rejectionReason?:string;convertedAt?:Date}={status:input.target};if(input.target==='PROPOSED')data.proposedAt=now;if(input.target==='ACCEPTED'){data.acceptedAt=now;data.acceptedBy=input.actor??null}if(input.target==='REJECTED'){data.rejectedAt=now;data.rejectionReason=input.rejectionReason!.trim()}await tx.auditPilotProposal.update({where:{id:pilot.id},data});if(input.target==='PROPOSED')await tx.automationOpportunity.update({where:{id:input.opportunityId},data:{status:'PILOT_PROPOSED'}});if(input.target==='ACCEPTED')await tx.automationOpportunity.update({where:{id:input.opportunityId},data:{status:'PILOT_ACCEPTED'}});return data.status})}
export async function convertPilotProposalToProject(input:{auditId:string;processId:string;opportunityId:string;pilotId:string;projectName?:string}){return prisma.$transaction(async tx=>{const pilot=await tx.auditPilotProposal.findFirst({where:{id:input.pilotId,opportunityId:input.opportunityId,opportunity:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}},include:{opportunity:{include:{audit:{select:{lead:{select:{id:true,company:true}}}}}}}});if(!pilot)throw new Error('PILOT_NOT_FOUND');if(pilot.status!=='ACCEPTED')throw new Error('PILOT_NOT_ACCEPTED');if(pilot.projectId)return tx.project.findUnique({where:{id:pilot.projectId}});const description=[pilot.objective,pilot.scope?`Scope:\n${pilot.scope}`:null,pilot.successCriteria?`Success criteria:\n${pilot.successCriteria}`:null,pilot.targetBusinessOutcome?`Expected outcome:\n${pilot.targetBusinessOutcome}`:null].filter(Boolean).join('\n\n');const project=await tx.project.create({data:{name:input.projectName?.trim()||pilot.title||`${pilot.opportunity.title??'Opportunity'} — Pilot`,clientName:pilot.opportunity.audit.lead.company,description,contractedValueCents:pilot.priceCents??0,currency:pilot.currency??'EUR',growthPhase:'LAUNCH',status:'PLANNED',leadId:pilot.opportunity.audit.lead.id}});await tx.auditPilotProposal.update({where:{id:pilot.id},data:{projectId:project.id,status:'CONVERTED_TO_PROJECT',convertedAt:new Date()}});return project})}
export async function getPilotOutcome(input:{auditId:string;processId:string;opportunityId:string;pilotId:string}){return prisma.auditPilotOutcome.findFirst({where:{pilotId:input.pilotId,pilot:{id:input.pilotId,opportunityId:input.opportunityId,opportunity:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}}},include:{metrics:{include:{baseline:true},orderBy:{createdAt:'asc'}},pilot:{select:{id:true,status:true,projectId:true,title:true,objective:true,successCriteria:true,successMetrics:true,targetBusinessOutcome:true,opportunity:{select:{title:true}}}}}})}
export async function initializePilotOutcome(input:{auditId:string;processId:string;opportunityId:string;pilotId:string}){return prisma.$transaction(async tx=>{const pilot=await tx.auditPilotProposal.findFirst({where:{id:input.pilotId,projectId:{not:null},status:'CONVERTED_TO_PROJECT',opportunityId:input.opportunityId,opportunity:{auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}},select:{id:true,successMetrics:true}});if(!pilot)throw new Error('OUTCOME_NOT_ELIGIBLE');const existing=await tx.auditPilotOutcome.findUnique({where:{pilotId:pilot.id},include:{metrics:true}});if(existing)return existing;const outcome=await tx.auditPilotOutcome.create({data:{pilotId:pilot.id,metrics:{create:(Array.isArray(pilot.successMetrics)?pilot.successMetrics:[]).map((label)=>({label:String(label)}))}},include:{metrics:true}});return outcome})}
export async function updatePilotOutcome(input:{auditId:string;processId:string;opportunityId:string;pilotId:string;outcomeId:string;summary:string|null;keyLearnings:string|null;issuesEncountered:string|null;successAssessment:'NOT_EVALUATED'|'MET'|'PARTIALLY_MET'|'NOT_MET';successAssessmentNote:string|null;conclusion:string|null;nextStep:string|null}){const result=await prisma.auditPilotOutcome.updateMany({where:{id:input.outcomeId,pilotId:input.pilotId,pilot:{id:input.pilotId,opportunityId:input.opportunityId,opportunity:{auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}},status:'IN_PROGRESS'},data:{summary:input.summary,keyLearnings:input.keyLearnings,issuesEncountered:input.issuesEncountered,successAssessment:input.successAssessment,successAssessmentNote:input.successAssessmentNote,conclusion:input.conclusion,nextStep:input.nextStep}});if(result.count!==1)throw new Error('OUTCOME_NOT_FOUND')}
export async function completePilotOutcome(input:{auditId:string;processId:string;opportunityId:string;pilotId:string;outcomeId:string}){return prisma.$transaction(async tx=>{const outcome=await tx.auditPilotOutcome.findFirst({where:{id:input.outcomeId,pilotId:input.pilotId,pilot:{id:input.pilotId,opportunityId:input.opportunityId,opportunity:{auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}},status:'IN_PROGRESS'},include:{metrics:true}});if(!outcome)throw new Error('OUTCOME_NOT_FOUND');if(outcome.successAssessment==='NOT_EVALUATED'||!outcome.summary?.trim()||!outcome.conclusion?.trim()||(!outcome.metrics.length&&outcome.pilotId))throw new Error('OUTCOME_INCOMPLETE');return tx.auditPilotOutcome.update({where:{id:outcome.id},data:{status:'COMPLETED',completedAt:new Date()}})})}
export async function upsertPilotMetric(input:{auditId:string;processId:string;opportunityId:string;pilotId:string;outcomeId:string;metricId?:string;label:string;baselineId?:string|null;targetValue?:number|null;actualValue?:number|null;unit?:string|null;period?:string|null;evidenceQuality:'UNKNOWN'|'ESTIMATED'|'MEASURED';source?:string|null;reference?:string|null;note?:string|null;measuredAt?:Date|null}){return prisma.$transaction(async tx=>{const outcome=await tx.auditPilotOutcome.findFirst({where:{id:input.outcomeId,pilotId:input.pilotId,status:'IN_PROGRESS',pilot:{opportunityId:input.opportunityId,opportunity:{auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}}},select:{id:true}});if(!outcome)throw new Error('OUTCOME_NOT_FOUND');if(input.baselineId&&!await tx.auditBaselineMetric.findFirst({where:{id:input.baselineId,processId:input.processId,process:{auditId:input.auditId}}}))throw new Error('BASELINE_SCOPE_MISMATCH');const data={label:input.label.trim(),baselineId:input.baselineId??null,targetValue:input.targetValue??null,actualValue:input.actualValue??null,unit:input.unit??null,period:input.period??null,evidenceQuality:input.evidenceQuality,source:input.source??null,reference:input.reference??null,note:input.note??null,measuredAt:input.measuredAt??null};if(input.metricId)return tx.auditPilotMetricResult.update({where:{id:input.metricId,outcomeId:outcome.id},data});return tx.auditPilotMetricResult.create({data:{...data,outcomeId:outcome.id}})})}
export async function getPilotEconomics(input:{auditId:string;processId:string;opportunityId:string;pilotId:string;outcomeId:string}){return prisma.auditPilotEconomics.findFirst({where:{outcomeId:input.outcomeId,outcome:{id:input.outcomeId,status:'COMPLETED',pilotId:input.pilotId,pilot:{id:input.pilotId,status:'CONVERTED_TO_PROJECT',opportunity:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}}}},include:{timeSavingsMetric:true}})}
export async function initializePilotEconomics(input:{auditId:string;processId:string;opportunityId:string;pilotId:string;outcomeId:string}){return prisma.$transaction(async tx=>{const outcome=await tx.auditPilotOutcome.findFirst({where:{id:input.outcomeId,pilotId:input.pilotId,status:'COMPLETED',pilot:{id:input.pilotId,status:'CONVERTED_TO_PROJECT',opportunity:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}}},include:{pilot:{select:{priceCents:true,currency:true}}}});if(!outcome)throw new Error('ECONOMICS_NOT_ELIGIBLE');const existing=await tx.auditPilotEconomics.findUnique({where:{outcomeId:outcome.id},include:{timeSavingsMetric:true}});if(existing)return existing;return tx.auditPilotEconomics.create({data:{outcomeId:outcome.id,investmentCostCents:outcome.pilot.priceCents,currency:outcome.pilot.currency??'EUR'},include:{timeSavingsMetric:true}})})}
export async function updatePilotEconomics(input:{auditId:string;processId:string;opportunityId:string;pilotId:string;outcomeId:string;timeSavingsMetricId:string|null;laborCostPerHourCents:number|null;laborCostQuality:EvidenceQuality;laborCostSource:string|null;laborCostNote:string|null;directMonthlySavingsCents:number|null;directSavingsQuality:EvidenceQuality;otherMonthlySavingsCents:number|null;ongoingMonthlyCostCents:number|null;investmentCostCents:number|null;currency:string;notes:string|null}){return prisma.$transaction(async tx=>{const economics=await tx.auditPilotEconomics.findFirst({where:{outcomeId:input.outcomeId,outcome:{id:input.outcomeId,pilotId:input.pilotId,status:'COMPLETED',pilot:{id:input.pilotId,status:'CONVERTED_TO_PROJECT',opportunity:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}}}}},select:{id:true}});if(!economics)throw new Error('ECONOMICS_NOT_FOUND');if(input.timeSavingsMetricId&&!await tx.auditPilotMetricResult.findFirst({where:{id:input.timeSavingsMetricId,outcomeId:input.outcomeId}}))throw new Error('TIME_METRIC_SCOPE_MISMATCH');return tx.auditPilotEconomics.update({where:{id:economics.id},data:{timeSavingsMetricId:input.timeSavingsMetricId,laborCostPerHourCents:input.laborCostPerHourCents,laborCostQuality:input.laborCostQuality,laborCostSource:input.laborCostSource,laborCostNote:input.laborCostNote,directMonthlySavingsCents:input.directMonthlySavingsCents,directSavingsQuality:input.directSavingsQuality,otherMonthlySavingsCents:input.otherMonthlySavingsCents,ongoingMonthlyCostCents:input.ongoingMonthlyCostCents,investmentCostCents:input.investmentCostCents,currency:input.currency.trim().toUpperCase()||'EUR',notes:input.notes}})})}
export async function getAutomationOpportunityById(auditId:string,processId:string,opportunityId:string){return prisma.automationOpportunity.findFirst({where:{id:opportunityId,auditId,processId,process:{auditId}},include:{audit:{select:{id:true,name:true}},process:{select:{id:true,name:true,bottlenecks:{include:{task:{select:{id:true,name:true,sequence:true}}},orderBy:{createdAt:'desc'}},baselines:{orderBy:{createdAt:'desc'}},systems:{include:{system:true},orderBy:{system:{name:'asc'}}},dataSources:{include:{dataSource:{include:{system:{select:{id:true,name:true}}}}},orderBy:{dataSource:{name:'asc'}}}}},bottleneckLinks:{include:{bottleneck:{include:{task:{select:{id:true,name:true,sequence:true}}}}},orderBy:{createdAt:'asc'}},baselineLinks:{include:{baseline:true},orderBy:{createdAt:'asc'}}}})}
async function assertOpportunityScope(tx:Prisma.TransactionClient,input:{auditId:string;processId:string;opportunityId:string}){const opportunity=await tx.automationOpportunity.findFirst({where:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}},select:{id:true}});if(!opportunity)throw new Error('OPPORTUNITY_NOT_FOUND')}
export async function linkBottleneckToOpportunity(input:{auditId:string;processId:string;opportunityId:string;bottleneckId:string}){return prisma.$transaction(async tx=>{await assertOpportunityScope(tx,input);const evidence=await tx.auditBottleneck.findFirst({where:{id:input.bottleneckId,processId:input.processId,process:{auditId:input.auditId}},select:{id:true}});if(!evidence)throw new Error('EVIDENCE_SCOPE_MISMATCH');return tx.opportunityBottleneck.upsert({where:{opportunityId_bottleneckId:{opportunityId:input.opportunityId,bottleneckId:input.bottleneckId}},create:{opportunityId:input.opportunityId,bottleneckId:input.bottleneckId},update:{}})})}
export async function unlinkBottleneckFromOpportunity(input:{auditId:string;processId:string;opportunityId:string;bottleneckId:string}){return prisma.$transaction(async tx=>{await assertOpportunityScope(tx,input);const result=await tx.opportunityBottleneck.deleteMany({where:{opportunityId:input.opportunityId,bottleneckId:input.bottleneckId,bottleneck:{processId:input.processId,process:{auditId:input.auditId}}}});if(result.count!==1)throw new Error('LINK_NOT_FOUND')})}
export async function linkBaselineToOpportunity(input:{auditId:string;processId:string;opportunityId:string;baselineId:string}){return prisma.$transaction(async tx=>{await assertOpportunityScope(tx,input);const evidence=await tx.auditBaselineMetric.findFirst({where:{id:input.baselineId,processId:input.processId,process:{auditId:input.auditId}},select:{id:true}});if(!evidence)throw new Error('EVIDENCE_SCOPE_MISMATCH');return tx.opportunityBaselineMetric.upsert({where:{opportunityId_baselineId:{opportunityId:input.opportunityId,baselineId:input.baselineId}},create:{opportunityId:input.opportunityId,baselineId:input.baselineId},update:{}})})}
export async function unlinkBaselineFromOpportunity(input:{auditId:string;processId:string;opportunityId:string;baselineId:string}){return prisma.$transaction(async tx=>{await assertOpportunityScope(tx,input);const result=await tx.opportunityBaselineMetric.deleteMany({where:{opportunityId:input.opportunityId,baselineId:input.baselineId,baseline:{processId:input.processId,process:{auditId:input.auditId}}}});if(result.count!==1)throw new Error('LINK_NOT_FOUND')})}

export type BaselineInput={auditId:string;processId:string;label:string;numericValue?:string|null;textValue?:string|null;unit?:string|null;period?:string|null;evidenceQuality:EvidenceQuality;source?:string|null;evidence?:string|null;evidenceReference?:string|null;notes?:string|null;observedAt?:Date|null};
export async function createBaselineMetric(input:BaselineInput){const process=await prisma.operationsProcess.findFirst({where:{id:input.processId,auditId:input.auditId}});if(!process)throw new Error('PROCESS_NOT_FOUND');return prisma.auditBaselineMetric.create({data:baselineData(input)})}
export async function updateBaselineMetric(input:BaselineInput&{metricId:string}){const result=await prisma.auditBaselineMetric.updateMany({where:{id:input.metricId,processId:input.processId,process:{auditId:input.auditId}},data:baselineData(input)});if(result.count!==1)throw new Error('BASELINE_NOT_FOUND')}
export async function deleteBaselineMetric(input:{auditId:string;processId:string;metricId:string}){const result=await prisma.auditBaselineMetric.deleteMany({where:{id:input.metricId,processId:input.processId,process:{auditId:input.auditId}}});if(result.count!==1)throw new Error('BASELINE_NOT_FOUND')}
function baselineData(input:BaselineInput){return{processId:input.processId,metricKey:input.label.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'metric',label:input.label.trim(),numericValue:input.numericValue??null,textValue:input.textValue??null,unit:input.unit??null,period:input.period??null,evidenceQuality:input.evidenceQuality,source:input.source??null,evidence:input.evidence??null,evidenceReference:input.evidenceReference??null,notes:input.notes??null,observedAt:input.observedAt??null}}

export type AuditBottleneckInput = { auditId:string;processId:string;taskId?:string|null;description:string;category:BottleneckCategory;timeImpact?:string|null;costImpactCents?:number|null;errorImpact?:string|null;revenueImpact?:string|null;customerImpact?:string|null;evidence?:string|null;evidenceQuality:EvidenceQuality;source?:string|null;evidenceReference?:string|null;capturedAt?:Date|null };
export async function createAuditBottleneck(input:AuditBottleneckInput){return prisma.$transaction(async tx=>{await assertBottleneckScope(tx,input);return tx.auditBottleneck.create({data:bottleneckData(input)})})}
export async function updateAuditBottleneck(input:AuditBottleneckInput&{bottleneckId:string}){return prisma.$transaction(async tx=>{const current=await tx.auditBottleneck.findFirst({where:{id:input.bottleneckId,processId:input.processId,process:{auditId:input.auditId}}});if(!current)throw new Error('BOTTLENECK_NOT_FOUND');await assertBottleneckScope(tx,input);return tx.auditBottleneck.update({where:{id:input.bottleneckId},data:bottleneckData(input)})})}
export async function deleteAuditBottleneck(input:{auditId:string;processId:string;bottleneckId:string}){const result=await prisma.auditBottleneck.deleteMany({where:{id:input.bottleneckId,processId:input.processId,process:{auditId:input.auditId}}});if(result.count!==1)throw new Error('BOTTLENECK_NOT_FOUND')}
function bottleneckData(input:AuditBottleneckInput){return{processId:input.processId,taskId:input.taskId??null,description:input.description.trim(),category:input.category,timeImpact:input.timeImpact??null,costImpactCents:input.costImpactCents??null,errorImpact:input.errorImpact??null,revenueImpact:input.revenueImpact??null,customerImpact:input.customerImpact??null,evidence:input.evidence??null,evidenceQuality:input.evidenceQuality,source:input.source??null,evidenceReference:input.evidenceReference??null,capturedAt:input.capturedAt??null}}
async function assertBottleneckScope(tx:TransactionClient,input:{auditId:string;processId:string;taskId?:string|null}){const process=await tx.operationsProcess.findFirst({where:{id:input.processId,auditId:input.auditId}});if(!process)throw new Error('PROCESS_NOT_FOUND');if(input.taskId&&!await tx.operationsTask.findFirst({where:{id:input.taskId,processId:input.processId,process:{auditId:input.auditId}}}))throw new Error('BOTTLENECK_TASK_SCOPE_MISMATCH')}

export type AuditStakeholderInput = { auditId: string; name: string; role?: string | null; department?: string | null; seniority?: string | null; responsibilities?: string | null; interviewStatus?: StakeholderInterviewStatus; notes?: string | null };
export async function createAuditStakeholder(input: AuditStakeholderInput) {
  const audit = await prisma.operationsAudit.findUnique({ where: { id: input.auditId }, select: { id: true } }); if (!audit) throw new Error('AUDIT_NOT_FOUND');
  const duplicate = await prisma.auditStakeholder.findFirst({ where: { auditId: input.auditId, name: { equals: input.name.trim(), mode: 'insensitive' } }, select: { id: true } });
  const stakeholder = await prisma.auditStakeholder.create({ data: stakeholderData(input) }); return { stakeholder, duplicateName: Boolean(duplicate) };
}
export async function updateAuditStakeholder(input: AuditStakeholderInput & { stakeholderId: string }) {
  const result = await prisma.auditStakeholder.updateMany({ where: { id: input.stakeholderId, auditId: input.auditId }, data: stakeholderData(input) }); if (result.count !== 1) throw new Error('STAKEHOLDER_NOT_FOUND');
}
export async function deleteAuditStakeholder(input: { auditId: string; stakeholderId: string }) {
  return prisma.$transaction(async (tx) => {
    const stakeholder = await tx.auditStakeholder.findFirst({ where: { id: input.stakeholderId, auditId: input.auditId }, select: { id: true, _count: { select: { ownedProcesses: true, processLinks: true, tasks: true } } } });
    if (!stakeholder) throw new Error('STAKEHOLDER_NOT_FOUND'); if (stakeholder._count.ownedProcesses || stakeholder._count.processLinks || stakeholder._count.tasks) throw new Error('STAKEHOLDER_IN_USE');
    await tx.auditStakeholder.delete({ where: { id: stakeholder.id } });
  });
}
export async function setProcessOwnerStakeholder(input: { auditId: string; processId: string; stakeholderId: string | null }) {
  return prisma.$transaction(async (tx) => { if (input.stakeholderId) await assertProcessStakeholderScope(tx, { ...input, stakeholderId: input.stakeholderId }); else if (!await tx.operationsProcess.findFirst({ where: { id: input.processId, auditId: input.auditId } })) throw new Error('PROCESS_NOT_FOUND'); await tx.operationsProcess.update({ where: { id: input.processId }, data: { ownerStakeholderId: input.stakeholderId } }); });
}
export async function linkStakeholderToProcess(input: { auditId: string; processId: string; stakeholderId: string }) {
  return prisma.$transaction(async (tx) => { await assertProcessStakeholderScope(tx, input); await tx.processStakeholder.upsert({ where: { processId_stakeholderId: { processId: input.processId, stakeholderId: input.stakeholderId } }, create: { processId: input.processId, stakeholderId: input.stakeholderId }, update: {} }); });
}
export async function createAndLinkStakeholderToProcess(input: AuditStakeholderInput & { processId: string }) {
  return prisma.$transaction(async (tx) => { const process = await tx.operationsProcess.findFirst({ where: { id: input.processId, auditId: input.auditId } }); if (!process) throw new Error('PROCESS_NOT_FOUND'); const stakeholder = await tx.auditStakeholder.create({ data: stakeholderData(input) }); await tx.processStakeholder.create({ data: { processId: input.processId, stakeholderId: stakeholder.id } }); return stakeholder; });
}
export async function unlinkStakeholderFromProcess(input: { auditId: string; processId: string; stakeholderId: string }) {
  const result = await prisma.processStakeholder.deleteMany({ where: { processId: input.processId, stakeholderId: input.stakeholderId, process: { auditId: input.auditId }, stakeholder: { auditId: input.auditId } } }); if (result.count !== 1) throw new Error('PROCESS_STAKEHOLDER_NOT_FOUND');
}
export async function setTaskStakeholder(input: { auditId: string; processId: string; taskId: string; stakeholderId: string | null }) {
  return prisma.$transaction(async (tx) => { const task = await tx.operationsTask.findFirst({ where: { id: input.taskId, processId: input.processId, process: { auditId: input.auditId } } }); if (!task) throw new Error('TASK_NOT_FOUND'); if (input.stakeholderId && !await tx.auditStakeholder.findFirst({ where: { id: input.stakeholderId, auditId: input.auditId } })) throw new Error('TASK_STAKEHOLDER_SCOPE_MISMATCH'); await tx.operationsTask.update({ where: { id: input.taskId }, data: { stakeholderId: input.stakeholderId } }); });
}
function stakeholderData(input: AuditStakeholderInput) { return { auditId: input.auditId, name: input.name.trim(), role: input.role ?? null, department: input.department ?? null, seniority: input.seniority ?? null, responsibilities: input.responsibilities ?? null, interviewStatus: input.interviewStatus ?? 'NOT_PLANNED' as StakeholderInterviewStatus, notes: input.notes ?? null }; }
async function assertProcessStakeholderScope(tx: TransactionClient, input: { auditId: string; processId: string; stakeholderId: string }) { const [process, stakeholder] = await Promise.all([tx.operationsProcess.findFirst({ where: { id: input.processId, auditId: input.auditId } }), tx.auditStakeholder.findFirst({ where: { id: input.stakeholderId, auditId: input.auditId } })]); if (!process || !stakeholder) throw new Error('PROCESS_STAKEHOLDER_SCOPE_MISMATCH'); }

export type AuditSystemInput = {
  auditId: string; name: string; category?: string | null; vendor?: string | null; purpose?: string | null;
  apiAvailable?: EvidenceAnswer; exportAvailable?: EvidenceAnswer;
  integrationDifficulty?: IntegrationDifficulty | null; dataOwner?: string | null; notes?: string | null;
};

export async function createAuditSystem(input: AuditSystemInput) {
  return prisma.$transaction(async (tx) => {
    const audit = await tx.operationsAudit.findUnique({ where: { id: input.auditId }, select: { id: true } });
    if (!audit) throw new Error('AUDIT_NOT_FOUND');
    const duplicate = await findSystemByName(tx, input.auditId, input.name);
    if (duplicate) throw new Error('SYSTEM_DUPLICATE');
    return tx.auditSystem.create({ data: systemData(input) });
  });
}

export async function updateAuditSystem(input: AuditSystemInput & { systemId: string }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.auditSystem.findFirst({ where: { id: input.systemId, auditId: input.auditId }, select: { id: true } });
    if (!current) throw new Error('SYSTEM_NOT_FOUND');
    const duplicate = await findSystemByName(tx, input.auditId, input.name, input.systemId);
    if (duplicate) throw new Error('SYSTEM_DUPLICATE');
    return tx.auditSystem.update({ where: { id: input.systemId }, data: systemData(input) });
  });
}

export async function deleteAuditSystem(input: { auditId: string; systemId: string }) {
  return prisma.$transaction(async (tx) => {
    const system = await tx.auditSystem.findFirst({
      where: { id: input.systemId, auditId: input.auditId },
      select: { id: true, _count: { select: { dataSources: true, processes: true, tasks: true } } },
    });
    if (!system) throw new Error('SYSTEM_NOT_FOUND');
    if (system._count.processes || system._count.tasks || system._count.dataSources) throw new Error('SYSTEM_IN_USE');
    await tx.auditSystem.delete({ where: { id: system.id } });
  });
}

export async function linkSystemToProcess(input: { auditId: string; processId: string; systemId: string }) {
  return prisma.$transaction(async (tx) => {
    await assertProcessAndSystemScope(tx, input);
    await tx.processSystem.upsert({
      where: { processId_systemId: { processId: input.processId, systemId: input.systemId } },
      create: { processId: input.processId, systemId: input.systemId }, update: {},
    });
  });
}

export async function createAndLinkSystemToProcess(input: AuditSystemInput & { processId: string }) {
  return prisma.$transaction(async (tx) => {
    const process = await tx.operationsProcess.findFirst({ where: { id: input.processId, auditId: input.auditId }, select: { id: true } });
    if (!process) throw new Error('PROCESS_NOT_FOUND');
    const existing = await findSystemByName(tx, input.auditId, input.name);
    const system = existing ?? await tx.auditSystem.create({ data: systemData(input) });
    await tx.processSystem.upsert({
      where: { processId_systemId: { processId: input.processId, systemId: system.id } },
      create: { processId: input.processId, systemId: system.id }, update: {},
    });
    return system;
  });
}

export async function unlinkSystemFromProcess(input: { auditId: string; processId: string; systemId: string }) {
  const result = await prisma.processSystem.deleteMany({
    where: { processId: input.processId, systemId: input.systemId, process: { auditId: input.auditId }, system: { auditId: input.auditId } },
  });
  if (result.count !== 1) throw new Error('PROCESS_SYSTEM_NOT_FOUND');
}

export async function linkSystemToTask(input: { auditId: string; processId: string; taskId: string; systemId: string }) {
  return prisma.$transaction(async (tx) => {
    const [task, system] = await Promise.all([
      tx.operationsTask.findFirst({ where: { id: input.taskId, processId: input.processId, process: { auditId: input.auditId } }, select: { id: true } }),
      tx.auditSystem.findFirst({ where: { id: input.systemId, auditId: input.auditId }, select: { id: true } }),
    ]);
    if (!task || !system) throw new Error('TASK_SYSTEM_SCOPE_MISMATCH');
    await tx.taskSystem.upsert({
      where: { taskId_systemId: { taskId: input.taskId, systemId: input.systemId } },
      create: { taskId: input.taskId, systemId: input.systemId }, update: {},
    });
  });
}

export async function unlinkSystemFromTask(input: { auditId: string; processId: string; taskId: string; systemId: string }) {
  const result = await prisma.taskSystem.deleteMany({
    where: { taskId: input.taskId, systemId: input.systemId, task: { processId: input.processId, process: { auditId: input.auditId } }, system: { auditId: input.auditId } },
  });
  if (result.count !== 1) throw new Error('TASK_SYSTEM_NOT_FOUND');
}

type TransactionClient = Prisma.TransactionClient;
async function findSystemByName(tx: TransactionClient, auditId: string, name: string, excludeId?: string) {
  return tx.auditSystem.findFirst({ where: { auditId, name: { equals: name.trim(), mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true, name: true } });
}
function systemData(input: AuditSystemInput) {
  return {
    auditId: input.auditId, name: input.name.trim(), category: input.category ?? null, vendor: input.vendor ?? null,
    purpose: input.purpose ?? null, apiAvailable: input.apiAvailable ?? 'UNKNOWN' as EvidenceAnswer,
    exportAvailable: input.exportAvailable ?? 'UNKNOWN' as EvidenceAnswer,
    integrationDifficulty: input.integrationDifficulty ?? 'UNKNOWN' as IntegrationDifficulty,
    dataOwner: input.dataOwner ?? null, notes: input.notes ?? null,
  };
}
async function assertProcessAndSystemScope(tx: TransactionClient, input: { auditId: string; processId: string; systemId: string }) {
  const [process, system] = await Promise.all([
    tx.operationsProcess.findFirst({ where: { id: input.processId, auditId: input.auditId }, select: { id: true } }),
    tx.auditSystem.findFirst({ where: { id: input.systemId, auditId: input.auditId }, select: { id: true } }),
  ]);
  if (!process || !system) throw new Error('PROCESS_SYSTEM_SCOPE_MISMATCH');
}

export type AuditDataSourceInput = {
  auditId: string; name: string; type?: string | null; description?: string | null;
  structure?: DataStructureType; accessibility?: string | null; quality?: number | null;
  sensitivity?: DataSensitivity; updateFrequency?: string | null; systemId?: string | null; notes?: string | null;
};

export async function createAuditDataSource(input: AuditDataSourceInput) {
  return prisma.$transaction(async (tx) => {
    const audit = await tx.operationsAudit.findUnique({ where: { id: input.auditId }, select: { id: true } });
    if (!audit) throw new Error('AUDIT_NOT_FOUND');
    if (await findDataSourceByName(tx, input.auditId, input.name)) throw new Error('DATA_SOURCE_DUPLICATE');
    await assertOptionalDataSourceSystemScope(tx, input.auditId, input.systemId);
    return tx.auditDataSource.create({ data: dataSourceData(input) });
  });
}

export async function updateAuditDataSource(input: AuditDataSourceInput & { dataSourceId: string }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.auditDataSource.findFirst({ where: { id: input.dataSourceId, auditId: input.auditId }, select: { id: true } });
    if (!current) throw new Error('DATA_SOURCE_NOT_FOUND');
    if (await findDataSourceByName(tx, input.auditId, input.name, input.dataSourceId)) throw new Error('DATA_SOURCE_DUPLICATE');
    await assertOptionalDataSourceSystemScope(tx, input.auditId, input.systemId);
    return tx.auditDataSource.update({ where: { id: input.dataSourceId }, data: dataSourceData(input) });
  });
}

export async function deleteAuditDataSource(input: { auditId: string; dataSourceId: string }) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.auditDataSource.findFirst({ where: { id: input.dataSourceId, auditId: input.auditId }, select: { id: true, _count: { select: { processes: true } } } });
    if (!source) throw new Error('DATA_SOURCE_NOT_FOUND');
    if (source._count.processes) throw new Error('DATA_SOURCE_IN_USE');
    await tx.auditDataSource.delete({ where: { id: source.id } });
  });
}

export async function linkDataSourceToProcess(input: { auditId: string; processId: string; dataSourceId: string }) {
  return prisma.$transaction(async (tx) => {
    await assertProcessAndDataSourceScope(tx, input);
    await tx.processDataSource.upsert({
      where: { processId_dataSourceId: { processId: input.processId, dataSourceId: input.dataSourceId } },
      create: { processId: input.processId, dataSourceId: input.dataSourceId }, update: {},
    });
  });
}

export async function createAndLinkDataSourceToProcess(input: AuditDataSourceInput & { processId: string }) {
  return prisma.$transaction(async (tx) => {
    const process = await tx.operationsProcess.findFirst({ where: { id: input.processId, auditId: input.auditId }, select: { id: true } });
    if (!process) throw new Error('PROCESS_NOT_FOUND');
    await assertOptionalDataSourceSystemScope(tx, input.auditId, input.systemId);
    const existing = await findDataSourceByName(tx, input.auditId, input.name);
    const source = existing ?? await tx.auditDataSource.create({ data: dataSourceData(input) });
    await tx.processDataSource.upsert({
      where: { processId_dataSourceId: { processId: input.processId, dataSourceId: source.id } },
      create: { processId: input.processId, dataSourceId: source.id }, update: {},
    });
    return source;
  });
}

export async function unlinkDataSourceFromProcess(input: { auditId: string; processId: string; dataSourceId: string }) {
  const result = await prisma.processDataSource.deleteMany({
    where: { processId: input.processId, dataSourceId: input.dataSourceId, process: { auditId: input.auditId }, dataSource: { auditId: input.auditId } },
  });
  if (result.count !== 1) throw new Error('PROCESS_DATA_SOURCE_NOT_FOUND');
}

async function findDataSourceByName(tx: TransactionClient, auditId: string, name: string, excludeId?: string) {
  return tx.auditDataSource.findFirst({ where: { auditId, name: { equals: name.trim(), mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true, name: true } });
}
function dataSourceData(input: AuditDataSourceInput) {
  return {
    auditId: input.auditId, systemId: input.systemId ?? null, name: input.name.trim(), type: input.type ?? null,
    description: input.description ?? null, structure: input.structure ?? 'UNKNOWN' as DataStructureType,
    accessibility: input.accessibility ?? null, quality: input.quality ?? null,
    sensitivity: input.sensitivity ?? 'UNKNOWN' as DataSensitivity, updateFrequency: input.updateFrequency ?? null, notes: input.notes ?? null,
  };
}
async function assertOptionalDataSourceSystemScope(tx: TransactionClient, auditId: string, systemId?: string | null) {
  if (!systemId) return;
  const system = await tx.auditSystem.findFirst({ where: { id: systemId, auditId }, select: { id: true } });
  if (!system) throw new Error('DATA_SOURCE_SYSTEM_SCOPE_MISMATCH');
}
async function assertProcessAndDataSourceScope(tx: TransactionClient, input: { auditId: string; processId: string; dataSourceId: string }) {
  const [process, source] = await Promise.all([
    tx.operationsProcess.findFirst({ where: { id: input.processId, auditId: input.auditId }, select: { id: true } }),
    tx.auditDataSource.findFirst({ where: { id: input.dataSourceId, auditId: input.auditId }, select: { id: true } }),
  ]);
  if (!process || !source) throw new Error('PROCESS_DATA_SOURCE_SCOPE_MISMATCH');
}

export async function createOperationsTask(input: { auditId: string; processId: string; name: string }) {
  return withOrderingRetry(() => prisma.$transaction(async (tx) => {
    const process = await tx.operationsProcess.findFirst({ where: { id: input.processId, auditId: input.auditId }, select: { id: true } });
    if (!process) throw new Error('PROCESS_NOT_FOUND');
    const last = await tx.operationsTask.findFirst({ where: { processId: input.processId }, orderBy: { sequence: 'desc' }, select: { sequence: true } });
    return tx.operationsTask.create({ data: { processId: input.processId, name: input.name, sequence: (last?.sequence ?? 0) + 1 } });
  }, { isolationLevel: 'Serializable' }));
}

export async function updateOperationsTask(input: {
  auditId: string; processId: string; taskId: string; name: string; description?: string | null;
  actor?: string | null; executionMode: TaskExecutionMode; averageTimeMinutes?: number | null;
  frequency?: string | null; input?: string | null; output?: string | null;
  decisionRequired: boolean; exceptionFrequency?: string | null;
}) {
  const result = await prisma.operationsTask.updateMany({
    where: { id: input.taskId, processId: input.processId, process: { auditId: input.auditId } },
    data: {
      name: input.name, description: input.description ?? null, actor: input.actor ?? null,
      executionMode: input.executionMode, averageTimeMinutes: input.averageTimeMinutes ?? null,
      frequency: input.frequency ?? null, input: input.input ?? null, output: input.output ?? null,
      decisionRequired: input.decisionRequired, exceptionFrequency: input.exceptionFrequency ?? null,
    },
  });
  if (result.count !== 1) throw new Error('TASK_NOT_FOUND');
}

export async function moveOperationsTask(input: { auditId: string; processId: string; taskId: string; direction: 'UP' | 'DOWN' }) {
  return withOrderingRetry(() => prisma.$transaction(async (tx) => {
    const tasks = await tx.operationsTask.findMany({
      where: { processId: input.processId, process: { auditId: input.auditId } },
      orderBy: { sequence: 'asc' }, select: { id: true, sequence: true },
    });
    const index = tasks.findIndex((task) => task.id === input.taskId);
    if (index < 0) throw new Error('TASK_NOT_FOUND');
    const targetIndex = input.direction === 'UP' ? index - 1 : index + 1;
    const target = tasks[targetIndex];
    if (!target) return false;
    const current = tasks[index];
    const sentinel = Math.min(...tasks.map((task) => task.sequence), 0) - 1;
    await tx.operationsTask.update({ where: { id: current.id }, data: { sequence: sentinel } });
    await tx.operationsTask.update({ where: { id: target.id }, data: { sequence: current.sequence } });
    await tx.operationsTask.update({ where: { id: current.id }, data: { sequence: target.sequence } });
    return true;
  }, { isolationLevel: 'Serializable' }));
}

export async function deleteOperationsTask(input: { auditId: string; processId: string; taskId: string }) {
  return withOrderingRetry(() => prisma.$transaction(async (tx) => {
    const task = await tx.operationsTask.findFirst({
      where: { id: input.taskId, processId: input.processId, process: { auditId: input.auditId } },
      select: { id: true, sequence: true },
    });
    if (!task) throw new Error('TASK_NOT_FOUND');
    await tx.operationsTask.delete({ where: { id: task.id } });
    const following = await tx.operationsTask.findMany({
      where: { processId: input.processId, sequence: { gt: task.sequence } },
      orderBy: { sequence: 'asc' }, select: { id: true, sequence: true },
    });
    for (const item of following) {
      await tx.operationsTask.update({ where: { id: item.id }, data: { sequence: item.sequence - 1 } });
    }
  }, { isolationLevel: 'Serializable' }));
}

async function withOrderingRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await operation(); } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as Prisma.PrismaClientKnownRequestError).code) : '';
      if ((code !== 'P2002' && code !== 'P2034') || attempt === 2) throw error;
    }
  }
  throw new Error('ORDERING_RETRY_EXHAUSTED');
}

export async function createOperationsProcess(input: {
  auditId: string;
  name: string;
  department?: string | null;
  trigger?: string | null;
  endState?: string | null;
  notes?: string | null;
}) {
  const audit = await prisma.operationsAudit.findUnique({ where: { id: input.auditId }, select: { id: true } });
  if (!audit) throw new Error('AUDIT_NOT_FOUND');

  return prisma.operationsProcess.create({
    data: {
      auditId: input.auditId,
      name: input.name,
      department: input.department ?? null,
      trigger: input.trigger ?? null,
      endState: input.endState ?? null,
      notes: input.notes ?? null,
    },
  });
}

export async function updateOperationsProcessOverview(input: {
  auditId: string;
  processId: string;
  name: string;
  department?: string | null;
  description?: string | null;
  trigger?: string | null;
  endState?: string | null;
  notes?: string | null;
}) {
  const result = await prisma.operationsProcess.updateMany({
    where: { id: input.processId, auditId: input.auditId },
    data: {
      name: input.name,
      department: input.department ?? null,
      description: input.description ?? null,
      trigger: input.trigger ?? null,
      endState: input.endState ?? null,
      notes: input.notes ?? null,
    },
  });
  if (result.count !== 1) throw new Error('PROCESS_NOT_FOUND');
}

export async function getAuditCompanyOptions() {
  return prisma.lead.findMany({
    orderBy: { company: 'asc' },
    select: { company: true, email: true, id: true },
  });
}

export function formatOperationsAuditStatus(status: string): string {
  return ({
    DRAFT: 'Rascunho', PLANNED: 'Planeada', IN_PROGRESS: 'Em curso', ANALYSIS: 'Em análise',
    COMPLETED: 'Concluída', ARCHIVED: 'Arquivada',
  } as Record<string, string>)[status] ?? status;
}

export function formatProcessMappingStatus(status: string): string {
  return ({ CAPTURED: 'Capturado', MAPPED: 'Mapeado', VALIDATED: 'Validado' } as Record<string, string>)[status] ?? status;
}
