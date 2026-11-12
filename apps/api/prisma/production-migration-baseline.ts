import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const schema = 'prisma/schema.prisma';
const migrationsDir = 'prisma/migrations';

function fail(message: string, code = 3): never {
  console.error(`[db-init] BLOCKED: ${message}`);
  process.exit(code);
}

function runPrisma(args: string[], opts: { capture?: boolean } = {}) {
  const r = spawnSync('npx', ['prisma', ...args], {
    encoding: 'utf8',
    env: process.env,
    stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    if (opts.capture) {
      if (r.stdout) process.stdout.write(r.stdout);
      if (r.stderr) process.stderr.write(r.stderr);
    }
    throw new Error(`prisma ${args[0]} ${args[1] || ''} failed with exit code ${r.status}`);
  }
  return opts.capture ? String(r.stdout || '') : '';
}

function migrationNames(): string[] {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs.readdirSync(migrationsDir, { withFileTypes: true })
    .filter((x) => x.isDirectory() && /^\d/.test(x.name))
    .map((x) => x.name)
    .sort();
}

async function appliedMigrationNames(): Promise<Set<string>> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      `SELECT migration_name
         FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
          AND rolled_back_at IS NULL`
    );
    return new Set(rows.map((x) => x.migration_name));
  } catch {
    return new Set();
  }
}

function isContiguousPendingTail(all: string[], applied: Set<string>, missing: string[]): boolean {
  if (!missing.length) return false;
  const firstMissing = all.findIndex((name) => !applied.has(name));
  if (firstMissing < 0) return false;

  // Safe normal Prisma case: every migration before the first missing one is
  // already applied, and every migration from that point onward is pending.
  // Do NOT baseline these migrations: migrate deploy must execute their SQL,
  // including custom functions/triggers that Prisma schema diff cannot model.
  for (let i = 0; i < firstMissing; i += 1) {
    if (!applied.has(all[i])) return false;
  }
  for (let i = firstMissing; i < all.length; i += 1) {
    if (applied.has(all[i])) return false;
  }
  return missing.length === all.length - firstMissing;
}

