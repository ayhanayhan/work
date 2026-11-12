ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "BillingInvoice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planPaymentId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "status" TEXT NOT NULL DEFAULT 'PAID',
  "billingInfo" JSONB,
  "providerPaymentId" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "pdfUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BillingInvoice_planPaymentId_key" ON "BillingInvoice"("planPaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingInvoice_invoiceNumber_key" ON "BillingInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "BillingInvoice_tenantId_issuedAt_idx" ON "BillingInvoice"("tenantId", "issuedAt");
CREATE INDEX IF NOT EXISTS "BillingInvoice_tenantId_status_idx" ON "BillingInvoice"("tenantId", "status");
DO $$ BEGIN
  ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_planPaymentId_fkey" FOREIGN KEY ("planPaymentId") REFERENCES "PlanPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
