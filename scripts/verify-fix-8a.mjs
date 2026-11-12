import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const rel='apps/api/src/merchant/merchant.service.ts';
const p=path.join(root,rel);
const t=fs.readFileSync(p,'utf8');

let failed=false;

function methodBody(name){
  const start=t.search(new RegExp(`async\\s+${name}\\s*\\(`));
  if(start<0)return '';
  const next=t.indexOf('\n  async ',start+10);
  return t.slice(start,next<0?t.length:next);
}

const manual=methodBody('createManualOrder');
if(!manual.includes('const reservationMinutes=await this.reservationMinutes(storeId);')){
  console.error('FAIL createManualOrder reservationMinutes scope');
  failed=true;
}else console.log('OK createManualOrder reservationMinutes scope');

const orderEditIdx=t.indexOf("metadata:{source:'order_edit'}");
const before=orderEditIdx>=0?t.slice(0,orderEditIdx):'';
const starts=[...before.matchAll(/async\s+([A-Za-z0-9_]+)\s*\(/g)];
if(!starts.length){
  console.error('FAIL order edit method locate');
  failed=true;
}else{
  const name=starts[starts.length-1][1];
  const body=methodBody(name);
  if(!body.includes('const reservationMinutes=await this.reservationMinutes(storeId);')){
    console.error(`FAIL ${name} reservationMinutes scope`);
    failed=true;
  }else console.log(`OK ${name} reservationMinutes scope`);
}

if(failed)process.exit(1);
console.log('Ticarti Fix 8A reservation scope verification: OK');
