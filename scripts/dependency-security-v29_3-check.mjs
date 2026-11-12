import fs from 'node:fs';
import path from 'node:path';
const root=JSON.parse(fs.readFileSync('package.json','utf8'));
const api=JSON.parse(fs.readFileSync('apps/api/package.json','utf8'));
const admin=JSON.parse(fs.readFileSync('apps/admin/package.json','utf8'));
const checks=[
 ['PostCSS override',root.overrides?.postcss==='8.5.28'],
 ['deepmerge-ts override',root.overrides?.['deepmerge-ts']==='8.0.2'],
 ['sharp override',root.overrides?.sharp==='0.35.5'],
 ['multer override',root.overrides?.multer==='2.4.0'],
 ['Nest platform-express',api.dependencies?.['@nestjs/platform-express']==='11.2.6'],
 ['Sharp direct',api.dependencies?.sharp==='0.35.5'],
 ['Faker removed',!admin.dependencies?.['@faker-js/faker']&&!admin.devDependencies?.['@faker-js/faker']],
];
for(const [n,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${n}`);if(!ok)process.exitCode=1}
for(const f of ['apps/api/src/storefront/storefront.controller.ts','apps/api/src/media/media.controller.ts','apps/api/src/superadmin/superadmin.controller.ts']){
 const s=fs.readFileSync(f,'utf8');
 const relevant=s.includes('FileInterceptor(');
 const ok=!relevant||s.includes('fieldNestingDepth:4');
 console.log(`${ok?'OK':'FAIL'} upload nesting guard ${f}`);if(!ok)process.exitCode=1;
}
if(process.argv.includes('--static')) process.exit(process.exitCode||0);
const installed=[
 ['postcss','8.5.23'],['deepmerge-ts','8.0.0'],['sharp','0.35.4'],['multer','2.4.0'],['@nestjs/platform-express','11.2.6']
];
function ge(a,b){const A=a.split('.').map(Number),B=b.split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)>(B[i]||0))return true;if((A[i]||0)<(B[i]||0))return false}return true}
for(const [pkg,min] of installed){
 try{const p=JSON.parse(fs.readFileSync(path.join('node_modules',pkg,'package.json'),'utf8'));const ok=ge(p.version,min);console.log(`${ok?'OK':'FAIL'} installed ${pkg}@${p.version} (>=${min})`);if(!ok)process.exitCode=1}catch{console.log(`FAIL installed ${pkg} missing`);process.exitCode=1}
}
