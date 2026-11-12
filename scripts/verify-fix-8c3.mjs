import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const rel='apps/admin/app/(protected)/products/components/catalog-definition-manager.tsx';
const p=path.join(root,rel);
const t=fs.readFileSync(p,'utf8');

let failed=false;

function ok(cond,label){
  if(cond) console.log(`OK ${label}`);
  else { console.error(`FAIL ${label}`); failed=true; }
}

ok(!t.includes("'product-groups'"),'product-groups removed from admin type/config references');
ok(/const configs:Record<Kind,/.test(t),'configs still typed by Kind');

if(failed) process.exit(1);
console.log('Ticarti Fix 8C3 admin type cleanup verification: OK');
