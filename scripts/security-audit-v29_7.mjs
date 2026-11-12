import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=JSON.parse(fs.readFileSync('package.json','utf8'));
const api=JSON.parse(fs.readFileSync('apps/api/package.json','utf8'));
const admin=JSON.parse(fs.readFileSync('apps/admin/package.json','utf8'));
const storefront=JSON.parse(fs.readFileSync('apps/storefront/package.json','utf8'));
const policy=JSON.parse(fs.readFileSync('scripts/security-waivers-v29_7.json','utf8'));
const fail=m=>{console.error(m);process.exit(1)};
if(api.dependencies?.prisma) fail('SECURITY POLICY: prisma CLI must not be production dependency');
if(!api.devDependencies?.prisma) fail('SECURITY POLICY: prisma CLI must remain devDependency');
if(root.dependencies?.postcss||storefront.dependencies?.postcss||admin.dependencies?.postcss) fail('SECURITY POLICY: postcss must not be direct runtime dependency');
if(root.overrides?.uuid!=='11.1.1') fail(`SECURITY POLICY: uuid override 11.1.1 required; got ${root.overrides?.uuid||'missing'}`);
if(root.overrides?.qs!=='6.16.0') fail(`SECURITY POLICY: qs override 6.16.0 required; got ${root.overrides?.qs||'missing'}`);
const review=new Date(`${policy.reviewBy}T23:59:59Z`);
if(!Number.isFinite(review.getTime())||Date.now()>review.getTime()) fail(`SECURITY WAIVERS EXPIRED on ${policy.reviewBy}; re-audit required.`);
const r=spawnSync('npm',['audit','--omit=dev','--json'],{encoding:'utf8',maxBuffer:30*1024*1024});
if(r.error){console.error(r.error.message);process.exit(2)}
let data={};try{data=JSON.parse(r.stdout||'{}')}catch{console.error(r.stderr||r.stdout||'npm audit JSON okunamadı');process.exit(2)}
const meta=data.metadata?.vulnerabilities||{}; const vulns=Object.values(data.vulnerabilities||{});
console.log(`production audit(raw): total=${meta.total??vulns.length} low=${meta.low??0} moderate=${meta.moderate??0} high=${meta.high??0} critical=${meta.critical??0}`);
const direct=vulns.filter(v=>v?.isDirect).map(v=>`${v.name}:${v.severity}`).sort(); if(direct.length) console.log(`direct production advisories: ${direct.join(', ')}`);
for(const sev of ['moderate','high']){
 const list=vulns.filter(v=>String(v?.severity||'').toLowerCase()===sev);
 if(list.length){console.log(`${sev.toUpperCase()} DETAIL (${list.length}):`); for(const v of list){const via=(v.via||[]).map(x=>typeof x==='string'?x:(x?.title||x?.name||x?.url||'advisory')).slice(0,5).join(' | '); console.log(` - ${v.name}${v.isDirect?' [direct]':''}; range=${v.range||'?'}; via=${via||'n/a'}`)}}
}
const critical=vulns.filter(v=>String(v?.severity||'').toLowerCase()==='critical'); if(critical.length) fail(`CRITICAL advisory cannot be waived: ${critical.map(v=>v.name).join(', ')}`);
const highWaived=[], highRuntime=[];
for(const v of vulns.filter(v=>String(v?.severity||'').toLowerCase()==='high')){const w=policy.waivers?.[v.name]; if(w) highWaived.push(`${v.name} (${w.scope})`); else highRuntime.push(v)}
if(highWaived.length) console.warn(`WAIVED toolchain-only HIGH until ${policy.reviewBy}: ${highWaived.join(', ')}`);
if(highRuntime.length) fail(`UNWAIVED RUNTIME HIGH remains: ${highRuntime.map(v=>v.name).join(', ')}`);
const modWaived=[], modRuntime=[];
for(const v of vulns.filter(v=>String(v?.severity||'').toLowerCase()==='moderate')){const w=policy.moderateWaivers?.[v.name]; if(w) modWaived.push(`${v.name} (${w.scope})`); else modRuntime.push(v)}
if(modWaived.length) console.warn(`WAIVED toolchain-only MODERATE until ${policy.reviewBy}: ${modWaived.join(', ')}`);
if(modRuntime.length) fail(`UNWAIVED RUNTIME MODERATE remains: ${modRuntime.map(v=>v.name).join(', ')}`);
console.log(`runtime security gate: OK (critical=0, unwaived-high=0, unwaived-moderate=0, high-waivers=${highWaived.length}, moderate-waivers=${modWaived.length}, reviewBy=${policy.reviewBy})`);
