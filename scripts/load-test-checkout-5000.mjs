import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const BASE=String(process.env.LOADTEST_API_URL||'').replace(/\/$/,'');
const STORE=String(process.env.LOADTEST_STORE_SLUG||'').trim();
const VARIANT=String(process.env.LOADTEST_VARIANT_ID||'').trim();
const TOTAL=Math.max(1,Number(process.env.LOADTEST_TOTAL||5000));
const CONCURRENCY=Math.max(1,Math.min(500,Number(process.env.LOADTEST_CONCURRENCY||100)));
const PREP_CONCURRENCY=Math.max(1,Math.min(50,Number(process.env.LOADTEST_PREP_CONCURRENCY||5)));
const PREP_DELAY_MS=Math.max(0,Math.min(5000,Number(process.env.LOADTEST_PREP_DELAY_MS||0)));
const LOADTEST_BYPASS_TOKEN=String(process.env.LOADTEST_BYPASS_TOKEN||'').trim();
const COUNTRY=String(process.env.LOADTEST_COUNTRY||'TR').toUpperCase();
const POSTAL=String(process.env.LOADTEST_POSTAL_CODE||'34000');
const CITY=String(process.env.LOADTEST_CITY||'Istanbul');
const EXPECTED_MAX_SUCCESS=process.env.LOADTEST_EXPECTED_MAX_SUCCESS==null?null:Number(process.env.LOADTEST_EXPECTED_MAX_SUCCESS);
if(process.env.LOADTEST_CONFIRM!=='YES')throw new Error('Refusing to create real checkout traffic. Set LOADTEST_CONFIRM=YES only against an isolated staging/load-test store.');
if(!BASE||!STORE||!VARIANT)throw new Error('LOADTEST_API_URL, LOADTEST_STORE_SLUG and LOADTEST_VARIANT_ID are required');

const json=async(url,init={})=>{const t=performance.now();const r=await fetch(url,{...init,headers:{'content-type':'application/json',...(LOADTEST_BYPASS_TOKEN?{'x-ticarti-loadtest-token':LOADTEST_BYPASS_TOKEN}:{}),...(init.headers||{})}});const body=await r.json().catch(()=>({}));return{r,body,ms:performance.now()-t}};
const pickMethod=(rows,preferredType)=>rows.find(x=>preferredType&&String(x.type).toLowerCase()===preferredType)||rows.find(x=>String(x.type).toLowerCase()==='cod')||rows[0];
async function prepare(i){
  const cart=await json(`${BASE}/storefront/${encodeURIComponent(STORE)}/carts`,{method:'POST',body:'{}'});if(!cart.r.ok)throw new Error(`create cart ${cart.r.status}: ${JSON.stringify(cart.body).slice(0,180)}`);const token=cart.body.token;
  const add=await json(`${BASE}/storefront/carts/${encodeURIComponent(token)}/items`,{method:'POST',body:JSON.stringify({variantId:VARIANT,quantity:1})});if(!add.r.ok)throw new Error(`add item ${add.r.status}: ${JSON.stringify(add.body).slice(0,180)}`);
  const checkout=await json(`${BASE}/storefront/carts/${encodeURIComponent(token)}/checkout`);if(!checkout.r.ok)throw new Error(`checkout data ${checkout.r.status}: ${JSON.stringify(checkout.body).slice(0,180)}`);
  const shipping=checkout.body.shippingMethods?.[0];if(shipping){const sr=await json(`${BASE}/storefront/carts/${encodeURIComponent(token)}/shipping`,{method:'PATCH',body:JSON.stringify({shippingMethodId:shipping.id})});if(!sr.r.ok)throw new Error(`shipping ${sr.r.status}: ${JSON.stringify(sr.body).slice(0,180)}`);}
  const payment=pickMethod(checkout.body.paymentMethods||[],String(process.env.LOADTEST_PAYMENT_TYPE||''));if(!payment)throw new Error('No active payment method available for load-test store');const pr=await json(`${BASE}/storefront/carts/${encodeURIComponent(token)}/payment`,{method:'PATCH',body:JSON.stringify({paymentMethodId:payment.id})});if(!pr.r.ok)throw new Error(`payment ${pr.r.status}: ${JSON.stringify(pr.body).slice(0,180)}`);
  return{token,payment,body:{shippingMethodId:shipping?.id||null,paymentMethodId:payment.id,idempotencyKey:`load-${randomUUID()}`,email:`load-${Date.now()}-${i}-${randomUUID().slice(0,8)}@example.invalid`,firstName:'Load',lastName:`Test ${i}`,phone:'+905555555555',shippingAddress:{firstName:'Load',lastName:'Test',address1:'Load Test Street 1',city:CITY,country:COUNTRY,postalCode:POSTAL,phone:'+905555555555'},consents:{terms:true,privacy:true,kvkkNotice:true}}};
}

