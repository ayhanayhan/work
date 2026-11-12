ALTER TABLE "ThemeDefinition" ADD COLUMN IF NOT EXISTS "developerOrgId" TEXT;
ALTER TABLE "ThemeDefinition" ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT NOT NULL DEFAULT 'PUBLISHED';

CREATE INDEX IF NOT EXISTS "ThemeDefinition_developerOrgId_reviewStatus_idx"
ON "ThemeDefinition"("developerOrgId","reviewStatus");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ThemeDefinition_developerOrgId_fkey') THEN
    ALTER TABLE "ThemeDefinition" ADD CONSTRAINT "ThemeDefinition_developerOrgId_fkey"
    FOREIGN KEY ("developerOrgId") REFERENCES "DeveloperOrganization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ThemeDeveloperRelease" (
  "id" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "developerOrgId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "package" JSONB NOT NULL,
  "iconUrl" TEXT,
  "previewImageUrl" TEXT,
  "screenshots" JSONB,
  "submittedAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThemeDeveloperRelease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ThemeDeveloperRelease_themeId_version_key"
ON "ThemeDeveloperRelease"("themeId","version");

CREATE INDEX IF NOT EXISTS "ThemeDeveloperRelease_developerOrgId_status_createdAt_idx"
ON "ThemeDeveloperRelease"("developerOrgId","status","createdAt");

CREATE INDEX IF NOT EXISTS "ThemeDeveloperRelease_status_submittedAt_idx"
ON "ThemeDeveloperRelease"("status","submittedAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ThemeDeveloperRelease_themeId_fkey') THEN
    ALTER TABLE "ThemeDeveloperRelease" ADD CONSTRAINT "ThemeDeveloperRelease_themeId_fkey"
    FOREIGN KEY ("themeId") REFERENCES "ThemeDefinition"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ThemeDeveloperRelease_developerOrgId_fkey') THEN
    ALTER TABLE "ThemeDeveloperRelease" ADD CONSTRAINT "ThemeDeveloperRelease_developerOrgId_fkey"
    FOREIGN KEY ("developerOrgId") REFERENCES "DeveloperOrganization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "HelpArticle"
SET "translations"=replace("translations"::text,'apiticarti.com','dev.ticarti.com')::jsonb,
    "updatedAt"=CURRENT_TIMESTAMP
WHERE "translations"::text LIKE '%apiticarti.com%';
