-- Add indexes to support PDF hash lookup and audit trails without enforcing uniqueness.
CREATE INDEX "Contract_pdfHash_idx" ON "Contract"("pdfHash");
CREATE INDEX "ContractVersion_pdfHash_idx" ON "ContractVersion"("pdfHash");