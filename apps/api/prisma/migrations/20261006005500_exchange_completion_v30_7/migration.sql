ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'EXCHANGED';

ALTER TABLE "ReturnRequest"
  ADD COLUMN IF NOT EXISTS "exchangeOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "exchangeStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "exchangeCredit" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "exchangeAmountDue" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "exchangeRefundDue" DECIMAL(12,2);

CREATE INDEX IF NOT EXISTS "ReturnRequest_exchangeOrderId_idx"
  ON "ReturnRequest"("exchangeOrderId");
