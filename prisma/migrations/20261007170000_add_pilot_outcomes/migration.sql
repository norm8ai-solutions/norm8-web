CREATE TYPE "public"."PilotOutcomeStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');
CREATE TYPE "public"."PilotSuccessAssessment" AS ENUM ('NOT_EVALUATED', 'MET', 'PARTIALLY_MET', 'NOT_MET');
CREATE TABLE "public"."AuditPilotOutcome" (
  "id" TEXT NOT NULL, "pilotId" TEXT NOT NULL, "status" "public"."PilotOutcomeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "summary" TEXT, "keyLearnings" TEXT, "issuesEncountered" TEXT,
  "successAssessment" "public"."PilotSuccessAssessment" NOT NULL DEFAULT 'NOT_EVALUATED',
  "successAssessmentNote" TEXT, "conclusion" TEXT, "nextStep" TEXT, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditPilotOutcome_pkey" PRIMARY KEY ("id"), CONSTRAINT "AuditPilotOutcome_pilotId_key" UNIQUE ("pilotId"),
  CONSTRAINT "AuditPilotOutcome_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "public"."AuditPilotProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "public"."AuditPilotMetricResult" (
  "id" TEXT NOT NULL, "outcomeId" TEXT NOT NULL, "baselineId" TEXT, "label" TEXT NOT NULL,
  "baselineValue" DECIMAL, "targetValue" DECIMAL, "actualValue" DECIMAL, "unit" TEXT, "period" TEXT,
  "evidenceQuality" "public"."EvidenceQuality" NOT NULL DEFAULT 'UNKNOWN', "source" TEXT, "reference" TEXT, "note" TEXT, "measuredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditPilotMetricResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditPilotMetricResult_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "public"."AuditPilotOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuditPilotMetricResult_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "public"."AuditBaselineMetric"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditPilotMetricResult_outcomeId_idx" ON "public"."AuditPilotMetricResult"("outcomeId");
CREATE INDEX "AuditPilotMetricResult_baselineId_idx" ON "public"."AuditPilotMetricResult"("baselineId");
