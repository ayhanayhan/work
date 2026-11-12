CREATE TABLE IF NOT EXISTS "B2BQuoteRequest" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "customerId" TEXT,
  "companyId" TEXT,
  "productId" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "companyName" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "subject" TEXT,
  "message" TEXT,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "response" TEXT,
  "internalNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "B2BQuoteRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "B2BQuoteRequest_storeId_status_createdAt_idx"
ON "B2BQuoteRequest"("storeId","status","createdAt");

CREATE INDEX IF NOT EXISTS "B2BQuoteRequest_customerId_idx"
ON "B2BQuoteRequest"("customerId");

CREATE INDEX IF NOT EXISTS "B2BQuoteRequest_companyId_idx"
ON "B2BQuoteRequest"("companyId");

CREATE INDEX IF NOT EXISTS "B2BQuoteRequest_productId_idx"
ON "B2BQuoteRequest"("productId");

INSERT INTO "B2BQuoteRequest" (
  "id","storeId","customerId","productId","email","subject","message",
  "status","response","internalNote","createdAt","updatedAt","payload"
)
SELECT
  q."id",
  q."storeId",
  q."customerId",
  q."productId",
  COALESCE(q."email",'unknown@invalid.local'),
  q."subject",
  q."question",
  CASE
    WHEN q."status"::text='NEW' THEN 'NEW'
    WHEN q."status"::text='ANSWERED' THEN 'QUOTED'
    WHEN q."status"::text='CLOSED' THEN 'CLOSED'
    ELSE 'IN_REVIEW'
  END,
  q."answer",
  q."internalNote",
  q."createdAt",
  q."updatedAt",
  jsonb_build_object('migratedFrom','Question','legacyQuestionType','B2B_QUOTE')
FROM "Question" q
WHERE q."type"::text='B2B_QUOTE'
ON CONFLICT ("id") DO NOTHING;

DELETE FROM "Question"
WHERE "type"::text='B2B_QUOTE';
