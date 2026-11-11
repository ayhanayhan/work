import 'reflect-metadata';
import assert from 'node:assert/strict';
import {ForbiddenException,UnauthorizedException} from '@nestjs/common';
import {MarketplaceSessionController} from '../src/apps/marketplace-session.controller';

const requests:any[]=[];
const auth:any={
 browserSession:async(token:string)=>{
  if(token!=='valid')throw new UnauthorizedException();
  return {authenticated:true,memberships:[
    {tenantId:'a',role:'OWNER'},
    {tenantId:'b',role:'STAFF'},
    {tenantId:'c',role:'ADMIN'},
  ]};
 }
};
const apps:any={
 store:async(t:string)=>{requests.push(['store',t]);return {items:[{slug:'sample',installed:t==='a',price:0,currency:'TRY',settingsSchema:{secret:'never'}}]}},
 install:async(t:string,s:string)=>{requests.push(['install',t,s]);return {installed:true,slug:s}}
};
const response:any={setHeader:()=>{}};
const req:any={headers:{cookie:'commerce_admin_refresh=valid'}};
async function run(){
 const c=new MarketplaceSessionController(auth,apps);
 const read=await c.store(req,response,'a','https://app.ticarti.com');
 assert.equal(read.items.length,1);
 assert.equal(read.items[0].installed,true);
 assert.equal((read.items[0] as any).settingsSchema,undefined);
 const installed=await c.install(req,response,'sample','a','https://app.ticarti.com');
 assert.equal(installed.installed,true);
 await assert.rejects(()=>c.install(req,response,'sample','b','https://app.ticarti.com'),ForbiddenException);
 await assert.rejects(()=>c.store(req,response,'b','https://app.ticarti.com'),ForbiddenException);
 await assert.rejects(()=>c.store(req,response,'wrong','https://app.ticarti.com'),ForbiddenException);
 await assert.rejects(()=>c.store(req,response,'a','https://ticarti.com'),ForbiddenException);
 await assert.rejects(()=>c.install(req,response,'sample','a','https://ticarti.com'),ForbiddenException);
 await assert.rejects(()=>c.install({headers:{}},response,'sample','a','https://app.ticarti.com'),UnauthorizedException);
 assert.deepEqual(requests,[['store','a'],['install','a','sample']]);
 console.log('App marketplace tenant, auth, permissions and origin contract checks passed');
}
run().catch(e=>{console.error(e);process.exitCode=1});
