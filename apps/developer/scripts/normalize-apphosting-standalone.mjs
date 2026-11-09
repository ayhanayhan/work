import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), standalone=path.join(root,'.next','standalone');
const expected=path.join(standalone,'.next','routes-manifest.json');
function find(dir){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const p=path.join(dir,entry.name);
  return entry.isDirectory()?find(p):entry.name==='routes-manifest.json'&&path.basename(path.dirname(p))==='.next'?[p]:[];
 });
}
if(!fs.existsSync(expected)){
 const candidate=find(standalone).filter(p=>p!==expected).sort((a,b)=>a.length-b.length)[0];
 if(!candidate)throw new Error('Standalone routes-manifest.json bulunamadi');
 const nested=path.dirname(path.dirname(candidate));
 for(const name of fs.readdirSync(nested))fs.cpSync(path.join(nested,name),path.join(standalone,name),{recursive:true,force:true});
}
if(!fs.existsSync(expected)||!fs.existsSync(path.join(standalone,'server.js')))throw new Error('Standalone output eksik');
for(const dir of ['public','.next/static']){
 const src=path.join(root,dir), dst=path.join(standalone,dir);
 if(!fs.existsSync(src))throw new Error('Eksik kaynak: '+src);
 fs.mkdirSync(path.dirname(dst),{recursive:true});
 fs.cpSync(src,dst,{recursive:true,force:true});
}
console.log('[developer] Firebase App Hosting standalone hazir');
