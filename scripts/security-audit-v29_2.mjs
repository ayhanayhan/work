import {spawnSync} from 'node:child_process';
const r=spawnSync('npm',['audit','--omit=dev','--json'],{encoding:'utf8',maxBuffer:20*1024*1024});
let data={};try{data=JSON.parse(r.stdout||'{}')}catch{console.error(r.stderr||r.stdout||'npm audit JSON okunamadı');process.exit(2)}
const meta=data.metadata?.vulnerabilities||{};const vulns=Object.values(data.vulnerabilities||{});
const direct=vulns.filter(v=>v?.isDirect);const high=vulns.filter(v=>['high','critical'].includes(String(v?.severity||'').toLowerCase()));
console.log(`production audit: total=${meta.total??vulns.length} low=${meta.low??0} moderate=${meta.moderate??0} high=${meta.high??0} critical=${meta.critical??0}`);
if(direct.length)console.log('direct production advisories:',direct.map(v=>`${v.name}:${v.severity}`).join(', '));
if(high.length){console.error('HIGH/CRITICAL production dependency advisory remains:',high.map(v=>`${v.name}:${v.severity}`).join(', '));process.exit(1)}
if(r.error){console.error(r.error.message);process.exit(2)}
console.log('production dependency security gate: OK');
