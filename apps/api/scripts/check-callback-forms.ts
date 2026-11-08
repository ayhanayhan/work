import assert from 'node:assert/strict';
import {ContactService} from '../src/contact/contact.service';

const db=new Map<string,any>();
const platformSetting={
 async findUnique({where:{key}}:any){return db.has(key)?{key,value:structuredClone(db.get(key))}:null},
 async findMany({where}:any){
  const prefix=where?.key?.startsWith||'';
  return [...db.entries()].filter(([key])=>key.startsWith(prefix)).map(([key,value])=>({key,value:structuredClone(value)}));
 },
 async create({data}:any){if(db.has(data.key))throw Error('Duplicate key');db.set(data.key,structuredClone(data.value));return data},
 async update({where:{key},data}:any){if(!db.has(key))throw Error('Missing');db.set(key,structuredClone(data.value));return {value:db.get(key)}},
 async upsert({where:{key},create,update}:any){const value=db.has(key)?update.value:create.value;db.set(key,structuredClone(value));return {value}}
};
const cache:any={incrementWindow:async()=>1};
const svc=new ContactService({platformSetting} as any,cache);

async function test(){
 await assert.rejects(svc.submitCallback({source:'HOME',dial:'+90',phone:'5551234567',consent:false},'127.0.0.1'));
 await assert.rejects(svc.submitCallback({source:'HOME',dial:'+90',phone:'123',consent:true},'127.0.0.1'));
 const home=await svc.submitCallback({source:'HOME',dial:'+90',phone:'5551234567',consent:true,locale:'tr'},'127.0.0.1');
 const blog=await svc.submitCallback({source:'BLOG',dial:'+90',phone:'5551234567',consent:true,locale:'en',slug:'example-post'},'127.0.0.1');
 assert.equal(home.ok,true);assert.equal(blog.ok,true);
 let leads=await svc.callbackInbox();
 assert.equal(leads.length,2);
 assert.equal(leads.find(x=>x.id===home.id)?.source,'HOME');
 assert.equal(leads.find(x=>x.id===blog.id)?.page,'example-post');
 assert.ok(leads.every(x=>x.notificationStatus==='DISABLED'));
 const updated=await svc.updateCallback(home.id,{status:'CONTACTED',internalNote:'Arandı'});
 assert.equal(updated.status,'CONTACTED');
 assert.equal((await svc.callbackInbox()).find(x=>x.id===home.id)?.internalNote,'Arandı');
 await assert.rejects(svc.updateCallbackEmailTemplate({enabled:true,recipient:'bad',subject:'Test',body:'Hello'}));
 const email=await svc.updateCallbackEmailTemplate({enabled:false,recipient:'sales@example.com',subject:'{{phone}}',body:'New: {{source}}'});
 assert.equal(email.enabled,false);
 assert.equal((await svc.callbackEmailTemplate()).recipient,'sales@example.com');
 // Older blog inquiries remain visible in the same inbox and can be updated.
 const id='e2d7abc4-700f-411d-a388-0e015fd23a01';
 db.set('marketing_blog_callback_v1_'+id,{id,phone:'+905551234567',slug:'old-article',createdAt:'2026-10-01T10:00:00.000Z',status:'NEW'});
 leads=await svc.callbackInbox();assert.equal(leads.length,3);
 assert.equal(leads.find(x=>x.id===id)?.source,'BLOG');
 assert.equal((await svc.updateCallback(id,{status:'CLOSED'})).status,'CLOSED');
 console.log('PASS: unified HOME/BLOG callbacks, validation, inbox/status, legacy compatibility, opt-in email template');
}
test().catch(error=>{console.error(error);process.exitCode=1});
