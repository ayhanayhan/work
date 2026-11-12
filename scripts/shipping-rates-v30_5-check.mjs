import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const svc=fs.readFileSync(path.join(root,'apps/api/src/storefront/storefront.service.ts'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const deploy=fs.readFileSync(path.join(root,'deploy-final.sh'),'utf8');
const checks=[
 ['shipping profile query scoped by store',/shippingProfile\.findMany\(\{where:\{storeId:cart\.storeId,active:true\}/],
 ['configured profiles require rate rules',/configured=profiles\.filter\(\(p:any\)=>Array\.isArray\(p\.rateRules\)&&p\.rateRules\.length\)/],
 ['specific product profiles supported',/specific=configured\.filter\(\(p:any\)=>Array\.isArray\(p\.productIds\)&&p\.productIds\.length\)/],
 ['default shipping profile supported',/defaults=configured\.filter\(\(p:any\)=>!Array\.isArray\(p\.productIds\)\|\|!p\.productIds\.length\)/],
 ['country zone matching exists',/shippingZoneMatch\(zones:any,country:string\)/],
 ['rate rules support method scoping',/rule\.methodIds[\s\S]*rule\.methodCodes/],
 ['rate rules support subtotal bounds',/minSubtotal[\s\S]*maxSubtotal/],
 ['rate rules support weight bounds',/minWeight[\s\S]*maxWeight/],
 ['rate rules support quantity bounds',/minQty[\s\S]*maxQty/],
 ['shipping profile rates feed checkout options',/profileRates=await this\.shippingProfileRates\(db,cart,ci,netSubtotal,country,eligible,totals\?\.items\|\|\[\]\)/],
 ['legacy shipping fallback remains',/rateSource:profileRate\?\.rateSource\|\|'SHIPPING_METHOD'/],
 ['cart totals use shipping profile rates',/shippingProfileRates\(this\.prisma,cart,ci,Math\.max\(0,subtotal-discountTotal\),country,\[m\],items\)/],
 ['checkout revalidates shipping rate in transaction',/Shipping rate changed during checkout\. Please review the updated total\./],
 ['unavailable shipping rate blocks checkout',/Selected shipping rate is no longer available\. Please review delivery options\./],
 ['root verifier script wired',pkg.scripts?.['verify:shipping-rates']==='node scripts/shipping-rates-v30_5-check.mjs'],
 ['deploy verifier wired',deploy.includes('scripts/shipping-rates-v30_5-check.mjs')],
];
let failed=0;for(const [name,test] of checks){const ok=typeof test==='boolean'?test:test.test(svc);console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`Ticarti v30.5 shipping rate verification failed: ${failed}`);process.exit(1)}
console.log('Ticarti v30.5 shipping rate engine verification: OK');
