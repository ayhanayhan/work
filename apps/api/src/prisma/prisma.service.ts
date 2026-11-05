import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlatformSetting" (
        "key" TEXT PRIMARY KEY,
        "value" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Dedicated public-contact inbox table. Idempotent on Cloud Run cold starts.
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContactInquiry" (
        "id" TEXT PRIMARY KEY,
        "fullName" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "subject" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'NEW',
        "replyDraft" TEXT,
        "internalNote" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      )
    `);
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ContactInquiry_status_createdAt_idx" ON "ContactInquiry" ("status", "createdAt")');
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ContactInquiry_email_idx" ON "ContactInquiry" ("email")');
  }
  async onModuleDestroy() { await this.$disconnect(); }
}
