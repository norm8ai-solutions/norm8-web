-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractActivityType" ADD VALUE 'CONTRACT_DRAFT_UPDATED';
ALTER TYPE "ContractActivityType" ADD VALUE 'CONTRACT_CLIENT_UPDATED';
ALTER TYPE "ContractActivityType" ADD VALUE 'CONTRACT_SERVICE_UPDATED';
ALTER TYPE "ContractActivityType" ADD VALUE 'CONTRACT_SCOPE_UPDATED';
ALTER TYPE "ContractActivityType" ADD VALUE 'CONTRACT_TIMELINE_UPDATED';
ALTER TYPE "ContractActivityType" ADD VALUE 'CONTRACT_FINANCIALS_UPDATED';
ALTER TYPE "ContractActivityType" ADD VALUE 'CONTRACT_CLAUSES_UPDATED';
ALTER TYPE "ContractActivityType" ADD VALUE 'CONTRACT_REVIEW_SAVED';

-- AlterTable
ALTER TABLE "ContractDeliverable" ADD COLUMN     "order" INTEGER;

-- AlterTable
ALTER TABLE "ContractPhase" ADD COLUMN     "approvalCriteria" TEXT,
ADD COLUMN     "dependencies" TEXT,
ADD COLUMN     "paymentMilestone" TEXT;
