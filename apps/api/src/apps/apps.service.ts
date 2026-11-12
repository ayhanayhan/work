import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { ExtensionsService } from '../extensions/extensions.service';
import { AppBillingService } from '../app-billing/app-billing.service';
import { apiLocale, apiText } from '../i18n/api-i18n';

@Injectable()
export class AppsService{
  constructor(private prisma:PrismaService,private integrations:IntegrationsService,private extensions:ExtensionsService,private appBilling:AppBillingService){}

  private money(v:any){return Number(v||0)}
  private localizeApp(app:any,locale?:string){const lang=apiLocale(locale);const schema:any=app?.settingsSchema&&typeof app.settingsSchema==='object'?app.settingsSchema:{};const manifest:any=schema.manifest||{};const i18n:any=manifest.i18n||{};const row=i18n[lang]||i18n.en||i18n.tr||{};return {...app,name:row.name||app.name,category:row.category||app.category,summary:row.summary||app.summary,description:row.description||app.description};}

  private manifestScopes(manifest:any){
    const rows=Array.isArray(manifest?.scopes)?manifest.scopes:[];
    return rows.map((row:any)=>typeof row==='string'?{scope:String(row).trim(),required:true}:{scope:String(row?.name||row?.scope||'').trim(),required:row?.required!==false}).filter((row:any)=>row.scope);
  }

  private async ensureVersionForApp(app:any){
    const existing=await this.prisma.appVersion.findFirst({where:{appId:app.id,isCurrent:true},include:{scopes:true},orderBy:{createdAt:'desc'}});
    if(existing){await this.extensions.syncVersion(existing.id,existing.manifest);return existing;}
    const schema:any=app.settingsSchema&&typeof app.settingsSchema==='object'&&!Array.isArray(app.settingsSchema)?app.settingsSchema:{};
    const declared=schema.manifest&&typeof schema.manifest==='object'?schema.manifest:{};
    const manifest={
      id:app.slug,
      name:app.name,
      version:String(declared.version||'1.0.0'),
      scopes:Array.isArray(declared.scopes)?declared.scopes:[],
      extensions:Array.isArray(declared.extensions)?declared.extensions:[],
      webhooks:Array.isArray(declared.webhooks)?declared.webhooks:[],
      ...declared,
    };
    const scopes=this.manifestScopes(manifest);
    const created=await this.prisma.appVersion.create({data:{appId:app.id,version:String(manifest.version||'1.0.0'),manifest:manifest as any,status:'PUBLISHED',isCurrent:true,publishedAt:new Date(),scopes:{create:scopes.map((x:any)=>({scope:x.scope,required:x.required}))}},include:{scopes:true}});await this.extensions.syncVersion(created.id,manifest);return created;
  }

  private async recordLifecycle(tenantId:string,appId:string,installationId:string|undefined,event:string,metadata?:any){
    await this.prisma.appLifecycleEvent.create({data:{tenantId,appId,installationId:installationId||null,event,metadata:metadata===undefined?undefined:metadata}});
  }

