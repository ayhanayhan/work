import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class AppsService{
  constructor(private prisma:PrismaService,private integrations:IntegrationsService){}

  private money(v:any){return Number(v||0)}
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
    return {included,price,currency:String(row?.currency||app.currency||'TRY'),billingType:String(row?.billingType||app.billingType||'FREE')};
  }

  async store(tenantId:string){
    const [apps,installs,pricing]=await Promise.all([
      this.prisma.appDefinition.findMany({where:{isActive:true},include:{_count:{select:{installs:true}}},orderBy:[{isFeatured:'desc'},{sortOrder:'asc'},{name:'asc'}]}),
      this.prisma.appInstallation.findMany({where:{tenantId},include:{app:true}}),
      this.priceMap(tenantId),
    ]);
    const installed=new Map(installs.map(x=>[x.appId,x]));
    return {plan:pricing.sub?.plan?{id:pricing.sub.plan.id,name:pricing.sub.plan.name,code:pricing.sub.plan.code}:null,items:apps.map(app=>{const p=this.priced(app,pricing.map.get(app.id));const row=installed.get(app.id);const schema:any=app.settingsSchema&&typeof app.settingsSchema==='object'?app.settingsSchema:{};return {id:app.id,slug:app.slug,name:app.name,category:app.category,summary:app.summary,description:app.description,icon:app.icon,developer:app.developer,kind:app.kind,provider:app.provider,integrationType:app.integrationType,settingsSchema:app.settingsSchema,marketplace:schema.marketplace||{},downloadCount:app._count?.installs||0,isFeatured:app.isFeatured,...p,installed:!!row&&row.status!=='ERROR',installStatus:row?.status||null,enabled:row?.enabled??false};})};
  }

  async installed(tenantId:string){
    const rows=await this.prisma.appInstallation.findMany({where:{tenantId},include:{app:true},orderBy:{installedAt:'desc'}});
    return rows.map(row=>({id:row.id,status:row.status,enabled:row.enabled,source:row.source,installedPrice:this.money(row.installedPrice),currency:row.currency,installedAt:row.installedAt,config:row.config,app:{id:row.app.id,slug:row.app.slug,name:row.app.name,category:row.app.category,summary:row.app.summary,description:row.app.description,icon:row.app.icon,developer:row.app.developer,kind:row.app.kind,provider:row.app.provider,integrationType:row.app.integrationType,settingsSchema:row.app.settingsSchema,marketplace:(row.app.settingsSchema&&typeof row.app.settingsSchema==='object'?(row.app.settingsSchema as any).marketplace||{}:{})}}));
  }

  async installedOne(tenantId:string,slug:string){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true}});
    if(!row)throw new NotFoundException('Eklenti kurulu değil');
    const connection=row.app.provider?await this.integrations.connectionByProvider(tenantId,row.app.provider):null;
    return {install:{id:row.id,status:row.status,enabled:row.enabled,source:row.source,installedAt:row.installedAt,config:row.config},app:{id:row.app.id,slug:row.app.slug,name:row.app.name,category:row.app.category,summary:row.app.summary,description:row.app.description,icon:row.app.icon,developer:row.app.developer,kind:row.app.kind,provider:row.app.provider,integrationType:row.app.integrationType,settingsSchema:row.app.settingsSchema,marketplace:(row.app.settingsSchema&&typeof row.app.settingsSchema==='object'?(row.app.settingsSchema as any).marketplace||{}:{})},connection};
  }

  async install(tenantId:string,slug:string){
    const app=await this.prisma.appDefinition.findUnique({where:{slug}});if(!app||!app.isActive)throw new NotFoundException('Eklenti bulunamadı');
    const pricing=await this.priceMap(tenantId);const price=this.priced(app,pricing.map.get(app.id));
    if(price.price>0&&!price.included){
      const base=String(process.env.APP_MARKETPLACE_CHECKOUT_URL||'').trim();
      if(!base)throw new BadRequestException(`Bu eklenti ${price.price.toLocaleString('tr-TR')} ${price.currency} ücretlidir. Eklenti ödeme bağlantısı henüz yapılandırılmadı.`);
      const url=new URL(base);url.searchParams.set('tenant',tenantId);url.searchParams.set('app',app.slug);url.searchParams.set('price',String(price.price));url.searchParams.set('currency',price.currency);return {paymentRequired:true,checkoutUrl:url.toString(),price};
    }
    const row=await this.prisma.appInstallation.upsert({where:{tenantId_appId:{tenantId,appId:app.id}},create:{tenantId,appId:app.id,status:'ACTIVE',enabled:true,source:price.included?'PLAN':'STORE',installedPrice:price.price,currency:price.currency,config:{}},update:{status:'ACTIVE',enabled:true,source:price.included?'PLAN':'STORE',installedPrice:price.price,currency:price.currency,installedAt:new Date()}});
    return {paymentRequired:false,installed:true,id:row.id,slug:app.slug};
  }

  async state(tenantId:string,slug:string,body:any){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true}});if(!row)throw new NotFoundException('Eklenti kurulu değil');
    const enabled=body.enabled!==false;
    const updated=await this.prisma.appInstallation.update({where:{id:row.id},data:{enabled,status:enabled?'ACTIVE':'DISABLED'}});
    if(row.app.provider){const connection=await this.integrations.connectionByProvider(tenantId,row.app.provider);if(connection)await this.integrations.update(tenantId,connection.id,{enabled});}
    return updated;
  }

  async saveSettings(tenantId:string,slug:string,body:any){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true}});if(!row)throw new NotFoundException('Eklenti kurulu değil');
    const safeConfig=body.config&&typeof body.config==='object'?body.config:{};
    let connection:any=null;
    if(row.app.integrationType&&row.app.provider&&row.app.kind!=='AI'){
      connection=await this.integrations.upsertProviderConnection(tenantId,{type:row.app.integrationType,provider:row.app.provider,name:row.app.name,credentials:body.credentials&&typeof body.credentials==='object'?body.credentials:{},config:safeConfig,enabled:row.enabled});
    }
    await this.prisma.appInstallation.update({where:{id:row.id},data:{config:safeConfig as any}});
    return {ok:true,connection};
  }

  async remove(tenantId:string,slug:string){
    const row=await this.prisma.appInstallation.findFirst({where:{tenantId,app:{slug}},include:{app:true}});if(!row)return {ok:true};
    if(row.app.provider)await this.integrations.disableProviderConnection(tenantId,row.app.provider);
    await this.prisma.appInstallation.delete({where:{id:row.id}});return {ok:true};
  }

  async isInstalled(tenantId:string,slug:string){return !!(await this.prisma.appInstallation.findFirst({where:{tenantId,enabled:true,status:'ACTIVE',app:{slug}}}));}
}
