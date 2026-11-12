import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const edoc=fs.readFileSync(path.join(root,'apps/api/src/edoc-core/edoc.service.ts'),'utf8');
const merchant=fs.readFileSync(path.join(root,'apps/api/src/merchant/merchant.service.ts'),'utf8');

let failed=false;
const ok=(cond,label)=>{if(cond)console.log(`OK ${label}`);else{console.error(`FAIL ${label}`);failed=true}};

const pos=edoc.indexOf('maybeAutoCreateForOrder(');
const nextAsync=edoc.indexOf('\n  async ',pos+10);
const nextPrivate=edoc.indexOf('\n  private ',pos+10);
const ends=[nextAsync,nextPrivate].filter(x=>x>pos);
const end=ends.length?Math.min(...ends):edoc.length;
const body=pos>=0?edoc.slice(pos,end):'';

ok(pos>=0,'maybeAutoCreateForOrder exists');
ok(body.includes("this.prisma.tenant.findUnique({where:{id:storeId},select:{settings:true}})"),'auto-create reads store settings');
ok(body.includes("?.taxInvoicePolicy||{}"),'taxInvoicePolicy is central source');
ok(body.includes("taxInvoicePolicy.autoCreateInvoice!==true"),'autoCreateInvoice explicitly gates automatic creation');
ok(body.includes("AUTO_CREATE_INVOICE_DISABLED"),'disabled policy returns explicit skip reason');
ok(merchant.includes("this.edoc.maybeAutoCreateForOrder(storeId,id,'PAYMENT_PAID')"),'merchant payment-paid trigger remains wired');

if(failed)process.exit(1);
console.log('Ticarti Fix 13 tax invoice auto-create policy verification: OK');
