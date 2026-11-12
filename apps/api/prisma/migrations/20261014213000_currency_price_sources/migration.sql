-- Additive multi-currency migration. No existing money values are converted or rewritten.
ALTER TABLE "Variant" ADD COLUMN IF NOT EXISTS "priceCurrency" VARCHAR(3);
-- Existing variant prices were recorded in their owning store's then-default currency.
-- Backfill before any future base currency change, in the same migration transaction.
UPDATE "Variant" AS v
SET "priceCurrency" = upper(t."currency")
FROM "Product" AS p, "Tenant" AS t
WHERE v."productId" = p."id" AND p."storeId" = t."id" AND v."priceCurrency" IS NULL;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "exchangeRateSnapshot" DECIMAL(18,8);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "rateTimestamp" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reportingCurrency" VARCHAR(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reportingTotalSnapshot" DECIMAL(18,2);
-- Historical orders remain in their original Order.currency and original numeric totals.
-- Null snapshot fields for old orders deliberately distinguish unknown historic FX rates.
