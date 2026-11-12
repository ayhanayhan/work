'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const mod=require('./transport.cjs');
test('refund reconciliation is read-only and finds transaction by metadata',async()=>{
 const previous=globalThis.fetch;let seen=[];
 globalThis.fetch=async(url,init)=>{seen.push({url:String(url),method:init.method});return {ok:true,text:async()=>JSON.stringify({data:[{id:'re_ok123',payment_intent:'pi_abc123',currency:'usd',amount:1000,status:'succeeded',metadata:{transactionId:'tx-1'}}],has_more:false})}};
 try{const r=await mod.reconcileRefund({secretKey:'sk_test',paymentIntentId:'pi_abc123',transactionId:'tx-1'});assert.equal(r.id,'re_ok123');assert.equal(seen.length,1);assert.equal(seen[0].method,'GET');assert.match(seen[0].url,/payment_intent=pi_abc123/);}
 finally{globalThis.fetch=previous;}
});
test('refund reconciliation fails closed for missing match and invalid identifiers',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,text:async()=>JSON.stringify({data:[],has_more:false})});
 try{assert.equal(await mod.reconcileRefund({secretKey:'sk_test',paymentIntentId:'pi_abc123',transactionId:'tx-2'}),null);await assert.rejects(()=>mod.reconcileRefund({secretKey:'x',paymentIntentId:'invalid',transactionId:'tx-2'}));}
 finally{globalThis.fetch=previous;}
});