  private paymentProviderManifest(app:any){const schema:any=app?.settingsSchema&&typeof app.settingsSchema==='object'&&!Array.isArray(app.settingsSchema)?app.settingsSchema:{};const manifest:any=schema.manifest||{};return manifest.paymentProvider&&typeof manifest.paymentProvider==='object'?manifest.paymentProvider:null;}
  private async syncPaymentProviderMethod(tenantId:string,app:any,config:any,enabled:boolean){const provider:any=this.paymentProviderManifest(app);if(!provider)return;const code=String(provider.code||app.provider||app.slug||'').trim().toLowerCase();if(!code)return;const methodEnabled=enabled&&(code!=='stripe'||Boolean(String(config?.publishableKey||'').trim()));const publicKeys=Array.isArray(provider.publicConfigKeys)?provider.publicConfigKeys.map(String):[];const pub:any={};for(const key of publicKeys)if(config?.[key]!==undefined)pub[key]=config[key];pub.renderer=String(provider.renderer||'');pub.provider=String(app.provider||code);pub.capabilities=Array.isArray(provider.capabilities)?provider.capabilities:[];pub.appSlug=app.slug;await this.prisma.paymentMethod.upsert({where:{storeId_code:{storeId:tenantId,code}},create:{storeId:tenantId,name:String(provider.name||app.name),code,type:'provider',requiresOnlinePayment:true,supportsInstallment:provider.supportsInstallment===true,fee:Number(config?.fee||0),isActive:methodEnabled,sortOrder:Number(provider.sortOrder||50),config:{appSlug:app.slug,provider:String(app.provider||code),public:pub}},update:{name:String(provider.name||app.name),type:'provider',requiresOnlinePayment:true,supportsInstallment:provider.supportsInstallment===true,fee:Number(config?.fee||0),isActive:methodEnabled,config:{appSlug:app.slug,provider:String(app.provider||code),public:pub}}});}
  private async ensureBuiltinApps(){ return; }
  private async activePlan(tenantId:string){
    return this.prisma.subscription.findFirst({where:{tenantId,status:{in:['TRIAL','ACTIVE','PAST_DUE']}},include:{plan:true},orderBy:{createdAt:'desc'}});
  }
  private async priceMap(tenantId:string){
    const sub=await this.activePlan(tenantId);
    if(!sub)return {sub:null,map:new Map<string,any>()};
    const rows=await this.prisma.appPlanPrice.findMany({where:{planId:sub.planId,isActive:true}});
    return {sub,map:new Map(rows.map(r=>[r.appId,r]))};
  }
  private priced(app:any,row:any){
    const included=!!row?.included;
    const price=included?0:(row?.price!==null&&row?.price!==undefined?this.money(row.price):this.money(app.basePrice));
    return {included,price,currency:String(row?.currency||app.currency||'TRY'),billingType:String(row?.billingType||app.billingType||'FREE'),trialDays:Math.max(0,Number(row?.trialDays??app.trialDays??0)),gracePeriodDays:Math.max(0,Number(row?.gracePeriodDays??app.gracePeriodDays??3)),includedUnits:Math.max(0,Number(row?.includedUnits??app.includedUnits??0)),usageMetric:String(row?.usageMetric||app.usageMetric||'').trim()||null,usageUnitPrice:row?.usageUnitPrice!==null&&row?.usageUnitPrice!==undefined?this.money(row.usageUnitPrice):(app.usageUnitPrice!==null&&app.usageUnitPrice!==undefined?this.money(app.usageUnitPrice):null),usageLimit:row?.usageLimit??null,maxCharge:row?.maxCharge!==null&&row?.maxCharge!==undefined?this.money(row.maxCharge):null};
  }

