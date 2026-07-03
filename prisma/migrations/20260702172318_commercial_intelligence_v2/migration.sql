-- CreateEnum
CREATE TYPE "ImplementationComplexity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "AuditAnalysis" ADD COLUMN     "closingProbability" INTEGER,
ADD COLUMN     "commercialRationale" TEXT,
ADD COLUMN     "estimatedDelivery" JSONB,
ADD COLUMN     "implementationComplexity" "ImplementationComplexity";
