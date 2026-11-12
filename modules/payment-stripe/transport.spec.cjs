const assert=require('node:assert/strict');const {createHmac}=require('node:crypto');const {request,verifySignature}=require('./transport.cjs');
(async()=>{
 const body='{"id":"evt_123"}';const ts=String(Math.floor(Date.now()/1000));const signature=createHmac('sha256','whsec_demo').update(ts+'.'+body).digest('hex');
 assert.equal(verifySignature(body,`t=${ts},v1=${signature}`,'whsec_demo'),true);
 assert.throws(()=>verifySignature(body,`t=${ts},v1=${signature}`,'wrong'));
 assert.throws(()=>verifySignature(body,'t=1,v1='+signature,'whsec_demo'));
 await assert.rejects(request({secretKey:'x',path:'https://evil.invalid/v1/refunds'}));
 await assert.rejects(request({secretKey:'x',path:'/v1/refunds',method:'DELETE'}));
 console.log('PASS Stripe transport signature and request-boundary tests');
})().catch(e=>{console.error(e);process.exitCode=1});
