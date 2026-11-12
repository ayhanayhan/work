import fs from 'node:fs';
const api=JSON.parse(fs.readFileSync('apps/api/package.json','utf8'));
const root=JSON.parse(fs.readFileSync('package.json','utf8'));
const auditCmd=String(root.scripts?.['audit:production-security']||'');
const auditMatch=auditCmd.match(/^node\s+scripts\/security-audit-v29_(\d+)\.mjs$/);
const auditVersion=auditMatch?Number(auditMatch[1]):0;
const auditFile=auditMatch?`scripts/security-audit-v29_${auditVersion}.mjs`:'';
const checks=[
 ['Google Cloud Storage 8.2.0',api.dependencies?.['@google-cloud/storage']==='8.2.0'],
 ['iyzipay 2.0.70',api.dependencies?.iyzipay==='2.0.70'],
 ['Next kept at Maintenance LTS', ['apps/admin/package.json','apps/storefront/package.json','apps/superadmin/package.json','apps/developer/package.json'].every(f=>JSON.parse(fs.readFileSync(f,'utf8')).dependencies?.next==='15.5.27')],
 [`audit gate v29.${auditVersion||'?'} wired (>=v29.6)`,auditVersion>=6&&!!auditFile&&fs.existsSync(auditFile)],
];
let bad=0; for(const [n,pass] of checks){console.log(`${pass?'OK':'FAIL'} ${n}`); if(!pass) bad++}
if(bad) process.exit(1); console.log('Ticarti v29.6+ moderate security verification: OK');