console.log(`Preparing ${TOTAL} isolated carts against ${BASE} (${STORE}), variant ${VARIANT} ...`);
console.log(`Preparation concurrency ${PREP_CONCURRENCY}${PREP_DELAY_MS?`, delay ${PREP_DELAY_MS}ms`:''}; measured checkout concurrency ${CONCURRENCY}.`);
const fixtures=new Array(TOTAL);let prepIndex=0;
await Promise.all(Array.from({length:PREP_CONCURRENCY},async()=>{while(true){const i=prepIndex++;if(i>=TOTAL)return;fixtures[i]=await prepare(i);if((i+1)%100===0)console.log(`prepared ${i+1}/${TOTAL}`);if(PREP_DELAY_MS)await new Promise(resolve=>setTimeout(resolve,PREP_DELAY_MS));}}));
console.log(`Firing ${TOTAL} checkout submissions at concurrency ${CONCURRENCY} ...`);
const lat=[];const errors=new Map();let ok=0;let index=0;const started=performance.now();
await Promise.all(Array.from({length:CONCURRENCY},async()=>{while(true){const i=index++;if(i>=TOTAL)return;const f=fixtures[i];const out=await json(`${BASE}/storefront/carts/${encodeURIComponent(f.token)}/checkout`,{method:'POST',body:JSON.stringify(f.body)});lat.push(out.ms);if(out.r.ok){ok++;}else{const msg=String(out.body?.message||out.body?.error||out.r.status);errors.set(msg,(errors.get(msg)||0)+1);}if((i+1)%250===0)console.log(`checkout ${i+1}/${TOTAL}`);}}));
const elapsed=(performance.now()-started)/1000;lat.sort((a,b)=>a-b);const pct=p=>lat[Math.min(lat.length-1,Math.max(0,Math.floor((lat.length-1)*p)))]||0;
const result={total:TOTAL,succeeded:ok,failed:TOTAL-ok,seconds:Number(elapsed.toFixed(2)),rps:Number((TOTAL/elapsed).toFixed(1)),p50Ms:Number(pct(.5).toFixed(1)),p95Ms:Number(pct(.95).toFixed(1)),p99Ms:Number(pct(.99).toFixed(1)),maxMs:Number((lat.at(-1)||0).toFixed(1)),topErrors:[...errors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10)};
console.log(JSON.stringify(result,null,2));
assert.equal(ok+(TOTAL-ok),TOTAL);
if(EXPECTED_MAX_SUCCESS!=null){assert(ok<=EXPECTED_MAX_SUCCESS,`oversell guard failed: ${ok} checkouts succeeded, expected <= ${EXPECTED_MAX_SUCCESS}`);console.log(`OK hot-SKU oversell bound: ${ok} <= ${EXPECTED_MAX_SUCCESS}`);}
if(Number(process.env.LOADTEST_MAX_P95_MS||0)>0)assert(result.p95Ms<=Number(process.env.LOADTEST_MAX_P95_MS),`p95 ${result.p95Ms}ms exceeds budget`);
console.log('Ticarti 5,000 checkout load test: COMPLETE');
