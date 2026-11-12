import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

const merchant=read('apps/api/src/merchant/merchant.service.ts');
const storefront=read('apps/api/src/storefront/storefront.service.ts');
const stripe=read('apps/api/src/installed-modules/payment-stripe/stripe-payment.service.ts');
const stripeModule=read('apps/api/src/installed-modules/payment-stripe/stripe-payment.module.ts');
const edoc=read('apps/api/src/edoc-core/edoc.service.ts');

let failed=false;
const ok=(cond,label)=>{
  if(cond)console.log(`OK ${label}`);
  else{console.error(`FAIL ${label}`);failed=true;}
};

ok(edoc.includes("taxInvoicePolicy.autoCreateInvoice!==true"),'Fix 13 autoCreateInvoice gate preserved');
ok(!merchant.includes("'POS_PAID'"),'unsupported POS_PAID absent');
ok(!merchant.includes("'MANUAL_ORDER_PAID'"),'unsupported MANUAL_ORDER_PAID absent');
ok(merchant.includes("maybeAutoCreateForOrder(storeId,result.id,'PAYMENT_PAID')"),'merchant paid triggers use PAYMENT_PAID');

ok(storefront.includes("const checkoutResult:any=await this.prisma.$transaction(async tx=>{"),'checkout transaction result captured outside transaction');
ok(storefront.includes("maybeAutoCreateForOrder(cart.storeId,checkoutResult.order.id,'PAYMENT_PAID')"),'checkout direct-paid trigger after transaction');
ok(storefront.includes("maybeAutoCreateForOrder(cartIdentity.storeId,existing.id,'PAYMENT_PAID')"),'checkout idempotent existing-paid trigger wired');
ok(storefront.includes("maybeAutoCreateForOrder(cart.storeId,prior.id,'PAYMENT_PAID')"),'checkout conflict replay paid trigger wired');

ok(stripe.includes("import { EDocumentService } from '../../edoc-core/edoc.service';"),'Stripe imports EDocumentService');
ok(stripe.includes('private edoc:EDocumentService'),'Stripe injects EDocumentService');
ok(stripe.includes("this.edoc.maybeAutoCreateForOrder(attempt.storeId,attempt.orderId,'PAYMENT_PAID')"),'Stripe successful payment trigger wired');
ok(stripeModule.includes("import { EDocumentModule } from '../../edoc-core/edoc.module';"),'Stripe imports EDocumentModule');
ok(/imports:\[[^\]]*EDocumentModule[^\]]*\]/s.test(stripeModule),'Stripe module DI includes EDocumentModule');

const webhookScript=path.join(root,'scripts/payment-webhook-v30_3-check.mjs');
if(fs.existsSync(webhookScript)){
  const wh=fs.readFileSync(webhookScript,'utf8');
  const refs=[...wh.matchAll(/apps\/api\/src\/[A-Za-z0-9_./-]+\.ts/g)].map(m=>m[0]);
  const uniq=[...new Set(refs)];
  console.log('INFO payment-webhook verifier source refs:',uniq.length?uniq.join(', '):'none encoded in verifier');
}

if(failed)process.exit(1);
console.log('Ticarti Fix 14B e-document paid trigger final verification: OK');
