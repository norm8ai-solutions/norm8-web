import 'server-only';

import type { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import { AUTOMATION_SCORE_KEY, type AutomationAssessment, assertValidScoringInputs, calculateAutomationScore, type ScoringModelConfig } from '@/lib/operations-audits/scoring';

export async function getActiveAutomationScoringModel(){return prisma.auditScoringModel.findFirst({where:{key:AUTOMATION_SCORE_KEY,isActive:true},orderBy:{version:'desc'}})}

export async function saveAutomationOpportunityEvaluation(input:{auditId:string;processId:string;opportunityId:string;scoringModelId:string;assessment:AutomationAssessment}){
  return prisma.$transaction(async tx=>{
    const opportunity=await tx.automationOpportunity.findFirst({where:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}},select:{id:true}});
    if(!opportunity)throw new Error('OPPORTUNITY_NOT_FOUND');
    const model=await tx.auditScoringModel.findFirst({where:{id:input.scoringModelId,key:AUTOMATION_SCORE_KEY,isActive:true},select:{id:true}});
    if(!model)throw new Error('SCORING_MODEL_INVALID');
    return tx.automationOpportunity.update({where:{id:input.opportunityId},data:{scoringModelId:model.id,assessment:input.assessment as unknown as Prisma.InputJsonValue}})
  })
}

export async function scoreAutomationOpportunity(input:{auditId:string;processId:string;opportunityId:string}) {
  return prisma.$transaction(async tx=>{
    const opportunity=await tx.automationOpportunity.findFirst({where:{id:input.opportunityId,auditId:input.auditId,processId:input.processId,process:{auditId:input.auditId}},select:{id:true,assessment:true,scoringModelId:true}});
    if(!opportunity)throw new Error('OPPORTUNITY_NOT_FOUND');
    if(!opportunity.assessment)throw new Error('ASSESSMENT_INVALID');
    const model=opportunity.scoringModelId?await tx.auditScoringModel.findFirst({where:{id:opportunity.scoringModelId,key:AUTOMATION_SCORE_KEY}}):await tx.auditScoringModel.findFirst({where:{key:AUTOMATION_SCORE_KEY,isActive:true},orderBy:{version:'desc'}});
    if(!model)throw new Error('SCORING_MODEL_INVALID');
    const config=model.config as ScoringModelConfig,assessment=opportunity.assessment as unknown as AutomationAssessment;
    assertValidScoringInputs(config,assessment);
    const result=calculateAutomationScore(config,assessment),scoredAt=new Date();
    const snapshot={model:{id:model.id,key:model.key,version:model.version,name:model.name,config},assessment,result,scoredAt:scoredAt.toISOString()} satisfies Prisma.InputJsonValue;
    return tx.automationOpportunity.update({where:{id:opportunity.id},data:{scoringModelId:model.id,scoreSnapshot:snapshot,scoredAt,businessValueScore:result.dimensions.businessValue?.score,feasibilityScore:result.dimensions.feasibility?.score,marketPotentialScore:result.dimensions.marketPotential?.score,opportunityScore:result.opportunityScore,confidenceScore:result.confidenceScore,evidenceConfidence:result.evidenceConfidence}})
  })
}
