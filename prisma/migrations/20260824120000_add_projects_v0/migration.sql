-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectGrowthPhase" AS ENUM ('LAUNCH', 'OPERATE', 'SCALE');

-- CreateEnum
CREATE TYPE "ProjectMilestoneStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "ProjectTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectWorkCategory" AS ENUM ('DEVELOPMENT', 'DESIGN', 'MEETING', 'CLIENT_COMMUNICATION', 'QA', 'DEPLOYMENT', 'ADMIN');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "growthPhase" "ProjectGrowthPhase" NOT NULL DEFAULT 'LAUNCH',
    "planName" TEXT,
    "commercialCondition" TEXT,
    "contractedValueCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "startDate" TIMESTAMP(3),
    "targetEndDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "leadId" TEXT,
    "proposalId" TEXT,
    "contractId" TEXT,
    "jiraProjectKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Project_contractedValueCents_check" CHECK ("contractedValueCents" >= 0)
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectMilestoneStatus" NOT NULL DEFAULT 'TODO',
    "order" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectTaskStatus" NOT NULL DEFAULT 'TODO',
    "category" "ProjectWorkCategory" NOT NULL DEFAULT 'DEVELOPMENT',
    "order" INTEGER NOT NULL,
    "estimatedMinutes" INTEGER,
    "completedAt" TIMESTAMP(3),
    "jiraIssueKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTimeEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "category" "ProjectWorkCategory" NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTimeEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectTimeEntry_durationMinutes_check" CHECK ("durationMinutes" > 0)
);

-- CreateIndex
CREATE INDEX "Project_leadId_idx" ON "Project"("leadId");
CREATE INDEX "Project_proposalId_idx" ON "Project"("proposalId");
CREATE INDEX "Project_contractId_idx" ON "Project"("contractId");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_growthPhase_idx" ON "Project"("growthPhase");
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");
CREATE INDEX "ProjectMilestone_status_idx" ON "ProjectMilestone"("status");
CREATE INDEX "ProjectMilestone_dueDate_idx" ON "ProjectMilestone"("dueDate");
CREATE INDEX "ProjectTask_projectId_idx" ON "ProjectTask"("projectId");
CREATE INDEX "ProjectTask_milestoneId_idx" ON "ProjectTask"("milestoneId");
CREATE INDEX "ProjectTask_status_idx" ON "ProjectTask"("status");
CREATE INDEX "ProjectTask_category_idx" ON "ProjectTask"("category");
CREATE INDEX "ProjectTimeEntry_projectId_idx" ON "ProjectTimeEntry"("projectId");
CREATE INDEX "ProjectTimeEntry_taskId_idx" ON "ProjectTimeEntry"("taskId");
CREATE INDEX "ProjectTimeEntry_category_idx" ON "ProjectTimeEntry"("category");
CREATE INDEX "ProjectTimeEntry_entryDate_idx" ON "ProjectTimeEntry"("entryDate");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTimeEntry" ADD CONSTRAINT "ProjectTimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTimeEntry" ADD CONSTRAINT "ProjectTimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
