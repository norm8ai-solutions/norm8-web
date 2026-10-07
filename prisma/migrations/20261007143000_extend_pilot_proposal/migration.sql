ALTER TABLE "public"."AuditPilotProposal"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "objective" TEXT,
  ADD COLUMN "outOfScope" TEXT,
  ADD COLUMN "successCriteria" TEXT,
  ADD COLUMN "duration" TEXT,
  ADD COLUMN "owner" TEXT,
  ADD COLUMN "dependencies" TEXT,
  ADD COLUMN "risks" TEXT,
  ADD COLUMN "priceCents" INTEGER,
  ADD COLUMN "currency" TEXT DEFAULT 'EUR',
  ADD COLUMN "commercialNotes" TEXT;
