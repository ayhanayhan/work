CREATE TABLE IF NOT EXISTS "GiftCardTransaction" (
  "id" TEXT NOT NULL,
  "giftCardId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "balanceAfter" DECIMAL(18,2) NOT NULL,
  "orderId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GiftCardTransaction_giftCardId_createdAt_idx" ON "GiftCardTransaction"("giftCardId","createdAt");
CREATE INDEX IF NOT EXISTS "GiftCardTransaction_orderId_idx" ON "GiftCardTransaction"("orderId");
DO $$ BEGIN
  ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
