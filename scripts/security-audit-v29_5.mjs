import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const root = JSON.parse(fs.readFileSync('package.json','utf8'));
const api = JSON.parse(fs.readFileSync('apps/api/package.json','utf8'));
const admin = JSON.parse(fs.readFileSync('apps/admin/package.json','utf8'));
const storefront = JSON.parse(fs.readFileSync('apps/storefront/package.json','utf8'));
const policy = JSON.parse(fs.readFileSync('scripts/security-waivers-v29_5.json','utf8'));

const fail=(m)=>{console.error(m);process.exit(1)};
if (api.dependencies?.prisma) fail('SECURITY POLICY: prisma CLI must not be a production dependency');
if (!api.devDependencies?.prisma) fail('SECURITY POLICY: prisma CLI must remain a devDependency');
if (root.dependencies?.postcss || storefront.dependencies?.postcss || admin.dependencies?.postcss) fail('SECURITY POLICY: postcss must not be a direct runtime dependency');
const nextVersions=[admin.dependencies?.next,storefront.dependencies?.next].filter(Boolean);
if (!nextVersions.length || nextVersions.some(v=>String(v).replace(/^[^0-9]*/, '')!=='15.5.27')) fail(`SECURITY POLICY: expected validated Next Maintenance LTS 15.5.27, got ${nextVersions.join(', ')}`);
const review = new Date(`${policy.reviewBy}T23:59:59Z`);
if (!Number.isFinite(review.getTime()) || Date.now()>review.getTime()) fail(`SECURITY WAIVERS EXPIRED on ${policy.reviewBy}; re-audit upstream fixes before renewing.`);

const r=spawnSync('npm',['audit','--omit=dev','--json'],{encoding:'utf8',maxBuffer:30*1024*1024});
if(r.error){console.error(r.error.message);process.exit(2)}
let data={};try{data=JSON.parse(r.stdout||'{}')}catch{console.error(r.stderr||r.stdout||'npm audit JSON okunamadı');process.exit(2)}
const meta=data.metadata?.vulnerabilities||{};
const vulns=Object.values(data.vulnerabilities||{});
console.log(`production audit(raw): total=${meta.total??vulns.length} low=${meta.low??0} moderate=${meta.moderate??0} high=${meta.high??0} critical=${meta.critical??0}`);

const critical=vulns.filter(v=>String(v?.severity||'').toLowerCase()==='critical');
if(critical.length) fail(`CRITICAL advisory cannot be waived: ${critical.map(v=>v.name).join(', ')}`);
const highs=vulns.filter(v=>String(v?.severity||'').toLowerCase()==='high');
const waived=[]; const runtime=[];
for(const v of highs){
  const w=policy.waivers?.[v.name];
  if(w) waived.push(`${v.name} (${w.scope})`); else runtime.push(v);
}
if(waived.length) console.warn(`WAIVED toolchain-only HIGH until ${policy.reviewBy}: ${waived.join(', ')}`);
if(runtime.length) fail(`UNWAIVED RUNTIME HIGH remains: ${runtime.map(v=>v.name).join(', ')}`);
console.log(`runtime security gate: OK (critical=0, unwaived-high=0, toolchain-waivers=${waived.length}, reviewBy=${policy.reviewBy})`);
