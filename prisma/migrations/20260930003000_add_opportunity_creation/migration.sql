-- Phase 5A adds discovery metadata and evidence associations only.
-- The title remains nullable for compatibility with any opportunities created before this phase;
-- application validation requires it for all new and edited records.
ALTER TABLE "AutomationOpportunity" ADD COLUMN "title" TEXT;

CREATE TABLE "OpportunityBottleneck" (
    "opportunityId" TEXT NOT NULL,
    "bottleneckId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityBottleneck_pkey" PRIMARY KEY ("opportunityId", "bottleneckId")
);

CREATE TABLE "OpportunityBaselineMetric" (
    "opportunityId" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityBaselineMetric_pkey" PRIMARY KEY ("opportunityId", "baselineId")
);

CREATE INDEX "OpportunityBottleneck_bottleneckId_idx" ON "OpportunityBottleneck"("bottleneckId");
CREATE INDEX "OpportunityBaselineMetric_baselineId_idx" ON "OpportunityBaselineMetric"("baselineId");

ALTER TABLE "OpportunityBottleneck" ADD CONSTRAINT "OpportunityBottleneck_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "AutomationOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityBottleneck" ADD CONSTRAINT "OpportunityBottleneck_bottleneckId_fkey" FOREIGN KEY ("bottleneckId") REFERENCES "AuditBottleneck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityBaselineMetric" ADD CONSTRAINT "OpportunityBaselineMetric_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "AutomationOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityBaselineMetric" ADD CONSTRAINT "OpportunityBaselineMetric_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "AuditBaselineMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
