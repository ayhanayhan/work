CREATE TYPE "CellDatabaseMode" AS ENUM ('SHARED','DEDICATED');
CREATE TYPE "TenantCellMigrationStatus" AS ENUM ('PLANNED','COPYING','VERIFYING','READY_FOR_CUTOVER','CUTOVER','COMPLETED','FAILED','CANCELLED');
ALTER TABLE "InfrastructureCell" ADD COLUMN IF NOT EXISTS "databaseMode" "CellDatabaseMode" NOT NULL DEFAULT 'SHARED';
ALTER TABLE "InfrastructureCell" ADD COLUMN IF NOT EXISTS "apiBaseUrl" TEXT;
ALTER TABLE "InfrastructureCell" ADD COLUMN IF NOT EXISTS "redisPoolKey" TEXT NOT NULL DEFAULT 'primary';
CREATE INDEX IF NOT EXISTS "InfrastructureCell_databasePoolKey_status_idx" ON "InfrastructureCell"("databasePoolKey","status");
CREATE TABLE IF NOT EXISTS "TenantCellMigration" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceCellId" TEXT NOT NULL,
  "targetCellId" TEXT NOT NULL,
  "status" "TenantCellMigrationStatus" NOT NULL DEFAULT 'PLANNED',
  "sourceVersion" INTEGER NOT NULL,
  "verification" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "cutoverAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantCellMigration_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TenantCellMigration_tenantId_status_createdAt_idx" ON "TenantCellMigration"("tenantId","status","createdAt");
CREATE INDEX IF NOT EXISTS "TenantCellMigration_targetCellId_status_idx" ON "TenantCellMigration"("targetCellId","status");
DO $$ BEGIN
  ALTER TABLE "TenantCellMigration" ADD CONSTRAINT "TenantCellMigration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TenantCellMigration" ADD CONSTRAINT "TenantCellMigration_sourceCellId_fkey" FOREIGN KEY ("sourceCellId") REFERENCES "InfrastructureCell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TenantCellMigration" ADD CONSTRAINT "TenantCellMigration_targetCellId_fkey" FOREIGN KEY ("targetCellId") REFERENCES "InfrastructureCell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TYPE "TenantRouteKeyKind" AS ENUM ('MEDIA','CART','CUSTOMER_SESSION');
CREATE TABLE IF NOT EXISTS "TenantRouteKey" (
  "id" TEXT NOT NULL,
  "kind" "TenantRouteKeyKind" NOT NULL,
  "routeKey" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantRouteKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantRouteKey_kind_routeKey_key" ON "TenantRouteKey"("kind","routeKey");
CREATE INDEX IF NOT EXISTS "TenantRouteKey_tenantId_kind_idx" ON "TenantRouteKey"("tenantId","kind");
CREATE INDEX IF NOT EXISTS "TenantRouteKey_expiresAt_idx" ON "TenantRouteKey"("expiresAt");
DO $$ BEGIN
  ALTER TABLE "TenantRouteKey" ADD CONSTRAINT "TenantRouteKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
