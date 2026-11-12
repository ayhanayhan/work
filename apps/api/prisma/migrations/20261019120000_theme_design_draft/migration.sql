CREATE TABLE "ThemeDesignDraft" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThemeDesignDraft_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ThemeDesignDraft_tenantId_themeId_key" ON "ThemeDesignDraft"("tenantId", "themeId");
CREATE INDEX "ThemeDesignDraft_tenantId_updatedAt_idx" ON "ThemeDesignDraft"("tenantId", "updatedAt");
ALTER TABLE "ThemeDesignDraft" ADD CONSTRAINT "ThemeDesignDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
