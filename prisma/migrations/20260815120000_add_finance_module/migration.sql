-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinanceTransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceTransactionSource" AS ENUM ('MANUAL', 'PROPOSAL', 'CONTRACT', 'SUBSCRIPTION', 'OTHER');

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "status" "FinanceTransactionStatus" NOT NULL DEFAULT 'CONFIRMED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "categoryId" TEXT,
    "accountId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "source" "FinanceTransactionSource" NOT NULL DEFAULT 'MANUAL',
    "clientName" TEXT,
    "leadId" TEXT,
    "proposalId" TEXT,
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceCategory_type_idx" ON "FinanceCategory"("type");

-- CreateIndex
CREATE INDEX "FinanceTransaction_type_idx" ON "FinanceTransaction"("type");

-- CreateIndex
CREATE INDEX "FinanceTransaction_status_idx" ON "FinanceTransaction"("status");

-- CreateIndex
CREATE INDEX "FinanceTransaction_occurredAt_idx" ON "FinanceTransaction"("occurredAt");

-- CreateIndex
CREATE INDEX "FinanceTransaction_categoryId_idx" ON "FinanceTransaction"("categoryId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_accountId_idx" ON "FinanceTransaction"("accountId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_leadId_idx" ON "FinanceTransaction"("leadId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_proposalId_idx" ON "FinanceTransaction"("proposalId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_contractId_idx" ON "FinanceTransaction"("contractId");

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
