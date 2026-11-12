import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const p=path.join(root,'apps/admin/app/(protected)/products/components/product-editor-modal.tsx');
const t=fs.readFileSync(p,'utf8');

let failed=false;
const ok=(cond,label)=>{
  if(cond) console.log(`OK ${label}`);
  else { console.error(`FAIL ${label}`); failed=true; }
};

const start=t.indexOf('const blankVariant=');
const end=start>=0 ? t.indexOf('const blankDiscount=',start) : -1;
const body=start>=0 && end>start ? t.slice(start,end) : '';

ok(start>=0 && end>start,'blankVariant found');
ok(body.includes("model:''"),'blankVariant model default');
ok(body.includes("comparePrice:''"),'blankVariant comparePrice default');
ok(body.includes("cost:''"),'blankVariant cost default');

if(failed) process.exit(1);
console.log('Ticarti Fix 9C blank variant defaults verification: OK');