  async store(tenantId:string,locale?:string){
    const [apps,installs,pricing]=await Promise.all([
      this.prisma.appDefinition.findMany({where:{isActive:true},include:{_count:{select:{installs:true}},versions:{where:{isCurrent:true,status:'PUBLISHED'},take:1,select:{manifest:true,scopes:{select:{scope:true,required:true}}}}},orderBy:[{isFeatured:'desc'},{sortOrder:'asc'},{name:'asc'}]}),
      this.prisma.appInstallation.findMany({where:{tenantId},include:{app:true}}),
      this.priceMap(tenantId),
    ]);
    const installed=new Map(installs.map(x=>[x.appId,x]));
    const visible=apps.filter((app:any)=>String((app.versions?.[0]?.manifest as any)?.distribution||'PUBLIC').toUpperCase()!=='PRIVATE'||installed.has(app.id));
    return {plan:pricing.sub?.plan?{id:pricing.sub.plan.id,name:pricing.sub.plan.name,code:pricing.sub.plan.code}:null,items:visible.map(app=>{const p=this.priced(app,pricing.map.get(app.id));const row=installed.get(app.id);const schema:any=app.settingsSchema&&typeof app.settingsSchema==='object'?app.settingsSchema:{};return {id:app.id,slug:app.slug,name:this.localizeApp(app,locale).name,category:this.localizeApp(app,locale).category,summary:this.localizeApp(app,locale).summary,description:this.localizeApp(app,locale).description,icon:app.icon,developer:app.developer,kind:app.kind,provider:app.provider,integrationType:app.integrationType,settingsSchema:app.settingsSchema,marketplace:schema.marketplace||{},permissions:{required:(app.versions?.[0]?.scopes||[]).filter((x:any)=>x.required).map((x:any)=>x.scope),optional:(app.versions?.[0]?.scopes||[]).filter((x:any)=>!x.required).map((x:any)=>x.scope)},trust:String((app.versions?.[0]?.manifest as any)?.trust||'SYSTEM'),runtime:String((app.versions?.[0]?.manifest as any)?.runtime||'DECLARATIVE'),homepage:(app.versions?.[0]?.manifest as any)?.homepage||null,supportUrl:(app.versions?.[0]?.manifest as any)?.supportUrl||null,privacyUrl:(app.versions?.[0]?.manifest as any)?.privacyUrl||null,downloadCount:app._count?.installs||0,isFeatured:app.isFeatured,...p,installed:!!row&&row.status!=='ERROR',installStatus:row?.status||null,enabled:row?.enabled??false};})};
  }

  async installed(tenantId:string,locale?:string){
    const rows=await this.prisma.appInstallation.findMany({where:{tenantId},include:{app:true},orderBy:{installedAt:'desc'}});
    return rows.map(row=>{const app=this.localizeApp(row.app,locale);return{id:row.id,status:row.status,enabled:row.enabled,source:row.source,installedPrice:this.money(row.installedPrice),currency:row.currency,installedAt:row.installedAt,config:row.config,app:{id:app.id,slug:app.slug,name:app.name,category:app.category,summary:app.summary,description:app.description,icon:app.icon,developer:app.developer,kind:app.kind,provider:app.provider,integrationType:app.integrationType,settingsSchema:app.settingsSchema,marketplace:(app.settingsSchema&&typeof app.settingsSchema==='object'?(app.settingsSchema as any).marketplace||{}:{})}}});
  }

