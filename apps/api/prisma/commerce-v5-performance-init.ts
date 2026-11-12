import {PrismaClient} from '@prisma/client';
const prisma=new PrismaClient();
async function main(){
  const sql=[
    `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
    `CREATE INDEX IF NOT EXISTS product_store_updated_idx ON "Product" ("storeId","updatedAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS product_title_trgm_idx ON "Product" USING gin ("title" gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS variant_sku_trgm_idx ON "Variant" USING gin ("sku" gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS variant_barcode_trgm_idx ON "Variant" USING gin ("barcode" gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS customer_email_trgm_idx ON "Customer" USING gin ("email" gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS customer_first_name_trgm_idx ON "Customer" USING gin ("firstName" gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS customer_last_name_trgm_idx ON "Customer" USING gin ("lastName" gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS customer_phone_trgm_idx ON "Customer" USING gin ("phone" gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS order_store_fulfillment_created_idx ON "Order" ("storeId","fulfillmentStatus","createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS order_store_source_created_idx ON "Order" ("storeId","source","createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS order_store_risk_created_idx ON "Order" ("storeId","riskLevel","createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS customer_store_merged_created_idx ON "Customer" ("storeId","mergedIntoId","createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS warehouse_stock_variant_warehouse_idx ON "WarehouseStock" ("variantId","warehouseId")`
  ];
  for(const statement of sql){try{await prisma.$executeRawUnsafe(statement)}catch(e){console.warn('[commerce-v5-index]',statement,(e as Error).message)}}
  console.log('[commerce-v5-index] ready');
}
main().finally(()=>prisma.$disconnect());
