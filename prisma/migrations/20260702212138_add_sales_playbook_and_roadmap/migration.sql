-- AlterTable
ALTER TABLE "AuditAnalysis" ADD COLUMN     "closingProbabilityRationale" TEXT,
ADD COLUMN     "implementationRoadmap" JSONB,
ADD COLUMN     "salesPlaybook" JSONB;
