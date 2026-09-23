import fs from 'node:fs';
import path from 'node:path';

const appRoot=path.resolve(process.cwd());
const nextRoot=path.join(appRoot,'.next');
const standaloneRoot=path.join(nextRoot,'standalone');
const nestedApp=path.join(standaloneRoot,'apps','checkout');

function exists(p){
  try{return fs.existsSync(p)}catch{return false}
}

function copyDir(src,dst){
  if(!exists(src))return;
  fs.mkdirSync(dst,{recursive:true});
  fs.cpSync(src,dst,{recursive:true,force:true});
}

if(exists(nestedApp)){
  console.log(`[apphosting] Standalone monorepo ciktisi normalize ediliyor: ${nestedApp}`);

  for(const entry of fs.readdirSync(nestedApp)){
    const src=path.join(nestedApp,entry);
    const dst=path.join(standaloneRoot,entry);

    if(entry==='node_modules'){
      copyDir(src,dst);
      continue;
    }

    if(fs.statSync(src).isDirectory()){
      copyDir(src,dst);
    }else{
      fs.copyFileSync(src,dst);
    }
  }
}

const staticSrc=path.join(nextRoot,'static');
const staticDst=path.join(standaloneRoot,'.next','static');

if(!exists(staticSrc)){
  throw new Error(`[apphosting] .next/static bulunamadi: ${staticSrc}`);
}

copyDir(staticSrc,staticDst);

const publicSrc=path.join(appRoot,'public');
const publicDst=path.join(standaloneRoot,'public');

if(exists(publicSrc)){
  copyDir(publicSrc,publicDst);
}

const serverFile=path.join(standaloneRoot,'server.js');
const manifestFile=path.join(standaloneRoot,'.next','routes-manifest.json');
const nextPackage=path.join(standaloneRoot,'node_modules','next','package.json');

for(const required of [serverFile,manifestFile,nextPackage,staticDst]){
  if(!exists(required)){
    throw new Error(`[apphosting] Eksik standalone runtime dosyasi: ${required}`);
  }
}

console.log('[apphosting] Standalone cikti hazir.');
console.log(`[apphosting] Manifest: ${manifestFile}`);
console.log(`[apphosting] Static: ${staticDst}`);
console.log(`[apphosting] Public: ${publicDst}`);
