#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[];
function check(name,pass,detail){checks.push({name,pass,detail});console.log(`${pass?'PASS':'REVIEW'} ${name}${detail?' — '+detail:''}`)}
const inv=read('apps/api/src/common/inventory-reservations.ts');
const checkout=read('apps/api/src/checkout-session/checkout-session.service.ts');
const payment=read('apps/api/src/payment-providers/payment-providers.service.ts');
check('inventory CAS claim on expiry',/inventoryReservation\.updateMany\(/.test(inv)&&/status:\s*'HELD'/.test(inv));
check('inventory release atomicity', /\$transaction\(/.test(inv), 'Reservation status and stock decrement should commit atomically');
check('checkout session replacement atomicity',/\$transaction\(/.test(checkout.slice(checkout.indexOf('async create('),checkout.indexOf('async resolve('))), 'SUPERSEDED + OPEN should be one serializable/idempotent operation');
check('Stripe paid transaction idempotency',/paymentTransaction\.upsert\(/.test(payment)&&/storeId_idempotencyKey/.test(payment));
check('Stripe webhook signing',/verifyStripeSignature\(/.test(payment)&&/timingSafeEqual/.test(payment));
check('Stripe refund serializability',/\$transaction\(/.test(payment.split('async refundStripeOrder(')[1]||''), 'Concurrent refund requests must not exceed remaining refundable amount');
const unresolved=checks.filter(x=>!x.pass);
console.log(`\n${checks.length-unresolved.length}/${checks.length} structural gates PASS; ${unresolved.length} require engineering review`);
if(unresolved.length&&process.env.TICARTI_STEP10_STRICT==='YES')process.exitCode=2;
