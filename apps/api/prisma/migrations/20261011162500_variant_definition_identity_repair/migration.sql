-- Production-safe additive repair for stable product option/value identities.
-- Idempotent by design: if the earlier migration already created these objects,
-- this migration is a no-op.
ALTER TABLE "ProductOption" ADD COLUMN IF NOT EXISTS "presetId" TEXT;
ALTER TABLE "ProductOptionValue" ADD COLUMN IF NOT EXISTS "presetValueId" TEXT;

CREATE INDEX IF NOT EXISTS "ProductOption_presetId_idx" ON "ProductOption"("presetId");
CREATE INDEX IF NOT EXISTS "ProductOptionValue_presetValueId_idx" ON "ProductOptionValue"("presetValueId");
