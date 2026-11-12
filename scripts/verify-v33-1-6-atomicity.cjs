#!/usr/bin/env node
const fs=require('fs');
const i=fs.readFileSync('apps/api/src/common/inventory-reservations.ts','utf8');
const c=fs.readFileSync('apps/api/src/checkout-session/checkout-session.service.ts','utf8');
const p=fs.readFileSync('apps/api/src/payment-providers/payment-providers.service.ts','utf8');
const checks=[
 ['Inventory transaction',i.includes('db.$transaction(async')],
 ['Inventory CAS rollback',i.includes('release rolled back')],
 ['Checkout transaction',c.includes('this.prisma.$transaction(async')],
 ['Checkout advisory lock',c.includes('pg_advisory_xact_lock')],
 ['Checkout idempotent reuse',c.includes('if (existing)')],
 ['Payment refund unresolved (intentionally blocked)',!p.split('async refundStripeOrder(')[1]?.includes('this.prisma.$transaction(')],
];
for(const [n,ok] of checks)console.log((ok?'PASS':'FAIL')+' '+n);
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log('v33.1.6: two atomicity fixes + payment refund remains release blocker');
