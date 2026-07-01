-- CreateEnum
CREATE TYPE "AuditAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "AuditAnalysis" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "score" INTEGER,
    "priority" "AuditPriority",
    "companySummary" TEXT,
    "operationalProblems" JSONB,
    "automationOpportunities" JSONB,
    "recommendedSolutions" JSONB,
    "nextStep" TEXT,
    "internalSummary" TEXT,
    "aiModel" TEXT,
    "status" "AuditAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditAnalysis_submissionId_key" ON "AuditAnalysis"("submissionId");

-- CreateIndex
CREATE INDEX "AuditAnalysis_leadId_idx" ON "AuditAnalysis"("leadId");

-- CreateIndex
CREATE INDEX "AuditAnalysis_status_idx" ON "AuditAnalysis"("status");

-- CreateIndex
CREATE INDEX "AuditAnalysis_priority_idx" ON "AuditAnalysis"("priority");

-- CreateIndex
CREATE INDEX "AuditAnalysis_createdAt_idx" ON "AuditAnalysis"("createdAt");

-- AddForeignKey
ALTER TABLE "AuditAnalysis" ADD CONSTRAINT "AuditAnalysis_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAnalysis" ADD CONSTRAINT "AuditAnalysis_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
