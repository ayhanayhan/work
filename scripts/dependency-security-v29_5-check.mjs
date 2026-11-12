import fs from 'node:fs';
const j=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const root=j('package.json'), api=j('apps/api/package.json'), admin=j('apps/admin/package.json'), sf=j('apps/storefront/package.json'), policy=j('scripts/security-waivers-v29_5.json');
let fail=0;const ok=(n,v)=>{console.log(`${v?'OK':'FAIL'} ${n}`);if(!v)fail++};
const ge=(v,min)=>{if(!v)return false;const a=String(v).replace(/^[^0-9]*/,'').split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true};
const auditCmd=String(root.scripts?.['audit:production-security']||'');
const auditMatch=auditCmd.match(/^node\s+scripts\/security-audit-v29_(\d+)\.mjs$/);
const auditVersion=auditMatch?Number(auditMatch[1]):0;
const auditFile=auditMatch?`scripts/security-audit-v29_${auditVersion}.mjs`:'';
ok('Prisma CLI dev-only',!api.dependencies?.prisma&&!!api.devDependencies?.prisma);
ok('Prisma Client production',!!api.dependencies?.['@prisma/client']);
ok('Next admin 15.5.27',String(admin.dependencies?.next||'').replace(/^[^0-9]*/,'')==='15.5.27');
ok('Next storefront 15.5.27',String(sf.dependencies?.next||'').replace(/^[^0-9]*/,'')==='15.5.27');
ok('Sharp target >=0.35.4',ge(api.dependencies?.sharp,'0.35.4'));
ok('Nest platform-express >=11.2.6',ge(api.dependencies?.['@nestjs/platform-express'],'11.2.6'));
ok('Faker removed from admin runtime',!admin.dependencies?.['@faker-js/faker']);
ok('No direct runtime PostCSS',!root.dependencies?.postcss&&!admin.dependencies?.postcss&&!sf.dependencies?.postcss&&!api.dependencies?.postcss);
ok('Security waiver policy present',policy.reviewBy==='2026-11-30'&&['postcss','prisma','@prisma/config','deepmerge-ts'].every(x=>policy.waivers?.[x]?.reason));
ok(`Audit gate v29.${auditVersion||'?'} wired (>=v29.5)`,auditVersion>=5&&!!auditFile&&fs.existsSync(auditFile));
for(const f of ['apps/api/src/media/media.controller.ts','apps/api/src/storefront/storefront.controller.ts','apps/api/src/superadmin/superadmin.controller.ts']){const s=fs.readFileSync(f,'utf8');ok(`bounded upload ${f}`,!s.includes('fieldNestingDepth')&&s.includes('fieldNameSize:200')&&s.includes('fieldSize:1048576'));}
const ms=fs.readFileSync('apps/api/src/media/media.service.ts','utf8');ok('Sharp type compatibility',ms.includes("import sharp, { type Sharp } from 'sharp';")&&ms.includes('let pipeline:Sharp;'));
if(!process.argv.includes('--static')&&fs.existsSync('package-lock.json')){
 const lock=j('package-lock.json'); const pv=(name)=>lock.packages?.[`node_modules/${name}`]?.version||null;
 ok(`lock sharp@${pv('sharp')||'missing'}`,ge(pv('sharp'),'0.35.4'));
 ok(`lock nest platform-express@${pv('@nestjs/platform-express')||'missing'}`,ge(pv('@nestjs/platform-express'),'11.2.6'));
}
if(fail)process.exit(1);console.log('Ticarti v29.5+ runtime security verification: OK');
