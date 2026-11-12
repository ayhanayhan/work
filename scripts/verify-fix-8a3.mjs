import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const p=path.join(root,'apps/api/src/merchant/merchant.service.ts');
const t=fs.readFileSync(p,'utf8');

const start=t.search(/async\s+createManualOrder\s*\(/);
if(start<0){
  console.error('FAIL createManualOrder not found');
  process.exit(1);
}
const rest=t.slice(start);
const next=rest.slice(20).search(/\n\s*async\s+[A-Za-z0-9_]+\s*\(/);
const body=next>=0?rest.slice(0,next+20):rest;

const store=body.indexOf('const storeId=store.id;');
const reservation=body.indexOf('const reservationMinutes=await this.reservationMinutes(storeId);');

if(store<0){
  console.error('FAIL storeId declaration not found');
  process.exit(1);
}
if(reservation<0){
  console.error('FAIL reservationMinutes declaration not found');
  process.exit(1);
}
if(reservation<store){
  console.error('FAIL reservationMinutes is still before storeId');
  process.exit(1);
}
if((body.match(/const reservationMinutes=await this\.reservationMinutes\(storeId\);/g)||[]).length!==1){
  console.error('FAIL reservationMinutes declaration count is not exactly 1');
  process.exit(1);
}

console.log('OK createManualOrder storeId before reservationMinutes');
console.log('OK createManualOrder reservationMinutes declaration count = 1');
console.log('Ticarti Fix 8A3 verification: OK');
