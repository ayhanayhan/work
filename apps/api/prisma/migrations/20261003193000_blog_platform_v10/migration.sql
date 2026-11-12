ALTER TABLE "BlogCategory" ADD COLUMN IF NOT EXISTS "canonicalUrl" TEXT;
ALTER TABLE "BlogCategory" ADD COLUMN IF NOT EXISTS "noIndex" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "BlogAuthor" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "email" TEXT,
  "role" TEXT,
  "imageUrl" TEXT,
  "bio" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "socialLinks" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogAuthor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlogAuthor_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogAuthor_storeId_slug_key" ON "BlogAuthor"("storeId","slug");
CREATE INDEX IF NOT EXISTS "BlogAuthor_storeId_isActive_name_idx" ON "BlogAuthor"("storeId","isActive","name");

ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "ogImageUrl" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "canonicalUrl" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "noIndex" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "readingTime" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
DO $$ BEGIN
  ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "BlogAuthor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "BlogPost_storeId_authorId_status_publishedAt_idx" ON "BlogPost"("storeId","authorId","status","publishedAt");
CREATE INDEX IF NOT EXISTS "BlogPost_storeId_isFeatured_status_publishedAt_idx" ON "BlogPost"("storeId","isFeatured","status","publishedAt");

CREATE TABLE IF NOT EXISTS "BlogPostRevision" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "actorUserId" TEXT,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogPostRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlogPostRevision_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BlogPostRevision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogPostRevision_postId_version_key" ON "BlogPostRevision"("postId","version");
CREATE INDEX IF NOT EXISTS "BlogPostRevision_storeId_createdAt_idx" ON "BlogPostRevision"("storeId","createdAt");
CREATE INDEX IF NOT EXISTS "BlogPostRevision_postId_createdAt_idx" ON "BlogPostRevision"("postId","createdAt");

CREATE TABLE IF NOT EXISTS "BlogPostRelation" (
  "postId" TEXT NOT NULL,
  "relatedPostId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "BlogPostRelation_pkey" PRIMARY KEY ("postId","relatedPostId"),
  CONSTRAINT "BlogPostRelation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BlogPostRelation_relatedPostId_fkey" FOREIGN KEY ("relatedPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "BlogPostRelation_relatedPostId_idx" ON "BlogPostRelation"("relatedPostId");
