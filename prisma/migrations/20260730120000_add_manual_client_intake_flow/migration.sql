-- Add manual client intake submission types.
ALTER TYPE "SubmissionType" ADD VALUE IF NOT EXISTS 'PRE_MEETING_INTAKE';
ALTER TYPE "SubmissionType" ADD VALUE IF NOT EXISTS 'LEGAL_DATA_INTAKE';

-- Base offers are internal commercial drafts prepared before/after discovery.
CREATE TYPE "BaseOfferStatus" AS ENUM ('INTERNAL_DRAFT', 'VALIDATED', 'CONVERTED_TO_PROPOSAL', 'ARCHIVED');

CREATE TABLE "BaseOffer" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "submissionId" TEXT,
    "status" "BaseOfferStatus" NOT NULL DEFAULT 'INTERNAL_DRAFT',
    "problemSummary" TEXT,
    "processToAutomate" TEXT,
    "suggestedSolution" TEXT,
    "recommendedModules" JSONB,
    "automationOpportunities" JSONB,
    "toolsMentioned" TEXT,
    "estimatedScope" TEXT,
    "initialPriceRange" TEXT,
    "pricingRationale" TEXT,
    "questionsForDiscovery" JSONB,
    "risksOrMissingInfo" JSONB,
    "nextSteps" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaseOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BaseOffer_leadId_idx" ON "BaseOffer"("leadId");
CREATE INDEX "BaseOffer_submissionId_idx" ON "BaseOffer"("submissionId");
CREATE INDEX "BaseOffer_status_idx" ON "BaseOffer"("status");
CREATE INDEX "BaseOffer_createdAt_idx" ON "BaseOffer"("createdAt");

ALTER TABLE "BaseOffer" ADD CONSTRAINT "BaseOffer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BaseOffer" ADD CONSTRAINT "BaseOffer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;