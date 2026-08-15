CREATE TYPE "FinanceRecurringRevenueStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'ENDED');

CREATE TABLE "FinanceRecurringRevenue" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "monthlyAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "FinanceRecurringRevenueStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "billingDay" INTEGER,
    "leadId" TEXT,
    "proposalId" TEXT,
    "contractId" TEXT,
    "categoryId" TEXT,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceRecurringRevenue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceRecurringRevenue_status_idx" ON "FinanceRecurringRevenue"("status");
CREATE INDEX "FinanceRecurringRevenue_startDate_idx" ON "FinanceRecurringRevenue"("startDate");
CREATE INDEX "FinanceRecurringRevenue_endDate_idx" ON "FinanceRecurringRevenue"("endDate");
CREATE INDEX "FinanceRecurringRevenue_leadId_idx" ON "FinanceRecurringRevenue"("leadId");
CREATE INDEX "FinanceRecurringRevenue_proposalId_idx" ON "FinanceRecurringRevenue"("proposalId");
CREATE INDEX "FinanceRecurringRevenue_contractId_idx" ON "FinanceRecurringRevenue"("contractId");
CREATE INDEX "FinanceRecurringRevenue_categoryId_idx" ON "FinanceRecurringRevenue"("categoryId");
CREATE INDEX "FinanceRecurringRevenue_accountId_idx" ON "FinanceRecurringRevenue"("accountId");

ALTER TABLE "FinanceRecurringRevenue" ADD CONSTRAINT "FinanceRecurringRevenue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceRecurringRevenue" ADD CONSTRAINT "FinanceRecurringRevenue_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
