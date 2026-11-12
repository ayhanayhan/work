ALTER TABLE "TaxCategory" ADD COLUMN IF NOT EXISTS "usageType" TEXT NOT NULL DEFAULT 'PRODUCT';
ALTER TABLE "TaxCategory" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TaxCategory" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "TaxCategory_storeId_usageType_isActive_isDefault_idx" ON "TaxCategory"("storeId", "usageType", "isActive", "isDefault");
