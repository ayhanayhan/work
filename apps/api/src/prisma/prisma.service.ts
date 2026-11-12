import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { cellRuntimeContext } from '../cell-routing/runtime-context';

function withPoolDefaults(raw:string,limitEnv='PRISMA_CONNECTION_LIMIT'){
  const value=String(raw||'').trim();
  if(!value||!/^postgres(ql)?:\/\//i.test(value))return value;
  const url=new URL(value);
  if(!url.searchParams.has('connection_limit'))url.searchParams.set('connection_limit',String(Math.max(1,Number(process.env[limitEnv]||process.env.PRISMA_CONNECTION_LIMIT||5))));
  if(!url.searchParams.has('pool_timeout'))url.searchParams.set('pool_timeout',String(Math.max(1,Number(process.env.PRISMA_POOL_TIMEOUT||10))));
  if(!url.searchParams.has('connect_timeout'))url.searchParams.set('connect_timeout',String(Math.max(1,Number(process.env.PRISMA_CONNECT_TIMEOUT||10))));
  return url.toString();
}
function envKey(prefix:string,key:string){return `${prefix}_${String(key||'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'')}`}
const modelDelegates=new Set<string>(Object.values(((Prisma as any).ModelName||{}) as Record<string,string>).map(name=>String(name).charAt(0).toLowerCase()+String(name).slice(1)));
const routedMethods=new Set(['$transaction','$queryRaw','$queryRawUnsafe','$executeRaw','$executeRawUnsafe']);
const controlOnlyDelegates=new Set([
  'user','membership','infrastructureCell','tenantPlacement','tenantCellMigration','tenantRouteKey',
  'userSession','merchantSession','merchantPasswordReset','merchantAuthHandoff','superAdmin','superAdminSession',
  'plan','subscription','planPayment','billingInvoice','themeDefinition','themePlanPrice','themePayment',
  'billingCoupon','platformPurchase','providerPaymentReceipt','emailCreditPackage','emailCreditWallet','emailCreditLedger',
  'aiCreditPackage','aiCreditWallet','aiCreditLedger','appDefinition','appPlanPrice','appVersion','appVersionScope','appClient','appAuthorizationCode','appAccessToken','appInstallation','appBillingSubscription','appUsageRecord','appBillingInvoice','appBillingCharge','appInstallationScope','appExtension','appInstallationExtension','appExtensionDataSnapshot','appLifecycleEvent',
  'helpCategory','helpArticle','supportTicket','supportMessage','emailPlatformPolicy','emailGlobalSuppression','storeApiKey','developerOrganization','developerUser','developerMembership','developerSession','appReviewSubmission','appReviewCheck','appAuditLog'
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit,OnModuleDestroy{
  private readonly cellClients=new Map<string,PrismaClient>();
  private readonly controlClient:PrismaClient;
  constructor(){
    const controlUrl=withPoolDefaults(String(process.env.CONTROL_DATABASE_URL||process.env.DATABASE_URL||''));
    super(controlUrl?{datasources:{db:{url:controlUrl}}}:undefined);
    this.controlClient=this;
    const target=this;
    return new Proxy(this,{
      get(_target,prop,_receiver){
        if(typeof prop==='string'&&((modelDelegates.has(prop)&&!controlOnlyDelegates.has(prop))||routedMethods.has(prop))){
          const client=target.routedClient();const value=(client as any)[prop];return typeof value==='function'?value.bind(client):value;
        }
        const value=Reflect.get(target,prop,target);return typeof value==='function'?value.bind(target):value;
      }
    }) as this;
  }
  private databaseUrl(poolKey:string){
    const normalized=String(poolKey||'primary').trim();
    if(!normalized||normalized==='primary')return withPoolDefaults(String(process.env.DATABASE_URL||process.env.CONTROL_DATABASE_URL||''));
    const raw=String(process.env[envKey('DATABASE_URL',normalized)]||'').trim();
    return withPoolDefaults(raw,'CELL_PRISMA_CONNECTION_LIMIT');
  }
  private samePrimaryAndControl(){const control=String(process.env.CONTROL_DATABASE_URL||'').trim();const primary=String(process.env.DATABASE_URL||'').trim();return !control||!primary||control===primary}
  private routedClient(){
    const poolKey=String(cellRuntimeContext.current()?.databasePoolKey||'primary');
    if(poolKey==='__control')return this.controlClient;
    if((!poolKey||poolKey==='primary')&&this.samePrimaryAndControl())return this.controlClient;
    let client=this.cellClients.get(poolKey);if(client)return client;
    const max=Math.max(1,Math.min(128,Number(process.env.MAX_CELL_DB_CLIENTS||32)||32));
    if(this.cellClients.size>=max)throw new ServiceUnavailableException('Cell database client limit reached');
    const url=this.databaseUrl(poolKey);if(!url)throw new ServiceUnavailableException(`Database pool ${poolKey} is not configured`);
    client=new PrismaClient({datasources:{db:{url}}});this.cellClients.set(poolKey,client);return client;
  }
  control(){return this.controlClient}
  clientForPoolKey(poolKey:string){if((!poolKey||poolKey==='primary')&&this.samePrimaryAndControl())return this.controlClient;const previous=cellRuntimeContext.current();return this.getOrCreateClient(poolKey||'primary',previous?.cellCode)}
  private getOrCreateClient(poolKey:string,_cellCode?:string){
    let client=this.cellClients.get(poolKey);if(client)return client;
    const max=Math.max(1,Math.min(128,Number(process.env.MAX_CELL_DB_CLIENTS||32)||32));
    if(this.cellClients.size>=max)throw new ServiceUnavailableException('Cell database client limit reached');
    const url=this.databaseUrl(poolKey);if(!url)throw new ServiceUnavailableException(`Database pool ${poolKey} is not configured`);
    client=new PrismaClient({datasources:{db:{url}}});this.cellClients.set(poolKey,client);return client;
  }
  setTenantRouting(runtime:{tenantId:string;cellCode:string;databasePoolKey:string;redisPoolKey?:string;routingVersion?:number}){cellRuntimeContext.set({tenantId:runtime.tenantId,cellCode:runtime.cellCode,databasePoolKey:runtime.databasePoolKey||'primary',redisPoolKey:runtime.redisPoolKey||'primary',routingVersion:runtime.routingVersion})}
  runWithRequestContext<T>(fn:()=>T){return cellRuntimeContext.run(fn,{databasePoolKey:'__control',redisPoolKey:'primary',cellCode:String(process.env.TICARTI_CELL_CODE||'primary')})}
  runInCell<T>(runtime:{cellCode:string;databasePoolKey:string;redisPoolKey?:string;tenantId?:string},fn:()=>T){return cellRuntimeContext.run(fn,{tenantId:runtime.tenantId,cellCode:runtime.cellCode,databasePoolKey:runtime.databasePoolKey||'primary',redisPoolKey:runtime.redisPoolKey||'primary'})}
  currentRouting(){return cellRuntimeContext.current()}
  databasePoolConfigured(poolKey:string){return !!this.databaseUrl(poolKey)}
  async pingPool(poolKey:string){const client=this.clientForPoolKey(poolKey);await client.$queryRaw`SELECT 1`;return true}
  async onModuleInit(){await this.controlClient.$connect()}
  async onModuleDestroy(){await Promise.all(Array.from(this.cellClients.values()).map(client=>client.$disconnect().catch(()=>undefined)));await this.controlClient.$disconnect()}
}
