-- AlterTable
ALTER TABLE "AuditAnalysis"
ADD COLUMN "clientPreviewTitle" TEXT,
ADD COLUMN "clientPreviewSummary" TEXT,
ADD COLUMN "clientPreviewOpportunities" JSONB,
ADD COLUMN "clientPreviewBenefits" JSONB,
ADD COLUMN "clientPreviewRecommendedDirection" TEXT,
ADD COLUMN "clientPreviewNextStep" TEXT;