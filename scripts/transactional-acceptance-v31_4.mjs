#!/usr/bin/env node

const env=(k)=>String(process.env[k]||'').trim();
const API=env('TICARTI_ACCEPTANCE_API_URL').replace(/\/+$/,'');
const TOKEN=env('TICARTI_ACCEPTANCE_TOKEN');
const TENANT=env('TICARTI_ACCEPTANCE_TENANT_ID');
const STORE=env('TICARTI_ACCEPTANCE_STORE_ID')||TENANT;
let VARIANT=env('TICARTI_ACCEPTANCE_VARIANT_ID');
let WAREHOUSE=env('TICARTI_ACCEPTANCE_WAREHOUSE_ID');
const CONFIRM=env('TICARTI_ACCEPTANCE_CONFIRM');
const ALLOW_PROD=env('TICARTI_ACCEPTANCE_ALLOW_PRODUCTION')==='YES';

for(const [k,v] of Object.entries({
  TICARTI_ACCEPTANCE_API_URL:API,
  TICARTI_ACCEPTANCE_TOKEN:TOKEN,
  TICARTI_ACCEPTANCE_TENANT_ID:TENANT
})) if(!v){console.error(`HATA: ${k} gerekli`);process.exit(2)}

if(STORE!==TENANT){
  console.error('HATA: Bu mimaride acceptance storeId tenantId ile aynı olmalıdır.');
  process.exit(2);
}
if(CONFIRM!=='CREATE_TEST_ORDERS'){
  console.error('HATA: TICARTI_ACCEPTANCE_CONFIRM=CREATE_TEST_ORDERS gerekli');
  process.exit(2);
}

const productionLike=/commerce-api|\.a\.run\.app|api\.ticarti\.com/i.test(API);
if(productionLike&&!ALLOW_PROD){
  console.error('HATA: production benzeri API hostu algılandı. Dedicated acceptance/test tenant üzerinde çalıştıracaksan TICARTI_ACCEPTANCE_ALLOW_PRODUCTION=YES ayrıca gerekli.');
  process.exit(2);
}

const headers={
  'content-type':'application/json',
  'authorization':`Bearer ${TOKEN}`,
  'x-tenant-id':TENANT
};

