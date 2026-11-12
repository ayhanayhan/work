import assert from 'node:assert/strict';
import test from 'node:test';
import { releaseExpiredInventoryReservations } from './inventory-reservations';

test('releasing an expired reservation commits the claim and decrement once', async () => {
  let status='HELD', reserved=5;
  const tx:any={
    inventoryReservation:{updateMany:async({where}:any)=>{
      if(status!=='HELD'||where.status!=='HELD')return{count:0};
      status='RELEASED';return{count:1};
    }},
    warehouseStock:{
      findUnique:async()=>({id:'s',reserved}),
      updateMany:async({where,data}:any)=>{
        if(reserved!==where.reserved)return{count:0};
        reserved-=data.reserved.decrement;return{count:1};
      },
    },
  };
  const db:any={
    inventoryReservation:{findMany:async()=>status==='HELD'?[{id:'r',warehouseId:'w',variantId:'v',quantity:3}]:[]},
    $transaction:async(fn:any)=>fn(tx),
  };
  assert.equal(await releaseExpiredInventoryReservations(db),3);
  assert.equal(await releaseExpiredInventoryReservations(db),0);
  assert.equal(reserved,2);
});

test('stock CAS failure aborts the transaction so a claimed reservation remains retryable', async () => {
  let status='HELD', reserved=3;
  const row={id:'r',warehouseId:'w',variantId:'v',quantity:3};
  const db:any={
    inventoryReservation:{findMany:async()=>status==='HELD'?[row]:[]},
    $transaction:async(fn:any)=>{
      const oldStatus=status,oldReserved=reserved;
      const tx:any={
        inventoryReservation:{updateMany:async()=>{status='RELEASED';return{count:1}}},
        warehouseStock:{
          findUnique:async()=>({id:'s',reserved}),
          updateMany:async()=>({count:0}),
        },
      };
      try{return await fn(tx)}catch(e){status=oldStatus;reserved=oldReserved;throw e}
    },
  };
  await assert.rejects(releaseExpiredInventoryReservations(db),/rolled back/);
  assert.equal(status,'HELD');assert.equal(reserved,3);
});
