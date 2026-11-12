import fs from 'node:fs';
const must=[
'apps/api/src/tenant-placement/capacity-planner.service.ts',
'apps/api/src/tenant-placement/capacity-planner.dto.ts',
'apps/api/src/tenant-placement/tenant-placement.module.ts',
'apps/api/src/superadmin/superadmin.controller.ts',
'scripts/gcp-provision-cells.mjs'
];
for(const f of must)if(!fs.existsSync(f))throw new Error(`missing ${f}`);
const svc=fs.readFileSync(must[0],'utf8');
for(const needle of ['10000','25','standard-','hv-','distributionPreview'])if(!svc.includes(needle))throw new Error(`capacity planner missing ${needle}`);
console.log('capacity-provisioning-check: OK');
