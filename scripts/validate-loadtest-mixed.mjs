import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma=new PrismaClient();
const file=String(process.env.LOADTEST_FIXTURE_FILE||'scripts/.loadtest-mixed-fixture.json');
if(!fs.existsSync(file))throw new Error(`Fixture file missing: ${file}`);
const fixture=JSON.parse(fs.readFileSync(file,'utf8'));
const ids=fixture.variants.all;

const stocks=await prisma.warehouseStock.findMany({where:{variantId:{in:ids}},select:{
  warehouseId:true,variantId:true,onHand:true,reserved:true,committed:true,damaged:true,safetyStock:true
}});
const rows=stocks.map(x=>({...x,available:Number(x.onHand)-Number(x.reserved)-Number(x.committed)-Number(x.damaged)-Number(x.safetyStock)}));
const negative=rows.filter(x=>x.available<0);

const reservations=await prisma.inventoryReservation.findMany({
  where:{variantId:{in:ids},createdAt:{gte:new Date(fixture.createdAt)}},
  select:{orderId:true,warehouseId:true,variantId:true,quantity:true,status:true}
});
const byOrder=new Map();
for(const r of reservations){
  if(!r.orderId)continue;
  const s=byOrder.get(r.orderId)||new Set();
  s.add(r.warehouseId);
  byOrder.set(r.orderId,s);
}
const cross=[...byOrder.values()].filter(s=>s.size>1).length;
const out={
  stockRows:rows.length,
  negativeAvailability:negative.length,
  reservationRows:reservations.length,
  ordersWithReservations:byOrder.size,
  crossWarehouseOrders:cross,
  minAvailable:rows.length?Math.min(...rows.map(x=>x.available)):null
};
console.log(JSON.stringify(out,null,2));
if(negative.length)throw new Error(`Oversell detected: ${negative.length} stock rows have negative availability`);
if(byOrder.size>0&&cross===0)throw new Error('No cross-warehouse order detected');
console.log('OK mixed multi-warehouse validation');
await prisma.$disconnect();