  async installedOne(tenantId:string,slug:string,locale?:string){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true,installedVersion:{include:{scopes:true}},scopes:true}});
    if(!row)throw new NotFoundException(apiText('app.notInstalled',locale));
    const connection=row.app.provider?await this.integrations.connectionByProvider(tenantId,row.app.provider):null;
    const declared=row.installedVersion?.scopes||[];const granted=row.scopes.map((x:any)=>x.scope);
    const app=this.localizeApp(row.app,locale);return {install:{id:row.id,status:row.status,enabled:row.enabled,source:row.source,installedAt:row.installedAt,config:row.config},app:{id:app.id,slug:app.slug,name:app.name,category:app.category,summary:app.summary,description:app.description,icon:app.icon,developer:app.developer,kind:app.kind,provider:app.provider,integrationType:app.integrationType,settingsSchema:app.settingsSchema,marketplace:(app.settingsSchema&&typeof app.settingsSchema==='object'?(app.settingsSchema as any).marketplace||{}:{})},permissions:{required:declared.filter((x:any)=>x.required).map((x:any)=>x.scope),optional:declared.filter((x:any)=>!x.required).map((x:any)=>x.scope),granted},connection};
  }

  async install(tenantId:string,slug:string,locale?:string){
    const app=await this.prisma.appDefinition.findUnique({where:{slug}});if(!app||!app.isActive)throw new NotFoundException(apiText('app.notFound',locale));
    const version=await this.ensureVersionForApp(app);
    const pricing=await this.priceMap(tenantId);const price=this.priced(app,pricing.map.get(app.id));
    if(price.price>0&&!price.included&&price.trialDays<=0){
      return {paymentRequired:true,billingKind:'APP',targetId:app.id,price};
    }
    const required=version.scopes.filter((x:any)=>x.required).map((x:any)=>x.scope);
    const row=await this.prisma.control().$transaction(async tx=>{
      const install=await tx.appInstallation.upsert({where:{tenantId_appId:{tenantId,appId:app.id}},create:{tenantId,appId:app.id,installedVersionId:version.id,status:'ACTIVE',enabled:true,source:price.included?'PLAN':'STORE',installedPrice:price.price,currency:price.currency,config:{}},update:{installedVersionId:version.id,status:'ACTIVE',enabled:true,source:price.included?'PLAN':'STORE',installedPrice:price.price,currency:price.currency,installedAt:new Date()}});
      await tx.appInstallationScope.deleteMany({where:{installationId:install.id}});
      if(required.length)await tx.appInstallationScope.createMany({data:required.map((scope:string)=>({installationId:install.id,scope})),skipDuplicates:true});
      await tx.appLifecycleEvent.create({data:{tenantId,appId:app.id,installationId:install.id,event:'app.installed',metadata:{version:version.version,scopes:required}}});
      return install;
    });
    const billing=await this.appBilling.provision(row.id,{...price,amount:price.price});
    await this.syncPaymentProviderMethod(tenantId,app,{},true);
    return {paymentRequired:false,installed:true,id:row.id,slug:app.slug,version:version.version,grantedScopes:required,billing:{status:billing.status,trialEndsAt:billing.trialEndsAt,currentPeriodEnd:billing.currentPeriodEnd}};
  }

  async completePaidInstall(tenantId:string,appRef:string,paidPrice:number,currency='TRY'){
    const app=await this.prisma.appDefinition.findFirst({where:{isActive:true,OR:[{id:appRef},{slug:appRef}]}});
    if(!app)throw new NotFoundException('App not found');
    const version=await this.ensureVersionForApp(app);
    const subscription=await this.prisma.subscription.findFirst({where:{tenantId,status:{in:['ACTIVE','TRIAL']}},orderBy:{createdAt:'desc'},select:{planId:true}});
    const row=subscription?.planId?await this.prisma.appPlanPrice.findFirst({where:{appId:app.id,planId:subscription.planId,isActive:true}}):null;
    const price=this.priced(app,row);
    const required=version.scopes.filter(x=>x.required).map(x=>x.scope);
    const install=await this.prisma.control().$transaction(async tx=>{
      const saved=await tx.appInstallation.upsert({where:{tenantId_appId:{tenantId,appId:app.id}},create:{tenantId,appId:app.id,installedVersionId:version.id,status:'ACTIVE',enabled:true,source:'STORE',installedPrice:paidPrice,currency,config:{}},update:{installedVersionId:version.id,status:'ACTIVE',enabled:true,source:'STORE',installedPrice:paidPrice,currency,installedAt:new Date()}});
      await tx.appInstallationScope.deleteMany({where:{installationId:saved.id}});
      if(required.length)await tx.appInstallationScope.createMany({data:required.map(scope=>({installationId:saved.id,scope})),skipDuplicates:true});
      await tx.appLifecycleEvent.create({data:{tenantId,appId:app.id,installationId:saved.id,event:'app.installed',metadata:{version:version.version,scopes:required,source:'STORE'}}});
      return saved;
    });
    const billing=await this.appBilling.provision(install.id,{...price,amount:paidPrice,currency});
    await this.syncPaymentProviderMethod(tenantId,app,{},true);
    return {installed:true,id:install.id,slug:app.slug,version:version.version,billing:{status:billing.status,trialEndsAt:billing.trialEndsAt,currentPeriodEnd:billing.currentPeriodEnd}};
  }

  async permissions(tenantId:string,slug:string,locale?:string){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true,installedVersion:{include:{scopes:true}},scopes:true}});
    if(!row)throw new NotFoundException(apiText('app.notInstalled',locale));
    const declared=row.installedVersion?.scopes||[];
    const granted=new Set(row.scopes.map((x:any)=>x.scope));
    const app=this.localizeApp(row.app,locale);return {app:{slug:app.slug,name:app.name},version:row.installedVersion?.version||null,required:declared.filter((x:any)=>x.required).map((x:any)=>x.scope),optional:declared.filter((x:any)=>!x.required).map((x:any)=>x.scope),granted:[...granted]};
  }

  async updateScopes(tenantId:string,slug:string,body:any,locale?:string){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true,installedVersion:{include:{scopes:true}},scopes:true}});
    if(!row)throw new NotFoundException(apiText('app.notInstalled',locale));
    const declared=row.installedVersion?.scopes||[];
    const required=declared.filter((x:any)=>x.required).map((x:any)=>x.scope);
    const allowed=new Set(declared.map((x:any)=>x.scope));
    const requested=(Array.isArray(body?.scopes)?body.scopes:[]).map(String).filter((x:string)=>allowed.has(x));
    const final=[...new Set([...required,...requested])];
    await this.prisma.control().$transaction(async tx=>{
      await tx.appInstallationScope.deleteMany({where:{installationId:row.id}});
      if(final.length)await tx.appInstallationScope.createMany({data:final.map(scope=>({installationId:row.id,scope})),skipDuplicates:true});
      await tx.appLifecycleEvent.create({data:{tenantId,appId:row.appId,installationId:row.id,event:'app.scopes_updated',metadata:{scopes:final}}});
    });
    return {ok:true,scopes:final};
  }

  async state(tenantId:string,slug:string,body:any,locale?:string){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true}});if(!row)throw new NotFoundException(apiText('app.notInstalled',locale));
    const enabled=body.enabled!==false;
    const updated=await this.prisma.appInstallation.update({where:{id:row.id},data:{enabled,status:enabled?'ACTIVE':'DISABLED'}});
    if(row.app.provider){const connection=await this.integrations.connectionByProvider(tenantId,row.app.provider);if(connection)await this.integrations.update(tenantId,connection.id,{enabled});}
    await this.syncPaymentProviderMethod(tenantId,row.app,(row.config as any)||{},enabled);
    await this.recordLifecycle(tenantId,row.appId,row.id,enabled?'app.enabled':'app.disabled');
    return updated;
  }

  async saveSettings(tenantId:string,slug:string,body:any,locale?:string){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true}});if(!row)throw new NotFoundException(apiText('app.notInstalled',locale));
    const safeConfig=body.config&&typeof body.config==='object'?body.config:{};
    let connection:any=null;
    if(row.app.integrationType&&row.app.provider&&row.app.kind!=='AI'){
      connection=await this.integrations.upsertProviderConnection(tenantId,{type:row.app.integrationType,provider:row.app.provider,name:row.app.name,credentials:body.credentials&&typeof body.credentials==='object'?body.credentials:{},config:safeConfig,enabled:row.enabled});
    }
    await this.prisma.appInstallation.update({where:{id:row.id},data:{config:safeConfig as any}});
    await this.syncPaymentProviderMethod(tenantId,row.app,safeConfig,row.enabled);
    return {ok:true,connection};
  }

  async remove(tenantId:string,slug:string){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true}});if(!row)return {ok:true};
    if(row.app.provider)await this.integrations.disableProviderConnection(tenantId,row.app.provider);
    await this.syncPaymentProviderMethod(tenantId,row.app,(row.config as any)||{},false);
    await this.prisma.appInstallation.update({where:{id:row.id},data:{enabled:false,status:'UNINSTALLED'}});
    await this.appBilling.cancelInstallation(row.id);
    await this.recordLifecycle(tenantId,row.appId,row.id,'app.uninstalled');
    return {ok:true};
  }

  async isInstalled(tenantId:string,slug:string){return !!(await this.prisma.appInstallation.findFirst({where:{tenantId,enabled:true,status:'ACTIVE',app:{slug}}}));}
}
