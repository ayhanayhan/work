import fs from 'node:fs';

const root = process.argv[2] || process.cwd();
const checks = [
  ['schema unique membership user', /userId\s+String\s+@unique/, 'apps/api/prisma/schema.prisma'],
  ['single-store migration guard', /single-store migration blocked/, 'apps/api/prisma/migrations/20261030140000_single_store_account/migration.sql'],
  ['merchant auth singleton', /\.slice\(0,1\)\.map\(m => \(\{/, 'apps/api/src/merchant-auth/merchant-auth.service.ts'],
  ['second store creation blocked', /hesap başına tek mağaza kullanır/, 'apps/api/src/merchant/merchant.service.ts'],
  ['cross-store staff blocked', /başka bir Ticarti mağazasına bağlı/, 'apps/api/src/merchant/merchant.service.ts'],
  ['admin ignores store preference', /function selectedMembership\(rows:any\[\]\):any\{\s*if\(!rows\?\.length\)return null;\s*return rows\[0\];/s, 'apps/admin/app/components/AdminSession.tsx'],
  ['cleanup explicit confirmation', /DELETE-OTHER-STORES/, 'scripts/single-store-cleanup.mjs'],
];
let failed=false;
for (const [label,re,rel] of checks) {
  const p=`${root}/${rel}`;
  const t=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
  if (!re.test(t)) { console.error(`FAIL ${label}: ${rel}`); failed=true; }
  else console.log(`OK ${label}`);
}
if (failed) process.exit(1);
console.log('Ticarti single-store account verification: OK');
