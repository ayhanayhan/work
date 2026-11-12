import fs from 'node:fs';
const must=[
  ['apps/api/src/cell-routing/cell-routing.middleware.ts',['migration cutover','Uint8Array.from(b).buffer']],
  ['apps/api/src/tenant-placement/tenant-data-copy.service.ts',['syncTenant','compareTenant','pruneTarget']],
  ['apps/api/src/tenant-placement/tenant-cell-migration.service.ts',['autoRun','rollback','setWriteFreeze']],
  ['apps/api/src/superadmin/superadmin.controller.ts',['/auto-run','/rollback','/delta-sync']]
];
let bad=[];
for(const [p,needles] of must){if(!fs.existsSync(p)){bad.push(`missing ${p}`);continue;}const s=fs.readFileSync(p,'utf8');for(const n of needles)if(!s.includes(n.replace(/^\//,''))&&!s.includes(n))bad.push(`${p}: ${n}`)}
const middleware=fs.readFileSync('apps/api/src/cell-routing/cell-routing.middleware.ts','utf8');
if(middleware.includes("from 'express'"))bad.push('middleware still imports express types');
if(bad.length){console.error('tenant-migration-check FAILED');for(const b of bad)console.error('-',b);process.exit(1)}
console.log('tenant-migration-check: OK');
