-- Stable links from product option/value rows to reusable catalog option definitions.
-- Nullable by design so existing products remain valid and are upgraded on their next edit/save.
ALTER TABLE "ProductOption" ADD COLUMN IF NOT EXISTS "presetId" TEXT;
ALTER TABLE "ProductOptionValue" ADD COLUMN IF NOT EXISTS "presetValueId" TEXT;

CREATE INDEX IF NOT EXISTS "ProductOption_presetId_idx" ON "ProductOption"("presetId");
CREATE INDEX IF NOT EXISTS "ProductOptionValue_presetValueId_idx" ON "ProductOptionValue"("presetValueId");
