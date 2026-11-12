// Lightweight HTTP load probe for a deployed Ticarti environment.
// Example:
// LOADTEST_BASE_URL=https://api.example.com/api/v1 LOADTEST_TOKEN=... LOADTEST_TENANTS=id1,id2 npm run loadtest:scale
const base=String(process.env.LOADTEST_BASE_URL||'http://127.0.0.1:8080/api/v1').replace(/\/$/,'');
const token=String(process.env.LOADTEST_TOKEN||'');
const tenants=String(process.env.LOADTEST_TENANTS||'').split(',').map(x=>x.trim()).filter(Boolean);
const duration=Math.max(5,Number(process.env.LOADTEST_DURATION_SECONDS||30));
const concurrency=Math.max(1,Math.min(500,Number(process.env.LOADTEST_CONCURRENCY||25)));
const heavyEvery=Math.max(2,Number(process.env.LOADTEST_HEAVY_EVERY||10));
if(!token||!tenants.length){console.error('LOADTEST_TOKEN and LOADTEST_TENANTS are required');process.exit(2)}
const latencies=[];let ok=0,fail=0,cursor=0;const until=Date.now()+duration*1000;
function pickTenant(){cursor++;return tenants[cursor%tenants.length]}
async function one(worker){while(Date.now()<until){const tenantId=worker%heavyEvery===0?tenants[0]:pickTenant();const endpoint=worker%3===0?'/admin/live':worker%3===1?'/admin/orders':'/admin/dashboard';const started=performance.now();try{const r=await fetch(base+endpoint,{headers:{authorization:`Bearer ${token}`,'x-tenant-id':tenantId}});await r.arrayBuffer();latencies.push(performance.now()-started);if(r.ok)ok++;else fail++}catch{fail++;latencies.push(performance.now()-started)}}}
await Promise.all(Array.from({length:concurrency},(_,i)=>one(i)));
latencies.sort((a,b)=>a-b);const pct=p=>latencies[Math.min(latencies.length-1,Math.floor(latencies.length*p))]||0;
console.log(JSON.stringify({requests:ok+fail,ok,fail,errorRate:(fail/Math.max(1,ok+fail)),p50Ms:Math.round(pct(.50)),p95Ms:Math.round(pct(.95)),p99Ms:Math.round(pct(.99)),durationSeconds:duration,concurrency,tenants:tenants.length},null,2));
if(fail/(Math.max(1,ok+fail))>.02)process.exitCode=1;
