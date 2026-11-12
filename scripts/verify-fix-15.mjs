import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const merchant=fs.readFileSync(path.join(root,'apps/api/src/merchant/merchant.service.ts'),'utf8');
const pos=fs.readFileSync(path.join(root,'apps/admin/app/(protected)/pos/page.tsx'),'utf8');
const advanced=fs.readFileSync(path.join(root,'apps/api/src/merchant/advanced-commerce.service.ts'),'utf8');

let failed=false;
const ok=(cond,label)=>{if(cond)console.log(`OK ${label}`);else{console.error(`FAIL ${label}`);failed=true}};

const start=merchant.indexOf('async completeDraftOrderViaCentralPipeline(');
const end=start>=0?merchant.indexOf('\n  async ',start+20):-1;
const block=start>=0?merchant.slice(start,end>start?end:merchant.length):'';

ok(start>=0,'central draft completion exists');
ok(block.includes('const pricingIntent:any='),'draft completion reads pricing intent');
ok(block.includes('draftManualDiscount'),'draft completion has explicit manual discount intent');
ok(block.includes('manualDiscount:draftManualDiscount'),'central manual order receives only manual discount intent');
ok(!/manualDiscount[^;\n]{0,300}draft\.discountTotal/.test(block),'aggregate draft discountTotal is not reused as manual discount');
ok(pos.includes("pricingIntent:{manualDiscount:discountNum>0?{type:'FIXED',value:discountNum}:{type:'NONE',value:0}"),'POS draft persists manual discount intent');
ok(advanced.includes('pricingIntent:{...((((b.metadata as any)||{}).pricingIntent as any)||{})'),'draft API preserves/normalizes pricing intent');
ok(block.includes("paymentMethod:pricingIntent?.paymentMethod||'BANK_TRANSFER'"),'draft completion reads payment intent');
ok(block.includes("paymentStatus:pricingIntent?.paymentStatus||'PENDING'"),'draft completion reads payment status intent');
ok(block.includes("deliveryType:pricingIntent?.deliveryType||'PICKUP'"),'draft completion reads delivery intent');
ok(block.includes("couponCode:pricingIntent?.couponCode||undefined"),'draft completion reads coupon intent');
ok(!block.includes("manualDiscount:{type:'FIXED',value:Number(draft.discountTotal"),'legacy total-as-manual pattern removed');

if(failed)process.exit(1);
console.log('Ticarti Fix 15 draft pricing intent / no double discount verification: OK');
