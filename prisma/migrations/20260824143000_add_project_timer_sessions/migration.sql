CREATE TYPE "ProjectTimerStatus" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED');

CREATE TABLE "ProjectTimerSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "category" "ProjectWorkCategory" NOT NULL,
    "status" "ProjectTimerStatus" NOT NULL DEFAULT 'RUNNING',
    "description" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "pausedAt" TIMESTAMP(3),
    "accumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTimerSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectTimerSession_accumulatedSeconds_check" CHECK ("accumulatedSeconds" >= 0)
);

CREATE INDEX "ProjectTimerSession_projectId_idx" ON "ProjectTimerSession"("projectId");
CREATE INDEX "ProjectTimerSession_taskId_idx" ON "ProjectTimerSession"("taskId");
CREATE INDEX "ProjectTimerSession_status_idx" ON "ProjectTimerSession"("status");
CREATE INDEX "ProjectTimerSession_startedAt_idx" ON "ProjectTimerSession"("startedAt");
CREATE UNIQUE INDEX "ProjectTimerSession_projectId_active_key" ON "ProjectTimerSession"("projectId") WHERE "status" IN ('RUNNING', 'PAUSED');

ALTER TABLE "ProjectTimerSession" ADD CONSTRAINT "ProjectTimerSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTimerSession" ADD CONSTRAINT "ProjectTimerSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;