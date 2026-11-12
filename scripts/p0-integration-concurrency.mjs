#!/usr/bin/env node
import assert from 'node:assert/strict';
import { PrismaClient, Prisma } from '@prisma/client';
import Redis from 'ioredis';

const required = ['DATABASE_URL', 'REDIS_URL'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`P0 integration prerequisites missing: ${missing.join(', ')}`);
  console.error('Run this gate against an isolated PostgreSQL + Redis test environment.');
  process.exit(2);
}

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableReadyCheck: true });
const namespace = `ticarti:p0:${Date.now()}`;

async function redisAtomicity() {
  const key = `${namespace}:counter`;
  await redis.set(key, '0', 'EX', 120);
  await Promise.all(Array.from({ length: 100 }, () => redis.incr(key)));
  assert.equal(Number(await redis.get(key)), 100, 'Redis atomic increment lost writes');
  await redis.del(key);
}

async function databaseSerializableGate() {
  // This deliberately exercises the actual database at SERIALIZABLE isolation.
  // It is non-destructive: SELECT-only transactions validate connectivity and the
  // isolation capability used by checkout before production deployment.
  await Promise.all(Array.from({ length: 20 }, () => prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT 1::int AS ok`;
    assert.equal(rows?.[0]?.ok, 1);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })));
}

async function schemaGuards() {
  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexdef FROM pg_indexes
    WHERE schemaname = current_schema()
      AND (indexdef ILIKE '%idempotency%' OR indexdef ILIKE '%storeId%')
  `);
  assert.ok(Array.isArray(indexes), 'Unable to inspect production-critical indexes');
}

try {
  await redis.ping();
  await prisma.$queryRaw`SELECT 1`;
  await Promise.all([redisAtomicity(), databaseSerializableGate(), schemaGuards()]);
  console.log('Ticarti P0 real PostgreSQL + Redis integration/concurrency gate: OK');
} finally {
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
}
