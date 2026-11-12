import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const url=String(process.env.DATABASE_URL||'').trim();
const storeId=String(process.env.TICARTI_TEST_STORE_ID||'').trim();
const warehouseId=String(process.env.TICARTI_TEST_WAREHOUSE_ID||'').trim();
const variantId=String(process.env.TICARTI_TEST_VARIANT_ID||'').trim();
if(!url||!storeId||!warehouseId||!variantId){
  console.log('SKIP core commerce integration: DATABASE_URL + TICARTI_TEST_STORE_ID + TICARTI_TEST_WAREHOUSE_ID + TICARTI_TEST_VARIANT_ID are required.');
  process.exit(0);
}
const prisma=new PrismaClient({datasources:{db:{url}}});
class Rollback extends Error{}
try{
  const before=await prisma.warehouseStock.findFirst({where:{warehouseId,variantId,warehouse:{storeId}}});
  assert(before,'fixture WarehouseStock not found or outside store');
  let ledgerSeen=false;
  try{
    await prisma.$transaction(async tx=>{
      const stamp=`integration:${Date.now()}`;
      const updated=await tx.warehouseStock.update({where:{warehouseId_variantId:{warehouseId,variantId}},data:{onHand:{increment:1}}});
      assert.equal(updated.onHand,before.onHand+1);
      const ledger=await tx.inventoryLedgerEntry.findFirst({where:{storeId,warehouseId,variantId,createdAt:{gte:new Date(Date.now()-10_000)}},orderBy:{createdAt:'desc'}});
      assert(ledger,'inventory ledger trigger did not record stock mutation');
      assert.equal(ledger.deltaOnHand,1);
      assert.equal(ledger.balanceOnHand,before.onHand+1);
      ledgerSeen=true;
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,stamp);
      throw new Rollback('ROLLBACK');
    },{isolationLevel:'Serializable',timeout:15000});
  }catch(e){if(!(e instanceof Rollback))throw e;}
  assert(ledgerSeen,'ledger assertion did not execute');
  const after=await prisma.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId,variantId}}});
  assert.equal(after?.onHand,before.onHand,'integration transaction did not roll back cleanly');
  console.log('OK inventory ledger trigger records mutation inside transaction');
  console.log('OK integration transaction rollback leaves fixture unchanged');
  console.log('Ticarti core commerce DB integration: OK');
}finally{await prisma.$disconnect();}
