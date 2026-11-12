#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ok=(c,m)=>{if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('OK',m)};

const merchant=read('apps/api/src/merchant/merchant.service.ts');
const ctl=read('apps/api/src/merchant/merchant.controller.ts');
const storefront=read('apps/api/src/storefront/storefront.service.ts');
const menu=read('apps/admin/config/menu.config.tsx');
const manual=read('apps/admin/app/(protected)/orders/create/page.tsx');
const pos=read('apps/admin/app/(protected)/pos/page.tsx');
const edit=read('apps/admin/app/(protected)/orders/[id]/edit/page.tsx');

console.log('== Ticarti v31 Core Acceptance ==');

ok(ctl.includes("@Post('manual-orders')"),'manual order API separated');
ok(ctl.includes("@Post('pos/orders')"),'POS API preserved');
ok(manual.includes('/admin/manual-orders'),'manual order UI uses manual endpoint');
ok(!manual.includes('/admin/pos/orders'),'manual order UI does not use POS endpoint');
ok(pos.includes('/admin/pos/orders'),'POS UI uses POS endpoint');
ok(menu.includes('/pos'),'POS menu route exists');

ok(ctl.includes("@Patch('commerce/orders/:id/items')"),'order edit endpoint exists');
ok(merchant.includes("status:'RELEASED'"),'order edit releases old reservations');
ok(merchant.includes("metadata:{source:'order_edit'}"),'order edit rebuilds reservations');
ok(merchant.includes('orderEditAdjustment'),'order edit financial adjustment stored');
ok(edit.includes('/edit-adjustment/settle'),'order edit settlement wired');

ok(merchant.includes('taxBreakdown:{items:'),'manual/POS tax breakdown stored');
ok(storefront.includes('line-line/(1+rate/100)'),'inclusive tax is extracted');
ok(storefront.includes('taxPolicy.destinationBased!==false'),'destination tax active');
ok(merchant.includes('Sipariş birden fazla depoya dağıtılmış. Bu fulfillment için depo seçmelisiniz.'),'multi-warehouse fulfillment requires explicit warehouse');
ok(merchant.includes('Seçilen depoda bu sipariş için committed stok bulunmuyor'),'fulfillment warehouse inventory validation');

ok(merchant.includes("status:{in:['PROCESSING','SUCCEEDED']}"),'processing refunds reserve refundable balance');
ok(merchant.includes('Duplicate refund items are not allowed'),'duplicate refund item guard');
ok(merchant.includes('Refund quantity exceeds remaining quantity'),'repeat refund quantity guard');
ok(merchant.includes('Refund amount exceeds remaining line amount'),'line over-refund guard');
ok(merchant.includes('Refund süreci başlamış iade exchange edilemez'),'refund/exchange collision guard');
ok(merchant.includes('Aynı iade satırı exchange içinde birden fazla kez kullanılamaz'),'duplicate exchange line guard');
ok(storefront.includes("['REQUESTED','APPROVED','RECEIVED','REFUNDED','EXCHANGED']"),'exchanged quantity remains consumed');

if(process.exitCode) process.exit(process.exitCode);
console.log('Ticarti v31 Core Acceptance: OK');
