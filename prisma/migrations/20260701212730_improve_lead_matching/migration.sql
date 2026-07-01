-- DropIndex
DROP INDEX "Lead_email_key";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "normalizedCompany" TEXT,
ADD COLUMN     "normalizedEmail" TEXT,
ADD COLUMN     "normalizedWebsite" TEXT;

-- CreateIndex
CREATE INDEX "Lead_normalizedCompany_idx" ON "Lead"("normalizedCompany");

-- CreateIndex
CREATE INDEX "Lead_normalizedWebsite_idx" ON "Lead"("normalizedWebsite");

-- CreateIndex
CREATE INDEX "Lead_normalizedEmail_idx" ON "Lead"("normalizedEmail");
