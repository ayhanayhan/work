import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=process.argv[2]||process.cwd();
const read=(p)=>fs.readFileSync(`${root}/${p}`,'utf8');
const svc=read('apps/api/src/storefront/storefront.service.ts');
const schema=read('apps/api/prisma/schema.prisma');
const checks=[
 ['checkout requires idempotency key',/idempotencyKey\.length<12/.test(svc)],
 ['order idempotency unique per store',/@@unique\(\[storeId, idempotencyKey\]\)/.test(schema)],
 ['cart checkout uses atomic claim',/cart\.updateMany\(\{where:\{id:cart\.id,storeId:cart\.storeId,status:'active'\},data:\{status:'converting'/.test(svc)],
 ['checkout transaction defaults to Serializable',/CHECKOUT_TX_ISOLATION\|\|'Serializable'/.test(svc)&&/checkoutIsolation=.*'Serializable'/.test(svc)&&/isolationLevel:checkoutIsolation,maxWait:10000,timeout:30000/.test(svc)],
 ['stock reservation uses admission lock + durable hold',/CHECKOUT_STOCK_ADMISSION_MODE\|\|'db-lock'/.test(svc)&&/withCheckoutStockAdmissionLocks/.test(svc)&&/checkoutInventoryHold/.test(svc)&&/acquireCheckoutStockHold/.test(svc)&&/atomicEnabled=process\.env\.LOADTEST_ENV==='true'&&configuredMode==='redis-atomic'/.test(svc)],
 ['stock reservation bounded retry exists',/CHECKOUT_STOCK_TX_RETRY_ATTEMPTS\|\|3/.test(svc)&&/for\(let attempt=1;attempt<=maxAttempts;attempt\+\+\)/.test(svc)&&/P2028/.test(svc)&&/P2024/.test(svc)&&/P2034/.test(svc)],
 ['gift card debit is conditional atomic update',/giftCard\.updateMany\(\{where:\{id:preview\.giftCard\.id,storeId,status:'ACTIVE',balance:\{gte:preview\.giftCard\.amount\}\},data:\{balance:\{decrement:preview\.giftCard\.amount\}\}/.test(svc)],
 ['store credit debit is conditional atomic update',/storeCreditAccount\.updateMany\(\{where:\{id:preview\.storeCredit\.id,storeId,customerId,currency,balance:\{gte:preview\.storeCredit\.amount\}\},data:\{balance:\{decrement:preview\.storeCredit\.amount\}\}/.test(svc)],
 ['gift card payment idempotency derived from checkout key',/idempotencyKey:`\$\{idempotencyKey\}:gift-card`/.test(svc)],
 ['store credit payment idempotency derived from checkout key',/idempotencyKey:`\$\{idempotencyKey\}:store-credit`/.test(svc)],
 ['payment attempt idempotency derived from checkout key',/idempotencyKey:`\$\{idempotencyKey\}:payment:1`/.test(svc)],
 ['P2002 returns existing idempotent order',/if\(String\(error\?\.code\|\|''\)==='P2002'\)/.test(svc)],
];
for(const [name,ok] of checks){console.log(ok?'OK':'FAIL',name);assert.equal(ok,true,name)}
console.log('Ticarti v30.2 checkout concurrency verification: OK');
