-- Forward-only additive identity metadata. Never infer a preset from a translated label.
ALTER TABLE "ProductOption" ADD COLUMN IF NOT EXISTS "presetId" TEXT;
ALTER TABLE "ProductOption" ADD COLUMN IF NOT EXISTS "displayType" TEXT NOT NULL DEFAULT 'button';
ALTER TABLE "ProductOptionValue" ADD COLUMN IF NOT EXISTS "presetValueId" TEXT;
CREATE INDEX IF NOT EXISTS "ProductOption_presetId_idx" ON "ProductOption"("presetId");
CREATE INDEX IF NOT EXISTS "ProductOptionValue_presetValueId_idx" ON "ProductOptionValue"("presetValueId");
-- Legacy options remain unlinked; merchant explicitly reselects their preset in admin.
