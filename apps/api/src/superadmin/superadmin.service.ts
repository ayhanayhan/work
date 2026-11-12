import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { createHash, createCipheriv, randomBytes } from 'crypto';
import { parseThemePackage } from './theme-package.util';
import { parseAppPackage } from './app-package.util';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { apiError } from '../i18n/api-error';
import { MediaService } from '../media/media.service';
import { ExtensionsService } from '../extensions/extensions.service';

@Injectable()
export class SuperAdminService {
  private themeStorage=new Storage();
  constructor(private prisma: PrismaService,private media:MediaService,private extensions:ExtensionsService) {}
  private themeBucket(){return String(process.env.GCS_BUCKET||'').trim();}
  private themeUploadRoot(){return process.env.UPLOAD_DIR||join(process.cwd(),'uploads');}
  private async storeThemeZip(key:string,data:Buffer){const bucket=this.themeBucket();if(bucket){await this.themeStorage.bucket(bucket).file(key).save(data,{resumable:false,contentType:'application/zip',metadata:{cacheControl:'private,max-age=0,no-store'}});return;}const target=join(this.themeUploadRoot(),key);await mkdir(dirname(target),{recursive:true});await writeFile(target,data);}


  async storeDeletionRequests(){
    const stores=await this.prisma.tenant.findMany({
      where:{deletionRequestedAt:{not:null}},
      select:{id:true,name:true,publicSlug:true,status:true,deletionRequestedAt:true,deletionConfirmedAt:true,deletionScheduledAt:true},
      orderBy:{deletionRequestedAt:'desc'},take:200,
    });
    if(!stores.length)return {items:[]};
    const ids=stores.map(store=>store.id);
    // Aggregate per store, not one set of queries per tenant. These are preliminary
    // blockers; payment disputes and legal retention still require manual review.
    const [orders,returns,invoices]=await Promise.all([
      this.prisma.order.groupBy({by:['storeId'],where:{storeId:{in:ids},status:{notIn:['CANCELLED','FULFILLED']}},_count:{_all:true}}),
      this.prisma.returnRequest.groupBy({by:['storeId'],where:{storeId:{in:ids},status:{notIn:['REFUNDED','REJECTED','CANCELLED']}},_count:{_all:true}}),
      this.prisma.billingInvoice.groupBy({by:['tenantId'],where:{tenantId:{in:ids},paidAt:null,total:{gt:0},status:{notIn:['PAID','CANCELLED','VOID','VOIDED']}},_count:{_all:true}}),
    ]);
    const orderCounts=new Map(orders.map(row=>[row.storeId,row._count._all]));
    const returnCounts=new Map(returns.map(row=>[row.storeId,row._count._all]));
    const invoiceCounts=new Map(invoices.map(row=>[row.tenantId,row._count._all]));
    const now=Date.now();
    return {items:stores.map(store=>{
      const blockers={activeOrders:orderCounts.get(store.id)||0,activeReturns:returnCounts.get(store.id)||0,unpaidInvoices:invoiceCounts.get(store.id)||0};
      return {...store,blockers,hasFinancialBlockers:Object.values(blockers).some(Boolean),
        remainingDays:store.deletionScheduledAt?Math.max(0,Math.ceil((store.deletionScheduledAt.getTime()-now)/86400000)):null,
        phase:!store.deletionConfirmedAt?'AWAITING_EMAIL_CONFIRMATION':store.deletionScheduledAt&&store.deletionScheduledAt.getTime()<=now?'AWAITING_SUPERADMIN_REVIEW':'WAITING_PERIOD',
        physicalDeletionCompleted:false};
    })};
  }

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
    const [shippingErrors,erpFailures,messageFailures,inactiveTenants,recentTickets]=await Promise.all([
      this.prisma.shippingConnection.count({where:{status:'ERROR'}}).catch(()=>0),
      this.prisma.erpSyncJob.count({where:{status:{in:['FAILED','ERROR']}}}).catch(()=>0),
      this.prisma.messageRecord.count({where:{status:{in:['FAILED','REJECTED','EXPIRED']}}}).catch(()=>0),
      this.prisma.tenant.count({where:{status:{not:'ACTIVE'}}}).catch(()=>0),
      this.prisma.supportTicket.findMany({where:{status:{in:['OPEN','IN_PROGRESS','WAITING_CUSTOMER']}},include:{tenant:{select:{id:true,name:true}}},orderBy:{updatedAt:'desc'},take:6}).catch(()=>[] as any[]),
    ]);
    const marketRates=await this.currencyRates().catch(()=>({rates:[],source:'',updatedAt:null} as any));
    return { metrics: { tenants, activeTenants, users, openTickets, products, orders, gmV: Number(revenue._sum.grandTotal || 0) }, recentTenants,marketRates,operations:{api:'OK',database:'OK',shippingErrors,erpFailures,messageFailures,inactiveTenants,recentTickets} };
  }

  async systemAudit() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [tenants, activeTenants, users, products, orders, failedEmails, failedWebhooks, failedErp, shippingErrors, openTickets, recentAudit] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { memberships: { some: {} } } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count({ where: { createdAt: { gte: since } } }),
      this.prisma.emailMarketingJob.count({ where: { status: { in: ['FAILED', 'BOUNCED'] }, createdAt: { gte: since } } }).catch(() => 0),
      this.prisma.webhookDelivery.count({ where: { statusCode: { gte: 400 }, createdAt: { gte: since } } }).catch(() => 0),
      this.prisma.erpSyncJob.count({ where: { status: { in: ['FAILED', 'ERROR'] }, createdAt: { gte: since } } }).catch(() => 0),
      this.prisma.shippingConnection.count({ where: { status: 'ERROR' } }).catch(() => 0),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] } } }).catch(() => 0),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, action: true, resource: true, path: true, statusCode: true, createdAt: true, tenant: { select: { name: true, publicSlug: true } } } }).catch(() => [] as any[]),
    ]);
    const checks = [
      { key: 'api', label: 'API', status: 'healthy', detail: 'Uygulama katmanı yanıt veriyor' },
      { key: 'database', label: 'Veritabanı', status: 'healthy', detail: 'Prisma sorguları tamamlandı' },
      { key: 'email', label: 'Email kuyruğu', status: failedEmails ? 'warning' : 'healthy', detail: `${failedEmails} başarısız iş` },
      { key: 'webhooks', label: 'Webhook teslimleri', status: failedWebhooks ? 'warning' : 'healthy', detail: `${failedWebhooks} hatalı teslim` },
      { key: 'erp', label: 'ERP senkronizasyonu', status: failedErp ? 'warning' : 'healthy', detail: `${failedErp} başarısız işlem` },
      { key: 'shipping', label: 'Kargo bağlantıları', status: shippingErrors ? 'warning' : 'healthy', detail: `${shippingErrors} sorunlu bağlantı` },
    ];
    return { generatedAt: new Date().toISOString(), window: '24h', metrics: { tenants, activeTenants, users, products, orders, failedEmails, failedWebhooks, failedErp, shippingErrors, openTickets }, checks, recentAudit };
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
    if(body.representativeId!==undefined||body.sectorId!==undefined){
      const settings:any=current.settings&&typeof current.settings==='object'&&!Array.isArray(current.settings)?current.settings:{};
      const platform:any=settings.platform&&typeof settings.platform==='object'?settings.platform:{};
      data.settings={...settings,platform:{...platform,...(body.representativeId!==undefined?{representativeId:String(body.representativeId||'')}:{}),...(body.sectorId!==undefined?{sectorId:String(body.sectorId||'')}: {})}};
    }
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async deleteTenant(id:string){
    const row=await this.prisma.tenant.findUnique({where:{id}});
    if(!row)throw new NotFoundException(apiError('store.notFound'));
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
    return users.map(u=>({id:u.id,email:u.email,name:u.name,createdAt:u.createdAt,isActive:disabled[u.id]!==false,stores:u.memberships.map((m:any)=>{const t=m.tenant;const settings:any=t.settings&&typeof t.settings==='object'&&!Array.isArray(t.settings)?t.settings:{};const platform:any=settings.platform||{};return{id:t.id,name:t.name,slug:t.slug,publicSlug:t.publicSlug,domain:t.domain,status:t.status,createdAt:t.createdAt,plan:t.subscriptions?.[0]?.plan||null,subscription:t.subscriptions?.[0]||null,aiCredits:t.aiWallet?.balance||0,representativeId:String(platform.representativeId||''),sectorId:String(platform.sectorId||'')}})}));
  }

  async setMembershipStatus(userId:string,body:any){
    const user=await this.prisma.user.findUnique({where:{id:userId},include:{memberships:true}});
    if(!user)throw new NotFoundException(apiError('superadmin.membership.notFound'));
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'merchant_membership_status'}});
    const value:any=row?.value&&typeof row.value==='object'?{...row.value}:{};
    const active=body?.isActive!==false; value[userId]=active;
    await (this.prisma as any).platformSetting.upsert({where:{key:'merchant_membership_status'},create:{key:'merchant_membership_status',value},update:{value}});
    if(!active){
      // Account access and store lifecycle are independent. A staff/admin user can belong
      // to multiple stores; disabling that user must never suspend those stores.
      await this.prisma.merchantSession.updateMany({where:{userId,revokedAt:null},data:{revokedAt:new Date()}});
    }
    return {ok:true,isActive:active};
  }

  async deleteMembership(userId:string){
    const user=await this.prisma.user.findUnique({where:{id:userId}});
    if(!user)throw new NotFoundException(apiError('superadmin.membership.notFound'));
    await this.prisma.$transaction(async tx=>{
      await tx.merchantSession.deleteMany({where:{userId}});
      await tx.membership.deleteMany({where:{userId}});
    });
    return {deleted:true};
  }

  async grantAiCredits(tenantId:string,body:any){
    const amount=Math.trunc(Number(body?.amount||0)); if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException(apiError('superadmin.aiCredit.positive'));
    const tenant=await this.prisma.tenant.findUnique({where:{id:tenantId}});if(!tenant)throw new NotFoundException(apiError('store.notFound'));
    return this.prisma.$transaction(async tx=>{
      const wallet=await tx.aiCreditWallet.upsert({where:{tenantId},create:{tenantId,balance:0,lifetimePurchased:0,lifetimeUsed:0},update:{}});
      const balanceAfter=wallet.balance+amount;
      await tx.aiCreditWallet.update({where:{id:wallet.id},data:{balance:balanceAfter,lifetimePurchased:{increment:amount}}});
      await tx.aiCreditLedger.create({data:{walletId:wallet.id,amount,type:'MANUAL_GRANT',source:'SUPERADMIN',description:String(body?.description||'Super Admin kredi tanımlaması'),balanceAfter}});
      return {ok:true,balance:balanceAfter};
    });
  }

  plans() { return this.prisma.plan.findMany({ orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }] }); }
  createPlan(body: any) {
    return this.prisma.plan.create({ data: { name: body.name, code: body.code, description: body.description, monthlyPrice: body.monthlyPrice || 0, yearlyPrice: body.yearlyPrice, currency: body.currency || 'TRY', trialDays: body.trialDays ?? 14, maxStaff: body.maxStaff ?? 3, maxProducts: body.maxProducts ?? 1000, maxOrdersPerMonth: body.maxOrdersPerMonth, features: body.features || {}, isActive: body.isActive ?? true, sortOrder: body.sortOrder || 0 } });
  }
  updatePlan(id: string, body: any) { return this.prisma.plan.update({ where: { id }, data: body }); }


  reservedSubdomains(){ return this.prisma.reservedSubdomain.findMany({orderBy:[{locked:'desc'},{value:'asc'}]}); }
  async createReservedSubdomain(body:any){
    const value=String(body?.value||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'');
    if(value.length<2||value.length>63)throw new BadRequestException(apiError('superadmin.subdomain.invalid'));
    return this.prisma.reservedSubdomain.create({data:{value,reason:String(body?.reason||'').trim()||null,isActive:body?.isActive!==false,locked:false}});
  }
  async updateReservedSubdomain(id:string,body:any){
    const current=await this.prisma.reservedSubdomain.findUnique({where:{id}});if(!current)throw new NotFoundException(apiError('superadmin.subdomain.notFound'));
    const data:any={};
    if(body.reason!==undefined)data.reason=String(body.reason||'').trim()||null;
    if(body.isActive!==undefined){if(current.locked&&body.isActive===false)throw new BadRequestException(apiError('superadmin.subdomain.systemCannotDisable'));data.isActive=!!body.isActive;}
    return this.prisma.reservedSubdomain.update({where:{id},data});
  }
  async deleteReservedSubdomain(id:string){
    const current=await this.prisma.reservedSubdomain.findUnique({where:{id}});if(!current)throw new NotFoundException(apiError('superadmin.subdomain.notFound'));
    if(current.locked)throw new BadRequestException(apiError('superadmin.subdomain.systemCannotDelete'));
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

  private async marketRateState(){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'market_rates'}});
    const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    return {base:'TRY',source:'FRANKFURTER + GOLD API',updatedAt:value.updatedAt||null,rates:Array.isArray(value.rates)?value.rates:[]};
  }

  async currencyRates(){
    const state=await this.marketRateState();
    if(!state.rates.length) return this.refreshCurrencyRates({});
    return state;
  }

  async refreshCurrencyRates(_body:any){
    const settings:any=await this.platformSettings();
    const fiat:string[]=Array.from(new Set<string>((settings.currencies||[]).filter((x:any)=>x.isActive!==false).map((x:any)=>String(x.code||'').toUpperCase()).filter((x:string)=>x&&x!=='TRY'&&x!=='XAU')));
    const rates:any[]=[{code:'TRY',name:'Türk Lirası',symbol:'₺',valueInTry:1,kind:'FIAT'}];
    for(const code of fiat){
      try{const r=await fetch(`https://api.frankfurter.dev/v2/rate/${encodeURIComponent(code.toLowerCase())}/try`);if(!r.ok)continue;const j:any=await r.json();const n=Number(j.rate);if(n>0)rates.push({code,name:code,symbol:'',valueInTry:n,kind:'FIAT',date:j.date||null});}catch{}
    }
    try{
      const [g,usd]=await Promise.all([fetch('https://api.gold-api.com/price/XAU'),fetch('https://api.frankfurter.dev/v2/rate/usd/try')]);
      if(g.ok&&usd.ok){const gj:any=await g.json();const uj:any=await usd.json();const usdTry=Number(uj.rate);const ounceUsd=Number(gj.price);if(usdTry>0&&ounceUsd>0){rates.push({code:'XAU',name:'Altın (gram)',symbol:'gr',valueInTry:(ounceUsd*usdTry)/31.1034768,kind:'GOLD',ounceUsd,updatedAt:gj.updatedAt||null});}}
    }catch{}
    const value={base:'TRY',source:'FRANKFURTER + GOLD API',updatedAt:new Date().toISOString(),rates};
    await (this.prisma as any).platformSetting.upsert({where:{key:'market_rates'},create:{key:'market_rates',value},update:{value}});
    return value;
  }

  private defaultStoreSectors(){
    const rows=[
      ['flowers','Çiçek','Flowers','Blumen','Цветы'],['jewelry','Mücevher','Jewelry','Schmuck','Ювелирные изделия'],['fashion','Giyim','Fashion','Mode','Одежда'],['cosmetics','Kozmetik','Cosmetics','Kosmetik','Косметика'],['electronics','Elektronik','Electronics','Elektronik','Электроника'],['home-living','Ev & Yaşam','Home & Living','Haus & Wohnen','Дом и быт'],['food','Gıda & İçecek','Food & Beverage','Lebensmittel & Getränke','Еда и напитки'],['sports','Spor','Sports','Sport','Спорт'],['baby-kids','Anne & Bebek','Mother & Baby','Mutter & Baby','Мама и малыш'],['books','Kitap & Kırtasiye','Books & Stationery','Bücher & Schreibwaren','Книги и канцтовары'],['automotive','Otomotiv','Automotive','Automobil','Авто'],['health','Sağlık','Health','Gesundheit','Здоровье'],['pets','Pet','Pet Supplies','Tierbedarf','Товары для животных'],['hobby','Hobi & Hediye','Hobby & Gifts','Hobby & Geschenke','Хобби и подарки'],['other','Diğer','Other','Sonstiges','Другое']
    ];
    return rows.map((r:any[],i:number)=>({id:r[0],translations:{tr:{name:r[1],description:''},en:{name:r[2],description:''},de:{name:r[3],description:''},ru:{name:r[4],description:''}},isActive:true,sortOrder:i}));
  }

  async storeSectors(){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'store_sectors'}});const value:any=row?.value&&typeof row.value==='object'?row.value:{};
    return Array.isArray(value.sectors)&&value.sectors.length?value.sectors.sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)):this.defaultStoreSectors();
  }

  async updateStoreSectors(body:any){
    const sectors=(Array.isArray(body?.sectors)?body.sectors:[]).slice(0,300).map((x:any,i:number)=>({id:String(x.id||`sector-${i}`).trim(),translations:this.cleanTranslations(x.translations),isActive:x.isActive!==false,sortOrder:Number(x.sortOrder??i)})).filter((x:any)=>x.id);
    const value={sectors};await (this.prisma as any).platformSetting.upsert({where:{key:'store_sectors'},create:{key:'store_sectors',value},update:{value}});return sectors;
  }

  async storeMetadata(){
    const [sectors,team]=await Promise.all([this.storeSectors(),this.team()]);
    return {sectors,representatives:team.filter((x:any)=>x.isActive!==false&&x.isRepresentative)};
  }

  users(q?: string) {
    return this.prisma.user.findMany({ where: { memberships: { some: {} }, ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}) }, select: { id: true, email: true, name: true, createdAt: true, memberships: { include: { tenant: { select: { id: true, name: true } } } } }, orderBy: { createdAt: 'desc' } });
  }

  private defaultPlatformSettings(){
    return {
      company:{name:'Ticarti',legalName:'',email:'',phone:'',website:'',taxOffice:'',taxNumber:'',address:''},
      branding:{logoUrl:'',iconUrl:'',whiteLogoUrl:'',whiteIconUrl:''},
      locales:[{locale:'tr',label:'Türkçe',isActive:true,isDefault:true},{locale:'en',label:'English',isActive:true,isDefault:false}],
      currencies:[{code:'TRY',name:'Türk Lirası',symbol:'₺',isActive:true,isDefault:true},{code:'USD',name:'US Dollar',symbol:'$',isActive:true,isDefault:false},{code:'EUR',name:'Euro',symbol:'€',isActive:true,isDefault:false}],
      aiImage:{provider:'openai-compatible',baseUrl:'https://api.openai.com/v1',model:'gpt-image-1',apiKeyConfigured:false},
      aiServices:[
        {key:'text',label:'Metin ve asistan',enabled:true,provider:'openai-compatible',baseUrl:'https://api.openai.com/v1',model:'gpt-4.1-mini'},
        {key:'image',label:'Görsel üretimi',enabled:true,provider:'openai-compatible',baseUrl:'https://api.openai.com/v1',model:'gpt-image-1'},
        {key:'embedding',label:'Arama ve embedding',enabled:false,provider:'openai-compatible',baseUrl:'https://api.openai.com/v1',model:'text-embedding-3-small'},
        {key:'vision',label:'Görsel analiz',enabled:false,provider:'openai-compatible',baseUrl:'https://api.openai.com/v1',model:'gpt-4.1-mini'},
        {key:'speech-to-text',label:'Ses yazıya çevirme',enabled:false,provider:'openai-compatible',baseUrl:'https://api.openai.com/v1',model:'gpt-4o-mini-transcribe'},
        {key:'text-to-speech',label:'Ses sentezi',enabled:false,provider:'openai-compatible',baseUrl:'https://api.openai.com/v1',model:'gpt-4o-mini-tts'},
        {key:'moderation',label:'Güvenlik ve moderasyon',enabled:false,provider:'openai-compatible',baseUrl:'https://api.openai.com/v1',model:'omni-moderation-latest'},
        {key:'video',label:'Video üretimi',enabled:false,provider:'openai-compatible',baseUrl:'https://api.openai.com/v1',model:''}
      ]
    };
  }

  async platformSettings(){
    const row=await (this.prisma as any).platformSetting.findUnique({where:{key:'general'}});
    const base=this.defaultPlatformSettings();const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    const encrypted=(value.aiImage||{}).apiKeyEncrypted;
    return {...base,...value,company:{...base.company,...(value.company||{})},branding:{...base.branding,...(value.branding||{})},locales:Array.isArray(value.locales)&&value.locales.length?value.locales:base.locales,currencies:Array.isArray(value.currencies)&&value.currencies.length?value.currencies:base.currencies,aiImage:{...base.aiImage,...(value.aiImage||{}),apiKeyConfigured:!!encrypted,apiKeyEncrypted:undefined},aiServices:Array.isArray(value.aiServices)&&value.aiServices.length?value.aiServices:base.aiServices};
  }

  async updatePlatformSettings(body:any){
    const current=await this.platformSettings();
    const company={...current.company};for(const k of ['name','legalName','email','phone','website','taxOffice','taxNumber','address'])if(body?.company?.[k]!==undefined)company[k]=String(body.company[k]||'').trim();
    const branding={...current.branding};for(const k of ['logoUrl','iconUrl','whiteLogoUrl','whiteIconUrl'])if(body?.branding?.[k]!==undefined)branding[k]=String(body.branding[k]||'').trim();
    const locales=(Array.isArray(body?.locales)?body.locales:current.locales).slice(0,50).map((x:any,i:number)=>({locale:String(x.locale||x.code||'').trim(),label:String(x.label||x.name||x.locale||'').trim(),isActive:x.isActive!==false,isDefault:!!x.isDefault,sortOrder:Number(x.sortOrder??i)})).filter((x:any)=>x.locale);
    const currencies=(Array.isArray(body?.currencies)?body.currencies:current.currencies).slice(0,50).map((x:any,i:number)=>({code:String(x.code||'').trim().toUpperCase(),name:String(x.name||x.code||'').trim(),symbol:String(x.symbol||'').trim(),isActive:x.isActive!==false,isDefault:!!x.isDefault,sortOrder:Number(x.sortOrder??i)})).filter((x:any)=>x.code);
    if(locales.filter((x:any)=>x.isDefault).length!==1)throw new BadRequestException('Tam olarak bir varsayılan dil seçilmelidir');
    if(currencies.filter((x:any)=>x.isDefault).length!==1)throw new BadRequestException('Tam olarak bir varsayılan para birimi seçilmelidir');
    // Platform catalog invariants: never silently replace a removed/disabled default.
    const previousLocales=(current.locales||[]) as any[];
    const previousCurrencies=(current.currencies||[]) as any[];
    const previousLocaleDefault=previousLocales.find((x:any)=>x.isDefault)?.locale;
    const previousCurrencyDefault=previousCurrencies.find((x:any)=>x.isDefault)?.code;
    const explicitLocaleDefault=locales.find((x:any)=>x.isDefault);
    const explicitCurrencyDefault=currencies.find((x:any)=>x.isDefault);
    if(!explicitLocaleDefault||!explicitLocaleDefault.isActive)throw new BadRequestException('Aktif bir varsayılan dil seçilmelidir');
    if(!explicitCurrencyDefault||!explicitCurrencyDefault.isActive)throw new BadRequestException('Aktif bir varsayılan para birimi seçilmelidir');
    if(previousLocaleDefault&&!locales.some((x:any)=>x.locale===previousLocaleDefault)&&!locales.some((x:any)=>x.isDefault&&x.locale!==previousLocaleDefault))throw new BadRequestException('Varsayılan dil önce değiştirilmelidir');
    if(previousCurrencyDefault&&!currencies.some((x:any)=>x.code===previousCurrencyDefault)&&!currencies.some((x:any)=>x.isDefault&&x.code!==previousCurrencyDefault))throw new BadRequestException('Varsayılan para birimi önce değiştirilmelidir');
    if(new Set(locales.map((x:any)=>x.locale.toLowerCase())).size!==locales.length)throw new BadRequestException('Tekrarlanan dil kodu');
    if(new Set(currencies.map((x:any)=>x.code)).size!==currencies.length)throw new BadRequestException('Tekrarlanan para birimi kodu');
    // Catalog deletion must not orphan stores that already use the entry.
    const removedLocales=previousLocales.filter((x:any)=>!locales.some((y:any)=>y.locale===x.locale)).map((x:any)=>x.locale);
    const removedCurrencies=previousCurrencies.filter((x:any)=>!currencies.some((y:any)=>y.code===x.code)).map((x:any)=>x.code);
    if(removedLocales.length){const count=await this.prisma.tenant.count({where:{locale:{in:removedLocales}}});if(count)throw new BadRequestException('Mağazalarda kullanılan dil silinemez; pasife alınabilir');}
    if(removedCurrencies.length){const count=await this.prisma.tenant.count({where:{currency:{in:removedCurrencies}}});if(count)throw new BadRequestException('Mağazalarda kullanılan para birimi silinemez; pasife alınabilir');}
    if(!locales.some((x:any)=>x.isActive))throw new BadRequestException(apiError('superadmin.settings.activeLanguageRequired'));
    if(!currencies.some((x:any)=>x.isActive))throw new BadRequestException(apiError('superadmin.settings.activeCurrencyRequired'));
    let localeDefaultSeen=false;for(const x of locales){if(x.isDefault&&x.isActive&&!localeDefaultSeen)localeDefaultSeen=true;else x.isDefault=false;}if(!localeDefaultSeen){const x=locales.find((r:any)=>r.isActive);if(x)x.isDefault=true;}
    let currencyDefaultSeen=false;for(const x of currencies){if(x.isDefault&&x.isActive&&!currencyDefaultSeen)currencyDefaultSeen=true;else x.isDefault=false;}if(!currencyDefaultSeen){const x=currencies.find((r:any)=>r.isActive);if(x)x.isDefault=true;}
    const oldRow=await (this.prisma as any).platformSetting.findUnique({where:{key:'general'}});const previous:any=oldRow?.value?.aiImage||{};const incoming=body?.aiImage||{};const aiImage={provider:String(incoming.provider||previous.provider||'openai-compatible').slice(0,80),baseUrl:String(incoming.baseUrl||previous.baseUrl||'https://api.openai.com/v1').trim().slice(0,500).replace(/\/$/,''),model:String(incoming.model||previous.model||'gpt-image-1').trim().slice(0,120),apiKeyEncrypted:previous.apiKeyEncrypted||null};
    if(incoming.apiKey&&String(incoming.apiKey).trim()){const supplied=process.env.INTEGRATION_ENCRYPTION_KEY||'';if(process.env.NODE_ENV==='production'&&supplied.length<32)throw new BadRequestException(apiError('superadmin.ai.encryptionKeyRequired'));const key=createHash('sha256').update(supplied||process.env.JWT_SECRET||'development-only-key').digest();const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(String(incoming.apiKey).trim(),'utf8'),cipher.final()]);aiImage.apiKeyEncrypted={algorithm:'aes-256-gcm',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};}
    if(!/^https:\/\//i.test(aiImage.baseUrl))throw new BadRequestException(apiError('superadmin.ai.httpsRequired'));
    const incomingServices=Array.isArray(body?.aiServices)?body.aiServices:current.aiServices;
    const aiServices=incomingServices.slice(0,40).map((x:any,i:number)=>({key:String(x.key||`service-${i}`).trim().slice(0,80),label:String(x.label||x.key||`AI service ${i+1}`).trim().slice(0,120),enabled:x.enabled!==false,provider:String(x.provider||'openai-compatible').slice(0,80),baseUrl:String(x.baseUrl||'https://api.openai.com/v1').trim().replace(/\/$/,'').slice(0,500),model:String(x.model||'').trim().slice(0,160),secretConfigured:!!x.secretConfigured})).filter((x:any)=>x.key);
    const value={company,branding,locales,currencies,aiImage,aiServices};
    await (this.prisma as any).platformSetting.upsert({where:{key:'general'},create:{key:'general',value},update:{value}});
    return value;
  }

  async platformLocales(){
    const settings:any=await this.platformSettings();
    return (settings.locales||[]).filter((x:any)=>x.isActive!==false).sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)).map((x:any)=>({locale:String(x.locale),label:String(x.label||x.locale).trim()||String(x.locale).toUpperCase(),isDefault:!!x.isDefault}));
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
    const [permRow,profileRow]:any[]=await Promise.all([(this.prisma as any).platformSetting.findUnique({where:{key:'superadmin_team_permissions'}}),(this.prisma as any).platformSetting.findUnique({where:{key:'superadmin_team_profiles'}})]);
    const map:any=permRow?.value&&typeof permRow.value==='object'?permRow.value:{};const profiles:any=profileRow?.value&&typeof profileRow.value==='object'?profileRow.value:{};
    const rows:any[]=await this.prisma.superAdmin.findMany({orderBy:{createdAt:'asc'}});
    return rows.map(x=>{const profile:any=profiles[x.id]||{};return {id:x.id,email:x.email,name:x.name,isActive:x.isActive,lastLoginAt:x.lastLoginAt,createdAt:x.createdAt,permissions:Array.isArray(map[x.id])?map[x.id]:['dashboard','settings','memberships','plans','themes','apps','domains','currency','support','team'],roleLabel:Array.isArray(map[x.id])&&map[x.id].length<10?'Özel yetki':'Tam yetki',photoUrl:String(profile.photoUrl||''),phone:String(profile.phone||''),contactEmail:String(profile.contactEmail||x.email||''),isRepresentative:!!profile.isRepresentative};});
  }

  async createTeamMember(body:any){
    const email=String(body?.email||'').trim().toLowerCase();const password=String(body?.password||'');if(!email||password.length<8)throw new BadRequestException(apiError('superadmin.user.emailPasswordRequired'));
    const admin=await this.prisma.superAdmin.create({data:{email,name:String(body?.name||'').trim()||null,passwordHash:await bcrypt.hash(password,14),isActive:body?.isActive!==false}});
    await this.saveTeamPermissions(admin.id,body?.permissions);await this.saveTeamProfile(admin.id,body);return (await this.team()).find((x:any)=>x.id===admin.id);
  }

  async updateTeamMember(id:string,body:any){
    const current=await this.prisma.superAdmin.findUnique({where:{id}});if(!current)throw new NotFoundException(apiError('superadmin.user.notFound'));
    const data:any={};if(body.name!==undefined)data.name=String(body.name||'').trim()||null;if(body.email!==undefined)data.email=String(body.email||'').trim().toLowerCase();if(body.isActive!==undefined)data.isActive=!!body.isActive;if(body.password){if(String(body.password).length<8)throw new BadRequestException(apiError('superadmin.user.passwordMin'));data.passwordHash=await bcrypt.hash(String(body.password),14);data.passwordChangedAt=new Date();}
    await this.prisma.superAdmin.update({where:{id},data});if(body.permissions!==undefined)await this.saveTeamPermissions(id,body.permissions);await this.saveTeamProfile(id,body);return (await this.team()).find((x:any)=>x.id===id);
  }


  private async saveTeamProfile(id:string,body:any){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'superadmin_team_profiles'}});const value:any=row?.value&&typeof row.value==='object'?{...row.value}:{};const current:any=value[id]||{};
    value[id]={...current,...(body.photoUrl!==undefined?{photoUrl:String(body.photoUrl||'').trim()}:{}),...(body.phone!==undefined?{phone:String(body.phone||'').trim()}:{}),...(body.contactEmail!==undefined?{contactEmail:String(body.contactEmail||'').trim().toLowerCase()}:{}),...(body.isRepresentative!==undefined?{isRepresentative:!!body.isRepresentative}:{})};
    await (this.prisma as any).platformSetting.upsert({where:{key:'superadmin_team_profiles'},create:{key:'superadmin_team_profiles',value},update:{value}});
  }
  private async saveTeamPermissions(id:string,permissions:any){
    const allowed=['dashboard','settings','memberships','plans','themes','apps','domains','currency','support','team'];const perms=Array.isArray(permissions)?permissions.map(String).filter((x:string)=>allowed.includes(x)):[];
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'superadmin_team_permissions'}});const value:any=row?.value&&typeof row.value==='object'?{...row.value}:{};value[id]=perms;await (this.prisma as any).platformSetting.upsert({where:{key:'superadmin_team_permissions'},create:{key:'superadmin_team_permissions',value},update:{value}});
  }

  async apps(){
    return this.prisma.appDefinition.findMany({include:{planPrices:{include:{plan:true},orderBy:{createdAt:'asc'}},_count:{select:{installs:true}}},orderBy:[{sortOrder:'asc'},{name:'asc'}]});
  }

  inspectAppPackage(file:any){if(!file?.buffer)throw new BadRequestException('ZIP modül paketi zorunlu');const parsed=parseAppPackage(file.buffer);return{ok:true,manifest:parsed.manifest,files:parsed.files};}
  async importAppPackage(file:any){if(!file?.buffer)throw new BadRequestException('ZIP modül paketi zorunlu');const parsed:any=parseAppPackage(file.buffer);const m:any=parsed.manifest;if(m.trust==='THIRD_PARTY')throw new BadRequestException('3. taraf modüller dev.ticarti.com Developer Portal üzerinden yüklenmelidir');const upload=async(asset:any,label:string)=>asset?.data?this.media.platformUpload({mimeType:asset.mime,fileName:`${m.slug}-${label}`,dataBase64:asset.data.toString('base64'),alt:`${m.name} ${label}`}):null;const iconAsset=await upload(parsed.visuals?.icon,'icon');const previewAsset=await upload(parsed.visuals?.preview,'preview');const shotAssets=[];for(const [i,a] of (parsed.visuals?.screenshots||[]).entries()){const x=await upload(a,`screenshot-${i+1}`);if(x)shotAssets.push(x.publicUrl)}const settingsSchema:any={manifest:m,marketplace:{logoUrl:iconAsset?.publicUrl||m.icon||null,previewImageUrl:previewAsset?.publicUrl||m.previewImageUrl||null,usageGuide:m.usageGuide||null,screenshots:shotAssets.length?shotAssets:(Array.isArray(m.screenshots)?m.screenshots:[]),translations:m.i18n||{},categoryId:''},settings:m.settings||{},package:{format:m.format,schemaVersion:m.schemaVersion,importedAt:new Date().toISOString(),files:parsed.files,trust:m.trust,runtime:m.runtime}};const app=await this.prisma.appDefinition.upsert({where:{slug:m.slug},create:{slug:m.slug,name:m.name,category:String(m.category||'Diğer'),summary:String(m.summary||m.name),description:m.description?String(m.description):null,icon:(iconAsset?.publicUrl||m.icon)?String(iconAsset?.publicUrl||m.icon):null,developer:String(m.developer||'Ticarti'),kind:String(m.kind||'INTEGRATION'),integrationType:m.integrationType as any,provider:m.provider||null,settingsSchema,basePrice:Number(m.basePrice||0),currency:String(m.currency||'TRY'),billingType:String(m.billingType||'FREE'),trialDays:Math.max(0,Number(m.trialDays||0)),isActive:m.isActive!==false,isFeatured:!!m.isFeatured,sortOrder:Number(m.sortOrder||0)},update:{name:m.name,category:String(m.category||'Diğer'),summary:String(m.summary||m.name),description:m.description?String(m.description):null,icon:(iconAsset?.publicUrl||m.icon)?String(iconAsset?.publicUrl||m.icon):null,developer:String(m.developer||'Ticarti'),kind:String(m.kind||'INTEGRATION'),integrationType:m.integrationType as any,provider:m.provider||null,settingsSchema,isActive:m.isActive!==false}});await this.prisma.appVersion.updateMany({where:{appId:app.id,isCurrent:true},data:{isCurrent:false}});const existing=await this.prisma.appVersion.findUnique({where:{appId_version:{appId:app.id,version:m.version}}});const scopes=(Array.isArray(m.scopes)?m.scopes:[]).map((x:any)=>typeof x==='string'?{scope:x,required:true}:{scope:String(x.name||x.scope||''),required:x.required!==false}).filter((x:any)=>x.scope);let version:any;if(existing){await this.prisma.appVersionScope.deleteMany({where:{appVersionId:existing.id}});version=await this.prisma.appVersion.update({where:{id:existing.id},data:{manifest:m,status:'PUBLISHED',isCurrent:true,publishedAt:new Date(),scopes:{create:scopes}}});}else version=await this.prisma.appVersion.create({data:{appId:app.id,version:m.version,manifest:m,status:'PUBLISHED',isCurrent:true,publishedAt:new Date(),scopes:{create:scopes}}});await this.extensions.syncVersion(version.id,m);return{ok:true,app,version,manifest:m,visuals:{iconUrl:iconAsset?.publicUrl||null,previewImageUrl:previewAsset?.publicUrl||null,screenshots:shotAssets}};}

  async appWorkspace(){
    const [items,plans,settings,categories,locales]=await Promise.all([this.apps(),this.plans(),this.platformSettings(),this.appCategories(),this.platformLocales()]);
    return {items,plans,locales,currencies:(settings.currencies||[]).filter((x:any)=>x.isActive!==false),categories};
  }

  private appMarketplaceMeta(body:any){
    const screenshots=Array.isArray(body.screenshots)?body.screenshots.map((x:any)=>String(x).trim()).filter(Boolean):String(body.screenshots||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const translations:any={};const rawTranslations=body?.translations&&typeof body.translations==='object'&&!Array.isArray(body.translations)?body.translations:{};
    for(const [locale,row] of Object.entries(rawTranslations)){const r:any=row||{};translations[String(locale)]={name:String(r.name||'').trim(),summary:String(r.summary||'').trim(),description:String(r.description||'').trim(),usageGuide:String(r.usageGuide||'').trim()};}
    return {logoUrl:String(body.logoUrl||'').trim()||null,previewImageUrl:String(body.previewImageUrl||'').trim()||null,usageGuide:String(body.usageGuide||'').trim()||null,screenshots,translations,categoryId:String(body.categoryId||'').trim(),planTrials:body.planTrials&&typeof body.planTrials==='object'?body.planTrials:{}};
  }

  createApp(body:any){
    const slug=String(body.slug||'').trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
    if(!slug||!body.name) throw new BadRequestException('App name and slug are required');
    const baseSchema=body.settingsSchema&&typeof body.settingsSchema==='object'&&!Array.isArray(body.settingsSchema)?body.settingsSchema:{};
    const settingsSchema={...baseSchema,marketplace:this.appMarketplaceMeta(body)};
    return this.prisma.appDefinition.create({data:{slug,name:String(body.name),category:String(body.category||'Diğer'),summary:String(body.summary||body.name),description:body.description?String(body.description):null,icon:body.icon?String(body.icon):null,developer:String(body.developer||'WE DID IT'),kind:String(body.kind||'INTEGRATION'),integrationType:body.integrationType||null,provider:body.provider?String(body.provider):null,settingsSchema:settingsSchema as any,basePrice:Number(body.basePrice||0),currency:String(body.currency||'TRY'),billingType:String(body.billingType||'FREE'),trialDays:Math.max(0,Number(body.trialDays||0)),gracePeriodDays:Math.max(0,Number(body.gracePeriodDays??3)),includedUnits:Math.max(0,Number(body.includedUnits||0)),usageMetric:body.usageMetric?String(body.usageMetric):null,usageUnitPrice:body.usageUnitPrice===undefined||body.usageUnitPrice===null||body.usageUnitPrice===''?null:Number(body.usageUnitPrice),isActive:body.isActive!==false,isFeatured:!!body.isFeatured,sortOrder:Number(body.sortOrder||0)}});
  }

  async updateApp(id:string,body:any){
    const current=await this.prisma.appDefinition.findUnique({where:{id}});
    if(!current)throw new NotFoundException('App not found');
    const data:any={};
    for(const k of ['name','category','summary','description','icon','developer','kind','provider','currency','billingType','usageMetric']) if(body[k]!==undefined)data[k]=body[k];
    if(body.integrationType!==undefined)data.integrationType=body.integrationType||null;
    if(body.settingsSchema!==undefined)data.settingsSchema=body.settingsSchema;
    if(['logoUrl','usageGuide','screenshots','translations','categoryId','planTrials'].some(k=>body[k]!==undefined)){
      const currentSchema:any=current.settingsSchema&&typeof current.settingsSchema==='object'&&!Array.isArray(current.settingsSchema)?current.settingsSchema:{};
      data.settingsSchema={...currentSchema,marketplace:{...(currentSchema.marketplace||{}),...this.appMarketplaceMeta({...currentSchema.marketplace,...body})}};
    }
    for(const k of ['isActive','isFeatured']) if(body[k]!==undefined)data[k]=!!body[k];
    if(body.basePrice!==undefined)data.basePrice=Number(body.basePrice||0);
    if(body.trialDays!==undefined)data.trialDays=Math.max(0,Number(body.trialDays||0));
    if(body.gracePeriodDays!==undefined)data.gracePeriodDays=Math.max(0,Number(body.gracePeriodDays||0));
    if(body.includedUnits!==undefined)data.includedUnits=Math.max(0,Number(body.includedUnits||0));
    if(body.usageUnitPrice!==undefined)data.usageUnitPrice=body.usageUnitPrice===null||body.usageUnitPrice===''?null:Number(body.usageUnitPrice);
    if(body.sortOrder!==undefined)data.sortOrder=Number(body.sortOrder||0);
    return this.prisma.appDefinition.update({where:{id},data});
  }

  async setAppPlanPricing(appId:string,body:any){
    if(!body.planId)throw new NotFoundException('Plan is required');
    const planId=String(body.planId);
    const pricingData:any={price:body.price===''||body.price===null||body.price===undefined?null:Number(body.price),currency:body.currency?String(body.currency):null,billingType:body.billingType?String(body.billingType):null,trialDays:body.trialDays===undefined?null:Math.max(0,Number(body.trialDays||0)),gracePeriodDays:body.gracePeriodDays===undefined?null:Math.max(0,Number(body.gracePeriodDays||0)),includedUnits:body.includedUnits===undefined?null:Math.max(0,Number(body.includedUnits||0)),usageMetric:body.usageMetric?String(body.usageMetric):null,usageUnitPrice:body.usageUnitPrice===''||body.usageUnitPrice===null||body.usageUnitPrice===undefined?null:Number(body.usageUnitPrice),usageLimit:body.usageLimit===''||body.usageLimit===null||body.usageLimit===undefined?null:Math.max(0,Number(body.usageLimit)),maxCharge:body.maxCharge===''||body.maxCharge===null||body.maxCharge===undefined?null:Number(body.maxCharge),included:!!body.included,isActive:body.isActive!==false};
    const result=await this.prisma.appPlanPrice.upsert({where:{appId_planId:{appId,planId}},create:{appId,planId,...pricingData},update:pricingData});
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

  async themes(){
    const rows:any[]=await this.prisma.themeDefinition.findMany({include:{planPrices:{include:{plan:true},orderBy:{createdAt:'asc'}},_count:{select:{installations:true}}},orderBy:[{sortOrder:'asc'},{name:'asc'}]});
    return rows.filter((x:any)=>x?.config&&typeof x.config==='object'&&!Array.isArray(x.config)&&String((x.config as any).format||'')==='ticarti-theme-package');
  }
  async themeCategories(){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'theme_categories'}});
    const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    return Array.isArray(value.categories)?value.categories.sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)):[];
  }
  async updateThemeCategories(body:any){
    const categories=(Array.isArray(body?.categories)?body.categories:[]).slice(0,200).map((x:any,i:number)=>({id:String(x.id||`theme-cat-${i}`).trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,''),translations:this.cleanTranslations(x.translations),sortOrder:Number(x.sortOrder??i),isActive:x.isActive!==false})).filter((x:any)=>x.id);
    const value={categories};await (this.prisma as any).platformSetting.upsert({where:{key:'theme_categories'},create:{key:'theme_categories',value},update:{value}});return categories;
  }
  inspectThemePackage(file:any){if(!file?.buffer||!file?.size)throw new BadRequestException(apiError('superadmin.theme.zipRequired'));if(file.size>30*1024*1024)throw new BadRequestException(apiError('superadmin.theme.zipTooLarge'));const parsed=parseThemePackage(file.buffer);return {manifest:parsed.manifest,summary:parsed.summary,fileName:String(file.originalname||''),size:file.size};}
  async importThemePackage(file:any,body:any){
    if(!file?.buffer||!file?.size)throw new BadRequestException(apiError('superadmin.theme.zipRequired'));
    if(file.size>30*1024*1024)throw new BadRequestException(apiError('superadmin.theme.zipTooLarge'));
    const parsed=parseThemePackage(file.buffer);const m:any=parsed.manifest;const uploadThemeVisual=async(asset:any,label:string)=>asset?.data?this.media.platformUpload({mimeType:asset.mime,fileName:`${m.slug||'theme'}-${label}`,dataBase64:asset.data.toString('base64'),alt:`${m.name||'Theme'} ${label}`}):null;const themePackIcon=await uploadThemeVisual((parsed as any).visuals?.icon,'icon');const themePackPreview=await uploadThemeVisual((parsed as any).visuals?.preview,'preview');const themePackScreenshots:string[]=[];for(const[i,a]of(((parsed as any).visuals?.screenshots)||[]).entries()){const x=await uploadThemeVisual(a,`screenshot-${i+1}`);if(x?.publicUrl)themePackScreenshots.push(x.publicUrl)}
    const slug=String(body?.slug||m.slug||m.id||'').trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
    if(!slug)throw new BadRequestException(apiError('superadmin.theme.slugRequired'));
    let translations:any={};try{translations=body?.translations?JSON.parse(String(body.translations)):{} }catch{throw new BadRequestException(apiError('superadmin.theme.translationsInvalidJson'))}
    if(!translations||typeof translations!=='object'||Array.isArray(translations))translations={};
    const locales:any[]=await this.platformLocales();const def=String(locales.find((x:any)=>x.isDefault)?.locale||locales[0]?.locale||'tr');
    const tr:any=translations[def]||Object.values(translations).find((x:any)=>x?.name)||{};
    const name=String(tr?.name||body?.name||m.name||slug).trim();if(!name)throw new BadRequestException(apiError('superadmin.theme.nameRequired'));
    const description=String(tr?.description||body?.description||'').trim()||null;
    const categoryId=String(body?.categoryId||body?.category||'').trim();
    const version=String(body?.version||m.version||'1.0.0');const sha256=createHash('sha256').update(file.buffer).digest('hex');const storageKey=`platform/themes/${slug}/${version}/${sha256.slice(0,16)}.theme.zip`;await this.storeThemeZip(storageKey,file.buffer);
    let planPricing:any[]=[];try{planPricing=body?.planPricing?JSON.parse(String(body.planPricing)):[]}catch{throw new BadRequestException(apiError('superadmin.theme.pricingInvalidJson'))}
    if(!Array.isArray(planPricing))throw new BadRequestException(apiError('superadmin.theme.pricingArrayRequired'));
    let screenshots:any[]=[];try{screenshots=body?.screenshots?JSON.parse(String(body.screenshots)):[]}catch{throw new BadRequestException(apiError('superadmin.theme.screenshotsInvalidJson'))}if(!Array.isArray(screenshots))screenshots=[];
    const existing:any=await this.prisma.themeDefinition.findUnique({where:{slug}});
    const previousConfig:any=existing?.config&&typeof existing.config==='object'&&!Array.isArray(existing.config)?existing.config:{};
    const previousHistory:any[]=Array.isArray(previousConfig.versionHistory)?previousConfig.versionHistory:[];
    const previousCurrent=existing&&previousConfig?.package?{version:String(existing.version||previousConfig?.manifest?.version||'1.0.0'),package:previousConfig.package,manifest:previousConfig.manifest||{},summary:previousConfig.summary||{},archivedAt:new Date().toISOString()}:null;
    const versionHistory=[...previousHistory,...(previousCurrent?[previousCurrent]:[])].filter((row:any,index:number,all:any[])=>{const key=String(row?.package?.sha256||'')+'|'+String(row?.version||'');return key!=='|'&&all.findIndex((x:any)=>String(x?.package?.sha256||'')+'|'+String(x?.version||'')===key)===index;}).slice(-30);
    const imported={format:'ticarti-theme-package',formatVersion:1,engine:String(m.engine||'ticarti-native'),package:{storageKey,sha256,originalName:String(file.originalname||`${slug}.theme.zip`),size:file.size,importedAt:new Date().toISOString()},manifest:{...m,slug},design:parsed.design,sections:parsed.sections,pages:parsed.pages,modules:parsed.modules,assets:parsed.assets,editor:parsed.editor,layouts:parsed.layouts,styles:parsed.styles,settingsSchema:parsed.settingsSchema,settingsData:parsed.settingsData||{},groups:parsed.groups||{},blockSchemas:parsed.blockSchemas||[],sectionSchemas:parsed.sectionSchemas||[],demo:parsed.demo||{},source:parsed.source||{},summary:parsed.summary,catalog:{screenshots:(screenshots.length?screenshots.map(String).slice(0,24):themePackScreenshots),translations,categoryId,iconUrl:themePackIcon?.publicUrl||null,previewImageUrl:themePackPreview?.publicUrl||null},versionHistory};
    const data:any={name,description,category:categoryId||'GENEL',previewImageUrl:body?.previewImageUrl?String(body.previewImageUrl):(themePackPreview?.publicUrl||null),version,basePrice:Number(body?.basePrice||0),currency:String(body?.currency||'TRY'),billingType:String(body?.billingType||'ONE_TIME'),isActive:String(body?.isActive??'true')!=='false',isFeatured:String(body?.isFeatured??'false')==='true',config:imported};
    let theme:any=existing;theme=theme?await this.prisma.themeDefinition.update({where:{id:theme.id},data}):await this.prisma.themeDefinition.create({data:{slug,...data}});
    for(const row of planPricing){if(!row?.planId)continue;await this.prisma.themePlanPrice.upsert({where:{themeId_planId:{themeId:theme.id,planId:String(row.planId)}},create:{themeId:theme.id,planId:String(row.planId),price:row.price===''||row.price==null?null:Number(row.price),currency:String(row.currency||data.currency),included:!!row.included,isActive:row.enabled!==false},update:{price:row.price===''||row.price==null?null:Number(row.price),currency:String(row.currency||data.currency),included:!!row.included,isActive:row.enabled!==false}});}
    return this.prisma.themeDefinition.findUnique({where:{id:theme.id},include:{planPrices:{include:{plan:true}},_count:{select:{installations:true}}}});
  }
  createTheme(body:any){
    const slug=String(body.slug||body.name||'').trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
    if(!slug||!body.name)throw new BadRequestException(apiError('superadmin.theme.nameSlugRequired'));
    return this.prisma.themeDefinition.create({data:{slug,name:String(body.name),description:body.description?String(body.description):null,category:String(body.category||'GENEL'),previewImageUrl:body.previewImageUrl?String(body.previewImageUrl):null,version:String(body.version||'1.0.0'),basePrice:Number(body.basePrice||0),currency:String(body.currency||'TRY'),billingType:String(body.billingType||'ONE_TIME'),isActive:body.isActive!==false,isFeatured:!!body.isFeatured,isDefault:!!body.isDefault,sortOrder:Number(body.sortOrder||0),config:body.config||{}}});
  }
  async updateTheme(id:string,body:any){
    const current:any=await this.prisma.themeDefinition.findUnique({where:{id}});if(!current)throw new NotFoundException(apiError('theme.notFound'));
    const data:any={};for(const k of ['previewImageUrl','version','currency','billingType'])if(body[k]!==undefined)data[k]=body[k]||null;
    for(const k of ['isActive','isFeatured','isDefault'])if(body[k]!==undefined)data[k]=!!body[k];
    for(const k of ['basePrice','sortOrder'])if(body[k]!==undefined)data[k]=Number(body[k]||0);
    const cfg:any=current.config&&typeof current.config==='object'&&!Array.isArray(current.config)?current.config:{};const catalog:any=cfg.catalog&&typeof cfg.catalog==='object'&&!Array.isArray(cfg.catalog)?cfg.catalog:{};
    const translations:any=body.translations&&typeof body.translations==='object'&&!Array.isArray(body.translations)?body.translations:catalog.translations||{};
    const locales:any[]=await this.platformLocales();const def=String(locales.find((x:any)=>x.isDefault)?.locale||locales[0]?.locale||'tr');const tr:any=translations[def]||Object.values(translations).find((x:any)=>x?.name)||{};
    if(body.translations!==undefined){data.name=String(tr?.name||current.name).trim()||current.name;data.description=String(tr?.description||'').trim()||null;}
    const categoryId=body.categoryId!==undefined?String(body.categoryId||'').trim():String(catalog.categoryId||current.category||'').trim();if(body.categoryId!==undefined)data.category=categoryId||'GENEL';
    const iconUrl=body.iconUrl!==undefined?(String(body.iconUrl||'').trim()||null):(catalog.iconUrl||null);const screenshots=body.screenshots!==undefined?(Array.isArray(body.screenshots)?body.screenshots.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,24):[]):(Array.isArray(catalog.screenshots)?catalog.screenshots:[]);
    data.config={...cfg,catalog:{...catalog,translations,categoryId,iconUrl,screenshots}};
    if(body.config!==undefined)data.config=body.config;
    if(body.isDefault===true)await this.prisma.themeDefinition.updateMany({where:{id:{not:id}},data:{isDefault:false}});
    return this.prisma.themeDefinition.update({where:{id},data});
  }
  async deleteTheme(id:string){
    const theme:any=await this.prisma.themeDefinition.findUnique({where:{id},include:{_count:{select:{installations:true}}}});
    if(!theme)throw new NotFoundException(apiError('theme.notFound'));
    const installed=Number(theme?._count?.installations||0);
    if(installed>0)throw new BadRequestException(apiError('superadmin.theme.inUse',{count:installed}));
    await this.prisma.$transaction([
      this.prisma.themePlanPrice.deleteMany({where:{themeId:id}}),
      this.prisma.themeDefinition.delete({where:{id}})
    ]);
    return {ok:true,id,slug:theme.slug};
  }

  setThemePlanPricing(themeId:string,body:any){
    if(!body.planId)throw new BadRequestException(apiError('superadmin.plan.required'));
    return this.prisma.themePlanPrice.upsert({where:{themeId_planId:{themeId,planId:String(body.planId)}},create:{themeId,planId:String(body.planId),price:body.price===''||body.price===null||body.price===undefined?null:Number(body.price),currency:body.currency?String(body.currency):null,included:!!body.included,isActive:body.isActive!==false},update:{price:body.price===''||body.price===null||body.price===undefined?null:Number(body.price),currency:body.currency?String(body.currency):null,included:!!body.included,isActive:body.isActive!==false}});
  }
  async grantTheme(tenantId:string,themeId:string){
    const [tenant,theme]=await Promise.all([this.prisma.tenant.findUnique({where:{id:tenantId}}),this.prisma.themeDefinition.findUnique({where:{id:themeId}})]);if(!tenant||!theme)throw new NotFoundException(apiError('superadmin.theme.storeOrThemeNotFound'));
    return this.prisma.themeInstallation.upsert({where:{tenantId_themeId:{tenantId,themeId}},create:{tenantId,themeId,status:'ACTIVE',source:'SUPERADMIN',purchasedPrice:0,currency:theme.currency,activatedAt:null},update:{status:'ACTIVE',source:'SUPERADMIN'}});
  }







  async toggleThemeModule(themeId:string,body:any){
    const theme=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException(apiError('theme.notFound'));
    const config:any=theme.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};const modules=Array.isArray(config.modules)?config.modules:[];const type=String(body.type||'').trim();if(!type)throw new BadRequestException(apiError('superadmin.theme.moduleTypeRequired'));
    let found=false;const next=modules.map((m:any)=>{if(String(m.type)===type){found=true;return{...m,enabled:body.enabled!==false}}return m});if(!found)next.push({type,label:String(body.label||type),enabled:body.enabled!==false});
    return this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,modules:next}}});
  }



  private themeConfig(theme:any){return theme?.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};}
  private cleanTranslations(value:any){const out:any={};if(value&&typeof value==='object'&&!Array.isArray(value))for(const [locale,row] of Object.entries(value)){if(!row||typeof row!=='object'||Array.isArray(row))continue;const r:any=row;const clean:any={};for(const key of ['name','description','summary'])if(r[key]!==undefined&&String(r[key]).trim())clean[key]=String(r[key]);if(Object.keys(clean).length)out[String(locale)]=clean;}return out;}
  async themeWorkspace(themeId:string){
    const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId},include:{planPrices:{include:{plan:true}}}});
    if(!theme)throw new NotFoundException(apiError('theme.notFound'));
    const config:any=this.themeConfig(theme);const moduleCatalog:any=config.moduleCatalog||{};
    const declared=Array.isArray(config.modules)?config.modules:[];
    const types:string[]=Array.from(new Set<string>(declared.map((x:any)=>String(x.type||'')).filter((x:string)=>Boolean(x))));
    const modules=types.map((type:string)=>{const meta:any=moduleCatalog[type]||{};const base:any=declared.find((x:any)=>String(x.type)===type)||{};return {type,name:meta.name||base.label||type,translations:meta.translations||{},screenshots:Array.isArray(meta.screenshots)?meta.screenshots:[],planPricing:Array.isArray(meta.planPricing)?meta.planPricing:[],isActive:meta.isActive!==false&&base.enabled!==false};});
    const moduleCategories=(Array.isArray(config.moduleCategories)?config.moduleCategories:(Array.isArray(config.moduleGroups)?config.moduleGroups:[])).sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0));
    return {theme:{id:theme.id,name:theme.name,slug:theme.slug,version:theme.version},moduleCategories,moduleGroups:moduleCategories,modules};
  }
  async updateThemeWorkspaceGroups(themeId:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException(apiError('theme.notFound'));const config:any=this.themeConfig(theme);const normalize=(rows:any)=>Array.isArray(rows)?rows.slice(0,200).map((x:any,i:number)=>({id:String(x.id||`category-${i}`),translations:this.cleanTranslations(x.translations),sortOrder:Number(x.sortOrder??i),isActive:x.isActive!==false})):[];const next={...config};const categories=body.moduleCategories!==undefined?body.moduleCategories:body.moduleGroups;if(categories!==undefined){next.moduleCategories=normalize(categories);next.moduleGroups=next.moduleCategories;}await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:next}});return this.themeWorkspace(themeId);}



  async updateThemeModuleCatalog(themeId:string,typeValue:string,body:any){const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException(apiError('theme.notFound'));const type=String(typeValue||'').trim();if(!type)throw new BadRequestException(apiError('superadmin.theme.moduleTypeRequired'));const config:any=this.themeConfig(theme);const moduleCatalog:any={...(config.moduleCatalog||{})};const current:any=moduleCatalog[type]||{};moduleCatalog[type]={...current,name:body.name!==undefined?String(body.name):current.name,categoryId:'',groupId:'',translations:body.translations!==undefined?this.cleanTranslations(body.translations):current.translations,screenshots:Array.isArray(body.screenshots)?body.screenshots.map(String).slice(0,24):current.screenshots,planPricing:Array.isArray(body.planPricing)?body.planPricing.map((x:any)=>({planId:String(x.planId),enabled:x.enabled!==false,included:!!x.included,price:x.price===''||x.price===null||x.price===undefined?null:Number(x.price),currency:String(x.currency||'TRY'),trialDays:Math.max(0,Number(x.trialDays||0))})):current.planPricing,isActive:body.isActive!==undefined?!!body.isActive:current.isActive};await this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,moduleCatalog}}});return this.themeWorkspace(themeId);}

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


  async liveOrders(limitValue:unknown=60){
    const limit=Math.max(10,Math.min(200,Number(limitValue)||60));
    const rows=await this.prisma.order.findMany({
      orderBy:{createdAt:'desc'},take:limit,
      select:{id:true,number:true,status:true,paymentStatus:true,fulfillmentStatus:true,source:true,currency:true,grandTotal:true,createdAt:true,shippingAddress:true,metadata:true,store:{select:{id:true,name:true,slug:true,publicSlug:true,domain:true}}}
    });
    return rows.map(o=>{
      const address=(o.shippingAddress&&typeof o.shippingAddress==='object'&&!Array.isArray(o.shippingAddress)?o.shippingAddress:{}) as Record<string,unknown>;
      const metadata=(o.metadata&&typeof o.metadata==='object'&&!Array.isArray(o.metadata)?o.metadata:{}) as Record<string,unknown>;
      return {id:o.id,number:o.number,status:o.status,paymentStatus:o.paymentStatus,fulfillmentStatus:o.fulfillmentStatus,source:o.source||'storefront',currency:o.currency,grandTotal:Number(o.grandTotal||0),createdAt:o.createdAt,store:o.store,city:String(address.city||''),country:String(address.country||''),sourceDetail:String(metadata.sourceHost||metadata.host||metadata.domain||o.store?.domain||o.store?.publicSlug||o.store?.slug||'')};
    });
  }

  private defaultPlatformContent(){
    return {
      contracts:[],blog:[],pages:[],
      marketing:{
        home:{seo:{},blocks:[
          {id:'home-announcement',type:'announcement',enabled:true,sortOrder:0,translations:{},settings:{}},
          {id:'home-hero',type:'hero',enabled:true,sortOrder:10,translations:{},settings:{}},
          {id:'home-orders',type:'orders',enabled:true,sortOrder:20,translations:{},settings:{}},
          {id:'home-features',type:'features',enabled:true,sortOrder:30,translations:{},settings:{}},
          {id:'home-integrations',type:'integrations',enabled:true,sortOrder:40,translations:{},settings:{}},
          {id:'home-success-stories',type:'successStories',enabled:true,sortOrder:50,translations:{},settings:{}},
          {id:'home-blog',type:'blog',enabled:true,sortOrder:60,translations:{},settings:{}},
          {id:'home-faq',type:'faq',enabled:true,sortOrder:70,translations:{},settings:{}},
          {id:'home-footer-cta',type:'footerCta',enabled:true,sortOrder:80,translations:{},settings:{}}
        ]},
        login:{seo:{},blocks:[
          {id:'login-intro',type:'intro',enabled:true,sortOrder:0,translations:{},settings:{}},
          {id:'login-social',type:'socialAuth',enabled:true,sortOrder:10,translations:{},settings:{}},
          {id:'login-credentials',type:'credentials',enabled:true,sortOrder:20,translations:{},settings:{}},
          {id:'login-support',type:'support',enabled:true,sortOrder:30,translations:{},settings:{}}
        ]},
        register:{seo:{},blocks:[
          {id:'register-account',type:'account',enabled:true,sortOrder:0,translations:{},settings:{}},
          {id:'register-package',type:'package',enabled:true,sortOrder:10,translations:{},settings:{}},
          {id:'register-sector',type:'sector',enabled:true,sortOrder:20,translations:{},settings:{}},
          {id:'register-store',type:'store',enabled:true,sortOrder:30,translations:{},settings:{}},
          {id:'register-domain',type:'domain',enabled:true,sortOrder:40,translations:{},settings:{}},
          {id:'register-summary',type:'summary',enabled:true,sortOrder:50,translations:{},settings:{}},
          {id:'register-payment',type:'payment',enabled:true,sortOrder:60,translations:{},settings:{}}
        ]}
      }
    };
  }

  async platformContent(){
    const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'platform_content'}});
    const value:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{};
    const settings:any=await this.platformSettings();
    const configured=Array.isArray(settings.locales)?settings.locales:[];
    const locales=configured.filter((x:any)=>x.isActive!==false).sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)).map((x:any)=>({locale:String(x.locale||'').trim(),label:String(x.label||x.locale||'').trim(),isDefault:!!x.isDefault})).filter((x:any)=>x.locale);
    const defaults=this.defaultPlatformContent();
    const incomingMarketing=value.marketing&&typeof value.marketing==='object'&&!Array.isArray(value.marketing)?value.marketing:{};
    const marketing:any={};
    for(const key of ['home','login','register']){const base=(defaults.marketing as any)[key];const row=(incomingMarketing as any)[key]&&typeof (incomingMarketing as any)[key]==='object'?(incomingMarketing as any)[key]:{};marketing[key]={seo:row.seo&&typeof row.seo==='object'?row.seo:{},blocks:Array.isArray(row.blocks)&&row.blocks.length?row.blocks:base.blocks};}
    return {contracts:Array.isArray(value.contracts)?value.contracts:[],blog:Array.isArray(value.blog)?value.blog:[],pages:Array.isArray(value.pages)?value.pages:[],marketing,locales};
  }

  async updatePlatformContent(body:any){
    const current:any=await this.platformContent();
    const cleanRows=(value:any,kind:'contracts'|'blog'|'pages')=>(Array.isArray(value)?value:current[kind]).slice(0,500).map((x:any,i:number)=>({
      id:String(x.id||`${kind}-${Date.now()}-${i}`).slice(0,120),
      slug:String(x.slug||'').trim().slice(0,180),
      status:String(x.status||'DRAFT').slice(0,30),
      isActive:x.isActive!==false,
      translations:this.cleanTranslations(x.translations),
      ...(kind==='contracts'?{surfaces:(Array.isArray(x.surfaces)?x.surfaces:['storefront','admin','landing','developer']).map(String).slice(0,12)}:{}),
      ...(kind==='pages'?{modules:Array.isArray(x.modules)?x.modules.slice(0,100):[]}:{}),
      createdAt:String(x.createdAt||new Date().toISOString()),updatedAt:new Date().toISOString()
    }));
    const cleanMarketingPage=(input:any,currentPage:any)=>{
      const src=input&&typeof input==='object'&&!Array.isArray(input)?input:currentPage||{};
      const cleanTranslations=(value:any)=>{const out:any={};if(value&&typeof value==='object'&&!Array.isArray(value))for(const [locale,row] of Object.entries(value)){if(!row||typeof row!=='object'||Array.isArray(row))continue;const r:any=row;const clean:any={};for(const key of ['title','eyebrow','description','primaryCtaLabel','secondaryCtaLabel','note'])if(r[key]!==undefined)clean[key]=String(r[key]||'').slice(0,key==='description'?5000:500);out[String(locale).slice(0,30)]=clean;}return out;};
      const seo:any={};if(src.seo&&typeof src.seo==='object'&&!Array.isArray(src.seo))for(const [locale,row] of Object.entries(src.seo)){const r:any=row||{};seo[String(locale).slice(0,30)]={title:String(r.title||'').slice(0,240),description:String(r.description||'').slice(0,500),slug:String(r.slug||'').slice(0,240)};}
      const blocks=(Array.isArray(src.blocks)?src.blocks:[]).slice(0,100).map((x:any,i:number)=>({id:String(x.id||`block-${Date.now()}-${i}`).slice(0,120),type:String(x.type||'content').slice(0,80),enabled:x.enabled!==false,sortOrder:Number(x.sortOrder??i),translations:cleanTranslations(x.translations),settings:x.settings&&typeof x.settings==='object'&&!Array.isArray(x.settings)?x.settings:{}}));
      return {seo,blocks};
    };
    const currentMarketing=current.marketing||{};const requestedMarketing=body?.marketing&&typeof body.marketing==='object'&&!Array.isArray(body.marketing)?body.marketing:currentMarketing;
    const value={
      contracts:cleanRows(body?.contracts,'contracts'),
      blog:cleanRows(body?.blog,'blog'),
      pages:cleanRows(body?.pages,'pages'),
      marketing:{home:cleanMarketingPage(requestedMarketing.home,currentMarketing.home),login:cleanMarketingPage(requestedMarketing.login,currentMarketing.login),register:cleanMarketingPage(requestedMarketing.register,currentMarketing.register)}
    };
    await (this.prisma as any).platformSetting.upsert({where:{key:'platform_content'},create:{key:'platform_content',value},update:{value}});
    return {...value,locales:current.locales};
  }

  async platformProducts(){
    const [plans,apps,themes,aiCredits,emailCredits,coupons]=await Promise.all([
      this.prisma.plan.findMany({orderBy:{sortOrder:'asc'}}),
      this.prisma.appDefinition.findMany({orderBy:{name:'asc'},select:{id:true,slug:true,name:true,basePrice:true,currency:true,billingType:true,isActive:true}}),
      this.prisma.themeDefinition.findMany({orderBy:{name:'asc'},select:{id:true,slug:true,name:true,basePrice:true,currency:true,isActive:true}}),
      this.prisma.aiCreditPackage.findMany({orderBy:{sortOrder:'asc'}}),
      this.prisma.emailCreditPackage.findMany({orderBy:{sortOrder:'asc'}}),
      this.prisma.billingCoupon.findMany({orderBy:{createdAt:'desc'}}),
    ]);
    return {plans,apps,themes,aiCredits,emailCredits,coupons};
  }

  async saveCreditProduct(kind:'AI'|'EMAIL',id:string|undefined,body:{name?:string;code?:string;credits?:number;price?:number;currency?:string;isActive?:boolean;sortOrder?:number}){
    const data={name:String(body.name||'').trim(),code:String(body.code||'').trim().toUpperCase(),credits:Math.max(1,Math.trunc(Number(body.credits||0))),price:Math.max(0,Number(body.price||0)),currency:String(body.currency||'TRY').toUpperCase().slice(0,3),isActive:body.isActive!==false,sortOrder:Math.trunc(Number(body.sortOrder||0))};
    if(!data.name||!data.code||!data.credits)throw new BadRequestException('Ürün adı, kodu ve kredi miktarı zorunlu');
    if(kind==='AI')return id?this.prisma.aiCreditPackage.update({where:{id},data}):this.prisma.aiCreditPackage.create({data});
    return id?this.prisma.emailCreditPackage.update({where:{id},data}):this.prisma.emailCreditPackage.create({data});
  }

  async saveBillingCoupon(id:string|undefined,body:{code?:string;name?:string;type?:string;value?:number;minAmount?:number|null;maxDiscount?:number|null;appliesTo?:string[];usageLimit?:number|null;perTenantLimit?:number|null;startsAt?:string|null;endsAt?:string|null;isActive?:boolean}){
    const type=String(body.type||'PERCENTAGE').toUpperCase();if(!['PERCENTAGE','FIXED'].includes(type))throw new BadRequestException('Geçersiz indirim tipi');
    const code=String(body.code||'').trim().toUpperCase();const name=String(body.name||code).trim();const value=Math.max(0,Number(body.value||0));if(!code||!name||value<=0)throw new BadRequestException('Kod, ad ve indirim değeri zorunlu');
    const data={code,name,type,value,minAmount:body.minAmount==null?null:Math.max(0,Number(body.minAmount)),maxDiscount:body.maxDiscount==null?null:Math.max(0,Number(body.maxDiscount)),appliesTo:Array.isArray(body.appliesTo)?body.appliesTo.map(String).slice(0,50):[],usageLimit:body.usageLimit==null?null:Math.max(1,Math.trunc(Number(body.usageLimit))),perTenantLimit:body.perTenantLimit==null?null:Math.max(1,Math.trunc(Number(body.perTenantLimit))),startsAt:body.startsAt?new Date(body.startsAt):null,endsAt:body.endsAt?new Date(body.endsAt):null,isActive:body.isActive!==false};
    return id?this.prisma.billingCoupon.update({where:{id},data}):this.prisma.billingCoupon.create({data});
  }

}
