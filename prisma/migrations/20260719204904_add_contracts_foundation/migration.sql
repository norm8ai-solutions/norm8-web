-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'READY_TO_SEND', 'SENT', 'VIEWED', 'AWAITING_SIGNATURE', 'SIGNED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractDocumentType" AS ENUM ('CTR', 'SOW', 'CR', 'NDA', 'SLA');

-- CreateEnum
CREATE TYPE "ContractServiceType" AS ENUM ('WEBSITE', 'CUSTOM_SOFTWARE', 'PROCESS_AUTOMATION', 'AI_AGENTS', 'SYSTEM_INTEGRATION', 'TECHNOLOGY_CONSULTING', 'COMMERCIAL_PLATFORM', 'MAINTENANCE_EVOLUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractPlan" AS ENUM ('STARTER', 'PROFESSIONAL', 'BUSINESS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ContractPhaseType" AS ENUM ('LAUNCH', 'OPERATE', 'SCALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractDeliverableStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DELIVERED', 'ACCEPTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PaymentMilestoneStatus" AS ENUM ('PENDING', 'READY_TO_INVOICE', 'INVOICED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractSectionCategory" AS ENUM ('OBJECT', 'SCOPE', 'RESPONSIBILITIES', 'TIMELINE', 'APPROVALS', 'SCOPE_CHANGE', 'PAYMENTS', 'DELAYS', 'SUSPENSION', 'OPERATE', 'SLA', 'WARRANTY', 'INTELLECTUAL_PROPERTY', 'CONFIDENTIALITY', 'DATA_PROTECTION', 'THIRD_PARTY_SERVICES', 'LIABILITY_LIMITATION', 'TERMINATION', 'FORCE_MAJEURE', 'COMMUNICATIONS', 'APPLICABLE_LAW', 'JURISDICTION', 'SIGNATURES', 'ANNEX');

-- CreateEnum
CREATE TYPE "ContractActivityType" AS ENUM ('CONTRACT_CREATED', 'CONTRACT_UPDATED', 'CONTRACT_STATUS_CHANGED', 'CONTRACT_VERSION_CREATED', 'CONTRACT_PDF_GENERATION_REQUESTED', 'CONTRACT_SENT');

-- AlterTable
ALTER TABLE "EmailLog" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CompanyLegalSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "representative" TEXT NOT NULL,
    "representativeRole" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "swiftBic" TEXT,
    "internalNote" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyLegalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "leadId" TEXT,
    "proposalId" TEXT,
    "meetingBookingId" TEXT,
    "templateId" TEXT,
    "projectName" TEXT,
    "clientSnapshot" JSONB NOT NULL,
    "providerSnapshot" JSONB NOT NULL,
    "projectSnapshot" JSONB NOT NULL,
    "financialSnapshot" JSONB NOT NULL,
    "termsSnapshot" JSONB NOT NULL,
    "serviceType" "ContractServiceType",
    "serviceTypeOther" TEXT,
    "plan" "ContractPlan",
    "includesLaunch" BOOLEAN NOT NULL DEFAULT true,
    "includesOperate" BOOLEAN NOT NULL DEFAULT false,
    "includesScale" BOOLEAN NOT NULL DEFAULT false,
    "estimatedValue" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "issueDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "pdfStorageKey" TEXT,
    "pdfHash" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractTemplateSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "category" "ContractSectionCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSection" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "templateSectionId" TEXT,
    "category" "ContractSectionCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sourceVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractVersion" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "pdfStorageKey" TEXT,
    "pdfHash" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractNumberSequence" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "ContractDocumentType" NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractNumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractPhase" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phaseType" "ContractPhaseType",
    "order" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "duration" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDeliverable" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "phase" "ContractPhaseType",
    "status" "ContractDeliverableStatus" NOT NULL DEFAULT 'PLANNED',
    "estimatedDate" TIMESTAMP(3),
    "responsible" TEXT,
    "acceptanceCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractPaymentMilestone" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "percentage" DECIMAL(65,30),
    "amount" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "invoiceMoment" TEXT,
    "expectedDate" TIMESTAMP(3),
    "description" TEXT,
    "status" "PaymentMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "billingCondition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractPaymentMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractActivityLog" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "type" "ContractActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyLegalSettings_key_key" ON "CompanyLegalSettings"("key");

-- CreateIndex
CREATE INDEX "CompanyLegalSettings_updatedById_idx" ON "CompanyLegalSettings"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_number_key" ON "Contract"("number");

-- CreateIndex
CREATE INDEX "Contract_leadId_idx" ON "Contract"("leadId");

-- CreateIndex
CREATE INDEX "Contract_proposalId_idx" ON "Contract"("proposalId");

-- CreateIndex
CREATE INDEX "Contract_meetingBookingId_idx" ON "Contract"("meetingBookingId");

-- CreateIndex
CREATE INDEX "Contract_templateId_idx" ON "Contract"("templateId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_serviceType_idx" ON "Contract"("serviceType");

-- CreateIndex
CREATE INDEX "Contract_plan_idx" ON "Contract"("plan");

-- CreateIndex
CREATE INDEX "Contract_createdById_idx" ON "Contract"("createdById");

-- CreateIndex
CREATE INDEX "Contract_assignedToId_idx" ON "Contract"("assignedToId");

-- CreateIndex
CREATE INDEX "Contract_createdAt_idx" ON "Contract"("createdAt");

-- CreateIndex
CREATE INDEX "Contract_validUntil_idx" ON "Contract"("validUntil");

-- CreateIndex
CREATE INDEX "ContractTemplate_isActive_idx" ON "ContractTemplate"("isActive");

-- CreateIndex
CREATE INDEX "ContractTemplate_name_idx" ON "ContractTemplate"("name");

-- CreateIndex
CREATE INDEX "ContractTemplateSection_category_idx" ON "ContractTemplateSection"("category");

-- CreateIndex
CREATE INDEX "ContractTemplateSection_isActive_idx" ON "ContractTemplateSection"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ContractTemplateSection_templateId_order_key" ON "ContractTemplateSection"("templateId", "order");

-- CreateIndex
CREATE INDEX "ContractSection_contractId_idx" ON "ContractSection"("contractId");

-- CreateIndex
CREATE INDEX "ContractSection_templateSectionId_idx" ON "ContractSection"("templateSectionId");

-- CreateIndex
CREATE INDEX "ContractSection_category_idx" ON "ContractSection"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ContractSection_contractId_order_key" ON "ContractSection"("contractId", "order");

-- CreateIndex
CREATE INDEX "ContractVersion_createdById_idx" ON "ContractVersion"("createdById");

-- CreateIndex
CREATE INDEX "ContractVersion_createdAt_idx" ON "ContractVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractVersion_contractId_version_key" ON "ContractVersion"("contractId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ContractNumberSequence_year_type_key" ON "ContractNumberSequence"("year", "type");

-- CreateIndex
CREATE INDEX "ContractPhase_contractId_idx" ON "ContractPhase"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractPhase_contractId_order_key" ON "ContractPhase"("contractId", "order");

-- CreateIndex
CREATE INDEX "ContractDeliverable_contractId_idx" ON "ContractDeliverable"("contractId");

-- CreateIndex
CREATE INDEX "ContractDeliverable_status_idx" ON "ContractDeliverable"("status");

-- CreateIndex
CREATE INDEX "ContractPaymentMilestone_contractId_idx" ON "ContractPaymentMilestone"("contractId");

-- CreateIndex
CREATE INDEX "ContractPaymentMilestone_status_idx" ON "ContractPaymentMilestone"("status");

-- CreateIndex
CREATE INDEX "ContractPaymentMilestone_expectedDate_idx" ON "ContractPaymentMilestone"("expectedDate");

-- CreateIndex
CREATE INDEX "ContractActivityLog_contractId_idx" ON "ContractActivityLog"("contractId");

-- CreateIndex
CREATE INDEX "ContractActivityLog_adminUserId_idx" ON "ContractActivityLog"("adminUserId");

-- CreateIndex
CREATE INDEX "ContractActivityLog_type_idx" ON "ContractActivityLog"("type");

-- CreateIndex
CREATE INDEX "ContractActivityLog_createdAt_idx" ON "ContractActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CompanyLegalSettings" ADD CONSTRAINT "CompanyLegalSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_meetingBookingId_fkey" FOREIGN KEY ("meetingBookingId") REFERENCES "MeetingBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTemplateSection" ADD CONSTRAINT "ContractTemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSection" ADD CONSTRAINT "ContractSection_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSection" ADD CONSTRAINT "ContractSection_templateSectionId_fkey" FOREIGN KEY ("templateSectionId") REFERENCES "ContractTemplateSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPhase" ADD CONSTRAINT "ContractPhase_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDeliverable" ADD CONSTRAINT "ContractDeliverable_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPaymentMilestone" ADD CONSTRAINT "ContractPaymentMilestone_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractActivityLog" ADD CONSTRAINT "ContractActivityLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractActivityLog" ADD CONSTRAINT "ContractActivityLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
