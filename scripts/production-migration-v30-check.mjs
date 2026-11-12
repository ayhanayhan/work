#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||process.cwd());
const dbInit=fs.readFileSync(path.join(root,'apps/api/db-init.sh'),'utf8');
const baseline=fs.readFileSync(path.join(root,'apps/api/prisma/production-migration-baseline.ts'),'utf8');

let failed=false;
const ok=(label,cond)=>{if(cond)console.log(`OK ${label}`);else{console.error(`FAIL ${label}`);failed=true;}};

const freshMarker="if (tableCount === 0)";
const freshIdx=baseline.indexOf(freshMarker);
const pushIdx=baseline.indexOf("runPrisma(['db', 'push'");
const tailIdx=baseline.indexOf('if (isContiguousPendingTail(all, applied, missing))', pushIdx);
const resolveIdx=baseline.indexOf('resolveMissing(missing)');
const pushMatches=[...baseline.matchAll(/runPrisma\(\['db',\s*'push'/g)];

ok('db-init uses production migration baseline', dbInit.includes('production-migration-baseline'));
ok('fresh DB db push is bounded to empty-schema branch',
   freshIdx >= 0 && pushIdx > freshIdx && pushMatches.length === 1 && tailIdx > pushIdx);
ok('production shell has no direct db push', !/\bprisma\s+db\s+push\b/.test(dbInit));
ok('Prisma 6 datamodel diff flag', baseline.includes('--to-schema-datamodel'));
ok('live DB diff uses schema datasource', baseline.includes('--from-schema-datasource'));
ok('safe additive allowlist exists',
   baseline.includes('isSafeAdditive') &&
   baseline.includes('ALTER TYPE') &&
   baseline.includes('ADD COLUMN') &&
   baseline.includes('CREATE (?:UNIQUE )?INDEX'));
ok('Prisma CREATE INDEX syntax accepted', baseline.includes('\\s*\\(.+\\)'));
ok('destructive drift blocked',
   baseline.includes('destructive schema drift rejected') &&
   baseline.includes('DROP TABLE') &&
   baseline.includes('DROP COLUMN') &&
   baseline.includes('TRUNCATE'));
ok('database-only indexes preserved',
   baseline.includes('isBenignDbOnlyIndex') &&
   baseline.includes('preserving') &&
   baseline.includes('DROP INDEX'));
ok('post-repair drift rechecked', baseline.includes('assertOnlyBenignIndexDrift'));
ok('baseline only after safe alignment',
   baseline.indexOf('assertOnlyBenignIndexDrift') < resolveIdx);
ok('migrate resolve remains explicit', baseline.includes("'resolve'") && baseline.includes("'--applied'"));
ok('migrate deploy remains final schema action', baseline.includes("'migrate', 'deploy'"));
ok('fresh empty database bootstrap is bounded',
   baseline.includes('fresh empty database detected; bootstrapping current Prisma schema') &&
   baseline.includes('tableCount === 0') &&
   baseline.includes("'--skip-generate'"));
ok('fresh bootstrap restores DB-only custom SQL',
   baseline.includes("20260928013000_scale_indexes") &&
   baseline.includes("20261007170000_core_inventory_ledger") &&
   baseline.includes("'db', 'execute'"));
ok('fresh bootstrap precedes pending-tail classification', freshIdx >= 0 && tailIdx > freshIdx);
ok('contiguous pending tail uses normal migrate deploy',
   baseline.includes('isContiguousPendingTail') &&
   baseline.includes('contiguous pending migration(s) at history tail') &&
   tailIdx >= 0);
ok('pending tail preserves custom migration SQL',
   baseline.includes('Do NOT baseline these migrations') &&
   baseline.includes('custom functions/triggers'));
ok('no accept-data-loss', !baseline.includes('accept-data-loss') && !dbInit.includes('accept-data-loss'));

if(failed) process.exit(1);
console.log('Ticarti v33.0.5.1 production migration verification: OK');
