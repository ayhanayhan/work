import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getTicartiSkinPreset, normalizeTicartiSkinSlug, ticartiSkinCatalog } from '../theme-presets/ticarti-skins';
import { ticartiSourceDesignForSkin, ticartiSourceHomePreset } from '../theme-presets/ticarti-source-preset';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const [tenants, activeTenants, users, openTickets, products, orders, revenue] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { memberships: { some: {} } } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN','IN_PROGRESS','WAITING_CUSTOMER'] } } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count(),
      this.prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { grandTotal: true } }),
    ]);
    const recentTenants = await this.prisma.tenant.findMany({ include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { products: true, orders: true, customers: true, memberships: true } } }, orderBy: { createdAt: 'desc' }, take: 10 });
    return { metrics: { tenants, activeTenants, users, openTickets, products, orders, gmV: Number(revenue._sum.grandTotal || 0) }, recentTenants };
  }

  async tenants(q?: string) {
    return this.prisma.tenant.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }, { domain: { contains: q, mode: 'insensitive' } }] } : undefined,
      include: { _count: { select: { products: true, orders: true, customers: true, memberships: true, tickets: true } }, subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async tenant(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id }, include: { _count: { select: { products: true, orders: true, customers: true, warehouses: true } }, memberships: { include: { user: { select: { id: true, email: true, name: true, createdAt: true } } } }, subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' } }, tickets: { orderBy: { updatedAt: 'desc' }, take: 20 } } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async updateTenant(id: string, body: any) {
    const current = await this.prisma.tenant.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Tenant not found');
    const data: any = {};
    for (const k of ['name','status','trialEndsAt','domain','maintenanceMode','email','phone']) if (body[k] !== undefined) data[k] = k === 'trialEndsAt' && body[k] ? new Date(body[k]) : body[k];
    return this.prisma.tenant.update({ where: { id }, data });
  }

  plans() { return this.prisma.plan.findMany({ orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }] }); }
  createPlan(body: any) {
    return this.prisma.plan.create({ data: { name: body.name, code: body.code, description: body.description, monthlyPrice: body.monthlyPrice || 0, yearlyPrice: body.yearlyPrice, currency: body.currency || 'TRY', trialDays: body.trialDays ?? 14, maxStaff: body.maxStaff ?? 3, maxProducts: body.maxProducts ?? 1000, maxOrdersPerMonth: body.maxOrdersPerMonth, features: body.features || {}, isActive: body.isActive ?? true, sortOrder: body.sortOrder || 0 } });
  }
  updatePlan(id: string, body: any) { return this.prisma.plan.update({ where: { id }, data: body }); }


  reservedSubdomains(){ return this.prisma.reservedSubdomain.findMany({orderBy:[{locked:'desc'},{value:'asc'}]}); }
  async createReservedSubdomain(body:any){
    const value=String(body?.value||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'');
    if(value.length<2||value.length>63)throw new BadRequestException('Geçerli bir alt alan adı girin');
    return this.prisma.reservedSubdomain.create({data:{value,reason:String(body?.reason||'').trim()||null,isActive:body?.isActive!==false,locked:false}});
  }
  async updateReservedSubdomain(id:string,body:any){
    const current=await this.prisma.reservedSubdomain.findUnique({where:{id}});if(!current)throw new NotFoundException('Alt alan adı kaydı bulunamadı');
    const data:any={};
    if(body.reason!==undefined)data.reason=String(body.reason||'').trim()||null;
    if(body.isActive!==undefined){if(current.locked&&body.isActive===false)throw new BadRequestException('Sistem alt alan adı pasife alınamaz');data.isActive=!!body.isActive;}
    return this.prisma.reservedSubdomain.update({where:{id},data});
  }
  async deleteReservedSubdomain(id:string){
    const current=await this.prisma.reservedSubdomain.findUnique({where:{id}});if(!current)throw new NotFoundException('Alt alan adı kaydı bulunamadı');
    if(current.locked)throw new BadRequestException('Sistem alt alan adı silinemez');
    await this.prisma.reservedSubdomain.delete({where:{id}});return{deleted:true};
  }

  async setSubscription(tenantId: string, body: any) {
    const plan = await this.prisma.plan.findUnique({ where: { id: body.planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    await this.prisma.subscription.updateMany({ where: { tenantId, status: { in: ['TRIAL','ACTIVE','PAST_DUE'] } }, data: { status: 'CANCELLED' } });
    const startsAt = new Date();
    const trialEndsAt = body.status === 'TRIAL' ? new Date(Date.now() + plan.trialDays * 86400000) : null;
    const currentPeriodEnd = new Date(Date.now() + 30 * 86400000);
    return this.prisma.subscription.create({ data: { tenantId, planId: plan.id, status: body.status || 'ACTIVE', startsAt, trialEndsAt, currentPeriodStart: startsAt, currentPeriodEnd } });
  }

  async updateSubscription(id: string, body: any) {
    const data: any = {};
    for (const k of ['status','cancelAtPeriodEnd']) if (body[k] !== undefined) data[k] = body[k];
    if (body.currentPeriodEnd) data.currentPeriodEnd = new Date(body.currentPeriodEnd);
    return this.prisma.subscription.update({ where: { id }, data });
  }

  async currencyRates(){
    const rows:any[]=await this.prisma.storeCurrency.findMany({include:{store:{select:{id:true,name:true,currency:true,settings:true}}},orderBy:[{storeId:'asc'},{code:'asc'}]});
    return {rates:rows.map(row=>{const settings:any=row.store?.settings&&typeof row.store.settings==='object'?row.store.settings:{};const regional:any=settings.regional||{};const pinned=!!regional.currencyMeta?.[row.code]?.pinned;return {id:row.id,storeId:row.storeId,storeName:row.store?.name||row.storeId,baseCurrency:row.store?.currency||'TRY',code:row.code,exchangeRate:Number(row.exchangeRate||1),pinned,pinnedLabel:pinned?'Evet':'Hayır',updatedAt:row.updatedAt};})};
  }

  private async platformRates(base:string,codes:string[],source:string){
    const targets=Array.from(new Set(codes.map(x=>String(x).toUpperCase()).filter(Boolean)));const out:Record<string,number>={[base]:1};if(!targets.length)return out;
    if(source==='TCMB'){
      const r=await fetch('https://www.tcmb.gov.tr/kurlar/today.xml');if(!r.ok)throw new BadRequestException('TCMB kur servisine ulaşılamadı');const xml=await r.text();const tryPer:Record<string,number>={TRY:1};for(const m of xml.matchAll(/<Currency[^>]*CurrencyCode="([A-Z]{3})"[\s\S]*?<ForexSelling>([^<]+)<\/ForexSelling>/g)){const n=Number(String(m[2]).replace(',','.'));if(n>0)tryPer[m[1]]=n}const baseTry=tryPer[base];if(!baseTry)throw new BadRequestException(`TCMB ${base} kurunu vermedi`);for(const code of targets){const value=tryPer[code];if(value)out[code]=baseTry/value}return out;
    }
    const query=targets.filter(x=>x!==base).join(',');if(!query)return out;const r=await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(query)}`);if(!r.ok)throw new BadRequestException('Frankfurter kur servisine ulaşılamadı');const json:any=await r.json();for(const [code,value] of Object.entries(json.rates||{})){const n=Number(value);if(n>0)out[code]=n}return out;
  }

  async refreshCurrencyRates(body:any){
    const source=String(body?.source||'FRANKFURTER').toUpperCase()==='TCMB'?'TCMB':'FRANKFURTER';const tenants:any[]=await this.prisma.tenant.findMany({where:{status:{in:['ACTIVE','TRIAL']}},include:{currencies:{where:{isEnabled:true}}}});let updatedStores=0,updatedRates=0;
    for(const tenant of tenants){const rows:any[]=tenant.currencies||[];if(!rows.length)continue;const settings:any=tenant.settings&&typeof tenant.settings==='object'?tenant.settings:{};const regional:any=settings.regional||{};const base=String(tenant.currency||rows.find(x=>x.isDefault)?.code||'TRY').toUpperCase();let rates:Record<string,number>;try{rates=await this.platformRates(base,rows.map(x=>x.code),source)}catch{continue}let changed=0;for(const row of rows){if(regional.currencyMeta?.[row.code]?.pinned)continue;const rate=row.code===base?1:Number(rates[row.code]||0);if(rate>0){await this.prisma.storeCurrency.update({where:{id:row.id},data:{exchangeRate:rate}});changed++;updatedRates++;}}if(changed){updatedStores++;const nextRegional={...regional,exchange:{...(regional.exchange||{}),source,lastUpdatedAt:new Date().toISOString()}};await this.prisma.tenant.update({where:{id:tenant.id},data:{settings:{...settings,regional:nextRegional}}});}}
    return {ok:true,source,updatedStores,updatedRates};
  }

  users(q?: string) {
    return this.prisma.user.findMany({ where: { memberships: { some: {} }, ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}) }, select: { id: true, email: true, name: true, createdAt: true, memberships: { include: { tenant: { select: { id: true, name: true } } } } }, orderBy: { createdAt: 'desc' } });
  }

  async platformLocales(){
    const tenants=await this.prisma.tenant.findMany({select:{settings:true},take:500});
    const out=new Set<string>(['tr']);
    for(const t of tenants){const x:any=t.settings||{};const candidates=[x.locales,x.languages,x?.regional?.locales,x?.regional?.languages,x?.i18n?.locales];for(const raw of candidates){if(Array.isArray(raw))for(const v of raw){const code=String(typeof v==='string'?v:(v?.locale||v?.code||'')).trim().toLowerCase();if(code)out.add(code)}}}
    if(out.size===1)out.add('en');
    return Array.from(out).slice(0,20).map(locale=>({locale,label:locale.toUpperCase()}));
  }

  apps(){
    return this.prisma.appDefinition.findMany({include:{planPrices:{include:{plan:true},orderBy:{createdAt:'asc'}},_count:{select:{installs:true}}},orderBy:[{sortOrder:'asc'},{name:'asc'}]});
  }

  private appMarketplaceMeta(body:any){
    const screenshots=Array.isArray(body.screenshots)?body.screenshots.map((x:any)=>String(x).trim()).filter(Boolean):String(body.screenshots||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const translations:any={};const rawTranslations=body?.translations&&typeof body.translations==='object'&&!Array.isArray(body.translations)?body.translations:{};
    for(const [locale,row] of Object.entries(rawTranslations)){const r:any=row||{};translations[String(locale).toLowerCase()]={name:String(r.name||'').trim(),summary:String(r.summary||'').trim(),description:String(r.description||'').trim(),usageGuide:String(r.usageGuide||'').trim()};}
    return {logoUrl:String(body.logoUrl||'').trim()||null,usageGuide:String(body.usageGuide||'').trim()||null,screenshots,translations};
  }

  createApp(body:any){
    const slug=String(body.slug||'').trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
    if(!slug||!body.name) throw new BadRequestException('App name and slug are required');
    const baseSchema=body.settingsSchema&&typeof body.settingsSchema==='object'&&!Array.isArray(body.settingsSchema)?body.settingsSchema:{};
    const settingsSchema={...baseSchema,marketplace:this.appMarketplaceMeta(body)};
    return this.prisma.appDefinition.create({data:{slug,name:String(body.name),category:String(body.category||'Diğer'),summary:String(body.summary||body.name),description:body.description?String(body.description):null,icon:body.icon?String(body.icon):null,developer:String(body.developer||'WE DID IT'),kind:String(body.kind||'INTEGRATION'),integrationType:body.integrationType||null,provider:body.provider?String(body.provider):null,settingsSchema:settingsSchema as any,basePrice:Number(body.basePrice||0),currency:String(body.currency||'TRY'),billingType:String(body.billingType||'FREE'),isActive:body.isActive!==false,isFeatured:!!body.isFeatured,sortOrder:Number(body.sortOrder||0)}});
  }

  async updateApp(id:string,body:any){
    const current=await this.prisma.appDefinition.findUnique({where:{id}});
    if(!current)throw new NotFoundException('App not found');
    const data:any={};
    for(const k of ['name','category','summary','description','icon','developer','kind','provider','currency','billingType']) if(body[k]!==undefined)data[k]=body[k];
    if(body.integrationType!==undefined)data.integrationType=body.integrationType||null;
    if(body.settingsSchema!==undefined)data.settingsSchema=body.settingsSchema;
    if(['logoUrl','usageGuide','screenshots','translations'].some(k=>body[k]!==undefined)){
      const currentSchema:any=current.settingsSchema&&typeof current.settingsSchema==='object'&&!Array.isArray(current.settingsSchema)?current.settingsSchema:{};
      data.settingsSchema={...currentSchema,marketplace:{...(currentSchema.marketplace||{}),...this.appMarketplaceMeta({...currentSchema.marketplace,...body})}};
    }
    for(const k of ['isActive','isFeatured']) if(body[k]!==undefined)data[k]=!!body[k];
    if(body.basePrice!==undefined)data.basePrice=Number(body.basePrice||0);
    if(body.sortOrder!==undefined)data.sortOrder=Number(body.sortOrder||0);
    return this.prisma.appDefinition.update({where:{id},data});
  }

  setAppPlanPricing(appId:string,body:any){
    if(!body.planId)throw new NotFoundException('Plan is required');
    return this.prisma.appPlanPrice.upsert({where:{appId_planId:{appId,planId:String(body.planId)}},create:{appId,planId:String(body.planId),price:body.price===''||body.price===null||body.price===undefined?null:Number(body.price),currency:body.currency?String(body.currency):null,billingType:body.billingType?String(body.billingType):null,included:!!body.included,isActive:body.isActive!==false},update:{price:body.price===''||body.price===null||body.price===undefined?null:Number(body.price),currency:body.currency?String(body.currency):null,billingType:body.billingType?String(body.billingType):null,included:!!body.included,isActive:body.isActive!==false}});
  }

  async grantApp(tenantId:string,appId:string){
    const [tenant,app]=await Promise.all([this.prisma.tenant.findUnique({where:{id:tenantId}}),this.prisma.appDefinition.findUnique({where:{id:appId}})]);
    if(!tenant||!app)throw new NotFoundException('Tenant or app not found');
    return this.prisma.appInstallation.upsert({where:{tenantId_appId:{tenantId,appId}},create:{tenantId,appId,status:'ACTIVE',enabled:true,source:'SUPERADMIN',installedPrice:0,currency:app.currency,config:{}},update:{status:'ACTIVE',enabled:true,source:'SUPERADMIN',installedAt:new Date()}});
  }

  async updateTenantApp(tenantId:string,appId:string,body:any){
    const row=await this.prisma.appInstallation.findUnique({where:{tenantId_appId:{tenantId,appId}}});
    if(!row)throw new NotFoundException('Tenant app not found');
    return this.prisma.appInstallation.update({where:{id:row.id},data:{enabled:body.enabled!==false,status:body.enabled===false?'DISABLED':'ACTIVE'}});
  }

  themes(){
    return this.prisma.themeDefinition.findMany({include:{planPrices:{include:{plan:true},orderBy:{createdAt:'asc'}},_count:{select:{installations:true}}},orderBy:[{sortOrder:'asc'},{name:'asc'}]});
  }
  createTheme(body:any){
    const slug=String(body.slug||body.name||'').trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
    if(!slug||!body.name)throw new BadRequestException('Tema adı ve slug gerekli');
    return this.prisma.themeDefinition.create({data:{slug,name:String(body.name),description:body.description?String(body.description):null,category:String(body.category||'GENEL'),previewImageUrl:body.previewImageUrl?String(body.previewImageUrl):null,version:String(body.version||'1.0.0'),basePrice:Number(body.basePrice||0),currency:String(body.currency||'TRY'),billingType:String(body.billingType||'ONE_TIME'),isActive:body.isActive!==false,isFeatured:!!body.isFeatured,isDefault:!!body.isDefault,sortOrder:Number(body.sortOrder||0),config:body.config||{}}});
  }
  async updateTheme(id:string,body:any){
    const current=await this.prisma.themeDefinition.findUnique({where:{id}});if(!current)throw new NotFoundException('Tema bulunamadı');
    const data:any={};for(const k of ['name','description','category','previewImageUrl','version','currency','billingType'])if(body[k]!==undefined)data[k]=body[k]||null;
    for(const k of ['isActive','isFeatured','isDefault'])if(body[k]!==undefined)data[k]=!!body[k];
    for(const k of ['basePrice','sortOrder'])if(body[k]!==undefined)data[k]=Number(body[k]||0);
    if(body.config!==undefined)data.config=body.config;
    if(body.isDefault===true)await this.prisma.themeDefinition.updateMany({where:{id:{not:id}},data:{isDefault:false}});
    return this.prisma.themeDefinition.update({where:{id},data});
  }
  setThemePlanPricing(themeId:string,body:any){
    if(!body.planId)throw new BadRequestException('Paket gerekli');
    return this.prisma.themePlanPrice.upsert({where:{themeId_planId:{themeId,planId:String(body.planId)}},create:{themeId,planId:String(body.planId),price:body.price===''||body.price===null||body.price===undefined?null:Number(body.price),currency:body.currency?String(body.currency):null,included:!!body.included,isActive:body.isActive!==false},update:{price:body.price===''||body.price===null||body.price===undefined?null:Number(body.price),currency:body.currency?String(body.currency):null,included:!!body.included,isActive:body.isActive!==false}});
  }
  async grantTheme(tenantId:string,themeId:string){
    const [tenant,theme]=await Promise.all([this.prisma.tenant.findUnique({where:{id:tenantId}}),this.prisma.themeDefinition.findUnique({where:{id:themeId}})]);if(!tenant||!theme)throw new NotFoundException('Mağaza veya tema bulunamadı');
    return this.prisma.themeInstallation.upsert({where:{tenantId_themeId:{tenantId,themeId}},create:{tenantId,themeId,status:'ACTIVE',source:'SUPERADMIN',purchasedPrice:0,currency:theme.currency,activatedAt:null},update:{status:'ACTIVE',source:'SUPERADMIN'}});
  }


  async themeSkinDefaults(themeId:string){
    const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');
    const config:any=this.themeConfig(theme);const overrides:any=config.skinSourceOverrides||{};const meta:any=config.skinMeta||{};
    return ticartiSkinCatalog().map((skin:any)=>{const raw:any=overrides[skin.slug]||skin;const m:any=meta[skin.slug]||{};return {slug:skin.slug,name:m.name||raw.name||skin.name,category:m.groupId||raw.category||skin.category||skin.group||'',previewImageUrl:m.previewImageUrl||raw.previewImageUrl||skin.previewImageUrl||theme.previewImageUrl||'',verifiedFromDemo:!!skin.verifiedFromDemo,overridden:!!overrides[skin.slug],design:raw.design||ticartiSourceDesignForSkin(skin.slug),homePreset:Array.isArray(raw.homePreset)?raw.homePreset:ticartiSourceHomePreset(skin.slug),sourceManagedBy:overrides[skin.slug]?'PLATFORM_OVERRIDE':'SOURCE_FILES'};});
  }
  async updateThemeSkinDefaults(themeId:string,skinValue:string,body:any){
    return this.updateThemeSkinSource(themeId,skinValue,{rawJson:{slug:normalizeTicartiSkinSlug(skinValue),name:String(body?.name||skinValue),category:String(body?.category||''),previewImageUrl:String(body?.previewImageUrl||''),design:body?.design||{},homePreset:Array.isArray(body?.homePreset)?body.homePreset:[]}});
  }
  async resetThemeSkinDefaults(themeId:string,skinValue:string){return this.resetThemeSkinSource(themeId,skinValue);}


  async toggleThemeModule(themeId:string,body:any){
    const theme=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');
    const config:any=theme.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};const modules=Array.isArray(config.modules)?config.modules:[];const type=String(body.type||'').trim();if(!type)throw new BadRequestException('Modül tipi gerekli');
    let found=false;const next=modules.map((m:any)=>{if(String(m.type)===type){found=true;return{...m,enabled:body.enabled!==false}}return m});if(!found)next.push({type,label:String(body.label||type),enabled:body.enabled!==false});
    return this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,modules:next}}});
  }



  private themeConfig(theme:any){return theme?.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};}
  private cleanTranslations(value:any){const out:any={};if(value&&typeof value==='object'&&!Array.isArray(value))for(const [locale,row] of Object.entries(value)){if(!row||typeof row!=='object'||Array.isArray(row))continue;const r:any=row;const clean:any={};for(const key of ['name','description','summary'])if(r[key]!==undefined&&String(r[key]).trim())clean[key]=String(r[key]);if(Object.keys(clean).length)out[String(locale)]=clean;}return out;}
  async themeWorkspace(themeId:string){
    const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId},include:{planPrices:{include:{plan:true}}}});if(!theme)throw new NotFoundException('Tema bulunamadı');
    const config:any=this.themeConfig(theme);const skinMeta:any=config.skinMeta||{};const sourceOverrides:any=config.skinSourceOverrides||{};const moduleCatalog:any=config.moduleCatalog||{};
    const skins=ticartiSkinCatalog().map((skin:any)=>{const meta:any=skinMeta[skin.slug]||{};const raw:any=sourceOverrides[skin.slug]||skin;return {slug:skin.slug,sourceName:skin.name,name:meta.name||skin.name,groupId:meta.groupId||skin.group||'',previewImageUrl:meta.previewImageUrl||skin.previewImageUrl||theme.previewImageUrl||'',translations:meta.translations||{},planPricing:Array.isArray(meta.planPricing)?meta.planPricing:[],isActive:meta.isActive!==false,isFeatured:!!meta.isFeatured,verifiedFromDemo:!!skin.verifiedFromDemo,rawJson:raw};});
    const types=Array.from(new Set(ticartiSkinCatalog().flatMap((skin:any)=>(skin.homePreset||[]).map((x:any)=>String(x.sectionType||'')).filter(Boolean))));
    const modules=types.map((type:string)=>{const meta:any=moduleCatalog[type]||{};return {type,name:meta.name||type,groupId:meta.groupId||'',developer:meta.developer||'Ticarti',translations:meta.translations||{},screenshots:Array.isArray(meta.screenshots)?meta.screenshots:[],planPricing:Array.isArray(meta.planPricing)?meta.planPricing:[],trialDays:Number(meta.trialDays||0),isActive:meta.isActive!==false};});
    return {theme:{id:theme.id,name:theme.name,slug:theme.slug},themeGroups:Array.isArray(config.themeGroups)?config.themeGroups:[],moduleGroups:Array.isArray(config.moduleGroups)?config.moduleGroups:[],skins,modules};
  }
  async updateThemeWorkspaceGroups(themeId:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const config:any=this.themeConfig(theme);const normalize=(rows:any)=>Array.isArray(rows)?rows.slice(0,200).map((x:any,i:number)=>({id:String(x.id||`group-${i}`),translations:this.cleanTranslations(x.translations),sortOrder:Number(x.sortOrder??i),isActive:x.isActive!==false})):[];const next={...config};if(body.themeGroups!==undefined)next.themeGroups=normalize(body.themeGroups);if(body.moduleGroups!==undefined)next.moduleGroups=normalize(body.moduleGroups);await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:next}});return this.themeWorkspace(themeId);}
  async updateThemeSkinCatalog(themeId:string,skinValue:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const slug=normalizeTicartiSkinSlug(skinValue);const exists=ticartiSkinCatalog().some((x:any)=>x.slug===slug);if(!exists)throw new NotFoundException('Skin bulunamadı');const config:any=this.themeConfig(theme);const skinMeta:any={...(config.skinMeta||{})};const current:any=skinMeta[slug]||{};skinMeta[slug]={...current,name:body.name!==undefined?String(body.name):current.name,groupId:body.groupId!==undefined?String(body.groupId):current.groupId,previewImageUrl:body.previewImageUrl!==undefined?String(body.previewImageUrl):current.previewImageUrl,translations:body.translations!==undefined?this.cleanTranslations(body.translations):current.translations,planPricing:Array.isArray(body.planPricing)?body.planPricing.map((x:any)=>({planId:String(x.planId),enabled:x.enabled!==false,included:!!x.included,price:x.price===''||x.price===null||x.price===undefined?null:Number(x.price),currency:String(x.currency||'TRY')})):current.planPricing,isActive:body.isActive!==undefined?!!body.isActive:current.isActive,isFeatured:body.isFeatured!==undefined?!!body.isFeatured:current.isFeatured};await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,skinMeta}}});return this.themeWorkspace(themeId);}
  async updateThemeSkinSource(themeId:string,skinValue:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const slug=normalizeTicartiSkinSlug(skinValue);const source=body?.rawJson;if(!source||typeof source!=='object'||Array.isArray(source))throw new BadRequestException('Geçerli ham tema JSON gerekli');if(String(source.slug||slug)!==slug)throw new BadRequestException('JSON slug seçili skin ile aynı olmalı');const config:any=this.themeConfig(theme);const rows:any={...(config.skinSourceOverrides||{})};rows[slug]=source;await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,skinSourceOverrides:rows}}});return this.themeWorkspace(themeId);}
  async resetThemeSkinSource(themeId:string,skinValue:string){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const slug=normalizeTicartiSkinSlug(skinValue);const config:any=this.themeConfig(theme);const rows:any={...(config.skinSourceOverrides||{})};delete rows[slug];await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,skinSourceOverrides:rows}}});return this.themeWorkspace(themeId);}
  async updateThemeModuleCatalog(themeId:string,typeValue:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const type=String(typeValue||'').trim();if(!type)throw new BadRequestException('Modül tipi gerekli');const config:any=this.themeConfig(theme);const moduleCatalog:any={...(config.moduleCatalog||{})};const current:any=moduleCatalog[type]||{};moduleCatalog[type]={...current,name:body.name!==undefined?String(body.name):current.name,groupId:body.groupId!==undefined?String(body.groupId):current.groupId,developer:body.developer!==undefined?String(body.developer):current.developer,translations:body.translations!==undefined?this.cleanTranslations(body.translations):current.translations,screenshots:Array.isArray(body.screenshots)?body.screenshots.map(String).slice(0,24):current.screenshots,trialDays:body.trialDays!==undefined?Math.max(0,Number(body.trialDays||0)):Number(current.trialDays||0),planPricing:Array.isArray(body.planPricing)?body.planPricing.map((x:any)=>({planId:String(x.planId),enabled:x.enabled!==false,included:!!x.included,price:x.price===''||x.price===null||x.price===undefined?null:Number(x.price),currency:String(x.currency||'TRY'),trialDays:Math.max(0,Number(x.trialDays||0))})):current.planPricing,isActive:body.isActive!==undefined?!!body.isActive:current.isActive};await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,moduleCatalog}}});return this.themeWorkspace(themeId);}

  async geoNodes(query:any){
    const where:any={};
    if(query?.countryCode)where.countryCode=String(query.countryCode).toUpperCase();
    if(query?.level)where.level=String(query.level);
    if(query?.parentId)where.parentId=String(query.parentId);
    if(query?.root==='true')where.parentId=null;
    return (this.prisma as any).geoNode.findMany({where,orderBy:[{sortOrder:'asc'},{name:'asc'}],take:5000});
  }

  async updateGeoNode(id:string,body:any){
    const data:any={};
    if(body.name!==undefined)data.name=String(body.name).trim();
    if(body.isActive!==undefined)data.isActive=!!body.isActive;
    if(body.sortOrder!==undefined)data.sortOrder=Number(body.sortOrder)||0;
    return (this.prisma as any).geoNode.update({where:{id},data});
  }

}
