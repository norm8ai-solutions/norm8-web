CREATE TYPE "DiscoverySessionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

CREATE TYPE "DiscoveryQuestionCategory" AS ENUM ('PROCESS', 'TOOLS', 'DECISION', 'URGENCY', 'BUDGET', 'INTEGRATIONS', 'IMPACT', 'RISKS', 'NEXT_STEPS');

CREATE TABLE "DiscoverySession" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "baseOfferId" TEXT,
    "status" "DiscoverySessionStatus" NOT NULL DEFAULT 'DRAFT',
    "meetingDate" TIMESTAMP(3),
    "summary" TEXT,
    "decisionMakers" TEXT,
    "urgency" TEXT,
    "budgetRange" TEXT,
    "technicalComplexity" TEXT,
    "confirmedScope" TEXT,
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoverySession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiscoveryQuestion" (
    "id" TEXT NOT NULL,
    "discoverySessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "category" "DiscoveryQuestionCategory" NOT NULL,
    "impactOrObservation" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiscoverySession_leadId_idx" ON "DiscoverySession"("leadId");
CREATE INDEX "DiscoverySession_baseOfferId_idx" ON "DiscoverySession"("baseOfferId");
CREATE INDEX "DiscoverySession_status_idx" ON "DiscoverySession"("status");

CREATE INDEX "DiscoveryQuestion_discoverySessionId_idx" ON "DiscoveryQuestion"("discoverySessionId");
CREATE INDEX "DiscoveryQuestion_category_idx" ON "DiscoveryQuestion"("category");
CREATE INDEX "DiscoveryQuestion_isAnswered_idx" ON "DiscoveryQuestion"("isAnswered");

ALTER TABLE "DiscoverySession" ADD CONSTRAINT "DiscoverySession_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscoverySession" ADD CONSTRAINT "DiscoverySession_baseOfferId_fkey" FOREIGN KEY ("baseOfferId") REFERENCES "BaseOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiscoveryQuestion" ADD CONSTRAINT "DiscoveryQuestion_discoverySessionId_fkey" FOREIGN KEY ("discoverySessionId") REFERENCES "DiscoverySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;