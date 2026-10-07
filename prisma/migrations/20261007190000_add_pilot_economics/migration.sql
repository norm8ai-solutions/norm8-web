CREATE TABLE "public"."AuditPilotEconomics" (
  "id" TEXT NOT NULL, "outcomeId" TEXT NOT NULL, "timeSavingsMetricId" TEXT,
  "laborCostPerHourCents" INTEGER, "laborCostQuality" "public"."EvidenceQuality" NOT NULL DEFAULT 'UNKNOWN',
  "laborCostSource" TEXT, "laborCostNote" TEXT, "directMonthlySavingsCents" INTEGER,
  "directSavingsQuality" "public"."EvidenceQuality" NOT NULL DEFAULT 'UNKNOWN', "otherMonthlySavingsCents" INTEGER,
  "ongoingMonthlyCostCents" INTEGER, "investmentCostCents" INTEGER, "currency" TEXT NOT NULL DEFAULT 'EUR',
  "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditPilotEconomics_pkey" PRIMARY KEY ("id"), CONSTRAINT "AuditPilotEconomics_outcomeId_key" UNIQUE ("outcomeId"),
  CONSTRAINT "AuditPilotEconomics_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "public"."AuditPilotOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuditPilotEconomics_timeSavingsMetricId_fkey" FOREIGN KEY ("timeSavingsMetricId") REFERENCES "public"."AuditPilotMetricResult"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditPilotEconomics_timeSavingsMetricId_idx" ON "public"."AuditPilotEconomics"("timeSavingsMetricId");
