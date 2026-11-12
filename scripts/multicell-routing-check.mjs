import fs from 'node:fs';
const checks=[
 ['apps/api/src/cell-routing/runtime-context.ts',['AsyncLocalStorage','CellRuntimeState']],
 ['apps/api/src/prisma/prisma.service.ts',["envKey('DATABASE_URL'",'clientForPoolKey','control()']],
 ['apps/api/src/cell-routing/cell-routing.middleware.ts',['CELL_ROUTING_MODE','x-ticarti-store-key','apiBaseUrl','x-ticarti-routing-hop']],
 ['apps/api/src/tenant-placement/tenant-placement.service.ts',['redisPoolKey','databaseMode','resolveByStoreKey','Dedicated cell moves must use the migration/cutover workflow']],
 ['apps/api/src/tenant-placement/tenant-cell-migration.service.ts',['READY_FOR_CUTOVER','verify(id:string)','cutover(id:string)','sourceVersion']],
 ['apps/api/src/cache/cache.service.ts',["envKey('REDIS_URL'",'redisPoolKey']],
 ['apps/api/src/background-jobs/background-jobs.service.ts',['redisPoolKey','connectionForWorker']],
 ['apps/api/src/operations-worker/bullmq-worker.service.ts',['runInCell','redisPoolKey']],
 ['apps/storefront/lib/api.ts',['x-ticarti-store-key']],
 ['apps/api/prisma/schema.prisma',['model TenantCellMigration','CellDatabaseMode','redisPoolKey','apiBaseUrl']],
];
let failed=false;
for(const [file,needles] of checks){if(!fs.existsSync(file)){console.error('missing:',file);failed=true;continue}const text=fs.readFileSync(file,'utf8');for(const needle of needles)if(!text.includes(needle)){console.error('missing pattern:',file,needle);failed=true}}
if(failed)process.exit(1);console.log('multicell-routing-check: OK');
