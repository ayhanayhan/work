ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "ticketNumber" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "relatedOrderId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "relatedIntegrationId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "slaDueAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "firstResponseAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "lastMerchantReplyAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "lastSupportReplyAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");
CREATE INDEX IF NOT EXISTS "SupportTicket_tenantId_status_updatedAt_idx" ON "SupportTicket"("tenantId","status","updatedAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedTo_status_updatedAt_idx" ON "SupportTicket"("assignedTo","status","updatedAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_slaDueAt_status_idx" ON "SupportTicket"("slaDueAt","status");

CREATE TABLE IF NOT EXISTS "SupportAttachment" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "messageId" TEXT,
  "name" TEXT,
  "url" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupportAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SupportAttachment_ticketId_createdAt_idx" ON "SupportAttachment"("ticketId","createdAt");
CREATE INDEX IF NOT EXISTS "SupportAttachment_messageId_idx" ON "SupportAttachment"("messageId");
CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId","createdAt");
