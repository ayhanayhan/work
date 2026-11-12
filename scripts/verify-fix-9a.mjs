import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const api=fs.readFileSync(path.join(root,'apps/api/src/merchant/merchant.service.ts'),'utf8');
const schema=fs.readFileSync(path.join(root,'apps/api/prisma/schema.prisma'),'utf8');

let failed=false;
function ok(cond,label){
  if(cond) console.log(`OK ${label}`);
  else { console.error(`FAIL ${label}`); failed=true; }
}

ok(/model Variant \{[\s\S]*\bmodel\s+String\?/m.test(schema),'Variant.model schema field');

const persistence=[...api.matchAll(/mpn\s*:\s*([^,\n}]+),\s*model\s*:\s*([^,\n}]+),\s*hsCode\s*:/g)];
ok(persistence.length>=1,'API has model persistence next to MPN');

let consistent=true;
for(const m of persistence){
  const mpn=m[1].replace(/\s/g,'');
  const model=m[2].replace(/\s/g,'');
  if(mpn.includes('.mpn') && model !== mpn.replace('.mpn','.model')){
    consistent=false;
    break;
  }
}
ok(consistent,'model persistence uses same source as MPN');

ok(!/mpn\s*:\s*[^,\n}]+,\s*hsCode\s*:/.test(api),'no MPN persistence path skips model');

if(failed) process.exit(1);
console.log('Ticarti Fix 9A variant model persistence verification: OK');
