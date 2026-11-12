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
const ok=(cond,label)=>{if(cond)console.log(`OK ${label}`);else{console.error(`FAIL ${label}`);failed=true}};

ok(edoc.includes("taxInvoicePolicy.autoCreateInvoice!==true"),'Fix 13 autoCreateInvoice gate preserved');
ok(!merchant.includes("'POS_PAID'"),'unsupported POS_PAID absent');
ok(!merchant.includes("'MANUAL_ORDER_PAID'"),'unsupported MANUAL_ORDER_PAID absent');
ok(merchant.includes("maybeAutoCreateForOrder(storeId,result.id,'PAYMENT_PAID')"),'merchant PAID triggers use supported event');

const cs=storefront.indexOf('  async checkout(');
const ce=storefront.indexOf('\n  async ',cs+20);
const checkout=storefront.slice(cs,ce>cs?ce:storefront.length);

ok(checkout.includes('const checkoutResult:any=await this.prisma.$transaction(async tx=>{'),'checkout transaction result captured');
ok(checkout.includes("maybeAutoCreateForOrder(cart.storeId,checkoutResult.order.id,'PAYMENT_PAID')"),'checkout direct-paid post-commit trigger wired');
ok(checkout.includes("maybeAutoCreateForOrder(cartIdentity.storeId,existing.id,'PAYMENT_PAID')"),'checkout existing-paid replay trigger wired');
ok(checkout.includes("maybeAutoCreateForOrder(cart.storeId,prior.id,'PAYMENT_PAID')"),'checkout prior-paid replay trigger wired');
ok(checkout.includes('return checkoutResult;'),'checkout result returned after post-commit trigger');

ok(stripe.includes("import { EDocumentService } from '../../edoc-core/edoc.service';"),'Stripe imports EDocumentService');
ok(stripe.includes('private edoc:EDocumentService'),'Stripe injects EDocumentService');
ok(stripe.includes("this.edoc.maybeAutoCreateForOrder(attempt.storeId,attempt.orderId,'PAYMENT_PAID')"),'Stripe PAID trigger wired');
ok(stripeModule.includes("import { EDocumentModule } from '../../edoc-core/edoc.module';"),'Stripe imports EDocumentModule');
ok(/imports:\[[^\]]*EDocumentModule[^\]]*\]/s.test(stripeModule),'Stripe module includes EDocumentModule');

const webhookScript=path.join(root,'scripts/payment-webhook-v30_3-check.mjs');
if(fs.existsSync(webhookScript)){
  const wh=fs.readFileSync(webhookScript,'utf8');
  const refs=[...new Set([...wh.matchAll(/apps\/api\/src\/[A-Za-z0-9_./-]+\.ts/g)].map(m=>m[0]))];
  console.log('INFO payment-webhook verifier source refs:',refs.length?refs.join(', '):'none');
  const commerceRefs=refs.filter(x=>!x.includes('/billing/'));
  console.log('INFO non-billing webhook source refs:',commerceRefs.length?commerceRefs.join(', '):'none');
}

if(failed)process.exit(1);
console.log('Ticarti Fix 14C e-document paid trigger verification: OK');
