import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CheckoutSessionService } from './checkout-session.service';

function fixture() {
  const cart = {
    id:'cart-one',token:'token-one',storeId:'store-one',customerId:null,
    status:'active',currency:'TRY',items:[{id:'item-one',isGift:false}],
    store:{id:'store-one',status:'ACTIVE',domain:'example.com',locale:'tr-TR',currency:'TRY'},
  };
  const sessions:any[]=[];
  let chain:Promise<any>=Promise.resolve();
  let created=0;
  const prisma:any = {
    $transaction: async (fn:(tx:any)=>Promise<any>) => {
      const prior=chain;
      let release!:()=>void;
      chain=new Promise<void>(resolve=>{release=resolve});
      await prior;
      try { return await fn(tx); }
      finally { release(); }
    },
  };
  const tx:any={
    cart:{findUnique:async ({where}:any)=> where.token===cart.token||where.id===cart.id ? cart:null},
    $queryRaw:async()=>[{pg_advisory_xact_lock:null}],
    checkoutSession:{
      findFirst:async()=>sessions.filter(s=>s.status==='OPEN'&&s.expiresAt.getTime()>Date.now()).at(-1)||null,
      updateMany:async()=>{let count=0;for(const s of sessions){if(s.status==='OPEN'){s.status='SUPERSEDED';count++}}return {count}},
      create:async ({data}:any)=>{created++;const s={...data,id:`session-${created}`,createdAt:new Date()};sessions.push(s);return s},
    },
  };
  return {service:new CheckoutSessionService(prisma),sessions,get created(){return created}};
}

test('CheckoutSessionService.create reuses one OPEN session across 12 concurrent requests',async()=>{
 const f=fixture();
 const results=await Promise.all(Array.from({length:12},()=>f.service.create({cartToken:'token-one'})));
 assert.equal(f.created,1);
 assert.equal(new Set(results.map(r=>r.id)).size,1);
 assert.equal(f.sessions.filter(s=>s.status==='OPEN').length,1);
 assert.match(results[0].url,/session=session-1/);
});

test('CheckoutSessionService.create rejects empty token and does not create a session',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.service.create({cartToken:' '}));
 assert.equal(f.created,0);
});
