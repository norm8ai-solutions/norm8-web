-- DropForeignKey
ALTER TABLE "AutomationOpportunity" DROP CONSTRAINT "AutomationOpportunity_scoringModelId_fkey";

-- AlterTable
ALTER TABLE "AuditBottleneck" ADD COLUMN     "capturedAt" TIMESTAMP(3),
ADD COLUMN     "evidenceReference" TEXT,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "AutomationOpportunity" ADD COLUMN     "currentState" TEXT,
ADD COLUMN     "expectedFutureState" TEXT,
ADD COLUMN     "scoreSnapshot" JSONB,
ADD COLUMN     "scoredAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "AutomationOpportunity" ADD CONSTRAINT "AutomationOpportunity_scoringModelId_fkey" FOREIGN KEY ("scoringModelId") REFERENCES "AuditScoringModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep previous models immutable and activate a new version for the hardened semantics.
UPDATE "AuditScoringModel"
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'automation-opportunity' AND "isActive" = true;

INSERT INTO "AuditScoringModel" ("id", "key", "version", "name", "description", "config", "isActive", "createdAt", "updatedAt")
VALUES (
    'automation-opportunity-v2',
    'automation-opportunity',
    2,
    'Automation Opportunity Score v2',
    'Unknown criteria are excluded from the score and reduce evidence confidence. Risk manageability is directional: 5 is safer and more feasible.',
    '{"scale":{"min":1,"max":5},"dimensions":{"businessValue":{"weight":0.35,"criteria":{"frequency":0.25,"timeBurden":0.25,"costBurden":0.2,"roiPotential":0.3}},"feasibility":{"weight":0.35,"criteria":{"repeatability":0.3,"dataReadiness":0.25,"integrationFeasibility":0.25,"riskManageability":0.2}},"marketPotential":{"weight":0.3,"criteria":{"willingnessToPay":0.4,"crossCompanyRepeatability":0.35,"businessImportance":0.25}}}}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
