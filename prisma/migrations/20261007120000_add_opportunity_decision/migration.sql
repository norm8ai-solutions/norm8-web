-- Add the explicit human decision layer without changing opportunity lifecycle status.
CREATE TYPE "public"."OpportunityDecision" AS ENUM ('UNDECIDED', 'PROCEED_TO_PILOT', 'NEEDS_MORE_VALIDATION', 'HOLD', 'REJECT');

ALTER TABLE "public"."AutomationOpportunity"
  ADD COLUMN "decision" "public"."OpportunityDecision" NOT NULL DEFAULT 'UNDECIDED',
  ADD COLUMN "decisionRationale" TEXT,
  ADD COLUMN "decisionOwner" TEXT,
  ADD COLUMN "decidedAt" TIMESTAMP(3),
  ADD COLUMN "nextStep" TEXT;
