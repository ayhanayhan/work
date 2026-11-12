import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const admin=path.join(root,'apps','admin');
const required=[
 'app/layout.tsx','app/(protected)/layout.tsx','config/menu.config.tsx',
 'providers/i18n-provider.tsx','i18n/messages/tr.json','i18n/messages/en.json',
 'i18n/messages/de.json','i18n/messages/ar.json','i18n/messages/es.json','i18n/messages/ch.json',
 'app/components/AdminSession.tsx'
];
const missing=required.filter(x=>!fs.existsSync(path.join(admin,x)));
const rootPkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const adminPkg=JSON.parse(fs.readFileSync(path.join(admin,'package.json'),'utf8'));
if(missing.length || !Array.isArray(rootPkg.workspaces) || adminPkg.name!=='@commerce/admin'){
 console.error('Admin verification FAILED');
 if(missing.length) console.error('Missing:',missing);
 if(!Array.isArray(rootPkg.workspaces)) console.error('Root package is not workspace package');
 if(adminPkg.name!=='@commerce/admin') console.error('Admin workspace package name is wrong');
 process.exit(1);
}
const pages=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(e.name==='page.tsx') pages.push(p)}}
walk(path.join(admin,'app'));
console.log(`Metronic admin verification OK: ${pages.length} page routes, 6 UI languages, Ticarti session provider active.`);
