-- CreateEnum
CREATE TYPE "OperationsAuditStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'ANALYSIS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StakeholderInterviewStatus" AS ENUM ('NOT_PLANNED', 'PLANNED', 'INTERVIEWED', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "ProcessMappingStatus" AS ENUM ('CAPTURED', 'MAPPED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "TaskExecutionMode" AS ENUM ('MANUAL', 'AUTOMATED', 'HYBRID');

-- CreateEnum
CREATE TYPE "EvidenceAnswer" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IntegrationDifficulty" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DataStructureType" AS ENUM ('STRUCTURED', 'SEMI_STRUCTURED', 'UNSTRUCTURED');

-- CreateEnum
CREATE TYPE "DataSensitivity" AS ENUM ('CLIENT_PRIVATE', 'CLIENT_DERIVED', 'AGGREGATED', 'NORM8_KNOWLEDGE');

-- CreateEnum
CREATE TYPE "EvidenceQuality" AS ENUM ('MEASURED', 'ESTIMATED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EvidenceConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "StrategicFit" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BottleneckCategory" AS ENUM ('MANUAL_WORK', 'WAITING', 'DUPLICATE_ENTRY', 'MISSING_INFORMATION', 'POOR_INTEGRATION', 'ERRORS', 'COMMUNICATION', 'APPROVAL', 'SEARCH_RETRIEVAL', 'RECONCILIATION', 'DATA_QUALITY', 'OTHER');

-- CreateEnum
CREATE TYPE "AutomationOpportunityStatus" AS ENUM ('DISCOVERED', 'VALIDATING', 'RECOMMENDED', 'PILOT_PROPOSED', 'PILOT_ACCEPTED', 'IMPLEMENTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PilotProposalStatus" AS ENUM ('DRAFT', 'PROPOSED', 'ACCEPTED', 'REJECTED', 'CONVERTED_TO_PROJECT');

-- CreateTable
CREATE TABLE "OperationsAudit" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "status" "OperationsAuditStatus" NOT NULL DEFAULT 'DRAFT',
    "auditType" TEXT NOT NULL DEFAULT 'AI_OPERATIONS',
    "scope" TEXT,
    "objectives" TEXT,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationsAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditStakeholder" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "department" TEXT,
    "seniority" TEXT,
    "responsibilities" TEXT,
    "interviewStatus" "StakeholderInterviewStatus" NOT NULL DEFAULT 'NOT_PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditStakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationsProcess" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "description" TEXT,
    "trigger" TEXT,
    "endState" TEXT,
    "frequency" TEXT,
    "volume" DECIMAL(65,30),
    "volumePeriod" TEXT,
    "owner" TEXT,
    "participants" TEXT,
    "currentCycleTimeMinutes" INTEGER,
    "humanHoursPerPeriod" DECIMAL(65,30),
    "costPerPeriodCents" INTEGER,
    "costPeriod" TEXT,
    "businessImportance" INTEGER,
    "deadlineSensitivity" INTEGER,
    "status" "ProcessMappingStatus" NOT NULL DEFAULT 'CAPTURED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationsProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationsTask" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "actor" TEXT,
    "executionMode" "TaskExecutionMode" NOT NULL DEFAULT 'MANUAL',
    "averageTimeMinutes" INTEGER,
    "frequency" TEXT,
    "input" TEXT,
    "output" TEXT,
    "decisionRequired" BOOLEAN NOT NULL DEFAULT false,
    "exceptionFrequency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationsTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditSystem" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "vendor" TEXT,
    "purpose" TEXT,
    "apiAvailable" "EvidenceAnswer" NOT NULL DEFAULT 'UNKNOWN',
    "exportAvailable" "EvidenceAnswer" NOT NULL DEFAULT 'UNKNOWN',
    "integrationDifficulty" "IntegrationDifficulty",
    "dataOwner" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessSystem" (
    "processId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "ProcessSystem_pkey" PRIMARY KEY ("processId","systemId")
);

-- CreateTable
CREATE TABLE "TaskSystem" (
    "taskId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "TaskSystem_pkey" PRIMARY KEY ("taskId","systemId")
);

-- CreateTable
CREATE TABLE "AuditDataSource" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "structure" "DataStructureType" NOT NULL DEFAULT 'UNSTRUCTURED',
    "accessibility" TEXT,
    "quality" INTEGER,
    "sensitivity" "DataSensitivity" NOT NULL DEFAULT 'CLIENT_PRIVATE',
    "updateFrequency" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditDataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessDataSource" (
    "processId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,

    CONSTRAINT "ProcessDataSource_pkey" PRIMARY KEY ("processId","dataSourceId")
);

-- CreateTable
CREATE TABLE "AuditBottleneck" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "taskId" TEXT,
    "description" TEXT NOT NULL,
    "category" "BottleneckCategory" NOT NULL,
    "timeImpact" TEXT,
    "costImpactCents" INTEGER,
    "errorImpact" TEXT,
    "revenueImpact" TEXT,
    "customerImpact" TEXT,
    "evidence" TEXT,
    "evidenceQuality" "EvidenceQuality" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditBottleneck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditBaselineMetric" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "numericValue" DECIMAL(65,30),
    "textValue" TEXT,
    "unit" TEXT,
    "period" TEXT,
    "evidenceQuality" "EvidenceQuality" NOT NULL DEFAULT 'UNKNOWN',
    "source" TEXT,
    "evidence" TEXT,
    "observedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditBaselineMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditScoringModel" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditScoringModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationOpportunity" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "scoringModelId" TEXT,
    "problem" TEXT NOT NULL,
    "proposedOutcome" TEXT,
    "automationConcept" TEXT,
    "expectedTimeSavingHoursPerPeriod" DECIMAL(65,30),
    "expectedCostSavingCentsPerPeriod" INTEGER,
    "savingPeriod" TEXT,
    "implementationComplexity" "ImplementationComplexity",
    "businessValueScore" DECIMAL(65,30),
    "feasibilityScore" DECIMAL(65,30),
    "marketPotentialScore" DECIMAL(65,30),
    "opportunityScore" DECIMAL(65,30),
    "confidenceScore" DECIMAL(65,30),
    "evidenceConfidence" "EvidenceConfidence" NOT NULL DEFAULT 'LOW',
    "strategicFit" "StrategicFit",
    "risk" TEXT,
    "whyThisMatters" TEXT,
    "recommendation" TEXT,
    "status" "AutomationOpportunityStatus" NOT NULL DEFAULT 'DISCOVERED',
    "assessment" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPilotProposal" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "projectId" TEXT,
    "problem" TEXT NOT NULL,
    "scope" TEXT,
    "workflow" TEXT,
    "baselineSummary" TEXT,
    "targetBusinessOutcome" TEXT,
    "expectedRoi" TEXT,
    "implementationEstimate" TEXT,
    "recurringModel" TEXT,
    "successMetrics" JSONB,
    "status" "PilotProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditPilotProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationsAudit_leadId_idx" ON "OperationsAudit"("leadId");

-- CreateIndex
CREATE INDEX "OperationsAudit_ownerId_idx" ON "OperationsAudit"("ownerId");

-- CreateIndex
CREATE INDEX "OperationsAudit_status_idx" ON "OperationsAudit"("status");

-- CreateIndex
CREATE INDEX "OperationsAudit_createdAt_idx" ON "OperationsAudit"("createdAt");

-- CreateIndex
CREATE INDEX "AuditStakeholder_auditId_idx" ON "AuditStakeholder"("auditId");

-- CreateIndex
CREATE INDEX "AuditStakeholder_department_idx" ON "AuditStakeholder"("department");

-- CreateIndex
CREATE INDEX "AuditStakeholder_interviewStatus_idx" ON "AuditStakeholder"("interviewStatus");

-- CreateIndex
CREATE INDEX "OperationsProcess_auditId_idx" ON "OperationsProcess"("auditId");

-- CreateIndex
CREATE INDEX "OperationsProcess_department_idx" ON "OperationsProcess"("department");

-- CreateIndex
CREATE INDEX "OperationsProcess_status_idx" ON "OperationsProcess"("status");

-- CreateIndex
CREATE INDEX "OperationsTask_processId_idx" ON "OperationsTask"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationsTask_processId_sequence_key" ON "OperationsTask"("processId", "sequence");

-- CreateIndex
CREATE INDEX "AuditSystem_auditId_idx" ON "AuditSystem"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditSystem_auditId_name_key" ON "AuditSystem"("auditId", "name");

-- CreateIndex
CREATE INDEX "ProcessSystem_systemId_idx" ON "ProcessSystem"("systemId");

-- CreateIndex
CREATE INDEX "TaskSystem_systemId_idx" ON "TaskSystem"("systemId");

-- CreateIndex
CREATE INDEX "AuditDataSource_auditId_idx" ON "AuditDataSource"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditDataSource_auditId_name_key" ON "AuditDataSource"("auditId", "name");

-- CreateIndex
CREATE INDEX "ProcessDataSource_dataSourceId_idx" ON "ProcessDataSource"("dataSourceId");

-- CreateIndex
CREATE INDEX "AuditBottleneck_processId_idx" ON "AuditBottleneck"("processId");

-- CreateIndex
CREATE INDEX "AuditBottleneck_taskId_idx" ON "AuditBottleneck"("taskId");

-- CreateIndex
CREATE INDEX "AuditBottleneck_category_idx" ON "AuditBottleneck"("category");

-- CreateIndex
CREATE INDEX "AuditBaselineMetric_processId_idx" ON "AuditBaselineMetric"("processId");

-- CreateIndex
CREATE INDEX "AuditBaselineMetric_metricKey_idx" ON "AuditBaselineMetric"("metricKey");

-- CreateIndex
CREATE INDEX "AuditScoringModel_isActive_idx" ON "AuditScoringModel"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AuditScoringModel_key_version_key" ON "AuditScoringModel"("key", "version");

-- CreateIndex
CREATE INDEX "AutomationOpportunity_auditId_idx" ON "AutomationOpportunity"("auditId");

-- CreateIndex
CREATE INDEX "AutomationOpportunity_processId_idx" ON "AutomationOpportunity"("processId");

-- CreateIndex
CREATE INDEX "AutomationOpportunity_status_idx" ON "AutomationOpportunity"("status");

-- CreateIndex
CREATE INDEX "AutomationOpportunity_opportunityScore_idx" ON "AutomationOpportunity"("opportunityScore");

-- CreateIndex
CREATE UNIQUE INDEX "AuditPilotProposal_opportunityId_key" ON "AuditPilotProposal"("opportunityId");

-- CreateIndex
CREATE INDEX "AuditPilotProposal_projectId_idx" ON "AuditPilotProposal"("projectId");

-- CreateIndex
CREATE INDEX "AuditPilotProposal_status_idx" ON "AuditPilotProposal"("status");

-- AddForeignKey
ALTER TABLE "OperationsAudit" ADD CONSTRAINT "OperationsAudit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationsAudit" ADD CONSTRAINT "OperationsAudit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditStakeholder" ADD CONSTRAINT "AuditStakeholder_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OperationsAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationsProcess" ADD CONSTRAINT "OperationsProcess_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OperationsAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationsTask" ADD CONSTRAINT "OperationsTask_processId_fkey" FOREIGN KEY ("processId") REFERENCES "OperationsProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditSystem" ADD CONSTRAINT "AuditSystem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OperationsAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessSystem" ADD CONSTRAINT "ProcessSystem_processId_fkey" FOREIGN KEY ("processId") REFERENCES "OperationsProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessSystem" ADD CONSTRAINT "ProcessSystem_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AuditSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSystem" ADD CONSTRAINT "TaskSystem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "OperationsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSystem" ADD CONSTRAINT "TaskSystem_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AuditSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDataSource" ADD CONSTRAINT "AuditDataSource_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OperationsAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDataSource" ADD CONSTRAINT "ProcessDataSource_processId_fkey" FOREIGN KEY ("processId") REFERENCES "OperationsProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDataSource" ADD CONSTRAINT "ProcessDataSource_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "AuditDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditBottleneck" ADD CONSTRAINT "AuditBottleneck_processId_fkey" FOREIGN KEY ("processId") REFERENCES "OperationsProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditBottleneck" ADD CONSTRAINT "AuditBottleneck_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "OperationsTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditBaselineMetric" ADD CONSTRAINT "AuditBaselineMetric_processId_fkey" FOREIGN KEY ("processId") REFERENCES "OperationsProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationOpportunity" ADD CONSTRAINT "AutomationOpportunity_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OperationsAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationOpportunity" ADD CONSTRAINT "AutomationOpportunity_processId_fkey" FOREIGN KEY ("processId") REFERENCES "OperationsProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationOpportunity" ADD CONSTRAINT "AutomationOpportunity_scoringModelId_fkey" FOREIGN KEY ("scoringModelId") REFERENCES "AuditScoringModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPilotProposal" ADD CONSTRAINT "AuditPilotProposal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "AutomationOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPilotProposal" ADD CONSTRAINT "AuditPilotProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the initial decision-support model. Scores remain comparative, not scientific claims.
INSERT INTO "AuditScoringModel" ("id", "key", "version", "name", "description", "config", "isActive", "createdAt", "updatedAt")
VALUES (
    'automation-opportunity-v1',
    'automation-opportunity',
    1,
    'Automation Opportunity Score v1',
    'Business value 35%, automation feasibility 35%, commercial/market potential 30%. Strategic fit is deliberately excluded.',
    '{"dimensions":{"businessValue":{"weight":0.35,"criteria":{"frequency":0.25,"timeBurden":0.25,"costBurden":0.2,"roiPotential":0.3}},"feasibility":{"weight":0.35,"criteria":{"repeatability":0.3,"dataReadiness":0.25,"integrationFeasibility":0.25,"riskSafety":0.2}},"marketPotential":{"weight":0.3,"criteria":{"willingnessToPay":0.4,"crossCompanyRepeatability":0.35,"businessImportance":0.25}}},"scale":{"min":1,"max":5},"output":{"min":0,"max":100}}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
