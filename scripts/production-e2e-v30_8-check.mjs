import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const gate=read('scripts/production-e2e-v30_8.mjs');
const deploy=read('deploy-final.sh');
const checks=[
 ['production E2E gate script exists',fs.existsSync('scripts/production-e2e-v30_8.mjs')],
 ['root production E2E script wired',pkg.scripts?.['verify:production-e2e']==='node scripts/production-e2e-v30_8.mjs'],
 ['gate includes v29.2 commerce E2E',gate.includes('e2e-commerce-v29_2-check.mjs')],
 ['gate includes v30 migration baseline',gate.includes('production-migration-v30-check.mjs')],
 ['gate includes API image verifier',gate.includes('api-image-v30_1-check.mjs')],
 ['gate includes concurrency verifier',gate.includes('production-concurrency-v30_2-check.mjs')],
 ['gate includes webhook verifier',gate.includes('payment-webhook-v30_3-check.mjs')],
 ['gate includes tenant isolation verifier',gate.includes('tenant-isolation-v30_4-check.mjs')],
 ['gate includes shipping rate verifier',gate.includes('shipping-rates-v30_5-check.mjs')],
 ['gate includes B2B credit verifier',gate.includes('b2b-credit-v30_6-check.mjs')],
 ['gate includes exchange verifier',gate.includes('exchange-completion-v30_7-check.mjs')],
 ['gate includes production security audit',gate.includes('security-audit-v29_8.mjs')],
 ['gate validates Prisma schema',gate.includes("'validate'")&&gate.includes('apps/api/prisma/schema.prisma')],
 ['gate generates Prisma client',gate.includes("'generate'")],
 ['gate has deterministic dummy DATABASE_URL',gate.includes('postgresql://ticarti_gate:ticarti_gate@127.0.0.1:5432/ticarti_gate?schema=public')],
 ['deploy blocks on production E2E gate',deploy.includes('node scripts/production-e2e-v30_8.mjs')],
 ['gate runs before API image build',deploy.indexOf('node scripts/production-e2e-v30_8.mjs') < deploy.indexOf('next "API image build"')],
];
let bad=0;
for(const [n,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${n}`);if(!ok)bad++;}
if(bad)process.exit(1);
console.log('Ticarti v30.8 production E2E gate verification: OK');
