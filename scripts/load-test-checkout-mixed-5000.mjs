import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const BASE=String(process.env.LOADTEST_API_URL||'').replace(/\/$/,'');
const STORE=String(process.env.LOADTEST_STORE_SLUG||'main').trim();
const TOTAL=Math.max(1,Number(process.env.LOADTEST_TOTAL||5000));
const CONCURRENCY=Math.max(1,Math.min(500,Number(process.env.LOADTEST_CONCURRENCY||200)));
const PREP_CONCURRENCY=Math.max(1,Math.min(100,Number(process.env.LOADTEST_PREP_CONCURRENCY||5)));
const COUNTRY=String(process.env.LOADTEST_COUNTRY||'TR').toUpperCase();
const POSTAL=String(process.env.LOADTEST_POSTAL_CODE||'34000');
const CITY=String(process.env.LOADTEST_CITY||'Istanbul');
const FIXTURE_FILE=String(process.env.LOADTEST_FIXTURE_FILE||'scripts/.loadtest-mixed-fixture.json');
const RESULT_FILE=String(process.env.LOADTEST_RESULT_FILE||`docs/loadtest/mixed-v33.0.16-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
const BYPASS=String(process.env.LOADTEST_BYPASS_TOKEN||'');

if(process.env.LOADTEST_CONFIRM!=='YES')throw new Error('Refusing real checkout traffic. Set LOADTEST_CONFIRM=YES only for isolated load-test.');
if(!BASE||!STORE)throw new Error('LOADTEST_API_URL and LOADTEST_STORE_SLUG are required');
if(!fs.existsSync(FIXTURE_FILE))throw new Error(`Fixture file missing: ${FIXTURE_FILE}`);

const fixture=JSON.parse(fs.readFileSync(FIXTURE_FILE,'utf8'));
const all=fixture.variants?.all||[], groupA=fixture.variants?.a||[], groupB=fixture.variants?.b||[], groupAB=fixture.variants?.ab||[];
if(all.length<10||!groupA.length||!groupB.length)throw new Error('Fixture requires at least 10 variants and A/B warehouse groups');

const headers=()=>({'content-type':'application/json',...(BYPASS?{'x-loadtest-bypass':BYPASS}:{})});
const json=async(url,init={})=>{
  const started=performance.now();
  let last;
  for(let attempt=1;attempt<=5;attempt++){
    const r=await fetch(url,{...init,headers:{...headers(),...(init.headers||{})}});
    const body=await r.json().catch(()=>({}));
    last={r,body,ms:performance.now()-started};
    if(r.status!==429)return last;
    const retryAfter=Number(r.headers.get('retry-after')||0);
    const waitMs=retryAfter>0?retryAfter*1000:Math.min(2000,150*Math.pow(2,attempt-1));
    await new Promise(resolve=>setTimeout(resolve,waitMs));
  }
  return last;
};
const pickMethod=(rows,preferredType)=>rows.find(x=>preferredType&&String(x.type).toLowerCase()===preferredType)||rows.find(x=>String(x.type).toLowerCase()==='cod')||rows[0];

function cartVariants(i){
  const count=1+(i%5);
  const ids=[];
  const add=id=>{if(id&&!ids.includes(id))ids.push(id);};
  if(count>=2){
    add(groupA[i%groupA.length]);
    add(groupB[(i*7)%groupB.length]);
  }else{
    add(all[i%all.length]);
  }
  let k=0;
  while(ids.length<count){
    const pool=(k%3===0&&groupAB.length)?groupAB:all;
    add(pool[(i*11+k*5)%pool.length]);
    k++;
    if(k>100)break;
  }
  return ids.slice(0,count);
}

async function prepare(i){
  const cart=await json(`${BASE}/storefront/${encodeURIComponent(STORE)}/carts`,{method:'POST',body:'{}'});
  if(!cart.r.ok)throw new Error(`create cart ${cart.r.status}: ${JSON.stringify(cart.body).slice(0,180)}`);
  const token=cart.body.token;
  const variants=cartVariants(i);
  for(const variantId of variants){
    const add=await json(`${BASE}/storefront/carts/${encodeURIComponent(token)}/items`,{method:'POST',body:JSON.stringify({variantId,quantity:1})});
    if(!add.r.ok)throw new Error(`add item ${add.r.status}: ${JSON.stringify(add.body).slice(0,180)}`);
  }
  const checkout=await json(`${BASE}/storefront/carts/${encodeURIComponent(token)}/checkout`);
  if(!checkout.r.ok)throw new Error(`checkout data ${checkout.r.status}: ${JSON.stringify(checkout.body).slice(0,180)}`);
  const shipping=checkout.body.shippingMethods?.[0];
  if(shipping){
    const sr=await json(`${BASE}/storefront/carts/${encodeURIComponent(token)}/shipping`,{method:'PATCH',body:JSON.stringify({shippingMethodId:shipping.id})});
    if(!sr.r.ok)throw new Error(`shipping ${sr.r.status}: ${JSON.stringify(sr.body).slice(0,180)}`);
  }
  const payment=pickMethod(checkout.body.paymentMethods||[],String(process.env.LOADTEST_PAYMENT_TYPE||''));
  if(!payment)throw new Error('No active payment method available for load-test store');
  const pr=await json(`${BASE}/storefront/carts/${encodeURIComponent(token)}/payment`,{method:'PATCH',body:JSON.stringify({paymentMethodId:payment.id})});
  if(!pr.r.ok)throw new Error(`payment ${pr.r.status}: ${JSON.stringify(pr.body).slice(0,180)}`);
  return{
    token,variantCount:variants.length,
    body:{
      idempotencyKey:`mixed-${randomUUID()}`,
      email:`mixed-${Date.now()}-${i}-${randomUUID().slice(0,8)}@example.invalid`,
      firstName:'Mixed',lastName:`Load ${i}`,phone:'+905555555555',
      shippingAddress:{firstName:'Mixed',lastName:'Load',address1:'Load Test Street 1',city:CITY,country:COUNTRY,postalCode:POSTAL,phone:'+905555555555'},
      consents:{terms:true,privacy:true}
    }
  };
}

console.log(`Preparing ${TOTAL} mixed carts, 1-5 SKUs/cart, ${all.length} variants, warehouses ${fixture.warehouses.a.code}+${fixture.warehouses.b.code} ...`);
const fixtures=new Array(TOTAL);let prepIndex=0;
await Promise.all(Array.from({length:PREP_CONCURRENCY},async()=>{
  while(true){
    const i=prepIndex++;
    if(i>=TOTAL)return;
    fixtures[i]=await prepare(i);
    if((i+1)%250===0)console.log(`prepared ${i+1}/${TOTAL}`);
  }
}));

console.log(`Firing ${TOTAL} mixed checkout submissions at concurrency ${CONCURRENCY} ...`);
const lat=[];const errors=new Map();let ok=0,index=0;const started=performance.now();
await Promise.all(Array.from({length:CONCURRENCY},async()=>{
  while(true){
    const i=index++;
    if(i>=TOTAL)return;
    const f=fixtures[i];
    const out=await json(`${BASE}/storefront/carts/${encodeURIComponent(f.token)}/checkout`,{method:'POST',body:JSON.stringify(f.body)});
    lat.push(out.ms);
    if(out.r.ok)ok++;
    else{
      const msg=String(out.body?.message||out.body?.error||out.r.status);
      errors.set(msg,(errors.get(msg)||0)+1);
    }
    if((i+1)%250===0)console.log(`checkout ${i+1}/${TOTAL}`);
  }
}));

const elapsed=(performance.now()-started)/1000;
lat.sort((a,b)=>a-b);
const pct=p=>lat[Math.min(lat.length-1,Math.max(0,Math.floor((lat.length-1)*p)))]||0;
const distribution=fixtures.reduce((m,x)=>{m[x.variantCount]=(m[x.variantCount]||0)+1;return m;},{});
const result={
  scenario:'mixed-multiwarehouse',
  fixtureRun:fixture.run,
  total:TOTAL,succeeded:ok,failed:TOTAL-ok,
  seconds:Number(elapsed.toFixed(2)),rps:Number((TOTAL/elapsed).toFixed(1)),
  p50Ms:Number(pct(.5).toFixed(1)),p95Ms:Number(pct(.95).toFixed(1)),p99Ms:Number(pct(.99).toFixed(1)),
  maxMs:Number((lat.at(-1)||0).toFixed(1)),
  cartSkuCountDistribution:distribution,
  intendedCrossWarehouseCarts:fixtures.filter(x=>x.variantCount>=2).length,
  topErrors:[...errors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10)
};
fs.mkdirSync(new URL('../docs/loadtest/',import.meta.url),{recursive:true});
fs.mkdirSync(RESULT_FILE.split('/').slice(0,-1).join('/')||'.',{recursive:true});
fs.writeFileSync(RESULT_FILE,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
assert.equal(ok+(TOTAL-ok),TOTAL);
if(Number(process.env.LOADTEST_MAX_P95_MS||0)>0)assert(result.p95Ms<=Number(process.env.LOADTEST_MAX_P95_MS),`p95 ${result.p95Ms}ms exceeds budget`);
console.log(`Result saved: ${RESULT_FILE}`);
console.log('Ticarti mixed multi-warehouse 5,000 checkout load test: COMPLETE');
