import 'reflect-metadata';
import assert from 'node:assert/strict';
import {MerchantAuthController} from '../src/merchant-auth/merchant-auth.controller';

async function run(){
 const calls:string[]=[];
 const auth:any={
  loginHandoff:async()=>({handoffCode:'test-handoff',memberships:[{tenantId:'t1'}],refreshToken:'private-refresh'}),
  consumeSocialHandoff:async()=>({handoffCode:'social-handoff',memberships:[{tenantId:'t1'}],refreshToken:'private-social'}),
  browserSession:async()=>({authenticated:true,user:{id:'u1',name:'Test User',email:'test@example.com'},memberships:[{tenantId:'t1'}]}),
  logoutEverywhere:async(token:string)=>{calls.push('everywhere:'+token)},
  logout:async(token:string)=>{calls.push('one:'+token)}
 };
 const controller=new MerchantAuthController(auth);
 const resultHeaders:Record<string,string>={};
 const res:any={setHeader:(name:string,val:string)=>{resultHeaders[name]=String(val)}};
 const landing:any={headers:{'x-auth-client':'merchant-landing','user-agent':'test-browser'}};
 const login=await controller.login({email:'test@example.com',password:'test'} as any,landing,res);
 assert.equal(login.handoffCode,'test-handoff');
 assert.equal((login as any).refreshToken,undefined);
 assert.equal((login as any).accessToken,undefined);
 assert.match(resultHeaders['Set-Cookie']||'',/HttpOnly/);
 assert.match(resultHeaders['Set-Cookie']||'',/SameSite=Strict/);
 assert.doesNotMatch(resultHeaders['Set-Cookie']||'',/Domain=/);

 const session=await controller.session({...landing,headers:{...landing.headers,cookie:'commerce_admin_refresh=private-refresh'}},res);
 assert.equal(session.authenticated,true);
 assert.equal(session.user.name,'Test User');
 assert.equal((session as any).refreshToken,undefined);

 const social=await controller.completeSocial({code:'one-time-code'} as any,landing,res);
 assert.equal(social.handoffCode,'social-handoff');
 assert.equal((social as any).refreshToken,undefined);

 const logoutReq:any={headers:{'x-auth-client':'merchant-landing',cookie:'commerce_admin_refresh=private-refresh'}};
 await controller.logout({} as any,logoutReq,res);
 assert.deepEqual(calls,['everywhere:private-refresh']);

 const adminReq:any={headers:{'x-auth-client':'merchant-admin',cookie:'commerce_admin_refresh=private-refresh'}};
 await controller.logout({} as any,adminReq,res);
 assert.deepEqual(calls,['everywhere:private-refresh','one:private-refresh']);
 console.log('Shared header sign-in / session / social / logout contract checks passed');
}
run().catch(e=>{console.error(e);process.exitCode=1});
