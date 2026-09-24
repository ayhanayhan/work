import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class AppsService{
  constructor(private prisma:PrismaService,private integrations:IntegrationsService){}

  private money(v:any){return Number(v||0)}
  private async ensureBuiltinApps(){
    await this.prisma.appDefinition.upsert({where:{slug:'fixed-currency-prices'},create:{slug:'fixed-currency-prices',name:'Sabit Döviz Fiyatları',category:'Fiyatlandırma',summary:'Aktif para birimleri için ürün bazında sabit fiyat tanımlayın.',description:'Kur dönüşümü yerine ürün varyantı bazında mağazada aktif para birimleri için sabit fiyat kullanın.',icon:'iconoir:coin',developer:'Ticarti',kind:'TOOL',integrationType:null,provider:null,settingsSchema:{mode:'toggle-only',marketplace:{usageGuide:'Uygulamayı kurun ve açık bırakın. Ürün düzenleme ekranında aktif para birimleri için sabit fiyat alanları görünür.'}},basePrice:0,currency:'TRY',billingType:'FREE',isActive:true,isFeatured:false,sortOrder:15},update:{name:'Sabit Döviz Fiyatları',category:'Fiyatlandırma',summary:'Aktif para birimleri için ürün bazında sabit fiyat tanımlayın.',description:'Kur dönüşümü yerine ürün varyantı bazında mağazada aktif para birimleri için sabit fiyat kullanın.',icon:'iconoir:coin',kind:'TOOL',settingsSchema:{mode:'toggle-only',marketplace:{usageGuide:'Uygulamayı kurun ve açık bırakın. Ürün düzenleme ekranında aktif para birimleri için sabit fiyat alanları görünür.'}},isActive:true}});
  }
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
    await this.ensureBuiltinApps();
    const [apps,installs,pricing,tenant,categoryRow]=await Promise.all([
      this.prisma.appDefinition.findMany({where:{isActive:true},include:{_count:{select:{installs:true}}},orderBy:[{isFeatured:'desc'},{sortOrder:'asc'},{name:'asc'}]}),
      this.prisma.appInstallation.findMany({where:{tenantId},include:{app:true}}),
      this.priceMap(tenantId),
      this.prisma.tenant.findUnique({where:{id:tenantId},select:{locale:true}}),
      (this.prisma as any).platformSetting.findUnique({where:{key:'app_categories'}}),
    ]);
    const locale=String(tenant?.locale||'tr-TR');const cats:any[]=Array.isArray((categoryRow as any)?.value?.categories)?(categoryRow as any).value.categories:[];
    const installed=new Map(installs.map(x=>[x.appId,x]));
    const tr=(obj:any,key:string,fallback:any)=>obj?.translations?.[locale]?.[key]||obj?.translations?.[locale.toLowerCase()]?.[key]||fallback;
    const cat=(id:string,fallback:string)=>{const row=cats.find((x:any)=>String(x.id)===String(id));return row?String(tr(row,'name',row.id)):fallback};
    return {plan:pricing.sub?.plan?{id:pricing.sub.plan.id,name:pricing.sub.plan.name,code:pricing.sub.plan.code}:null,items:apps.map(app=>{const p=this.priced(app,pricing.map.get(app.id));const row=installed.get(app.id);const schema:any=app.settingsSchema&&typeof app.settingsSchema==='object'?app.settingsSchema:{};const market:any=schema.marketplace||{};return {id:app.id,slug:app.slug,name:String(tr(market,'name',app.name)),category:cat(String(market.categoryId||app.category),app.category),categoryId:String(market.categoryId||''),summary:String(tr(market,'summary',app.summary)),description:String(tr(market,'description',app.description||'')),icon:app.icon,developer:app.developer,kind:app.kind,provider:app.provider,integrationType:app.integrationType,settingsSchema:app.settingsSchema,marketplace:market,downloadCount:app._count?.installs||0,isFeatured:app.isFeatured,...p,trialDays:Number(market.planTrials?.[pricing.sub?.planId||'']||0),installed:!!row&&row.status!=='ERROR',installStatus:row?.status||null,enabled:row?.enabled??false};})};
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
    await this.ensureBuiltinApps();
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
