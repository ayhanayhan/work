import fs from 'node:fs';
const ok=(n,c)=>{if(!c){console.error(`FAIL ${n}`);process.exitCode=1}else console.log(`OK ${n}`)};
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
const pol=JSON.parse(fs.readFileSync('scripts/security-waivers-v29_7.json','utf8'));
ok('uuid override 11.1.1',p.overrides?.uuid==='11.1.1');
ok('qs override 6.16.0',p.overrides?.qs==='6.16.0');
ok('Next moderate waiver',pol.moderateWaivers?.next?.scope==='next-build-toolchain');
ok('v29.7 audit wired',p.scripts?.['audit:production-security']==='node scripts/security-audit-v29_7.mjs');
let lock={}; try{lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'))}catch{}
const pkgs=lock.packages||{};
const badUuid=[]; const badQs=[];
function parts(v){return String(v||'0').split(/[.-]/).map(x=>/^\d+$/.test(x)?+x:0)}
function lt(a,b){const A=parts(a),B=parts(b);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return (A[i]||0)<(B[i]||0)}return false}
for(const [k,v] of Object.entries(pkgs)){
 if((k==='node_modules/uuid'||k.endsWith('/node_modules/uuid')) && !v.dev && lt(v.version,'11.1.1')) badUuid.push(`${k}@${v.version}`);
 if((k==='node_modules/qs'||k.endsWith('/node_modules/qs')) && !v.dev && lt(v.version,'6.16.0')) badQs.push(`${k}@${v.version}`);
}
ok('runtime uuid >=11.1.1',badUuid.length===0); if(badUuid.length) console.error(badUuid.join('\n'));
ok('runtime qs >=6.16.0',badQs.length===0); if(badQs.length) console.error(badQs.join('\n'));
if(!process.exitCode) console.log('Ticarti v29.7 transitive security verification: OK');
