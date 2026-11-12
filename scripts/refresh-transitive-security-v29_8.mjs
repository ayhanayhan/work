import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const lockPath=path.join(root,'package-lock.json');
if(!fs.existsSync(lockPath)){
  console.error('package-lock.json bulunamadı');
  process.exit(1);
}
const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));
const pkgs=lock.packages||{};
const targets=[
  'node_modules/uuid',
  'node_modules/gaxios/node_modules/uuid',
  'node_modules/postman-request/node_modules/uuid',
  'node_modules/postman-request/node_modules/qs'
];
for(const k of targets) delete pkgs[k];
lock.packages=pkgs;
fs.writeFileSync(lockPath,JSON.stringify(lock,null,2)+'\n');
for(const rel of targets){
  const dir=path.join(root,rel);
  try{fs.rmSync(dir,{recursive:true,force:true});}catch{}
}
console.log('Target lock/node_modules entries temizlendi; npm parent-scoped overrides ile yeniden çözümleniyor...');
const npm=process.platform==='win32'?'npm.cmd':'npm';
const r=spawnSync(npm,['install','--force'],{stdio:'inherit',cwd:root});
process.exit(r.status??1);
