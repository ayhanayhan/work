'use strict';
// Ticarti optional provider transport. No Prisma, tenant data, or order transitions.
const {createHmac,timingSafeEqual}=require('node:crypto');
function form(body){const out=new URLSearchParams();for(const [key,value] of Object.entries(body||{})){if(value!==undefined&&value!==null&&value!=='')out.set(key,String(value));}return out;}
async function request({secretKey,path,method='GET',body,idempotencyKey}){
 if(typeof secretKey!=='string'||!secretKey)throw new Error('Provider secret missing');
 if(typeof path!=='string'||!/^\/v1\/[A-Za-z0-9_\/%?=&.-]+$/.test(path))throw new Error('Invalid provider API path');
 if(!['GET','POST'].includes(method))throw new Error('Provider method not allowed');
 if(idempotencyKey&&(!/^[A-Za-z0-9:_-]{1,255}$/.test(idempotencyKey)))throw new Error('Invalid idempotency key');
 const res=await fetch('https://api.stripe.com'+path,{
  method,headers:{authorization:'Bearer '+secretKey,...(body?{'content-type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'idempotency-key':idempotencyKey}:{})},body:body?form(body):undefined,
  signal:AbortSignal.timeout(15000)
 });
 const raw=await res.text();let data;try{data=JSON.parse(raw);}catch{data={raw:raw.slice(0,512)};}
 if(!res.ok)throw new Error(data?.error?.message||'Provider request failed ('+res.status+')');
 return data;
}
function verifySignature(raw,header,secret){
 if(typeof raw!=='string'||typeof header!=='string'||typeof secret!=='string'||!secret)throw new Error('Invalid signature input');
 const parts=header.split(',').map(x=>x.trim());const ts=parts.find(x=>x.startsWith('t='))?.slice(2);
 const signatures=parts.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));
 if(!ts||!/^\d+$/.test(ts)||!signatures.length||Math.abs(Date.now()/1000-Number(ts))>300)throw new Error('Invalid timestamp');
 const expected=createHmac('sha256',secret).update(ts+'.'+raw).digest('hex');
 if(!signatures.some(sig=>/^[a-f0-9]{64}$/i.test(sig)&&timingSafeEqual(Buffer.from(sig.toLowerCase()),Buffer.from(expected))))throw new Error('Invalid signature');
 return true;
}
async function reconcileRefund({secretKey,paymentIntentId,transactionId,providerRefundId}){
 if(!/^pi_[A-Za-z0-9]+$/.test(String(paymentIntentId||'')))throw new Error('Invalid payment intent');
 if(!transactionId&&!providerRefundId)throw new Error('Refund identity required');
 if(providerRefundId){
   if(!/^re_[A-Za-z0-9]+$/.test(providerRefundId))throw new Error('Invalid refund reference');
   const found=await request({secretKey,path:'/v1/refunds/'+providerRefundId});
   if(found.payment_intent!==paymentIntentId || (transactionId && found.metadata?.transactionId!==transactionId))throw new Error('Refund identity mismatch');
   return found;
 }
 let cursor='';
 for(let page=0;page<10;page++){
   const query='payment_intent='+encodeURIComponent(paymentIntentId)+'&limit=100'+(cursor?'&starting_after='+encodeURIComponent(cursor):'');
   const result=await request({secretKey,path:'/v1/refunds?'+query});
   if(!Array.isArray(result.data))throw new Error('Malformed refund list');
   const matches=result.data.filter(r=>r.payment_intent===paymentIntentId && r.metadata?.transactionId===transactionId);
   if(matches.length!==0){if(matches.length!==1)throw new Error('Ambiguous refund matches');return matches[0];}
   if(!result.has_more)return null;
   cursor=String(result.data.at(-1)?.id||'');
   if(!cursor)throw new Error('Invalid refund pagination');
 }
 throw new Error('Refund pagination incomplete; hold remains reserved');
}
module.exports=Object.freeze({request,verifySignature,reconcileRefund});