async function req(method,url,body,expected=[200,201]){
  const r=await fetch(`${API}${url}`,{
    method,
    headers,
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await r.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!expected.includes(r.status)){
    const e=new Error(`${method} ${url} -> HTTP ${r.status}: ${typeof data==='string'?data:JSON.stringify(data)}`);
    e.status=r.status;e.data=data;throw e;
  }
  return data;
}
function assert(c,msg){
  if(!c)throw new Error(`ASSERT: ${msg}`);
  console.log('OK',msg);
}
function num(v){return Number(v||0)}

console.log('== Ticarti v31.4.2 Live Transaction Acceptance ==');
console.log(`API: ${API}`);
console.log(`Tenant/Store: ${TENANT}`);

if(!WAREHOUSE||!VARIANT){
  const stocks=await req('GET',`/v1/admin/warehouse-stocks?storeId=${encodeURIComponent(STORE)}`);
  if(!Array.isArray(stocks)||!stocks.length){
    throw new Error('Acceptance tenant üzerinde warehouse stock bulunamadı');
  }

  const candidates=stocks.filter(row=>{
    const available=
      num(row.onHand)
      - num(row.reserved)
      - num(row.committed)
      - num(row.damaged)
      - num(row.safetyStock);
    return row?.warehouse?.isActive!==false && row?.variant?.id && available>=2;
  });

  if(!candidates.length){
    throw new Error('Acceptance için en az 2 adet kullanılabilir stoğu olan varyant/depo bulunamadı');
  }

  let chosen=candidates[0];
  if(WAREHOUSE){
    chosen=candidates.find(x=>String(x.warehouseId)===WAREHOUSE)||chosen;
  }
  if(VARIANT){
    chosen=candidates.find(x=>String(x.variantId)===VARIANT)||chosen;
  }

  WAREHOUSE=WAREHOUSE||String(chosen.warehouseId);
  VARIANT=VARIANT||String(chosen.variantId);

  console.log(`Auto warehouse: ${WAREHOUSE} (${chosen?.warehouse?.name||''})`);
  console.log(`Auto variant: ${VARIANT} (${chosen?.variant?.sku||chosen?.variant?.title||''})`);
}

const warehouses=await req('GET',`/v1/admin/warehouses?storeId=${encodeURIComponent(STORE)}`);
assert(Array.isArray(warehouses)&&warehouses.some(x=>String(x.id)===WAREHOUSE),'acceptance warehouse is visible');

const stocks=await req('GET',`/v1/admin/warehouse-stocks?storeId=${encodeURIComponent(STORE)}&warehouseId=${encodeURIComponent(WAREHOUSE)}`);
const stockRow=Array.isArray(stocks)?stocks.find(x=>String(x.variantId)===VARIANT):null;
assert(!!stockRow,'acceptance variant stock exists in selected warehouse');
const availableBefore=
  num(stockRow.onHand)
  - num(stockRow.reserved)
  - num(stockRow.committed)
  - num(stockRow.damaged)
  - num(stockRow.safetyStock);
assert(availableBefore>=2,'acceptance variant has at least 2 available units');

const stamp=Date.now();
const baseBody={
  storeId:STORE,
  items:[{variantId:VARIANT,quantity:1}],
  paymentMethod:'BANK_TRANSFER',
  paymentStatus:'PAID',
  deliveryType:'PICKUP',
  warehouseId:WAREHOUSE,
  reserveStock:true,
  customerName:'Ticarti Acceptance',
  customerEmail:`acceptance-${stamp}@example.invalid`,
  customerPhone:'+905550000000',
  shippingAddress:{
    name:'Ticarti Acceptance',
    country:'TR',
    city:'Istanbul',
    district:'Test',
    addressLine1:'Acceptance test'
  },
  billingAddress:{
    name:'Ticarti Acceptance',
    country:'TR',
    city:'Istanbul',
    district:'Test',
    addressLine1:'Acceptance test'
  },
  tags:['v31-acceptance'],
  internalNote:`v31.4.2 acceptance ${stamp}`
};

const quote=await req('POST','/v1/admin/manual-orders/quote',baseBody);
assert(num(quote.grandTotal)>=0,'manual order quote returned');

const order=await req('POST','/v1/admin/manual-orders',baseBody);
assert(order?.id,'manual order created');
assert(String(order.source)==='manual_order','manual order source isolated');
assert(String(order.paymentStatus)==='PAID','manual paid order created');
assert(Array.isArray(order.items)&&order.items.length===1,'manual order has one item');

const orderId=String(order.id);
const initialItem=order.items[0];

const detail=await req('GET',`/v1/admin/orders/${orderId}?storeId=${encodeURIComponent(STORE)}`);
assert(detail?.id===orderId,'created order readable');

const oldUnit=num(initialItem.unitPrice);
const editedUnit=Math.max(0.01,Math.round(Math.max(0.01,oldUnit-0.01)*100)/100);

const edited=await req('PATCH',`/v1/admin/commerce/orders/${orderId}/items`,{
  storeId:STORE,
  items:[{
    id:initialItem.id,
    variantId:VARIANT,
    quantity:1,
    unitPrice:editedUnit
  }]
});
assert(edited?.metadata?.orderEditAdjustment,'order edit adjustment created');

const adj=edited.metadata.orderEditAdjustment;
if(num(adj.refundDue)>0){
  const settled=await req('POST',`/v1/admin/commerce/orders/${orderId}/edit-adjustment/settle`,{
    storeId:STORE,
    refundConfirmed:true,
    refundReference:`acceptance-edit-${stamp}`
  });
  assert(String(settled.paymentStatus)==='PAID','order edit refund adjustment settled');
}else if(num(adj.amountDue)>0){
  const settled=await req('POST',`/v1/admin/commerce/orders/${orderId}/edit-adjustment/settle`,{
    storeId:STORE,
    paymentConfirmed:true,
    providerReference:`acceptance-edit-${stamp}`
  });
  assert(String(settled.paymentStatus)==='PAID','order edit charge adjustment settled');
}else{
  assert(String(adj.status)==='SETTLED','zero order edit difference settled');
}

const afterEdit=await req('GET',`/v1/admin/orders/${orderId}?storeId=${encodeURIComponent(STORE)}`);
const liveItem=afterEdit.items?.[0];
assert(liveItem?.id,'edited order item readable');

const fulfillment=await req('POST',`/v1/admin/orders/${orderId}/fulfillments`,{
  storeId:STORE,
  warehouseId:WAREHOUSE,
  items:[{orderItemId:liveItem.id,quantity:1}],
  note:'v31.4.2 acceptance fulfillment'
});
assert(fulfillment?.fulfillment?.id,'fulfillment created');

const refundKey=`v31-acceptance-${stamp}`;
const refundBody={
  storeId:STORE,
  idempotencyKey:refundKey,
  manualConfirmed:true,
  reason:'V31_ACCEPTANCE',
  items:[{orderItemId:liveItem.id,quantity:1}],
  metadata:{acceptance:true}
};

const refund1=await req('POST',`/v1/admin/orders/${orderId}/refunds`,refundBody);
assert(refund1?.id,'item refund created');

const refundReplay=await req('POST',`/v1/admin/orders/${orderId}/refunds`,refundBody);
assert(refundReplay?.id===refund1.id,'refund idempotency replay returns same refund');

let repeatBlocked=false;
try{
  await req('POST',`/v1/admin/orders/${orderId}/refunds`,{
    ...refundBody,
    idempotencyKey:`${refundKey}-different`
  });
}catch(e){
  if([400,409,422].includes(e.status)) repeatBlocked=true;
  else throw e;
}
assert(repeatBlocked,'second refund of consumed item quantity blocked');

const finalOrder=await req('GET',`/v1/admin/orders/${orderId}?storeId=${encodeURIComponent(STORE)}`);
assert(
  ['PARTIALLY_REFUNDED','REFUNDED'].includes(String(finalOrder.paymentStatus)),
  'order payment status reflects refund'
);

console.log('');
console.log('Ticarti v31.4.2 Live Transaction Acceptance: OK');
console.log(`Acceptance order id: ${orderId}`);
console.log(`Warehouse: ${WAREHOUSE}`);
console.log(`Variant: ${VARIANT}`);
console.log('Not: Test siparişi/refund audit izi acceptance tenant üzerinde bilinçli olarak bırakılır.');
