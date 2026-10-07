ALTER TABLE "public"."AuditPilotProposal"
  ADD COLUMN "proposedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedBy" TEXT,
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "convertedAt" TIMESTAMP(3);
