import fs from 'node:fs';
const required=['JWT_SECRET','DATABASE_URL','PUBLIC_API_URL','MERCHANT_ADMIN_URL'];
const missing=required.filter(k=>!String(process.env[k]||'').trim());
const weak=[];if(String(process.env.JWT_SECRET||'').includes('dev-only'))weak.push('JWT_SECRET');
const schema=fs.readFileSync('apps/api/prisma/schema.prisma','utf8');
const checks=[['checkout idempotency',/idempotencyKey\s+String[\s\S]*@@unique\(\[storeId, idempotencyKey\]\)/],['billing profile',/model\s+Tenant\s*\{[\s\S]*?companyName\s+String\?[\s\S]*?taxNumber\s+String\?[\s\S]*?taxOffice\s+String\?[\s\S]*?addressText\s+String\?/],['support SLA',/slaDueAt/],['SEO scans',/model SeoScan/],['warehouse transfer pool',/model WarehouseTransferRequirement/]];
let failed=false;for(const [name,re] of checks){const ok=re.test(schema);console.log(ok?'OK  ':'FAIL',name);if(!ok)failed=true}
if(process.env.NODE_ENV==='production'&&missing.length){console.error('FAIL missing production env:',missing.join(', '));failed=true}
if(process.env.NODE_ENV==='production'&&weak.length){console.error('FAIL weak production env:',weak.join(', '));failed=true}
if(failed)process.exit(1);console.log('Production readiness static checks: OK');
