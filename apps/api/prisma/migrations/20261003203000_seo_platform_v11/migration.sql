ALTER TABLE "SeoAudit" ADD COLUMN IF NOT EXISTS "scanId" TEXT;
ALTER TABLE "SeoAudit" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE INDEX IF NOT EXISTS "SeoAudit_storeId_scanId_idx" ON "SeoAudit"("storeId", "scanId");

CREATE TABLE IF NOT EXISTS "SeoScan" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "score" INTEGER,
  "totals" JSONB,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "error" TEXT,
  "requestedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoScan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeoScan_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SeoScan_storeId_createdAt_idx" ON "SeoScan"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "SeoScan_status_createdAt_idx" ON "SeoScan"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "SeoNotFoundEvent" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "userAgent" TEXT,
  "hits" INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "redirectId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoNotFoundEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeoNotFoundEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SeoNotFoundEvent_storeId_path_key" ON "SeoNotFoundEvent"("storeId", "path");
CREATE INDEX IF NOT EXISTS "SeoNotFoundEvent_storeId_resolvedAt_lastSeenAt_idx" ON "SeoNotFoundEvent"("storeId", "resolvedAt", "lastSeenAt");
