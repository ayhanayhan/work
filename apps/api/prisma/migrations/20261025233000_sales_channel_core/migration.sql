ALTER TABLE "SalesChannel" ADD COLUMN IF NOT EXISTS "key" TEXT;
ALTER TABLE "SalesChannel" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalesChannel" ADD COLUMN IF NOT EXISTS "priceListId" TEXT;

UPDATE "SalesChannel"
SET "key" = trim(both '-' from lower(regexp_replace(coalesce("type", 'custom') || '-' || "name", '[^a-zA-Z0-9]+', '-', 'g')))
WHERE "key" IS NULL;

WITH ranked AS (
  SELECT "id", "storeId", "key", row_number() OVER (PARTITION BY "storeId", "key" ORDER BY "createdAt", "id") AS rn
  FROM "SalesChannel"
)
UPDATE "SalesChannel" sc
SET "key" = sc."key" || '-' || substr(sc."id", 1, 8)
FROM ranked r
WHERE sc."id" = r."id" AND r.rn > 1;

ALTER TABLE "SalesChannel" ALTER COLUMN "key" SET NOT NULL;

DROP INDEX IF EXISTS "SalesChannel_storeId_type_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "SalesChannel_storeId_key_key" ON "SalesChannel"("storeId", "key");
CREATE INDEX IF NOT EXISTS "SalesChannel_priceListId_idx" ON "SalesChannel"("priceListId");

DO $$ BEGIN
  ALTER TABLE "SalesChannel" ADD CONSTRAINT "SalesChannel_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SalesChannelStockLocation" (
  "id" TEXT NOT NULL,
  "salesChannelId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesChannelStockLocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SalesChannelStockLocation_salesChannelId_warehouseId_key" ON "SalesChannelStockLocation"("salesChannelId", "warehouseId");
CREATE INDEX IF NOT EXISTS "SalesChannelStockLocation_warehouseId_active_priority_idx" ON "SalesChannelStockLocation"("warehouseId", "active", "priority");
DO $$ BEGIN
  ALTER TABLE "SalesChannelStockLocation" ADD CONSTRAINT "SalesChannelStockLocation_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SalesChannelStockLocation" ADD CONSTRAINT "SalesChannelStockLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "salesChannelId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "salesChannelSnapshot" JSONB;
CREATE INDEX IF NOT EXISTS "Order_storeId_salesChannelId_createdAt_idx" ON "Order"("storeId", "salesChannelId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS "ProductSalesChannel" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "salesChannelId" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "externalId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSalesChannel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductSalesChannel_productId_salesChannelId_key" ON "ProductSalesChannel"("productId","salesChannelId");
CREATE INDEX IF NOT EXISTS "ProductSalesChannel_salesChannelId_published_idx" ON "ProductSalesChannel"("salesChannelId","published");
CREATE INDEX IF NOT EXISTS "ProductSalesChannel_productId_published_idx" ON "ProductSalesChannel"("productId","published");
DO $$ BEGIN
  ALTER TABLE "ProductSalesChannel" ADD CONSTRAINT "ProductSalesChannel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProductSalesChannel" ADD CONSTRAINT "ProductSalesChannel_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "SalesChannel" ("id","storeId","key","name","type","active","isSystem","createdAt","updatedAt")
SELECT gen_random_uuid()::text, t."id", 'storefront', 'Online Mağaza', 'STOREFRONT', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "SalesChannel" sc WHERE sc."storeId"=t."id" AND sc."key"='storefront');

INSERT INTO "SalesChannel" ("id","storeId","key","name","type","active","isSystem","createdAt","updatedAt")
SELECT gen_random_uuid()::text, t."id", 'pos', 'POS / Hızlı Satış', 'POS', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "SalesChannel" sc WHERE sc."storeId"=t."id" AND sc."key"='pos');

INSERT INTO "SalesChannel" ("id","storeId","key","name","type","active","isSystem","createdAt","updatedAt")
SELECT gen_random_uuid()::text, t."id", 'admin', 'Yönetim Paneli', 'MANUAL', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "SalesChannel" sc WHERE sc."storeId"=t."id" AND sc."key"='admin');

INSERT INTO "ProductSalesChannel" ("id","productId","salesChannelId","published","createdAt","updatedAt")
SELECT gen_random_uuid()::text, p."id", sc."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" p
JOIN "SalesChannel" sc ON sc."storeId"=p."storeId" AND sc."key"='storefront'
WHERE NOT EXISTS (
  SELECT 1 FROM "ProductSalesChannel" psc
  WHERE psc."productId"=p."id" AND psc."salesChannelId"=sc."id"
);

-- B2B teklif talepleri mevcut soru kuyruğunu kullanır.
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'B2B_QUOTE';
