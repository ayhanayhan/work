import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();let errors=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const must=(p,needle)=>{const s=read(p);if(!s.includes(needle))errors.push(`${p}: missing ${needle}`)};
const exists=p=>{if(!fs.existsSync(path.join(root,p)))errors.push(`${p}: missing file`)};
[
'apps/api/src/tenant-placement/tenant-placement.service.ts',
'apps/api/src/tenant-placement/tenant-placement.module.ts',
'apps/api/src/tenant-placement/tenant-placement.dto.ts',
'apps/api/prisma/migrations/20260928033000_tenant_cell_scale_foundation/migration.sql',
'apps/superadmin/app/components/InfrastructureScale.tsx',
'apps/superadmin/app/infrastructure/page.tsx',
].forEach(exists);
must('apps/api/prisma/schema.prisma','model InfrastructureCell');
must('apps/api/prisma/schema.prisma','model TenantPlacement');
must('apps/api/src/webhooks/event-outbox.service.ts','Tenant webhook backpressure');
must('apps/api/src/webhooks/event-outbox.service.ts','scanLimit');
must('apps/api/src/webhooks/event-outbox.service.ts','maxConcurrentJobs');
must('apps/api/src/background-jobs/background-jobs.service.ts','queueName');
must('apps/api/src/operations-worker/bullmq-worker.service.ts','BACKGROUND_WORKER_CELL_CODES');
must('apps/api/src/operations-worker/bullmq-worker.service.ts','BACKGROUND_WORKER_LANES');
must('apps/api/src/operations-worker/operations-worker.service.ts','fairTenantRows');
must('apps/api/src/operations-worker/operations-worker.service.ts','SHIPPING_WORKER_CONCURRENCY');
must('apps/api/src/common/tenant.guard.ts','CELL_ROUTING_ENFORCE');
must('apps/api/src/merchant-auth/merchant-auth.service.ts',"placement: { create:");
must('apps/api/src/merchant/merchant.service.ts',"placement:{create:");
must('apps/superadmin/app/infrastructure/page.tsx',"initialTab=\"Altyapı\"");
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('scale-foundation-check: OK');
