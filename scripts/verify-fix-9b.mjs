import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const form=fs.readFileSync(path.join(root,'apps/admin/app/(protected)/products/components/product-editor-modal.tsx'),'utf8');
let failed=false;

function ok(cond,label){
  if(cond) console.log(`OK ${label}`);
  else { console.error(`FAIL ${label}`); failed=true; }
}

ok(/\bcomparePrice\b/.test(form),'comparePrice exists in product editor');
ok(/\bcost\b/.test(form),'cost exists in product editor');
ok(/\bmodel\b/.test(form),'model exists in product editor');

const typeHasCompare =
  /comparePrice\s*\??\s*:\s*(?:string\|number\|null|number\|string\|null)/.test(form) ||
  /comparePrice\s*\??\s*:\s*[^;]+;/.test(form);
const typeHasCost =
  /cost\s*\??\s*:\s*(?:string\|number\|null|number\|string\|null)/.test(form) ||
  /cost\s*\??\s*:\s*[^;]+;/.test(form);
const typeHasModel=/model\s*\??\s*:\s*string\s*;/.test(form);

ok(typeHasCompare,'variant type includes comparePrice');
ok(typeHasCost,'variant type includes cost');
ok(typeHasModel,'variant type includes model');
ok(form.includes('comparePrice:v.comparePrice'),'payload persists comparePrice');
ok(form.includes('cost:v.cost'),'payload persists cost');
ok(form.includes('model:v.model'),'payload persists model');

if(failed) process.exit(1);
console.log('Ticarti Fix 9B product variant type/hydration verification: OK');
