-- Ticarti v29.1 - billing schema compatibility
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY';

CREATE TABLE IF NOT EXISTS "BillingInvoice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planPaymentId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "providerPaymentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "billingInfo" JSONB,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingInvoice_planPaymentId_key" ON "BillingInvoice"("planPaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingInvoice_invoiceNumber_key" ON "BillingInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "BillingInvoice_tenantId_status_issuedAt_idx" ON "BillingInvoice"("tenantId", "status", "issuedAt");
