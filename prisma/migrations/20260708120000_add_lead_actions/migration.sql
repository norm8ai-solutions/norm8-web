-- CreateEnum
CREATE TYPE "LeadActionType" AS ENUM ('CALL', 'SEND_EMAIL', 'SCHEDULE_MEETING', 'REVIEW_AUDIT', 'SEND_PROPOSAL', 'FOLLOW_UP', 'CLOSE_LOST', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateTable
CREATE TABLE "LeadAction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "LeadActionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "LeadActionStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadAction_leadId_idx" ON "LeadAction"("leadId");

-- CreateIndex
CREATE INDEX "LeadAction_type_idx" ON "LeadAction"("type");

-- CreateIndex
CREATE INDEX "LeadAction_status_idx" ON "LeadAction"("status");

-- CreateIndex
CREATE INDEX "LeadAction_dueAt_idx" ON "LeadAction"("dueAt");

-- CreateIndex
CREATE INDEX "LeadAction_createdAt_idx" ON "LeadAction"("createdAt");

-- AddForeignKey
ALTER TABLE "LeadAction" ADD CONSTRAINT "LeadAction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
