import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma=new PrismaClient();
const STORE_SLUG=String(process.env.LOADTEST_STORE_SLUG||'main').trim();
const BASE_VARIANT_ID=String(process.env.LOADTEST_BASE_VARIANT_ID||process.env.LOADTEST_VARIANT_ID||'').trim();
const VARIANT_COUNT=Math.max(10,Math.min(40,Number(process.env.LOADTEST_MIXED_VARIANTS||20)||20));
const STOCK_PER_VARIANT=Math.max(1000,Number(process.env.LOADTEST_MIXED_STOCK||3000)||3000);
const OUT=String(process.env.LOADTEST_FIXTURE_FILE||'scripts/.loadtest-mixed-fixture.json');

if(!BASE_VARIANT_ID)throw new Error('LOADTEST_BASE_VARIANT_ID or LOADTEST_VARIANT_ID is required');

const store=await prisma.tenant.findUnique({where:{slug:STORE_SLUG}});
if(!store)throw new Error(`Store not found: ${STORE_SLUG}`);

const base=await prisma.variant.findFirst({where:{id:BASE_VARIANT_ID,product:{storeId:store.id}},include:{product:true}});
if(!base)throw new Error(`Base variant not found in store: ${BASE_VARIANT_ID}`);

let warehouseA=await prisma.warehouse.findFirst({where:{storeId:store.id,isActive:true,isDefault:true},orderBy:{priority:'asc'}});
if(!warehouseA)warehouseA=await prisma.warehouse.findFirst({where:{storeId:store.id,isActive:true},orderBy:[{priority:'asc'},{createdAt:'asc'}]});
if(!warehouseA)throw new Error('No active warehouse found');

let warehouseB=await prisma.warehouse.findFirst({where:{storeId:store.id,code:'LOADTEST-B'}});
if(!warehouseB){
  warehouseB=await prisma.warehouse.create({data:{
    storeId:store.id,name:'Load Test Warehouse B',code:'LOADTEST-B',
    isDefault:false,isActive:true,priority:Number(warehouseA.priority||0)+10,
    address:{country:'TR',city:'Ankara',postalCode:'06000'}
  }});
}else if(!warehouseB.isActive){
  warehouseB=await prisma.warehouse.update({where:{id:warehouseB.id},data:{isActive:true}});
}

const settings=(store.settings&&typeof store.settings==='object'&&!Array.isArray(store.settings))?store.settings:{};
const inventoryPolicy=(settings.inventoryPolicy&&typeof settings.inventoryPolicy==='object'&&!Array.isArray(settings.inventoryPolicy))?settings.inventoryPolicy:{};
await prisma.tenant.update({
  where:{id:store.id},
  data:{settings:{...settings,inventoryPolicy:{...inventoryPolicy,allocationPolicy:'PRIORITY',splitAllowed:true}}}
});

const run=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const groupA=[],groupB=[],groupAB=[],all=[];

for(let i=0;i<VARIANT_COUNT;i++){
  const sku=`LT-MIX-${run}-${String(i+1).padStart(2,'0')}`;
  const v=await prisma.variant.create({data:{
    productId:base.productId,
    title:`Load Test Mixed ${i+1}`,
    sku,
    price:base.price,
    comparePrice:base.comparePrice,
    cost:base.cost,
    weight:base.weight,
    isActive:true,
    inventory:{create:{trackStock:true,allowBackorder:false,lowStockAt:5}}
  }});
  all.push(v.id);

  if(i<Math.floor(VARIANT_COUNT*0.4)){
    groupA.push(v.id);
    await prisma.warehouseStock.create({data:{warehouseId:warehouseA.id,variantId:v.id,onHand:STOCK_PER_VARIANT}});
  }else if(i<Math.floor(VARIANT_COUNT*0.8)){
    groupB.push(v.id);
    await prisma.warehouseStock.create({data:{warehouseId:warehouseB.id,variantId:v.id,onHand:STOCK_PER_VARIANT}});
  }else{
    groupAB.push(v.id);
    const half=Math.ceil(STOCK_PER_VARIANT/2);
    await prisma.warehouseStock.createMany({data:[
      {warehouseId:warehouseA.id,variantId:v.id,onHand:half},
      {warehouseId:warehouseB.id,variantId:v.id,onHand:half},
    ]});
  }
}

const payload={
  createdAt:new Date().toISOString(),
  run,
  storeId:store.id,
  storeSlug:STORE_SLUG,
  productId:base.productId,
  baseVariantId:base.id,
  warehouses:{a:{id:warehouseA.id,code:warehouseA.code},b:{id:warehouseB.id,code:warehouseB.code}},
  variants:{all,a:groupA,b:groupB,ab:groupAB},
  stockPerVariant:STOCK_PER_VARIANT
};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2));
console.log(JSON.stringify({ok:true,fixture:OUT,variantCount:all.length,warehouseA:warehouseA.code,warehouseB:warehouseB.code},null,2));
await prisma.$disconnect();
