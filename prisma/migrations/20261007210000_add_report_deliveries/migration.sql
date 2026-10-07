CREATE TYPE "public"."ReportDeliveryType" AS ENUM ('AUDIT_REPORT', 'PILOT_REPORT');
CREATE TYPE "public"."ReportDeliveryChannel" AS ENUM ('EMAIL');
CREATE TYPE "public"."ReportDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "public"."AuditReportDelivery" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "pilotProposalId" TEXT,
    "reportType" "public"."ReportDeliveryType" NOT NULL,
    "channel" "public"."ReportDeliveryChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "public"."ReportDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "recipientName" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "providerMessageId" TEXT,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "pdfBytes" BYTEA NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditReportDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditReportDelivery_auditId_createdAt_idx" ON "public"."AuditReportDelivery"("auditId", "createdAt");
CREATE INDEX "AuditReportDelivery_pilotProposalId_createdAt_idx" ON "public"."AuditReportDelivery"("pilotProposalId", "createdAt");
CREATE INDEX "AuditReportDelivery_status_idx" ON "public"."AuditReportDelivery"("status");

ALTER TABLE "public"."AuditReportDelivery" ADD CONSTRAINT "AuditReportDelivery_auditId_fkey"
  FOREIGN KEY ("auditId") REFERENCES "public"."OperationsAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AuditReportDelivery" ADD CONSTRAINT "AuditReportDelivery_pilotProposalId_fkey"
  FOREIGN KEY ("pilotProposalId") REFERENCES "public"."AuditPilotProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
