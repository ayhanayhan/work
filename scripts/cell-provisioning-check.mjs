#!/usr/bin/env node
import fs from 'node:fs';
const checks=[
 ['apps/api/src/tenant-placement/cell-provisioning.service.ts','class CellProvisioningService'],
 ['apps/api/src/tenant-placement/cell-provisioning.service.ts','GCP_CELL_PROVISIONING_ENABLED'],
 ['apps/api/src/tenant-placement/cell-provisioning.service.ts','ensureControlRouterAccess'],
 ['apps/api/src/tenant-placement/cell-provisioning.service.ts','copyInvokerPolicy'],
 ['apps/api/src/tenant-placement/cell-provisioning.service.ts','secretmanager.googleapis.com'],
 ['apps/api/src/tenant-placement/cell-provisioning.service.ts','sqladmin.googleapis.com'],
 ['apps/api/src/tenant-placement/cell-provisioning.service.ts','redis.googleapis.com'],
 ['apps/api/src/tenant-placement/cell-provisioning.service.ts','run.googleapis.com'],
 ['apps/api/src/worker.ts','createServer'],
 ['apps/api/src/superadmin/superadmin.controller.ts','provision/reconcile'],
 ['apps/api/src/tenant-placement/capacity-planner.service.ts',"status:'DRAINING'"],
];
const errors=[];for(const [f,t] of checks){const s=fs.existsSync(f)?fs.readFileSync(f,'utf8'):'';if(!s.includes(t))errors.push(`${f}: missing ${t}`)}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('cell-provisioning-check: OK');
