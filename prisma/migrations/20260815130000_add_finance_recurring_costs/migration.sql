CREATE TYPE "FinanceRecurringCostStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'ENDED');

CREATE TYPE "FinanceRecurringCostFrequency" AS ENUM ('MONTHLY', 'YEARLY');

CREATE TABLE "FinanceRecurringCost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "FinanceRecurringCostStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "FinanceRecurringCostFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "billingDay" INTEGER,
    "categoryId" TEXT,
    "accountId" TEXT,
    "vendorName" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceRecurringCost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceRecurringCost_status_idx" ON "FinanceRecurringCost"("status");
CREATE INDEX "FinanceRecurringCost_frequency_idx" ON "FinanceRecurringCost"("frequency");
CREATE INDEX "FinanceRecurringCost_renewalDate_idx" ON "FinanceRecurringCost"("renewalDate");
CREATE INDEX "FinanceRecurringCost_categoryId_idx" ON "FinanceRecurringCost"("categoryId");
CREATE INDEX "FinanceRecurringCost_accountId_idx" ON "FinanceRecurringCost"("accountId");

ALTER TABLE "FinanceRecurringCost" ADD CONSTRAINT "FinanceRecurringCost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceRecurringCost" ADD CONSTRAINT "FinanceRecurringCost_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;