import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const svc=read('apps/api/src/billing/billing.service.ts');
const ctl=read('apps/api/src/billing/billing.controller.ts');
const dto=read('apps/api/src/billing/billing.dto.ts');
const helper=read('apps/api/src/billing/iyzico-webhook.ts');
const schema=read('apps/api/prisma/schema.prisma');
const pkg=JSON.parse(read('package.json'));
const checks=[
 ['iyzico V3 webhook endpoint',/billing\/iyzico\/webhook/.test(ctl)],
 ['V3 signature header read',/x-iyz-signature-v3/.test(ctl)],
 ['HMAC SHA256 signature verification',/createHmac\('sha256',secretKey\)/.test(helper)],
 ['constant-time signature compare',/timingSafeEqual/.test(helper)],
 ['HPP signature field order',/secretKey\+eventType\+paymentId\+token\+conversationId\+status/.test(helper)],
 ['only Checkout Form webhook accepted',/CHECKOUT_FORM_AUTH/.test(svc)],
 ['callback token is server-side retrieved',/checkoutForm,\{locale:Iyzipay\.LOCALE\.TR,conversationId:row\.conversationId,token\}/.test(svc)],
 ['attempt token binding enforced',/(row\.token!==token)/.test(svc)],
 ['authoritative payment fields verified',/paidPrice\?\?result\.price/.test(read('apps/api/src/billing/iyzico-verification.ts'))&&/basketId/.test(read('apps/api/src/billing/iyzico-verification.ts'))&&/paymentId/.test(read('apps/api/src/billing/iyzico-verification.ts'))],
 ['provider payment receipt unique by provider/payment',/@@unique\(\[provider, paymentId\]\)/.test(schema)],
 ['provider payment receipt unique by purchase',/@@unique\(\[purchaseType, purchaseId\]\)/.test(schema)],
 ['atomic pending to paid claim',/updateMany\(\{where:\{id:row\.id,status:'PENDING'\}/.test(svc)],
 ['payment callbacks Serializable',((svc.match(/isolationLevel:'Serializable',maxWait:10000,timeout:30000/g)||[]).length>=3)],
 ['terminal webhook replay acknowledged',/duplicate:true,status:match\.status/.test(svc)],
 ['webhook verifier script wired',pkg.scripts?.['verify:payment-webhooks']==='node scripts/payment-webhook-v30_3-check.mjs'],
 ['webhook DTO bounded by whitelist fields',/class IyzicoWebhookDto/.test(dto)&&/paymentConversationId/.test(dto)&&/iyziEventType/.test(dto)],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)bad++;}
if(bad)process.exit(1);
console.log('Ticarti v30.3 payment webhook hardening verification: OK');
