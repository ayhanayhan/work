import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const ok=(n,c)=>{if(!c){console.error(`FAIL ${n}`);process.exitCode=1}else console.log(`OK ${n}`)};
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
const pol=JSON.parse(fs.readFileSync('scripts/security-waivers-v29_7.json','utf8'));

ok('gaxios -> uuid override 11.1.1',p.overrides?.gaxios?.uuid==='11.1.1');
ok('postman-request -> uuid override 11.1.1',p.overrides?.['postman-request']?.uuid==='11.1.1');
ok('postman-request -> qs override 6.16.0',p.overrides?.['postman-request']?.qs==='6.16.0');
ok('no global uuid override',!Object.prototype.hasOwnProperty.call(p.overrides||{},'uuid'));
ok('no global qs override',!Object.prototype.hasOwnProperty.call(p.overrides||{},'qs'));
ok('refresh script wired',p.scripts?.['security:refresh-transitives']==='node scripts/refresh-transitive-security-v29_8.mjs');
ok('Next moderate waiver',pol.moderateWaivers?.next?.scope==='next-build-toolchain');
ok('v29.8 audit wired',p.scripts?.['audit:production-security']==='node scripts/security-audit-v29_8.mjs');

// Do not infer runtime safety from a physical node_modules path. npm may hoist or
// dedupe overridden transitive packages. The authoritative check is npm's actual
// production vulnerability graph after install/lock resolution.
const auditRun=spawnSync('npm',['audit','--omit=dev','--json'],{encoding:'utf8',maxBuffer:32*1024*1024});
let audit=null;
try { audit=JSON.parse(auditRun.stdout||'{}'); } catch {}
ok('production audit JSON readable',!!audit && typeof audit==='object');

const vulns=audit?.vulnerabilities||{};
const runtimeTargets=['uuid','qs','gaxios','postman-request','iyzipay'];
for(const name of runtimeTargets){
  ok(`no production advisory for ${name}`,!vulns[name]);
}

// qs is intentionally pinned to a known-safe parent-scoped target; when a lock
// entry is present we additionally validate it. Absence of a nested physical path
// is valid because npm can hoist/dedupe the dependency.
let lock={};
try{lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'))}catch{}
const pkgs=lock.packages||{};
const qsCandidates=Object.entries(pkgs)
  .filter(([k,v])=>/(^|\/)node_modules\/qs$/.test(k) && v?.version)
  .map(([k,v])=>({path:k,version:v.version}));
function parts(v){return String(v||'0').split(/[.-]/).map(x=>/^\d+$/.test(x)?+x:0)}
function gte(a,b){const A=parts(a),B=parts(b);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return (A[i]||0)>(B[i]||0)}return true}
ok('resolved qs entries are safe',qsCandidates.length>0 && qsCandidates.every(x=>gte(x.version,'6.16.0')));

if(!process.exitCode) console.log('Ticarti v29.8.2 transitive security verification: OK');
