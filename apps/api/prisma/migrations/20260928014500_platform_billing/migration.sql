CREATE TABLE "BillingCoupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
  "value" DECIMAL(12,2) NOT NULL,
  "minAmount" DECIMAL(12,2),
  "maxDiscount" DECIMAL(12,2),
  "appliesTo" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "perTenantLimit" INTEGER,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCoupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingCoupon_code_key" ON "BillingCoupon"("code");
CREATE INDEX "BillingCoupon_isActive_startsAt_endsAt_idx" ON "BillingCoupon"("isActive","startsAt","endsAt");

CREATE TABLE "PlatformPurchase" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "couponCode" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'IYZICO',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "conversationId" TEXT NOT NULL,
  "token" TEXT,
  "providerPaymentId" TEXT,
  "billingInfo" JSONB,
  "metadata" JSONB,
  "raw" JSONB,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformPurchase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformPurchase_conversationId_key" ON "PlatformPurchase"("conversationId");
CREATE UNIQUE INDEX "PlatformPurchase_providerPaymentId_key" ON "PlatformPurchase"("providerPaymentId");
CREATE INDEX "PlatformPurchase_tenantId_status_createdAt_idx" ON "PlatformPurchase"("tenantId","status","createdAt");
CREATE INDEX "PlatformPurchase_kind_targetId_status_idx" ON "PlatformPurchase"("kind","targetId","status");
CREATE INDEX "PlatformPurchase_couponCode_status_idx" ON "PlatformPurchase"("couponCode","status");

CREATE TABLE "EmailCreditPackage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "credits" INTEGER NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailCreditPackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailCreditPackage_code_key" ON "EmailCreditPackage"("code");

CREATE TABLE "EmailCreditWallet" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "lifetimePurchased" INTEGER NOT NULL DEFAULT 0,
  "lifetimeUsed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailCreditWallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailCreditWallet_tenantId_key" ON "EmailCreditWallet"("tenantId");

CREATE TABLE "EmailCreditLedger" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT,
  "referenceId" TEXT,
  "description" TEXT,
  "balanceAfter" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailCreditLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailCreditLedger_walletId_createdAt_idx" ON "EmailCreditLedger"("walletId","createdAt");
CREATE INDEX "EmailCreditLedger_referenceId_idx" ON "EmailCreditLedger"("referenceId");

ALTER TABLE "ThemePayment" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2);
ALTER TABLE "ThemePayment" ADD COLUMN IF NOT EXISTS "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ThemePayment" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ThemePayment_providerPaymentId_key" ON "ThemePayment"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "ThemePayment_tenantId_couponCode_status_idx" ON "ThemePayment"("tenantId","couponCode","status");
ALTER TABLE "PlanPayment" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2);
ALTER TABLE "PlanPayment" ADD COLUMN IF NOT EXISTS "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "PlanPayment" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PlanPayment_providerPaymentId_key" ON "PlanPayment"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "PlanPayment_tenantId_couponCode_status_idx" ON "PlanPayment"("tenantId","couponCode","status");

ALTER TABLE "PlatformPurchase" ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "PlatformPurchase" ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP(3);

ALTER TABLE "EmailCreditWallet" ADD COLUMN IF NOT EXISTS "reserved" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailMarketingJob" ADD COLUMN IF NOT EXISTS "creditReserved" BOOLEAN NOT NULL DEFAULT false;
