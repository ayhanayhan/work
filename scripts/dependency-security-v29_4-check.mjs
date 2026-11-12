import fs from 'node:fs';
import {execSync} from 'node:child_process';
const root=JSON.parse(fs.readFileSync('package.json','utf8'));
let fail=0;
const ok=(name,v)=>{console.log(`${v?'OK':'FAIL'} ${name}`);if(!v)fail++};
ok('Next-scoped PostCSS override',root.overrides?.next?.postcss==='8.5.28');
ok('Prisma-config deepmerge override',root.overrides?.['@prisma/config']?.['deepmerge-ts']==='8.0.2');
ok('security lock refresh script',String(root.scripts?.['security:refresh-lock']||'').includes('package-lock-only'));
const files=['apps/api/src/media/media.controller.ts','apps/api/src/storefront/storefront.controller.ts','apps/api/src/superadmin/superadmin.controller.ts'];
for(const f of files){const s=fs.readFileSync(f,'utf8');ok(`no unsupported fieldNestingDepth ${f}`,!s.includes('fieldNestingDepth'));ok(`bounded multer parser ${f}`,s.includes('fieldNameSize:200')&&s.includes('fieldSize:1048576'));}
const ms=fs.readFileSync('apps/api/src/media/media.service.ts','utf8');
ok('Sharp 0.35 type import',ms.includes("import sharp, { type Sharp } from 'sharp';")&&ms.includes('let pipeline:Sharp;'));
if(!process.argv.includes('--static')){
  const read=(pkg)=>{try{return JSON.parse(execSync(`node -p "require('${pkg}/package.json').version"`,{encoding:'utf8'}).trim())}catch{return null}};
  const postcss=read('postcss'), deep=read('deepmerge-ts'), sharp=read('sharp'), multer=read('multer'), nest=read('@nestjs/platform-express');
  const ge=(v,min)=>{if(!v)return false;const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false}return true};
  ok(`installed postcss@${postcss||'missing'} (>=8.5.23)`,ge(postcss,'8.5.23'));
  ok(`installed deepmerge-ts@${deep||'missing'} (>=8.0.0)`,ge(deep,'8.0.0'));
  ok(`installed sharp@${sharp||'missing'} (>=0.35.4)`,ge(sharp,'0.35.4'));
  ok(`installed multer@${multer||'missing'} (>=2.4.0)`,ge(multer,'2.4.0'));
  ok(`installed @nestjs/platform-express@${nest||'missing'} (>=11.2.6)`,ge(nest,'11.2.6'));
}
if(fail)process.exit(1);
console.log('Ticarti v29.4 dependency security verification: OK');
