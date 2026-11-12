CREATE TABLE "ProviderPaymentReceipt" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "purchaseType" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderPaymentReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProviderPaymentReceipt_provider_paymentId_key" ON "ProviderPaymentReceipt"("provider","paymentId");
CREATE UNIQUE INDEX "ProviderPaymentReceipt_purchaseType_purchaseId_key" ON "ProviderPaymentReceipt"("purchaseType","purchaseId");
CREATE INDEX "ProviderPaymentReceipt_tenantId_createdAt_idx" ON "ProviderPaymentReceipt"("tenantId","createdAt");