async function userTableCount(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count
       FROM pg_tables
      WHERE schemaname = current_schema()
        AND tablename <> '_prisma_migrations'`
  );
  return Number(rows[0]?.count || 0);
}

function diffSql(): string {
  return runPrisma([
    'migrate', 'diff',
    '--from-schema-datasource', schema,
    '--to-schema-datamodel', schema,
    '--script',
  ], { capture: true });
}

function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
}

function statements(sql: string): string[] {
  const cleaned = stripSqlComments(sql);
  if (!cleaned) return [];
  return cleaned
    .split(/;\s*(?:\n|$)/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.endsWith(';') ? x : `${x};`);
}

function normalize(stmt: string): string {
  return stmt.replace(/\s+/g, ' ').trim();
}

function isSafeAdditive(stmt: string): boolean {
  const s = normalize(stmt);
  return (
    /^ALTER TYPE ".+" ADD VALUE(?: IF NOT EXISTS)? '.+';$/i.test(s) ||
    /^ALTER TABLE ".+" ADD COLUMN ".+" .+;$/i.test(s) ||
    /^ALTER TABLE ".+" ADD CONSTRAINT ".+" (?:FOREIGN KEY|UNIQUE|CHECK) .+;$/i.test(s) ||
    /^CREATE (?:UNIQUE )?INDEX ".+" ON ".+"\s*\(.+\)(?:\s+.+)?;$/i.test(s)
  );
}

function isBenignDbOnlyIndex(stmt: string): boolean {
  const s = normalize(stmt);
  return /^DROP INDEX ".+";$/i.test(s);
}

function isForbidden(stmt: string): boolean {
  const s = normalize(stmt).toUpperCase();
  return (
    s.startsWith('DROP TABLE') ||
    s.startsWith('DROP COLUMN') ||
    s.startsWith('ALTER TABLE') && (
      s.includes(' DROP COLUMN ') ||
      s.includes(' ALTER COLUMN ') ||
      s.includes(' RENAME ') ||
      s.includes(' DROP CONSTRAINT ')
    ) ||
    s.startsWith('DELETE ') ||
    s.startsWith('UPDATE ') ||
    s.startsWith('TRUNCATE ') ||
    s.startsWith('DROP TYPE')
  );
}

async function applySafeAdditiveDrift(sql: string): Promise<void> {
  const parts = statements(sql);
  const additive = parts.filter(isSafeAdditive);
  const benign = parts.filter(isBenignDbOnlyIndex);
  const unknown = parts.filter((x) => !isSafeAdditive(x) && !isBenignDbOnlyIndex(x));

  if (unknown.length) {
    console.error('[db-init] unexpected schema drift statements:');
    for (const s of unknown) console.error(`  ${normalize(s)}`);
    fail('schema drift contains operations outside the safe additive allowlist');
  }

  for (const s of additive) {
    if (isForbidden(s)) fail(`unsafe migration statement rejected: ${normalize(s)}`);
  }

  if (benign.length) {
    console.log(`[db-init] preserving ${benign.length} database-only performance index(es)`);
  }

  if (!additive.length) return;

  console.log(`[db-init] applying ${additive.length} safe additive schema repair statement(s)`);
  for (const s of additive) {
    console.log(`[db-init] additive repair: ${normalize(s).slice(0, 220)}`);
    await prisma.$executeRawUnsafe(s);
  }
}

async function assertOnlyBenignIndexDrift(): Promise<void> {
  const remaining = statements(diffSql());
  if (!remaining.length) {
    console.log('[db-init] schema equivalence after additive repair: OK');
    return;
  }

  const unexpected = remaining.filter((s) => !isBenignDbOnlyIndex(s));
  if (unexpected.length) {
    console.error('[db-init] remaining non-benign schema drift:');
    for (const s of unexpected) console.error(`  ${normalize(s)}`);
    fail('database schema still differs from Prisma schema after safe additive repair');
  }

  console.log(`[db-init] schema aligned; preserving ${remaining.length} database-only non-destructive index(es)`);
}

async function resolveMissing(missing: string[]) {
  for (const name of missing) {
    console.log(`[db-init] baselining migration as applied: ${name}`);
    runPrisma(['migrate', 'resolve', '--applied', name, '--schema', schema]);
  }
}

async function main() {
  const all = migrationNames();
  const applied = await appliedMigrationNames();
  const missing = all.filter((x) => !applied.has(x));
  const strictProduction = process.env.NODE_ENV === 'production' || process.env.TICARTI_STRICT_MIGRATIONS === 'YES';
  if (strictProduction) {
    // Existing production databases must never be bootstrapped or repaired implicitly.
    // This gate executes BEFORE db push, additive repair, or migrate resolve paths.
    const tableCount = await userTableCount();
    if (tableCount === 0) fail('strict migration mode rejects empty database bootstrap');
    if (missing.length && !isContiguousPendingTail(all, applied, missing)) {
      fail('strict migration mode rejects non-contiguous migration history');
    }
    console.log(`[db-init] strict migration history: ${missing.length} contiguous pending migration(s)`);
    runPrisma(['migrate', 'deploy', '--schema', schema]);
    return;
  }

  if (!missing.length) {
    console.log('[db-init] migration history complete; applying pending Prisma migrations');
    runPrisma(['migrate', 'deploy', '--schema', schema]);
    return;
  }

  // Detect a truly empty schema before the contiguous-tail check. On a brand-new
  // database every historical migration is technically a contiguous pending tail,
  // but this repository's oldest migrations are upgrades (indexes, etc.) rather
  // than the original schema creation. A normal migrate deploy therefore cannot
  // bootstrap core tables such as Order.
  const tableCount = await userTableCount();
  if (tableCount === 0) {
    console.log('[db-init] fresh empty database detected; bootstrapping current Prisma schema');

    // db push is deliberately restricted to this exact empty-database branch.
    // No destructive acceptance flag is used. Existing databases never enter it.
    runPrisma(['db', 'push', '--schema', schema, '--skip-generate']);

    // Prisma's datamodel cannot represent all DB-only objects. Re-apply the
    // idempotent custom SQL required by the current platform before baselining.
    runPrisma(['db', 'execute', '--file', path.join(migrationsDir, '20260928013000_scale_indexes', 'migration.sql'), '--schema', schema]);
    runPrisma(['db', 'execute', '--file', path.join(migrationsDir, '20261007170000_core_inventory_ledger', 'migration.sql'), '--schema', schema]);

    await assertOnlyBenignIndexDrift();

    console.log(`[db-init] fresh schema bootstrapped; baselining ${missing.length} historical migration(s)`);
    await resolveMissing(missing);

    console.log('[db-init] verifying no pending Prisma migrations remain');
    runPrisma(['migrate', 'deploy', '--schema', schema]);
    return;
  }

  if (isContiguousPendingTail(all, applied, missing)) {
    console.log(`[db-init] ${missing.length} contiguous pending migration(s) at history tail; applying normally`);
    for (const name of missing) console.log(`[db-init] pending migration: ${name}`);
    // Do NOT baseline these migrations. migrate deploy must execute their SQL,
    // including custom functions/triggers that Prisma schema diff cannot model.
    runPrisma(['migrate', 'deploy', '--schema', schema]);
    return;
  }

  console.log(`[db-init] migration history missing ${missing.length} migration(s); checking safe schema alignment before baseline`);

  const initial = diffSql();
  const initialStatements = statements(initial);

  if (initialStatements.length) {
    for (const s of initialStatements) {
      if (isForbidden(s)) {
        fail(`destructive schema drift rejected: ${normalize(s)}`);
      }
    }
    await applySafeAdditiveDrift(initial);
  }

  await assertOnlyBenignIndexDrift();

  console.log('[db-init] migration history may now be baselined: target schema is present and only DB-only indexes may differ');
  await resolveMissing(missing);

  console.log('[db-init] applying remaining Prisma migrations');
  runPrisma(['migrate', 'deploy', '--schema', schema]);
}

main()
  .catch((err) => {
    console.error('[db-init] production migration baseline/deploy failed');
    console.error(err instanceof Error ? err.stack || err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
