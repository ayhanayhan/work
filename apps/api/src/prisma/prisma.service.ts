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
  }
  async onModuleDestroy() { await this.$disconnect(); }
}
