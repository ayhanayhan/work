import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const t=fs.readFileSync(path.join(root,'apps/admin/app/(protected)/products/components/product-editor-modal.tsx'),'utf8');

let failed=false;
const ok=(cond,label)=>{
  if(cond) console.log(`OK ${label}`);
  else { console.error(`FAIL ${label}`); failed=true; }
};

ok(!t.includes("mode==='create'"),"no invalid mode==='create'");
ok(t.includes("...(mode==='new'||!v.id?{stock:Number(v.stock||0)}:{})"),"new product/new variant stock initialization preserved");

if(failed) process.exit(1);
console.log('Ticarti Fix 9D mode new verification: OK');
