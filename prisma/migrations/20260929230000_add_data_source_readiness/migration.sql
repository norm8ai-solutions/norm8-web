ALTER TYPE "DataStructureType" ADD VALUE IF NOT EXISTS 'UNKNOWN';
ALTER TYPE "DataSensitivity" ADD VALUE IF NOT EXISTS 'UNKNOWN';

ALTER TABLE "AuditDataSource"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "systemId" TEXT;

ALTER TABLE "AuditDataSource"
  ALTER COLUMN "structure" SET DEFAULT 'UNKNOWN',
  ALTER COLUMN "sensitivity" SET DEFAULT 'UNKNOWN';

CREATE INDEX "AuditDataSource_systemId_idx" ON "AuditDataSource"("systemId");

ALTER TABLE "AuditDataSource"
  ADD CONSTRAINT "AuditDataSource_systemId_fkey"
  FOREIGN KEY ("systemId") REFERENCES "AuditSystem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
