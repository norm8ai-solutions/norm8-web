-- CreateEnum
CREATE TYPE "ContractConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "AuditAnalysis" ADD COLUMN     "contractValueEstimate" JSONB;
