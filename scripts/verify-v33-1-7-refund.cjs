#!/usr/bin/env node
const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../apps/api/src/payment-providers/payment-providers.service.ts'),'utf8');
const body=source.split('async refundStripeOrder(')[1]||'';
const checks=[
 ['requires refund request id',/idempotencyKey\|\|body\?\.requestId/.test(body)],
 ['persists intent before Stripe request',body.indexOf('paymentTransaction.create(')>=0&&body.indexOf('paymentTransaction.create(')<body.indexOf("'/v1/refunds'")],
 ['order row serialized for refund reservation',body.includes('FOR UPDATE')],
 ['holds PENDING UNKNOWN and SUCCEEDED amount',/\['PENDING','UNKNOWN','SUCCEEDED'\]/.test(body)],
 ['does not reissue existing external refund',body.indexOf('if(reserved.existing)')>=0&&body.indexOf('if(reserved.existing)')<body.indexOf("'/v1/refunds'")],
 ['ambiguous provider results require reconciliation',body.includes("status:'UNKNOWN'")&&body.includes('RECONCILIATION_REQUIRED')],
 ['provider call outside reservation transaction',body.indexOf("'/v1/refunds'")>body.indexOf('return{existing:false,transaction}')],
 ['stores final result transactionally',body.includes('paymentTransaction.update(')&&body.includes('orderStatusHistory.create(')]
];
for(const [n,ok]of checks)console.log((ok?'PASS ':'FAIL ')+n);
if(checks.some(x=>!x[1]))process.exitCode=1;
console.log('NOTE: Structural checks only. Real PostgreSQL concurrency and Stripe reconciliation still pending.');
