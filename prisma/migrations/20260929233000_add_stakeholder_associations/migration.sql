ALTER TABLE "OperationsProcess" ADD COLUMN "ownerStakeholderId" TEXT;
ALTER TABLE "OperationsTask" ADD COLUMN "stakeholderId" TEXT;

CREATE TABLE "ProcessStakeholder" (
  "processId" TEXT NOT NULL,
  "stakeholderId" TEXT NOT NULL,
  CONSTRAINT "ProcessStakeholder_pkey" PRIMARY KEY ("processId", "stakeholderId")
);

CREATE INDEX "OperationsProcess_ownerStakeholderId_idx" ON "OperationsProcess"("ownerStakeholderId");
CREATE INDEX "OperationsTask_stakeholderId_idx" ON "OperationsTask"("stakeholderId");
CREATE INDEX "ProcessStakeholder_stakeholderId_idx" ON "ProcessStakeholder"("stakeholderId");

ALTER TABLE "OperationsProcess" ADD CONSTRAINT "OperationsProcess_ownerStakeholderId_fkey"
  FOREIGN KEY ("ownerStakeholderId") REFERENCES "AuditStakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperationsTask" ADD CONSTRAINT "OperationsTask_stakeholderId_fkey"
  FOREIGN KEY ("stakeholderId") REFERENCES "AuditStakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProcessStakeholder" ADD CONSTRAINT "ProcessStakeholder_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "OperationsProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessStakeholder" ADD CONSTRAINT "ProcessStakeholder_stakeholderId_fkey"
  FOREIGN KEY ("stakeholderId") REFERENCES "AuditStakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
