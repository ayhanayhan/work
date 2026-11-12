import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT to_regclass('public."SupportTicket"') IS NOT NULL AS "exists"
  `);

  if (!tableExists[0]?.exists) {
    console.log('[db-init] SupportTicket table absent; column/index preflight skipped');
    return;
  }

  const columnRows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'SupportTicket'
        AND column_name = 'ticketNumber'
    ) AS "exists"
  `);

  if (!columnRows[0]?.exists) {
    console.log('[db-init] SupportTicket.ticketNumber column missing; adding nullable TEXT column');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "SupportTicket"
      ADD COLUMN IF NOT EXISTS "ticketNumber" TEXT
    `);
    console.log('[db-init] SupportTicket.ticketNumber column: OK');
  }

  const duplicates = await prisma.$queryRawUnsafe<Array<{ ticketNumber: string; count: bigint }>>(`
    SELECT "ticketNumber", COUNT(*)::bigint AS count
    FROM "SupportTicket"
    WHERE "ticketNumber" IS NOT NULL
    GROUP BY "ticketNumber"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, "ticketNumber" ASC
    LIMIT 20
  `);

  if (duplicates.length > 0) {
    console.error('[db-init] BLOCKED: duplicate SupportTicket.ticketNumber values exist.');
    for (const row of duplicates) {
      console.error(`[db-init] duplicate ticketNumber=${row.ticketNumber} count=${row.count.toString()}`);
    }
    console.error('[db-init] No ticket rows were changed. Resolve duplicates explicitly before deploy.');
    process.exitCode = 2;
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_ticketNumber_key"
    ON "SupportTicket"("ticketNumber")
  `);

  const indexRows = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'SupportTicket'
      AND indexname = 'SupportTicket_ticketNumber_key'
  `);

  if (indexRows.length !== 1) {
    throw new Error('SupportTicket_ticketNumber_key was not created');
  }

  console.log('[db-init] SupportTicket.ticketNumber duplicate preflight: OK');
  console.log('[db-init] SupportTicket_ticketNumber_key: OK');
}

main()
  .catch((error) => {
    console.error('[db-init] SupportTicket column/unique-index preflight failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
