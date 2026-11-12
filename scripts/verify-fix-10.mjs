import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const adv=fs.readFileSync(path.join(root,'apps/api/src/merchant/advanced-commerce.service.ts'),'utf8');
const mer=fs.readFileSync(path.join(root,'apps/api/src/merchant/merchant.service.ts'),'utf8');

let failed=false;
const ok=(cond,label)=>{
  if(cond) console.log(`OK ${label}`);
  else { console.error(`FAIL ${label}`); failed=true; }
};

ok(adv.includes("import {MerchantService} from './merchant.service';"),'AdvancedCommerce imports MerchantService');
ok(adv.includes('private merchant:MerchantService'),'AdvancedCommerce injects MerchantService');
ok(adv.includes('completeDraftOrderViaCentralPipeline'),'completeDraft delegates to central pipeline');

const start=adv.indexOf('async completeDraft(');
const end=adv.indexOf('async receivePurchaseOrder(',start);
const complete=start>=0&&end>start?adv.slice(start,end):'';

ok(!complete.includes('order.create'),'draft completion no longer creates order directly');
ok(!complete.includes('30*60*1000'),'draft completion has no hard-coded reservation TTL');
ok(!complete.includes('warehouseStock.update'),'draft completion no longer reserves stock independently');

ok(mer.includes('async completeDraftOrderViaCentralPipeline'),'central draft bridge exists');
ok(mer.includes('await this.createManualOrder('),'draft bridge reuses createManualOrder');
ok(mer.includes("idempotencyKey:`draft:${id}`"),'draft conversion idempotency key exists');

const moStart=mer.indexOf('async createManualOrder(');
const moEnd=mer.indexOf('\n  async ',moStart+10)>0?mer.indexOf('\n  async ',moStart+10):mer.length;
const manual=mer.slice(moStart,moEnd);

ok(manual.includes('idempotencyKey:body?.idempotencyKey||null'),'createManualOrder persists optional idempotency key');
ok(mer.includes("source:'draft_order'"),'converted order source is draft_order');
ok(mer.includes("status:'COMPLETED',completedOrderId:order.id"),'draft completion link persisted');
ok(mer.includes("status:'DRAFT_CONVERTED'"),'draft conversion history persisted');

if(failed) process.exit(1);
console.log('Ticarti Fix 10 draft order central pipeline verification: OK');
