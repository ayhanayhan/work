import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {activePlatformLocales} from '../common/platform-locales';
import { getTicartiSkinPreset, normalizeTicartiSkinSlug, ticartiSkinCatalog } from '../theme-presets/ticarti-skins';
import { ticartiSourceDesignForSkin, ticartiSourceHomePreset } from '../theme-presets/ticarti-source-preset';
import * as bcrypt from 'bcryptjs';

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

  async deleteTenant(id:string){
    const row=await this.prisma.tenant.findUnique({where:{id}});
    if(!row)throw new NotFoundException('Mağaza bulunamadı');
    await this.prisma.tenant.delete({where:{id}});
    return {deleted:true,id};
  }

  async memberships(){
    const disabledRow:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'merchant_membership_status'}});
    const disabled:any=disabledRow?.value&&typeof disabledRow.value==='object'?disabledRow.value:{};
    const users:any[]=await this.prisma.user.findMany({
      where:{memberships:{some:{}}},
      select:{id:true,email:true,name:true,createdAt:true,memberships:{include:{tenant:{include:{subscriptions:{include:{plan:true},orderBy:{createdAt:'desc'},take:1},aiWallet:true}}}}},
      orderBy:{createdAt:'desc'}
    });
    return users.map(u=>({id:u.id,email:u.email,name:u.name,createdAt:u.createdAt,isActive:disabled[u.id]!==false,stores:u.memberships.map((m:any)=>{const t=m.tenant;return{id:t.id,name:t.name,slug:t.slug,publicSlug:t.publicSlug,domain:t.domain,status:t.status,createdAt:t.createdAt,plan:t.subscriptions?.[0]?.plan||null,subscription:t.subscriptions?.[0]||null,aiCredits:t.aiWallet?.balance||0}})}));
  }

  async setMembershipStatus(userId:string,body:any){
    const user=await this.prisma.user.findUnique({where:{id:userId},include:{memberships:true}});
    if(!user)throw new NotFoundException('Üyelik bulunamadı');
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'merchant_membership_status'}});
    const value:any=row?.value&&typeof row.value==='object'?{...row.value}:{};
    const active=body?.isActive!==false; value[userId]=active;
    await (this.prisma as any).platformSetting.upsert({where:{key:'merchant_membership_status'},create:{key:'merchant_membership_status',value},update:{value}});
    if(!active){
      const tenantIds=user.memberships.map((m:any)=>m.tenantId);
      if(tenantIds.length)await this.prisma.tenant.updateMany({where:{id:{in:tenantIds},status:{in:['ACTIVE','TRIAL']}},data:{status:'SUSPENDED'}});
      await this.prisma.merchantSession.updateMany({where:{userId,revokedAt:null},data:{revokedAt:new Date()}});
    }
    return {ok:true,isActive:active};
  }

  async deleteMembership(userId:string){
    const user=await this.prisma.user.findUnique({where:{id:userId}});
    if(!user)throw new NotFoundException('Üyelik bulunamadı');
    await this.prisma.$transaction(async tx=>{
      await tx.merchantSession.deleteMany({where:{userId}});
      await tx.membership.deleteMany({where:{userId}});
    });
    return {deleted:true};
  }

  async grantAiCredits(tenantId:string,body:any){
    const amount=Math.trunc(Number(body?.amount||0)); if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException('AI kredi miktarı 0’dan büyük olmalı');
    const tenant=await this.prisma.tenant.findUnique({where:{id:tenantId}});if(!tenant)throw new NotFoundException('Mağaza bulunamadı');
    return this.prisma.$transaction(async tx=>{
      const wallet=await tx.aiCreditWallet.upsert({where:{tenantId},create:{tenantId,balance:0,lifetimePurchased:0,lifetimeUsed:0},update:{}});
      const balanceAfter=wallet.balance+amount;
      await tx.aiCreditWallet.update({where:{id:wallet.id},data:{balance:balanceAfter,lifetimePurchased:{increment:amount}}});
      await tx.aiCreditLedger.create({data:{walletId:wallet.id,amount,type:'MANUAL_GRANT',source:'SUPERADMIN',description:String(body?.description||'Super Admin kredi tanımlaması'),balanceAfter}});
      return {ok:true,balance:balanceAfter};
    });
  }

  private defaultPlanFeatureCatalog(){
    return {
      categories:[
        {id:'marketing',code:'MARKETING',isActive:true,sortOrder:10,translations:{tr:{title:'Pazarlama',description:'Satış ve müşteri iletişimi özellikleri.'},en:{title:'Marketing',description:'Sales and customer communication features.'}}},
        {id:'commerce',code:'COMMERCE',isActive:true,sortOrder:20,translations:{tr:{title:'E-ticaret',description:'Mağaza ve satış operasyonu özellikleri.'},en:{title:'Commerce',description:'Store and commerce capabilities.'}}},
        {id:'support',code:'SUPPORT',isActive:true,sortOrder:30,translations:{tr:{title:'Destek',description:'Destek ve hizmet seviyesi özellikleri.'},en:{title:'Support',description:'Support and service level capabilities.'}}},
      ],
      features:[
        {id:'promotions',code:'promotions',categoryId:'marketing',valueType:'BOOLEAN',isActive:true,isPageEnabled:true,sortOrder:10,imageUrl:'',translations:{tr:{title:'Promosyonlar',subtitle:'Gelişmiş kampanya yönetimi',slug:'promosyonlar',description:'İndirim ve kampanyalarınızı esnek koşullarla yönetin.',body:'',seoTitle:'Promosyon Yönetimi | Ticarti',seoDescription:'Ticarti promosyon ve kampanya özellikleri.'},en:{title:'Promotions',subtitle:'Advanced campaign management',slug:'promotions',description:'Manage discounts and campaigns with flexible rules.',body:'',seoTitle:'Promotions | Ticarti',seoDescription:'Ticarti promotion and campaign features.'}}},
        {id:'email-marketing',code:'marketing',categoryId:'marketing',valueType:'TEXT',isActive:true,isPageEnabled:true,sortOrder:20,imageUrl:'',translations:{tr:{title:'E-posta Pazarlama',subtitle:'Müşterilerinize doğru zamanda ulaşın',slug:'e-posta-pazarlama',description:'Kampanya ve otomasyon e-postalarını tek merkezden yönetin.',body:'',seoTitle:'E-posta Pazarlama | Ticarti',seoDescription:'Ticarti e-posta pazarlama özellikleri.'},en:{title:'Email Marketing',subtitle:'Reach customers at the right time',slug:'email-marketing',description:'Manage campaigns and automated emails centrally.',body:'',seoTitle:'Email Marketing | Ticarti',seoDescription:'Ticarti email marketing features.'}}},
        {id:'multi-currency',code:'multiCurrency',categoryId:'commerce',valueType:'TEXT',isActive:true,isPageEnabled:true,sortOrder:10,imageUrl:'',translations:{tr:{title:'Çoklu Para Birimi',subtitle:'Global satışa hazır',slug:'coklu-para-birimi',description:'Mağazanızda birden fazla para birimiyle satış yapın.',body:'',seoTitle:'Çoklu Para Birimi | Ticarti',seoDescription:'Ticarti çoklu para birimi özellikleri.'},en:{title:'Multi Currency',subtitle:'Ready for global commerce',slug:'multi-currency',description:'Sell using multiple currencies.',body:'',seoTitle:'Multi Currency | Ticarti',seoDescription:'Ticarti multi-currency capabilities.'}}},
        {id:'priority-support',code:'prioritySupport',categoryId:'support',valueType:'TEXT',isActive:true,isPageEnabled:true,sortOrder:10,imageUrl:'',translations:{tr:{title:'Öncelikli Destek',subtitle:'Daha hızlı destek erişimi',slug:'oncelikli-destek',description:'İhtiyacınız olduğunda öncelikli destek alın.',body:'',seoTitle:'Öncelikli Destek | Ticarti',seoDescription:'Ticarti öncelikli destek hizmeti.'},en:{title:'Priority Support',subtitle:'Faster support access',slug:'priority-support',description:'Get priority support when you need it.',body:'',seoTitle:'Priority Support | Ticarti',seoDescription:'Ticarti priority support service.'}}},
      ]
    };
  }

  async planFeatureCatalog(){
    const [row,platform]:any=await Promise.all([
      (this.prisma as any).platformSetting.findUnique({where:{key:'plan_feature_catalog'}}),
      this.platformSettings()
    ]);
    const base:any=this.defaultPlanFeatureCatalog();
    const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    return {
      categories:Array.isArray(value.categories)?value.categories:base.categories,
      features:Array.isArray(value.features)?value.features:base.features,
      locales:(platform.locales||[]).filter((x:any)=>x.isActive!==false).map((x:any)=>({locale:x.locale,label:x.label,flag:x.flag||'',isDefault:!!x.isDefault})),
    };
  }

  async updatePlanFeatureCatalog(body:any){
    const current:any=await this.planFeatureCatalog();
    const locales=new Set((current.locales||[]).map((x:any)=>String(x.locale)));
    const cleanTranslations=(raw:any,fields:string[])=>{
      const out:any={};const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
      for(const [locale,row] of Object.entries(source)){if(!locales.has(String(locale)))continue;const v:any=row||{};out[String(locale)]={};for(const f of fields)out[String(locale)][f]=String(v[f]||'');}
      return out;
    };
    const categories=(Array.isArray(body?.categories)?body.categories:current.categories).slice(0,100).map((x:any,i:number)=>({
      id:String(x.id||x.code||'category-'+i).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-'),
      code:String(x.code||x.id||'CATEGORY_'+i).trim().toUpperCase().replace(/[^A-Z0-9_]+/g,'_'),
      isActive:x.isActive!==false,
      sortOrder:Number(x.sortOrder??i),
      translations:cleanTranslations(x.translations,['title','description']),
    })).filter((x:any)=>x.id);
    const categoryIds=new Set(categories.map((x:any)=>x.id));
    const features=(Array.isArray(body?.features)?body.features:current.features).slice(0,500).map((x:any,i:number)=>({
      id:String(x.id||x.code||'feature-'+i).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-'),
      code:String(x.code||x.id||'feature_'+i).trim().replace(/[^A-Za-z0-9_]+/g,'_'),
      categoryId:categoryIds.has(String(x.categoryId))?String(x.categoryId):categories[0]?.id||'',
      valueType:['BOOLEAN','TEXT','NUMBER'].includes(String(x.valueType||'').toUpperCase())?String(x.valueType).toUpperCase():'TEXT',
      isActive:x.isActive!==false,
      isPageEnabled:x.isPageEnabled!==false,
      sortOrder:Number(x.sortOrder??i),
      imageUrl:String(x.imageUrl||'').trim(),
      translations:cleanTranslations(x.translations,['title','subtitle','slug','description','body','seoTitle','seoDescription']),
    })).filter((x:any)=>x.id&&x.code);
    const value={categories,features};
    await (this.prisma as any).platformSetting.upsert({where:{key:'plan_feature_catalog'},create:{key:'plan_feature_catalog',value},update:{value}});
    return this.planFeatureCatalog();
  }

  async planWorkspace(){
    const [plans,catalog,platform]:any=await Promise.all([this.plans(),this.planFeatureCatalog(),this.platformSettings()]);
    return {plans,categories:catalog.categories,features:catalog.features,locales:catalog.locales,currencies:(platform.currencies||[]).filter((x:any)=>x.isActive!==false)};
  }

  plans() { return this.prisma.plan.findMany({ orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }] }); }
  private normalizePlanPricing(body:any,current?:any){
    const oldFeatures:any=current?.features&&typeof current.features==='object'&&!Array.isArray(current.features)?current.features:{};
    const fallback=[
      {period:'MONTHLY',label:'Aylık',enabled:Number(current?.monthlyPrice||0)>0,price:Number(current?.monthlyPrice||0),salePrice:null,saleStartAt:'',saleEndAt:''},
      {period:'YEARLY',label:'Yıllık',enabled:current?.yearlyPrice!==null&&current?.yearlyPrice!==undefined&&Number(current?.yearlyPrice||0)>0,price:Number(current?.yearlyPrice||0),salePrice:null,saleStartAt:'',saleEndAt:''},
    ];
    const source=Array.isArray(body?.pricingPeriods)?body.pricingPeriods:(Array.isArray(oldFeatures?._pricing)?oldFeatures._pricing:fallback);
    const allowed=new Set(['MONTHLY','YEARLY']);
    const rows=source.map((x:any)=>({
      period:String(x.period||'').toUpperCase(),
      label:String(x.label||'').trim(),
      enabled:x.enabled===true,
      price:Math.max(0,Number(x.price||0)),
      salePrice:x.salePrice===null||x.salePrice===undefined||x.salePrice===''?null:Math.max(0,Number(x.salePrice)),
      saleStartAt:String(x.saleStartAt||'').trim(),
      saleEndAt:String(x.saleEndAt||'').trim(),
    })).filter((x:any)=>allowed.has(x.period));
    for(const period of ['MONTHLY','YEARLY'])if(!rows.some((x:any)=>x.period===period))rows.push({period,label:period==='MONTHLY'?'Aylık':'Yıllık',enabled:false,price:0,salePrice:null,saleStartAt:'',saleEndAt:''});
    return rows;
  }

  createPlan(body: any) {
    const rawFeatures:any=body.features&&typeof body.features==='object'&&!Array.isArray(body.features)?body.features:{};
    const selections=Array.isArray(body.featureSelections)?body.featureSelections:[];
    const pricing=this.normalizePlanPricing(body);
    const monthly=pricing.find((x:any)=>x.period==='MONTHLY');
    const yearly=pricing.find((x:any)=>x.period==='YEARLY');
    const yearlyOnly=!!yearly?.enabled&&!monthly?.enabled;
    const features:any={...rawFeatures,_catalog:selections.map((x:any)=>({featureId:String(x.featureId||''),enabled:x.enabled!==false,value:x.value===undefined||x.value===null?'':String(x.value)})).filter((x:any)=>x.featureId),_translations:body.translations&&typeof body.translations==='object'?body.translations:{},_pricing:pricing,_meta:{...(rawFeatures._meta||{}),imageUrl:String(body.imageUrl||''),isFeatured:!!body.isFeatured,frontendVisible:body.frontendVisible!==false,vatIncluded:body.vatIncluded!==false,yearlyOnly}};
    for(const item of selections){const code=String(item.code||'').trim();if(code)features[code]=item.enabled!==false;}
    return this.prisma.plan.create({ data: { name: body.name, code: body.code, description: body.description, monthlyPrice: monthly?.enabled?monthly.price:0, yearlyPrice: yearly?.enabled?yearly.price:null, currency: body.currency || 'TRY', trialDays: body.trialDays ?? 14, maxStaff: body.maxStaff ?? 3, maxProducts: body.maxProducts ?? 1000, maxOrdersPerMonth: body.maxOrdersPerMonth, features, isActive: body.isActive ?? true, sortOrder: body.sortOrder || 0 } });
  }

  async updatePlan(id: string, body: any) {
    const current:any=await this.prisma.plan.findUnique({where:{id}});if(!current)throw new NotFoundException('Paket bulunamadı');
    const data:any={};
    for(const k of ['name','description','currency','trialDays','maxStaff','maxProducts','maxOrdersPerMonth','isActive','sortOrder'])if(body[k]!==undefined)data[k]=body[k];
    const pricing=this.normalizePlanPricing(body,current);
    if(body.pricingPeriods!==undefined){
      const monthly=pricing.find((x:any)=>x.period==='MONTHLY');
      const yearly=pricing.find((x:any)=>x.period==='YEARLY');
      data.monthlyPrice=monthly?.enabled?monthly.price:0;
      data.yearlyPrice=yearly?.enabled?yearly.price:null;
    }else{
      if(body.monthlyPrice!==undefined)data.monthlyPrice=body.monthlyPrice||0;
      if(body.yearlyPrice!==undefined)data.yearlyPrice=body.yearlyPrice;
    }
    if(body.featureSelections!==undefined||body.translations!==undefined||body.imageUrl!==undefined||body.isFeatured!==undefined||body.frontendVisible!==undefined||body.vatIncluded!==undefined||body.pricingPeriods!==undefined||body.features!==undefined){
      const old:any=current.features&&typeof current.features==='object'&&!Array.isArray(current.features)?current.features:{};
      const incoming:any=body.features&&typeof body.features==='object'&&!Array.isArray(body.features)?body.features:{};
      const selections=Array.isArray(body.featureSelections)?body.featureSelections:(Array.isArray(old._catalog)?old._catalog:[]);
      const monthly=pricing.find((x:any)=>x.period==='MONTHLY');
      const yearly=pricing.find((x:any)=>x.period==='YEARLY');
      const yearlyOnly=!!yearly?.enabled&&!monthly?.enabled;
      const features:any={...old,...incoming,_catalog:selections.map((x:any)=>({featureId:String(x.featureId||''),enabled:x.enabled!==false,value:x.value===undefined||x.value===null?'':String(x.value)})).filter((x:any)=>x.featureId),_translations:body.translations!==undefined?body.translations:(old._translations||{}),_pricing:pricing,_meta:{...(old._meta||{}),...(incoming._meta||{}),...(body.imageUrl!==undefined?{imageUrl:String(body.imageUrl||'')} :{}),...(body.isFeatured!==undefined?{isFeatured:!!body.isFeatured}:{}),...(body.frontendVisible!==undefined?{frontendVisible:!!body.frontendVisible}:{}),...(body.vatIncluded!==undefined?{vatIncluded:!!body.vatIncluded}:{}),yearlyOnly}};
      if(Array.isArray(body.featureSelections))for(const item of body.featureSelections){const code=String(item.code||'').trim();if(code)features[code]=item.enabled!==false;}
      data.features=features;
    }
    return this.prisma.plan.update({where:{id},data});
  }


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

  private defaultPlatformSettings(){
    return {
      company:{name:'Ticarti',legalName:'',email:'',phone:'',phoneCountry:'TR',website:'',taxOffice:'',taxNumber:'',address:'',country:'',city:'',district:'',postalCode:'',timezone:'Europe/Istanbul',logoUrl:'',logoDarkUrl:'',faviconUrl:'',socialLinks:[]},
      branding:{main:'',help:'',app:'',dev:''},
      locales:[{locale:'tr',label:'Türkçe',flag:'🇹🇷',isActive:true,isDefault:true},{locale:'en',label:'English',flag:'🇬🇧',isActive:true,isDefault:false}],
      countries:[{code:'TR',name:'Türkiye',phoneCode:'+90',flag:'🇹🇷',isActive:true},{code:'DE',name:'Almanya',phoneCode:'+49',flag:'🇩🇪',isActive:true},{code:'GB',name:'Birleşik Krallık',phoneCode:'+44',flag:'🇬🇧',isActive:true}],
      currencies:[{code:'TRY',name:'Türk Lirası',symbol:'₺',symbolPosition:'BEFORE',isActive:true,isDefault:true},{code:'USD',name:'US Dollar',symbol:'$',symbolPosition:'BEFORE',isActive:true,isDefault:false},{code:'EUR',name:'Euro',symbol:'€',symbolPosition:'AFTER',isActive:true,isDefault:false}]
    };
  }

  async platformSettings(){
    const row=await (this.prisma as any).platformSetting.findUnique({where:{key:'general'}});
    const base=this.defaultPlatformSettings();const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    const locales=(Array.isArray(value.locales)&&value.locales.length?value.locales:base.locales).map((x:any)=>({...x,flag:String(x.flag||'')}));
    const currencies=(Array.isArray(value.currencies)&&value.currencies.length?value.currencies:base.currencies).map((x:any)=>({...x,symbolPosition:String(x.symbolPosition||'BEFORE').toUpperCase()==='AFTER'?'AFTER':'BEFORE'}));
    const countries=(Array.isArray(value.countries)&&value.countries.length?value.countries:base.countries).map((x:any)=>({...x,code:String(x.code||'').toUpperCase(),flag:String(x.flag||'')}));
    return {...base,...value,branding:{...base.branding,...(value.branding||{})},company:{...base.company,...(value.company||{})},locales,currencies,countries};
  }

  async updatePlatformSettings(body:any){
    const current=await this.platformSettings();
    const company={...current.company};for(const k of ['name','legalName','email','phone','phoneCountry','website','taxOffice','taxNumber','address','country','city','district','postalCode','timezone','logoUrl','logoDarkUrl','faviconUrl'])if(body?.company?.[k]!==undefined)company[k]=String(body.company[k]||'').trim();if(Array.isArray(body?.company?.socialLinks))company.socialLinks=body.company.socialLinks.slice(0,50).map((x:any)=>({platform:String(x.platform||'').trim(),url:String(x.url||'').trim()})).filter((x:any)=>x.platform&&x.url);
    if(company.phone && !/^\+[1-9]\d{6,14}$/.test(company.phone))throw new BadRequestException('Geçersiz telefon numarası. Ülke koduyla E.164 biçimi kullanın.');
    if(company.phone?.startsWith('+90') && !/^\+90[2-5]\d{9}$/.test(company.phone))throw new BadRequestException('Türkiye telefon numarası 10 haneli olmalıdır.');
    if(company.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email))throw new BadRequestException('Geçersiz e-posta adresi.');
    if(company.timezone){try{new Intl.DateTimeFormat('en-US',{timeZone:company.timezone})}catch{throw new BadRequestException('Geçersiz saat dilimi.');}}
    const locales=(Array.isArray(body?.locales)?body.locales:current.locales).slice(0,100).map((x:any,i:number)=>({locale:String(x.locale||x.code||'').trim().toLowerCase(),label:String(x.label||x.name||x.locale||'').trim(),flag:String(x.flag||'').trim(),isActive:x.isActive!==false,isDefault:!!x.isDefault,sortOrder:Number(x.sortOrder??i)})).filter((x:any)=>x.locale);
    const currencies=(Array.isArray(body?.currencies)?body.currencies:current.currencies).slice(0,100).map((x:any,i:number)=>({code:String(x.code||'').trim().toUpperCase(),name:String(x.name||x.code||'').trim(),symbol:String(x.symbol||'').trim(),symbolPosition:String(x.symbolPosition||'BEFORE').toUpperCase()==='AFTER'?'AFTER':'BEFORE',isActive:x.isActive!==false,isDefault:!!x.isDefault,sortOrder:Number(x.sortOrder??i)})).filter((x:any)=>x.code);
    if(!locales.some((x:any)=>x.isActive))throw new BadRequestException('En az bir aktif dil gerekli');
    if(!currencies.some((x:any)=>x.isActive))throw new BadRequestException('En az bir aktif para birimi gerekli');
    let localeDefaultSeen=false;for(const x of locales){if(x.isDefault&&x.isActive&&!localeDefaultSeen)localeDefaultSeen=true;else x.isDefault=false;}if(!localeDefaultSeen){const x=locales.find((r:any)=>r.isActive);if(x)x.isDefault=true;}
    let currencyDefaultSeen=false;for(const x of currencies){if(x.isDefault&&x.isActive&&!currencyDefaultSeen)currencyDefaultSeen=true;else x.isDefault=false;}if(!currencyDefaultSeen){const x=currencies.find((r:any)=>r.isActive);if(x)x.isDefault=true;}
    const countries=(Array.isArray(body?.countries)?body.countries:current.countries||[]).slice(0,250).map((x:any,i:number)=>({code:String(x.code||'').trim().toUpperCase(),name:String(x.name||x.code||'').trim(),phoneCode:String(x.phoneCode||'').trim(),flag:String(x.flag||'').trim(),isActive:x.isActive!==false,sortOrder:Number(x.sortOrder??i)})).filter((x:any)=>x.code);
    // Central brand assets, never merchant / tenant logos. Only platform media
    // files or trusted HTTPS image URLs can be published from Master.
    const branding:any={...current.branding};
    for(const key of ['main','help','app','dev']){
      if(body?.branding?.[key]===undefined)continue;
      const src=String(body.branding[key]||'').trim();
      if(src.length>2048||src&& !(/^https:\/\/[^\s<>]+$/i.test(src)||/^\/assets\/images\/[a-zA-Z0-9._/-]+$/.test(src)))
        throw new BadRequestException('Alt alan adı logo adresi geçersiz: '+key);
      branding[key]=src;
    }
    const value={company,branding,locales,currencies,countries};
    await (this.prisma as any).platformSetting.upsert({where:{key:'general'},create:{key:'general',value},update:{value}});
    return value;
  }

  private defaultContractSettings(){
    return {
      contracts:[
        {key:'TERMS_OF_SERVICE',label:'Kullanım Koşulları',contentKey:'terms-of-service',isActive:true,placements:['FOOTER','REGISTER_TERMS','LOGIN_SOCIAL']},
        {key:'MEMBERSHIP_AGREEMENT',label:'Üyelik Sözleşmesi',contentKey:'membership-agreement',isActive:true,placements:['REGISTER_TERMS']},
        {key:'PRIVACY_POLICY',label:'Gizlilik Politikası',contentKey:'privacy-policy',isActive:true,placements:['FOOTER','REGISTER_PRIVACY','LOGIN_SOCIAL','CHECKOUT_PRIVACY','CONTACT_FORM']},
        {key:'KVKK_NOTICE',label:'KVKK Aydınlatma Metni',contentKey:'kvkk-notice',isActive:true,placements:['FOOTER','REGISTER_KVKK','CHECKOUT_PRIVACY','CONTACT_FORM']},
        {key:'EXPLICIT_CONSENT',label:'Açık Rıza Metni',contentKey:'explicit-consent',isActive:true,placements:['REGISTER_KVKK']},
        {key:'COMMERCIAL_COMMUNICATION',label:'Ticari Elektronik İleti Onayı',contentKey:'commercial-communication-consent',isActive:true,placements:['REGISTER_MARKETING','NEWSLETTER']},
        {key:'COOKIE_POLICY',label:'Çerez Politikası',contentKey:'cookie-policy',isActive:true,placements:['FOOTER','COOKIE_BANNER']},
        {key:'SUBSCRIPTION_AGREEMENT',label:'Abonelik / Hizmet Sözleşmesi',contentKey:'subscription-agreement',isActive:true,placements:['CHECKOUT_TERMS']},
        {key:'PRE_INFORMATION',label:'Ön Bilgilendirme Formu',contentKey:'pre-information',isActive:true,placements:['CHECKOUT_PREINFO']},
        {key:'DISTANCE_SALES',label:'Mesafeli Satış Sözleşmesi',contentKey:'distance-sales-agreement',isActive:true,placements:['CHECKOUT_DISTANCE_SALES']},
        {key:'CANCELLATION_REFUND',label:'İptal / İade Koşulları',contentKey:'cancellation-refund-policy',isActive:true,placements:['FOOTER','CHECKOUT_TERMS']},
        {key:'PAYMENT_BILLING',label:'Ödeme ve Faturalandırma Koşulları',contentKey:'payment-billing-terms',isActive:true,placements:['CHECKOUT_TERMS']},
        {key:'DATA_PROCESSING',label:'Kişisel Verilerin İşlenmesi ve Saklanması',contentKey:'data-processing-policy',isActive:true,placements:['FOOTER','REGISTER_KVKK','ACCOUNT']},
      ],
      placementOptions:[
        {key:'FOOTER',label:'Footer'},
        {key:'REGISTER_TERMS',label:'Kayıt · Kullanım / üyelik onayı'},
        {key:'REGISTER_PRIVACY',label:'Kayıt · Gizlilik bağlantısı'},
        {key:'REGISTER_KVKK',label:'Kayıt · KVKK / açık rıza'},
        {key:'REGISTER_MARKETING',label:'Kayıt · Ticari ileti izni'},
        {key:'LOGIN_SOCIAL',label:'Google / Facebook / sosyal giriş'},
        {key:'CHECKOUT_TERMS',label:'Checkout · Koşullar'},
        {key:'CHECKOUT_PREINFO',label:'Checkout · Ön bilgilendirme'},
        {key:'CHECKOUT_DISTANCE_SALES',label:'Checkout · Mesafeli satış'},
        {key:'CHECKOUT_PRIVACY',label:'Checkout · KVKK / gizlilik'},
        {key:'NEWSLETTER',label:'Newsletter / e-bülten'},
        {key:'COOKIE_BANNER',label:'Çerez bannerı / tercih merkezi'},
        {key:'CONTACT_FORM',label:'İletişim formu'},
        {key:'SUPPORT_FORM',label:'Destek formu'},
        {key:'ACCOUNT',label:'Hesap / profil alanı'},
        {key:'MOBILE_APP',label:'Mobil uygulama'},
      ],
      contentOptions:[
        {key:'terms-of-service',label:'Kullanım Koşulları'},
        {key:'membership-agreement',label:'Üyelik Sözleşmesi'},
        {key:'privacy-policy',label:'Gizlilik Politikası'},
        {key:'kvkk-notice',label:'KVKK Aydınlatma Metni'},
        {key:'explicit-consent',label:'Açık Rıza Metni'},
        {key:'commercial-communication-consent',label:'Ticari Elektronik İleti Onayı'},
        {key:'cookie-policy',label:'Çerez Politikası'},
        {key:'subscription-agreement',label:'Abonelik / Hizmet Sözleşmesi'},
        {key:'pre-information',label:'Ön Bilgilendirme Formu'},
        {key:'distance-sales-agreement',label:'Mesafeli Satış Sözleşmesi'},
        {key:'cancellation-refund-policy',label:'İptal / İade Koşulları'},
        {key:'payment-billing-terms',label:'Ödeme ve Faturalandırma Koşulları'},
        {key:'data-processing-policy',label:'Kişisel Verilerin İşlenmesi ve Saklanması'},
      ]
    };
  }

  async contractSettings(){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'platform_contracts'}});
    const base:any=this.defaultContractSettings();
    const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    return {
      contracts:Array.isArray(value.contracts)&&value.contracts.length?value.contracts:base.contracts,
      placementOptions:Array.isArray(value.placementOptions)&&value.placementOptions.length?value.placementOptions:base.placementOptions,
      contentOptions:Array.isArray(value.contentOptions)&&value.contentOptions.length?value.contentOptions:base.contentOptions,
    };
  }

  async updateContractSettings(body:any){
    const current:any=await this.contractSettings();
    const placementOptions=(Array.isArray(body?.placementOptions)?body.placementOptions:current.placementOptions||[]).slice(0,200).map((x:any,i:number)=>({
      key:String(x.key||'').trim().toUpperCase().replace(/[^A-Z0-9_]+/g,'_').replace(/^_+|_+$/g,''),
      label:String(x.label||x.key||'').trim(),
      sortOrder:Number(x.sortOrder??i),
    })).filter((x:any)=>x.key);
    const allowedPlacements=new Set(placementOptions.map((x:any)=>x.key));
    const contracts=(Array.isArray(body?.contracts)?body.contracts:current.contracts).slice(0,100).map((x:any,i:number)=>({
      key:String(x.key||'CONTRACT_'+i).trim().toUpperCase().replace(/[^A-Z0-9_]+/g,'_').replace(/^_+|_+$/g,''),
      label:String(x.label||x.key||'Sözleşme').trim(),
      contentKey:String(x.contentKey||'').trim(),
      isActive:x.isActive!==false,
      placements:(Array.isArray(x.placements)?x.placements:[]).map((p:any)=>String(p).trim().toUpperCase()).filter((p:string)=>allowedPlacements.has(p)),
      sortOrder:Number(x.sortOrder??i),
    })).filter((x:any)=>x.key);
    const contentOptions=(Array.isArray(body?.contentOptions)?body.contentOptions:current.contentOptions).slice(0,200).map((x:any,i:number)=>({
      key:String(x.key||'').trim(),
      label:String(x.label||x.key||'').trim(),
      sortOrder:Number(x.sortOrder??i),
    })).filter((x:any)=>x.key);
    const value={contracts,placementOptions,contentOptions};
    await (this.prisma as any).platformSetting.upsert({where:{key:'platform_contracts'},create:{key:'platform_contracts',value},update:{value}});
    return value;
  }

  private defaultAuthProviders(){
    return {
      providers:[
        {key:'GOOGLE',label:'Google ile giriş',enabled:false,clientId:'',clientSecretRef:'ticarti-google-oauth-client-secret',scopes:['openid','email','profile']},
        {key:'FACEBOOK',label:'Facebook ile giriş',enabled:false,clientId:'',clientSecretRef:'ticarti-facebook-oauth-client-secret',scopes:['email','public_profile']},
        {key:'APPLE',label:'Apple ile giriş',enabled:false,clientId:'',clientSecretRef:'ticarti-apple-oauth-client-secret',scopes:['name','email']},
        {key:'MICROSOFT',label:'Microsoft ile giriş',enabled:false,clientId:'',clientSecretRef:'ticarti-microsoft-oauth-client-secret',scopes:['openid','email','profile']},
      ]
    };
  }

  async authProviders(){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'auth_providers'}});
    const base:any=this.defaultAuthProviders();
    const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    return {providers:Array.isArray(value.providers)&&value.providers.length?value.providers:base.providers};
  }

  async updateAuthProviders(body:any){
    const current:any=await this.authProviders();
    const providers=(Array.isArray(body?.providers)?body.providers:current.providers).slice(0,20).map((x:any,i:number)=>({
      key:String(x.key||'PROVIDER_'+i).trim().toUpperCase(),
      label:String(x.label||x.key||'Provider').trim(),
      enabled:x.enabled===true,
      clientId:String(x.clientId||'').trim(),
      clientSecretRef:String(x.clientSecretRef||'').trim(),
      scopes:(Array.isArray(x.scopes)?x.scopes:String(x.scopes||'').split(',')).map((s:any)=>String(s).trim()).filter(Boolean),
      sortOrder:Number(x.sortOrder??i),
    })).filter((x:any)=>x.key);
    const value={providers};
    await (this.prisma as any).platformSetting.upsert({where:{key:'auth_providers'},create:{key:'auth_providers',value},update:{value}});
    return value;
  }

  private defaultCommunicationSettings(){
    return {
      email:{
        enabled:true,
        provider:'AWS_SES',
        region:'eu-central-1',
        credentialMode:'ENVIRONMENT',
        senderDomain:'ticarti.com',
        defaultFromName:'Ticarti',
        defaultFromEmail:'noreply@ticarti.com',
        defaultReplyTo:'support@ticarti.com',
        defaultLocale:'tr',
        transactional:true,
        marketing:true,
        retryCount:3,
        bounceHandling:true,
        complaintHandling:true,
        accessKeySecretRef:'',
        secretKeySecretRef:'',
      },
      sms:{enabled:false,provider:'',senderId:'',apiBaseUrl:'',apiKeySecretRef:'',defaultLocale:'tr'},
      whatsapp:{enabled:false,provider:'META',businessAccountId:'',phoneNumberId:'',apiVersion:'v21.0',accessTokenSecretRef:'',webhookTokenSecretRef:'',defaultLocale:'tr'},
      notificationRules:[
        {event:'USER_REGISTERED',label:'Yeni kullanıcı kaydı',email:true,sms:false,whatsapp:false,enabled:true},
        {event:'EMAIL_VERIFY',label:'E-posta doğrulama',email:true,sms:false,whatsapp:false,enabled:true},
        {event:'PASSWORD_RESET',label:'Şifre sıfırlama',email:true,sms:false,whatsapp:false,enabled:true},
        {event:'PAYMENT_FAILED',label:'Ödeme başarısız',email:true,sms:false,whatsapp:false,enabled:true},
        {event:'SUBSCRIPTION_STARTED',label:'Abonelik başladı',email:true,sms:false,whatsapp:false,enabled:true},
        {event:'SUBSCRIPTION_CANCELLED',label:'Abonelik iptal edildi',email:true,sms:false,whatsapp:false,enabled:true},
      ],
      templateVariables:[
        {key:'{{name}}',label:'Ad / kullanıcı adı',source:'user.name',enabled:true},
        {key:'{{email}}',label:'E-posta',source:'user.email',enabled:true},
        {key:'{{verification_url}}',label:'Doğrulama bağlantısı',source:'auth.verificationUrl',enabled:true},
        {key:'{{reset_url}}',label:'Şifre sıfırlama bağlantısı',source:'auth.resetUrl',enabled:true},
        {key:'{{store_name}}',label:'Mağaza adı',source:'store.name',enabled:true},
        {key:'{{order_number}}',label:'Sipariş numarası',source:'order.number',enabled:true},
        {key:'{{order_total}}',label:'Sipariş toplamı',source:'order.total',enabled:true},
        {key:'{{tracking_url}}',label:'Kargo takip bağlantısı',source:'shipment.trackingUrl',enabled:true},
      ],
      templates:{email:[],sms:[],whatsapp:[]}
    };
  }

  async communicationSettings(){
    const [row,platform]:any=await Promise.all([
      (this.prisma as any).platformSetting.findUnique({where:{key:'communication_settings'}}),
      this.platformSettings()
    ]);
    const base:any=this.defaultCommunicationSettings();
    const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    const activeLocales=(platform.locales||[]).filter((x:any)=>x.isActive!==false).map((x:any)=>({locale:String(x.locale),label:String(x.label||x.locale),flag:String(x.flag||'')}));
    const fallbackLocale=activeLocales.find((x:any)=>platform.locales.find((r:any)=>r.locale===x.locale)?.isDefault)?.locale||activeLocales[0]?.locale||'tr';
    const email={...base.email,...(value.email||{})};if(!activeLocales.some((x:any)=>x.locale===email.defaultLocale))email.defaultLocale=fallbackLocale;
    const sms={...base.sms,...(value.sms||{})};if(!activeLocales.some((x:any)=>x.locale===sms.defaultLocale))sms.defaultLocale=fallbackLocale;
    const whatsapp={...base.whatsapp,...(value.whatsapp||{})};if(!activeLocales.some((x:any)=>x.locale===whatsapp.defaultLocale))whatsapp.defaultLocale=fallbackLocale;
    return {
      email,sms,whatsapp,activeLocales,
      notificationRules:Array.isArray(value.notificationRules)?value.notificationRules:base.notificationRules,
      templateVariables:Array.isArray(value.templateVariables)?value.templateVariables:base.templateVariables,
      templates:{...base.templates,...(value.templates||{})},
    };
  }

  async updateCommunicationSettings(body:any){
    const current:any=await this.communicationSettings();
    const localeSet=new Set((current.activeLocales||[]).map((x:any)=>String(x.locale)));
    const normalizeLocale=(v:any,fallback:string)=>localeSet.has(String(v||''))?String(v):fallback;
    const fallbackLocale=current.activeLocales?.[0]?.locale||'tr';
    const email={
      ...current.email,
      ...(body?.email||{}),
      provider:'AWS_SES',
      enabled:body?.email?.enabled!==false,
      region:String(body?.email?.region||current.email.region||'eu-central-1').trim(),
      credentialMode:['ENVIRONMENT','SECRET_MANAGER'].includes(String(body?.email?.credentialMode||''))?String(body.email.credentialMode):'ENVIRONMENT',
      senderDomain:String(body?.email?.senderDomain||'').trim(),
      defaultFromName:String(body?.email?.defaultFromName||'').trim(),
      defaultFromEmail:String(body?.email?.defaultFromEmail||'').trim(),
      defaultReplyTo:String(body?.email?.defaultReplyTo||'').trim(),
      defaultLocale:normalizeLocale(body?.email?.defaultLocale,current.email.defaultLocale||fallbackLocale),
      transactional:body?.email?.transactional!==false,
      marketing:body?.email?.marketing!==false,
      retryCount:Math.max(0,Math.min(10,Number(body?.email?.retryCount??current.email.retryCount??3))),
      bounceHandling:body?.email?.bounceHandling!==false,
      complaintHandling:body?.email?.complaintHandling!==false,
      accessKeySecretRef:String(body?.email?.accessKeySecretRef||'').trim(),
      secretKeySecretRef:String(body?.email?.secretKeySecretRef||'').trim(),
    };
    const sms={...current.sms,...(body?.sms||{}),enabled:body?.sms?.enabled===true,defaultLocale:normalizeLocale(body?.sms?.defaultLocale,current.sms.defaultLocale||fallbackLocale)};
    const whatsapp={...current.whatsapp,...(body?.whatsapp||{}),enabled:body?.whatsapp?.enabled===true,defaultLocale:normalizeLocale(body?.whatsapp?.defaultLocale,current.whatsapp.defaultLocale||fallbackLocale)};
    const notificationRules=(Array.isArray(body?.notificationRules)?body.notificationRules:current.notificationRules).slice(0,100).map((x:any,i:number)=>({event:String(x.event||'EVENT_'+i).trim().toUpperCase(),label:String(x.label||x.event||'Olay').trim(),email:!!x.email,sms:!!x.sms,whatsapp:!!x.whatsapp,enabled:x.enabled!==false}));
    const templateVariables=(Array.isArray(body?.templateVariables)?body.templateVariables:current.templateVariables).slice(0,200).map((x:any)=>({key:String(x.key||'').trim(),label:String(x.label||x.key||'').trim(),source:String(x.source||'').trim(),enabled:x.enabled!==false})).filter((x:any)=>x.key);
    const cleanTemplates:any={};
    for(const channel of ['email','sms','whatsapp']){
      cleanTemplates[channel]=(Array.isArray(body?.templates?.[channel])?body.templates[channel]:current.templates?.[channel]||[]).slice(0,200).map((row:any,i:number)=>{
        const translations:any={};const raw=row?.translations&&typeof row.translations==='object'&&!Array.isArray(row.translations)?row.translations:{};
        for(const [locale,text] of Object.entries(raw)){if(!localeSet.has(String(locale)))continue;const t:any=text||{};translations[String(locale)]={subject:String(t.subject||''),body:String(t.body||'')};}
        return {event:String(row.event||row.id||'TEMPLATE_'+i).trim(),name:String(row.name||row.event||'Şablon').trim(),enabled:row.enabled!==false,layout:String(row.layout||'minimal'),metaName:String(row.metaName||''),translations};
      });
    }
    const value={email,sms,whatsapp,notificationRules,templateVariables,templates:cleanTemplates};
    await (this.prisma as any).platformSetting.upsert({where:{key:'communication_settings'},create:{key:'communication_settings',value},update:{value}});
    return this.communicationSettings();
  }

  private defaultAiServices(){
    const baseUrl='https://api.openai.com/v1';
    return {
      services:{
        text:{label:'Metin ve asistan',enabled:true,provider:'openai-compatible',model:'gpt-4.1-mini',baseUrl},
        image:{label:'Görsel üretimi',enabled:true,provider:'openai-compatible',model:'gpt-image-1',baseUrl},
        embedding:{label:'Arama ve embedding',enabled:false,provider:'openai-compatible',model:'text-embedding-3-small',baseUrl},
        vision:{label:'Görsel analiz',enabled:false,provider:'openai-compatible',model:'gpt-4.1-mini',baseUrl},
        speechToText:{label:'Ses yazıya çevirme',enabled:false,provider:'openai-compatible',model:'gpt-4o-mini-transcribe',baseUrl},
        textToSpeech:{label:'Ses sentezi',enabled:false,provider:'openai-compatible',model:'gpt-4o-mini-tts',baseUrl},
        moderation:{label:'Güvenlik ve moderasyon',enabled:false,provider:'openai-compatible',model:'omni-moderation-latest',baseUrl},
        video:{label:'Video üretimi',enabled:false,provider:'openai-compatible',model:'',baseUrl},
      },
      creditPolicy:{enabled:true},
    };
  }

  async aiServices(){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'ai_services'}});
    const base:any=this.defaultAiServices();
    const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    const services:any={...base.services};
    for(const [key,def] of Object.entries(base.services as any)){
      const current:any=value?.services?.[key]||{};
      services[key]={...(def as any),...current};
    }
    return {services,creditPolicy:{...base.creditPolicy,...(value.creditPolicy||{})}};
  }

  async updateAiServices(body:any){
    const current:any=await this.aiServices();
    const services:any={};
    for(const [key,def] of Object.entries(current.services||{})){
      const row:any=body?.services?.[key]||def;
      services[key]={
        label:String(row.label||(def as any).label||key),
        enabled:row.enabled!==false,
        provider:String(row.provider||(def as any).provider||'openai-compatible').trim(),
        model:String(row.model??(def as any).model??'').trim(),
        baseUrl:String(row.baseUrl||(def as any).baseUrl||'').trim(),
      };
    }
    const value={services,creditPolicy:{...current.creditPolicy,...(body?.creditPolicy||{})}};
    await (this.prisma as any).platformSetting.upsert({where:{key:'ai_services'},create:{key:'ai_services',value},update:{value}});
    return value;
  }

  async platformLocales(){
    return activePlatformLocales(this.prisma);
  }

  async appCategories(){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'app_categories'}});
    const value:any=row?.value&&typeof row.value==='object'?row.value:{};
    return Array.isArray(value.categories)?value.categories.sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)):[];
  }

  async updateAppCategories(body:any){
    const categories=(Array.isArray(body?.categories)?body.categories:[]).slice(0,200).map((x:any,i:number)=>({id:String(x.id||`cat-${i}`).trim(),translations:this.cleanTranslations(x.translations),sortOrder:Number(x.sortOrder??i),isActive:x.isActive!==false})).filter((x:any)=>x.id);
    const value={categories};await (this.prisma as any).platformSetting.upsert({where:{key:'app_categories'},create:{key:'app_categories',value},update:{value}});return categories;
  }

  async team(){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'superadmin_team_permissions'}});
    const map:any=row?.value&&typeof row.value==='object'?row.value:{};
    const rows:any[]=await this.prisma.superAdmin.findMany({orderBy:{createdAt:'asc'}});
    return rows.map(x=>({id:x.id,email:x.email,name:x.name,isActive:x.isActive,lastLoginAt:x.lastLoginAt,createdAt:x.createdAt,permissions:Array.isArray(map[x.id])?map[x.id]:['dashboard','settings','memberships','plans','themes','apps','domains','currency','support','team'],roleLabel:Array.isArray(map[x.id])&&map[x.id].length<10?'Özel yetki':'Tam yetki'}));
  }

  async createTeamMember(body:any){
    const email=String(body?.email||'').trim().toLowerCase();const password=String(body?.password||'');if(!email||password.length<8)throw new BadRequestException('E-posta ve en az 8 karakter şifre gerekli');
    const admin=await this.prisma.superAdmin.create({data:{email,name:String(body?.name||'').trim()||null,passwordHash:await bcrypt.hash(password,14),isActive:body?.isActive!==false}});
    await this.saveTeamPermissions(admin.id,body?.permissions);return (await this.team()).find((x:any)=>x.id===admin.id);
  }

  async updateTeamMember(id:string,body:any){
    const current=await this.prisma.superAdmin.findUnique({where:{id}});if(!current)throw new NotFoundException('Ekip üyesi bulunamadı');
    const data:any={};if(body.name!==undefined)data.name=String(body.name||'').trim()||null;if(body.email!==undefined)data.email=String(body.email||'').trim().toLowerCase();if(body.isActive!==undefined)data.isActive=!!body.isActive;if(body.password){if(String(body.password).length<8)throw new BadRequestException('Şifre en az 8 karakter olmalı');data.passwordHash=await bcrypt.hash(String(body.password),14);data.passwordChangedAt=new Date();}
    await this.prisma.superAdmin.update({where:{id},data});if(body.permissions!==undefined)await this.saveTeamPermissions(id,body.permissions);return (await this.team()).find((x:any)=>x.id===id);
  }

  private async saveTeamPermissions(id:string,permissions:any){
    const allowed=['dashboard','settings','memberships','plans','themes','apps','domains','currency','support','team'];const perms=Array.isArray(permissions)?permissions.map(String).filter((x:string)=>allowed.includes(x)):[];
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'superadmin_team_permissions'}});const value:any=row?.value&&typeof row.value==='object'?{...row.value}:{};value[id]=perms;await (this.prisma as any).platformSetting.upsert({where:{key:'superadmin_team_permissions'},create:{key:'superadmin_team_permissions',value},update:{value}});
  }

  private readonly placeholderAppSlugs=[
    'whatsapp-ai','google-shopping','meta-pixel','google-analytics-4','google-tag-manager','sms',
    'trendyol','hepsiburada','n11','amazon','pazarama','ciceksepeti','pttavm',
    'kargo-yurtici','kargo-aras','kargo-mng','kargo-surat','kargo-ptt',
    'fatura-parasut','fatura-logo','fatura-mikro','fatura-nebim',
    'odeme-iyzico','odeme-paytr','odeme-param','odeme-sipay','odeme-stripe'
  ];

  private async cleanupPlaceholderApps(){
    const rows=await this.prisma.appDefinition.findMany({where:{slug:{in:this.placeholderAppSlugs}},select:{id:true}});
    if(!rows.length)return;
    const ids=rows.map(x=>x.id);
    await this.prisma.$transaction([
      this.prisma.appInstallation.deleteMany({where:{appId:{in:ids}}}),
      this.prisma.appPlanPrice.deleteMany({where:{appId:{in:ids}}}),
      this.prisma.appDefinition.deleteMany({where:{id:{in:ids}}}),
    ]);
  }

  async apps(){
    // Never delete or hide existing app records when opening the catalog.
    return this.prisma.appDefinition.findMany({include:{planPrices:{include:{plan:true},orderBy:{createdAt:'asc'}},_count:{select:{installs:true}}},orderBy:[{sortOrder:'asc'},{name:'asc'}]});
  }

  async appWorkspace(){
    const [items,plans,settings,categories,locales]=await Promise.all([this.apps(),this.plans(),this.platformSettings(),this.appCategories(),this.platformLocales()]);
    return {items,plans,locales,currencies:(settings.currencies||[]).filter((x:any)=>x.isActive!==false),categories};
  }


  async appInstallations(query:any){
    const page=Math.max(1,Number(query?.page)||1);
    const limit=Math.min(100,Math.max(1,Number(query?.limit)||30));
    const q=String(query?.q||'').trim().slice(0,120);
    const where:any=q?{OR:[
      {app:{name:{contains:q,mode:'insensitive'}}},
      {app:{slug:{contains:q,mode:'insensitive'}}},
      {tenant:{name:{contains:q,mode:'insensitive'}}},
      {tenant:{slug:{contains:q,mode:'insensitive'}}}
    ]}:{};
    const [items,total]=await Promise.all([
      this.prisma.appInstallation.findMany({where,include:{
        app:{select:{id:true,name:true,slug:true,category:true}},
        tenant:{select:{id:true,name:true,slug:true,domain:true}}
      },orderBy:{installedAt:'desc'},skip:(page-1)*limit,take:limit}),
      this.prisma.appInstallation.count({where})
    ]);
    return {items,total,page,limit,pages:Math.max(1,Math.ceil(total/limit))};
  }

  private appMarketplaceMeta(body:any){
    const screenshots=Array.isArray(body.screenshots)?body.screenshots.map((x:any)=>String(x).trim()).filter(Boolean):String(body.screenshots||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const translations:any={};const rawTranslations=body?.translations&&typeof body.translations==='object'&&!Array.isArray(body.translations)?body.translations:{};
    for(const [locale,row] of Object.entries(rawTranslations)){const r:any=row||{};translations[String(locale)]={name:String(r.name||'').trim(),summary:String(r.summary||'').trim(),description:String(r.description||'').trim(),usageGuide:String(r.usageGuide||'').trim()};}
    return {logoUrl:String(body.logoUrl||'').trim()||null,usageGuide:String(body.usageGuide||'').trim()||null,screenshots,translations,categoryId:String(body.categoryId||'').trim(),planTrials:body.planTrials&&typeof body.planTrials==='object'?body.planTrials:{}};
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
    if(['logoUrl','usageGuide','screenshots','translations','categoryId','planTrials'].some(k=>body[k]!==undefined)){
      const currentSchema:any=data.settingsSchema&&typeof data.settingsSchema==='object'&&!Array.isArray(data.settingsSchema)?data.settingsSchema:(current.settingsSchema&&typeof current.settingsSchema==='object'&&!Array.isArray(current.settingsSchema)?current.settingsSchema:{});
      data.settingsSchema={...currentSchema,marketplace:{...(currentSchema.marketplace||{}),...this.appMarketplaceMeta({...currentSchema.marketplace,...body})}};
    }
    for(const k of ['isActive','isFeatured']) if(body[k]!==undefined)data[k]=!!body[k];
    if(body.basePrice!==undefined)data.basePrice=Number(body.basePrice||0);
    if(body.sortOrder!==undefined)data.sortOrder=Number(body.sortOrder||0);
    return this.prisma.appDefinition.update({where:{id},data});
  }

  async setAppPlanPricing(appId:string,body:any){
    if(!body.planId)throw new NotFoundException('Plan is required');
    const planId=String(body.planId);
    const result=await this.prisma.appPlanPrice.upsert({where:{appId_planId:{appId,planId}},create:{appId,planId,price:body.price===''||body.price===null||body.price===undefined?null:Number(body.price),currency:body.currency?String(body.currency):null,billingType:body.billingType?String(body.billingType):null,included:!!body.included,isActive:body.isActive!==false},update:{price:body.price===''||body.price===null||body.price===undefined?null:Number(body.price),currency:body.currency?String(body.currency):null,billingType:body.billingType?String(body.billingType):null,included:!!body.included,isActive:body.isActive!==false}});
    if(body.trialDays!==undefined){const app:any=await this.prisma.appDefinition.findUnique({where:{id:appId}});const schema:any=app?.settingsSchema&&typeof app.settingsSchema==='object'&&!Array.isArray(app.settingsSchema)?app.settingsSchema:{};const market:any=schema.marketplace||{};const planTrials:any={...(market.planTrials||{}),[planId]:Math.max(0,Number(body.trialDays||0))};await this.prisma.appDefinition.update({where:{id:appId},data:{settingsSchema:{...schema,marketplace:{...market,planTrials}}}});}
    return result;
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

  async themeInstallations(query:any){
    const page=Math.max(1,Number(query?.page)||1);
    const limit=Math.min(100,Math.max(1,Number(query?.limit)||30));
    const q=String(query?.q||'').trim().slice(0,120);
    const where:any=q?{OR:[
      {theme:{name:{contains:q,mode:'insensitive'}}},
      {theme:{slug:{contains:q,mode:'insensitive'}}},
      {tenant:{name:{contains:q,mode:'insensitive'}}},
      {tenant:{slug:{contains:q,mode:'insensitive'}}}
    ]}:{};
    const [items,total]=await Promise.all([
      this.prisma.themeInstallation.findMany({where,include:{
        theme:{select:{id:true,name:true,slug:true,previewImageUrl:true}},
        tenant:{select:{id:true,name:true,slug:true,domain:true}}
      },orderBy:{installedAt:'desc'},skip:(page-1)*limit,take:limit}),
      this.prisma.themeInstallation.count({where})
    ]);
    return {items,total,page,limit,pages:Math.max(1,Math.ceil(total/limit))};
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
    const sourceCatalog:any[]=ticartiSkinCatalog();
    const extraSkins=Object.entries(sourceOverrides).filter(([slug,raw])=>raw&&typeof raw==='object'&&!sourceCatalog.some((x:any)=>x.slug===slug)).map(([slug,raw])=>({...(raw as any),slug,name:String((raw as any).name||slug)}));
    const skins=[...sourceCatalog,...extraSkins].map((skin:any)=>{const meta:any=skinMeta[skin.slug]||{};const raw:any=sourceOverrides[skin.slug]||skin;return {slug:skin.slug,sourceName:skin.name,name:meta.name||skin.name,groupId:meta.groupId||'',previewImageUrl:meta.previewImageUrl||skin.previewImageUrl||theme.previewImageUrl||'',translations:meta.translations||{},planPricing:Array.isArray(meta.planPricing)?meta.planPricing:[],isActive:meta.isActive!==false,isFeatured:!!meta.isFeatured,verifiedFromDemo:!!skin.verifiedFromDemo,rawJson:raw};});
    const allSkins=[...ticartiSkinCatalog(),...Object.values(sourceOverrides).filter((x:any)=>x&&typeof x==='object')];
    const types=Array.from(new Set([...allSkins.flatMap((skin:any)=>(skin.homePreset||[]).map((x:any)=>String(x.sectionType||'')).filter(Boolean)),...Object.keys(moduleCatalog),...(Array.isArray(config.modules)?config.modules.map((x:any)=>String(x.type||'')).filter(Boolean):[])]));
    const modules=types.map((type:string)=>{const meta:any=moduleCatalog[type]||{};return {type,name:meta.name||type,categoryId:meta.categoryId||meta.groupId||'',translations:meta.translations||{},screenshots:Array.isArray(meta.screenshots)?meta.screenshots:[],planPricing:Array.isArray(meta.planPricing)?meta.planPricing:[],isActive:meta.isActive!==false};});
    const moduleCategories=(Array.isArray(config.moduleCategories)?config.moduleCategories:(Array.isArray(config.moduleGroups)?config.moduleGroups:[])).sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0));
    return {theme:{id:theme.id,name:theme.name,slug:theme.slug},moduleCategories,moduleGroups:moduleCategories,skins,modules};
  }
  async updateThemeWorkspaceGroups(themeId:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const config:any=this.themeConfig(theme);const normalize=(rows:any)=>Array.isArray(rows)?rows.slice(0,200).map((x:any,i:number)=>({id:String(x.id||`category-${i}`),translations:this.cleanTranslations(x.translations),sortOrder:Number(x.sortOrder??i),isActive:x.isActive!==false})):[];const next={...config};const categories=body.moduleCategories!==undefined?body.moduleCategories:body.moduleGroups;if(categories!==undefined){next.moduleCategories=normalize(categories);next.moduleGroups=next.moduleCategories;}await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:next}});return this.themeWorkspace(themeId);}
  async updateThemeSkinCatalog(themeId:string,skinValue:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const slug=normalizeTicartiSkinSlug(skinValue);const config:any=this.themeConfig(theme);const exists=ticartiSkinCatalog().some((x:any)=>x.slug===slug)||!!(config.skinSourceOverrides||{})[slug];if(!exists)throw new NotFoundException('Skin bulunamadı');const skinMeta:any={...(config.skinMeta||{})};const current:any=skinMeta[slug]||{};skinMeta[slug]={...current,name:body.name!==undefined?String(body.name):current.name,groupId:body.groupId!==undefined?String(body.groupId):current.groupId,previewImageUrl:body.previewImageUrl!==undefined?String(body.previewImageUrl):current.previewImageUrl,translations:body.translations!==undefined?this.cleanTranslations(body.translations):current.translations,planPricing:Array.isArray(body.planPricing)?body.planPricing.map((x:any)=>({planId:String(x.planId),enabled:x.enabled!==false,included:!!x.included,price:x.price===''||x.price===null||x.price===undefined?null:Number(x.price),currency:String(x.currency||'TRY')})):current.planPricing,isActive:body.isActive!==undefined?!!body.isActive:current.isActive,isFeatured:body.isFeatured!==undefined?!!body.isFeatured:current.isFeatured};await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,skinMeta}}});return this.themeWorkspace(themeId);}
  async updateThemeSkinSource(themeId:string,skinValue:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const slug=normalizeTicartiSkinSlug(skinValue);const source=body?.rawJson;if(!source||typeof source!=='object'||Array.isArray(source))throw new BadRequestException('Geçerli ham tema JSON gerekli');if(String(source.slug||slug)!==slug)throw new BadRequestException('JSON slug seçili skin ile aynı olmalı');const config:any=this.themeConfig(theme);const rows:any={...(config.skinSourceOverrides||{})};rows[slug]=source;await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,skinSourceOverrides:rows}}});return this.themeWorkspace(themeId);}
  async resetThemeSkinSource(themeId:string,skinValue:string){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const slug=normalizeTicartiSkinSlug(skinValue);const config:any=this.themeConfig(theme);const rows:any={...(config.skinSourceOverrides||{})};delete rows[slug];await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,skinSourceOverrides:rows}}});return this.themeWorkspace(themeId);}
  async updateThemeModuleCatalog(themeId:string,typeValue:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');const type=String(typeValue||'').trim();if(!type)throw new BadRequestException('Modül tipi gerekli');const config:any=this.themeConfig(theme);const moduleCatalog:any={...(config.moduleCatalog||{})};const current:any=moduleCatalog[type]||{};moduleCatalog[type]={...current,name:body.name!==undefined?String(body.name):current.name,categoryId:body.categoryId!==undefined?String(body.categoryId):current.categoryId,groupId:body.categoryId!==undefined?String(body.categoryId):current.groupId,translations:body.translations!==undefined?this.cleanTranslations(body.translations):current.translations,screenshots:Array.isArray(body.screenshots)?body.screenshots.map(String).slice(0,24):current.screenshots,planPricing:Array.isArray(body.planPricing)?body.planPricing.map((x:any)=>({planId:String(x.planId),enabled:x.enabled!==false,included:!!x.included,price:x.price===''||x.price===null||x.price===undefined?null:Number(x.price),currency:String(x.currency||'TRY'),trialDays:Math.max(0,Number(x.trialDays||0))})):current.planPricing,isActive:body.isActive!==undefined?!!body.isActive:current.isActive};await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,moduleCatalog}}});return this.themeWorkspace(themeId);}

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
