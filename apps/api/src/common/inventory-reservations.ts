export function warehouseAvailable(stock:any){
  return Math.max(0,Number(stock?.onHand||0)-Number(stock?.reserved||0)-Number(stock?.committed||0)-Number(stock?.damaged||0)-Number(stock?.safetyStock||0));
}

export async function releaseExpiredInventoryReservations(db:any,options:{storeId?:string;orderId?:string;variantId?:string;warehouseIds?:string[]}={}){
  const now=new Date();
  const rows=await db.inventoryReservation.findMany({
    where:{status:'HELD',expiresAt:{lte:now},...(options.storeId?{storeId:options.storeId}:{}),...(options.orderId?{orderId:options.orderId}:{}),...(options.variantId?{variantId:options.variantId}:{}),...(options.warehouseIds?.length?{warehouseId:{in:options.warehouseIds}}:{})},
    select:{id:true,warehouseId:true,variantId:true,quantity:true}
  });
  let released=0;
  for (const row of rows) {
    // Both the HELD -> RELEASED claim and its stock effect must commit together.
    // A failed/missing stock row causes rollback, leaving the reservation retryable.
    const changed = await db.$transaction(async (tx:any) => {
      const claimed = await tx.inventoryReservation.updateMany({
        where: { id:row.id, status:'HELD', expiresAt:{lte:now} },
        data: { status:'RELEASED', expiresAt:null },
      });
      if (claimed.count !== 1) return 0;
      const quantity = Math.max(0, Number(row.quantity || 0));
      if (!Number.isSafeInteger(quantity)) throw new Error('Invalid reservation quantity');
      if (quantity === 0) return 0;
      const stock = await tx.warehouseStock.findUnique({
        where: { warehouseId_variantId: { warehouseId:row.warehouseId, variantId:row.variantId } },
      });
      if (!stock) throw new Error('Warehouse stock missing during reservation release');
      const reserved = Number(stock.reserved || 0);
      if (reserved < quantity) throw new Error('Reserved stock lower than expiring reservation quantity');
      const updated = await tx.warehouseStock.updateMany({
        where: { id:stock.id, reserved:stock.reserved },
        data: { reserved:{decrement:quantity} },
      });
      if (updated.count !== 1) throw new Error('Concurrent warehouse stock change; release rolled back');
      return quantity;
    });
    released += changed;
  }
  return released;
}
