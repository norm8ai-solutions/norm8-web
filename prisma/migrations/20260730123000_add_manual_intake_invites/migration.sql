CREATE TYPE "ManualIntakeInviteStatus" AS ENUM ('DRAFT', 'SENT', 'SUBMITTED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "ManualIntakeInvite" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "companyName" TEXT,
    "source" TEXT,
    "note" TEXT,
    "meetingAt" TIMESTAMP(3),
    "meetingLocation" TEXT,
    "status" "ManualIntakeInviteStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualIntakeInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManualIntakeInvite_tokenHash_key" ON "ManualIntakeInvite"("tokenHash");
CREATE INDEX "ManualIntakeInvite_leadId_idx" ON "ManualIntakeInvite"("leadId");
CREATE INDEX "ManualIntakeInvite_email_idx" ON "ManualIntakeInvite"("email");
CREATE INDEX "ManualIntakeInvite_status_idx" ON "ManualIntakeInvite"("status");
CREATE INDEX "ManualIntakeInvite_expiresAt_idx" ON "ManualIntakeInvite"("expiresAt");
CREATE INDEX "ManualIntakeInvite_createdAt_idx" ON "ManualIntakeInvite"("createdAt");

ALTER TABLE "ManualIntakeInvite" ADD CONSTRAINT "ManualIntakeInvite_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;