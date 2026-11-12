CREATE TABLE IF NOT EXISTS "CheckoutInventoryHold" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'HELD',
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutInventoryHold_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CheckoutInventoryHold_storeId_cartId_idempotencyKey_variantId_warehouseId_key" ON "CheckoutInventoryHold"("storeId","cartId","idempotencyKey","variantId","warehouseId");
CREATE INDEX IF NOT EXISTS "CheckoutInventoryHold_storeId_status_expiresAt_idx" ON "CheckoutInventoryHold"("storeId","status","expiresAt");
CREATE INDEX IF NOT EXISTS "CheckoutInventoryHold_variantId_warehouseId_status_idx" ON "CheckoutInventoryHold"("variantId","warehouseId","status");
