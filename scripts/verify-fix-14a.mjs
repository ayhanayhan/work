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
ok(!merchant.includes("'POS_PAID'"),'unsupported POS_PAID event removed');
ok(!merchant.includes("'MANUAL_ORDER_PAID'"),'unsupported MANUAL_ORDER_PAID event removed');

const posStart=merchant.indexOf('async createPosOrder(');
const manualStart=merchant.indexOf('async createManualOrder(');
const posBlock=posStart>=0&&manualStart>posStart?merchant.slice(posStart,manualStart):'';
const manualEnd=manualStart>=0?merchant.indexOf('\n  async ',manualStart+10):-1;
const manualBlock=manualStart>=0?merchant.slice(manualStart,manualEnd>0?manualEnd:merchant.length):'';

ok(posBlock.includes("maybeAutoCreateForOrder(storeId,result.id,'PAYMENT_PAID')"),'POS paid trigger uses supported PAYMENT_PAID event');
ok(manualBlock.includes("maybeAutoCreateForOrder(storeId,result.id,'PAYMENT_PAID')"),'manual-order paid trigger uses supported PAYMENT_PAID event');

ok(storefront.includes("maybeAutoCreateForOrder(cart.storeId,checkoutResult.order.id,'PAYMENT_PAID')"),'checkout direct-paid trigger wired');
ok(stripe.includes("import { EDocumentService } from '../../edoc-core/edoc.service';"),'Stripe imports EDocumentService');
ok(/\b(?:private|public|protected)(?:\s+readonly)?\s+edoc\s*:\s*EDocumentService\b/.test(stripe),'Stripe injects EDocumentService');
ok(stripe.includes("maybeAutoCreateForOrder(attempt.storeId,attempt.orderId,'PAYMENT_PAID')"),'Stripe success trigger wired');
ok(/imports\s*:\s*\[[^\]]*EDocumentModule/s.test(stripeModule),'Stripe module imports EDocumentModule');

const sourceRoot=path.join(root,'apps/api/src');
const candidates=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()){
      if(['dist','node_modules'].includes(ent.name))continue;
      walk(full);
    }else if(ent.isFile()&&ent.name.endsWith('.ts')){
      const txt=fs.readFileSync(full,'utf8');
      if(/iyzico/i.test(txt)&&(/paymentStatus\s*:\s*['"]PAID['"]/.test(txt)||/paymentStatus\s*===?\s*['"]PAID['"]/.test(txt)||/PAYMENT_PAID/.test(txt))){
        const rel=path.relative(root,full);
        if(!rel.includes('/billing/'))candidates.push(rel);
      }
    }
  }
}
walk(sourceRoot);

console.log('INFO commerce/iyzico PAID-related source candidates:',candidates.length?candidates.join(', '):'none detected');

if(failed)process.exit(1);
console.log('Ticarti Fix 14A e-document paid trigger recovery verification: OK');
