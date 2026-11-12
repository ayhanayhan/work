import assert from 'node:assert/strict';
import test from 'node:test';
import { warehouseAvailable, releaseExpiredInventoryReservations } from './inventory-reservations';

test('availability excludes reservations, commitments, damage and safety stock', () => {
  assert.equal(warehouseAvailable({onHand:100,reserved:15,committed:20,damaged:5,safetyStock:10}),50);
  assert.equal(warehouseAvailable({onHand:2,reserved:8,committed:0,damaged:0,safetyStock:0}),0);
});

test('expired HELD reservation releases reserved stock exactly once on repeated calls', async () => {
  const row={id:'res-1',warehouseId:'w',variantId:'v',quantity:3};
  let status='HELD', reserved=5;
  const db:any={
    $transaction:async(fn:any)=>fn(db),
    inventoryReservation:{
      findMany:async()=>status==='HELD'?[row]:[],
      updateMany:async({where}:any)=>{if(status!=='HELD'||where.status!=='HELD')return {count:0};status='RELEASED';return{count:1}}
    },
    warehouseStock:{
      findUnique:async()=>({id:'stock-1',reserved}),
      updateMany:async({where,data}:any)=>{if(reserved!==where.reserved)return{count:0};reserved-=data.reserved.decrement;return{count:1}}
    }
  };
  assert.equal(await releaseExpiredInventoryReservations(db),3);
  assert.equal(await releaseExpiredInventoryReservations(db),0);
  assert.equal(reserved,2);
});

test('concurrent claim loser does not release reserved stock twice', async () => {
  const row={id:'res-2',warehouseId:'w',variantId:'v',quantity:2};
  let claims=0, updates=0;
  const db:any={
    $transaction:async(fn:any)=>fn(db),
    inventoryReservation:{findMany:async()=>[row],updateMany:async()=>({count:++claims===1?1:0})},
    warehouseStock:{findUnique:async()=>({id:'s',reserved:4}),updateMany:async()=>{updates++;return{count:1}}}
  };
  const totals=await Promise.all([releaseExpiredInventoryReservations(db),releaseExpiredInventoryReservations(db)]);
  assert.equal(totals.reduce((a,b)=>a+b,0),2);
  assert.equal(updates,1);
});
