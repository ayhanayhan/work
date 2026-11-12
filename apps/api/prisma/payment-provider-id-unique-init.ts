import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Target = {
  table: 'PlanPayment' | 'ThemePayment';
  index: string;
};

const targets: Target[] = [
  { table: 'PlanPayment', index: 'PlanPayment_providerPaymentId_key' },
  { table: 'ThemePayment', index: 'ThemePayment_providerPaymentId_key' },
];

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ regclass: string | null }>>(
    `SELECT to_regclass('"${table}"')::text AS regclass`,
  );
  return Boolean(rows[0]?.regclass);
}

async function duplicateGroupCount(table: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT 1
      FROM "${table}"
      WHERE "providerPaymentId" IS NOT NULL
      GROUP BY "providerPaymentId"
      HAVING COUNT(*) > 1
    ) d
  `);
  return Number(rows[0]?.count ?? 0);
}

async function ensureUniqueIndex(target: Target) {
  if (!(await tableExists(target.table))) {
    console.log(`[db-init] ${target.table} henüz yok; index Prisma db push tarafından oluşturulacak.`);
    return;
  }

  const duplicates = await duplicateGroupCount(target.table);
  if (duplicates > 0) {
    throw new Error(
      `${target.table}.providerPaymentId üzerinde ${duplicates} duplicate grup bulundu. ` +
      `Veri otomatik değiştirilmedi; unique index oluşturulmadı.`,
    );
  }

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "${target.index}" ON "${target.table}" ("providerPaymentId")`,
  );

  const check = await prisma.$queryRawUnsafe<Array<{ unique: boolean }>>(`
    SELECT i.indisunique AS "unique"
    FROM pg_class c
    JOIN pg_index i ON i.indexrelid = c.oid
    WHERE c.relname = '${target.index.replaceAll("'", "''")}'
    LIMIT 1
  `);

  if (!check[0]?.unique) {
    throw new Error(`${target.index} mevcut ancak UNIQUE değil.`);
  }

  console.log(`[db-init] ${target.index}: OK`);
}

async function main() {
  console.log('[db-init] payment provider id unique-index preflight');
  for (const target of targets) {
    await ensureUniqueIndex(target);
  }
}

main()
  .catch((error) => {
    console.error('[db-init] unique-index preflight FAILED');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
