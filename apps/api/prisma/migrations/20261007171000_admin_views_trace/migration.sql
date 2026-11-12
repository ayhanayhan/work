ALTER TABLE "EventOutbox" ADD COLUMN IF NOT EXISTS "traceId" TEXT;
CREATE INDEX IF NOT EXISTS "EventOutbox_traceId_idx" ON "EventOutbox"("traceId");

CREATE TABLE IF NOT EXISTS "SavedAdminView" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "query" JSONB NOT NULL,
  "columns" JSONB,
  "sort" JSONB,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedAdminView_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SavedAdminView_storeId_userId_resource_name_key" ON "SavedAdminView"("storeId","userId","resource","name");
CREATE INDEX IF NOT EXISTS "SavedAdminView_storeId_userId_resource_updatedAt_idx" ON "SavedAdminView"("storeId","userId","resource","updatedAt");
