import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { AppAuthService } from './app-auth.service';
import { AppApiGuard } from './app-api.guard';

function assertIsolated() {
  if (process.env.TICARTI_ISOLATED_DB_E2E !== 'YES') throw new Error('BLOCKED: TICARTI_ISOLATED_DB_E2E=YES required');
  const raw=process.env.DATABASE_URL || '';
  if (!raw) throw new Error('BLOCKED: DATABASE_URL required');
  const parsed=new URL(raw);
  const socket=parsed.searchParams.get('host') || '';
  const target=(parsed.hostname+' '+socket+' '+decodeURIComponent(parsed.pathname)).toLowerCase();
  if (/commerce-db(?!-loadtest)/.test(target)) throw new Error('BLOCKED: production Cloud SQL instance');
  if (!(target.includes('commerce-db-loadtest') || /(?:^|[_/-])(test|e2e|ci)(?:$|[_/-])/.test(target))) {
    throw new Error('BLOCKED: only explicitly isolated test database targets allowed');
  }
  if ((process.env.CONTROL_DATABASE_URL || '') && process.env.CONTROL_DATABASE_URL !== raw) {
    throw new Error('BLOCKED: CONTROL_DATABASE_URL must match isolated DATABASE_URL');
  }
}

const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
const verifier='v'.repeat(48);
const challenge=createHash('sha256').update(verifier, 'ascii').digest('base64url');
const prefix=`ticarti_e2e_${randomUUID().replaceAll('-','')}`;

test('isolated PostgreSQL: real OAuth PKCE + installation tenant and replay prevention', async () => {
  assertIsolated();
  const db=new PrismaClient();
  const service=new AppAuthService(Object.assign(db,{control:()=>db}) as any);
  const tenantA=prefix+'_a', tenantB=prefix+'_b', appSlug=prefix+'_app';
  const clientId=prefix+'_client', clientSecret='test-secret-'+prefix;
  const redirectUri='https://e2e.example.test/callback';
  let appId:string|undefined;
  try {
    await db.$connect();
    const a=await db.tenant.create({data:{name:'E2E Store A',slug:tenantA,publicSlug:tenantA}});
    const b=await db.tenant.create({data:{name:'E2E Store B',slug:tenantB,publicSlug:tenantB}});
    const app=await db.appDefinition.create({data:{slug:appSlug,name:'E2E OAuth App',category:'TEST',summary:'Isolated OAuth test'}});
    appId=app.id;
    const client=await db.appClient.create({data:{appId:app.id,name:'Isolated E2E',clientId,clientSecretHash:sha(clientSecret),redirectUris:[redirectUri]}});
    const install=await db.appInstallation.create({data:{tenantId:a.id,appId:app.id,scopes:{create:[{scope:'read_products'}]}}});
    const payload=(tenantId:string)=>({clientId,redirectUri,scopes:['read_products'],code_challenge:challenge,code_challenge_method:'S256'});
    await assert.rejects(service.authorize(b.id,payload(b.id)),/not installed/);
    const {code}=await service.authorize(a.id,payload(a.id));
    const exchange=(v:string)=>service.token({grant_type:'authorization_code',client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code,code_verifier:v});
    await assert.rejects(exchange('x'.repeat(48)),/PKCE verification failed/);
    await assert.rejects(exchange(''),/Invalid PKCE/);
    const result=await exchange(verifier);
    assert.ok(result.access_token);
    await assert.rejects(exchange(verifier),/Invalid or expired|already been used/);
    const guard=new AppApiGuard(service);
    const ctx=(headers:any)=>{const req:any={headers};return {req, context:{switchToHttp:()=>({getRequest:()=>req})} as any}};
    const permitted=ctx({authorization:`Bearer ${result.access_token}`,'x-tenant-id':a.id});
    assert.equal(await guard.canActivate(permitted.context),true);
    assert.equal(permitted.req.tenantId,a.id);
    const denied=ctx({authorization:`Bearer ${result.access_token}`,'x-store-id':b.id});
    await assert.rejects(guard.canActivate(denied.context),/Tenant header/);
    await db.appInstallationScope.deleteMany({where:{installationId:install.id}});
    const afterRevocation=await service.authenticateAccessToken(result.access_token);
    assert.deepEqual(afterRevocation.scopes,[]);
    await db.appInstallation.update({where:{id:install.id},data:{enabled:false}});
    await assert.rejects(service.authenticateAccessToken(result.access_token),/Invalid or expired/);
  } finally {
    // Cleanup is restricted to generated UUID-based fixtures, never deletes unrelated tenants/apps.
    try {
      await db.appLifecycleEvent.deleteMany({where:{appId:appId || '__not_created__'}});
      if(appId) await db.appDefinition.delete({where:{id:appId}});
      await db.tenant.deleteMany({where:{slug:{in:[tenantA,tenantB]}}});
    } finally {await db.$disconnect();}
  }
});
