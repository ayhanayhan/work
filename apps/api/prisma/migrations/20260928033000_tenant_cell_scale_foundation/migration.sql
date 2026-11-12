-- Ticarti scale foundation: tenant placement/cell metadata.
CREATE TYPE "InfrastructureCellStatus" AS ENUM ('ACTIVE','DRAINING','READ_ONLY','DISABLED');
CREATE TYPE "TenantWorkloadClass" AS ENUM ('STANDARD','BUSY','HIGH_VOLUME','DEDICATED');
CREATE TYPE "TenantIsolationLevel" AS ENUM ('SHARED','ISOLATED_WORKERS','DEDICATED_CELL');

CREATE TABLE "InfrastructureCell" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "region" TEXT NOT NULL DEFAULT 'europe-west1',
  "status" "InfrastructureCellStatus" NOT NULL DEFAULT 'ACTIVE',
  "databasePoolKey" TEXT NOT NULL DEFAULT 'primary',
  "redisNamespace" TEXT NOT NULL DEFAULT 'ticarti',
  "queueShardCount" INTEGER NOT NULL DEFAULT 8,
  "maxTenants" INTEGER NOT NULL DEFAULT 5000,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfrastructureCell_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InfrastructureCell_code_key" ON "InfrastructureCell"("code");
CREATE INDEX "InfrastructureCell_status_region_idx" ON "InfrastructureCell"("status","region");

CREATE TABLE "TenantPlacement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "cellId" TEXT NOT NULL,
  "workloadClass" "TenantWorkloadClass" NOT NULL DEFAULT 'STANDARD',
  "isolationLevel" "TenantIsolationLevel" NOT NULL DEFAULT 'SHARED',
  "queueShard" INTEGER,
  "maxConcurrentJobs" INTEGER NOT NULL DEFAULT 2,
  "webhookRatePerSecond" INTEGER NOT NULL DEFAULT 20,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "version" INTEGER NOT NULL DEFAULT 1,
  "movedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantPlacement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TenantPlacement_tenantId_key" ON "TenantPlacement"("tenantId");
CREATE INDEX "TenantPlacement_cellId_workloadClass_idx" ON "TenantPlacement"("cellId","workloadClass");
CREATE INDEX "TenantPlacement_workloadClass_isolationLevel_idx" ON "TenantPlacement"("workloadClass","isolationLevel");
ALTER TABLE "TenantPlacement" ADD CONSTRAINT "TenantPlacement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantPlacement" ADD CONSTRAINT "TenantPlacement_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "InfrastructureCell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "InfrastructureCell" ("id","code","region","status","databasePoolKey","redisNamespace","queueShardCount","maxTenants","updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001','primary','europe-west1','ACTIVE','primary','ticarti',8,5000,CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "TenantPlacement" ("id","tenantId","cellId","workloadClass","isolationLevel","maxConcurrentJobs","webhookRatePerSecond","priority","version","updatedAt")
SELECT 'placement-' || t."id",t."id",c."id",'STANDARD','SHARED',2,20,100,1,CURRENT_TIMESTAMP
FROM "Tenant" t
JOIN "InfrastructureCell" c ON c."code"='primary'
LEFT JOIN "TenantPlacement" p ON p."tenantId"=t."id"
WHERE p."tenantId" IS NULL;
