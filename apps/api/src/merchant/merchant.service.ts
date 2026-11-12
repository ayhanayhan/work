import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, createSign, timingSafeEqual } from 'crypto';
import { resolveNs } from 'node:dns/promises';
import { COUNTRY_CODES, LOCALES, SUBDIVISIONS } from '../common/reference-data';
import { PERMISSIONS } from '../common/permissions';
import { CacheService } from '../cache/cache.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { EDocumentService } from '../edoc-core/edoc.service';
import { evaluatePromotions } from '../storefront/promotion-engine';
import { GoogleAuth } from 'google-auth-library';
import { ReturnStatus } from '@prisma/client';
import { apiError } from '../i18n/api-error';
import { apiText } from '../i18n/api-i18n';
import { EmailService } from '../email/email.service';
import { MerchantLiveService } from './merchant-live.service';
import {MerchantRegionalService, type RefreshRatesInput, type RegionalSettingsInput} from './merchant-regional.service';
import { createThemePreviewToken } from '../common/theme-preview-token';
import { assertThemePerformanceBudget } from '../common/theme-performance-budget';
import { canTransition, FULFILLMENT_TRANSITIONS, ORDER_TRANSITIONS, PAYMENT_ATTEMPT_TRANSITIONS, PAYMENT_TRANSITIONS, REFUND_TRANSITIONS, RETURN_TRANSITIONS } from '../common/commerce-state-machine';
import { releaseExpiredInventoryReservations } from '../common/inventory-reservations';
import { explainMarketResolution } from '../common/market-resolution';
import { routeInventory, type RoutingPolicy } from '../common/fulfillment-routing';

@Injectable()
export class MerchantService {
  private readonly appHostingAuth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  constructor(private prisma: PrismaService, private cache: CacheService, private integrations: IntegrationsService, private edoc: EDocumentService,private mail:EmailService,private live:MerchantLiveService,private regional:MerchantRegionalService) {}


  private commerceDisplayFallback(value:any){
    const raw=String(value??'').trim();if(!raw)return '—';
    const map:Record<string,string>={
      PENDING_PAYMENT:'Ödeme bekliyor',PROCESSING:'Hazırlanıyor',FULFILLED:'Tamamlandı',COMPLETED:'Tamamlandı',CANCELLED:'İptal edildi',REFUNDED:'İade edildi',PARTIALLY_REFUNDED:'Kısmi iade',
      PENDING:'Bekliyor',PAID:'Ödendi',FAILED:'Başarısız',SUCCEEDED:'Başarılı',AUTHORIZED:'Onaylandı',REQUIRES_ACTION:'İşlem gerekli',CREATED:'Oluşturuldu',SETTLED:'Kapatıldı',OPEN:'Açık',
      UNFULFILLED:'Gönderilmedi',PARTIALLY_FULFILLED:'Kısmi gönderildi',DELIVERED:'Teslim edildi',SHIPPED:'Kargoya verildi',IN_TRANSIT:'Yolda',READY:'Hazır',
      NORMAL:'Normal',REVIEW:'Kontrol gerekli',HIGH:'Yüksek risk',
      storefront:'Mağaza',web:'Mağaza',pos:'POS / Hızlı Satış',manual_order:'Manuel Sipariş',admin:'Yönetim Paneli',marketplace:'Pazaryeri',exchange:'Değişim',api:'API',
      POS:'POS',MANUAL:'Manuel',STRIPE:'Stripe',POS_CARD:'Kart',CARD:'Kart',CREDIT_CARD:'Kredi / Banka Kartı',CASH:'Nakit',BANK_TRANSFER:'Havale / EFT',bank_transfer:'Havale / EFT',COD:'Kapıda Ödeme',POS_CASH:'Nakit',EXCHANGE_ADJUSTMENT:'Değişim Farkı',EXCHANGE_CREDIT:'Değişim Kredisi',
      PICKUP:'Mağazadan Teslim',POS_PICKUP:'Mağazadan Teslim',SHIPPING:'Kargo',COURIER:'Kurye',DELIVERY:'Teslimat',
      NOTE:'Not',ITEMS_EDITED:'Ürünler düzenlendi',POS_ORDER_CREATED:'POS siparişi oluşturuldu',MANUAL_ORDER_CREATED:'Manuel sipariş oluşturuldu',DETAILS_UPDATED:'Sipariş bilgileri güncellendi',INVOICE_CREATED:'E-belge oluşturuldu',RISK_UPDATED:'Risk değerlendirmesi güncellendi',
      DRAFT:'Taslak',REQUESTED:'Talep edildi',APPROVED:'Onaylandı',REJECTED:'Reddedildi',RECEIVED:'Teslim alındı',INSPECTED:'Kontrol edildi',REQUIRED:'Bekleniyor',
      SALE:'Satış',CAPTURE:'Tahsilat',REFUND:'Geri ödeme',VOID:'İptal',AUTHORIZE:'Provizyon'
    };
    return map[raw]||map[raw.toUpperCase()]||map[raw.toLowerCase()]||raw.replace(/[_-]+/g,' ').toLocaleLowerCase('tr-TR').replace(/(^|\s)\p{L}/gu,m=>m.toLocaleUpperCase('tr-TR'));
  }
  private async orderDisplayContext(storeId:string){
    const [payments,shipping]=await Promise.all([
      this.prisma.paymentMethod.findMany({where:{storeId},select:{code:true,name:true}}),
      this.prisma.shippingMethod.findMany({where:{storeId},select:{code:true,name:true}})
    ]);
    const paymentMap=new Map<string,string>(),shippingMap=new Map<string,string>();
    for(const x of payments){paymentMap.set(String(x.code).toLowerCase(),x.name);paymentMap.set(String(x.code).toUpperCase(),x.name);}
    for(const x of shipping){shippingMap.set(String(x.code).toLowerCase(),x.name);shippingMap.set(String(x.code).toUpperCase(),x.name);}
    return{payments:paymentMap,shipping:shippingMap};
  }
  private orderDisplay(order:any,ctx:any){
    if(!order)return order;
    const paymentCode=String(order.paymentMethod||'');
    const shippingCode=String(order.shippingMethod||order?.metadata?.manualOrder?.deliveryType||order?.metadata?.pos?.deliveryType||'');
    const paymentName=ctx?.payments?.get(paymentCode)||ctx?.payments?.get(paymentCode.toLowerCase())||ctx?.payments?.get(paymentCode.toUpperCase());
    const shippingName=order?.metadata?.pos?.shippingMethodName||ctx?.shipping?.get(shippingCode)||ctx?.shipping?.get(shippingCode.toLowerCase())||ctx?.shipping?.get(shippingCode.toUpperCase());
    const replaceNote=(value:any)=>{let text=String(value||'');if(!text)return text;const tokens=[order.status,order.paymentStatus,order.fulfillmentStatus,paymentCode,shippingCode,'POS','PAID','PENDING','PICKUP','SHIPPING','COURIER','SALE','SUCCEEDED','ITEMS_EDITED','POS_ORDER_CREATED','MANUAL_ORDER_CREATED'];for(const token of tokens.filter(Boolean)){const from=String(token);const to=(from===paymentCode&&paymentName)||(from===shippingCode&&shippingName)||this.commerceDisplayFallback(from);text=text.split(from).join(String(to));}return text};
    return{
      ...order,
      display:{
        status:this.commerceDisplayFallback(order.status),paymentStatus:this.commerceDisplayFallback(order.paymentStatus),fulfillmentStatus:this.commerceDisplayFallback(order.fulfillmentStatus),
        paymentMethod:paymentName||this.commerceDisplayFallback(paymentCode),shippingMethod:shippingName||this.commerceDisplayFallback(shippingCode),source:String(order?.salesChannel?.name||order?.salesChannelSnapshot?.name||this.commerceDisplayFallback(order.source||'storefront')),risk:this.commerceDisplayFallback(order.riskLevel||'NORMAL'),
        invoiceStatus:this.commerceDisplayFallback(order?.metadata?.invoice?.status||'PENDING')
      },
      statusHistory:Array.isArray(order.statusHistory)?order.statusHistory.map((h:any)=>({...h,displayStatus:this.commerceDisplayFallback(h.status),displayNote:replaceNote(h.note)})):order.statusHistory,
      paymentTransactions:Array.isArray(order.paymentTransactions)?order.paymentTransactions.map((t:any)=>({...t,displayType:this.commerceDisplayFallback(t.type),displayStatus:this.commerceDisplayFallback(t.status)})):order.paymentTransactions,
      fulfillments:Array.isArray(order.fulfillments)?order.fulfillments.map((f:any)=>({...f,displayStatus:this.commerceDisplayFallback(f.status),shipments:Array.isArray(f.shipments)?f.shipments.map((sh:any)=>({...sh,displayStatus:this.commerceDisplayFallback(sh.status),displayProvider:this.commerceDisplayFallback(sh.carrierName||sh.provider||'MANUAL')})):f.shipments})):order.fulfillments
    };
  }

  private async resolveSalesChannel(db:any,storeId:string,requestedId:string|undefined,key:string,name:string,type:string){
    const id=String(requestedId||'').trim();
    const existing=id?await db.salesChannel.findFirst({where:{id,storeId,active:true}}):await db.salesChannel.findFirst({where:{storeId,key,active:true}});
    if(!existing)throw new BadRequestException(`${name} satış kanalı aktif değil. Satış Kanalları bölümünden oluşturun veya etkinleştirin.`);
    if(id&&type==='POS'&&existing.type!=='POS')throw new BadRequestException('POS işlemi için POS tipi satış kanalı seçilmelidir');
    return existing;
  }

  private slugify(value: unknown) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private appHostingParent(){
    const project=String(process.env.FIREBASE_PROJECT_ID||process.env.GOOGLE_CLOUD_PROJECT||'wedidit-64fae').trim();
    const location=String(process.env.APP_HOSTING_LOCATION||'europe-west4').trim();
    const backend=String(process.env.APP_HOSTING_STOREFRONT_BACKEND||'commerce-storefront').trim();
    return `projects/${project}/locations/${location}/backends/${backend}`;
  }

  private async appHostingRequest(path:string,init:any={}){
    const client=await this.appHostingAuth.getClient();
    const access:any=await client.getAccessToken();
    const token=typeof access==='string'?access:access?.token;
    if(!token)throw new Error('Firebase App Hosting access token alınamadı');
    const res=await fetch(`https://firebaseapphosting.googleapis.com/v1/${path}`,{
      ...init,
      headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...(init.headers||{})},
    });
    const body:any=await res.json().catch(()=>({}));
    if(!res.ok){const err:any=new Error(body?.error?.message||`App Hosting isteği başarısız (${res.status})`);err.status=res.status;throw err;}
    return body;
  }

  private async appHostingDomain(domain:string){
    const name=`${this.appHostingParent()}/domains/${encodeURIComponent(domain)}`;
    try{return await this.appHostingRequest(name)}catch(e:any){if(e?.status===404)return null;throw e}
  }

  private async ensureAppHostingDomain(domain:string){
    let current=await this.appHostingDomain(domain);if(current)return current;
    const parent=this.appHostingParent();
    const op:any=await this.appHostingRequest(`${parent}/domains?domainId=${encodeURIComponent(domain)}`,{method:'POST',body:'{}'});
    if(op?.name){
      for(let i=0;i<12;i++){
        const state:any=await this.appHostingRequest(op.name);if(state?.done)break;
        await new Promise(resolve=>setTimeout(resolve,500));
      }
    }
    current=await this.appHostingDomain(domain);return current;
  }

  private mapAppHostingDomain(row:any){
    if(!row)return null;const status=row.customDomainStatus||{};const records:any[]=[];const removals:any[]=[];
    for(const update of status.requiredDnsUpdates||[]){
      for(const set of update.desired||[])for(const rec of set.records||[])if(rec.requiredAction==='ADD')records.push({domainName:rec.domainName||set.domainName||update.domainName,type:rec.type,rdata:rec.rdata,requiredAction:'ADD',relevantState:rec.relevantState||[]});
      for(const set of update.discovered||[])for(const rec of set.records||[])if(rec.requiredAction==='REMOVE')removals.push({domainName:rec.domainName||set.domainName||update.domainName,type:rec.type,rdata:rec.rdata,requiredAction:'REMOVE',relevantState:rec.relevantState||[]});
    }
    return {hostState:status.hostState||null,ownershipState:status.ownershipState||null,certState:status.certState||null,connected:status.hostState==='HOST_ACTIVE'&&status.ownershipState==='OWNERSHIP_ACTIVE'&&status.certState==='CERT_ACTIVE',reconciling:!!row.reconciling,records,manualRemovals:removals,issues:status.issues||[]};
  }

  private async appHostingStatus(domain:string,create=false){
    if(!domain)return null;
    try{const row=create?await this.ensureAppHostingDomain(domain):await this.appHostingDomain(domain);return {available:true,...(this.mapAppHostingDomain(row)||{connected:false,records:[],manualRemovals:[]})};}
    catch(e:any){return {available:false,connected:false,records:[],manualRemovals:[],error:e?.message||'Firebase App Hosting alan adı durumu alınamadı'};}
  }

  async referenceData(country?: string) {
    const timezones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Europe/Istanbul','UTC'];
    const fallbackCurrencies = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : ['TRY','USD','EUR','GBP'];
    let general:any={};
    try{const row:any=await (this.prisma as any).platformSetting.findUnique({where:{key:'general'}});general=row?.value&&typeof row.value==='object'?row.value:{}}catch{}
    const localeRows=Array.isArray(general?.locales)?general.locales.filter((x:any)=>x?.isActive!==false&&x?.isEnabled!==false):[];
    const currencyRows=Array.isArray(general?.currencies)?general.currencies.filter((x:any)=>x?.isActive!==false&&x?.isEnabled!==false):[];
    const locales=localeRows.length?localeRows.map((x:any)=>({locale:String(x.locale||x.code||''),label:String(x.label||x.name||x.locale||x.code||''),isDefault:!!x.isDefault})).filter((x:any)=>x.locale):LOCALES;
    const currencies=currencyRows.length?currencyRows.map((x:any)=>({code:String(x.code||'').toUpperCase(),name:String(x.name||x.label||x.code||''),symbol:x.symbol||null,exchangeRate:Number(x.exchangeRate||x.rate||1),isDefault:!!x.isDefault})).filter((x:any)=>x.code):fallbackCurrencies.map((code:string)=>({code,name:code,exchangeRate:1}));
    return { countries: COUNTRY_CODES, currencies, timezones, locales, subdivisions: country ? (SUBDIVISIONS[country.toUpperCase()] || []) : [] };
  }

  async assertStore(tenantId: string, storeId: string) {
    if (storeId !== tenantId) throw new ForbiddenException('Site does not belong to tenant');
    const site = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!site) throw new ForbiddenException('Tenant not found');
    return site;
  }

  private async requireFeature(tenantId: string, feature: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { tenantId, status: { in: ['TRIAL','ACTIVE'] } }, include: { plan: true }, orderBy: { createdAt: 'desc' } });
    const features:any = sub?.plan?.features || {};
    if (sub && features[feature] === false) throw new ForbiddenException(`Current plan does not include ${feature}`);
  }

  private analyticsRange(from?:string,to?:string){
    const now=new Date();
    const end=to?new Date(`${to}T23:59:59.999Z`):now;
    const start=from?new Date(`${from}T00:00:00.000Z`):new Date(now.getFullYear(),now.getMonth(),1);
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||start>end)throw new BadRequestException('Geçersiz tarih aralığı');
    const ms=end.getTime()-start.getTime()+1;const previousEnd=new Date(start.getTime()-1);const previousStart=new Date(previousEnd.getTime()-ms+1);
    return{start,end,previousStart,previousEnd};
  }
  private pct(current:number,previous:number){if(!previous)return current?100:0;return ((current-previous)/Math.abs(previous))*100;}
  private async analyticsWarehouseScope(tenantId:string,userId:string,warehouseId?:string){
    const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    if(warehouseId){if(scope&&!scope.includes(warehouseId))throw new ForbiddenException('Bu depoya erişiminiz yok');return[warehouseId];}
    return scope;
  }
  private orderWarehouseWhere(scope:string[]|null){return scope?{OR:[{inventoryReservations:{some:{warehouseId:{in:scope}}}},{fulfillments:{some:{warehouseId:{in:scope}}}}]}:{};}

  async operationsOverview(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    const now=new Date();const dayAgo=new Date(now.getTime()-24*60*60*1000);const tenMinutesAgo=new Date(now.getTime()-10*60*1000);const fiveMinutesAgo=new Date(now.getTime()-5*60*1000);
    const [failedPayments,stuckPayments,failedRefunds,expiredReservations,deadWebhooks,retryWebhooks,disabledAppWebhooks,pendingFulfillments,pendingTransfers,outboxPending,automationPending,automationFailed,oldestOutbox,oldestAutomation,recentPaymentFailures,recentWebhookFailures,recentRefundFailures]=await Promise.all([
      this.prisma.paymentAttempt.count({where:{storeId,status:'FAILED',updatedAt:{gte:dayAgo}}}),
      this.prisma.paymentAttempt.count({where:{storeId,status:{in:['CREATED','REQUIRES_ACTION','PROCESSING']},updatedAt:{lt:tenMinutesAgo}}}),
      this.prisma.refund.count({where:{storeId,status:'FAILED',updatedAt:{gte:dayAgo}}}),
      this.prisma.inventoryReservation.count({where:{storeId,status:'HELD',expiresAt:{lt:now}}}),
      this.prisma.eventDelivery.count({where:{status:'DEAD',outbox:{tenantId}}}),
      this.prisma.eventDelivery.count({where:{status:'RETRY',outbox:{tenantId}}}),
      this.prisma.appWebhookSubscription.count({where:{tenantId,enabled:false}}),
      this.prisma.fulfillment.count({where:{storeId,status:{in:['OPEN','PENDING','PREPARING']}}}),
      this.prisma.warehouseTransfer.count({where:{storeId,status:{in:['REQUESTED','PREPARING','SHIPPED','IN_TRANSIT']}}}),
      this.prisma.eventOutbox.count({where:{tenantId,status:{in:['PENDING','PROCESSING']},availableAt:{lte:now}}}),
      this.prisma.marketingAutomationRun.count({where:{storeId,status:{in:['PENDING','RUNNING']},nextRunAt:{lte:now}}}),
      this.prisma.marketingAutomationRun.count({where:{storeId,status:'FAILED',updatedAt:{gte:dayAgo}}}),
      this.prisma.eventOutbox.findFirst({where:{tenantId,status:{in:['PENDING','PROCESSING']},availableAt:{lte:now}},orderBy:{availableAt:'asc'},select:{availableAt:true}}),
      this.prisma.marketingAutomationRun.findFirst({where:{storeId,status:{in:['PENDING','RUNNING']},nextRunAt:{lte:now}},orderBy:{nextRunAt:'asc'},select:{nextRunAt:true}}),
      this.prisma.paymentAttempt.findMany({where:{storeId,status:{in:['FAILED','UNKNOWN','CREATED','REQUIRES_ACTION','PROCESSING']}},orderBy:{updatedAt:'desc'},take:12,select:{id:true,orderId:true,provider:true,amount:true,currency:true,status:true,providerReference:true,updatedAt:true}}),
      this.prisma.eventDelivery.findMany({where:{status:{in:['DEAD','RETRY']},outbox:{tenantId}},orderBy:{updatedAt:'desc'},take:12,select:{id:true,status:true,attemptCount:true,maxAttempts:true,statusCode:true,lastError:true,nextAttemptAt:true,updatedAt:true,outbox:{select:{event:true,resourceType:true,resourceId:true,traceId:true}}}}),
      this.prisma.refund.findMany({where:{storeId,status:'FAILED'},orderBy:{updatedAt:'desc'},take:12,select:{id:true,orderId:true,amount:true,currency:true,reason:true,status:true,updatedAt:true}}),
    ]);
    let database:any={available:false,activeConnections:null,longTransactions:null};
    try{const rows:any[]=await this.prisma.$queryRawUnsafe(`SELECT count(*)::int AS active, count(*) FILTER (WHERE state <> 'idle' AND query_start < now() - interval '30 seconds')::int AS long_running FROM pg_stat_activity WHERE datname = current_database()`);database={available:true,activeConnections:Number(rows?.[0]?.active||0),longTransactions:Number(rows?.[0]?.long_running||0)};}catch{}
    const ageMin=(v:any)=>v?Math.max(0,Math.floor((now.getTime()-new Date(v).getTime())/60000)):0;const oldestQueueAgeMinutes=Math.max(ageMin(oldestOutbox?.availableAt),ageMin(oldestAutomation?.nextRunAt));
    const queueBacklog=outboxPending+automationPending;const critical=deadWebhooks+expiredReservations+(database.longTransactions||0);const warning=failedPayments+stuckPayments+failedRefunds+retryWebhooks+automationFailed+(oldestQueueAgeMinutes>=5?1:0);
    return{generatedAt:now.toISOString(),health:{status:critical>0?'critical':warning>0?'warning':'healthy',critical,warning},cards:{failedPayments24h:failedPayments,stuckPayments,failedRefunds24h:failedRefunds,expiredReservations,deadWebhooks,retryWebhooks,disabledAppWebhooks,pendingFulfillments,pendingTransfers,queueBacklog,oldestQueueAgeMinutes,automationFailed24h:automationFailed},queue:{outboxPending,automationPending,automationFailed24h:automationFailed,oldestQueueAgeMinutes,stale:oldestQueueAgeMinutes>=5},database,recent:{payments:recentPaymentFailures.map((x:any)=>({...x,amount:Number(x.amount)})),webhooks:recentWebhookFailures,refunds:recentRefundFailures.map((x:any)=>({...x,amount:Number(x.amount)}))}};
  }

  private onboardingWizardOf(store:any){
    const root:any=store?.settings&&typeof store.settings==='object'&&!Array.isArray(store.settings)?store.settings:{};
    const wizard:any=root.onboardingWizard&&typeof root.onboardingWizard==='object'&&!Array.isArray(root.onboardingWizard)?root.onboardingWizard:{};
    return {root,wizard:{required:wizard.required===true,version:Number(wizard.version||1),startedAt:wizard.startedAt||null,completedAt:wizard.completedAt||null,steps:wizard.steps&&typeof wizard.steps==='object'?wizard.steps:{}}};
  }

  private async onboardingSnapshot(tenantId:string,storeId:string){
    const store:any=await this.assertStore(tenantId,storeId);const {wizard}=this.onboardingWizardOf(store);
    const [productCount,addressCount,activeTheme,activePayments,activeShipping]=await Promise.all([
      this.prisma.product.count({where:{storeId}}),
      this.prisma.storeAddress.count({where:{storeId}}),
      this.prisma.themeDefinition.findFirst({where:{slug:store.activeTheme,isActive:true},select:{id:true,slug:true,name:true,previewImageUrl:true}}),
      this.prisma.paymentMethod.count({where:{storeId,isActive:true}}),
      this.prisma.shippingMethod.count({where:{storeId,isActive:true}}),
    ]);
    const generalComplete=!!String(store.name||'').trim()&&!!String(store.email||'').trim()&&addressCount>0;
    const themeComplete=wizard.required?!!wizard.steps?.theme?.completedAt:!!activeTheme;
    const demoComplete=!!wizard.steps?.demoProducts?.completedAt;
    const steps={
      general:{complete:generalComplete,skipped:!!wizard.steps?.general?.skippedAt},
      theme:{complete:themeComplete,skipped:!!wizard.steps?.theme?.skippedAt},
      demoProducts:{complete:demoComplete,skipped:!!wizard.steps?.demoProducts?.skippedAt},
    };
    const todo=[
      !generalComplete?{id:'store-details',title:'Mağaza bilgilerini tamamlayın',description:'Mağaza adı, iletişim ve merkez adresini tamamlayın.',href:'/settings/general',priority:'high'}:null,
      !store.logoUrl?{id:'store-logo',title:'Mağaza logosu ekleyin',description:'Header, e-posta ve marka alanlarında kullanılacak logonuzu yükleyin.',href:'/settings/general',priority:'normal'}:null,
      productCount===0?{id:'first-product',title:'İlk ürününüzü ekleyin',description:'Mağazanız boş görünüyor. Ürün ekleyin veya demo ürünleri yükleyin.',href:'/products/new',priority:'high'}:null,
      !themeComplete?{id:'choose-theme',title:'Temanızı seçin',description:'Mağazanızın görünümünü belirleyecek temayı seçin ve yayınlayın.',href:'/themes',priority:'high'}:null,
      activePayments===0?{id:'payment-method',title:'Ödeme yöntemini etkinleştirin',description:'Sipariş alabilmek için en az bir ödeme yöntemi etkin olmalı.',href:'/settings/payments',priority:'high'}:null,
      activeShipping===0?{id:'shipping-method',title:'Teslimat yöntemini ayarlayın',description:'Fiziksel ürünler için en az bir teslimat/kargo yöntemi tanımlayın.',href:'/settings/delivery',priority:'normal'}:null,
      !store.domain?{id:'domain',title:'Özel alan adınızı bağlayın',description:'Hazır olduğunuzda kendi domaininizi mağazanıza bağlayabilirsiniz.',href:'/settings/domains',priority:'optional'}:null,
    ].filter(Boolean);
    return {required:wizard.required,completed:!!wizard.completedAt,completedAt:wizard.completedAt,steps,store:{id:store.id,name:store.name,email:store.email,phone:store.phone,companyName:store.companyName,logoUrl:store.logoUrl,activeTheme:store.activeTheme,theme:activeTheme},counts:{products:productCount,addresses:addressCount},todo};
  }

  async onboardingStatus(tenantId:string,storeId:string){return this.onboardingSnapshot(tenantId,storeId);}

  async updateOnboarding(tenantId:string,storeId:string,body:any){
    const store:any=await this.assertStore(tenantId,storeId);const {root,wizard}=this.onboardingWizardOf(store);const now=new Date().toISOString();const steps:any={...(wizard.steps||{})};
    const step=String(body?.step||'');if(step&&['general','theme','demoProducts'].includes(step)){steps[step]={...(steps[step]||{}),...(body?.status==='skipped'?{skippedAt:now}:{completedAt:now}),updatedAt:now};}
    const complete=body?.complete===true;
    const onboardingWizard={...wizard,required:true,version:1,startedAt:wizard.startedAt||now,steps,...(complete?{completedAt:now}:{})};
    await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...root,onboardingWizard}}});return this.onboardingSnapshot(tenantId,storeId);
  }

  async createOnboardingDemoProducts(tenantId:string,storeId:string){
    const store:any=await this.assertStore(tenantId,storeId);
    const existing=await this.prisma.product.count({where:{storeId,metadata:{path:['onboardingDemo'],equals:true} as any}});
    if(existing>0)return this.updateOnboarding(tenantId,storeId,{step:'demoProducts',status:'completed'});
    const samples=[
      ['Klasik Ürün','demo-klasik-urun',499],['Yeni Sezon Ürünü','demo-yeni-sezon',749],['Öne Çıkan Ürün','demo-one-cikan',899],
      ['Günlük Ürün','demo-gunluk',349],['Premium Ürün','demo-premium',1299],['Çok Satan Ürün','demo-cok-satan',649],
    ] as const;
    const ops=samples.map((x,i)=>this.prisma.product.create({data:{
      storeId,title:x[0],slug:`${x[1]}-${storeId.slice(0,6)}`,
      description:'Bu ürün mağaza kurulumunda oluşturulan demo üründür. Kendi ürününüzle değiştirebilir veya silebilirsiniz.',
      shortDescription:'Demo ürün',status:'ACTIVE',productType:'SIMPLE',tags:['demo'],metadata:{onboardingDemo:true,onboardingDemoIndex:i+1},publishedAt:new Date(),
      variants:{create:[{title:'Standart',sku:`DEMO-${storeId.slice(0,6).toUpperCase()}-${i+1}`,price:x[2],inventory:{create:{trackStock:false}}}]},
    }}));
    const created:any[]=await this.prisma.$transaction(ops);const defaultChannels=await this.prisma.salesChannel.findMany({where:{storeId,active:true,type:'STOREFRONT'},select:{id:true}});if(defaultChannels.length&&created.length)await this.prisma.productSalesChannel.createMany({data:created.flatMap((p:any)=>defaultChannels.map((ch:any)=>({productId:p.id,salesChannelId:ch.id,published:true}))),skipDuplicates:true});
    return this.updateOnboarding(tenantId,storeId,{step:'demoProducts',status:'completed'});
  }

  async dashboard(tenantId:string,storeId:string,userId:string,from?:string,to?:string,warehouseId?:string,salesChannelId?:string){
    const site=await this.assertStore(tenantId,storeId);const r=this.analyticsRange(from,to);const scope=await this.analyticsWarehouseScope(tenantId,userId,warehouseId);const orderScope=this.orderWarehouseWhere(scope);
    const channelId=String(salesChannelId||'').trim();if(channelId&&!await this.prisma.salesChannel.findFirst({where:{id:channelId,storeId,active:true},select:{id:true}}))throw new BadRequestException('Satış kanalı bulunamadı');const channelWhere=channelId?{salesChannelId:channelId}:{};const currentWhere:any={storeId,currency:site.currency,createdAt:{gte:r.start,lte:r.end},...orderScope,...channelWhere};const previousWhere:any={storeId,currency:site.currency,createdAt:{gte:r.previousStart,lte:r.previousEnd},...orderScope,...channelWhere};
    const [currentAgg,previousAgg,currentOrders,previousOrders,newCustomers,previousCustomers,refundAgg,previousRefundAgg,pendingFulfillment,pendingTransfers,lowStockRows,recentOrders,warehouses,channels,topItems]=await Promise.all([
      this.prisma.order.aggregate({where:{...currentWhere,paymentStatus:'PAID'},_sum:{grandTotal:true},_count:{_all:true}}),
      this.prisma.order.aggregate({where:{...previousWhere,paymentStatus:'PAID'},_sum:{grandTotal:true},_count:{_all:true}}),
      this.prisma.order.count({where:currentWhere}),this.prisma.order.count({where:previousWhere}),
      this.prisma.customer.count({where:{storeId,createdAt:{gte:r.start,lte:r.end}}}),this.prisma.customer.count({where:{storeId,createdAt:{gte:r.previousStart,lte:r.previousEnd}}}),
      this.prisma.refund.aggregate({where:{storeId,currency:site.currency,status:'SUCCEEDED',createdAt:{gte:r.start,lte:r.end},...(scope?{order:orderScope}: {})},_sum:{amount:true},_count:{_all:true}}),
      this.prisma.refund.aggregate({where:{storeId,currency:site.currency,status:'SUCCEEDED',createdAt:{gte:r.previousStart,lte:r.previousEnd},...(scope?{order:orderScope}: {})},_sum:{amount:true}}),
      this.prisma.fulfillment.count({where:{storeId,status:{in:['OPEN','PENDING','PREPARING']},...(scope?{warehouseId:{in:scope}}:{})}}),
      this.prisma.warehouseTransfer.count({where:{storeId,status:{in:['REQUESTED','PREPARING','SHIPPED','IN_TRANSIT']},...(scope?{OR:[{sourceWarehouseId:{in:scope}},{targetWarehouseId:{in:scope}}]}:{})}}),
      this.prisma.inventoryItem.findMany({where:{variant:{product:{storeId}},trackStock:true},select:{lowStockAt:true,variant:{select:{id:true,title:true,sku:true,product:{select:{title:true,images:{select:{id:true,url:true,sortOrder:true},orderBy:{sortOrder:'asc'},take:1}}},media:{select:{sortOrder:true,image:{select:{url:true}}},orderBy:{sortOrder:'asc'},take:1},warehouseStocks:{where:scope?{warehouseId:{in:scope}}:undefined,select:{warehouseId:true,onHand:true,reserved:true,committed:true,damaged:true,safetyStock:true,warehouse:{select:{name:true}}}}}}},take:2000}),
      this.prisma.order.findMany({where:currentWhere,orderBy:{createdAt:'desc'},take:8,select:{id:true,number:true,status:true,paymentStatus:true,fulfillmentStatus:true,currency:true,grandTotal:true,source:true,salesChannelId:true,createdAt:true,customer:{select:{firstName:true,lastName:true,email:true}}}}),
      this.prisma.warehouse.findMany({where:{storeId,isActive:true,...(scope?{id:{in:scope}}:{})},select:{id:true,name:true},orderBy:{priority:'desc'}}),
      this.prisma.order.groupBy({by:['salesChannelId'],where:{...currentWhere,paymentStatus:'PAID'},_sum:{grandTotal:true},_count:{_all:true},orderBy:{_sum:{grandTotal:'desc'}},take:8}),
      this.prisma.orderItem.groupBy({by:['productIdSnapshot','title','sku'],where:{order:{...currentWhere,paymentStatus:'PAID'}},_sum:{quantity:true,total:true},orderBy:{_sum:{total:'desc'}},take:8})
    ]);
    const revenue=Number(currentAgg._sum.grandTotal||0),prevRevenue=Number(previousAgg._sum.grandTotal||0),paidOrders=Number(currentAgg._count._all||0),prevPaid=Number(previousAgg._count._all||0),refunds=Number(refundAgg._sum.amount||0),prevRefunds=Number(previousRefundAgg._sum.amount||0);const netSales=revenue-refunds,prevNet=prevRevenue-prevRefunds;const aov=paidOrders?revenue/paidOrders:0,prevAov=prevPaid?prevRevenue/prevPaid:0;
    const lowStockItems=lowStockRows.map((row:any)=>{const available=(row.variant.warehouseStocks||[]).reduce((n:number,x:any)=>n+Number(x.onHand)-Number(x.reserved)-Number(x.committed)-Number(x.damaged)-Number(x.safetyStock),0);return{variantId:row.variant.id,title:row.variant.product.title,variantTitle:row.variant.title,sku:row.variant.sku,imageUrl:row.variant.media?.[0]?.image?.url||row.variant.product.images?.[0]?.url||null,available,lowStockAt:Number(row.lowStockAt||0),warehouses:row.variant.warehouseStocks}}).filter((x:any)=>x.available<=x.lowStockAt).slice(0,20);
    const chartOrders=await this.prisma.order.findMany({where:{...currentWhere,paymentStatus:'PAID'},select:{createdAt:true,grandTotal:true}});
    const chartMap=new Map<string,{date:string;sales:number;orders:number}>();
    for(const row of chartOrders){const date=new Date(row.createdAt).toISOString().slice(0,10);const x=chartMap.get(date)||{date,sales:0,orders:0};x.sales+=Number(row.grandTotal||0);x.orders+=1;chartMap.set(date,x)}
    const chart=Array.from(chartMap.values()).sort((a,b)=>a.date.localeCompare(b.date));
    const onboarding=await this.onboardingSnapshot(tenantId,storeId);
    const channelRows=await this.prisma.salesChannel.findMany({where:{storeId,id:{in:channels.map((x:any)=>x.salesChannelId).filter(Boolean)}},select:{id:true,name:true}});const channelNames=new Map(channelRows.map((x:any)=>[x.id,x.name]));return{currency:site.currency,onboarding,todo:onboarding.todo,range:{from:r.start,to:r.end},warehouseScope:scope,warehouses,selectedSalesChannelId:channelId||null,metrics:{netSales:{value:netSales,change:this.pct(netSales,prevNet)},grossSales:{value:revenue,change:this.pct(revenue,prevRevenue)},orders:{value:currentOrders,change:this.pct(currentOrders,previousOrders)},aov:{value:aov,change:this.pct(aov,prevAov)},newCustomers:{value:newCustomers,change:this.pct(newCustomers,previousCustomers)},refunds:{value:refunds,count:Number(refundAgg._count._all||0),change:this.pct(refunds,prevRefunds)},lowStock:{value:lowStockItems.length},pendingFulfillment:{value:pendingFulfillment},pendingTransfers:{value:pendingTransfers}},chart,channels:channels.map((x:any)=>({salesChannelId:x.salesChannelId||null,source:channelNames.get(x.salesChannelId)||'Bilinmeyen Kanal',sales:Number(x._sum.grandTotal||0),orders:Number(x._count._all||0)})),topProducts:topItems.map((x:any)=>({productId:x.productIdSnapshot,title:x.title,sku:x.sku,quantity:Number(x._sum.quantity||0),sales:Number(x._sum.total||0)})),lowStockItems,recentOrders};
  }

  async analyticsReport(tenantId:string,storeId:string,userId:string,q:any){
    const site=await this.assertStore(tenantId,storeId);const r=this.analyticsRange(q?.from,q?.to);const scope=await this.analyticsWarehouseScope(tenantId,userId,q?.warehouseId);const orderScope=this.orderWarehouseWhere(scope);const type=String(q?.type||'sales').toLowerCase();const page=Math.max(1,Number(q?.page||1));const limit=Math.min(100,Math.max(10,Number(q?.limit||50)));const reportCurrency=String(q?.currency||site.currency||'TRY').toUpperCase();if(!/^[A-Z]{3}$/.test(reportCurrency))throw new BadRequestException('Invalid report currency');const salesChannelId=String(q?.salesChannelId||'').trim();if(salesChannelId&&!await this.prisma.salesChannel.findFirst({where:{id:salesChannelId,storeId,active:true},select:{id:true}}))throw new BadRequestException('Satış kanalı bulunamadı');const orderWhere:any={storeId,createdAt:{gte:r.start,lte:r.end},currency:reportCurrency,...orderScope,...(salesChannelId?{salesChannelId}: {})};
    if(type==='sales'){
      const orders=await this.prisma.order.findMany({where:orderWhere,select:{createdAt:true,grandTotal:true,subtotal:true,discountTotal:true,shippingTotal:true,taxTotal:true}});
      const dailyMap=new Map<string,{date:string;orders:number;grossSales:number;subtotal:number;discounts:number;shipping:number;tax:number}>();
      const summary={orders:0,grossSales:0,subtotal:0,discounts:0,shipping:0,tax:0};
      for(const o of orders){const date=new Date(o.createdAt).toISOString().slice(0,10);const row=dailyMap.get(date)||{date,orders:0,grossSales:0,subtotal:0,discounts:0,shipping:0,tax:0};row.orders++;row.grossSales+=Number(o.grandTotal||0);row.subtotal+=Number(o.subtotal||0);row.discounts+=Number(o.discountTotal||0);row.shipping+=Number(o.shippingTotal||0);row.tax+=Number(o.taxTotal||0);dailyMap.set(date,row);summary.orders++;summary.grossSales+=Number(o.grandTotal||0);summary.subtotal+=Number(o.subtotal||0);summary.discounts+=Number(o.discountTotal||0);summary.shipping+=Number(o.shippingTotal||0);summary.tax+=Number(o.taxTotal||0)}
      const daily=Array.from(dailyMap.values()).sort((a,b)=>b.date.localeCompare(a.date));return{type,summary,rows:daily,page:1,pages:1,total:daily.length};
    }
    if(type==='products'){
      const rows=await this.prisma.orderItem.groupBy({by:['productIdSnapshot','title','sku'],where:{order:{...orderWhere,paymentStatus:'PAID'}},_sum:{quantity:true,total:true,discountTotal:true},_count:{_all:true},orderBy:{_sum:{total:'desc'}}});return{currency:reportCurrency,type,summary:{products:rows.length,units:rows.reduce((n:any,x:any)=>n+Number(x._sum.quantity||0),0),sales:rows.reduce((n:any,x:any)=>n+Number(x._sum.total||0),0)},rows:rows.slice((page-1)*limit,page*limit).map((x:any)=>({productId:x.productIdSnapshot,title:x.title,sku:x.sku,units:Number(x._sum.quantity||0),sales:Number(x._sum.total||0),discounts:Number(x._sum.discountTotal||0)})),page,pages:Math.max(1,Math.ceil(rows.length/limit)),total:rows.length};
    }
    if(type==='customers'){
      const rows=await this.prisma.order.groupBy({by:['customerId'],where:{...orderWhere,customerId:{not:null},paymentStatus:'PAID'},_sum:{grandTotal:true},_count:{_all:true},_max:{createdAt:true},orderBy:{_sum:{grandTotal:'desc'}}});const ids=rows.slice((page-1)*limit,page*limit).map((x:any)=>x.customerId).filter(Boolean);const cs=ids.length?await this.prisma.customer.findMany({where:{id:{in:ids}},select:{id:true,email:true,firstName:true,lastName:true,customerType:true}}):[];const cm=new Map(cs.map(x=>[x.id,x]));return{currency:reportCurrency,type,summary:{customers:rows.length,revenue:rows.reduce((n:any,x:any)=>n+Number(x._sum.grandTotal||0),0),orders:rows.reduce((n:any,x:any)=>n+Number(x._count._all||0),0)},rows:rows.slice((page-1)*limit,page*limit).map((x:any)=>{const c:any=cm.get(x.customerId);const orders=Number(x._count._all||0),spent=Number(x._sum.grandTotal||0);return{customerId:x.customerId,name:c?[c.firstName,c.lastName].filter(Boolean).join(' ')||c.email:'Silinmiş müşteri',email:c?.email||'',customerType:c?.customerType||'',orders,totalSpent:spent,aov:orders?spent/orders:0,lastOrderAt:x._max.createdAt}}),page,pages:Math.max(1,Math.ceil(rows.length/limit)),total:rows.length};
    }
    if(type==='inventory'){
      const rows=await this.prisma.warehouseStock.findMany({where:{variant:{product:{storeId}},...(scope?{warehouseId:{in:scope}}:{})},include:{warehouse:{select:{id:true,name:true}},variant:{select:{id:true,sku:true,title:true,price:true,product:{select:{id:true,title:true}}}}},orderBy:{updatedAt:'desc'},skip:(page-1)*limit,take:limit});const total=await this.prisma.warehouseStock.count({where:{variant:{product:{storeId}},...(scope?{warehouseId:{in:scope}}:{})}});return{currency:reportCurrency,type,summary:{locations:scope?.length||await this.prisma.warehouse.count({where:{storeId,isActive:true}}),records:total,available:rows.reduce((n:any,x:any)=>n+Math.max(0,x.onHand-x.reserved-x.committed-x.damaged-x.safetyStock),0)},rows:rows.map((x:any)=>({warehouse:x.warehouse.name,product:x.variant.product.title,variant:x.variant.title,sku:x.variant.sku,onHand:x.onHand,reserved:x.reserved,committed:x.committed,damaged:x.damaged,safetyStock:x.safetyStock,available:x.onHand-x.reserved-x.committed-x.damaged-x.safetyStock})),page,pages:Math.max(1,Math.ceil(total/limit)),total};
    }
    if(type==='channels'){
      const rows=await this.prisma.order.groupBy({by:['salesChannelId'],where:{...orderWhere,paymentStatus:'PAID'},_sum:{grandTotal:true,discountTotal:true},_count:{_all:true},orderBy:{_sum:{grandTotal:'desc'}}});const defs=await this.prisma.salesChannel.findMany({where:{storeId,id:{in:rows.map((x:any)=>x.salesChannelId).filter(Boolean)}},select:{id:true,name:true}});const names=new Map(defs.map((x:any)=>[x.id,x.name]));return{currency:reportCurrency,type,summary:{channels:rows.length,sales:rows.reduce((n:any,x:any)=>n+Number(x._sum.grandTotal||0),0)},rows:rows.map((x:any)=>({channel:names.get(x.salesChannelId)||'Bilinmeyen Kanal',orders:Number(x._count._all||0),sales:Number(x._sum.grandTotal||0),discounts:Number(x._sum.discountTotal||0)})),page:1,pages:1,total:rows.length};
    }
    if(type==='finance'){
      const [orders,refunds,payments]=await Promise.all([this.prisma.order.aggregate({where:orderWhere,_sum:{subtotal:true,discountTotal:true,shippingTotal:true,taxTotal:true,grandTotal:true,paymentFee:true},_count:{_all:true}}),this.prisma.refund.aggregate({where:{storeId,createdAt:{gte:r.start,lte:r.end},status:'SUCCEEDED',currency:reportCurrency},_sum:{amount:true},_count:{_all:true}}),this.prisma.order.groupBy({by:['paymentMethod'],where:{...orderWhere,paymentStatus:'PAID'},_sum:{grandTotal:true},_count:{_all:true},orderBy:{_sum:{grandTotal:'desc'}}})]);return{currency:reportCurrency,type,summary:{orders:Number(orders._count._all||0),subtotal:Number(orders._sum.subtotal||0),discounts:Number(orders._sum.discountTotal||0),shipping:Number(orders._sum.shippingTotal||0),tax:Number(orders._sum.taxTotal||0),paymentFees:Number(orders._sum.paymentFee||0),grossSales:Number(orders._sum.grandTotal||0),refunds:Number(refunds._sum.amount||0),netSales:Number(orders._sum.grandTotal||0)-Number(refunds._sum.amount||0)},rows:payments.map((x:any)=>({paymentMethod:x.paymentMethod||'Belirtilmedi',orders:Number(x._count._all||0),sales:Number(x._sum.grandTotal||0)})),page:1,pages:1,total:payments.length};
    }
    const [fulfillments,shipments,returns,transfers]=await Promise.all([this.prisma.fulfillment.groupBy({by:['status'],where:{storeId,createdAt:{gte:r.start,lte:r.end},...(scope?{warehouseId:{in:scope}}:{})},_count:{_all:true}}),this.prisma.shippingShipment.groupBy({by:['status'],where:{storeId,createdAt:{gte:r.start,lte:r.end},...(scope?{fulfillment:{warehouseId:{in:scope}}}:{})},_count:{_all:true}}),this.prisma.returnRequest.groupBy({by:['status'],where:{storeId,createdAt:{gte:r.start,lte:r.end}},_count:{_all:true}}),this.prisma.warehouseTransfer.groupBy({by:['status'],where:{storeId,createdAt:{gte:r.start,lte:r.end},...(scope?{OR:[{sourceWarehouseId:{in:scope}},{targetWarehouseId:{in:scope}}]}:{})},_count:{_all:true}})]);const rows=[...fulfillments.map((x:any)=>({area:'Fulfillment',status:x.status,count:Number(x._count._all)})),...shipments.map((x:any)=>({area:'Kargo',status:x.status,count:Number(x._count._all)})),...returns.map((x:any)=>({area:'İade',status:x.status,count:Number(x._count._all)})),...transfers.map((x:any)=>({area:'Transfer',status:x.status,count:Number(x._count._all)}))];return{type:'operations',summary:{events:rows.reduce((n,x)=>n+x.count,0)},rows,page:1,pages:1,total:rows.length};
  }
  async analyticsReportExport(tenantId:string,storeId:string,userId:string,q:any){const report:any=await this.analyticsReport(tenantId,storeId,userId,{...q,page:1,limit:10000});const rows=Array.isArray(report.rows)?report.rows:[];const headers:string[]=Array.from(new Set<string>(rows.flatMap((x:any)=>Object.keys(x) as string[])));const esc=(v:any)=>`"${String(v??'').replace(/"/g,'""')}"`;const csv=[headers.map(esc).join(','),...rows.map((row:any)=>headers.map(h=>esc(row[h])).join(','))].join('\n');return{filename:`ticarti-${String(q?.type||'report')}-${new Date().toISOString().slice(0,10)}.csv`,contentType:'text/csv;charset=utf-8',csv};}


  async createStoreForUser(currentTenantId:string,userId:string,body:any){
    await this.assertStore(currentTenantId,currentTenantId);
    throw new BadRequestException('Ticarti hesap başına tek mağaza kullanır. Ek satış noktaları için Satış Kanalları bölümünü kullanın.');
  }

  async updateStore(tenantId: string, storeId: string, body: any) {
    await this.assertStore(tenantId, storeId);
    const allowed = ['name','domain','currency','locale','timezone','defaultCountry','weightUnit','dimensionUnit','activeTheme','logoUrl','faviconUrl','email','phone','companyName','taxNumber','taxOffice','addressText','seoTitle','seoDescription','maintenanceMode','settings'];
    const data:any = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if(Object.prototype.hasOwnProperty.call(data,'settings')){
      const current=await this.prisma.tenant.findUnique({where:{id:storeId},select:{settings:true}});
      const previous:any=current?.settings&&typeof current.settings==='object'&&!Array.isArray(current.settings)?current.settings:{};
      const incoming:any=data.settings&&typeof data.settings==='object'&&!Array.isArray(data.settings)?data.settings:{};
      data.settings={...previous,...incoming};
    }
    const updated=await this.prisma.tenant.update({ where: { id: storeId }, data });
    await this.cache.delPattern('public:site:*'); await this.cache.purgeTenant(tenantId);
    return updated;
  }


  private async ownerForStoreDeletion(tenantId:string,userId:string){
    const membership=await this.prisma.membership.findFirst({where:{tenantId,userId},include:{user:true,tenant:true}});if(!membership||membership.role!=='OWNER')throw new ForbiddenException(apiError('merchant.store.deleteOwnerOnly'));return membership;
  }
  private async sendDeletionConfirmation(email:string,confirmUrl:string,storeName:string,tenantId:string){
    if(process.env.EMAIL_TX_PROVIDER==='SES'){
      try {const result=await this.mail.sendTransactional({tenantId,to:email,subject:apiText('merchant.store.delete.subject',undefined,{store:storeName}),text:`${storeName} mağazası için silme onayı istendi.\n\nSilme işlemini onaylamak için bağlantı: ${confirmUrl}\n\nBu isteği siz yapmadıysanız e-postayı yok sayın.`});return result.accepted;}
      catch {throw new BadRequestException(apiError('merchant.store.deleteEmailFailed'));}
    }
    const apiKey=String(process.env.RESEND_API_KEY||'').trim();const from=String(process.env.MAIL_FROM||'Ticarti <noreply@ticarti.com>').trim();
    if(!apiKey){if(process.env.NODE_ENV==='production')throw new BadRequestException(apiError('merchant.store.deleteEmailNotConfigured'));return false;}
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:[email],subject:apiText('merchant.store.delete.subject',undefined,{store:storeName}),html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>${apiText('merchant.store.delete.heading')}</h2><p>${apiText('merchant.store.delete.request',undefined,{store:`<b>${storeName}</b>`})}</p><p>${apiText('merchant.store.delete.info')}</p><p><a href="${confirmUrl}" style="display:inline-block;padding:12px 18px;background:#16a36f;color:white;text-decoration:none;border-radius:7px">${apiText('merchant.store.delete.confirm')}</a></p><p>${apiText('merchant.store.delete.ignore')}</p></div>`})});if(!r.ok)throw new BadRequestException(apiError('merchant.store.deleteEmailFailed'));return true;
  }
  // BillingInvoice is independent of Order: a paid order does not settle platform debt.
  private async deletionBlockers(storeId:string){
    const [activeOrders,activeReturns,unpaidInvoices]=await Promise.all([
      this.prisma.order.count({where:{storeId,status:{notIn:['CANCELLED','FULFILLED']}}}),
      this.prisma.returnRequest.count({where:{storeId,status:{notIn:['REFUNDED','REJECTED','CANCELLED']}}}),
      this.prisma.billingInvoice.count({where:{tenantId:storeId,paidAt:null,total:{gt:0},status:{notIn:['PAID','CANCELLED','VOID','VOIDED']}}}),
    ]);
    return {activeOrders,activeReturns,unpaidInvoices};
  }
  async requestStoreDeletion(tenantId:string,userId:string,storeId:string,password?:string){
    if(tenantId!==storeId)throw new ForbiddenException();
    const m=await this.ownerForStoreDeletion(tenantId,userId);
    if(m.tenant.deletionConfirmedAt)throw new BadRequestException('Mağaza için onaylanmış bir silme talebi var');
    const supplied=String(password||'');
    if(!supplied||!m.user.passwordHash||!await bcrypt.compare(supplied,m.user.passwordHash))throw new ForbiddenException('Parola doğrulanamadı');
    const {activeOrders,activeReturns,unpaidInvoices}=await this.deletionBlockers(storeId);
    if(activeOrders||activeReturns||unpaidInvoices)throw new BadRequestException(`Silme isteğinden önce ${activeOrders} aktif sipariş, ${activeReturns} aktif iade ve ${unpaidInvoices} ödenmemiş fatura incelenmeli`);
    const now=new Date();
    const expiredBefore=new Date(now.getTime()-24*60*60*1000);
    const token=randomBytes(32).toString('hex');
    const hash=createHash('sha256').update(token).digest('hex');
    // CAS: do not overwrite an unexpired pending request, even under concurrent calls.
    const reserved=await this.prisma.tenant.updateMany({
      where:{id:storeId,status:{in:['TRIAL','ACTIVE']},deletionConfirmedAt:null,OR:[
        {deletionRequestTokenHash:null},
        {deletionRequestedAt:{lt:expiredBefore}},
      ]},
      data:{deletionRequestedAt:now,deletionConfirmedAt:null,deletionScheduledAt:null,deletionRequestTokenHash:hash},
    });
    if(reserved.count!==1)throw new BadRequestException('Mağaza için geçerli bir silme onayı bekleniyor');
    const host=m.tenant.domain||`${m.tenant.publicSlug}.ticarti.com`;
    const confirmUrl=`https://${host}/admin/settings/delete-store?deleteToken=${encodeURIComponent(token)}`;
    try{
      await this.sendDeletionConfirmation(m.user.email,confirmUrl,m.tenant.name,tenantId);
    }catch(error){
      // Clear only our own reservation; never erase a later request.
      await this.prisma.tenant.updateMany({where:{id:storeId,deletionConfirmedAt:null,deletionRequestTokenHash:hash},data:{deletionRequestedAt:null,deletionScheduledAt:null,deletionRequestTokenHash:null}});
      throw error;
    }
    return{requested:true,email:m.user.email.replace(/^(.{2}).+(@.+)$/,'$1***$2')};
  }
  async storeDeletionStatus(tenantId:string,userId:string,storeId:string){
    if(tenantId!==storeId)throw new ForbiddenException();
    const m=await this.ownerForStoreDeletion(tenantId,userId);
    const blockers=await this.deletionBlockers(storeId);
    const scheduled=m.tenant.deletionScheduledAt;
    const confirmed=!!m.tenant.deletionConfirmedAt;
    const remainingDays=scheduled?Math.max(0,Math.ceil((scheduled.getTime()-Date.now())/86400000)):null;
    const deletionPhase=confirmed?(remainingDays===0?'AWAITING_SUPERADMIN_REVIEW':'WAITING_PERIOD'):m.tenant.deletionRequestedAt?'AWAITING_EMAIL_CONFIRMATION':'NONE';
    return {storeName:m.tenant.name,requestedAt:m.tenant.deletionRequestedAt,confirmedAt:m.tenant.deletionConfirmedAt,scheduledAt:scheduled,remainingDays,deletionPhase,physicalDeletionCompleted:false,canRequest:!Object.values(blockers).some(Boolean),blockers,email:m.user.email.replace(/^(.{2}).+(@.+)$/,'$1***$2')};
  }

  async confirmStoreDeletion(tenantId:string,userId:string,storeId:string,token:string){
    if(tenantId!==storeId)throw new ForbiddenException();await this.ownerForStoreDeletion(tenantId,userId);const store=await this.prisma.tenant.findUnique({where:{id:storeId}});if(!store?.deletionRequestTokenHash||store.deletionConfirmedAt)throw new BadRequestException(apiError('merchant.store.deleteRequestMissing'));const {activeOrders,activeReturns,unpaidInvoices}=await this.deletionBlockers(storeId);if(activeOrders||activeReturns||unpaidInvoices)throw new BadRequestException('Açık sipariş, iade veya ödenmemiş fatura bulunduğu için mağaza kapatma onayı tamamlanamaz');const suppliedToken=String(token||'');if(!/^[a-f0-9]{64}$/i.test(suppliedToken))throw new BadRequestException(apiError('merchant.store.deleteLinkInvalid'));const requestTime=store.deletionRequestedAt?.getTime();if(!requestTime||Date.now()-requestTime>24*60*60*1000)throw new BadRequestException('Mağaza silme onay bağlantısının süresi doldu; yeniden talep oluşturulması gerekiyor');const hash=createHash('sha256').update(suppliedToken).digest('hex');const expectedHash=String(store.deletionRequestTokenHash);if(!/^[a-f0-9]{64}$/i.test(expectedHash)||!timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(expectedHash,'hex')))throw new BadRequestException(apiError('merchant.store.deleteLinkInvalid'));const now=new Date(),scheduled=new Date(now.getTime()+15*86400000);const result=await this.prisma.tenant.updateMany({where:{id:storeId,deletionConfirmedAt:null,deletionRequestTokenHash:hash,deletionRequestedAt:{gte:new Date(Date.now()-24*60*60*1000)},status:{in:['TRIAL','ACTIVE']}},data:{status:'SUSPENDED',deletionConfirmedAt:now,deletionScheduledAt:scheduled,deletionRequestTokenHash:null}});if(result.count!==1)throw new BadRequestException('Mağaza kapatma talebi artık geçerli değil');return{confirmed:true,scheduledAt:scheduled,storeStatus:'SUSPENDED'};
  }
  async cancelStoreDeletion(tenantId:string,userId:string,storeId:string){
    if(tenantId!==storeId)throw new ForbiddenException();await this.ownerForStoreDeletion(tenantId,userId);const result=await this.prisma.tenant.updateMany({where:{id:storeId,deletionConfirmedAt:null,deletionRequestTokenHash:{not:null}},data:{deletionRequestedAt:null,deletionConfirmedAt:null,deletionScheduledAt:null,deletionRequestTokenHash:null}});if(result.count!==1)throw new BadRequestException('Onaylanan mağaza kapatma talebi yalnız Super Admin tarafından incelenebilir');return{canceled:true};
  }

  private async warehouseScope(tenantId:string,userId?:string,permission:'stock'|'fulfill'|'transfer'|'return'='stock'){
    if(!userId)return null;
    const membership=await this.prisma.membership.findUnique({where:{userId_tenantId:{userId,tenantId}},include:{warehouseAssignments:true}});
    if(!membership)return [];
    if(membership.role==='OWNER'||membership.role==='ADMIN')return null;
    const rows=(membership.warehouseAssignments||[]).filter((x:any)=>permission==='stock'?x.canManageStock!==false:permission==='transfer'?x.canTransfer!==false:permission==='return'?x.canReceiveReturns!==false:x.canFulfillOrders!==false);
    // Staff without an explicit warehouse assignment has no warehouse-operation access.
    return rows.map((x:any)=>String(x.warehouseId));
  }
  private async syncMembershipWarehouses(tenantId:string,membershipId:string,body:any){
    if(!Array.isArray(body?.warehouseIds)&&body?.primaryWarehouseId===undefined)return;
    const ids:string[]=Array.from(new Set<string>((Array.isArray(body?.warehouseIds)?body.warehouseIds:[]).map((x:any)=>String(x)).filter(Boolean)));
    const primary=body?.primaryWarehouseId?String(body.primaryWarehouseId):'';if(primary&&!ids.includes(primary))ids.unshift(primary);
    if(ids.length){const count=await this.prisma.warehouse.count({where:{id:{in:ids},storeId:tenantId,isActive:true}});if(count!==ids.length)throw new BadRequestException('Bir veya daha fazla depo mağazaya ait değil');}
    await this.prisma.$transaction(async tx=>{await tx.membershipWarehouse.deleteMany({where:{membershipId}});if(ids.length)await tx.membershipWarehouse.createMany({data:ids.map((warehouseId:string)=>({membershipId,warehouseId,isPrimary:warehouseId===primary,canManageStock:body?.canManageStock!==false,canFulfillOrders:body?.canFulfillOrders!==false,canTransfer:body?.canTransfer!==false,canReceiveReturns:body?.canReceiveReturns!==false}))});});
  }
  async team(tenantId: string) {
    return this.prisma.membership.findMany({ where: { tenantId }, include: { customRole: true, warehouseAssignments:{include:{warehouse:true}}, user: { select: { id: true, email: true, name: true, createdAt: true } } }, orderBy: { user: { createdAt: 'asc' } } });
  }
  async addTeamMember(tenantId: string, body: any) {
    const sub = await this.prisma.subscription.findFirst({ where: { tenantId, status: { in: ['TRIAL','ACTIVE'] } }, include: { plan: true }, orderBy: { createdAt: 'desc' } });
    if (sub) { const count = await this.prisma.membership.count({ where: { tenantId } }); if (count >= sub.plan.maxStaff) throw new BadRequestException(`Plan allows ${sub.plan.maxStaff} staff members`); }
    const email = String(body.email || '').toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const pw = String(body.password || '');
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(pw)) throw new BadRequestException('New user password must be 12+ chars with upper/lower/number/symbol');
      user = await this.prisma.user.create({ data: { email, name: body.name, passwordHash: await bcrypt.hash(pw, 12) } });
    }
    const existingMembership = await this.prisma.membership.findFirst({ where: { userId: user.id }, select: { tenantId: true } });
    if (existingMembership && existingMembership.tenantId !== tenantId) {
      throw new BadRequestException('Bu kullanıcı başka bir Ticarti mağazasına bağlı. Bir kullanıcı yalnızca tek mağazaya bağlanabilir.');
    }
    if (body.customRoleId) {
      const role = await this.prisma.customRole.findFirst({ where: { id: body.customRoleId, tenantId } });
      if (!role) throw new BadRequestException('Role does not belong to tenant');
    }
    const membership = await this.prisma.membership.upsert({ where: { userId_tenantId: { userId: user.id, tenantId } }, create: { userId: user.id, tenantId, role: body.role || 'STAFF', customRoleId: body.customRoleId || null }, update: { role: body.role || 'STAFF', customRoleId: body.customRoleId || null } });
    await this.syncMembershipWarehouses(tenantId,membership.id,body);
    return this.prisma.membership.findUnique({ where: { id: membership.id }, include: { customRole: true, warehouseAssignments:{include:{warehouse:true}}, user: { select: { id: true, email: true, name: true } } } });
  }
  async updateTeamMember(tenantId: string, membershipId: string, body: any) {
    const membership = await this.prisma.membership.findFirst({ where: { id: membershipId, tenantId }, include: { user: true } });
    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.role === 'OWNER' && body.role && body.role !== 'OWNER') {
      const owners = await this.prisma.membership.count({ where: { tenantId, role: 'OWNER' } });
      if (owners <= 1) throw new BadRequestException('The last owner cannot be downgraded');
    }
    if (body.customRoleId) {
      const role = await this.prisma.customRole.findFirst({ where: { id: body.customRoleId, tenantId } });
      if (!role) throw new BadRequestException('Role does not belong to tenant');
    }
    await this.prisma.membership.update({ where: { id: membershipId }, data: { ...(body.role ? { role: body.role } : {}), ...(body.customRoleId !== undefined ? { customRoleId: body.customRoleId || null } : {}) } });
    await this.syncMembershipWarehouses(tenantId,membershipId,body);
    if (body.name !== undefined) await this.prisma.user.update({ where: { id: membership.userId }, data: { name: body.name } });
    return this.prisma.membership.findUnique({ where: { id: membershipId }, include: { customRole: true, warehouseAssignments:{include:{warehouse:true}}, user: { select: { id: true, email: true, name: true } } } });
  }

  async removeTeamMember(tenantId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.role === 'OWNER') {
      const owners = await this.prisma.membership.count({ where: { tenantId, role: 'OWNER' } });
      if (owners <= 1) throw new BadRequestException('The last owner cannot be removed');
    }
    await this.prisma.membership.delete({ where: { id: membershipId } });
    return { removed: true };
  }

  async subscription(tenantId: string) {
    return this.prisma.subscription.findFirst({ where: { tenantId, status: { in: ['TRIAL','ACTIVE','PAST_DUE'] } }, include: { plan: true }, orderBy: { createdAt: 'desc' } });
  }

  async planCatalog(tenantId: string) {
    const [current, plans] = await Promise.all([
      this.prisma.subscription.findFirst({ where: { tenantId, status: { in: ['TRIAL','ACTIVE','PAST_DUE'] } }, include: { plan: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.plan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }] }),
    ]);
    return { current, plans };
  }

  async requestPlanUpgrade(tenantId: string, userId: string, planId: string, body: any) {
    const [plan, current] = await Promise.all([
      this.prisma.plan.findFirst({ where: { id: planId, isActive: true } }),
      this.prisma.subscription.findFirst({ where: { tenantId, status: { in: ['TRIAL','ACTIVE','PAST_DUE'] } }, include: { plan: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    if (!plan) throw new NotFoundException('Plan not found');
    if (current?.planId === plan.id) throw new BadRequestException('Bu paket zaten aktif');
    const billing = String(body?.billing || 'YEARLY').toUpperCase() === 'MONTHLY' ? 'Aylık' : 'Yıllık';
    const message = `Mevcut paket: ${current?.plan?.name || 'Yok'}\nTalep edilen paket: ${plan.name}\nÖdeme tercihi: ${billing}`;
    return this.prisma.supportTicket.create({
      data: {
        tenantId,
        subject: `Paket yükseltme talebi — ${plan.name}`,
        category: 'BILLING',
        priority: 'NORMAL',
        createdById: userId,
        messages: { create: { userId, authorType: 'merchant', body: message } },
      },
      include: { messages: true },
    });
  }

  private presentAdminProduct(row:any){
    return {...row,togetherProductIds:(row.outgoingRelations||[]).filter((r:any)=>r.type==='COMPLEMENTARY').map((r:any)=>String(r.targetProductId)),togetherProducts:(row.outgoingRelations||[]).filter((r:any)=>r.type==='COMPLEMENTARY').map((r:any)=>r.targetProduct).filter(Boolean),variants:(row.variants||[]).map((v:any)=>{const selectedOptions:Record<string,string>={};for(const link of v.optionValues||[]){const option=link?.optionValue?.option;const value=link?.optionValue;if(option?.name&&value?.name)selectedOptions[String(option.name)]=String(value.name)}const stocks=v.warehouseStocks||[];const totals={onHand:stocks.reduce((a:number,x:any)=>a+Number(x.onHand||0),0),reserved:stocks.reduce((a:number,x:any)=>a+Number(x.reserved||0),0),committed:stocks.reduce((a:number,x:any)=>a+Number(x.committed||0),0),incoming:stocks.reduce((a:number,x:any)=>a+Number(x.incoming||0),0),damaged:stocks.reduce((a:number,x:any)=>a+Number(x.damaged||0),0),safetyStock:stocks.reduce((a:number,x:any)=>a+Number(x.safetyStock||0),0)};return {...v,inventory:{...(v.inventory||{}),...totals,available:totals.onHand-totals.reserved-totals.committed-totals.damaged-totals.safetyStock},selectedOptions,mediaIds:(v.media||[]).map((m:any)=>m.imageId||m.image?.id).filter(Boolean)}})};
  }

  async products(tenantId: string, storeId: string, q?: string) {
    await this.assertStore(tenantId, storeId);
    return this.prisma.product.findMany({
      where: { storeId, ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } }] } : {}) },
      include: { brand: true, images: { orderBy: { sortOrder: 'asc' } }, options:{orderBy:{position:'asc'},include:{values:{orderBy:{position:'asc'}}}}, collections:{include:{collection:true}}, suppliers:{include:{supplier:true}},personalizations:{include:{personalization:true}},metafields:{include:{definition:true}}, outgoingRelations:{where:{type:'COMPLEMENTARY'},include:{targetProduct:{select:{id:true,title:true,slug:true,images:{orderBy:{sortOrder:'asc'},take:1},variants:{where:{isActive:true},take:1,select:{price:true}}}}}}, categories: { include: { category: true } }, variants: { include: { inventory: true, warehouseStocks:{include:{warehouse:true}}, quantityRule:true, optionValues:{include:{optionValue:{include:{option:true}}}}, media:{include:{image:true}} } } },
      orderBy: { createdAt: 'desc' },
      take: q ? 100 : 250,
    }).then(async rows=>{const trs=rows.length?await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'product',entityId:{in:rows.map(x=>x.id)}}}):[];return rows.map(x=>this.presentAdminProduct({...x,translations:trs.filter(t=>t.entityId===x.id).map(t=>({locale:t.locale,fields:t.fields}))}));});
  }

  async product(tenantId:string,storeId:string,id:string){
    await this.assertStore(tenantId,storeId);
    const row=await this.prisma.product.findFirst({where:{id,storeId},include:{brand:true,images:{orderBy:{sortOrder:'asc'}},options:{orderBy:{position:'asc'},include:{values:{orderBy:{position:'asc'}}}},collections:{include:{collection:true}},suppliers:{include:{supplier:true}},personalizations:{include:{personalization:true}},metafields:{include:{definition:true}},outgoingRelations:{where:{type:'COMPLEMENTARY'},include:{targetProduct:{select:{id:true,title:true,slug:true,images:{orderBy:{sortOrder:'asc'},take:1},variants:{where:{isActive:true},take:1,select:{price:true}}}}}},categories:{include:{category:true}},variants:{include:{inventory:true,warehouseStocks:{include:{warehouse:true}},quantityRule:true,optionValues:{include:{optionValue:{include:{option:true}}}},media:{include:{image:true}}}}}});
    if(!row)throw new NotFoundException('Product not found');
    const translations=await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'product',entityId:id}});
    return this.presentAdminProduct({...row,translations:translations.map(t=>({locale:t.locale,fields:t.fields}))});
  }

  private normalizeTranslations(body:any, entityType:string){
    const rows=Array.isArray(body.translations)?body.translations:[];
    return rows.filter((x:any)=>x&&x.locale&&x.fields).map((x:any)=>({locale:String(x.locale),fields:x.fields||{},entityType}));
  }
  private async saveEntityTranslations(tx:any,storeId:string,entityType:string,entityId:string,body:any){
    if(body.translations===undefined)return;
    const rows=this.normalizeTranslations(body,entityType);await tx.contentTranslation.deleteMany({where:{storeId,entityType,entityId}});if(rows.length)await tx.contentTranslation.createMany({data:rows.map((x:any)=>({storeId,entityType,entityId,locale:x.locale,fields:x.fields}))});
  }

  private setConfig(product:any){
    const meta:any=product?.metadata||{};const set:any=meta?.set||{};
    const items=Array.isArray(set.items)?set.items.filter((x:any)=>x?.variantId&&Number(x.quantity)>0).map((x:any)=>({variantId:String(x.variantId),quantity:Math.max(1,Number(x.quantity||1))})):[];
    return {stockMode:set.stockMode==='COMPONENTS'?'COMPONENTS':'SELF',items};
  }
  private async validateSetConfig(storeId:string,body:any,selfProductId?:string){
    if(String(body?.productType||'SIMPLE').toUpperCase()!=='SET')return;
    const cfg=this.setConfig({metadata:body?.metadata});if(cfg.stockMode!=='COMPONENTS')return;
    if(!cfg.items.length)throw new BadRequestException('Set product requires at least one component');
    const ids:string[]=Array.from(new Set<string>(cfg.items.map((x:any)=>String(x.variantId))));
    const variants=await this.prisma.variant.findMany({where:{id:{in:ids},product:{storeId}},select:{id:true,productId:true,product:{select:{productType:true,metadata:true}}}});
    if(variants.length!==ids.length)throw new BadRequestException('One or more set components do not belong to store');
    if(selfProductId&&variants.some(v=>v.productId===selfProductId))throw new BadRequestException('A set product cannot contain its own variants');
    if(variants.some((v:any)=>String(v.product?.productType||'').toUpperCase()==='SET'&&this.setConfig(v.product).stockMode==='COMPONENTS'))throw new BadRequestException('A component-stock set cannot contain another component-stock set');
  }
  private async ensureDefaultWarehouse(db:any,storeId:string){
    let row=await db.warehouse.findFirst({where:{storeId,isDefault:true,isActive:true},orderBy:{priority:'asc'}});
    if(!row)row=await db.warehouse.findFirst({where:{storeId,isActive:true},orderBy:[{priority:'asc'},{createdAt:'asc'}]});
    if(!row)row=await db.warehouse.create({data:{storeId,name:'Ana Depo',code:'MAIN',isDefault:true,isActive:true,priority:0}});
    return row;
  }
  private async setDefaultWarehouseStock(db:any,storeId:string,variantId:string,onHand:number){
    const warehouse=await this.ensureDefaultWarehouse(db,storeId);
    return db.warehouseStock.upsert({where:{warehouseId_variantId:{warehouseId:warehouse.id,variantId}},create:{warehouseId:warehouse.id,variantId,onHand:Math.max(0,Math.floor(Number(onHand||0)))},update:{onHand:Math.max(0,Math.floor(Number(onHand||0)))}});
  }

  private async allocateWarehouseStock(db:any,storeId:string,variant:any,quantity:number){
    const stockPolicy=variant.inventory||await db.inventoryItem.findUnique({where:{variantId:variant.id}});
    if(!stockPolicy?.trackStock)return[{variant,variantId:variant.id,quantity,inventory:stockPolicy,warehouseId:null,warehouseStock:null}];
    const store=await db.tenant.findUnique({where:{id:storeId},select:{settings:true}});const settings:any=store?.settings||{};const cfg:any=settings.inventoryPolicy||{};
    const requestedMode=String(cfg.allocationPolicy||'SINGLE_WAREHOUSE').toUpperCase();const supported=new Set(['SINGLE_WAREHOUSE','STRICT_SINGLE_WAREHOUSE','PRIORITY','NEAREST','COST_OPTIMIZED','TRANSFER_TO_PRIMARY']);const mode=(supported.has(requestedMode)?requestedMode:'SINGLE_WAREHOUSE') as RoutingPolicy;const splitAllowed=mode==='STRICT_SINGLE_WAREHOUSE'?false:cfg.splitAllowed!==false;
    const stocks=await db.warehouseStock.findMany({where:{variantId:variant.id,warehouse:{storeId,isActive:true}},include:{warehouse:true}});
    const available=(x:any)=>Math.max(0,Number(x.onHand)-Number(x.reserved)-Number(x.committed)-Number(x.damaged)-Number(x.safetyStock));
    const distanceMap:any=cfg.distanceKmByWarehouse||{};const costMap:any=cfg.unitCostByWarehouse||{};
    let candidates=stocks.map((x:any)=>({warehouseId:String(x.warehouseId),available:available(x),priority:Number(x.warehouse?.priority??100),isDefault:!!x.warehouse?.isDefault,distanceKm:Number.isFinite(Number(distanceMap[x.warehouseId]))?Number(distanceMap[x.warehouseId]):undefined,unitCost:Number.isFinite(Number(costMap[x.warehouseId]))?Number(costMap[x.warehouseId]):undefined}));const strictWarehouseId=String(cfg.onlineWarehouseId||'');if(mode==='STRICT_SINGLE_WAREHOUSE'){if(!strictWarehouseId)throw new BadRequestException('Online satış deposu seçilmelidir');candidates=candidates.filter((x:any)=>x.warehouseId===strictWarehouseId);}
    const transferTargetId=mode==='TRANSFER_TO_PRIMARY'?String(cfg.transferTargetWarehouseId||stocks.find((x:any)=>x.warehouse?.isDefault)?.warehouseId||stocks[0]?.warehouseId||''):'';
    const totalAvailable=candidates.reduce((n:number,x:any)=>n+x.available,0);const wanted=Math.max(0,Number(quantity||0));const allocatable=stockPolicy.allowBackorder?Math.min(wanted,totalAvailable):wanted;
    let decisions=allocatable>0?routeInventory(candidates,allocatable,mode,splitAllowed):[];
    if(!decisions.length&&allocatable>0&&!stockPolicy.allowBackorder)throw new BadRequestException(`Insufficient stock for ${variant.sku}`);
    if(!stockPolicy.allowBackorder&&decisions.reduce((n:number,x:any)=>n+x.quantity,0)<wanted)throw new BadRequestException(`Insufficient stock for ${variant.sku}`);
    const stockByWarehouse=new Map(stocks.map((x:any)=>[String(x.warehouseId),x]));const out:any[]=decisions.map((d:any)=>({variant,variantId:variant.id,quantity:d.quantity,inventory:stockPolicy,warehouseId:d.warehouseId,warehouseStock:stockByWarehouse.get(String(d.warehouseId)),transferTargetWarehouseId:transferTargetId&&d.warehouseId!==transferTargetId?transferTargetId:null}));
    const allocated=out.reduce((n:number,x:any)=>n+Number(x.quantity||0),0);const remaining=Math.max(0,wanted-allocated);
    if(remaining>0){if(!stockPolicy.allowBackorder)throw new BadRequestException(`Insufficient stock for ${variant.sku}`);const warehouse=stocks.find((x:any)=>x.warehouseId===transferTargetId)?.warehouse||stocks.find((x:any)=>x.warehouse?.isDefault)?.warehouse||stocks[0]?.warehouse||await this.ensureDefaultWarehouse(db,storeId);let stock=stocks.find((x:any)=>x.warehouseId===warehouse.id);if(!stock)stock=await db.warehouseStock.upsert({where:{warehouseId_variantId:{warehouseId:warehouse.id,variantId:variant.id}},create:{warehouseId:warehouse.id,variantId:variant.id,onHand:0},update:{}});out.push({variant,variantId:variant.id,quantity:remaining,inventory:stockPolicy,warehouseId:warehouse.id,warehouseStock:stock,transferTargetWarehouseId:null});}
    return out;
  }

  private async inventoryTargetsForVariant(storeId:string,variantId:string,quantity:number,db:any=this.prisma){
    const variant=await db.variant.findFirst({where:{id:variantId,product:{storeId}},include:{inventory:true,product:true}});if(!variant)return[];
    const cfg=this.setConfig(variant.product);
    if(String(variant.product.productType||'').toUpperCase()==='SET'&&cfg.stockMode==='COMPONENTS'&&cfg.items.length){const ids=cfg.items.map((x:any)=>x.variantId);const rows=await db.variant.findMany({where:{id:{in:ids},product:{storeId}},include:{inventory:true,product:true}});const map=new Map(rows.map((x:any)=>[x.id,x]));const out:any[]=[];for(const x of cfg.items){const component:any=map.get(x.variantId);if(component)out.push(...await this.allocateWarehouseStock(db,storeId,component,x.quantity*quantity));}return out;}
    return this.allocateWarehouseStock(db,storeId,variant,quantity);
  }


  private normalizeProductOptions(body:any){
    const explicit=Array.isArray(body?.options)?body.options:[];
    if(explicit.length>3)throw new BadRequestException('A product can have at most 3 options');
    const options=explicit.map((o:any,position:number)=>({
      name:String(o?.name||'').trim(),
      presetId:String(o?.presetId||'').trim()||null,
      position,
      values:(Array.isArray(o?.values)?o.values:[]).map((v:any,i:number)=>({name:String(typeof v==='string'?v:v?.name||'').trim(),presetValueId:typeof v==='object'?String(v?.presetValueId||'').trim()||null:null,position:i,swatch:typeof v==='object'?v?.swatch:null})).filter((v:any)=>v.name)
    })).filter((o:any)=>o.name&&o.values.length);
    const seen=new Set<string>();
    for(const option of options){
      const key=option.name.toLocaleLowerCase('tr-TR');
      if(seen.has(key))throw new BadRequestException(`Duplicate option: ${option.name}`);
      seen.add(key);
      const values=new Set<string>();
      for(const value of option.values){const valueKey=value.name.toLocaleLowerCase('tr-TR');if(values.has(valueKey))throw new BadRequestException(`Duplicate ${option.name} value: ${value.name}`);values.add(valueKey)}
    }
    return options;
  }

  private variantSelectedOptions(source:any){const raw=source?.selectedOptions&&typeof source.selectedOptions==='object'&&!Array.isArray(source.selectedOptions)?source.selectedOptions:{};const out:Record<string,string>={};for(const [k,v] of Object.entries(raw)){const name=String(k||'').trim(),value=String(v??'').trim();if(name&&value)out[name]=value}return out;}

  private async syncNormalizedProductCatalog(tx:any,productId:string,body:any){
    const options=this.normalizeProductOptions(body);
    const variantsInput=Array.isArray(body?.variants)?body.variants:[];
    if(options.length&&!variantsInput.length)throw new BadRequestException('Variants are required when product options are defined');
    if(!options.length&&variantsInput.length>1)throw new BadRequestException('Multiple variants require product options');
    await tx.variantOptionValue.deleteMany({where:{variant:{productId}}});
    await tx.productOption.deleteMany({where:{productId}});
    const valueIds=new Map<string,string>();
    // Validate all IDs against the owning store. Never match option names across languages.
    const storeProduct=await tx.product.findUniqueOrThrow({where:{id:productId},select:{storeId:true}});
    for(const option of options){
      let preset:any=null;
      if(option.presetId){
        preset=await tx.optionPreset.findFirst({where:{id:option.presetId,storeId:storeProduct.storeId,isActive:true}});
        if(!preset)throw new BadRequestException('Selected variant definition does not belong to this store');
      }
      const presetValues=Array.isArray((preset?.values as any)?.items)?(preset.values as any).items:[];
      const allowedIds=new Set(presetValues.map((v:any)=>String(v.id||'')));
      const created=await tx.productOption.create({data:{productId,name:option.name,presetId:option.presetId,displayType:String((preset?.values as any)?.displayType||'button'),position:option.position}});
      for(const value of option.values){
        if(value.presetValueId&&(!preset||!allowedIds.has(value.presetValueId)))throw new BadRequestException('Invalid variant definition value');
        const row=await tx.productOptionValue.create({data:{optionId:created.id,name:value.name,presetValueId:value.presetValueId,position:value.position,swatch:value.swatch||undefined}});
        valueIds.set(`${option.name}\u0000${value.name}`,row.id);
      }
    }
    const dbVariants=await tx.variant.findMany({where:{productId},select:{id:true,sku:true,isActive:true}});
    const incomingById=new Map(variantsInput.filter((v:any)=>v?.id).map((v:any)=>[String(v.id),v]));
    const incomingBySku=new Map(variantsInput.filter((v:any)=>v?.sku).map((v:any)=>[String(v.sku),v]));
    const combinationKeys=new Set<string>();
    for(const variant of dbVariants){
      const source:any=incomingById.get(String(variant.id))||incomingBySku.get(String(variant.sku));
      if(!source){if(options.length&&variant.isActive)throw new BadRequestException(`Active variant ${variant.sku} is missing from the option matrix`);continue;}
      const selected=this.variantSelectedOptions(source);
      if(options.length){
        const allowedNames=new Set(options.map((o:any)=>o.name));
        for(const name of Object.keys(selected))if(!allowedNames.has(name))throw new BadRequestException(`Variant ${variant.sku}: unknown option ${name}`);
        for(const option of options){
          if(!selected[option.name])throw new BadRequestException(`Variant ${variant.sku}: ${option.name} selection is required`);
          const valueId=valueIds.get(`${option.name}\u0000${selected[option.name]}`);
          if(!valueId)throw new BadRequestException(`Variant ${variant.sku}: invalid ${option.name} value`);
          await tx.variantOptionValue.create({data:{variantId:variant.id,optionValueId:valueId}});
        }
        const combo=options.map((o:any)=>selected[o.name]).join('\u0001');
        if(combinationKeys.has(combo))throw new BadRequestException('Duplicate variant option combination');
        combinationKeys.add(combo);
      }else if(Object.keys(selected).length){
        throw new BadRequestException(`Variant ${variant.sku}: selectedOptions requires product options`);
      }
      const q=source.quantityRule||{};
      const minimum=Math.max(1,Number(q.minimum||1)),increment=Math.max(1,Number(q.increment||1)),maximum=q.maximum==null||q.maximum===''?null:Math.max(minimum,Number(q.maximum));
      await tx.variantQuantityRule.upsert({where:{variantId:variant.id},create:{variantId:variant.id,minimum,maximum,increment},update:{minimum,maximum,increment}});
    }
    if(Array.isArray(body?.supplierIds)){const ids=Array.from(new Set(body.supplierIds.map(String))) as string[];const valid=ids.length?await tx.supplier.count({where:{id:{in:ids},storeId:(await tx.product.findUniqueOrThrow({where:{id:productId},select:{storeId:true}})).storeId}}):0;if(valid!==ids.length)throw new BadRequestException('One or more suppliers do not belong to store');await tx.productSupplier.deleteMany({where:{productId}});if(ids.length)await tx.productSupplier.createMany({data:ids.map((supplierId:string,index:number)=>({productId,supplierId,isPrimary:index===0}))});}
    if(Array.isArray(body?.personalizationIds)){const storeId=(await tx.product.findUniqueOrThrow({where:{id:productId},select:{storeId:true}})).storeId;const ids=Array.from(new Set(body.personalizationIds.map(String))) as string[];const valid=ids.length?await tx.personalizationDefinition.count({where:{id:{in:ids},storeId}}):0;if(valid!==ids.length)throw new BadRequestException('One or more personalization definitions do not belong to store');await tx.productPersonalization.deleteMany({where:{productId}});if(ids.length)await tx.productPersonalization.createMany({data:ids.map((personalizationId:string)=>({productId,personalizationId,required:false}))});}
    if(body?.metafields&&typeof body.metafields==='object'&&!Array.isArray(body.metafields)){const storeId=(await tx.product.findUniqueOrThrow({where:{id:productId},select:{storeId:true}})).storeId;await tx.productMetafieldValue.deleteMany({where:{productId}});for(const [definitionId,value] of Object.entries(body.metafields)){const def=await tx.metafieldDefinition.findFirst({where:{id:String(definitionId),storeId}});if(!def)throw new BadRequestException('Metafield definition does not belong to store');await tx.productMetafieldValue.create({data:{productId,definitionId:String(definitionId),value:value as any}});}}
    await tx.variantMedia.deleteMany({where:{variant:{productId}}});
    const images=await tx.productImage.findMany({where:{productId}});
    const imageByUrl=new Map(images.map((x:any)=>[String(x.url),x.id]));
    for(const img of Array.isArray(body?.images)?body.images:[]){const imageId=img?.id&&images.some((x:any)=>x.id===img.id)?String(img.id):imageByUrl.get(String(img?.url||''));if(!imageId)continue;for(const sku of Array.isArray(img?.variantSkus)?img.variantSkus.map(String):[]){const variant=dbVariants.find((x:any)=>String(x.sku)===sku);if(variant)await tx.variantMedia.create({data:{variantId:variant.id,imageId}})}}
  }


  async collections(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);const rows=await this.prisma.collection.findMany({where:{storeId},include:{products:{include:{product:true}},rules:true},orderBy:[{sortOrder:'asc'},{title:'asc'}]});const trs=rows.length?await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'collection',entityId:{in:rows.map((x:any)=>x.id)}}}):[];return rows.map((x:any)=>({...x,translations:trs.filter((t:any)=>t.entityId===x.id).map((t:any)=>({locale:t.locale,fields:t.fields}))}));}
  async createCollection(tenantId:string,storeId:string,body:any){await this.assertStore(tenantId,storeId);const productIds:string[]=[...new Set<string>((Array.isArray(body.productIds)?body.productIds:[]).map((x:any)=>String(x)))];if(productIds.length){const count=await this.prisma.product.count({where:{id:{in:productIds},storeId}});if(count!==productIds.length)throw new BadRequestException('One or more products do not belong to store')}return this.prisma.$transaction(async tx=>{const row=await tx.collection.create({data:{storeId,title:String(body.title||'').trim(),slug:this.slugify(body.slug||body.title),description:body.description||null,mode:String(body.mode||'MANUAL').toUpperCase()==='AUTOMATED'?'AUTOMATED':'MANUAL',isActive:body.isActive!==false,sortOrder:Number(body.sortOrder||0),products:{create:productIds.map((productId:string,position:number)=>({productId,position}))},rules:{create:(Array.isArray(body.rules)?body.rules:[]).map((r:any,position:number)=>({field:String(r.field||''),operator:String(r.operator||'equals'),value:r.value??null,position}))}}});await this.saveEntityTranslations(tx,storeId,'collection',row.id,body);return tx.collection.findUnique({where:{id:row.id},include:{products:true,rules:true}});});}
  async updateCollection(tenantId:string,storeId:string,id:string,body:any){await this.assertStore(tenantId,storeId);const row=await this.prisma.collection.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException('Collection not found');return this.prisma.$transaction(async tx=>{const data:any={};for(const k of ['title','description','isActive','sortOrder'])if(body[k]!==undefined)data[k]=body[k];if(body.slug!==undefined||body.title!==undefined)data.slug=this.slugify(body.slug||body.title||row.slug);if(body.mode!==undefined)data.mode=String(body.mode).toUpperCase()==='AUTOMATED'?'AUTOMATED':'MANUAL';await tx.collection.update({where:{id},data});if(Array.isArray(body.productIds)){const ids=[...new Set(body.productIds.map(String))] as string[];const count=ids.length?await tx.product.count({where:{id:{in:ids},storeId}}):0;if(count!==ids.length)throw new BadRequestException('One or more products do not belong to store');await tx.collectionProduct.deleteMany({where:{collectionId:id}});if(ids.length)await tx.collectionProduct.createMany({data:ids.map((productId:string,position:number)=>({collectionId:id,productId,position}))})}if(Array.isArray(body.rules)){await tx.collectionRule.deleteMany({where:{collectionId:id}});if(body.rules.length)await tx.collectionRule.createMany({data:body.rules.map((r:any,position:number)=>({collectionId:id,field:String(r.field||''),operator:String(r.operator||'equals'),value:r.value??null,position}))})}await this.saveEntityTranslations(tx,storeId,'collection',id,body);return tx.collection.findUnique({where:{id},include:{products:true,rules:true}})})}

  async deleteCollection(tenantId:string,storeId:string,id:string){
    await this.assertStore(tenantId,storeId);
    const row=await this.prisma.collection.findFirst({where:{id,storeId},select:{id:true}});
    if(!row)throw new NotFoundException('Collection not found');
    await this.prisma.collection.delete({where:{id}});
    return {deleted:true,id};
  }

  async sellingPlanGroups(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);return this.prisma.sellingPlanGroup.findMany({where:{storeId},include:{plans:{include:{variants:true}}},orderBy:{createdAt:'desc'}});}
  async createSellingPlanGroup(tenantId:string,storeId:string,body:any){await this.assertStore(tenantId,storeId);const plans=Array.isArray(body?.plans)?body.plans:[];return this.prisma.$transaction(async tx=>{const group=await tx.sellingPlanGroup.create({data:{storeId,name:String(body.name||'').trim(),kind:String(body.kind||'SUBSCRIPTION').toUpperCase(),description:body.description||null}});for(const plan of plans){const variantIds=Array.from(new Set((Array.isArray(plan.variantIds)?plan.variantIds:[]).map(String))) as string[];if(variantIds.length){const count=await tx.variant.count({where:{id:{in:variantIds},product:{storeId}}});if(count!==variantIds.length)throw new BadRequestException('One or more selling plan variants do not belong to store');}await tx.sellingPlan.create({data:{groupId:group.id,name:String(plan.name||body.name||'Plan').trim(),billingPolicy:plan.billingPolicy||{},deliveryPolicy:plan.deliveryPolicy||{},pricingPolicy:plan.pricingPolicy||{},isActive:plan.isActive!==false,variants:{create:variantIds.map((variantId:string)=>({variantId}))}}});}return tx.sellingPlanGroup.findUnique({where:{id:group.id},include:{plans:{include:{variants:true}}}});});}
  async updateSellingPlanGroup(tenantId:string,storeId:string,id:string,body:any){await this.assertStore(tenantId,storeId);const group=await this.prisma.sellingPlanGroup.findFirst({where:{id,storeId}});if(!group)throw new NotFoundException('Selling plan group not found');return this.prisma.$transaction(async tx=>{const data:any={};for(const k of ['name','description','kind'])if(body[k]!==undefined)data[k]=k==='kind'?String(body[k]).toUpperCase():body[k];await tx.sellingPlanGroup.update({where:{id},data});if(Array.isArray(body.plans)){await tx.sellingPlan.deleteMany({where:{groupId:id}});for(const plan of body.plans){const variantIds=Array.from(new Set((Array.isArray(plan.variantIds)?plan.variantIds:[]).map(String))) as string[];if(variantIds.length){const count=await tx.variant.count({where:{id:{in:variantIds},product:{storeId}}});if(count!==variantIds.length)throw new BadRequestException('One or more selling plan variants do not belong to store');}await tx.sellingPlan.create({data:{groupId:id,name:String(plan.name||'Plan'),billingPolicy:plan.billingPolicy||{},deliveryPolicy:plan.deliveryPolicy||{},pricingPolicy:plan.pricingPolicy||{},isActive:plan.isActive!==false,variants:{create:variantIds.map((variantId:string)=>({variantId}))}}});}}return tx.sellingPlanGroup.findUnique({where:{id},include:{plans:{include:{variants:true}}}});});}

  private async syncTogetherProducts(tx:any,storeId:string,sourceProductId:string,raw:any){
    if(raw===undefined)return;
    const ids=Array.from(new Set((Array.isArray(raw)?raw:[]).map((x:any)=>String(x)).filter((x:string)=>x&&x!==sourceProductId))) as string[];
    if(ids.length){const count=await tx.product.count({where:{id:{in:ids},storeId}});if(count!==ids.length)throw new BadRequestException('One or more together products do not belong to store');}
    await tx.productRelation.deleteMany({where:{sourceProductId,type:'COMPLEMENTARY'}});
    if(ids.length)await tx.productRelation.createMany({data:ids.map((targetProductId:string,position:number)=>({sourceProductId,targetProductId,type:'COMPLEMENTARY',position}))});
  }

  private async validatePriceCurrency(storeId:string,raw:any){
    const store=await this.prisma.tenant.findUnique({where:{id:storeId},select:{currency:true}});
    if(!store)throw new NotFoundException('Store not found');
    const code=String(raw||store.currency||'TRY').trim().toUpperCase();
    if(!/^[A-Z]{3}$/.test(code))throw new BadRequestException('Invalid ISO currency code');
    if(code!==String(store.currency).toUpperCase()){
      const configured=await this.prisma.storeCurrency.findFirst({where:{storeId,code,isEnabled:true}});
      if(!configured)throw new BadRequestException('Currency not enabled for this store');
    }
    return code;
  }
  private validateProductVariantInput(v:any){const price=Number(v?.price??0);const compare=v?.comparePrice===null||v?.comparePrice===undefined||v?.comparePrice===''?null:Number(v.comparePrice);const cost=v?.cost===null||v?.cost===undefined||v?.cost===''?null:Number(v.cost);if(!Number.isFinite(price)||price<0)throw new BadRequestException('Variant price must be zero or greater');if(compare!==null&&(!Number.isFinite(compare)||compare<=price))throw new BadRequestException('Compare price must be greater than price');if(cost!==null&&(!Number.isFinite(cost)||cost<0))throw new BadRequestException('Cost must be zero or greater');if(v?.gtin&&!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(String(v.gtin).trim()))throw new BadRequestException('GTIN must be 8, 12, 13 or 14 digits');const q=v?.quantityRule||{};const minimum=Math.max(1,Math.floor(Number(q.minimum??1)));const increment=Math.max(1,Math.floor(Number(q.increment??1)));const maximum=q.maximum===null||q.maximum===undefined||q.maximum===''?null:Math.floor(Number(q.maximum));if(maximum!==null&&(maximum<minimum||(maximum-minimum)%increment!==0))throw new BadRequestException('Invalid quantity rule');return {...v,price,comparePrice:compare,cost,quantityRule:{...q,minimum,maximum,increment},lowStockAt:Math.max(0,Math.floor(Number(v?.lowStockAt??5)))}};

  async createProduct(tenantId: string, storeId: string, body: any) {
    const storeForDefaults:any=await this.assertStore(tenantId, storeId);
    const productDefaults:any=(storeForDefaults.settings as any)?.productStockPolicy||{};
    const defaultProductStatus=['ACTIVE','DRAFT'].includes(String(productDefaults.defaultProductStatus||''))?String(productDefaults.defaultProductStatus):'DRAFT';
    const defaultTrackStock=productDefaults.defaultTrackStock!==false;
    const defaultLowStockAt=Math.max(0,Number(productDefaults.defaultLowStockAt??5));
    const defaultAllowBackorder=!!productDefaults.allowNegativeStock;
    const skuPrefix=String(productDefaults.skuPrefix||'').trim();
    if (body.brandId) { const brand=await this.prisma.brand.findFirst({where:{id:body.brandId,storeId}}); if(!brand)throw new BadRequestException('Brand does not belong to store'); }
    if (Array.isArray(body.categoryIds) && body.categoryIds.length) { const count=await this.prisma.category.count({where:{id:{in:body.categoryIds},storeId}}); if(count!==new Set(body.categoryIds).size)throw new BadRequestException('One or more categories do not belong to store'); }
    await this.validateSetConfig(storeId,body);
    if(Array.isArray(body.variants))for(const v of body.variants)v.priceCurrency=await this.validatePriceCurrency(storeId,v.priceCurrency||body.priceCurrency);
    const sub=await this.prisma.subscription.findFirst({where:{tenantId,status:{in:['TRIAL','ACTIVE']}},include:{plan:true},orderBy:{createdAt:'desc'}});
    if(sub){const count=await this.prisma.product.count({where:{storeId:tenantId}});if(count>=sub.plan.maxProducts)throw new BadRequestException(`Plan allows ${sub.plan.maxProducts} products`);}
    const variants=Array.isArray(body.variants)&&body.variants.length?body.variants:[{title:'Standart',sku:body.sku||`${skuPrefix}SKU-${Date.now()}`,price:body.price||0,priceCurrency:await this.validatePriceCurrency(storeId,body.priceCurrency),stock:body.stock||0}];
    return this.prisma.$transaction(async tx=>{
      const product=await tx.product.create({data:{storeId,brandId:body.brandId||null,taxCategoryId:body.taxCategoryId||null,unitDefinitionId:body.unitDefinitionId||null,title:body.title,slug:this.slugify(body.slug||body.title),description:body.description,shortDescription:body.shortDescription,status:body.status||defaultProductStatus,productType:String(body.productType||'SIMPLE').toUpperCase(),tags:body.tags||[],seoTitle:body.seoTitle,seoDescription:body.seoDescription,metadata:body.metadata||{},publishedAt:body.publishedAt?new Date(body.publishedAt):null,unpublishedAt:body.unpublishedAt?new Date(body.unpublishedAt):null,requiresShipping:body.requiresShipping!==false,isDigital:!!body.isDigital,ageRestricted:!!body.ageRestricted,images:{create:(body.images||[]).map((x:any,i:number)=>({url:typeof x==='string'?x:x.url,mediaAssetId:typeof x==='string'?null:(x.mediaAssetId||null),aiGenerated:typeof x==='string'?false:!!x.aiGenerated,alt:typeof x==='string'?body.title:x.alt,sortOrder:i}))},categories:{create:(body.categoryIds||[]).map((categoryId:string)=>({categoryId}))},variants:{create:variants.map((v:any)=>({title:v.title||'Standart',sku:String(v.sku||`${skuPrefix}SKU-${Date.now()}`),barcode:v.barcode||null,mpn:v.mpn||null,gtin:v.gtin||null,hsCode:v.hsCode||null,countryOfOrigin:v.countryOfOrigin||null,preorderEnabled:!!v.preorderEnabled,preorderMessage:v.preorderMessage||null,preorderAvailableAt:v.preorderAvailableAt?new Date(v.preorderAvailableAt):null,price:Number(v.price||0),priceCurrency:v.priceCurrency||undefined,comparePrice:v.comparePrice===undefined||v.comparePrice===null?null:Number(v.comparePrice),cost:v.cost===undefined||v.cost===null?null:Number(v.cost),weight:v.weight===undefined||v.weight===null?null:Number(v.weight),length:v.length===undefined||v.length===null||v.length===''?null:Number(v.length),width:v.width===undefined||v.width===null||v.width===''?null:Number(v.width),height:v.height===undefined||v.height===null||v.height===''?null:Number(v.height),isActive:v.isActive!==false,inventory:{create:{lowStockAt:Number(v.lowStockAt??defaultLowStockAt),trackStock:v.trackStock??defaultTrackStock,allowBackorder:v.allowBackorder??defaultAllowBackorder}}}))}}});
      await this.saveEntityTranslations(tx,storeId,'product',product.id,body);
      await this.syncNormalizedProductCatalog(tx,product.id,body);const defaultChannels=await tx.salesChannel.findMany({where:{storeId,active:true,type:'STOREFRONT'},select:{id:true}});for(const ch of defaultChannels)await tx.productSalesChannel.upsert({where:{productId_salesChannelId:{productId:product.id,salesChannelId:ch.id}},create:{productId:product.id,salesChannelId:ch.id,published:true},update:{}});
      const createdVariants=await tx.variant.findMany({where:{productId:product.id},select:{id:true,sku:true}});
      const variantInputBySku=new Map(variants.map((v:any)=>[String(v.sku),v]));
      for(const variant of createdVariants){const input:any=variantInputBySku.get(String(variant.sku));await this.setDefaultWarehouseStock(tx,storeId,variant.id,Number(input?.stock||0));}
      if(Array.isArray(body.collectionIds)&&body.collectionIds.length){const ids=[...new Set(body.collectionIds.map(String))] as string[];const count=await tx.collection.count({where:{id:{in:ids},storeId}});if(count!==ids.length)throw new BadRequestException('One or more collections do not belong to store');await tx.collectionProduct.createMany({data:ids.map((collectionId:string,position:number)=>({collectionId,productId:product.id,position}))});}
      await this.syncTogetherProducts(tx,storeId,product.id,body.togetherProductIds);
      return tx.product.findUnique({where:{id:product.id},include:{brand:true,images:true,options:{include:{values:true}},collections:{include:{collection:true}},suppliers:{include:{supplier:true}},personalizations:{include:{personalization:true}},metafields:{include:{definition:true}},outgoingRelations:{where:{type:'COMPLEMENTARY'},include:{targetProduct:{select:{id:true,title:true,slug:true,images:{orderBy:{sortOrder:'asc'},take:1},variants:{where:{isActive:true},take:1,select:{price:true}}}}}},categories:{include:{category:true}},variants:{include:{inventory:true,warehouseStocks:{include:{warehouse:true}},optionValues:{include:{optionValue:{include:{option:true}}}},media:{include:{image:true}},quantityRule:true}}}});
    });
  }

  async updateProduct(tenantId: string, storeId: string, id: string, body: any) {
    await this.assertStore(tenantId, storeId);if(Array.isArray(body?.variants)){body={...body,variants:body.variants.map((v:any)=>this.validateProductVariantInput(v))};const bars=body.variants.map((v:any)=>String(v?.barcode||'').trim().toLowerCase()).filter(Boolean);if(new Set(bars).size!==bars.length)throw new BadRequestException('Variant barcodes must be unique');}if(String(body?.productType||'').toUpperCase()==='DIGITAL'){body={...body,isDigital:true,requiresShipping:false};}if(String(body?.productType||'').toUpperCase()==='VARIANT'&&Array.isArray(body?.options)&&!body.options.length)throw new BadRequestException('Variant product requires at least one option');const product=await this.prisma.product.findFirst({where:{id,storeId}});if(!product)throw new NotFoundException('Product not found');
    if(body.brandId){const brand=await this.prisma.brand.findFirst({where:{id:body.brandId,storeId}});if(!brand)throw new BadRequestException('Brand does not belong to store');}
    if(body.taxCategoryId){const tax=await this.prisma.taxCategory.findFirst({where:{id:body.taxCategoryId,storeId}});if(!tax)throw new BadRequestException('Tax category does not belong to store');}
    if(body.taxCategoryId){const tax=await this.prisma.taxCategory.findFirst({where:{id:body.taxCategoryId,storeId}});if(!tax)throw new BadRequestException('Tax category does not belong to store');}
    if(Array.isArray(body.categoryIds)&&body.categoryIds.length){const count=await this.prisma.category.count({where:{id:{in:body.categoryIds},storeId}});if(count!==new Set(body.categoryIds).size)throw new BadRequestException('One or more categories do not belong to store');}
    await this.validateSetConfig(storeId,{...body,productType:body.productType??product.productType,metadata:body.metadata??product.metadata},id);
    if(Array.isArray(body.variants))for(const v of body.variants){if(v.priceCurrency!==undefined||body.priceCurrency!==undefined)v.priceCurrency=await this.validatePriceCurrency(storeId,v.priceCurrency||body.priceCurrency);}
    const allowed=['brandId','taxCategoryId','unitDefinitionId','title','slug','description','shortDescription','status','productType','tags','seoTitle','seoDescription','metadata','publishedAt','unpublishedAt','requiresShipping','isDigital','ageRestricted'];const data:any=Object.fromEntries(Object.entries(body).filter(([k])=>allowed.includes(k)));if(body.productType!==undefined)data.productType=String(body.productType||'SIMPLE').toUpperCase();if(body.publishedAt!==undefined)data.publishedAt=body.publishedAt?new Date(body.publishedAt):null;if(body.unpublishedAt!==undefined)data.unpublishedAt=body.unpublishedAt?new Date(body.unpublishedAt):null;if(body.slug!==undefined||body.title!==undefined)data.slug=this.slugify(body.slug||body.title||product.slug);
    return this.prisma.$transaction(async tx=>{
      if(Array.isArray(body.categoryIds)){await tx.productCategory.deleteMany({where:{productId:id}});data.categories={create:body.categoryIds.map((categoryId:string)=>({categoryId}))};}
      if(Array.isArray(body.images)){await tx.productImage.deleteMany({where:{productId:id}});data.images={create:body.images.map((x:any,i:number)=>({url:typeof x==='string'?x:x.url,mediaAssetId:typeof x==='string'?null:(x.mediaAssetId||null),aiGenerated:typeof x==='string'?false:!!x.aiGenerated,alt:typeof x==='string'?body.title||product.title:x.alt,sortOrder:i}))};}
      await tx.product.update({where:{id},data});
      if(Array.isArray(body.variants)&&body.variants.length){
        const requestedIds:string[]=body.variants.filter((v:any)=>v.id).map((v:any)=>String(v.id));if(requestedIds.length){const count=await tx.variant.count({where:{id:{in:requestedIds},productId:id}});if(count!==new Set(requestedIds).size)throw new BadRequestException('One or more variants do not belong to product');}
        if(body.replaceVariants===true){
          const missing=await tx.variant.findMany({where:{productId:id,...(requestedIds.length?{id:{notIn:requestedIds}}:{})},select:{id:true}});
          for(const oldVariant of missing){
            const referenced=(await tx.orderItem.count({where:{variantId:oldVariant.id}}))+(await tx.cartItem.count({where:{variantId:oldVariant.id}}))+(await tx.returnItem.count({where:{variantId:oldVariant.id}}));
            if(referenced>0)await tx.variant.update({where:{id:oldVariant.id},data:{isActive:false}});
            else await tx.variant.delete({where:{id:oldVariant.id}});
          }
        }
        for(const v of body.variants){const variantData:any={title:v.title||'Standart',sku:String(v.sku||''),barcode:v.barcode||null,mpn:v.mpn||null,gtin:v.gtin||null,hsCode:v.hsCode||null,countryOfOrigin:v.countryOfOrigin||null,preorderEnabled:!!v.preorderEnabled,preorderMessage:v.preorderMessage||null,preorderAvailableAt:v.preorderAvailableAt?new Date(v.preorderAvailableAt):null,price:Number(v.price||0),priceCurrency:v.priceCurrency||undefined,comparePrice:v.comparePrice===undefined||v.comparePrice===null||v.comparePrice===''?null:Number(v.comparePrice),cost:v.cost===undefined||v.cost===null||v.cost===''?null:Number(v.cost),weight:v.weight===undefined||v.weight===null||v.weight===''?null:Number(v.weight),length:v.length===undefined||v.length===null||v.length===''?null:Number(v.length),width:v.width===undefined||v.width===null||v.width===''?null:Number(v.width),height:v.height===undefined||v.height===null||v.height===''?null:Number(v.height),isActive:v.isActive!==false};if(!variantData.sku)throw new BadRequestException('Variant SKU is required');if(v.id){await tx.variant.update({where:{id:String(v.id)},data:variantData});await tx.inventoryItem.upsert({where:{variantId:String(v.id)},create:{variantId:String(v.id),lowStockAt:Number(v.lowStockAt??5),trackStock:v.trackStock!==false,allowBackorder:!!v.allowBackorder},update:{lowStockAt:Number(v.lowStockAt??5),trackStock:v.trackStock!==false,allowBackorder:!!v.allowBackorder}});if(v.stock!==undefined)await this.setDefaultWarehouseStock(tx,storeId,String(v.id),Number(v.stock||0));}else{const created=await tx.variant.create({data:{productId:id,...variantData,inventory:{create:{lowStockAt:Number(v.lowStockAt??5),trackStock:v.trackStock!==false,allowBackorder:!!v.allowBackorder}}}});await this.setDefaultWarehouseStock(tx,storeId,created.id,Number(v.stock||0));}}
      }
      await this.saveEntityTranslations(tx,storeId,'product',id,body);await this.syncNormalizedProductCatalog(tx,id,body);if(Array.isArray(body.collectionIds)){const ids=[...new Set(body.collectionIds.map(String))] as string[];const count=ids.length?await tx.collection.count({where:{id:{in:ids},storeId}}):0;if(count!==ids.length)throw new BadRequestException('One or more collections do not belong to store');await tx.collectionProduct.deleteMany({where:{productId:id}});if(ids.length)await tx.collectionProduct.createMany({data:ids.map((collectionId:string,position:number)=>({collectionId,productId:id,position}))});}await this.syncTogetherProducts(tx,storeId,id,body.togetherProductIds);return tx.product.findUnique({where:{id},include:{brand:true,images:true,options:{include:{values:true}},collections:{include:{collection:true}},suppliers:{include:{supplier:true}},personalizations:{include:{personalization:true}},metafields:{include:{definition:true}},outgoingRelations:{where:{type:'COMPLEMENTARY'},include:{targetProduct:{select:{id:true,title:true,slug:true,images:{orderBy:{sortOrder:'asc'},take:1},variants:{where:{isActive:true},take:1,select:{price:true}}}}}},categories:{include:{category:true}},variants:{include:{inventory:true,warehouseStocks:{include:{warehouse:true}},optionValues:{include:{optionValue:{include:{option:true}}}},media:{include:{image:true}},quantityRule:true}}}});
    });
  }

  async addVariant(tenantId: string, storeId: string, productId: string, body: any) {
    await this.assertStore(tenantId, storeId);body=this.validateProductVariantInput(body);
    body.priceCurrency=await this.validatePriceCurrency(storeId,body.priceCurrency);
    const product = await this.prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.$transaction(async tx=>{const row=await tx.variant.create({ data: { productId, title: body.title, sku: body.sku, barcode: body.barcode, mpn: body.mpn||null, gtin:body.gtin||null, hsCode:body.hsCode||null, countryOfOrigin:body.countryOfOrigin||null, preorderEnabled:!!body.preorderEnabled, preorderMessage:body.preorderMessage||null, preorderAvailableAt:body.preorderAvailableAt?new Date(body.preorderAvailableAt):null, price: body.price, priceCurrency:body.priceCurrency, comparePrice: body.comparePrice, cost: body.cost, weight: body.weight, length:body.length??null,width:body.width??null,height:body.height??null, inventory: { create: { lowStockAt: body.lowStockAt ?? 5, trackStock: body.trackStock ?? true, allowBackorder: body.allowBackorder ?? false } } }, include: { inventory: true } });await this.setDefaultWarehouseStock(tx,storeId,row.id,Number(body.stock||0));return row;});
  }

  async updateVariant(tenantId: string, storeId: string, id: string, body: any) {
    await this.assertStore(tenantId, storeId);body=this.validateProductVariantInput(body);
    if(body.priceCurrency!==undefined)body.priceCurrency=await this.validatePriceCurrency(storeId,body.priceCurrency);
    const variant = await this.prisma.variant.findFirst({ where: { id, product: { storeId } } });
    if (!variant) throw new NotFoundException('Variant not found');
    const allowed = ['priceCurrency','title','sku','barcode','mpn','gtin','hsCode','countryOfOrigin','preorderEnabled','preorderMessage','preorderAvailableAt','price','comparePrice','cost','weight','length','width','height','isActive'];
    const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if (body.stock !== undefined || body.lowStockAt !== undefined || body.trackStock !== undefined || body.allowBackorder !== undefined) {
      await this.prisma.inventoryItem.upsert({ where: { variantId: id }, create: { variantId:id, lowStockAt: body.lowStockAt !== undefined ? Number(body.lowStockAt) : 5, trackStock: body.trackStock !== undefined ? !!body.trackStock : true, allowBackorder: body.allowBackorder !== undefined ? !!body.allowBackorder : false }, update: { ...(body.lowStockAt !== undefined ? { lowStockAt: Number(body.lowStockAt) } : {}), ...(body.trackStock !== undefined ? { trackStock: !!body.trackStock } : {}), ...(body.allowBackorder !== undefined ? { allowBackorder: !!body.allowBackorder } : {}) } });
      if(body.stock!==undefined)await this.setDefaultWarehouseStock(this.prisma,storeId,id,Number(body.stock||0));
    }
    return this.prisma.variant.update({ where: { id }, data, include: { inventory: true } });
  }

  async deleteVariant(tenantId:string,storeId:string,id:string){
    await this.assertStore(tenantId,storeId);
    const variant=await this.prisma.variant.findFirst({where:{id,product:{storeId}},select:{id:true,productId:true}});
    if(!variant)throw new NotFoundException('Variant not found');
    const total=await this.prisma.variant.count({where:{productId:variant.productId}});
    if(total<=1)throw new BadRequestException('A product must have at least one variant');
    const referenced=(await this.prisma.orderItem.count({where:{variantId:id}}))+(await this.prisma.cartItem.count({where:{variantId:id}}))+(await this.prisma.returnItem.count({where:{variantId:id}}));
    if(referenced>0){await this.prisma.variant.update({where:{id},data:{isActive:false}});return {deleted:false,archived:true,id};}
    await this.prisma.variant.delete({where:{id}});
    return {deleted:true,archived:false,id};
  }

  async archiveProduct(tenantId: string, storeId: string, id: string) {
    await this.assertStore(tenantId, storeId);
    const p = await this.prisma.product.findFirst({ where: { id, storeId } });
    if (!p) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async variantFilterChoices(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    const [presets,filters]=await Promise.all([
      this.prisma.optionPreset.findMany({where:{storeId,isActive:true},orderBy:{name:'asc'}}),
      this.prisma.storefrontFilterDefinition.findMany({where:{storeId,sourceType:'OPTION'},orderBy:{position:'asc'}})
    ]);
    const enabled=new Set(filters.filter(x=>x.enabled).map(x=>x.sourceKey));
    return {presets:presets.map(p=>({...p,selected:enabled.has(p.id)})),selectedIds:filters.filter(x=>x.enabled).map(x=>x.sourceKey)};
  }
  async saveVariantFilterChoices(tenantId:string,storeId:string,ids:any){
    await this.assertStore(tenantId,storeId);
    if(!Array.isArray(ids)||ids.length>100||ids.some(x=>typeof x!=='string'))throw new BadRequestException('Invalid variant filter selection');
    const selected=[...new Set(ids)] as string[];
    const presets=await this.prisma.optionPreset.findMany({where:{storeId,isActive:true}});
    const byId=new Map(presets.map(p=>[p.id,p]));
    if(selected.some(id=>!byId.has(id)))throw new BadRequestException('Unknown variant filter');
    return this.prisma.$transaction(async tx=>{
      await tx.storefrontFilterDefinition.deleteMany({where:{storeId,sourceType:'OPTION'}});
      for(let i=0;i<selected.length;i++){
        const preset=byId.get(selected[i])!;
        const v:any=preset.values||{};
        const display=String(v.displayType||'button').toLowerCase()==='color'?'SWATCH':'CHECKBOX';
        await tx.storefrontFilterDefinition.create({data:{storeId,sourceType:'OPTION',sourceKey:preset.id,label:preset.name,displayType:display as any,selectionMode:'OR',enabled:true,position:i+100}});
      }
      return {selectedIds:selected};
    });
  }

  async catalogDefinitions(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    const [customFields,variantTypes,suppliers,personalizations,tags,units]=await Promise.all([
      this.prisma.metafieldDefinition.findMany({where:{storeId},orderBy:{name:'asc'}}),
      this.prisma.optionPreset.findMany({where:{storeId},orderBy:{name:'asc'}}),
      this.prisma.supplier.findMany({where:{storeId},orderBy:{name:'asc'}}),
      this.prisma.personalizationDefinition.findMany({where:{storeId},orderBy:{name:'asc'}}),
      this.prisma.catalogTag.findMany({where:{storeId},orderBy:{name:'asc'}}),
      this.prisma.unitDefinition.findMany({where:{storeId},orderBy:{name:'asc'}}),
    ]);
    return {
      customFields:customFields.map((x:any)=>({id:x.id,name:x.name,code:`${x.namespace}.${x.key}`,active:true,type:x.type,validations:x.validations||{}})),
      variantTypes:variantTypes.map((x:any)=>({id:x.id,name:x.name,code:x.code||'',active:x.isActive,values:x.values||[]})),
      suppliers:suppliers.map((x:any)=>({id:x.id,name:x.name,code:x.code||'',active:true})),
      personalizations:personalizations.map((x:any)=>({id:x.id,name:x.name,code:'',active:true,fields:x.fields})),
      tags:tags.map((x:any)=>({id:x.id,name:x.name,code:x.code||'',active:x.isActive})),
      units:units.map((x:any)=>({id:x.id,name:x.name,code:x.code,active:true,precision:x.precision}))
    };
  }
  async updateCatalogDefinitions(tenantId:string,storeId:string,definitions:any){
    await this.assertStore(tenantId,storeId);
    const rows=(k:string)=>Array.isArray(definitions?.[k])?definitions[k].slice(0,500):[];
    await this.prisma.$transaction(async tx=>{
      await tx.metafieldDefinition.deleteMany({where:{storeId}});
      for(const [i,x] of rows('customFields').entries()){const code=String(x?.code||x?.name||`field-${i+1}`).trim();const [namespaceRaw,keyRaw]=code.includes('.')?code.split('.',2):['custom',code];const key=this.slugify(keyRaw)||`field-${i+1}`;await tx.metafieldDefinition.create({data:{storeId,namespace:this.slugify(namespaceRaw)||'custom',key,name:String(x?.name||key).trim(),type:String(x?.type||'text'),validations:x?.validations||undefined}})}
      await tx.optionPreset.deleteMany({where:{storeId}});
      for(const x of rows('variantTypes'))if(String(x?.name||'').trim())await tx.optionPreset.create({data:{storeId,name:String(x.name).trim(),code:String(x?.code||'').trim()||null,values:Array.isArray(x?.values)?x.values:undefined,isActive:x?.active!==false}});
      await tx.supplier.deleteMany({where:{storeId}});
      for(const x of rows('suppliers'))if(String(x?.name||'').trim())await tx.supplier.create({data:{storeId,name:String(x.name).trim(),code:String(x?.code||'').trim()||null,email:x?.email||null,phone:x?.phone||null}});
      await tx.personalizationDefinition.deleteMany({where:{storeId}});
      for(const x of rows('personalizations'))if(String(x?.name||'').trim())await tx.personalizationDefinition.create({data:{storeId,name:String(x.name).trim(),fields:Array.isArray(x?.fields)?x.fields:[]}});
      await tx.catalogTag.deleteMany({where:{storeId}});
      for(const x of rows('tags'))if(String(x?.name||'').trim())await tx.catalogTag.create({data:{storeId,name:String(x.name).trim(),code:String(x?.code||'').trim()||null,isActive:x?.active!==false}});
      await tx.unitDefinition.deleteMany({where:{storeId}});
      for(const x of rows('units'))if(String(x?.name||'').trim())await tx.unitDefinition.create({data:{storeId,name:String(x.name).trim(),code:this.slugify(x?.code||x?.name),precision:Math.max(0,Math.min(6,Number(x?.precision||0)))}});
    });
    await this.cache.purgeTenant(tenantId);
    return this.catalogDefinitions(tenantId,storeId);
  }

  private catalogKind(kind:string){
    const k=String(kind||'').toLowerCase();
    if(['customfields','custom-fields','attributes'].includes(k))return 'customFields';
    if(['varianttypes','variant-types','options'].includes(k))return 'variantTypes';
    if(['tags'].includes(k))return 'tags';
    if(['units'].includes(k))return 'units';
    throw new BadRequestException('Unknown catalog definition kind');
  }
  async createCatalogDefinition(tenantId:string,storeId:string,kind:string,body:any){
    await this.assertStore(tenantId,storeId);const k=this.catalogKind(kind);const name=String(body?.name||'').trim();if(!name)throw new BadRequestException('Name is required');
    if(k==='customFields'){const code=String(body?.code||name);const parts=code.includes('.')?code.split('.',2):['custom',code];return this.prisma.metafieldDefinition.create({data:{storeId,namespace:this.slugify(parts[0])||'custom',key:this.slugify(parts[1])||this.slugify(name),name,type:String(body?.type||'text'),validations:body?.validations||undefined}})}
    if(k==='variantTypes')return this.prisma.optionPreset.create({data:{storeId,name,code:String(body?.code||'').trim()||null,values:(Array.isArray(body?.values)||(body?.values&&typeof body.values==='object'))?body.values:[],isActive:body?.active!==false}});
    if(k==='tags')return this.prisma.catalogTag.create({data:{storeId,name,code:String(body?.code||'').trim()||null,isActive:body?.active!==false}});
    if(k==='units')return this.prisma.unitDefinition.create({data:{storeId,name,code:this.slugify(body?.code||name),precision:Math.max(0,Math.min(6,Number(body?.precision||0)))}});
    throw new BadRequestException('Unknown catalog definition kind');
  }
  async updateCatalogDefinition(tenantId:string,storeId:string,kind:string,id:string,body:any){
    await this.assertStore(tenantId,storeId);const k=this.catalogKind(kind);
    if(k==='customFields'){const row=await this.prisma.metafieldDefinition.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();const data:any={};if(body.name!==undefined)data.name=String(body.name).trim();if(body.type!==undefined)data.type=String(body.type);if(body.validations!==undefined)data.validations=body.validations;if(body.code!==undefined){const parts=String(body.code||body.name||row.key).includes('.')?String(body.code||body.name||row.key).split('.',2):['custom',String(body.code||body.name||row.key)];data.namespace=this.slugify(parts[0])||'custom';data.key=this.slugify(parts[1])||row.key;}return this.prisma.metafieldDefinition.update({where:{id},data});}
    if(k==='variantTypes'){const row=await this.prisma.optionPreset.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();const data:any={};for(const key of ['name','code','values'])if(body[key]!==undefined)data[key]=body[key];if(body.active!==undefined)data.isActive=!!body.active;return this.prisma.optionPreset.update({where:{id},data});}
    if(k==='tags'){const row=await this.prisma.catalogTag.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();const data:any={};for(const key of ['name','code'])if(body[key]!==undefined)data[key]=body[key];if(body.active!==undefined)data.isActive=!!body.active;return this.prisma.catalogTag.update({where:{id},data});}
    if(k==='units'){const row=await this.prisma.unitDefinition.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();const data:any={};if(body.name!==undefined)data.name=String(body.name).trim();if(body.code!==undefined)data.code=this.slugify(body.code);if(body.precision!==undefined)data.precision=Math.max(0,Math.min(6,Number(body.precision||0)));return this.prisma.unitDefinition.update({where:{id},data});}
    throw new BadRequestException('Unknown catalog definition kind');
  }
  async deleteCatalogDefinition(tenantId:string,storeId:string,kind:string,id:string){
    await this.assertStore(tenantId,storeId);const k=this.catalogKind(kind);
    if(k==='customFields'){const row=await this.prisma.metafieldDefinition.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();await this.prisma.metafieldDefinition.delete({where:{id}});}
    else if(k==='variantTypes'){const row=await this.prisma.optionPreset.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();const used=await this.prisma.productOption.count({where:{presetId:id,product:{storeId}}});if(used)throw new BadRequestException('Variant definition is linked to products');await this.prisma.optionPreset.delete({where:{id}});}
    else if(k==='tags'){const row=await this.prisma.catalogTag.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();await this.prisma.catalogTag.delete({where:{id}});}
    else if(k==='units'){const row=await this.prisma.unitDefinition.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();const used=await this.prisma.product.count({where:{unitDefinitionId:id}});if(used)throw new BadRequestException('This unit is used by products');await this.prisma.unitDefinition.delete({where:{id}});}
    else throw new BadRequestException('Unknown catalog definition kind');
    return {deleted:true,id};
  }

  async taxCategories(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);return this.prisma.taxCategory.findMany({where:{storeId},include:{rules:{orderBy:{priority:'asc'}}},orderBy:[{usageType:'asc'},{isDefault:'desc'},{name:'asc'}]});}
  async saveTaxCategory(tenantId:string,storeId:string,id:string|null,body:any){
    await this.assertStore(tenantId,storeId);
    const usageType=['PRODUCT','SHIPPING','PAYMENT_FEE','DIGITAL','SERVICE'].includes(String(body?.usageType||'').toUpperCase())?String(body.usageType).toUpperCase():'PRODUCT';
    const name=String(body?.name||'').trim(),code=String(body?.code||name).trim().toUpperCase().replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'');
    if(!name||!code)throw new BadRequestException('Vergi adı ve kodu zorunludur');
    const rate=Math.max(0,Math.min(100,Number(body?.rate||0)));const isDefault=!!body?.isDefault,isActive=body?.isActive!==false;
    const rules=(Array.isArray(body?.rules)?body.rules:[]).slice(0,250).map((r:any,i:number)=>({country:String(r?.country||'').trim().toUpperCase()||null,subdivision:String(r?.subdivision||'').trim().toUpperCase()||null,rate:Math.max(0,Math.min(100,Number(r?.rate??rate))),priority:Number.isFinite(Number(r?.priority))?Number(r.priority):100+i}));
    return this.prisma.$transaction(async tx=>{
      if(isDefault)await tx.taxCategory.updateMany({where:{storeId,usageType,...(id?{id:{not:id}}:{})},data:{isDefault:false}});
      const row=id?await tx.taxCategory.findFirst({where:{id,storeId}}):null;if(id&&!row)throw new NotFoundException('Vergi tipi bulunamadı');
      const saved=id?await tx.taxCategory.update({where:{id},data:{name,code,usageType,isDefault,isActive,rate}}):await tx.taxCategory.create({data:{storeId,name,code,usageType,isDefault,isActive,rate}});
      await tx.taxRule.deleteMany({where:{taxCategoryId:saved.id}});if(rules.length)await tx.taxRule.createMany({data:rules.map((r:any)=>({...r,taxCategoryId:saved.id}))});
      return tx.taxCategory.findUnique({where:{id:saved.id},include:{rules:{orderBy:{priority:'asc'}}}});
    });
  }
  async deleteTaxCategory(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.taxCategory.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException('Vergi tipi bulunamadı');const used=await this.prisma.product.count({where:{storeId,taxCategoryId:id}});if(used)throw new BadRequestException('Bu vergi tipi ürünlerde kullanılıyor; önce ürünlerden kaldırın');await this.prisma.taxCategory.delete({where:{id}});return{ok:true};}

  async categories(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);const rows=await this.prisma.category.findMany({where:{storeId},include:{_count:{select:{products:true}}},orderBy:[{sortOrder:'asc'},{name:'asc'}]});const trs=rows.length?await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'category',entityId:{in:rows.map(x=>x.id)}}}):[];return rows.map(x=>({...x,translations:trs.filter(t=>t.entityId===x.id).map(t=>({locale:t.locale,fields:t.fields}))}));}
  async createCategory(tenantId:string,storeId:string,body:any){await this.assertStore(tenantId,storeId);const name=String(body?.name||'').trim();if(!name)throw new BadRequestException('Category name is required');if(body.parentId){const parent=await this.prisma.category.findFirst({where:{id:body.parentId,storeId}});if(!parent)throw new BadRequestException('Parent category does not belong to store');}return this.prisma.$transaction(async tx=>{const row=await tx.category.create({data:{storeId,parentId:body.parentId||null,name,slug:this.slugify(body.slug||name),description:body.description||null,imageUrl:body.imageUrl||null,seoTitle:body.seoTitle||null,seoDescription:body.seoDescription||null,sortOrder:Number(body.sortOrder||0),isActive:body.isActive!==false}});await this.saveEntityTranslations(tx,storeId,'category',row.id,body);return row;});}
  async updateCategory(tenantId:string,storeId:string,id:string,body:any){await this.assertStore(tenantId,storeId);const x=await this.prisma.category.findFirst({where:{id,storeId}});if(!x)throw new NotFoundException();if(body.parentId){if(String(body.parentId)===id)throw new BadRequestException('Category cannot be its own parent');let cursor=String(body.parentId),guard=0;while(cursor&&guard++<100){const parent=await this.prisma.category.findFirst({where:{id:cursor,storeId},select:{id:true,parentId:true}});if(!parent)throw new BadRequestException('Parent category does not belong to store');if(parent.id===id)throw new BadRequestException('Category hierarchy cannot contain a cycle');cursor=parent.parentId||'';}}const allowed=['parentId','name','slug','description','imageUrl','seoTitle','seoDescription','googleProductCategory','sortOrder','isActive'];const data:any=Object.fromEntries(Object.entries(body).filter(([k])=>allowed.includes(k)));if(body.name!==undefined)data.name=String(body.name).trim();if(body.slug!==undefined||body.name!==undefined)data.slug=this.slugify(body.slug||body.name||x.slug);return this.prisma.$transaction(async tx=>{const row=await tx.category.update({where:{id},data});await this.saveEntityTranslations(tx,storeId,'category',id,body);return row;});}
  async deleteCategory(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.category.findFirst({where:{id,storeId},select:{id:true,parentId:true}});if(!row)throw new NotFoundException();return this.prisma.$transaction(async tx=>{await tx.category.updateMany({where:{storeId,parentId:id},data:{parentId:row.parentId||null}});await tx.category.delete({where:{id}});return {deleted:true,id};});}

  async brands(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); const rows=await this.prisma.brand.findMany({ where: { storeId }, orderBy: { name: 'asc' } }); const trs=rows.length?await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'brand',entityId:{in:rows.map(x=>x.id)}}}):[];return rows.map(x=>({...x,translations:trs.filter(t=>t.entityId===x.id).map(t=>({locale:t.locale,fields:t.fields}))})); }
  async createBrand(tenantId: string, storeId: string, body: any) { await this.assertStore(tenantId, storeId); return this.prisma.$transaction(async tx=>{const row=await tx.brand.create({ data: { storeId, name: body.name, slug: this.slugify(body.slug || body.name), logoUrl: body.logoUrl, description: body.description, seoTitle: body.seoTitle, seoDescription: body.seoDescription } });await this.saveEntityTranslations(tx,storeId,'brand',row.id,body);return row;}); }
  async updateBrand(tenantId:string,storeId:string,id:string,body:any){await this.assertStore(tenantId,storeId);const row=await this.prisma.brand.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();const data:any={};for(const key of ['name','logoUrl','description','seoTitle','seoDescription'])if(body[key]!==undefined)data[key]=body[key];if(body.slug!==undefined||body.name!==undefined)data.slug=this.slugify(body.slug||body.name||row.slug);return this.prisma.$transaction(async tx=>{const saved=await tx.brand.update({where:{id},data});await this.saveEntityTranslations(tx,storeId,'brand',id,body);return saved;});}
  async deleteBrand(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.brand.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();await this.prisma.brand.delete({where:{id}});return {deleted:true,id};}

  async customers(tenantId: string, storeId: string, q?: string) { await this.assertStore(tenantId, storeId); return this.prisma.customer.findMany({ where: { storeId, ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}) }, include: { group: true, loyaltyAccount:true, _count: { select: { orders: true, returns:true } } }, orderBy: { createdAt: 'desc' }, take:q?100:300 }); }
  async customer(tenantId: string, storeId: string, id: string) { await this.assertStore(tenantId, storeId); const c = await this.prisma.customer.findFirst({ where: { id, storeId }, include: { group: true, addresses: true, loyaltyAccount:{include:{transactions:{orderBy:{createdAt:'desc'},take:100}}}, consentRecords:{orderBy:{createdAt:'desc'},take:50}, privacyRequests:{orderBy:{createdAt:'desc'},take:50}, returns:{orderBy:{createdAt:'desc'},take:50,include:{items:true}}, orders: { orderBy: { createdAt: 'desc' }, take:100, include:{returns:true} } } }); if (!c) throw new NotFoundException(); const storeCredits=await this.prisma.storeCreditAccount.findMany({where:{storeId,customerId:id},include:{transactions:{orderBy:{createdAt:'desc'},take:100}},orderBy:{updatedAt:'desc'}}); return {...c,storeCredits}; }
  async createCustomer(tenantId:string,storeId:string,b:any){await this.assertStore(tenantId,storeId);const email=String(b?.email||'').trim().toLowerCase();if(!email)throw new BadRequestException('E-posta zorunludur');if(b.groupId){const g=await this.prisma.customerGroup.findFirst({where:{id:String(b.groupId),storeId}});if(!g)throw new BadRequestException('Müşteri grubu mağazaya ait değil');}return this.prisma.customer.create({data:{storeId,email,firstName:b.firstName||null,lastName:b.lastName||null,phone:b.phone||null,groupId:b.groupId||null,isActive:b.isActive!==false,acceptsMarketing:!!b.acceptsMarketing,tags:Array.isArray(b.tags)?b.tags:[],metadata:b.metadata||{},customerType:String(b.customerType||'PERSON'),companyName:b.companyName||null,taxNumber:b.taxNumber||null,taxOffice:b.taxOffice||null}});}
  async updateCustomer(tenantId:string,storeId:string,id:string,b:any){await this.assertStore(tenantId,storeId);const row=await this.prisma.customer.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();if(b.groupId){const g=await this.prisma.customerGroup.findFirst({where:{id:String(b.groupId),storeId}});if(!g)throw new BadRequestException('Müşteri grubu mağazaya ait değil');}const data:any={};for(const k of ['firstName','lastName','phone','groupId','isActive','acceptsMarketing','tags','metadata','customerType','companyName','taxNumber','taxOffice'])if(b[k]!==undefined)data[k]=b[k];if(b.email!==undefined)data.email=String(b.email).trim().toLowerCase();return this.prisma.customer.update({where:{id},data});}


  async customerGroups(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    return this.prisma.customerGroup.findMany({where:{storeId},include:{_count:{select:{customers:true}}},orderBy:[{isDefault:'desc'},{name:'asc'}]});
  }
  async createCustomerGroup(tenantId:string,storeId:string,body:any){
    await this.assertStore(tenantId,storeId);
    const name=String(body?.name||'').trim();if(!name)throw new BadRequestException(apiError('merchant.customerGroup.nameRequired'));
    if(body?.isDefault)await this.prisma.customerGroup.updateMany({where:{storeId},data:{isDefault:false}});
    return this.prisma.customerGroup.create({data:{storeId,name,description:body?.description||null,color:body?.color||'#16a34a',discountPercent:Math.max(0,Math.min(100,Number(body?.discountPercent||0))),isDefault:!!body?.isDefault}});
  }
  async updateCustomerGroup(tenantId:string,storeId:string,id:string,body:any){
    await this.assertStore(tenantId,storeId);
    const row=await this.prisma.customerGroup.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException(apiError('merchant.customerGroup.notFound'));
    if(body?.isDefault)await this.prisma.customerGroup.updateMany({where:{storeId,id:{not:id}},data:{isDefault:false}});
    const data:any={};for(const k of ['name','description','color','isDefault'])if(body[k]!==undefined)data[k]=body[k];
    if(body.discountPercent!==undefined)data.discountPercent=Math.max(0,Math.min(100,Number(body.discountPercent||0)));
    return this.prisma.customerGroup.update({where:{id},data});
  }
  async deleteCustomerGroup(tenantId:string,storeId:string,id:string){
    await this.assertStore(tenantId,storeId);
    const row=await this.prisma.customerGroup.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException(apiError('merchant.customerGroup.notFound'));
    await this.prisma.customer.updateMany({where:{storeId,groupId:id},data:{groupId:null}});
    await this.prisma.customerGroup.delete({where:{id}});
    return {deleted:true};
  }
  async assignCustomerGroup(tenantId:string,storeId:string,customerId:string,groupId?:string|null){
    await this.assertStore(tenantId,storeId);
    const customer=await this.prisma.customer.findFirst({where:{id:customerId,storeId}});if(!customer)throw new NotFoundException(apiError('merchant.customer.notFound'));
    if(groupId){const group=await this.prisma.customerGroup.findFirst({where:{id:groupId,storeId}});if(!group)throw new BadRequestException(apiError('merchant.customerGroup.wrongStore'));}
    return this.prisma.customer.update({where:{id:customerId},data:{groupId:groupId||null},include:{group:true}});
  }

  async orders(tenantId:string,storeId:string,status?:any){
    await this.assertStore(tenantId,storeId);const [rows,ctx]=await Promise.all([this.prisma.order.findMany({where:{storeId,...(status?{status}:{})},include:{customer:true,items:{include:{variant:{include:{product:{include:{images:{orderBy:{sortOrder:'asc'},take:1}}}}}}}},orderBy:{createdAt:'desc'},take:200}),this.orderDisplayContext(storeId)]);return rows.map((row:any)=>this.orderDisplay(row,ctx));
  }
  async order(tenantId:string,storeId:string,id:string,userId?:string){
    await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'fulfill');const where:any={id,storeId};if(scope)where.OR=[{inventoryReservations:{some:{warehouseId:{in:scope}}}},{fulfillments:{some:{warehouseId:{in:scope}}}}];const [o,ctx]=await Promise.all([this.prisma.order.findFirst({where,include:{customer:true,items:{include:{variant:{include:{product:{include:{images:{orderBy:{sortOrder:'asc'},take:1}}}}}}},statusHistory:{orderBy:{createdAt:'desc'}},returns:{include:{items:true}},paymentAttempts:{orderBy:{createdAt:'desc'}},paymentTransactions:{orderBy:{createdAt:'desc'}},fulfillments:{orderBy:{createdAt:'desc'},include:{warehouse:true,items:true,shipments:true}},refunds:{orderBy:{createdAt:'desc'},include:{items:true,transactions:true}},shipments:{orderBy:{createdAt:'desc'},include:{items:true}}}}),this.orderDisplayContext(storeId)]);if(!o)throw new NotFoundException();return this.orderDisplay(o,ctx);
  }
  async updateOrderStatus(tenantId:string,storeId:string,id:string,body:any,userId?:string){
    await this.assertStore(tenantId,storeId);
    const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    if(scope){const visible=await this.prisma.order.findFirst({where:{id,storeId,OR:[{inventoryReservations:{some:{warehouseId:{in:scope}}}},{fulfillments:{some:{warehouseId:{in:scope}}}}]},select:{id:true}});if(!visible)throw new ForbiddenException('Bu sipariş atanmış depolarınızın dışında');}
    const updated:any=await this.prisma.$transaction(async tx=>{
      const order:any=await tx.order.findFirst({where:{id,storeId},include:{items:true}});if(!order)throw new NotFoundException();
      const nextStatus=body.status===undefined?order.status:String(body.status);const nextPayment=body.paymentStatus===undefined?order.paymentStatus:String(body.paymentStatus);const nextFulfillment=body.fulfillmentStatus===undefined?order.fulfillmentStatus:String(body.fulfillmentStatus);
      if(!canTransition(ORDER_TRANSITIONS,order.status,nextStatus))throw new BadRequestException(`Invalid order status transition: ${order.status} -> ${nextStatus}`);
      if(!canTransition(PAYMENT_TRANSITIONS,order.paymentStatus,nextPayment))throw new BadRequestException(`Invalid payment status transition: ${order.paymentStatus} -> ${nextPayment}`);
      if(!canTransition(FULFILLMENT_TRANSITIONS,order.fulfillmentStatus,nextFulfillment))throw new BadRequestException(`Invalid fulfillment status transition: ${order.fulfillmentStatus} -> ${nextFulfillment}`);
      if(nextPayment==='PAID'&&order.paymentStatus!=='PAID'){
        const reservations=await tx.inventoryReservation.findMany({where:{orderId:order.id,status:'HELD'}});
        for(const reservation of reservations){for(let attempt=0;attempt<4;attempt++){const stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:reservation.warehouseId,variantId:reservation.variantId}}});if(!stock)throw new BadRequestException('Reserved warehouse stock not found');const qty=Number(reservation.quantity||0);const release=Math.min(Number(stock.reserved||0),qty);const changed=await tx.warehouseStock.updateMany({where:{id:stock.id,reserved:stock.reserved,committed:stock.committed},data:{reserved:{decrement:release},committed:{increment:qty}}});if(changed.count===1)break;if(attempt===3)throw new BadRequestException('Inventory changed while capturing payment');}await tx.inventoryReservation.update({where:{id:reservation.id},data:{status:'COMMITTED',expiresAt:null}});}
        if(order.customerId){const program=await tx.loyaltyProgram.findUnique({where:{storeId}});if(program?.enabled){const existingEarn=await tx.loyaltyTransaction.findFirst({where:{orderId:order.id,type:'EARN'}});if(!existingEarn){const current=await tx.loyaltyAccount.findUnique({where:{customerId:order.customerId},select:{lifetimePoints:true}});const tiers=Array.isArray((program.settings as any)?.tiers)?(program.settings as any).tiers:[];const tier=tiers.filter((x:any)=>Number(x?.minPoints||0)<=Number(current?.lifetimePoints||0)).sort((a:any,b:any)=>Number(b?.minPoints||0)-Number(a?.minPoints||0))[0];const multiplier=Math.max(0,Number(tier?.multiplier||1));const rate=Number((order.metadata as any)?.exchangeRate||1);const baseAmount=Number(order.grandTotal)/Math.max(rate,0.00000001);const points=Math.max(0,Math.floor(baseAmount*Number(program.pointsPerCurrencyUnit)*multiplier));if(points>0){const expiresAt=program.pointsExpireDays?new Date(Date.now()+Number(program.pointsExpireDays)*86400000):null;const account=await tx.loyaltyAccount.upsert({where:{customerId:order.customerId},create:{storeId,customerId:order.customerId,points,lifetimePoints:points},update:{points:{increment:points},lifetimePoints:{increment:points}}});await tx.loyaltyTransaction.create({data:{accountId:account.id,orderId:order.id,type:'EARN',points,balanceAfter:account.points,note:`Order #${order.number}${tier?.name?` · ${tier.name} x${multiplier}`:''}`,expiresAt}});}}}}
      }
      if(nextPayment==='PAID'&&order.paymentStatus!=='PAID'){
        await tx.affiliateConversion.updateMany({where:{storeId,orderId:order.id,status:'PENDING'},data:{status:'APPROVED',approvedAt:new Date()}});
        const automations=await tx.marketingAutomation.findMany({where:{storeId,enabled:true,trigger:'ORDER_PAID'}});for(const automation of automations)await tx.marketingAutomationRun.upsert({where:{automationId_eventKey:{automationId:automation.id,eventKey:`order:${order.id}:paid`}},create:{storeId,automationId:automation.id,eventKey:`order:${order.id}:paid`,customerId:order.customerId,orderId:order.id,status:'PENDING',nextRunAt:new Date(Date.now()+automation.delayMinutes*60000),context:{number:order.number,total:Number(order.grandTotal),currency:order.currency}},update:{}});
      }
      if(nextPayment==='FAILED'&&order.paymentStatus!=='FAILED'){const automations=await tx.marketingAutomation.findMany({where:{storeId,enabled:true,trigger:'PAYMENT_FAILED'}});for(const automation of automations)await tx.marketingAutomationRun.upsert({where:{automationId_eventKey:{automationId:automation.id,eventKey:`order:${order.id}:payment_failed`}},create:{storeId,automationId:automation.id,eventKey:`order:${order.id}:payment_failed`,customerId:order.customerId,orderId:order.id,status:'PENDING',nextRunAt:new Date(Date.now()+automation.delayMinutes*60000),context:{number:order.number,total:Number(order.grandTotal),currency:order.currency}},update:{}});}
      if(nextStatus==='CANCELLED'&&order.status!=='CANCELLED'){
        await tx.affiliateConversion.updateMany({where:{storeId,orderId:order.id,status:{in:['PENDING','APPROVED']}},data:{status:'REJECTED',rejectedAt:new Date()}});
        const reservations=await tx.inventoryReservation.findMany({where:{orderId:order.id,status:{in:['HELD','COMMITTED']}}});
        for(const reservation of reservations){const stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:reservation.warehouseId,variantId:reservation.variantId}}});if(stock){const qty=Number(reservation.quantity||0);if(reservation.status==='HELD')await tx.warehouseStock.update({where:{id:stock.id},data:{reserved:{decrement:Math.min(Number(stock.reserved||0),qty)}}});else await tx.warehouseStock.update({where:{id:stock.id},data:{committed:{decrement:Math.min(Number(stock.committed||0),qty)}}});}await tx.inventoryReservation.update({where:{id:reservation.id},data:{status:'RELEASED',expiresAt:null}});}await tx.warehouseTransferRequirement.updateMany({where:{orderId:order.id,status:'OPEN'},data:{status:'CANCELLED'}});
      }
      const data:any={};if(nextStatus!==order.status)data.status=nextStatus;if(nextPayment!==order.paymentStatus)data.paymentStatus=nextPayment;if(nextFulfillment!==order.fulfillmentStatus)data.fulfillmentStatus=nextFulfillment;if(body.adminNote!==undefined)data.adminNote=body.adminNote;
      if(body.shipping!==undefined||body.invoice!==undefined){const current:any=order.metadata||{};data.metadata={...current,...(body.shipping!==undefined?{shipping:{...(current.shipping||{}),...(body.shipping||{})}}:{}),...(body.invoice!==undefined?{invoice:{...(current.invoice||{}),...(body.invoice||{})}}:{})};}
      if(!Object.keys(data).length)return order;
      const result=await tx.order.update({where:{id},data});
      await tx.orderStatusHistory.create({data:{orderId:id,status:nextStatus!==order.status?nextStatus:nextPayment!==order.paymentStatus?`PAYMENT_${nextPayment}`:nextFulfillment!==order.fulfillmentStatus?`FULFILLMENT_${nextFulfillment}`:'UPDATED',note:body.note||body.reason||null}});
      return result;
    });
    if(body.paymentStatus==='PAID')await this.edoc.maybeAutoCreateForOrder(storeId,id,'PAYMENT_PAID');
    return updated;
  }

  async createFulfillment(tenantId:string,storeId:string,orderId:string,body:any,userId?:string){
    await this.assertStore(tenantId,storeId);
    const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    if(scope&&body?.warehouseId&&!scope.includes(String(body.warehouseId)))throw new ForbiddenException('Bu depoda gönderim yetkiniz yok');
    const requested=Array.isArray(body?.items)?body.items.map((x:any)=>({orderItemId:String(x.orderItemId||''),quantity:Math.floor(Number(x.quantity||0))})).filter((x:any)=>x.orderItemId&&x.quantity>0):[];
    if(!requested.length)throw new BadRequestException('Fulfillment items are required');
    return this.prisma.$transaction(async tx=>{
      const order:any=await tx.order.findFirst({where:{id:orderId,storeId},include:{items:true}});if(!order)throw new NotFoundException('Order not found');if(order.status==='CANCELLED')throw new BadRequestException('Cancelled order cannot be fulfilled');
      const byId=new Map<string, any>(order.items.map((x:any)=>[String(x.id),x]));for(const req of requested){const item:any=byId.get(req.orderItemId);if(!item)throw new BadRequestException('Order item does not belong to order');if(req.quantity>Number(item.quantity)-Number(item.fulfilledQuantity||0))throw new BadRequestException(`Fulfillment quantity exceeds remaining quantity for ${item.sku}`);}
      const requestedIds=requested.map((x:any)=>x.orderItemId);const committed=await tx.inventoryReservation.findMany({where:{orderId,orderItemId:{in:requestedIds},status:'COMMITTED'},select:{warehouseId:true,orderItemId:true,quantity:true,fulfilledQuantity:true}});const activeWarehouses=[...new Set(committed.filter((x:any)=>Number(x.quantity)>Number(x.fulfilledQuantity||0)).map((x:any)=>String(x.warehouseId)))];if(activeWarehouses.length>1&&!body?.warehouseId)throw new BadRequestException('Sipariş birden fazla depoya dağıtılmış. Bu fulfillment için depo seçmelisiniz.');const selectedWarehouse=body?.warehouseId?String(body.warehouseId):(activeWarehouses[0]||null);if(selectedWarehouse&&scope&&!scope.includes(selectedWarehouse))throw new ForbiddenException('Bu depoda gönderim yetkiniz yok');if(selectedWarehouse&&!activeWarehouses.includes(selectedWarehouse))throw new BadRequestException('Seçilen depoda bu sipariş için committed stok bulunmuyor');for(const req of requested){const available=committed.filter((x:any)=>x.orderItemId===req.orderItemId&&(!selectedWarehouse||String(x.warehouseId)===selectedWarehouse)).reduce((n:number,x:any)=>n+Math.max(0,Number(x.quantity)-Number(x.fulfilledQuantity||0)),0);if(available<req.quantity)throw new BadRequestException(`Seçilen depoda ${byId.get(String(req.orderItemId))?.sku||req.orderItemId} için yeterli committed stok yok`);}
      const fulfillment=await tx.fulfillment.create({data:{storeId,orderId,warehouseId:selectedWarehouse,status:'FULFILLED',metadata:{...(body?.metadata||{}),warehouseResolvedAt:new Date().toISOString()} }});
      for(const req of requested){let remaining=req.quantity;const reservations=await tx.inventoryReservation.findMany({where:{orderId,orderItemId:req.orderItemId,status:'COMMITTED',...(selectedWarehouse?{warehouseId:selectedWarehouse}:{})},orderBy:{createdAt:'asc'}});for(const reservation of reservations){if(remaining<=0)break;const available=Number(reservation.quantity)-Number(reservation.fulfilledQuantity||0);if(available<=0)continue;const take=Math.min(remaining,available);const stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:reservation.warehouseId,variantId:reservation.variantId}}});if(!stock)throw new BadRequestException('Warehouse stock not found for fulfillment');if(Number(stock.committed)<take)throw new BadRequestException('Committed stock is lower than fulfillment quantity');await tx.warehouseStock.update({where:{id:stock.id},data:{committed:{decrement:take},onHand:{decrement:take}}});const fulfilled=Number(reservation.fulfilledQuantity||0)+take;await tx.inventoryReservation.update({where:{id:reservation.id},data:{fulfilledQuantity:fulfilled,status:fulfilled>=Number(reservation.quantity)?'FULFILLED':'COMMITTED'}});remaining-=take;}if(remaining>0)throw new BadRequestException('Not enough committed inventory for fulfillment');await tx.fulfillmentItem.create({data:{fulfillmentId:fulfillment.id,orderItemId:req.orderItemId,quantity:req.quantity}});await tx.orderItem.update({where:{id:req.orderItemId},data:{fulfilledQuantity:{increment:req.quantity}}});}
      let shipment:any=null;if(body?.shipment){const sh=body.shipment;shipment=await tx.shippingShipment.create({data:{storeId,orderId,fulfillmentId:fulfillment.id,provider:String(sh.provider||'MANUAL'),source:String(sh.source||'MANUAL'),externalShipmentId:sh.externalShipmentId||null,referenceId:String(sh.referenceId||`FUL-${fulfillment.id}`),trackingCode:sh.trackingCode||null,trackingUrl:sh.trackingUrl||null,carrierName:sh.carrierName||null,status:String(sh.status||'CREATED'),metadata:sh.metadata||{},items:{create:requested.map((x:any)=>({orderItemId:x.orderItemId,quantity:x.quantity}))}}});}
      const current=await tx.orderItem.findMany({where:{orderId},select:{quantity:true,fulfilledQuantity:true}});const allDone=current.every((x:any)=>Number(x.fulfilledQuantity)>=Number(x.quantity));const anyDone=current.some((x:any)=>Number(x.fulfilledQuantity)>0);await tx.order.update({where:{id:orderId},data:{fulfillmentStatus:allDone?'FULFILLED':anyDone?'PARTIALLY_FULFILLED':'UNFULFILLED',status:allDone?'FULFILLED':'PROCESSING'}});await tx.orderStatusHistory.create({data:{orderId,status:allDone?'FULFILLED':'PARTIALLY_FULFILLED',note:body?.note||null}});if(allDone){const automations=await tx.marketingAutomation.findMany({where:{storeId,enabled:true,trigger:'ORDER_FULFILLED'}});const orderCustomer=await tx.order.findUnique({where:{id:orderId},select:{customerId:true,number:true,grandTotal:true,currency:true}});for(const automation of automations)await tx.marketingAutomationRun.upsert({where:{automationId_eventKey:{automationId:automation.id,eventKey:`order:${orderId}:fulfilled`}},create:{storeId,automationId:automation.id,eventKey:`order:${orderId}:fulfilled`,customerId:orderCustomer?.customerId||null,orderId,status:'PENDING',nextRunAt:new Date(Date.now()+automation.delayMinutes*60000),context:{number:orderCustomer?.number,total:Number(orderCustomer?.grandTotal||0),currency:orderCustomer?.currency}},update:{}});}return{fulfillment,shipment};
    },{isolationLevel:'Serializable'} as any);
  }

  async createRefund(tenantId:string,storeId:string,orderId:string,body:any,userId?:string){
    await this.assertStore(tenantId,storeId);
    const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    if(scope){
      const visible=await this.prisma.order.findFirst({where:{id:orderId,storeId,OR:[{inventoryReservations:{some:{warehouseId:{in:scope}}}},{fulfillments:{some:{warehouseId:{in:scope}}}}]},select:{id:true}});
      if(!visible)throw new ForbiddenException('Bu sipariş atanmış depolarınızın dışında');
    }
    const idempotencyKey=String(body?.idempotencyKey||'').trim();
    if(!idempotencyKey)throw new BadRequestException('Refund idempotencyKey is required');
    return this.prisma.$transaction(async tx=>{
      const existing=await tx.refund.findUnique({where:{storeId_idempotencyKey:{storeId,idempotencyKey}},include:{items:true,transactions:true}});
      if(existing)return existing;
      const order:any=await tx.order.findFirst({where:{id:orderId,storeId},include:{items:true}});
      if(!order)throw new NotFoundException('Order not found');
      if(!['PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(String(order.paymentStatus)))throw new BadRequestException('Order has no captured payment to refund');
      const returnId=body?.returnId?String(body.returnId):null;
      const returnRequest:any=returnId?await tx.returnRequest.findFirst({where:{id:returnId,storeId,orderId},include:{items:true}}):null;
      if(returnId&&!returnRequest)throw new BadRequestException('Return does not belong to order');
      if(returnRequest){
        if(returnRequest.exchangeOrderId||returnRequest.exchangeStatus||returnRequest.status==='EXCHANGED')throw new BadRequestException('Exchange başlatılmış iade için refund oluşturulamaz');
        if(!['RECEIVED','REFUNDED'].includes(String(returnRequest.status)))throw new BadRequestException('Refund için iadenin RECEIVED durumunda olması gerekir');
      }
      const protectedRefunds:any[]=await tx.refund.findMany({where:{orderId,status:{in:['PROCESSING','SUCCEEDED']}},include:{items:true}});
      const refundedQtyByItem=new Map<string,number>();
      const refundedAmountByItem=new Map<string,number>();
      for(const refund of protectedRefunds)for(const item of refund.items||[]){const key=String(item.orderItemId);refundedQtyByItem.set(key,Number(refundedQtyByItem.get(key)||0)+Number(item.quantity||0));refundedAmountByItem.set(key,Number(refundedAmountByItem.get(key)||0)+Number(item.amount||0));}
      const returnRefunds:any[]=returnRequest?protectedRefunds.filter((x:any)=>String(x.returnId||'')===String(returnRequest.id)):[];
      const returnRefundQtyByItem=new Map<string,number>();
      for(const refund of returnRefunds)for(const item of refund.items||[]){const key=String(item.orderItemId);returnRefundQtyByItem.set(key,Number(returnRefundQtyByItem.get(key)||0)+Number(item.quantity||0));}
      const returnItemsByOrderItem=new Map<string,any>((returnRequest?.items||[]).map((x:any)=>[String(x.orderItemId),x]));
      const succeeded=await tx.refund.aggregate({where:{orderId,status:'SUCCEEDED'},_sum:{amount:true}});
      const processing=await tx.refund.aggregate({where:{orderId,status:'PROCESSING'},_sum:{amount:true}});
      const protectedAmount=Number(succeeded._sum.amount||0)+Number(processing._sum.amount||0);
      const remaining=Math.max(0,Number(order.grandTotal)-protectedAmount);
      const requestedItems=Array.isArray(body?.items)?body.items:[];
      const normalizedItemIds=requestedItems.map((x:any)=>String(x.orderItemId||'')).filter(Boolean);
      if(new Set(normalizedItemIds).size!==normalizedItemIds.length)throw new BadRequestException('Duplicate refund items are not allowed');
      let amount=body?.amount==null?NaN:Number(body.amount);const itemRows:any[]=[];
      if(requestedItems.length){
        amount=0;
        for(const input of requestedItems){
          const orderItemId=String(input.orderItemId||'');const item:any=order.items.find((x:any)=>String(x.id)===orderItemId);if(!item)throw new BadRequestException('Refund item does not belong to order');
          const qty=Math.floor(Number(input.quantity||0));const alreadyQty=Number(refundedQtyByItem.get(orderItemId)||0);const remainingQty=Math.max(0,Number(item.quantity)-alreadyQty);if(qty<=0||qty>remainingQty)throw new BadRequestException(`Refund quantity exceeds remaining quantity for ${item.title}`);
          if(returnRequest){const returnItem:any=returnItemsByOrderItem.get(orderItemId);if(!returnItem)throw new BadRequestException('Refund item does not belong to return');const alreadyReturnQty=Number(returnRefundQtyByItem.get(orderItemId)||0);const remainingReturnQty=Math.max(0,Number(returnItem.quantity)-alreadyReturnQty);if(qty>remainingReturnQty)throw new BadRequestException(`Refund quantity exceeds returned quantity for ${item.title}`);}
          const itemQty=Math.max(1,Number(item.quantity||1));const itemTotal=Math.max(0,Number(item.total ?? (Number(item.unitPrice||0)*itemQty)));const proratedUnit=itemTotal/itemQty;const maxRemainingAmount=Math.max(0,itemTotal-Number(refundedAmountByItem.get(orderItemId)||0));const lineAmount=input.amount==null?proratedUnit*qty:Number(input.amount);if(!Number.isFinite(lineAmount)||lineAmount<0||lineAmount>maxRemainingAmount+0.0001)throw new BadRequestException(`Refund amount exceeds remaining line amount for ${item.title}`);amount+=lineAmount;itemRows.push({orderItemId:item.id,quantity:qty,amount:lineAmount});
        }
      }
      if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException('Refund amount must be positive');
      if(amount>remaining+0.0001)throw new BadRequestException('Refund exceeds captured amount');
      const manual=body?.manualConfirmed===true;
      const refund:any=await tx.refund.create({data:{storeId,orderId,returnId,status:manual?'SUCCEEDED':'PROCESSING',amount,currency:order.currency,reason:body?.reason||null,idempotencyKey,metadata:body?.metadata||{},items:{create:itemRows}},include:{items:true,transactions:true}});
      if(manual){
        await tx.refundTransaction.create({data:{refundId:refund.id,status:'SUCCEEDED',providerReference:body?.providerReference||'MANUAL',raw:{manual:true}}});
        const succeededAfter=Number(succeeded._sum.amount||0)+amount;await tx.order.update({where:{id:orderId},data:{paymentStatus:succeededAfter+0.0001>=Number(order.grandTotal)?'REFUNDED':'PARTIALLY_REFUNDED'}});
        if(returnRequest){const successfulReturnRefunds:any[]=await tx.refund.findMany({where:{returnId:returnRequest.id,status:'SUCCEEDED'},include:{items:true}});const qtyByItem=new Map<string,number>();let totalReturnRefund=0;for(const rr of successfulReturnRefunds){totalReturnRefund+=Number(rr.amount||0);for(const ri of rr.items||[]){const key=String(ri.orderItemId);qtyByItem.set(key,Number(qtyByItem.get(key)||0)+Number(ri.quantity||0));}}const fullyRefunded=(returnRequest.items||[]).every((ri:any)=>Number(qtyByItem.get(String(ri.orderItemId))||0)>=Number(ri.quantity||0));await tx.returnRequest.update({where:{id:returnRequest.id},data:{refundAmount:totalReturnRefund,...(fullyRefunded?{status:'REFUNDED'}:{})}});}
      }
      return tx.refund.findUnique({where:{id:refund.id},include:{items:true,transactions:true}});
    },{isolationLevel:'Serializable'} as any);
  }

  async completeRefund(tenantId:string,storeId:string,refundId:string,body:any,userId?:string){
    await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    if(scope){const visible=await this.prisma.refund.findFirst({where:{id:refundId,storeId,order:{OR:[{inventoryReservations:{some:{warehouseId:{in:scope}}}},{fulfillments:{some:{warehouseId:{in:scope}}}}]}},select:{id:true}});if(!visible)throw new ForbiddenException('Bu sipariş atanmış depolarınızın dışında');}
    return this.prisma.$transaction(async tx=>{
      const refund:any=await tx.refund.findFirst({where:{id:refundId,storeId},include:{order:true,items:true,returnRequest:{include:{items:true}}}});if(!refund)throw new NotFoundException('Refund not found');if(refund.status==='SUCCEEDED')return refund;
      if(refund.returnRequest&&(refund.returnRequest.exchangeOrderId||refund.returnRequest.exchangeStatus||refund.returnRequest.status==='EXCHANGED'))throw new BadRequestException('Exchange başlatılmış iade refund olarak tamamlanamaz');
      const success=String(body?.status||'').toUpperCase()==='SUCCEEDED';const nextRefundStatus=success?'SUCCEEDED':'FAILED';if(!canTransition(REFUND_TRANSITIONS,refund.status,nextRefundStatus))throw new BadRequestException(`Invalid refund transition: ${refund.status} -> ${nextRefundStatus}`);await tx.refundTransaction.create({data:{refundId:refund.id,paymentTransactionId:body?.paymentTransactionId||null,status:nextRefundStatus,providerReference:body?.providerReference||null,raw:body?.raw||body||{}}});const updated=await tx.refund.update({where:{id:refund.id},data:{status:nextRefundStatus}});
      if(success){const agg=await tx.refund.aggregate({where:{orderId:refund.orderId,status:'SUCCEEDED'},_sum:{amount:true}});const total=Number(agg._sum.amount||0);await tx.order.update({where:{id:refund.orderId},data:{paymentStatus:total+0.0001>=Number(refund.order.grandTotal)?'REFUNDED':'PARTIALLY_REFUNDED'}});if(refund.returnRequest){const successfulReturnRefunds:any[]=await tx.refund.findMany({where:{returnId:refund.returnRequest.id,status:'SUCCEEDED'},include:{items:true}});const qtyByItem=new Map<string,number>();let totalReturnRefund=0;for(const rr of successfulReturnRefunds){totalReturnRefund+=Number(rr.amount||0);for(const ri of rr.items||[]){const key=String(ri.orderItemId);qtyByItem.set(key,Number(qtyByItem.get(key)||0)+Number(ri.quantity||0));}}const fullyRefunded=(refund.returnRequest.items||[]).every((ri:any)=>Number(qtyByItem.get(String(ri.orderItemId))||0)>=Number(ri.quantity||0));await tx.returnRequest.update({where:{id:refund.returnRequest.id},data:{refundAmount:totalReturnRefund,...(fullyRefunded?{status:'REFUNDED'}:{})}});}}
      return updated;
    },{isolationLevel:'Serializable'} as any);
  }

  async updateReturn(tenantId:string,storeId:string,id:string,b:any,userId?:string){
    await this.assertStore(tenantId,storeId);
    const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    return this.prisma.$transaction(async tx=>{
      const r:any=await tx.returnRequest.findFirst({where:{id,storeId},include:{items:true,order:{include:{items:true,inventoryReservations:true,fulfillments:true}}}});if(!r)throw new NotFoundException();if(scope&&!r.order.inventoryReservations.some((x:any)=>scope.includes(x.warehouseId))&&!r.order.fulfillments.some((x:any)=>x.warehouseId&&scope.includes(x.warehouseId)))throw new ForbiddenException('Bu iade atanmış depolarınızın dışında');
      const next=String(b.status||r.status) as ReturnStatus;if(!canTransition(RETURN_TRANSITIONS,r.status,next))throw new BadRequestException(`Invalid return transition: ${r.status} -> ${next}`);
      let refundAmount=r.refundAmount==null?null:Number(r.refundAmount);if(b.refundAmount!==undefined){refundAmount=Number(b.refundAmount);if(!Number.isFinite(refundAmount)||refundAmount<0)throw new BadRequestException('Invalid refund amount');const other=await tx.returnRequest.aggregate({where:{orderId:r.orderId,id:{not:r.id},status:'REFUNDED'},_sum:{refundAmount:true}});if(refundAmount+Number(other._sum.refundAmount||0)>Number(r.order.grandTotal)+0.0001)throw new BadRequestException('Refund exceeds captured order amount');}
      if(next==='REFUNDED'&&r.status!=='REFUNDED'){const successful=await tx.refund.findFirst({where:{returnId:r.id,status:'SUCCEEDED'}});if(!successful)throw new BadRequestException('A successful Refund record is required before marking the return refunded');refundAmount=Number(successful.amount);}
      const inspections=Array.isArray(b?.items)?b.items:[];for(const item of r.items){const input=inspections.find((x:any)=>String(x.returnItemId||x.id)===String(item.id));if(input)await tx.returnItem.update({where:{id:item.id},data:{condition:input.condition?String(input.condition):item.condition,disposition:input.disposition?String(input.disposition):item.disposition,inspectionNote:input.inspectionNote===undefined?item.inspectionNote:String(input.inspectionNote||''),inspectedAt:new Date()}});}
      if(next==='RECEIVED'&&r.status!=='RECEIVED'){for(const item of r.items){if(!item.variantId)continue;const input=inspections.find((x:any)=>String(x.returnItemId||x.id)===String(item.id));const disposition=String(input?.disposition||'').toUpperCase();const policy=await tx.inventoryItem.findUnique({where:{variantId:item.variantId}});if(!policy?.trackStock)continue;const warehouse=b?.warehouseId?await tx.warehouse.findFirst({where:{id:String(b.warehouseId),storeId}}):await this.ensureDefaultWarehouse(tx,storeId);if(!warehouse)throw new BadRequestException('İade deposu bulunamadı');if(scope&&!scope.includes(warehouse.id))throw new ForbiddenException('İade deposu yetkiniz dışında');if(disposition==='SELLABLE'||(b.restock===true&&!disposition)){await tx.warehouseStock.upsert({where:{warehouseId_variantId:{warehouseId:warehouse.id,variantId:item.variantId}},create:{warehouseId:warehouse.id,variantId:item.variantId,onHand:Number(item.quantity||0)},update:{onHand:{increment:Number(item.quantity||0)}}});}else if(['DAMAGED','UNUSABLE','QUARANTINE','REPAIR'].includes(disposition)){await tx.warehouseStock.upsert({where:{warehouseId_variantId:{warehouseId:warehouse.id,variantId:item.variantId}},create:{warehouseId:warehouse.id,variantId:item.variantId,damaged:Number(item.quantity||0)},update:{damaged:{increment:Number(item.quantity||0)}}});}}}
      if(r.corporateInvoiceRequired&&next==='REFUNDED'&&!['RECEIVED','APPROVED'].includes(String(r.corporateInvoiceStatus||'')))throw new BadRequestException('Kurumsal iade için iade faturası onayı gerekli');
      const noteParts=[b.note].filter(Boolean);
      const row=await tx.returnRequest.update({where:{id},data:{status:next,note:noteParts.length?noteParts.join(' | '):r.note,refundAmount:refundAmount as any,inspectionNote:b.inspectionNote===undefined?r.inspectionNote:String(b.inspectionNote||''),corporateInvoiceStatus:b.corporateInvoiceStatus===undefined?r.corporateInvoiceStatus:String(b.corporateInvoiceStatus||''),corporateInvoiceUrl:b.corporateInvoiceUrl===undefined?r.corporateInvoiceUrl:(b.corporateInvoiceUrl?String(b.corporateInvoiceUrl):null)}});
      return row;
    },{isolationLevel:'Serializable'} as any);
  }

  private exchangeMoney(value:any){const n=Number(value||0);return Math.round((Number.isFinite(n)?n:0)*100)/100;}

  async completeExchange(tenantId:string,storeId:string,id:string,b:any,userId?:string){
    await this.assertStore(tenantId,storeId);
    const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    const requested=Array.isArray(b?.replacements)?b.replacements.map((x:any)=>({returnItemId:String(x.returnItemId||''),variantId:String(x.variantId||''),quantity:Math.max(1,Math.floor(Number(x.quantity||1)))})).filter((x:any)=>x.returnItemId&&x.variantId):[];
    if(!requested.length)throw new BadRequestException('En az bir replacement ürünü seçilmelidir');
    if(new Set(requested.map((x:any)=>x.returnItemId)).size!==requested.length)throw new BadRequestException('Aynı iade satırı exchange içinde birden fazla kez kullanılamaz');
    return this.prisma.$transaction(async tx=>{
      const r:any=await tx.returnRequest.findFirst({where:{id,storeId},include:{items:{include:{orderItem:true}},order:{include:{inventoryReservations:true,fulfillments:true}}}});
      if(!r)throw new NotFoundException('Return not found');
      const existingRefund=await tx.refund.findFirst({where:{returnId:r.id,status:{in:['PROCESSING','SUCCEEDED']}}});
      if(existingRefund)throw new BadRequestException('Refund süreci başlamış iade exchange edilemez');
      if(scope&&!r.order.inventoryReservations.some((x:any)=>scope.includes(x.warehouseId))&&!r.order.fulfillments.some((x:any)=>x.warehouseId&&scope.includes(x.warehouseId)))throw new ForbiddenException('Bu iade atanmış depolarınızın dışında');
      if(r.exchangeOrderId){
        const existing=await tx.order.findFirst({where:{id:r.exchangeOrderId,storeId},include:{items:true,inventoryReservations:true,paymentAttempts:true}});
        if(existing)return{exchangeOrder:existing,exchange:{status:r.exchangeStatus,credit:Number(r.exchangeCredit||0),amountDue:Number(r.exchangeAmountDue||0),refundDue:Number(r.exchangeRefundDue||0)},idempotent:true};
      }
      if(r.status!=='RECEIVED')throw new BadRequestException('Exchange yalnız RECEIVED durumundaki iadede oluşturulabilir');
      const returnById=new Map(r.items.map((x:any)=>[String(x.id),x]));
      let credit=0;const rows:any[]=[];
      for(const req of requested){
        const returnItem:any=returnById.get(req.returnItemId);
        if(!returnItem)throw new BadRequestException('Replacement return item does not belong to return');
        if(req.quantity>Number(returnItem.quantity||0))throw new BadRequestException('Replacement quantity exceeds returned quantity');
        const variant:any=await tx.variant.findFirst({where:{id:req.variantId,isActive:true,product:{storeId,status:'ACTIVE'}},include:{product:true,inventory:true}});
        if(!variant)throw new BadRequestException('Replacement variant not found in store');
        const originalQty=Math.max(1,Number(returnItem.orderItem?.quantity||1));
        const originalLine=Number(returnItem.orderItem?.total ?? (Number(returnItem.orderItem?.unitPrice||0)*originalQty));
        const rowCredit=this.exchangeMoney((originalLine/originalQty)*req.quantity);
        credit=this.exchangeMoney(credit+rowCredit);
        rows.push({req,returnItem,variant,unitPrice:this.exchangeMoney(variant.price),targets:await this.inventoryTargetsForVariant(storeId,variant.id,req.quantity,tx)});
      }
      const replacementSubtotal=this.exchangeMoney(rows.reduce((n:number,x:any)=>n+x.unitPrice*x.req.quantity,0));
      const amountDue=this.exchangeMoney(Math.max(0,replacementSubtotal-credit));
      const refundDue=this.exchangeMoney(Math.max(0,credit-replacementSubtotal));
      const immediatelyPaid=amountDue<=0;
      for(const row of rows)for(const target of row.targets){
        if(!target.inventory?.trackStock||!target.warehouseId)continue;
        const qty=Number(target.quantity||0);
        if(scope&&!scope.includes(String(target.warehouseId)))throw new ForbiddenException('Replacement stoğu yetkili olduğunuz depoların dışında');
        for(let attempt=0;attempt<4;attempt++){
          const stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:target.warehouseId,variantId:target.variantId}}});
          if(!stock)throw new BadRequestException('Replacement warehouse stock not found');
          const available=Number(stock.onHand)-Number(stock.reserved)-Number(stock.committed)-Number(stock.damaged)-Number(stock.safetyStock);
          if(!target.inventory.allowBackorder&&available<qty)throw new BadRequestException(`Replacement stock insufficient for ${row.variant.sku}`);
          const changed=await tx.warehouseStock.updateMany({where:{id:stock.id,onHand:stock.onHand,reserved:stock.reserved,committed:stock.committed},data:immediatelyPaid?{committed:{increment:qty}}:{reserved:{increment:qty}}});
          if(changed.count===1)break;if(attempt===3)throw new BadRequestException('Replacement stock changed during exchange');
        }
      }
      const counter=await tx.tenant.update({where:{id:storeId},data:{nextOrderNumber:{increment:1}},select:{nextOrderNumber:true}});
      const exchangeOrder:any=await tx.order.create({data:{storeId,customerId:r.customerId,number:counter.nextOrderNumber-1,status:immediatelyPaid?'PROCESSING':'PENDING_PAYMENT',paymentStatus:immediatelyPaid?'PAID':'PENDING',fulfillmentStatus:'UNFULFILLED',paymentMethod:amountDue>0?'EXCHANGE_ADJUSTMENT':'EXCHANGE_CREDIT',shippingMethod:'EXCHANGE',currency:r.order.currency,subtotal:replacementSubtotal,discountTotal:Math.min(credit,replacementSubtotal),shippingTotal:0,paymentFee:0,taxTotal:0,grandTotal:amountDue,source:'exchange',idempotencyKey:`exchange:${r.id}`,shippingAddress:r.order.shippingAddress,billingAddress:r.order.billingAddress,metadata:{exchange:{returnId:r.id,originalOrderId:r.orderId,credit,replacementSubtotal,amountDue,refundDue,createdBy:userId||null}},items:{create:rows.map((x:any)=>({variantId:x.variant.id,productIdSnapshot:x.variant.productId,sku:x.variant.sku,title:`${x.variant.product.title} - ${x.variant.title}`,variantTitle:x.variant.title,quantity:x.req.quantity,originalUnitPrice:x.variant.price,unitPrice:x.unitPrice,discountTotal:0,taxAmount:0,total:this.exchangeMoney(x.unitPrice*x.req.quantity)}))},statusHistory:{create:{status:'EXCHANGE_CREATED',note:`Return ${r.id} · credit ${credit} · due ${amountDue} · refund ${refundDue}`}}},include:{items:true}});
      for(const row of rows)for(const target of row.targets){if(!target.inventory?.trackStock||!target.warehouseId)continue;const orderItem=exchangeOrder.items.find((x:any)=>x.variantId===target.variantId);await tx.inventoryReservation.create({data:{storeId,orderId:exchangeOrder.id,orderItemId:orderItem?.id||null,variantId:target.variantId,warehouseId:target.warehouseId,quantity:Number(target.quantity||0),status:immediatelyPaid?'COMMITTED':'HELD'}});}
      if(amountDue>0)await tx.paymentAttempt.create({data:{storeId,orderId:exchangeOrder.id,provider:'EXCHANGE_ADJUSTMENT',amount:amountDue,currency:r.order.currency,status:'REQUIRES_ACTION',idempotencyKey:`exchange:${r.id}:charge`,raw:{returnId:r.id,originalOrderId:r.orderId}}});
      const exchangeStatus=amountDue>0?'PAYMENT_DUE':refundDue>0?'REFUND_DUE':'COMPLETED';
      await tx.returnRequest.update({where:{id:r.id},data:{exchangeOrderId:exchangeOrder.id,exchangeStatus,exchangeCredit:credit,exchangeAmountDue:amountDue,exchangeRefundDue:refundDue,status:exchangeStatus==='COMPLETED'?'EXCHANGED':'RECEIVED',note:[r.note,`Exchange order #${exchangeOrder.number}`].filter(Boolean).join(' | ')}});
      return{exchangeOrder,exchange:{status:exchangeStatus,credit,amountDue,refundDue},idempotent:false};
    },{isolationLevel:'Serializable'} as any);
  }

  async settleExchange(tenantId:string,storeId:string,id:string,b:any,userId?:string){
    await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    return this.prisma.$transaction(async tx=>{
      const r:any=await tx.returnRequest.findFirst({where:{id,storeId},include:{order:{include:{inventoryReservations:true,fulfillments:true}}}});if(!r)throw new NotFoundException('Return not found');if(!r.exchangeOrderId)throw new BadRequestException('Exchange order not created');
      if(scope&&!r.order.inventoryReservations.some((x:any)=>scope.includes(x.warehouseId))&&!r.order.fulfillments.some((x:any)=>x.warehouseId&&scope.includes(x.warehouseId)))throw new ForbiddenException('Bu iade atanmış depolarınızın dışında');
      const exchangeOrder:any=await tx.order.findFirst({where:{id:r.exchangeOrderId,storeId},include:{inventoryReservations:true,paymentAttempts:true}});if(!exchangeOrder)throw new NotFoundException('Exchange order not found');
      if(r.status==='EXCHANGED'&&r.exchangeStatus==='COMPLETED')return exchangeOrder;
      const amountDue=Number(r.exchangeAmountDue||0),refundDue=Number(r.exchangeRefundDue||0);
      if(amountDue>0){if(b?.paymentConfirmed!==true)throw new BadRequestException('Exchange price difference payment confirmation is required');const attempt=exchangeOrder.paymentAttempts.find((x:any)=>x.idempotencyKey===`exchange:${r.id}:charge`);if(attempt&&attempt.status!=='SUCCEEDED'){if(!canTransition(PAYMENT_ATTEMPT_TRANSITIONS,attempt.status,'SUCCEEDED'))throw new BadRequestException(`Ödeme denemesi durumu tahsilata uygun değil: ${attempt.status}`);await tx.paymentAttempt.update({where:{id:attempt.id},data:{status:'SUCCEEDED',providerReference:b?.providerReference||'MANUAL',raw:{settledBy:userId||null,settledAt:new Date().toISOString()}}});}for(const reservation of exchangeOrder.inventoryReservations){if(reservation.status!=='HELD')continue;const stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:reservation.warehouseId,variantId:reservation.variantId}}});if(!stock||Number(stock.reserved)<Number(reservation.quantity))throw new BadRequestException('Reserved replacement stock is no longer available');await tx.warehouseStock.update({where:{id:stock.id},data:{reserved:{decrement:Number(reservation.quantity)},committed:{increment:Number(reservation.quantity)}}});await tx.inventoryReservation.update({where:{id:reservation.id},data:{status:'COMMITTED'}});}await tx.order.update({where:{id:exchangeOrder.id},data:{paymentStatus:'PAID',status:'PROCESSING'}});}
      if(refundDue>0){if(b?.refundConfirmed!==true)throw new BadRequestException('Exchange refund confirmation is required');const idempotencyKey=`exchange:${r.id}:refund`;let refund:any=await tx.refund.findUnique({where:{storeId_idempotencyKey:{storeId,idempotencyKey}}});if(!refund){refund=await tx.refund.create({data:{storeId,orderId:r.orderId,returnId:r.id,status:'SUCCEEDED',amount:refundDue,currency:r.order.currency,reason:'EXCHANGE_PRICE_DIFFERENCE',idempotencyKey,metadata:{exchangeOrderId:exchangeOrder.id,settledBy:userId||null}}});await tx.refundTransaction.create({data:{refundId:refund.id,status:'SUCCEEDED',providerReference:b?.refundReference||'MANUAL_EXCHANGE',raw:{exchange:true,returnId:r.id}}});const agg=await tx.refund.aggregate({where:{orderId:r.orderId,status:'SUCCEEDED'},_sum:{amount:true}});await tx.order.update({where:{id:r.orderId},data:{paymentStatus:Number(agg._sum.amount||0)+0.0001>=Number(r.order.grandTotal)?'REFUNDED':'PARTIALLY_REFUNDED'}});}}
      await tx.returnRequest.update({where:{id:r.id},data:{status:'EXCHANGED',exchangeStatus:'COMPLETED',note:[r.note,'Exchange settlement completed'].filter(Boolean).join(' | ')}});await tx.orderStatusHistory.create({data:{orderId:exchangeOrder.id,status:'EXCHANGE_READY_FOR_FULFILLMENT',note:`Return ${r.id} settlement completed`}});
      return tx.order.findUnique({where:{id:exchangeOrder.id},include:{items:true,inventoryReservations:true,paymentAttempts:true}});
    },{isolationLevel:'Serializable'} as any);
  }

  private posMoney(value:any){const n=Number(value||0);return Math.round((Number.isFinite(n)?n:0)*100)/100;}
  private posAddress(value:any,fallback:any={}){const source=value&&typeof value==='object'?value:{};const base=fallback&&typeof fallback==='object'?fallback:{};const pick=(key:string)=>String(source[key]??base[key]??'').trim();const name=pick('name');const pieces=name.split(/\s+/).filter(Boolean);const firstName=pick('firstName')||(pieces.length?pieces.slice(0,-1).join(' ')||pieces[0]:'');const lastName=pick('lastName')||(pieces.length>1?pieces[pieces.length-1]:'');return {name,firstName,lastName,email:pick('email'),phone:pick('phone'),company:pick('company'),taxOffice:pick('taxOffice'),taxNumber:pick('taxNumber'),address1:pick('address1'),address2:pick('address2'),district:pick('district'),city:pick('city'),state:pick('state'),postalCode:pick('postalCode'),country:(pick('country')||'TR').toUpperCase()};}
  private async buildPosQuote(tenantId:string,body:any){
    const storeId=String(body?.storeId||tenantId);const store=await this.assertStore(tenantId,storeId);
    const items=Array.isArray(body?.items)?body.items.filter((x:any)=>x?.variantId&&Number(x.quantity)>0).map((x:any)=>({variantId:String(x.variantId),quantity:Math.max(1,Math.floor(Number(x.quantity||1))),unitPrice:x.unitPrice})) : [];
    if(!items.length)throw new BadRequestException(apiError('merchant.pos.cartEmpty'));
    const variants=await this.prisma.variant.findMany({where:{id:{in:items.map((x:any)=>x.variantId)},product:{storeId,status:'ACTIVE'}},include:{product:{include:{categories:true,taxCategory:{include:{rules:{orderBy:{priority:'asc'}}}}}},inventory:true}});
    if(variants.length!==new Set(items.map((x:any)=>x.variantId)).size)throw new BadRequestException(apiError('merchant.pos.productsMissing'));
    const byId=new Map(variants.map((v:any)=>[v.id,v]));const prepared:any[]=[];let subtotal=0;
    for(const item of items){const variant:any=byId.get(item.variantId);const catalogPrice=this.posMoney(variant.price);const requested=Number(item.unitPrice);const unit=Number.isFinite(requested)&&requested>=0?this.posMoney(requested):catalogPrice;const targets:any[]=await this.inventoryTargetsForVariant(storeId,item.variantId,item.quantity);subtotal=this.posMoney(subtotal+unit*item.quantity);prepared.push({variant,quantity:item.quantity,targets,unit,catalogPrice});}

    const email=String(body?.customerEmail||'').trim().toLowerCase();const existingCustomer=email?await this.prisma.customer.findUnique({where:{storeId_email:{storeId,email}}}):null;const customerOrderCount=existingCustomer?await this.prisma.order.count({where:{customerId:existingCustomer.id}}):0;
    const couponCode=String(body?.couponCode||'').trim().toUpperCase();const now=new Date();const day=now.getDay();
    const promos=await this.prisma.promotion.findMany({where:{storeId,status:'ACTIVE',OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]},{OR:[{daysOfWeek:{isEmpty:true}},{daysOfWeek:{has:day}}]}]},include:{codes:true,redemptions:existingCustomer?{where:{customerId:existingCustomer.id}}:false}});
    const activePromos=(promos as any[]).filter((p:any)=>!p.usageLimit||p.usageCount<p.usageLimit).filter((p:any)=>!p.perCustomerLimit||!existingCustomer||p.redemptions.length<p.perCustomerLimit);
    const existingMeta:any=existingCustomer?.metadata||{};const promotion=evaluatePromotions(activePromos,{subtotal,items:prepared.map((row:any)=>({variantId:row.variant.id,productId:row.variant.productId,brandId:row.variant.product?.brandId||null,sku:row.variant.sku,categoryIds:(row.variant.product.categories||[]).map((c:any)=>c.categoryId),quantity:row.quantity,unitPrice:row.unit})),currency:String(store.currency||'TRY'),customerTags:existingCustomer?.tags||[],customerOrderCount,couponCodes:couponCode?[couponCode]:[],exchangeRate:1,shippingCountry:String(body?.shippingAddress?.country||'TR').toUpperCase(),customerId:existingCustomer?.id||null,customerGroupId:existingCustomer?.groupId||null,customerName:[existingCustomer?.firstName,existingCustomer?.lastName].filter(Boolean).join(' '),customerBirthDate:existingMeta.birthDate||null});
    const automaticDiscountTotal=this.posMoney((promotion.applied||[]).filter((x:any)=>!x.code).reduce((sum:number,x:any)=>sum+Number(x.discount||0),0));
    let couponDiscountTotal=this.posMoney((promotion.applied||[]).filter((x:any)=>x.code).reduce((sum:number,x:any)=>sum+Number(x.discount||0),0));let legacyDiscount:any=null;
    if(couponCode){
      const promoCode=await this.prisma.promotionCode.findFirst({where:{storeId,code:couponCode,isActive:true,promotion:{status:'ACTIVE'}}});
      if(promoCode&&!promotion.applied?.some((x:any)=>String(x.code||'').toUpperCase()===couponCode))throw new BadRequestException(apiError('merchant.coupon.conditionsNotMet'));
      if(!promoCode){legacyDiscount=await this.prisma.discount.findFirst({where:{storeId,code:couponCode,isActive:true,OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]}]},include:{products:true,categories:true}});if(!legacyDiscount)throw new BadRequestException(apiError('merchant.coupon.invalid'));if(legacyDiscount.usageLimit&&legacyDiscount.usageCount>=legacyDiscount.usageLimit)throw new BadRequestException(apiError('merchant.coupon.limitReached'));if(legacyDiscount.minimumAmount&&subtotal<Number(legacyDiscount.minimumAmount))throw new BadRequestException(apiError('merchant.coupon.minimumAmount',{amount:legacyDiscount.minimumAmount}));let eligible=subtotal;if(legacyDiscount.scope==='PRODUCT'&&legacyDiscount.products.length)eligible=prepared.filter((r:any)=>legacyDiscount.products.some((p:any)=>p.productId===r.variant.productId)).reduce((sum:number,r:any)=>sum+r.unit*r.quantity,0);if(legacyDiscount.scope==='CATEGORY'&&legacyDiscount.categories.length)eligible=prepared.filter((r:any)=>(r.variant.product.categories||[]).some((c:any)=>legacyDiscount.categories.some((x:any)=>x.categoryId===c.categoryId))).reduce((sum:number,r:any)=>sum+r.unit*r.quantity,0);let amount=0;if(legacyDiscount.type==='PERCENTAGE')amount=eligible*Math.max(0,Number(legacyDiscount.value||0))/100;if(legacyDiscount.type==='FIXED_AMOUNT')amount=Math.max(0,Number(legacyDiscount.value||0));if(legacyDiscount.maximumDiscount)amount=Math.min(amount,Number(legacyDiscount.maximumDiscount));couponDiscountTotal=this.posMoney(Math.min(Math.max(0,subtotal-automaticDiscountTotal),amount));}
    }
    const manualType=String(body?.manualDiscount?.type||'NONE').toUpperCase();const manualValue=Math.max(0,Number(body?.manualDiscount?.value||0));const remainingBeforeManual=Math.max(0,subtotal-automaticDiscountTotal-couponDiscountTotal);let manualDiscountTotal=0;if(manualType==='PERCENTAGE')manualDiscountTotal=remainingBeforeManual*Math.min(100,manualValue)/100;if(manualType==='FIXED')manualDiscountTotal=Math.min(remainingBeforeManual,manualValue);manualDiscountTotal=this.posMoney(manualDiscountTotal);
    const discountTotal=this.posMoney(Math.min(subtotal,automaticDiscountTotal+couponDiscountTotal+manualDiscountTotal));
    const rawPaymentMethod=String(body?.paymentMethod||'POS_CASH').trim();const builtInPayment=rawPaymentMethod.toUpperCase();const paymentMethod=['POS_CASH','POS_CARD'].includes(builtInPayment)?builtInPayment:rawPaymentMethod;const paymentRow=['POS_CASH','POS_CARD'].includes(paymentMethod)?null:await this.prisma.paymentMethod.findFirst({where:{storeId,code:paymentMethod,isActive:true}});const paymentFee=this.posMoney(paymentRow?.fee||0);
    const requestedDelivery=String(body?.deliveryType||'SHIPPING').toUpperCase();const deliveryType=['SHIPPING','PICKUP','COURIER'].includes(requestedDelivery)?requestedDelivery:'SHIPPING';const shippingMethodCode=String(body?.shippingMethodCode||'').trim();let shippingMethod:any=null;
    if(shippingMethodCode)shippingMethod=await this.prisma.shippingMethod.findFirst({where:{storeId,code:shippingMethodCode,isActive:true}});
    if(!shippingMethod){const preferredType=deliveryType==='PICKUP'?'pickup':deliveryType==='COURIER'?'courier':'shipping';shippingMethod=await this.prisma.shippingMethod.findFirst({where:{storeId,type:preferredType,isActive:true},orderBy:{sortOrder:'asc'}});}
    const settings:any=store.settings||{};const taxPolicy:any=settings.taxInvoicePolicy||{};const regionalTax:any=settings?.regional?.tax||{};const pricesIncludeTax=taxPolicy.pricesIncludeTax??regionalTax.pricesIncludeTax??settings.pricesIncludeTax??true;const defaultTaxRate=Math.max(0,Number(taxPolicy.defaultTaxRate??regionalTax.defaultRate??settings.taxRate??20));const shippingAddress:any=body?.shippingAddress||{};const billingAddress:any=body?.billingAddress||shippingAddress||{};const taxCountry=String((taxPolicy.destinationBased!==false?shippingAddress.country:billingAddress.country)||store.defaultCountry||'TR').toUpperCase();const taxSubdivision=String((taxPolicy.destinationBased!==false?(shippingAddress.state||shippingAddress.subdivision):(billingAddress.state||billingAddress.subdivision))||'').toUpperCase();const customerMeta:any=existingCustomer?.metadata||{};const taxExempt=taxPolicy.exemptionsEnabled!==false&&(body?.taxExempt===true||customerMeta.taxExempt===true);const netAfterDiscount=Math.max(0,this.posMoney(subtotal-discountTotal));const shippingBase=deliveryType==='PICKUP'?0:this.posMoney(shippingMethod?.price||0);const shippingFree=deliveryType==='PICKUP'||(shippingMethod?.freeAbove!=null&&netAfterDiscount>=Number(shippingMethod.freeAbove));const shippingTotal=this.posMoney(shippingFree?0:shippingBase);const discountFactor=subtotal>0?Math.max(0,netAfterDiscount/subtotal):1;let itemTax=0;for(const row of prepared){const category:any=row.variant?.product?.taxCategory;const rules:any[]=Array.isArray(category?.rules)?category.rules:[];const matched=rules.filter((r:any)=>(!r.country||String(r.country).toUpperCase()===taxCountry)&&(!r.subdivision||String(r.subdivision).toUpperCase()===taxSubdivision)).sort((a:any,b:any)=>Number(!!b.subdivision)-Number(!!a.subdivision)||Number(!!b.country)-Number(!!a.country)||Number(a.priority||100)-Number(b.priority||100))[0];const rate=taxExempt?0:Math.max(0,Number(matched?.rate??category?.rate??defaultTaxRate));const taxable=this.posMoney(row.unit*row.quantity*discountFactor);row.taxRate=rate;row.taxAmount=this.posMoney(rate<=0?0:(pricesIncludeTax?taxable-(taxable/(1+rate/100)):taxable*rate/100));itemTax+=row.taxAmount;}const extraTaxRate=taxExempt?0:defaultTaxRate;const shippingTax=this.posMoney(taxPolicy.shippingTaxable===false?0:(pricesIncludeTax?shippingTotal-(shippingTotal/(1+extraTaxRate/100)):shippingTotal*extraTaxRate/100));const paymentFeeTax=this.posMoney(taxPolicy.paymentFeeTaxable===false?0:(pricesIncludeTax?paymentFee-(paymentFee/(1+extraTaxRate/100)):paymentFee*extraTaxRate/100));const taxTotal=this.posMoney(itemTax+shippingTax+paymentFeeTax);const grandTotal=this.posMoney(netAfterDiscount+shippingTotal+paymentFee+(pricesIncludeTax?0:taxTotal));const taxRate=defaultTaxRate;
    return {store,prepared,existingCustomer,couponCode,legacyDiscount,promotion,paymentMethod,deliveryType,shippingMethod,totals:{subtotal,automaticDiscountTotal,couponDiscountTotal,manualDiscountTotal,discountTotal,shippingTotal,paymentFee,taxTotal,taxRate,pricesIncludeTax,taxExempt,taxCountry,taxSubdivision,taxBreakdown:{items:this.posMoney(itemTax),shipping:shippingTax,paymentFee:paymentFeeTax},grandTotal,currency:String(store.currency||'TRY')}};
  }
  async posQuote(tenantId:string,body:any){const q=await this.buildPosQuote(tenantId,body);return q.totals;}
  async createPosOrder(tenantId:string,userId:string,body:any){
    const q=await this.buildPosQuote(tenantId,body);const {store,prepared,couponCode,legacyDiscount,promotion,paymentMethod,deliveryType,shippingMethod,totals}=q;const storeId=store.id;
    const fulfillmentScope=await this.warehouseScope(tenantId,userId,'fulfill');if(fulfillmentScope){const outside=prepared.flatMap((row:any)=>row.targets||[]).find((target:any)=>target.warehouseId&&!fulfillmentScope.includes(String(target.warehouseId)));if(outside)throw new ForbiddenException('Sipariş stok dağıtımı yetkili olduğunuz depoların dışında. Yönetici farklı bir depo seçmeli veya stok transferi oluşturmalı.');}
    const email=String(body?.customerEmail||'').trim().toLowerCase();const customerName=String(body?.customerName||'').trim();const customerPhone=String(body?.customerPhone||'').trim();const nameParts=customerName.split(/\s+/).filter(Boolean);const firstName=nameParts.length>1?nameParts.slice(0,-1).join(' '):(nameParts[0]||'POS Müşterisi');const lastName=nameParts.length>1?nameParts[nameParts.length-1]:'';let customerId:string|null=q.existingCustomer?.id||null;
    if(email){const customer=await this.prisma.customer.upsert({where:{storeId_email:{storeId,email}},create:{storeId,email,firstName,lastName:lastName||null,phone:customerPhone||null},update:{firstName:customerName?firstName:undefined,lastName:customerName?(lastName||null):undefined,phone:customerPhone||undefined}});customerId=customer.id;}
    const shippingAddress=this.posAddress(body?.shippingAddress,{name:customerName,email,phone:customerPhone,country:'TR'});const billingAddress=this.posAddress(body?.billingAddress||body?.shippingAddress,{name:customerName,email,phone:customerPhone,country:shippingAddress.country||'TR'});
    const result=await this.prisma.$transaction(async tx=>{
      for(const row of prepared)for(const target of row.targets){if(!target.inventory?.trackStock||!target.warehouseId)continue;const qty=Number(target.quantity||0);for(let attempt=0;attempt<4;attempt++){const stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:target.warehouseId,variantId:target.variantId}}});if(!stock)throw new BadRequestException(apiError('merchant.stock.warehouseRecordMissing'));const available=Number(stock.onHand)-Number(stock.reserved)-Number(stock.committed)-Number(stock.damaged)-Number(stock.safetyStock);if(!target.inventory.allowBackorder&&available<qty)throw new BadRequestException(apiError('merchant.stock.insufficient',{product:row.variant.product.title}));const changed=await tx.warehouseStock.updateMany({where:{id:stock.id,onHand:stock.onHand,reserved:stock.reserved,committed:stock.committed},data:{committed:{increment:qty}}});if(changed.count===1)break;if(attempt===3)throw new BadRequestException(apiError('merchant.stock.changedDuringPos'));}}
      const counter=await tx.tenant.update({where:{id:storeId},data:{nextOrderNumber:{increment:1}},select:{nextOrderNumber:true}});
      const salesChannel=await this.resolveSalesChannel(tx,storeId,body?.salesChannelId,'pos','POS / Hızlı Satış','POS');
      const priceOverrides=prepared.filter((row:any)=>row.unit!==row.catalogPrice).map((row:any)=>({variantId:row.variant.id,sku:row.variant.sku,originalPrice:row.catalogPrice,unitPrice:row.unit}));
      const order=await tx.order.create({data:{storeId,customerId,salesChannelId:salesChannel.id,salesChannelSnapshot:{id:salesChannel.id,key:salesChannel.key,name:salesChannel.name,type:salesChannel.type},number:counter.nextOrderNumber-1,status:'PROCESSING',paymentStatus:'PAID',fulfillmentStatus:'UNFULFILLED',paymentMethod,shippingMethod:shippingMethod?.code||`POS_${deliveryType}`,currency:store.currency,subtotal:totals.subtotal,discountTotal:totals.discountTotal,shippingTotal:totals.shippingTotal,paymentFee:totals.paymentFee,taxTotal:totals.taxTotal,grandTotal:totals.grandTotal,discountCode:couponCode||null,promotionSnapshot:{applied:promotion.applied||[],couponCode:couponCode||null,manualDiscount:body?.manualDiscount||null,automaticDiscountTotal:totals.automaticDiscountTotal,couponDiscountTotal:totals.couponDiscountTotal,manualDiscountTotal:totals.manualDiscountTotal},customerNote:body?.note||null,shippingAddress,billingAddress,source:'pos',metadata:{pos:{staffUserId:userId,completedAt:new Date().toISOString(),taxRate:totals.taxRate,pricesIncludeTax:totals.pricesIncludeTax,priceOverrides,deliveryType,shippingMethodCode:shippingMethod?.code||null,shippingMethodName:shippingMethod?.name||null},invoice:{status:'PENDING',company:billingAddress.company||null,taxOffice:billingAddress.taxOffice||null,taxNumber:billingAddress.taxNumber||null}},items:{create:prepared.map((row:any)=>({variantId:row.variant.id,sku:row.variant.sku,title:`${row.variant.product.title} - ${row.variant.title}`,quantity:row.quantity,unitPrice:row.unit,taxRate:row.taxRate??null,taxAmount:row.taxAmount||0,total:this.posMoney(row.unit*row.quantity)}))},statusHistory:{create:{status:'POS_SALE',note:`POS ${paymentMethod} · ${deliveryType}`}}},include:{items:true,customer:true}});
      for(const row of prepared)for(const target of row.targets){if(!target.inventory?.trackStock||!target.warehouseId)continue;const orderItem=order.items.find((x:any)=>x.variantId===target.variantId);await tx.inventoryReservation.create({data:{storeId,orderId:order.id,orderItemId:orderItem?.id||null,variantId:target.variantId,warehouseId:target.warehouseId,quantity:Number(target.quantity||0),status:'COMMITTED'}});}
      const transferGroups=new Map<string,any[]>();for(const row of prepared)for(const target of row.targets){if(!target.transferTargetWarehouseId||!target.warehouseId||target.transferTargetWarehouseId===target.warehouseId)continue;const key=`${target.warehouseId}:${target.transferTargetWarehouseId}`;const arr=transferGroups.get(key)||[];arr.push({variantId:target.variantId,quantity:Number(target.quantity||0)});transferGroups.set(key,arr);}for(const [key,items] of transferGroups){const [sourceWarehouseId,targetWarehouseId]=key.split(':');await tx.warehouseTransferRequirement.createMany({data:items.map((it:any)=>({storeId,orderId:order.id,orderItemId:order.items.find((x:any)=>x.variantId===it.variantId)?.id||null,variantId:it.variantId,sourceWarehouseId,targetWarehouseId,quantity:Number(it.quantity||0),priority:'NORMAL',status:'OPEN'}))});await tx.orderStatusHistory.create({data:{orderId:order.id,status:'WAREHOUSE_TRANSFER_REQUIRED',note:`Eksik stok ${sourceWarehouseId} → ${targetWarehouseId} transfer havuzuna eklendi`}});}
      if(legacyDiscount)await tx.discount.update({where:{id:legacyDiscount.id},data:{usageCount:{increment:1}}});
      for(const ap of promotion.applied||[]){await tx.promotion.update({where:{id:ap.id},data:{usageCount:{increment:1}}});if(ap.code)await tx.promotionCode.updateMany({where:{promotionId:ap.id,code:String(ap.code).toUpperCase()},data:{usageCount:{increment:1}}});await tx.promotionRedemption.create({data:{promotionId:ap.id,customerId,orderId:order.id,code:ap.code||null,discountAmount:Number(ap.discount||0)}});}
      return order;
    });
    if(result?.paymentStatus==='PAID'&&result?.id)void this.edoc.maybeAutoCreateForOrder(storeId,result.id,'PAYMENT_PAID');
    return result;
  }


    async completeDraftOrderViaCentralPipeline(tenantId:string,storeId:string,id:string,actor?:string){
    await this.assertStore(tenantId,storeId);
    const draft:any=await this.prisma.draftOrder.findFirst({where:{id,storeId}});
    if(!draft)throw new NotFoundException('Draft order not found');
    if(draft.completedOrderId)return this.prisma.order.findUnique({where:{id:draft.completedOrderId},include:{items:true,customer:true}});
    if(draft.status!=='DRAFT')throw new BadRequestException('Draft order is not convertible');

    const lines:any[]=Array.isArray(draft.lineItems)?draft.lineItems:[];
    if(!lines.length)throw new BadRequestException('Draft order has no items');
    if(lines.some((x:any)=>!String(x?.variantId||'')||Number(x?.quantity||0)<=0))throw new BadRequestException('Draft order contains invalid line items');

    const customer:any=draft.customerId?await this.prisma.customer.findFirst({where:{id:draft.customerId,storeId}}):null;
    if(draft.customerId&&!customer)throw new BadRequestException('Draft order customer is unavailable');

    const meta:any=draft.metadata||{};
    const discount=Math.max(0,Number(draft.discountTotal||0));
    const body:any={
      storeId,
      items:lines.map((x:any)=>({
        variantId:String(x.variantId),
        quantity:Math.max(1,Number(x.quantity||1)),
        ...(x.unitPrice===null||x.unitPrice===undefined?{}:{unitPrice:Number(x.unitPrice)})
      })),
      customerEmail:customer?.email||'',
      customerName:customer?[customer.firstName,customer.lastName].filter(Boolean).join(' '):'',
      customerPhone:customer?.phone||'',
      shippingAddress:draft.shippingAddress||{},
      billingAddress:draft.billingAddress||draft.shippingAddress||{},
      paymentMethod:String(meta.paymentMethod||'BANK_TRANSFER'),
      paymentStatus:String(meta.paymentStatus||'PENDING'),
      deliveryType:String(meta.deliveryType||'SHIPPING'),
      manualDiscount:discount>0?{type:'FIXED',value:discount}:{type:'NONE',value:0},
      warehouseId:meta.warehouseId||null,
      reserveStock:meta.reserveStock!==false,
      note:draft.note||null,
      adminNote:meta.adminNote||null,
      tags:Array.isArray(draft.tags)?draft.tags.map(String):[],
      idempotencyKey:`draft:${id}`
    };

    let order:any;
    try{
      order=await this.createManualOrder(tenantId,String(actor||draft.createdBy||''),body);
    }catch(e:any){
      if(e?.code!=='P2002')throw e;
      order=await this.prisma.order.findFirst({
        where:{storeId,idempotencyKey:`draft:${id}`},
        include:{items:true,customer:true}
      });
      if(!order)throw e;
    }

    if(!order)throw new BadRequestException('Draft order conversion failed');

    return this.prisma.$transaction(async tx=>{
      const current:any=await tx.draftOrder.findFirst({where:{id,storeId}});
      if(!current)throw new NotFoundException('Draft order not found');

      if(current.completedOrderId&&current.completedOrderId!==order.id){
        const existing=await tx.order.findUnique({
          where:{id:current.completedOrderId},
          include:{items:true,customer:true}
        });
        if(existing)return existing;
      }

      const existingOrder:any=await tx.order.findUnique({where:{id:order.id}});
      const existingMeta:any=existingOrder?.metadata||{};

      await tx.order.update({
        where:{id:order.id},
        data:{
          source:'draft_order',
          metadata:{
            ...existingMeta,
            draftOrder:{
              id:draft.id,
              createdBy:actor||draft.createdBy||null,
              convertedAt:new Date().toISOString(),
              source:meta.source||'manual_order'
            }
          }
        }
      });

      const hasHistory=await tx.orderStatusHistory.findFirst({
        where:{orderId:order.id,status:'DRAFT_CONVERTED'}
      });
      if(!hasHistory){
        await tx.orderStatusHistory.create({
          data:{
            orderId:order.id,
            status:'DRAFT_CONVERTED',
            note:'Draft order converted through central order pipeline'
          }
        });
      }

      await tx.draftOrder.update({
        where:{id},
        data:{status:'COMPLETED',completedOrderId:order.id}
      });

      return tx.order.findUnique({
        where:{id:order.id},
        include:{items:true,customer:true}
      });
    },{isolationLevel:'Serializable'} as any);
  }

async manualOrderQuote(tenantId:string,body:any){
    const q=await this.buildPosQuote(tenantId,{...body,paymentMethod:body?.paymentMethod||'BANK_TRANSFER'});
    return {...q.totals,source:'manual_order'};
  }

  private async reservationMinutes(storeId:string,db:any=this.prisma){const cfg:any=await db.checkoutConfig.findUnique({where:{storeId},select:{reservationMinutes:true}});return Math.max(1,Math.min(1440,Number(cfg?.reservationMinutes??30)));}

  async createManualOrder(tenantId:string,userId:string,body:any){
    const q=await this.buildPosQuote(tenantId,{...body,paymentMethod:body?.paymentMethod||'BANK_TRANSFER'});
    const {store,prepared,couponCode,legacyDiscount,promotion,paymentMethod,deliveryType,shippingMethod,totals}=q;const storeId=store.id;
    const reservationMinutes=await this.reservationMinutes(storeId);
    const requestedPaymentStatus=String(body?.paymentStatus||'PENDING').toUpperCase();const paymentStatus=requestedPaymentStatus==='PAID'?'PAID':'PENDING';const orderSource=String(body?.orderSource||'manual_order').toLowerCase()==='pos'?'pos':'manual_order';const reserveStock=body?.reserveStock!==false;const reservationStatus=paymentStatus==='PAID'?'COMMITTED':'HELD';
    const requestedWarehouseId=String(body?.warehouseId||'').trim();const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    if(requestedWarehouseId){const wh=await this.prisma.warehouse.findFirst({where:{id:requestedWarehouseId,storeId,isActive:true}});if(!wh)throw new BadRequestException('Seçilen depo bulunamadı');if(scope&&!scope.includes(requestedWarehouseId))throw new ForbiddenException('Bu depoda sipariş oluşturma yetkiniz yok');}
    const preparedRows=prepared.map((row:any)=>({...row,targets:(row.targets||[]).map((target:any)=>requestedWarehouseId&&target.inventory?.trackStock?{...target,warehouseId:requestedWarehouseId,warehouseStock:null,transferTargetWarehouseId:null}:target)}));
    if(scope&&!requestedWarehouseId){const outside=preparedRows.flatMap((row:any)=>row.targets||[]).find((target:any)=>target.warehouseId&&!scope.includes(String(target.warehouseId)));if(outside)throw new ForbiddenException('Sipariş stok dağıtımı yetkili olduğunuz depoların dışında');}
    const email=String(body?.customerEmail||'').trim().toLowerCase();const customerName=String(body?.customerName||'').trim();const customerPhone=String(body?.customerPhone||'').trim();let customerId:string|null=q.existingCustomer?.id||null;
    if(email&&!customerId){const parts=customerName.split(/\s+/).filter(Boolean);const firstName=parts.length>1?parts.slice(0,-1).join(' '):(parts[0]||'Müşteri');const lastName=parts.length>1?parts[parts.length-1]:null;const c=await this.prisma.customer.create({data:{storeId,email,firstName,lastName,phone:customerPhone||null}});customerId=c.id;}
    const shippingAddress=this.posAddress(body?.shippingAddress,{name:customerName,email,phone:customerPhone,country:'TR'});const billingAddress=this.posAddress(body?.billingAddress||body?.shippingAddress,{name:customerName,email,phone:customerPhone,country:shippingAddress.country||'TR'});const tags=Array.isArray(body?.tags)?body.tags.map(String).map((x:string)=>x.trim()).filter(Boolean).slice(0,50):[];
    const result=await this.prisma.$transaction(async tx=>{
      if(reserveStock){for(const row of preparedRows)for(const target of row.targets){if(!target.inventory?.trackStock||!target.warehouseId)continue;const qty=Math.max(0,Number(target.quantity||0));let stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:target.warehouseId,variantId:target.variantId}}});if(!stock&&target.inventory.allowBackorder)stock=await tx.warehouseStock.create({data:{warehouseId:target.warehouseId,variantId:target.variantId,onHand:0}});if(!stock)throw new BadRequestException(`Seçilen depoda stok kaydı yok: ${row.variant.sku}`);for(let attempt=0;attempt<4;attempt++){const available=Number(stock.onHand)-Number(stock.reserved)-Number(stock.committed)-Number(stock.damaged)-Number(stock.safetyStock);if(!target.inventory.allowBackorder&&available<qty)throw new BadRequestException(`Yetersiz stok: ${row.variant.product.title}`);const data=reservationStatus==='COMMITTED'?{committed:{increment:qty}}:{reserved:{increment:qty}};const changed=await tx.warehouseStock.updateMany({where:{id:stock.id,onHand:stock.onHand,reserved:stock.reserved,committed:stock.committed},data});if(changed.count===1)break;if(attempt===3)throw new BadRequestException('Stok sipariş oluşturulurken değişti; tekrar deneyin');stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:target.warehouseId,variantId:target.variantId}}});if(!stock)throw new BadRequestException('Stok kaydı bulunamadı');}}}
      const counter=await tx.tenant.update({where:{id:storeId},data:{nextOrderNumber:{increment:1}},select:{nextOrderNumber:true}});const channelKey=orderSource==='pos'?'pos':'admin';const salesChannel=await this.resolveSalesChannel(tx,storeId,body?.salesChannelId,channelKey,orderSource==='pos'?'POS / Hızlı Satış':'Yönetim Paneli',orderSource==='pos'?'POS':'MANUAL');const status=paymentStatus==='PAID'?'PROCESSING':'PENDING_PAYMENT';const priceOverrides=preparedRows.filter((row:any)=>row.unit!==row.catalogPrice).map((row:any)=>({variantId:row.variant.id,sku:row.variant.sku,originalPrice:row.catalogPrice,unitPrice:row.unit}));
      const order:any=await tx.order.create({data:{idempotencyKey:body?.idempotencyKey||null,storeId,customerId,salesChannelId:salesChannel.id,salesChannelSnapshot:{id:salesChannel.id,key:salesChannel.key,name:salesChannel.name,type:salesChannel.type},number:counter.nextOrderNumber-1,status,paymentStatus,fulfillmentStatus:'UNFULFILLED',paymentMethod,shippingMethod:shippingMethod?.code||deliveryType,currency:store.currency,subtotal:totals.subtotal,discountTotal:totals.discountTotal,shippingTotal:totals.shippingTotal,paymentFee:totals.paymentFee,taxTotal:totals.taxTotal,grandTotal:totals.grandTotal,discountCode:couponCode||null,promotionSnapshot:{applied:promotion.applied||[],couponCode:couponCode||null,manualDiscount:body?.manualDiscount||null,automaticDiscountTotal:totals.automaticDiscountTotal,couponDiscountTotal:totals.couponDiscountTotal,manualDiscountTotal:totals.manualDiscountTotal},customerNote:body?.note||null,adminNote:body?.adminNote||null,shippingAddress,billingAddress,source:orderSource,tags,metadata:{...(orderSource==='pos'?{pos:{staffUserId:userId,completedAt:new Date().toISOString(),warehouseId:requestedWarehouseId||null,reserveStock,paymentStatus,priceOverrides,deliveryType}}:{manualOrder:{createdBy:userId,createdAt:new Date().toISOString(),warehouseId:requestedWarehouseId||null,reserveStock,paymentStatus,priceOverrides,deliveryType}}),invoice:{status:'PENDING',type:String(body?.invoiceType||'INDIVIDUAL').toUpperCase()==='COMPANY'?'COMPANY':'INDIVIDUAL',company:billingAddress.company||null,taxOffice:billingAddress.taxOffice||null,taxNumber:billingAddress.taxNumber||null}},items:{create:preparedRows.map((row:any)=>({variantId:row.variant.id,productIdSnapshot:row.variant.productId,sku:row.variant.sku,barcodeSnapshot:row.variant.barcode||null,title:row.variant.product.title,variantTitle:row.variant.title,quantity:row.quantity,originalUnitPrice:row.catalogPrice,unitPrice:row.unit,discountTotal:0,taxRate:row.taxRate??null,taxAmount:row.taxAmount||0,total:this.posMoney(row.unit*row.quantity)}))},statusHistory:{create:{status:orderSource==='pos'?'POS_ORDER_CREATED':'MANUAL_ORDER_CREATED',note:`${orderSource==='pos'?'POS':'Backoffice'} · ${paymentStatus} · ${deliveryType}`}}},include:{items:true,customer:true}});
      if(reserveStock){for(const row of preparedRows)for(const target of row.targets){if(!target.inventory?.trackStock||!target.warehouseId)continue;const orderItem=order.items.find((x:any)=>x.variantId===row.variant.id);await tx.inventoryReservation.create({data:{storeId,orderId:order.id,orderItemId:orderItem?.id||null,variantId:target.variantId,warehouseId:target.warehouseId,quantity:Number(target.quantity||0),status:reservationStatus,expiresAt:reservationStatus==='HELD'?new Date(Date.now()+reservationMinutes*60*1000):null,metadata:{source:orderSource}}});}}
      if(paymentStatus==='PAID')await tx.paymentTransaction.create({data:{storeId,orderId:order.id,type:'SALE',status:'SUCCEEDED',amount:totals.grandTotal,currency:store.currency,providerTransactionId:orderSource==='pos'?`pos:${order.id}`:`manual:${order.id}`,idempotencyKey:orderSource==='pos'?`pos-order:${order.id}:sale`:`manual-order:${order.id}:sale`,raw:{createdBy:userId,paymentMethod,source:orderSource}}});
      if(legacyDiscount)await tx.discount.update({where:{id:legacyDiscount.id},data:{usageCount:{increment:1}}});for(const ap of promotion.applied||[]){await tx.promotion.update({where:{id:ap.id},data:{usageCount:{increment:1}}});if(ap.code)await tx.promotionCode.updateMany({where:{promotionId:ap.id,code:String(ap.code).toUpperCase()},data:{usageCount:{increment:1}}});await tx.promotionRedemption.create({data:{promotionId:ap.id,customerId,orderId:order.id,code:ap.code||null,discountAmount:Number(ap.discount||0)}});}
      return order;
    },{isolationLevel:'Serializable'} as any);
    if(result?.paymentStatus==='PAID'&&result?.id)void this.edoc.maybeAutoCreateForOrder(storeId,result.id,'PAYMENT_PAID');
    return result;
  }

  async liveTracking(tenantId:string,storeId:string){return this.live.snapshot(tenantId,storeId);}

  async merchantSessions(userId:string){
    return this.prisma.merchantSession.findMany({where:{userId,revokedAt:null,expiresAt:{gt:new Date()}},select:{id:true,userAgentHash:true,ipHash:true,lastUsedAt:true,createdAt:true,expiresAt:true},orderBy:{lastUsedAt:'desc'},take:20});
  }
  async revokeMerchantSession(userId:string,sessionId:string,currentSessionId?:string){
    if(sessionId===currentSessionId)throw new BadRequestException(apiError('merchant.session.currentCannotRemove'));
    const row=await this.prisma.merchantSession.findFirst({where:{id:sessionId,userId,revokedAt:null}});if(!row)throw new NotFoundException(apiError('merchant.session.notFound'));
    await this.prisma.merchantSession.update({where:{id:sessionId},data:{revokedAt:new Date()}});return {revoked:true};
  }
  private apiKeyHash(value:string){return createHash('sha256').update(value).digest('hex');}
  async apiKeys(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);return this.prisma.storeApiKey.findMany({where:{storeId},select:{id:true,name:true,prefix:true,scopes:true,lastUsedAt:true,expiresAt:true,revokedAt:true,createdAt:true},orderBy:{createdAt:'desc'}});}
  async createApiKey(tenantId:string,storeId:string,body:any){await this.assertStore(tenantId,storeId);const secret=`we_${randomBytes(24).toString('base64url')}`;const prefix=secret.slice(0,11);const row=await this.prisma.storeApiKey.create({data:{storeId,name:String(body?.name||'API Anahtarı'),prefix,secretHash:this.apiKeyHash(secret),scopes:Array.isArray(body?.scopes)?body.scopes.map(String):[],expiresAt:body?.expiresAt?new Date(body.expiresAt):null}});return {id:row.id,name:row.name,prefix:row.prefix,secret,scopes:row.scopes,createdAt:row.createdAt};}
  async revokeApiKey(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.storeApiKey.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException(apiError('merchant.apiKey.notFound'));return this.prisma.storeApiKey.update({where:{id},data:{revokedAt:new Date()}});}

  async discounts(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.discount.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }); }
  async createDiscount(tenantId: string, storeId: string, body: any) { await this.assertStore(tenantId, storeId); if (Array.isArray(body.productIds) && body.productIds.length) { const count = await this.prisma.product.count({ where: { id: { in: body.productIds }, storeId } }); if (count !== new Set(body.productIds).size) throw new BadRequestException('One or more products do not belong to store'); } if (Array.isArray(body.categoryIds) && body.categoryIds.length) { const count = await this.prisma.category.count({ where: { id: { in: body.categoryIds }, storeId } }); if (count !== new Set(body.categoryIds).size) throw new BadRequestException('One or more categories do not belong to store'); } return this.prisma.discount.create({ data: { storeId, name: body.name, code: body.code?.toUpperCase() || null, type: body.type, scope: body.scope || 'ORDER', value: body.value || 0, minimumAmount: body.minimumAmount, maximumDiscount: body.maximumDiscount, usageLimit: body.usageLimit, perCustomerLimit: body.perCustomerLimit, startsAt: body.startsAt ? new Date(body.startsAt) : null, endsAt: body.endsAt ? new Date(body.endsAt) : null, isActive: body.isActive ?? true, products: { create: (body.productIds || []).map((productId: string) => ({ productId })) }, categories: { create: (body.categoryIds || []).map((categoryId: string) => ({ categoryId })) } } }); }
  async updateDiscount(tenantId: string, storeId: string, id: string, body: any) { await this.assertStore(tenantId, storeId); const d = await this.prisma.discount.findFirst({ where: { id, storeId } }); if (!d) throw new NotFoundException(); const allowed = ['name','code','type','scope','value','minimumAmount','maximumDiscount','usageLimit','perCustomerLimit','isActive']; return this.prisma.discount.update({ where: { id }, data: Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k))) }); }

  async shippingMethods(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.shippingMethod.findMany({ where: { storeId }, orderBy: { sortOrder: 'asc' } }); }
  async createShippingMethod(tenantId: string, storeId: string, b: any) { await this.assertStore(tenantId, storeId); return this.prisma.shippingMethod.create({ data: { storeId, name: b.name, code: b.code, type: b.type || 'shipping', description: b.description, requiresAddress: b.requiresAddress ?? true, supportsPickup: b.supportsPickup ?? false, price: b.price || 0, freeAbove: b.freeAbove, estimatedMinDays: b.estimatedMinDays, estimatedMaxDays: b.estimatedMaxDays, isActive: b.isActive ?? true, sortOrder: b.sortOrder || 0 } }); }
  async updateShippingMethod(tenantId: string, storeId: string, id: string, b: any) { await this.assertStore(tenantId, storeId); const row = await this.prisma.shippingMethod.findFirst({ where: { id, storeId } }); if (!row) throw new NotFoundException(); const allowed = ['name','code','type','description','requiresAddress','supportsPickup','price','freeAbove','estimatedMinDays','estimatedMaxDays','isActive','sortOrder']; return this.prisma.shippingMethod.update({ where: { id }, data: Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k))) }); }
  async deleteShippingMethod(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.shippingMethod.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException(apiError('merchant.shippingMethod.notFound'));await this.prisma.shippingMethod.delete({where:{id}});return{deleted:true};}

  async paymentMethods(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.paymentMethod.findMany({ where: { storeId }, orderBy: { sortOrder: 'asc' } }); }
  async createPaymentMethod(tenantId: string, storeId: string, b: any) { await this.assertStore(tenantId, storeId); return this.prisma.paymentMethod.create({ data: { storeId, name: b.name, code: b.code, type: b.type || 'manual', instructions: b.instructions, requiresOnlinePayment: !!b.requiresOnlinePayment, supportsInstallment: !!b.supportsInstallment, fee: b.fee || 0, isActive: b.isActive ?? true, sortOrder: b.sortOrder || 0, config: b.config } }); }
  async updatePaymentMethod(tenantId: string, storeId: string, id: string, b: any) { await this.assertStore(tenantId, storeId); const row = await this.prisma.paymentMethod.findFirst({ where: { id, storeId } }); if (!row) throw new NotFoundException(); const allowed = ['name','code','type','instructions','requiresOnlinePayment','supportsInstallment','fee','isActive','sortOrder','config']; return this.prisma.paymentMethod.update({ where: { id }, data: Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k))) }); }

  /** Theme ZIP owns the template. Null means the theme default/legacy slug fallback. */
  private pageTemplateSuffix(value:unknown):string|null {
    if(value===undefined||value===null||value==='')return null;
    if(typeof value!=='string')throw new BadRequestException('Invalid page template suffix');
    const suffix=value.trim();
    if(!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(suffix))throw new BadRequestException('Invalid page template suffix');
    return suffix;
  }
  private pageTranslations(body:any, defaultLocale:string) {
    const incoming=Array.isArray(body.translations)?body.translations:[];
    if(!incoming.length) return [{locale:body.defaultLocale||defaultLocale,fields:{title:body.title||'',slug:this.slugify(body.slug||body.title),body:body.body||'',seoTitle:body.seoTitle||'',seoDescription:body.seoDescription||''}}];
    return incoming.map((x:any)=>({locale:String(x.locale||'').trim(),fields:{title:String(x.fields?.title||'').trim(),slug:this.slugify(x.fields?.slug||x.fields?.title),body:String(x.fields?.body||''),seoTitle:String(x.fields?.seoTitle||''),seoDescription:String(x.fields?.seoDescription||'')}})).filter((x:any)=>x.locale);
  }
  private async assertTranslatedPageSlugs(storeId:string, translations:any[], excludeId?:string) {
    const rows=await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'page',...(excludeId?{NOT:{entityId:excludeId}}:{})}});
    for(const tr of translations){if(!tr.fields.slug)continue;const clash=rows.find((r:any)=>r.locale===tr.locale&&String((r.fields as any)?.slug||'')===tr.fields.slug);if(clash)throw new BadRequestException(`Slug already exists for ${tr.locale}: ${tr.fields.slug}`);}
  }
  async pages(tenantId: string, storeId: string) {
    await this.assertStore(tenantId, storeId);
    const pages=await this.prisma.page.findMany({where:{storeId},orderBy:{updatedAt:'desc'},take:500});
    const translations=pages.length?await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'page',entityId:{in:pages.map(x=>x.id)}}}):[];
    const grouped=new Map<string,any[]>();for(const tr of translations){const list=grouped.get(tr.entityId)||[];list.push({locale:tr.locale,fields:tr.fields});grouped.set(tr.entityId,list);}
    return pages.map(x=>({...x,translations:grouped.get(x.id)||[]}));
  }
  async createPage(tenantId: string, storeId: string, b: any) {
    const store=await this.assertStore(tenantId, storeId);
    const defaultLocale=String(b.defaultLocale||store.locale||'tr-TR');
    const translations=this.pageTranslations(b,defaultLocale);
    const base=translations.find((x:any)=>x.locale===defaultLocale)||translations[0];
    if(!base?.fields.title||!base?.fields.slug)throw new BadRequestException('Default language title and slug are required');
    await this.assertTranslatedPageSlugs(storeId,translations.filter((x:any)=>x.locale!==defaultLocale));
    return this.prisma.$transaction(async tx=>{
      const page=await tx.page.create({data:{storeId,title:base.fields.title,slug:base.fields.slug,body:base.fields.body||'',imageUrl:b.imageUrl||null,templateSuffix:this.pageTemplateSuffix(b.templateSuffix),status:b.status||'DRAFT',seoTitle:base.fields.seoTitle||null,seoDescription:base.fields.seoDescription||null}});
      const other=translations.filter((x:any)=>x.locale!==defaultLocale);if(other.length)await tx.contentTranslation.createMany({data:other.map((x:any)=>({storeId,entityType:'page',entityId:page.id,locale:x.locale,fields:x.fields}))});
      return page;
    });
  }
  async updatePage(tenantId: string, storeId: string, id: string, b: any) {
    const store=await this.assertStore(tenantId, storeId);const row=await this.prisma.page.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();
    const defaultLocale=String(b.defaultLocale||store.locale||'tr-TR');const translations=this.pageTranslations(b,defaultLocale);const base=translations.find((x:any)=>x.locale===defaultLocale)||translations[0];
    if(!base?.fields.title||!base?.fields.slug)throw new BadRequestException('Default language title and slug are required');
    await this.assertTranslatedPageSlugs(storeId,translations.filter((x:any)=>x.locale!==defaultLocale),id);
    return this.prisma.$transaction(async tx=>{
      await tx.page.update({where:{id},data:{title:base.fields.title,slug:base.fields.slug,body:base.fields.body||'',imageUrl:b.imageUrl===undefined?row.imageUrl:(b.imageUrl||null),templateSuffix:b.templateSuffix===undefined?row.templateSuffix:this.pageTemplateSuffix(b.templateSuffix),status:b.status||row.status,seoTitle:base.fields.seoTitle||null,seoDescription:base.fields.seoDescription||null}});
      await tx.contentTranslation.deleteMany({where:{storeId,entityType:'page',entityId:id}});
      const other=translations.filter((x:any)=>x.locale!==defaultLocale);if(other.length)await tx.contentTranslation.createMany({data:other.map((x:any)=>({storeId,entityType:'page',entityId:id,locale:x.locale,fields:x.fields}))});
      return tx.page.findUnique({where:{id}});
    });
  }
  async deletePage(tenantId:string,storeId:string,id:string){
    const store=await this.assertStore(tenantId,storeId);const row=await this.prisma.page.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException();
    const settings:any=store.settings||{};const contractPages:any=settings.contractPages||{};const cleaned:any={};for(const [key,value] of Object.entries(contractPages)){if(String(value)!==id)cleaned[key]=value;}
    await this.prisma.$transaction([this.prisma.contentTranslation.deleteMany({where:{storeId,entityType:'page',entityId:id}}),this.prisma.page.delete({where:{id}}),this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,contractPages:cleaned}}})]);
    await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return{deleted:true};
  }

  async menus(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.menu.findMany({ where: { storeId } }); }
  async upsertMenu(tenantId: string, storeId: string, b: any) { await this.assertStore(tenantId, storeId); return this.prisma.menu.upsert({ where: { storeId_handle: { storeId, handle: b.handle } }, create: { storeId, name: b.name, handle: b.handle, items: b.items || [] }, update: { name: b.name, items: b.items || [] } }); }

  async banners(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.banner.findMany({ where: { storeId }, orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }] }); }
  async createBanner(tenantId: string, storeId: string, b: any) { await this.assertStore(tenantId, storeId); return this.prisma.banner.create({ data: { storeId, title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl, mobileImageUrl: b.mobileImageUrl, buttonText: b.buttonText, buttonUrl: b.buttonUrl, position: b.position || 'home_hero', sortOrder: b.sortOrder || 0, isActive: b.isActive ?? true } }); }

  async blogCategories(tenantId: string, storeId: string) {
    await this.assertStore(tenantId, storeId);
    return this.prisma.blogCategory.findMany({ where: { storeId }, include: { parent: { select: { id: true, title: true } }, _count: { select: { posts: true, children: true } } }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  }
  async createBlogCategory(tenantId: string, storeId: string, body: any) {
    await this.assertStore(tenantId, storeId);
    if (body.parentId) { const parent = await this.prisma.blogCategory.findFirst({ where: { id: body.parentId, storeId } }); if (!parent) throw new BadRequestException('Parent blog category does not belong to store'); }
    return this.prisma.blogCategory.create({ data: { storeId, parentId: body.parentId || null, title: String(body.title || '').trim(), slug: this.slugify(body.slug || body.title), description: body.description || null, imageUrl: body.imageUrl || null, seoTitle: body.seoTitle || null, seoDescription: body.seoDescription || null, sortOrder: Number(body.sortOrder || 0), isActive: body.isActive !== false } });
  }
  async updateBlogCategory(tenantId: string, storeId: string, id: string, body: any) {
    await this.assertStore(tenantId, storeId);
    const row = await this.prisma.blogCategory.findFirst({ where: { id, storeId } }); if (!row) throw new NotFoundException('Blog category not found');
    if (body.parentId === id) throw new BadRequestException('Category cannot be its own parent');
    if (body.parentId) { const parent = await this.prisma.blogCategory.findFirst({ where: { id: body.parentId, storeId } }); if (!parent) throw new BadRequestException('Parent blog category does not belong to store'); }
    const data:any={}; for (const k of ['parentId','title','description','imageUrl','seoTitle','seoDescription','sortOrder','isActive']) if (body[k] !== undefined) data[k]=body[k];
    if (body.slug !== undefined || body.title !== undefined) data.slug=this.slugify(body.slug || body.title || row.slug);
    return this.prisma.blogCategory.update({ where: { id }, data });
  }
  async deleteBlogCategory(tenantId: string, storeId: string, id: string) { await this.assertStore(tenantId, storeId); const row=await this.prisma.blogCategory.findFirst({where:{id,storeId}}); if(!row)throw new NotFoundException('Blog category not found'); await this.prisma.blogCategory.delete({where:{id}}); return {deleted:true}; }

  async blogPosts(tenantId: string, storeId: string) {
    await this.assertStore(tenantId, storeId);
    return this.prisma.blogPost.findMany({ where: { storeId }, include: { category: { select: { id: true, title: true } }, products: { include: { product: { select: { id: true, title: true, slug: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } } }, orderBy: { sortOrder: 'asc' } }, _count: { select: { comments: true } } }, orderBy: { updatedAt: 'desc' } });
  }
  async createBlogPost(tenantId: string, storeId: string, body: any) {
    await this.assertStore(tenantId, storeId);
    if (body.categoryId) { const category=await this.prisma.blogCategory.findFirst({where:{id:body.categoryId,storeId}}); if(!category)throw new BadRequestException('Blog category does not belong to store'); }
    const productIds:string[]=Array.isArray(body.productIds)?Array.from(new Set<string>(body.productIds.map((x:any)=>String(x)))):[];
    if(productIds.length){const count=await this.prisma.product.count({where:{storeId,id:{in:productIds}}});if(count!==productIds.length)throw new BadRequestException('One or more products do not belong to store');}
    const status=body.status || 'DRAFT';
    return this.prisma.blogPost.create({ data: { storeId, locale: String(body.locale || 'tr-TR'), categoryId: body.categoryId || null, title: String(body.title || '').trim(), slug: this.slugify(body.slug || body.title), excerpt: body.excerpt || null, body: body.body || '', featuredImageUrl: body.featuredImageUrl || null, status, seoTitle: body.seoTitle || null, seoDescription: body.seoDescription || null, tags: Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : [], publishedAt: status === 'PUBLISHED' ? (body.publishedAt ? new Date(body.publishedAt) : new Date()) : (body.publishedAt ? new Date(body.publishedAt) : null), products: { create: productIds.map((productId:string,index:number)=>({productId,sortOrder:index})) } }, include: { category: true, products: { include: { product: true } } } });
  }
  async updateBlogPost(tenantId: string, storeId: string, id: string, body: any) {
    await this.assertStore(tenantId, storeId);
    const row=await this.prisma.blogPost.findFirst({where:{id,storeId}}); if(!row)throw new NotFoundException('Blog post not found');
    if (body.categoryId) { const category=await this.prisma.blogCategory.findFirst({where:{id:body.categoryId,storeId}}); if(!category)throw new BadRequestException('Blog category does not belong to store'); }
    const productIds:string[]|null=body.productIds===undefined?null:(Array.isArray(body.productIds)?Array.from(new Set<string>(body.productIds.map((x:any)=>String(x)))):[]);
    if(productIds?.length){const count=await this.prisma.product.count({where:{storeId,id:{in:productIds}}});if(count!==productIds.length)throw new BadRequestException('One or more products do not belong to store');}
    const data:any={}; for(const k of ['locale','categoryId','title','excerpt','body','featuredImageUrl','status','seoTitle','seoDescription','tags']) if(body[k]!==undefined)data[k]=body[k];
    if(body.slug!==undefined||body.title!==undefined)data.slug=this.slugify(body.slug||body.title||row.slug);
    if(body.status==='PUBLISHED'&&!row.publishedAt)data.publishedAt=body.publishedAt?new Date(body.publishedAt):new Date(); else if(body.publishedAt!==undefined)data.publishedAt=body.publishedAt?new Date(body.publishedAt):null;
    return this.prisma.$transaction(async tx=>{if(productIds!==null){await tx.blogPostProduct.deleteMany({where:{postId:id}});if(productIds.length)await tx.blogPostProduct.createMany({data:productIds.map((productId:string,index:number)=>({postId:id,productId,sortOrder:index}))});}await tx.blogPost.update({where:{id},data});return tx.blogPost.findUnique({where:{id},include:{category:true,products:{include:{product:true}}}});});
  }
  async deleteBlogPost(tenantId: string, storeId: string, id: string) { await this.assertStore(tenantId, storeId); const row=await this.prisma.blogPost.findFirst({where:{id,storeId}}); if(!row)throw new NotFoundException('Blog post not found'); await this.prisma.blogPost.delete({where:{id}}); return {deleted:true}; }

  async blogComments(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.blogComment.findMany({ where: { storeId }, include: { post: { select: { id: true, title: true, slug: true } }, customer: { select: { id: true, email: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }); }
  async updateBlogComment(tenantId: string, storeId: string, id: string, body: any) { await this.assertStore(tenantId, storeId); const row=await this.prisma.blogComment.findFirst({where:{id,storeId}}); if(!row)throw new NotFoundException('Blog comment not found'); const data:any={}; for(const k of ['status','authorName','authorEmail','body'])if(body[k]!==undefined)data[k]=body[k]; return this.prisma.blogComment.update({where:{id},data}); }
  async deleteBlogComment(tenantId: string, storeId: string, id: string) { await this.assertStore(tenantId, storeId); const row=await this.prisma.blogComment.findFirst({where:{id,storeId}}); if(!row)throw new NotFoundException('Blog comment not found'); await this.prisma.blogComment.delete({where:{id}}); return {deleted:true}; }

  async reviews(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.review.findMany({ where: { storeId }, include: { product: { select: { title: true } }, customer: { select: { email: true } } }, orderBy: { createdAt: 'desc' } }); }
  async moderateReview(tenantId: string, storeId: string, id: string, body: any) { await this.assertStore(tenantId, storeId); const r = await this.prisma.review.findFirst({ where: { id, storeId } }); if (!r) throw new NotFoundException(); const data:any={};if(body.status!==undefined){data.status=body.status;if(body.status==='APPROVED')data.publishedAt=new Date();if(['REJECTED','SPAM'].includes(String(body.status)))data.unpublishedAt=new Date();}if(body.merchantReply!==undefined){data.merchantReply=String(body.merchantReply||'')||null;data.repliedAt=data.merchantReply?new Date():null;}return this.prisma.review.update({ where: { id }, data }); }

  async returns(tenantId:string,storeId:string,userId?:string){await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'return');const where:any={storeId};if(scope)where.order={OR:[{inventoryReservations:{some:{warehouseId:{in:scope}}}},{fulfillments:{some:{warehouseId:{in:scope}}}}]};return this.prisma.returnRequest.findMany({where,include:{order:true,customer:true,items:{include:{orderItem:true}},},orderBy:{createdAt:'desc'},take:500});}
  async returnPolicy(tenantId:string,storeId:string){const store:any=await this.assertStore(tenantId,storeId);const current:any=(store.settings as any)?.returnPolicy||{};return{returnWindowDays:Number(current.returnWindowDays||14),corporateInvoiceRequired:current.corporateInvoiceRequired!==false,reasons:Array.isArray(current.reasons)&&current.reasons.length?current.reasons:[{code:'CHANGE_OF_MIND',label:'Fikir değişikliği',active:true},{code:'DAMAGED',label:'Hasarlı ürün',active:true,requiresImages:true},{code:'WRONG_ITEM',label:'Yanlış ürün',active:true,requiresImages:true},{code:'NOT_AS_DESCRIBED',label:'Açıklamayla uyuşmuyor',active:true},{code:'OTHER',label:'Diğer',active:true}]};}
  async updateReturnPolicy(tenantId:string,storeId:string,b:any){const store:any=await this.assertStore(tenantId,storeId);const reasons=(Array.isArray(b?.reasons)?b.reasons:[]).slice(0,30).map((x:any)=>({code:String(x.code||'').trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_'),label:String(x.label||'').trim(),active:x.active!==false,requiresImages:!!x.requiresImages,autoApprove:!!x.autoApprove})).filter((x:any)=>x.code&&x.label);const policy={returnWindowDays:Math.max(1,Math.min(365,Number(b?.returnWindowDays||14))),corporateInvoiceRequired:b?.corporateInvoiceRequired!==false,reasons:reasons.length?reasons:(await this.returnPolicy(tenantId,storeId)).reasons};const settings:any=store.settings||{};await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,returnPolicy:policy}}});return policy;}

  async storeSettings(tenantId: string, storeId: string) {
    await this.assertStore(tenantId, storeId);
    return this.prisma.tenant.findUnique({ where: { id: storeId }, include: { addresses: { orderBy: [{ isDefault: 'desc' }, { label: 'asc' }] }, currencies: { orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] }, locales: { orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }] }, checkoutConfig: true, legalDocuments: { orderBy: { updatedAt: 'desc' } } } });
  }

  private defaultSettingsPolicies(){
    return {
      orderCheckoutPolicy:{orderPrefix:'SIP-',allowCustomerCancel:true,cancelWindowMinutes:30},
      productStockPolicy:{defaultTrackStock:true,defaultLowStockAt:5,allowNegativeStock:false,defaultProductStatus:'DRAFT',skuPrefix:'',barcodeStandard:'EAN13'},
      taxInvoicePolicy:{pricesIncludeTax:true,defaultTaxRate:20,shippingTaxable:true,paymentFeeTaxable:true,destinationBased:true,exemptionsEnabled:true,autoCreateInvoice:false},
      customerPrivacyPolicy:{emailVerification:false,phoneVerification:false,allowCorporateAccounts:true,marketingConsentRequired:true,cookieConsentEnabled:true,dataRetentionYears:10},
      b2bPolicy:{enabled:false,registrationEnabled:true,approvalMode:'AUTO',priceVisibility:'EVERYONE',quoteEnabled:false,quoteOnly:false,quoteRequireLogin:true,defaultPaymentTermsDays:0},
    };
  }
  async settingsPolicies(tenantId:string,storeId:string){
    const store:any=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const defaults=this.defaultSettingsPolicies();const out:any={};
    for(const [k,v] of Object.entries(defaults))out[k]={...(v as any),...(settings[k]||{})};
    const checkout:any=await this.prisma.checkoutConfig.findUnique({where:{storeId}});
    out.orderCheckoutPolicy={...out.orderCheckoutPolicy,allowGuestCheckout:checkout?.allowGuestCheckout??true,requirePhone:checkout?.requirePhone??true,requireTerms:checkout?.requireTerms??true,reserveStockMinutes:Math.max(1,Number(checkout?.reservationMinutes??30))};
    out.inventoryPolicy=await this.inventoryPolicy(tenantId,storeId);out.returnPolicy=await this.returnPolicy(tenantId,storeId);return out;
  }
  async updateSettingsPolicies(tenantId:string,storeId:string,body:any){
    const store:any=await this.assertStore(tenantId,storeId);const current:any=store.settings||{};const defaults=this.defaultSettingsPolicies();const next:any={...current};
    for(const key of Object.keys(defaults)){if(body?.[key]!==undefined)next[key]={...(defaults as any)[key],...(current[key]||{}),...(body[key]||{})};}
    if(body?.b2bPolicy){const p:any=next.b2bPolicy||{};const allowedPrice=new Set(['EVERYONE','LOGIN_REQUIRED','HIDDEN']);const allowedApproval=new Set(['AUTO','MANUAL']);p.priceVisibility=allowedPrice.has(String(p.priceVisibility))?String(p.priceVisibility):'EVERYONE';p.approvalMode=allowedApproval.has(String(p.approvalMode))?String(p.approvalMode):'AUTO';p.defaultPaymentTermsDays=Math.max(0,Math.min(365,Number(p.defaultPaymentTermsDays||0)));p.enabled=!!p.enabled;p.registrationEnabled=p.registrationEnabled!==false;p.quoteEnabled=!!p.quoteEnabled;p.quoteOnly=!!p.quoteOnly;p.quoteRequireLogin=p.quoteRequireLogin!==false;next.b2bPolicy=p;}
    if(body?.orderCheckoutPolicy){
      const oc:any=body.orderCheckoutPolicy||{};
      const checkoutData:any={};
      if(oc.allowGuestCheckout!==undefined)checkoutData.allowGuestCheckout=!!oc.allowGuestCheckout;
      if(oc.requirePhone!==undefined)checkoutData.requirePhone=!!oc.requirePhone;
      if(oc.requireTerms!==undefined)checkoutData.requireTerms=!!oc.requireTerms;
      if(oc.reserveStockMinutes!==undefined)checkoutData.reservationMinutes=Math.max(1,Math.min(1440,Number(oc.reserveStockMinutes||30)));
      if(Object.keys(checkoutData).length)await this.prisma.checkoutConfig.upsert({where:{storeId},create:{storeId,...checkoutData},update:checkoutData});
      const persisted:any={...(next.orderCheckoutPolicy||{})};
      delete persisted.allowGuestCheckout;delete persisted.requirePhone;delete persisted.requireTerms;delete persisted.reserveStockMinutes;
      next.orderCheckoutPolicy=persisted;
    }
    for(const dead of ['paymentPolicy','deliveryPolicy','notificationPolicy','securityPolicy'])delete next[dead];
    if(next.customerPrivacyPolicy){delete next.customerPrivacyPolicy.guestCheckout;delete next.customerPrivacyPolicy.requirePhone;}
    if(next.taxInvoicePolicy)delete next.taxInvoicePolicy.corporateReturnInvoiceRequired;
    await this.prisma.tenant.update({where:{id:storeId},data:{settings:next}});
    if(body?.inventoryPolicy)await this.updateInventoryPolicy(tenantId,storeId,{...body.inventoryPolicy,storeId});
    if(body?.returnPolicy)await this.updateReturnPolicy(tenantId,storeId,body.returnPolicy);
    await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return this.settingsPolicies(tenantId,storeId);
  }
  private defaultCommunicationSettings(){return {sender:{name:'',email:'',replyTo:''},emailTemplates:{},smsTemplates:{},whatsappTemplates:{}};}
  async communicationSettings(tenantId:string,storeId:string){
    const store:any=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const current:any=settings.communication||{};const d=this.defaultCommunicationSettings();
    return {...d,...current,sender:{...d.sender,...(current.sender||{})},emailTemplates:current.emailTemplates||{},smsTemplates:current.smsTemplates||{},whatsappTemplates:current.whatsappTemplates||{}};
  }
  async updateCommunicationSettings(tenantId:string,storeId:string,body:any){
    const store:any=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const current:any=await this.communicationSettings(tenantId,storeId);
    const cleanTemplates=(input:any)=>{const out:any={};for(const [event,locales] of Object.entries(input||{})){out[String(event)]={};for(const [locale,tpl] of Object.entries((locales as any)||{})){const x:any=tpl||{};(out[String(event)] as any)[String(locale)]={enabled:x.enabled!==false,subject:String(x.subject||'').slice(0,240),preheader:String(x.preheader||'').slice(0,240),message:String(x.message||'').slice(0,5000),metaTemplateName:String(x.metaTemplateName||'').slice(0,200),blocks:Array.isArray(x.blocks)?x.blocks.slice(0,40).map((b:any)=>({id:String(b.id||''),type:String(b.type||'text'),content:b.content||{},settings:b.settings||{}})):[]};}}return out;};
    const communication={sender:{name:String(body?.sender?.name??current.sender.name).slice(0,160),email:String(body?.sender?.email??current.sender.email).slice(0,240),replyTo:String(body?.sender?.replyTo??current.sender.replyTo).slice(0,240)},emailTemplates:body?.emailTemplates?cleanTemplates(body.emailTemplates):current.emailTemplates,smsTemplates:body?.smsTemplates?cleanTemplates(body.smsTemplates):current.smsTemplates,whatsappTemplates:body?.whatsappTemplates?cleanTemplates(body.whatsappTemplates):current.whatsappTemplates};
    await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,communication}}});await this.cache.purgeTenant(tenantId);return communication;
  }
  async contractSettings(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const pages=await this.prisma.page.findMany({where:{storeId},select:{id:true,title:true,slug:true,status:true,updatedAt:true},orderBy:[{status:'asc'},{title:'asc'}],take:500});return{mappings:settings.contractPages||{},pages};
  }
  async updateContractSettings(tenantId:string,storeId:string,body:any){
    const store=await this.assertStore(tenantId,storeId);const requested:any=body?.mappings||{};const values:string[]=Object.values(requested).filter(Boolean).map((value:any)=>String(value));
    if(values.length){const count=await this.prisma.page.count({where:{storeId,id:{in:Array.from(new Set(values))}}});if(count!==new Set(values).size)throw new BadRequestException('One or more contract pages do not belong to store');}
    const settings:any=store.settings||{};const clean:any={};for(const [k,v] of Object.entries(requested)){if(v)clean[String(k)]=String(v);}
    const updated=await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,contractPages:clean}}});await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return{mappings:(updated.settings as any)?.contractPages||{}};
  }

  async updateCommentSettings(tenantId: string, storeId: string, body: any) {
    const store=await this.assertStore(tenantId, storeId);
    const current:any=store.settings || {};
    const normalize=(value:any,defaults:any)=>({enabled:value?.enabled ?? defaults.enabled,autoApprove:value?.autoApprove ?? defaults.autoApprove,allowGuest:value?.allowGuest ?? defaults.allowGuest});
    const commentSettings={
      productReviews:normalize(body.productReviews,{enabled:true,autoApprove:false,allowGuest:true}),
      blogComments:normalize(body.blogComments,{enabled:true,autoApprove:false,allowGuest:true}),
    };
    const updated=await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...current,commentSettings}}});
    await this.cache.delPattern('public:site:*'); await this.cache.purgeTenant(tenantId);
    return {commentSettings:(updated.settings as any)?.commentSettings};
  }

  async upsertStoreAddress(tenantId: string, storeId: string, body: any) {
    await this.assertStore(tenantId, storeId);
    const key = String(body.key || 'registered').toLowerCase().replace(/[^a-z0-9_-]/g,'');
    if (!key) throw new BadRequestException('Address key required');
    if (body.isDefault) await this.prisma.storeAddress.updateMany({ where: { storeId }, data: { isDefault: false } });
    return this.prisma.storeAddress.upsert({ where: { storeId_key: { storeId, key } }, create: { storeId, key, label: body.label || key, firstName: body.firstName, lastName: body.lastName, company: body.company, phone: body.phone, address1: body.address1, address2: body.address2, district: body.district, city: body.city, state: body.state, postalCode: body.postalCode, country: body.country || 'TR', admin1Id:body.admin1Id||null, admin2Id:body.admin2Id||null, localityId:body.localityId||null, neighborhoodId:body.neighborhoodId||null, isDefault: !!body.isDefault }, update: { label: body.label || key, firstName: body.firstName, lastName: body.lastName, company: body.company, phone: body.phone, address1: body.address1, address2: body.address2, district: body.district, city: body.city, state: body.state, postalCode: body.postalCode, country: body.country || 'TR', admin1Id:body.admin1Id||null, admin2Id:body.admin2Id||null, localityId:body.localityId||null, neighborhoodId:body.neighborhoodId||null, isDefault: !!body.isDefault } });
  }
  async currencies(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.storeCurrency.findMany({ where: { storeId }, orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] }); }
  async upsertCurrency(tenantId: string, storeId: string, body: any) {
    const store = await this.assertStore(tenantId, storeId);
    await this.requireFeature(tenantId, 'multiCurrency');
    const code=String(body.code||'').toUpperCase();
    if(!/^[A-Z]{3}$/.test(code)||!Intl.supportedValuesOf('currency').includes(code))throw new BadRequestException('Unsupported currency');
    const originalBase=String(store.currency||'TRY').toUpperCase();
    const enable=body.isEnabled!==false;
    if(!enable){
      const sourceUsed=await this.prisma.variant.count({where:{priceCurrency:code,product:{storeId,status:'ACTIVE'}}});
      if(sourceUsed>0)throw new BadRequestException('Cannot disable a currency used by active product prices');
    }
    if(body.isDefault&&!enable)throw new BadRequestException('Default currency must be enabled');
    return this.prisma.$transaction(async tx=>{
      const existing=await tx.storeCurrency.findMany({where:{storeId}});
      const current=existing.find(x=>x.code===code);
      const isSwitch=!!body.isDefault&&code!==originalBase;
      // Current StoreCurrency rates are denominated in the tenant's current base unit.
      // Rebase all rows atomically when that base changes; NEVER modify saved product prices or orders.
      const requested=body.exchangeRate===undefined||body.exchangeRate===null?null:Number(body.exchangeRate);
      const stored=Number(current?.exchangeRate||0);
      const newBaseRate=isSwitch?(stored>0?stored:requested):1;
      if(isSwitch&&!(Number(newBaseRate)>0))throw new BadRequestException('New base currency rate is missing');
      const rate=body.isDefault?1:(requested??stored);
      if(!(rate>0)||!Number.isFinite(rate))throw new BadRequestException('Exchange rate must be greater than 0');
      if(isSwitch){
        for(const row of existing){
          const oldRate=row.code===originalBase?1:Number(row.exchangeRate);
          if(!(oldRate>0))throw new BadRequestException(`Invalid stored FX rate: ${row.code}`);
          await tx.storeCurrency.update({where:{id:row.id},data:{exchangeRate:row.code===code?1:oldRate/Number(newBaseRate),isDefault:row.code===code}});
        }
        if(!existing.some(x=>x.code===originalBase))await tx.storeCurrency.create({data:{storeId,code:originalBase,isDefault:false,isEnabled:true,exchangeRate:1/Number(newBaseRate)}});
        await tx.tenant.update({where:{id:storeId},data:{currency:code}});
      }else if(body.isDefault){
        await tx.storeCurrency.updateMany({where:{storeId},data:{isDefault:false}});
      }
      return tx.storeCurrency.upsert({where:{storeId_code:{storeId,code}},
        create:{storeId,code,isEnabled:enable,isDefault:!!body.isDefault,exchangeRate:isSwitch?1:rate,rounding:Number(body.rounding??2)},
        update:{isEnabled:enable,...(body.isDefault?{isDefault:true}:{}),exchangeRate:isSwitch?1:rate,rounding:Number(body.rounding??current?.rounding??2)}});
    });
  }


  async upsertLocale(tenantId: string, storeId: string, body: any) {
    await this.assertStore(tenantId, storeId);
    const locale = String(body.locale || '').trim();
    if (!locale) throw new BadRequestException('Locale required');
    if (body.isDefault) {
      await this.prisma.storeLocale.updateMany({ where: { storeId }, data: { isDefault: false } });
      await this.prisma.tenant.update({ where: { id: storeId }, data: { locale } });
    }
    return this.prisma.storeLocale.upsert({ where: { storeId_locale: { storeId, locale } }, create: { storeId, locale, label: body.label || locale, isEnabled: body.isEnabled ?? true, isDefault: !!body.isDefault, sortOrder: Number(body.sortOrder || 0) }, update: { label: body.label || locale, isEnabled: body.isEnabled ?? true, isDefault: !!body.isDefault, sortOrder: Number(body.sortOrder || 0) } });
  }
  async updateCheckoutConfig(tenantId: string, storeId: string, body: any) {
    await this.assertStore(tenantId, storeId);
    const data = { singlePage: true, allowGuestCheckout: body.allowGuestCheckout ?? true, requirePhone: body.requirePhone ?? true, requireBillingAddress: !!body.requireBillingAddress, showCouponField: body.showCouponField ?? true, stickyOrderSummary: body.stickyOrderSummary ?? true, requireTerms: body.requireTerms ?? true, requirePrivacyNotice: body.requirePrivacyNotice ?? true, requireKvkkNotice: body.requireKvkkNotice ?? false, reservationMinutes: Math.max(1,Math.min(1440,Number(body.reservationMinutes??30))), settings: body.settings };
    return this.prisma.checkoutConfig.upsert({ where: { storeId }, create: { storeId, ...data }, update: data });
  }

  roles(tenantId:string){return this.prisma.customRole.findMany({where:{tenantId},include:{_count:{select:{memberships:true}}},orderBy:[{isSystem:'desc'},{name:'asc'}]});}
  permissionCatalog(){const labels:Record<string,string>={analytics:'Raporlar & Analitik',products:'Ürünler',orders:'Siparişler',customers:'Müşteriler',promotions:'Promosyonlar',marketing:'Pazarlama',content:'İçerik',reviews:'Yorumlar',returns:'İadeler',settings:'Ayarlar',team:'Ekip & Yetkiler',support:'Destek',privacy:'Gizlilik',media:'Medya'};return{permissions:PERMISSIONS,groups:Object.entries(PERMISSIONS.reduce((acc:any,p:string)=>{const key=p.split('.')[0];(acc[key] ||= []).push(p);return acc;},{})).map(([key,permissions])=>({key,label:labels[key]||key,permissions}))};}
  async createRole(tenantId: string, body: any) {
    const permissions: string[] = Array.isArray(body.permissions) ? Array.from(new Set<string>(body.permissions.map((value: unknown) => String(value)))) : [];
    if (permissions.some(x => !PERMISSIONS.includes(x as any))) throw new BadRequestException('Unknown permission');
    return this.prisma.customRole.create({ data: { tenantId, name: body.name, description: body.description, permissions } });
  }
  async updateRole(tenantId: string, id: string, body: any) {
    const role = await this.prisma.customRole.findFirst({ where: { id, tenantId } }); if (!role) throw new NotFoundException();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.permissions !== undefined) { const permissions: string[] = Array.isArray(body.permissions) ? Array.from(new Set<string>(body.permissions.map((value: unknown) => String(value)))) : []; if (permissions.some(x => !PERMISSIONS.includes(x as any))) throw new BadRequestException('Unknown permission'); data.permissions = permissions; }
    return this.prisma.customRole.update({ where: { id }, data });
  }
  async cloneRole(tenantId:string,id:string,body:any){const role=await this.prisma.customRole.findFirst({where:{id,tenantId}});if(!role)throw new NotFoundException();const base=String(body?.name||`${role.name} Kopya`).trim();let name=base;let n=2;while(await this.prisma.customRole.findFirst({where:{tenantId,name}})){name=`${base} ${n++}`;}return this.prisma.customRole.create({data:{tenantId,name,description:role.description,permissions:role.permissions}});}
  async deleteRole(tenantId:string,id:string){const role=await this.prisma.customRole.findFirst({where:{id,tenantId},include:{_count:{select:{memberships:true}}}});if(!role)throw new NotFoundException();if(role.isSystem)throw new BadRequestException('Sistem rolü silinemez');if(role._count.memberships)throw new BadRequestException('Rol kullanımda. Önce ekip üyelerini başka role taşıyın.');await this.prisma.customRole.delete({where:{id}});return{deleted:true};}

  async promotions(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'promotions'); return this.prisma.promotion.findMany({ where: { storeId }, include: { codes: true }, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }] }); }
  async createPromotion(tenantId: string, storeId: string, body: any) {
    await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'promotions');
    const codes: string[] = Array.isArray(body.codes) ? Array.from(new Set<string>(body.codes.map((value: unknown) => String(value).trim().toUpperCase()).filter((value: string) => Boolean(value)))) : [];
    return this.prisma.$transaction(async (tx) => {
      const promotion = await tx.promotion.create({ data: { storeId, name: body.name, description: body.description, status: body.status || 'DRAFT', activation: body.activation || (codes.length ? 'COUPON' : 'AUTOMATIC'), priority: Number(body.priority ?? 100), stackable: body.stackable ?? true, stopProcessing: body.stopProcessing ?? false, exclusiveGroup: body.exclusiveGroup || null, startsAt: body.startsAt ? new Date(body.startsAt) : null, endsAt: body.endsAt ? new Date(body.endsAt) : null, daysOfWeek: Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map(Number) : [], usageLimit: body.usageLimit ? Number(body.usageLimit) : null, perCustomerLimit: body.perCustomerLimit ? Number(body.perCustomerLimit) : null, conditions: body.conditions || [], actions: body.actions || [], customerEligibility: body.customerEligibility || null } });
      if (codes.length) await tx.promotionCode.createMany({ data: codes.map((code) => ({ storeId, promotionId: promotion.id, code })) });
      return tx.promotion.findUniqueOrThrow({ where: { id: promotion.id }, include: { codes: true } });
    });
  }
  async updatePromotion(tenantId: string, storeId: string, id: string, body: any) {
    await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'promotions'); const promo = await this.prisma.promotion.findFirst({ where: { id, storeId } }); if (!promo) throw new NotFoundException();
    const allowed = ['name','description','status','activation','priority','stackable','stopProcessing','exclusiveGroup','usageLimit','perCustomerLimit','conditions','actions','customerEligibility'];
    const data:any = Object.fromEntries(Object.entries(body).filter(([k])=>allowed.includes(k)));
    if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.daysOfWeek !== undefined) data.daysOfWeek = (body.daysOfWeek || []).map(Number);
    if (body.codes !== undefined) {
      const codes: string[] = Array.isArray(body.codes) ? Array.from(new Set<string>(body.codes.map((value: unknown) => String(value).trim().toUpperCase()).filter((value: string) => Boolean(value)))) : [];
      return this.prisma.$transaction(async (tx) => {
        await tx.promotionCode.deleteMany({ where: { promotionId: id } });
        await tx.promotion.update({ where: { id }, data });
        if (codes.length) await tx.promotionCode.createMany({ data: codes.map((code) => ({ storeId, promotionId: id, code })) });
        return tx.promotion.findUniqueOrThrow({ where: { id }, include: { codes: true } });
      });
    }
    return this.prisma.promotion.update({ where: { id }, data, include: { codes: true } });
  }

  async loyalty(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'loyalty'); return this.prisma.loyaltyProgram.findUnique({ where: { storeId } }); }
  async updateLoyalty(tenantId: string, storeId: string, body: any) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'loyalty'); return this.prisma.loyaltyProgram.upsert({ where: { storeId }, create: { storeId, enabled: !!body.enabled, programName: body.programName || 'Rewards', pointsPerCurrencyUnit: Number(body.pointsPerCurrencyUnit ?? 1), redemptionRate: Number(body.redemptionRate ?? 0.01), minimumRedeemPoints: Number(body.minimumRedeemPoints ?? 0), pointsExpireDays: body.pointsExpireDays ? Number(body.pointsExpireDays) : null, settings: body.settings || {} }, update: { enabled: !!body.enabled, programName: body.programName || 'Rewards', pointsPerCurrencyUnit: Number(body.pointsPerCurrencyUnit ?? 1), redemptionRate: Number(body.redemptionRate ?? 0.01), minimumRedeemPoints: Number(body.minimumRedeemPoints ?? 0), pointsExpireDays: body.pointsExpireDays ? Number(body.pointsExpireDays) : null, settings: body.settings || {} } }); }

  async marketingCampaigns(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'marketing'); return this.prisma.marketingCampaign.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }); }
  async createMarketingCampaign(tenantId: string, storeId: string, b: any) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'marketing'); return this.prisma.marketingCampaign.create({ data: { storeId, name: b.name, channel: b.channel, status: b.status || 'DRAFT', subject: b.subject, content: b.content || {}, audience: b.audience || {}, scheduleAt: b.scheduleAt ? new Date(b.scheduleAt) : null, settings: b.settings || {} } }); }
  async marketingAutomations(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'marketing'); return this.prisma.marketingAutomation.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }); }
  async createMarketingAutomation(tenantId: string, storeId: string, b: any) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'marketing'); return this.prisma.marketingAutomation.create({ data: { storeId, name: b.name, trigger: b.trigger, enabled: !!b.enabled, delayMinutes: Number(b.delayMinutes || 0), conditions: b.conditions || {}, steps: b.steps || [] } }); }

  async legalDocuments(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'privacy'); return this.prisma.legalDocument.findMany({ where: { storeId }, orderBy: [{ type:'asc' }, { updatedAt:'desc' }] }); }
  async upsertLegalDocument(tenantId: string, storeId: string, b: any) {
    await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'privacy');
    if (b.isActive) await this.prisma.legalDocument.updateMany({ where: { storeId, type: b.type, locale: b.locale || 'tr-TR' }, data: { isActive: false } });
    return this.prisma.legalDocument.upsert({ where: { storeId_type_locale_version: { storeId, type: b.type, locale: b.locale || 'tr-TR', version: String(b.version || '1.0') } }, create: { storeId, type: b.type, locale: b.locale || 'tr-TR', version: String(b.version || '1.0'), title: b.title, body: b.body, isActive: !!b.isActive, publishedAt: b.isActive ? new Date() : null }, update: { title: b.title, body: b.body, isActive: !!b.isActive, publishedAt: b.isActive ? new Date() : null } });
  }
  async privacyRequests(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'privacy'); return this.prisma.privacyRequest.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }); }
  async updatePrivacyRequest(tenantId: string, storeId: string, id: string, b: any) { await this.assertStore(tenantId, storeId); const row = await this.prisma.privacyRequest.findFirst({ where: { id, storeId } }); if (!row) throw new NotFoundException(); return this.prisma.privacyRequest.update({ where: { id }, data: { status: b.status, responseNote: b.responseNote, completedAt: b.status === 'COMPLETED' ? new Date() : row.completedAt } }); }
  async consentRecords(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'privacy'); return this.prisma.consentRecord.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' }, take: 500 }); }

  async auditLogs(tenantId:string,storeId?:string,q:any={}){if(storeId)await this.assertStore(tenantId,storeId);const page=Math.max(1,Number(q?.page||1)),limit=Math.min(100,Math.max(10,Number(q?.limit||50)));const where:any={tenantId};if(q?.resource)where.resource={contains:String(q.resource),mode:'insensitive'};if(q?.action)where.action={contains:String(q.action),mode:'insensitive'};if(q?.userId)where.userId=String(q.userId);if(q?.status==='success')where.statusCode={lt:400};if(q?.status==='error')where.statusCode={gte:400};if(q?.from||q?.to)where.createdAt={...(q.from?{gte:new Date(`${q.from}T00:00:00.000Z`)}:{}),...(q.to?{lte:new Date(`${q.to}T23:59:59.999Z`)}:{})};if(q?.q){const text=String(q.q);where.OR=[{action:{contains:text,mode:'insensitive'}},{resource:{contains:text,mode:'insensitive'}},{path:{contains:text,mode:'insensitive'}},{user:{email:{contains:text,mode:'insensitive'}}},{user:{name:{contains:text,mode:'insensitive'}}}];}const [items,total,today,errors,users]=await Promise.all([this.prisma.auditLog.findMany({where,include:{user:{select:{id:true,email:true,name:true}}},orderBy:{createdAt:'desc'},skip:(page-1)*limit,take:limit}),this.prisma.auditLog.count({where}),this.prisma.auditLog.count({where:{tenantId,createdAt:{gte:new Date(new Date().setHours(0,0,0,0))}}}),this.prisma.auditLog.count({where:{tenantId,statusCode:{gte:400},createdAt:{gte:new Date(new Date().setHours(0,0,0,0))}}}),this.prisma.auditLog.groupBy({by:['userId'],where:{tenantId,userId:{not:null},createdAt:{gte:new Date(Date.now()-24*3600*1000)}},_count:{_all:true}})]);return{items,total,page,limit,pages:Math.max(1,Math.ceil(total/limit)),summary:{today,errors,activeUsers:users.length}};}
  async auditLogsExport(tenantId:string,storeId?:string,q:any={}){const data:any=await this.auditLogs(tenantId,storeId,{...q,page:1,limit:100});const all=[...data.items];let page=2;while(page<=Math.min(data.pages,100)){const next:any=await this.auditLogs(tenantId,storeId,{...q,page,limit:100});all.push(...next.items);page++;}const headers=['Tarih','Kullanıcı','E-posta','İşlem','Kaynak','Kaynak ID','Metod','Yol','Durum'];const esc=(v:any)=>`"${String(v??'').replace(/"/g,'""')}"`;const rows=all.map((x:any)=>[x.createdAt,x.user?.name||'',x.user?.email||'',x.action,x.resource,x.resourceId||'',x.method,x.path,x.statusCode]);return{filename:`ticarti-audit-${new Date().toISOString().slice(0,10)}.csv`,contentType:'text/csv;charset=utf-8',csv:[headers.map(esc).join(','),...rows.map((r:any[])=>r.map(esc).join(','))].join('\n')};}


  async questions(tenantId:string, storeId:string, query:any={}) {
    await this.assertStore(tenantId, storeId);
    return this.prisma.question.findMany({
      where:{ storeId, ...(query.type?{type:query.type}:{}), ...(query.status?{status:query.status}:{}) },
      orderBy:{createdAt:'desc'}, take:500,
    });
  }
  async updateQuestion(tenantId:string, storeId:string, id:string, body:any) {
    await this.assertStore(tenantId, storeId);
    const row=await this.prisma.question.findFirst({where:{id,storeId}}); if(!row) throw new NotFoundException();
    return this.prisma.question.update({where:{id},data:{status:body.status,answer:body.answer,internalNote:body.internalNote,assignedUserId:body.assignedUserId,priority:body.priority,publishOnProduct:body.publishOnProduct,answeredAt:body.answer?new Date():row.answeredAt,closedAt:body.status==='CLOSED'?new Date():row.closedAt}});
  }

  async geoChildren(tenantId:string, parentId?:string, countryCode?:string, level?:any) {
    const where:any={ isActive:true, ...(parentId?{parentId}:{parentId:null}), ...(countryCode?{countryCode}:{}) , ...(level?{level}:{}) };
    const [base, overrides, custom]=await Promise.all([
      this.prisma.geoNode.findMany({where,orderBy:[{sortOrder:'asc'},{name:'asc'}]}),
      this.prisma.geoOverride.findMany({where:{tenantId}}),
      this.prisma.geoCustomNode.findMany({where:{tenantId,isActive:true,...(parentId?{parentId}:{parentId:null}),...(countryCode?{countryCode}:{}),...(level?{level}:{})},orderBy:[{sortOrder:'asc'},{name:'asc'}]})
    ]);
    const om=new Map(overrides.map(x=>[x.geoNodeId,x]));
    return [...base.filter(x=>om.get(x.id)?.isEnabled!==false).map(x=>({...x,name:om.get(x.id)?.customName||x.name,source:'SYSTEM'})),...custom.map(x=>({...x,source:'CUSTOM'}))];
  }
  async geoOverrideSave(tenantId:string, geoNodeId:string, body:any){
    const node=await this.prisma.geoNode.findUnique({where:{id:geoNodeId}}); if(!node) throw new NotFoundException();
    return this.prisma.geoOverride.upsert({where:{tenantId_geoNodeId:{tenantId,geoNodeId}},create:{tenantId,geoNodeId,customName:body.customName||null,isEnabled:body.isEnabled!==false},update:{customName:body.customName||null,isEnabled:body.isEnabled!==false}});
  }
  async geoCustomCreate(tenantId:string, body:any){
    return this.prisma.geoCustomNode.create({data:{tenantId,parentId:body.parentId||null,level:body.level,countryCode:String(body.countryCode||'TR').toUpperCase(),code:body.code||null,name:String(body.name||'').trim(),slug:String(body.slug||body.name||'').trim().toLowerCase().replace(/[^a-z0-9çğıöşü]+/gi,'-').replace(/^-|-$/g,''),sortOrder:Number(body.sortOrder||0),isActive:body.isActive!==false}});
  }
  async geoCustomUpdate(tenantId:string,id:string,body:any){
    const row=await this.prisma.geoCustomNode.findFirst({where:{id,tenantId}}); if(!row) throw new NotFoundException();
    const data:any={}; for(const k of ['name','code','sortOrder','isActive']) if(body[k]!==undefined)data[k]=body[k];
    if(body.name!==undefined)data.slug=String(body.slug||body.name).trim().toLowerCase().replace(/[^a-z0-9çğıöşü]+/gi,'-').replace(/^-|-$/g,'');
    return this.prisma.geoCustomNode.update({where:{id},data});
  }

  async seoOverview(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);
    const [products,categories,pages,blogPosts,blogCategories,rules,redirects]=await Promise.all([
      this.prisma.product.count({where:{storeId}}),this.prisma.category.count({where:{storeId}}),this.prisma.page.count({where:{storeId}}),this.prisma.blogPost.count({where:{storeId}}),this.prisma.blogCategory.count({where:{storeId}}),this.prisma.seoRule.findMany({where:{storeId},orderBy:{priority:'asc'}}),this.prisma.seoRedirect.findMany({where:{storeId},orderBy:{createdAt:'desc'}})
    ]);
    const raw:any=store.settings||{};const seo:any=raw.seoAdvanced||{};
    const settings={defaultTitle:seo.defaultTitle||store.seoTitle||store.name,defaultDescription:seo.defaultDescription||store.seoDescription||'',titleTemplate:seo.titleTemplate||'{{page}} | {{store}}',technical:{robots:'index,follow',sitemap:true,productSchema:true,breadcrumbSchema:true,...(seo.technical||{})},social:{twitterCard:'summary_large_image',...(seo.social||{})},schema:{organizationName:store.companyName||store.name,logoUrl:store.logoUrl||'',phone:store.phone||'',email:store.email||'',...(seo.schema||{})},tracking:{gtmId:'',ga4Id:'',metaPixelId:'',googleAdsId:'',...(seo.tracking||{})},customHeadHtml:seo.customHeadHtml||''};
    return {products,categories,pages,blogPosts,blogCategories,rules,redirects,settings};
  }
  async updateSeoSettings(tenantId:string,storeId:string,body:any){
    const store=await this.assertStore(tenantId,storeId);const root:any=store.settings||{};const incoming:any=body?.settings||body||{};
    const next={...root,seoAdvanced:{...(root.seoAdvanced||{}),...incoming,technical:{...((root.seoAdvanced||{}).technical||{}),...(incoming.technical||{})},social:{...((root.seoAdvanced||{}).social||{}),...(incoming.social||{})},schema:{...((root.seoAdvanced||{}).schema||{}),...(incoming.schema||{})},tracking:{...((root.seoAdvanced||{}).tracking||{}),...(incoming.tracking||{})}}};
    await this.prisma.tenant.update({where:{id:storeId},data:{settings:next,seoTitle:incoming.defaultTitle===undefined?store.seoTitle:(incoming.defaultTitle||null),seoDescription:incoming.defaultDescription===undefined?store.seoDescription:(incoming.defaultDescription||null)}});
    await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return this.seoOverview(tenantId,storeId);
  }
  async saveSeoRule(tenantId:string,storeId:string,body:any){ await this.assertStore(tenantId,storeId); return this.prisma.seoRule.create({data:{storeId,targetType:body.targetType,locale:body.locale||null,titleTemplate:body.titleTemplate||null,descriptionTemplate:body.descriptionTemplate||null,slugTemplate:body.slugTemplate||null,canonicalTemplate:body.canonicalTemplate||null,conditions:body.conditions||{},priority:Number(body.priority||100),enabled:body.enabled!==false}}); }
  async saveRedirect(tenantId:string,storeId:string,body:any){ await this.assertStore(tenantId,storeId); return this.prisma.seoRedirect.upsert({where:{storeId_fromPath:{storeId,fromPath:body.fromPath}},create:{storeId,fromPath:body.fromPath,toPath:body.toPath,statusCode:Number(body.statusCode||301),enabled:body.enabled!==false},update:{toPath:body.toPath,statusCode:Number(body.statusCode||301),enabled:body.enabled!==false}}); }

  private defaultDesignSettings(){
    return {
      general:{bodyFont:'Inter, ui-sans-serif, system-ui, sans-serif',headingFont:'Inter, ui-sans-serif, system-ui, sans-serif',baseFontSize:16,h1Size:52,h2Size:34,h3Size:24,primaryColor:'#15171a',secondaryColor:'#727b85',textColor:'#15171a',backgroundColor:'#ffffff',surfaceColor:'#ffffff',borderColor:'#e6e9ec',containerWidth:1180,sectionSpacing:64,borderRadius:8,buttonRadius:6,customCss:''},
      header:{template:1,sticky:true,topbarEnabled:false,topbarText:'',topbarLink:'',showSearch:false},
      footer:{template:1,copyright:'© {{year}} {{store_name}}. Tüm hakları saklıdır.',upperHtml:''},
      products:{categoryTemplate:1,productPageTemplate:1,productCardTemplate:1,columnsDesktop:4,columnsTablet:2,columnsMobile:2}
    };
  }
  private themeStateOf(store:any){
    const root:any=store?.settings&&typeof store.settings==='object'?store.settings:{};
    const state:any=root.themeState&&typeof root.themeState==='object'&&!Array.isArray(root.themeState)?root.themeState:null;
    return state;
  }
  private themePackageRuntime(cfg:any){
    const design:any=cfg?.design&&typeof cfg.design==='object'&&!Array.isArray(cfg.design)?cfg.design:{};
    const current:any=cfg?.settingsData?.current&&typeof cfg.settingsData.current==='object'&&!Array.isArray(cfg.settingsData.current)
      ? cfg.settingsData.current
      : (design?.themeSettings?.general&&typeof design.themeSettings.general==='object'?design.themeSettings.general:{});
    const pages:any=cfg?.pages&&typeof cfg.pages==='object'&&!Array.isArray(cfg.pages)?cfg.pages:{};
    const groups:any=cfg?.groups&&typeof cfg.groups==='object'&&!Array.isArray(cfg.groups)?cfg.groups:{};
    return {
      settingsCurrent:{...current},
      templates:{...pages},
      groups:{header:groups.header||null,footer:groups.footer||null,popups:groups.popups||null},
      modules:Array.isArray(cfg?.modules)?cfg.modules:[],
      blockSchemas:Array.isArray(cfg?.blockSchemas)?cfg.blockSchemas:[],
    };
  }
  private themeRuntimeOf(store:any,themeId:string,themeSlug:string,cfg:any){
    const base:any=this.themePackageRuntime(cfg);
    const state:any=this.themeStateOf(store);
    const matches=!!state&&String(state.themeId||'')===String(themeId||'')&&String(state.themeSlug||'')===String(themeSlug||'');
    const saved:any=matches&&state?.runtime&&typeof state.runtime==='object'&&!Array.isArray(state.runtime)?state.runtime:{};
    return {
      settingsCurrent:{...base.settingsCurrent,...(saved?.settingsCurrent||{})},
      templates:{...base.templates,...(saved?.templates||{})},
      groups:{...base.groups,...(saved?.groups||{})},
      modules:base.modules,
      blockSchemas:base.blockSchemas,
    };
  }
  async designSettings(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const state:any=this.themeStateOf(store);const saved:any=state?.design||{};const defaults=this.defaultDesignSettings();
    return {...saved,general:{...defaults.general,...(saved.general||{})},header:{...defaults.header,...(saved.header||{})},footer:{...defaults.footer,...(saved.footer||{})},products:{...defaults.products,...(saved.products||{})},themeSettings:{...(saved.themeSettings||{}),general:{...(saved.themeSettings?.general||{})},header:{...(saved.themeSettings?.header||{})},footer:{...(saved.themeSettings?.footer||{})},products:{...(saved.themeSettings?.products||{})}}};
  }

  async saveThemeState(tenantId:string,storeId:string,body:any){
    const store=await this.assertStore(tenantId,storeId);
    const themeId=String(body?.themeId||'').trim();
    if(!themeId)throw new BadRequestException(apiError('merchant.theme.idRequired'));
    const theme:any=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});
    if(!theme||!theme.isActive)throw new NotFoundException(apiError('merchant.theme.notFoundOrInactive'));
    const sourceCfg:any=theme.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};
    if(String(sourceCfg.engine||sourceCfg.manifest?.engine||'')==='ticarti-liquid-source'){
      const root:any=store.settings&&typeof store.settings==='object'&&!Array.isArray(store.settings)?store.settings:{};
      const currentState:any=this.themeStateOf(store)||{};
      const nextVersion=Math.max(1,Number(currentState?.version||0)+1);
      const packageSettings:any=sourceCfg.settingsData&&typeof sourceCfg.settingsData==='object'&&!Array.isArray(sourceCfg.settingsData)?sourceCfg.settingsData:{current:{}};
      const settingsCurrent=body?.settingsCurrent&&typeof body.settingsCurrent==='object'&&!Array.isArray(body.settingsCurrent)?body.settingsCurrent:(currentState?.settingsCurrent||packageSettings.current||{});
      const templates=body?.templates&&typeof body.templates==='object'&&!Array.isArray(body.templates)?body.templates:(currentState?.templates||sourceCfg.pages||{});
      const groups=body?.groups&&typeof body.groups==='object'&&!Array.isArray(body.groups)?body.groups:(currentState?.groups||sourceCfg.groups||{});
      const design=body?.design&&typeof body.design==='object'&&!Array.isArray(body.design)?body.design:(currentState?.design||sourceCfg.design||{});
      const themeState:any={schema:'TICARTI_LIQUID_THEME_STATE_V1',version:nextVersion,themeId:theme.id,themeSlug:theme.slug,design,settingsCurrent,templates,groups,menus:Array.isArray(currentState?.menus)?currentState.menus:[],savedAt:new Date().toISOString()};
      await this.prisma.tenant.update({where:{id:store.id},data:{activeTheme:theme.slug,settings:{...root,themeState}}});
      await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);
      return themeState;
    }
    const cfg:any=theme.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};
    const baseRuntime:any=this.themePackageRuntime(cfg);
    const previous:any=this.themeStateOf(store)||{};
    const incomingDesign:any=body?.design&&typeof body.design==='object'&&!Array.isArray(body.design)?body.design:(cfg.design||{});
    const incomingCurrent:any=body?.settingsCurrent&&typeof body.settingsCurrent==='object'&&!Array.isArray(body.settingsCurrent)
      ? body.settingsCurrent
      : (incomingDesign?.themeSettings?.general&&typeof incomingDesign.themeSettings.general==='object'?incomingDesign.themeSettings.general:baseRuntime.settingsCurrent);
    const runtime:any={
      settingsCurrent:{...baseRuntime.settingsCurrent,...incomingCurrent},
      templates:body?.templates&&typeof body.templates==='object'&&!Array.isArray(body.templates)?body.templates:(previous?.runtime?.templates||baseRuntime.templates),
      groups:body?.groups&&typeof body.groups==='object'&&!Array.isArray(body.groups)?body.groups:(previous?.runtime?.groups||baseRuntime.groups),
    };
    const general:any={...(incomingDesign.general||{}),themeId,packageSlug:theme.slug};
    const design:any={
      ...incomingDesign,
      general,
      themeSettings:{...(incomingDesign.themeSettings||{}),general:{...runtime.settingsCurrent}},
      themeSettingsSchema:cfg.settingsSchema||incomingDesign.themeSettingsSchema||[],
    };
    const rawSections:any[]=Array.isArray(body?.sections)?body.sections:(Array.isArray(previous?.sections)?previous.sections:(Array.isArray(cfg.sections)?cfg.sections:[]));
    const sections=rawSections.map((raw:any,index:number)=>{const settings=raw?.settings&&typeof raw.settings==='object'&&!Array.isArray(raw.settings)?{...raw.settings}:{};const sourceId=String(raw?.sourceId||settings.__sourceId||raw?.id||`section-${index}`).trim()||`section-${index}`;return {id:String(raw?.id||sourceId),sourceId,pageKey:String(raw?.pageKey||'home'),sectionType:String(raw?.sectionType||raw?.type||'rich_text'),sortOrder:index,enabled:raw?.enabled!==false,settings:{...settings,__sourceId:sourceId}}});
    const menuInput=Array.isArray(body?.menus)?body.menus:(Array.isArray(previous?.menus)?previous.menus:[]);
    const menus=menuInput.map((raw:any)=>({name:String(raw?.name||raw?.handle||'Menü'),handle:String(raw?.handle||'').trim(),items:Array.isArray(raw?.items)?raw.items:[]})).filter((x:any)=>x.handle);
    const themeState:any={schema:'TICARTI_NATIVE_THEME_STATE_V2',version:2,themeId,themeSlug:theme.slug,design,sections,menus,runtime,savedAt:new Date().toISOString()};
    const root:any=store.settings&&typeof store.settings==='object'&&!Array.isArray(store.settings)?store.settings:{};
    await this.prisma.tenant.update({where:{id:store.id},data:{activeTheme:theme.slug,settings:{...root,themeState}}});
    await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);
    return {ok:true,schema:'TICARTI_NATIVE_THEME_STATE_V2',themeState};
  }



  async updateDesignSettings(tenantId:string,storeId:string,body:any){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const current:any=await this.designSettings(tenantId,storeId);const incoming:any=body?.design||body||{};
    const clamp=(v:any,min:number,max:number,fallback:number)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback};
    const next:any={
      ...current,...incoming,
      general:{...current.general,...(incoming.general||{})},
      header:{...current.header,...(incoming.header||{})},
      footer:{...current.footer,...(incoming.footer||{})},
      products:{...current.products,...(incoming.products||{})},
      themeSettings:{...(current.themeSettings||{}),...(incoming.themeSettings||{}),general:{...(current.themeSettings?.general||{}),...(incoming.themeSettings?.general||{})},header:{...(current.themeSettings?.header||{}),...(incoming.themeSettings?.header||{})},footer:{...(current.themeSettings?.footer||{}),...(incoming.themeSettings?.footer||{})},products:{...(current.themeSettings?.products||{}),...(incoming.themeSettings?.products||{})}}
    };
    next.general.baseFontSize=clamp(next.general.baseFontSize,12,24,16);next.general.h1Size=clamp(next.general.h1Size,24,96,52);next.general.h2Size=clamp(next.general.h2Size,20,72,34);next.general.h3Size=clamp(next.general.h3Size,16,56,24);next.general.containerWidth=clamp(next.general.containerWidth,760,1800,1180);next.general.sectionSpacing=clamp(next.general.sectionSpacing,16,160,64);next.general.borderRadius=clamp(next.general.borderRadius,0,40,8);next.general.buttonRadius=clamp(next.general.buttonRadius,0,40,6);
    next.header.template=clamp(next.header.template,1,8,1);next.footer.template=clamp(next.footer.template,1,5,1);next.products.categoryTemplate=clamp(next.products.categoryTemplate,1,8,1);next.products.productPageTemplate=clamp(next.products.productPageTemplate,1,8,1);next.products.productCardTemplate=clamp(next.products.productCardTemplate,1,4,1);
    const currentState:any=this.themeStateOf(store)||{};await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,themeState:{...currentState,schema:currentState.schema||'TICARTI_NATIVE_THEME_STATE_V2',version:Number(currentState.version||2),storage:'TENANT_SETTINGS_THEME_STATE',design:next,savedAt:new Date().toISOString()}}}});await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return next;
  }
  async designSections(tenantId:string,storeId:string,pageKey='home'){ const store=await this.assertStore(tenantId,storeId); const state:any=this.themeStateOf(store); return pageKey==='home'&&Array.isArray(state?.sections)?state.sections:[]; }
  async saveDesignSection(tenantId:string,storeId:string,body:any){
    const current=await this.designSections(tenantId,storeId,'home');const sourceId=String(body?.sourceId||body?.settings?.__sourceId||`section-${Date.now()}`);const row={id:sourceId,sourceId,pageKey:'home',sectionType:String(body?.sectionType||'rich_text'),sortOrder:current.length,enabled:body?.enabled!==false,settings:{...(body?.settings||{}),__sourceId:sourceId}};await this.replaceDesignSections(tenantId,storeId,{pageKey:'home',sections:[...current,row]});return row;
  }
  async replaceDesignSections(tenantId:string,storeId:string,body:any){
    const store=await this.assertStore(tenantId,storeId);const pageKey=String(body?.pageKey||'home');if(pageKey!=='home')return [];
    const items=Array.isArray(body?.sections)?body.sections:[];const normalized=items.map((x:any,i:number)=>{const sourceId=String(x?.sourceId||x?.settings?.__sourceId||`section-${i}`);return {id:String(x?.id||sourceId),sourceId,pageKey:'home',sectionType:String(x?.sectionType||'rich_text'),sortOrder:i,enabled:x?.enabled!==false,settings:{...(x?.settings||{}),__sourceId:sourceId}}});
    const root:any=store.settings||{};const state:any=this.themeStateOf(store)||{};await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...root,themeState:{...state,schema:state.schema||'TICARTI_NATIVE_THEME_STATE_V2',version:Number(state.version||2),storage:'TENANT_SETTINGS_THEME_STATE',sections:normalized,savedAt:new Date().toISOString()}}}});await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return normalized;
  }
  async updateDesignSection(tenantId:string,storeId:string,id:string,body:any){const current=await this.designSections(tenantId,storeId,'home');const index=current.findIndex((x:any)=>String(x.id||x.sourceId)===String(id));if(index<0)throw new NotFoundException('Design section not found');const next=current.map((x:any,i:number)=>i===index?{...x,...body,settings:body?.settings?{...(x.settings||{}),...body.settings}:x.settings}:x);await this.replaceDesignSections(tenantId,storeId,{sections:next});return next[index];}
  async deleteDesignSection(tenantId:string,storeId:string,id:string){const current=await this.designSections(tenantId,storeId,'home');const next=current.filter((x:any)=>String(x.id||x.sourceId)!==String(id));if(next.length===current.length)throw new NotFoundException('Design section not found');await this.replaceDesignSections(tenantId,storeId,{sections:next});return{deleted:true};}
  async reorderDesignSections(tenantId:string,storeId:string,body:any){const current=await this.designSections(tenantId,storeId,'home');const order=new Map((Array.isArray(body?.items)?body.items:[]).map((x:any,i:number)=>[String(x.id),Number(x.sortOrder??i)]));const next=[...current].sort((a:any,b:any)=>Number(order.get(String(a.id||a.sourceId))??a.sortOrder??0)-Number(order.get(String(b.id||b.sourceId))??b.sortOrder??0));return this.replaceDesignSections(tenantId,storeId,{sections:next});}


  async domainSettings(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const cfg:any=settings.domains||{};
    const platformSuffix=String(process.env.STOREFRONT_SUBDOMAIN_SUFFIX||'').trim().replace(/^\.+|\.+$/g,'');
    const cnameTarget=String(process.env.STOREFRONT_DOMAIN_TARGET||'commerce-storefront--wedidit-64fae.europe-west4.hosted.app').trim();
    const cf=await this.prisma.integrationConnection.findFirst({where:{tenantId,provider:'cloudflare-dns'},select:{id:true,enabled:true,config:true,updatedAt:true}});
    const appHosting=store.domain?await this.appHostingStatus(store.domain,false):null;
    return {publicSlug:store.publicSlug,domain:store.domain,platformSuffix,cnameTarget,settings:cfg,appHosting,cloudflare:cf?{connected:cf.enabled,connectionId:cf.id,zoneId:(cf.config as any)?.managed?'':((cf.config as any)?.zoneId||''),managed:!!(cf.config as any)?.managed,updatedAt:cf.updatedAt}:null};
  }

  // Signed synchronous Domain Connect requests. No merchant Cloudflare API token is needed.
  // The provider template must be onboarded by Cloudflare before enabling.
  async domainConnectStatus(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);
    const domain=String(store.domain||'').toLowerCase();
    if(!domain)return {domain:null,provider:'unknown',available:false,reason:'Önce özel domain ekleyin.'};
    let nameservers:string[]=[];
    try { nameservers=await resolveNs(domain); } catch { /* DNS may not have propagated */ }
    const cloudflare=nameservers.some(ns=>ns.toLowerCase().endsWith('.ns.cloudflare.com'));
    const approved=process.env.DOMAIN_CONNECT_CLOUDFLARE_APPROVED==='true';
    const testEnabled=process.env.DOMAIN_CONNECT_TEST_MODE==='true' && String(store.publicSlug||'')===String(process.env.DOMAIN_CONNECT_TEST_STORE_SLUG||'');
    const providerEnabled=approved || testEnabled;
    const configured=Boolean(providerEnabled && process.env.DOMAIN_CONNECT_PRIVATE_KEY && process.env.DOMAIN_CONNECT_PUBLIC_KEY_HOST && /^[a-z0-9-]+$/.test(String(store.publicSlug||'')));
    return {domain,provider:cloudflare?'cloudflare':'unknown',nameservers,available:cloudflare&&configured,
      reason:!cloudflare?'Cloudflare nameserver doğrulanamadı.':!configured?'Domain Connect yönlendirmesi için gerekli yapılandırma tamamlanmamış.':'Cloudflare hesabınızda DNS değişikliklerini onaylayabilirsiniz.'};
  }

  async domainConnectLaunch(tenantId:string,storeId:string){
    const status=await this.domainConnectStatus(tenantId,storeId);
    if(!status.available || !status.domain)throw new BadRequestException(status.reason||'Domain Connect henüz etkin değil');
    const domain=status.domain;
    const hosting:any=await this.appHostingStatus(domain,true);
    if(!hosting?.available || !Array.isArray(hosting.records))throw new BadRequestException('Firebase DNS kayıtları alınamadı');
    const records=hosting.records.map((r:any)=>({type:String(r.type||'').toUpperCase(),host:String(r.domainName||r.name||'').toLowerCase().replace(/\.$/,''),value:String(r.rdata||r.content||r.value||'')}));
    const apex=records.find((r:any)=>r.type==='A' && r.host===domain);
    const claim=records.find((r:any)=>r.type==='TXT' && r.host===domain && r.value.startsWith('fah-claim='));
    const acme=records.find((r:any)=>r.type==='CNAME' && r.host.startsWith('_acme-challenge') && (r.host===domain||r.host.endsWith('.'+domain)));
    if(!apex||!claim||!acme||!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(apex.value))throw new BadRequestException('Firebase DNS şablonu ile eşleşen A, TXT ve CNAME kayıtları bulunamadı; otomatik işlem güvenle başlatılamaz');
    const privateKey=String(process.env.DOMAIN_CONNECT_PRIVATE_KEY||'').replace(/\\n/g,'\n');
    const keyHost=String(process.env.DOMAIN_CONNECT_PUBLIC_KEY_HOST||'').trim().toLowerCase().replace(/\.$/,'');
    const store=await this.assertStore(tenantId,storeId);
    const slug=String(store.publicSlug||'').trim().toLowerCase();
    if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug))throw new BadRequestException('Mağaza alt alan adı geçersiz');
    const redirect=`https://${slug}.ticarti.com/admin/settings/domains?dc_return=1`;
    if(!/^_[a-z0-9-]+\.ticarti\.com$/.test(keyHost))throw new BadRequestException('Domain Connect imza yapılandırması geçersiz');
    const acmeHost=acme.host===domain?'@':acme.host.slice(0,-domain.length-1);
    if(!/^_acme-challenge_[a-z0-9-]+$/.test(acmeHost))throw new BadRequestException('Firebase ACME host adı beklenenden farklı; bu şablon yalnız Firebase tarafından sağlanan _acme-challenge_... kayıtlarını destekler');
    const acmeToken=acmeHost.slice('_acme-challenge_'.length);
    const pairs:Record<string,string>={domain,host:'',redirect_uri:redirect,IP:apex.value,CLAIM:claim.value,ACME_TOKEN:acmeToken,ACME_TARGET:acme.value};
    const encode=(v:string)=>encodeURIComponent(v).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
    const canonical=Object.entries(pairs).map(([k,v])=>[encode(k),encode(v)]).sort((a,b)=>a[0].localeCompare(b[0],'en')).map(([k,v])=>k+'='+v).join('&');
    const signer=createSign('RSA-SHA256');signer.update(canonical);signer.end();
    const sig=signer.sign(privateKey).toString('base64');
    const provider='ticarti.com',service='firebase-storefront';
    const url='https://dash.cloudflare.com/domainconnect/v2/domainTemplates/providers/'+provider+'/services/'+service+'/apply?'+canonical+'&key='+encode(keyHost.slice(0,-'.ticarti.com'.length))+'&sig='+encode(sig);
    return {url,domain};
  }

  async prepareDomainSettings(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);
    if(!store.domain)throw new BadRequestException('Önce özel domain ekleyin');
    const result:any=await this.appHostingStatus(store.domain,true);
    if(!result?.available)throw new BadRequestException(result?.error||'Firebase App Hosting bağlantısı oluşturulamadı');
    return this.domainSettings(tenantId,storeId);
  }

  async subdomainAvailability(tenantId:string,storeId:string,value:string){
    await this.assertStore(tenantId,storeId);const slug=this.slugify(value);if(slug.length<3) return {slug,available:false,reason:'En az 3 karakter kullanın'};
    const hardReserved=new Set(['www','login','superadmin','dev','api','admin','app','academy']);
    if(hardReserved.has(slug))return{slug,available:false,reason:'Bu alt alan adı sistem tarafından ayrılmış'};
    const reserved=await this.prisma.reservedSubdomain.findUnique({where:{value:slug},select:{isActive:true,reason:true}});
    if(reserved?.isActive)return{slug,available:false,reason:reserved.reason||'Bu alt alan adı sistem tarafından ayrılmış'};
    const existing=await this.prisma.tenant.findFirst({where:{publicSlug:slug,id:{not:storeId}},select:{id:true}});return {slug,available:!existing,reason:existing?'Bu alt alan adı başka bir mağaza tarafından kullanılıyor':null};
  }

  async updateDomainSettings(tenantId:string,storeId:string,body:any){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};
    const existingCfg:any=settings.domains||{};
    const mode=body?.mode==='custom'?'custom':'subdomain';
    const data:any={};let publicSlug=store.publicSlug;let domain=store.domain;
    if(body?.subdomain!==undefined){
      publicSlug=this.slugify(body.subdomain);if(publicSlug.length<3)throw new BadRequestException(apiError('merchant.domain.subdomainMinLength'));
      const availability=await this.subdomainAvailability(tenantId,storeId,publicSlug);if(!availability.available)throw new BadRequestException(availability.reason||apiError('merchant.domain.unavailable'));
      data.publicSlug=publicSlug;
    }
    if(body?.domain!==undefined){
      const raw=String(body.domain||'').trim().toLowerCase().replace(/^https?:\/\//,'').split('/')[0].replace(/\.$/,'');
      if(raw&&!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(raw))throw new BadRequestException(apiError('merchant.domain.invalid'));
      if(raw){const used=await this.prisma.tenant.findFirst({where:{domain:raw,id:{not:storeId}},select:{id:true}});if(used)throw new BadRequestException(apiError('merchant.domain.alreadyLinked'));}
      domain=raw||null;data.domain=domain;
    }
    if(mode==='custom'){
      if(!domain)throw new BadRequestException('Önce özel domain ekleyin');
      const status:any=await this.appHostingStatus(domain,false);
      if(!status?.connected)throw new BadRequestException('Domain sahipliği, DNS yönlendirmesi ve SSL doğrulanmadan birincil domain yapılamaz');
    }
    const domains={...existingCfg,mode,forceWww:body?.forceWww===undefined?!!existingCfg.forceWww:!!body.forceWww,redirectToPrimary:body?.redirectToPrimary===undefined?existingCfg.redirectToPrimary!==false:body.redirectToPrimary!==false,sslMode:'AUTO'};
    data.settings={...settings,domains};
    await this.prisma.tenant.update({where:{id:storeId},data});await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);
    if(domain&&body?.domain!==undefined&&domain!==store.domain){
      const prepared:any=await this.appHostingStatus(domain,true);
      if(!prepared?.available)return {...await this.domainSettings(tenantId,storeId),setupError:prepared?.error||'Firebase domain bağlantısı oluşturulamadı'};
    }
    return this.domainSettings(tenantId,storeId);
  }

  async connectCloudflareDomain(tenantId:string,storeId:string,_body:any){
    await this.assertStore(tenantId,storeId);
    throw new BadRequestException('Manuel Cloudflare API token bağlantısı artık desteklenmiyor.');
  }

  async connectManagedCloudflareDomain(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    throw new BadRequestException('Merkezi Cloudflare token bağlantısı kaldırıldı. Domain Connect sağlayıcı onayı bekleniyor.');
  }

  async disconnectCloudflareDomain(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    await this.integrations.disableProviderConnection(tenantId,'cloudflare-dns');
    return {connected:false};
  }

  async deleteCustomDomain(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);
    if(!store.domain)return this.domainSettings(tenantId,storeId);
    const settings:any=store.settings||{};
    const cfg:any=settings.domains||{};
    const result=await this.prisma.tenant.updateMany({
      where:{id:storeId,domain:store.domain},
      data:{domain:null,settings:{...settings,domains:{...cfg,mode:'subdomain'}}}
    });
    if(result.count!==1)throw new BadRequestException('Domain değişti. Sayfayı yenileyip tekrar deneyin.');
    await this.cache.delPattern('public:site:*');
    await this.cache.purgeTenant(tenantId);
    const confirmed=await this.prisma.tenant.findUnique({where:{id:storeId},select:{domain:true}});
    if(confirmed?.domain)throw new BadRequestException('Domain kaldırılamadı. Lütfen tekrar deneyin.');
    return this.domainSettings(tenantId,storeId);
  }

  async syncCloudflareDomain(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    throw new BadRequestException('Eski Cloudflare DNS senkronizasyonu devre dışı. Domain Connect onayı tamamlanmadan DNS kayıtları otomatik değiştirilemez.');
  }

  async warehouses(tenantId:string,storeId:string,userId?:string){await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'stock');return this.prisma.warehouse.findMany({where:{storeId,...(scope?{id:{in:scope}}:{})},orderBy:[{isDefault:'desc'},{priority:'asc'},{name:'asc'}]});}
  async createWarehouse(tenantId:string,storeId:string,body:any){await this.assertStore(tenantId,storeId);const name=String(body?.name||'').trim();const code=this.slugify(body?.code||name).toUpperCase().replace(/-/g,'_');if(!name||!code)throw new BadRequestException(apiError('merchant.location.nameCodeRequired'));if(body?.isDefault)await this.prisma.warehouse.updateMany({where:{storeId},data:{isDefault:false}});return this.prisma.warehouse.create({data:{storeId,name,code,isDefault:!!body?.isDefault,isActive:body?.isActive!==false,priority:Number(body?.priority??100),address:body?.address||{}}});}
  async updateWarehouse(tenantId:string,storeId:string,id:string,body:any){await this.assertStore(tenantId,storeId);const row=await this.prisma.warehouse.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException(apiError('merchant.location.notFound'));if(body?.isDefault)await this.prisma.warehouse.updateMany({where:{storeId,id:{not:id}},data:{isDefault:false}});const data:any={};for(const k of ['name','isDefault','isActive','priority','address'])if(body[k]!==undefined)data[k]=k==='priority'?Number(body[k]):body[k];if(body.code!==undefined)data.code=this.slugify(body.code).toUpperCase().replace(/-/g,'_');return this.prisma.warehouse.update({where:{id},data});}
  async deleteWarehouse(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.warehouse.findFirst({where:{id,storeId},include:{_count:{select:{stocks:true}}}});if(!row)throw new NotFoundException(apiError('merchant.location.notFound'));if(row._count.stocks>0)throw new BadRequestException('Stok hareketi bulunan lokasyon silinemez; pasif hale getirin');await this.prisma.warehouse.delete({where:{id}});return{deleted:true};}
  async warehouseStocks(tenantId:string,storeId:string,warehouseId?:string,userId?:string){await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'stock');if(warehouseId&&scope&&!scope.includes(warehouseId))throw new ForbiddenException('Bu depo için yetkiniz yok');return this.prisma.warehouseStock.findMany({where:{warehouse:{storeId},...(warehouseId?{warehouseId}:scope?{warehouseId:{in:scope}}:{})},include:{warehouse:true,variant:{include:{product:{select:{id:true,title:true}}}}},orderBy:{updatedAt:'desc'}});}
  async updateWarehouseStock(tenantId:string,storeId:string,warehouseId:string,variantId:string,body:any,userId?:string){await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'stock');if(scope&&!scope.includes(warehouseId))throw new ForbiddenException('Bu depo için stok düzenleme yetkiniz yok');const [warehouse,variant]=await Promise.all([this.prisma.warehouse.findFirst({where:{id:warehouseId,storeId}}),this.prisma.variant.findFirst({where:{id:variantId,product:{storeId}}})]);if(!warehouse||!variant)throw new NotFoundException(apiError('merchant.stock.warehouseOrVariantMissing'));const data:any={};for(const k of ['onHand','incoming','damaged','safetyStock'])if(body[k]!==undefined){const n=Math.max(0,Math.floor(Number(body[k])));if(!Number.isFinite(n))throw new BadRequestException(`Invalid ${k}`);data[k]=n;}return this.prisma.warehouseStock.upsert({where:{warehouseId_variantId:{warehouseId,variantId}},create:{warehouseId,variantId,...data},update:data,include:{warehouse:true,variant:true}});}

  async inventoryPolicy(tenantId:string,storeId:string){const store:any=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};return settings.inventoryPolicy||{allocationPolicy:'SINGLE_WAREHOUSE',splitAllowed:true,onlineWarehouseId:null,transferTargetWarehouseId:null,transferBatchMode:'MANUAL'};}
  async updateInventoryPolicy(tenantId:string,storeId:string,b:any){const store:any=await this.assertStore(tenantId,storeId);const allowed=['SINGLE_WAREHOUSE','STRICT_SINGLE_WAREHOUSE','NEAREST','PRIORITY','COST_OPTIMIZED','TRANSFER_TO_PRIMARY'];const allocationPolicy=allowed.includes(String(b?.allocationPolicy))?String(b.allocationPolicy):'SINGLE_WAREHOUSE';const transferTargetWarehouseId=b?.transferTargetWarehouseId?String(b.transferTargetWarehouseId):null;const onlineWarehouseId=b?.onlineWarehouseId?String(b.onlineWarehouseId):null;if(transferTargetWarehouseId&&!await this.prisma.warehouse.findFirst({where:{id:transferTargetWarehouseId,storeId,isActive:true}}))throw new BadRequestException('Transfer hedef deposu geçersiz');if(onlineWarehouseId&&!await this.prisma.warehouse.findFirst({where:{id:onlineWarehouseId,storeId,isActive:true}}))throw new BadRequestException('Online satış deposu geçersiz');if(allocationPolicy==='STRICT_SINGLE_WAREHOUSE'&&!onlineWarehouseId)throw new BadRequestException('Sadece tek merkezden karşılama için online satış deposu seçilmelidir');const settings:any=store.settings||{};const transferBatchMode=['MANUAL','SCHEDULED'].includes(String(b?.transferBatchMode||''))?String(b.transferBatchMode):'MANUAL';const inventoryPolicy={allocationPolicy,splitAllowed:allocationPolicy==='STRICT_SINGLE_WAREHOUSE'?false:b?.splitAllowed!==false,onlineWarehouseId,transferTargetWarehouseId,transferBatchMode};await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,inventoryPolicy}}});return inventoryPolicy;}

  async warehouseTransferPool(tenantId:string,storeId:string,userId?:string){
    await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'transfer');
    const rows:any[]=await this.prisma.warehouseTransferRequirement.findMany({where:{storeId,status:'OPEN',...(scope?{sourceWarehouseId:{in:scope}}:{})},orderBy:{createdAt:'asc'},take:2000});
    const variantIds=[...new Set(rows.map(x=>String(x.variantId)))];const warehouseIds=[...new Set(rows.flatMap(x=>[String(x.sourceWarehouseId),String(x.targetWarehouseId)]))];
    const [variants,warehouses]=await Promise.all([this.prisma.variant.findMany({where:{id:{in:variantIds},product:{storeId}},select:{id:true,sku:true,title:true,product:{select:{title:true}}}}),this.prisma.warehouse.findMany({where:{id:{in:warehouseIds},storeId},select:{id:true,name:true,code:true}})]);
    const vm=new Map(variants.map(x=>[x.id,x])),wm=new Map(warehouses.map(x=>[x.id,x]));
    const groups=new Map<string,any>();for(const r of rows){const key=`${r.sourceWarehouseId}:${r.targetWarehouseId}`;let g=groups.get(key);if(!g){g={key,sourceWarehouse:wm.get(r.sourceWarehouseId),targetWarehouse:wm.get(r.targetWarehouseId),requirements:[],items:new Map(),orderIds:new Set(),oldestAt:r.createdAt,urgent:0};groups.set(key,g)}g.requirements.push(r);g.orderIds.add(r.orderId);if(r.priority==='URGENT')g.urgent++;const v:any=vm.get(r.variantId);const item=g.items.get(r.variantId)||{variantId:r.variantId,sku:v?.sku||'',title:v?.product?.title||v?.title||r.variantId,variantTitle:v?.title||'',quantity:0,requirementIds:[]};item.quantity+=Number(r.quantity||0);item.requirementIds.push(r.id);g.items.set(r.variantId,item);}
    return [...groups.values()].map((g:any)=>({...g,orderCount:g.orderIds.size,requirementCount:g.requirements.length,items:[...g.items.values()],requirementIds:g.requirements.map((x:any)=>x.id),orderIds:[...g.orderIds]}));
  }
  async compileWarehouseTransferPool(tenantId:string,storeId:string,userId:string,b:any){
    await this.assertStore(tenantId,storeId);const sourceWarehouseId=String(b?.sourceWarehouseId||''),targetWarehouseId=String(b?.targetWarehouseId||'');if(!sourceWarehouseId||!targetWarehouseId||sourceWarehouseId===targetWarehouseId)throw new BadRequestException('Kaynak ve hedef depo gerekli');const scope=await this.warehouseScope(tenantId,userId,'transfer');if(scope&&!scope.includes(sourceWarehouseId))throw new ForbiddenException('Kaynak depo transfer yetkiniz dışında');
    const reqIds:string[]=(Array.isArray(b?.requirementIds)?b.requirementIds:[]).map(String).filter(Boolean);const where:any={storeId,status:'OPEN',sourceWarehouseId,targetWarehouseId,...(reqIds.length?{id:{in:reqIds}}:{})};const reqs:any[]=await this.prisma.warehouseTransferRequirement.findMany({where,orderBy:{createdAt:'asc'}});if(!reqs.length)throw new BadRequestException('Derlenecek transfer ihtiyacı yok');
    const items=new Map<string,number>();for(const r of reqs)items.set(r.variantId,(items.get(r.variantId)||0)+Number(r.quantity||0));const reference=`TRF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-6)}`;
    return this.prisma.$transaction(async tx=>{const transfer=await tx.warehouseTransfer.create({data:{storeId,sourceWarehouseId,targetWarehouseId,status:'REQUESTED',reference,note:`${new Set(reqs.map(x=>x.orderId)).size} sipariş için toplu transfer`,requestedByUserId:userId,metadata:{requirementCount:reqs.length,orderIds:[...new Set(reqs.map(x=>x.orderId))]},items:{create:[...items].map(([variantId,quantity])=>({variantId,quantity}))}},include:{sourceWarehouse:true,targetWarehouse:true,items:{include:{variant:{include:{product:true}}}}}});await tx.warehouseTransferRequirement.updateMany({where:{id:{in:reqs.map(x=>x.id)}},data:{status:'BATCHED',transferId:transfer.id}});for(const orderId of new Set(reqs.map(x=>x.orderId)))await tx.orderStatusHistory.create({data:{orderId:String(orderId),status:'WAREHOUSE_TRANSFER_BATCHED',note:`${reference} transfer emrine eklendi`}});return transfer;});
  }
  async warehouseTransfers(tenantId:string,storeId:string,userId?:string){await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'transfer');return this.prisma.warehouseTransfer.findMany({where:{storeId,...(scope?{OR:[{sourceWarehouseId:{in:scope}},{targetWarehouseId:{in:scope}}]}:{})},include:{sourceWarehouse:true,targetWarehouse:true,items:{include:{variant:{include:{product:true}}}}},orderBy:{createdAt:'desc'},take:200});}
  async createWarehouseTransfer(tenantId:string,storeId:string,userId:string,b:any){await this.assertStore(tenantId,storeId);const sourceWarehouseId=String(b?.sourceWarehouseId||''),targetWarehouseId=String(b?.targetWarehouseId||'');if(!sourceWarehouseId||!targetWarehouseId||sourceWarehouseId===targetWarehouseId)throw new BadRequestException('Kaynak ve hedef depo seçin');const scope=await this.warehouseScope(tenantId,userId,'transfer');if(scope&&!scope.includes(sourceWarehouseId))throw new ForbiddenException('Kaynak depo yetkiniz dışında');const warehouses=await this.prisma.warehouse.count({where:{id:{in:[sourceWarehouseId,targetWarehouseId]},storeId,isActive:true}});if(warehouses!==2)throw new BadRequestException('Depo seçimi geçersiz');const items=(Array.isArray(b?.items)?b.items:[]).map((x:any)=>({variantId:String(x.variantId||''),quantity:Math.max(1,Math.floor(Number(x.quantity||1)))})).filter((x:any)=>x.variantId);if(!items.length)throw new BadRequestException('Transfer ürünü gerekli');const valid=await this.prisma.variant.count({where:{id:{in:items.map((x:any)=>x.variantId)},product:{storeId}}});if(valid!==new Set(items.map((x:any)=>x.variantId)).size)throw new BadRequestException('Transfer ürünlerinden biri mağazaya ait değil');const reference=`TRF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-6)}`;return this.prisma.warehouseTransfer.create({data:{storeId,orderId:b?.orderId?String(b.orderId):null,sourceWarehouseId,targetWarehouseId,reference,note:b?.note?String(b.note):null,requestedByUserId:userId,items:{create:items}},include:{sourceWarehouse:true,targetWarehouse:true,items:true}});}
  async updateWarehouseTransfer(tenantId:string,storeId:string,id:string,userId:string,b:any){await this.assertStore(tenantId,storeId);const row:any=await this.prisma.warehouseTransfer.findFirst({where:{id,storeId},include:{items:true}});if(!row)throw new NotFoundException();const scope=await this.warehouseScope(tenantId,userId,'transfer');if(scope&&!scope.includes(row.sourceWarehouseId)&&!scope.includes(row.targetWarehouseId))throw new ForbiddenException('Bu transfer için yetkiniz yok');const status=String(b?.status||'').toUpperCase();if(!['APPROVED','IN_TRANSIT','RECEIVED','CANCELLED'].includes(status))throw new BadRequestException('Geçersiz transfer durumu');if(status==='RECEIVED'&&row.status!=='RECEIVED'){await this.prisma.$transaction(async tx=>{const claim=await tx.warehouseTransfer.updateMany({where:{id,storeId,status:{not:'RECEIVED'}},data:{status:'RECEIVED'}});if(claim.count!==1)throw new BadRequestException('Transfer zaten teslim alınmış; stok yeniden taşınmadı');const requirements:any[]=await tx.warehouseTransferRequirement.findMany({where:{transferId:id,status:'BATCHED'}});for(const item of row.items){const src=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:row.sourceWarehouseId,variantId:item.variantId}}});if(!src||Number(src.onHand)<item.quantity)throw new BadRequestException('Kaynak depoda yeterli stok yok');const itemReqs=requirements.filter((x:any)=>x.variantId===item.variantId);const linkedReservations=itemReqs.length?await tx.inventoryReservation.findMany({where:{orderId:{in:[...new Set(itemReqs.map((x:any)=>x.orderId))]},variantId:item.variantId,warehouseId:row.sourceWarehouseId,status:{in:['HELD','COMMITTED']}}}):row.orderId?await tx.inventoryReservation.findMany({where:{orderId:row.orderId,variantId:item.variantId,warehouseId:row.sourceWarehouseId,status:{in:['HELD','COMMITTED']}}}):[];const committedMove=Math.min(item.quantity,linkedReservations.filter((x:any)=>x.status==='COMMITTED').reduce((n:number,x:any)=>n+Number(x.quantity)-Number(x.fulfilledQuantity||0),0));await tx.warehouseStock.update({where:{id:src.id},data:{onHand:{decrement:item.quantity},...(committedMove?{committed:{decrement:Math.min(Number(src.committed||0),committedMove)}}:{})}});await tx.warehouseStock.upsert({where:{warehouseId_variantId:{warehouseId:row.targetWarehouseId,variantId:item.variantId}},create:{warehouseId:row.targetWarehouseId,variantId:item.variantId,onHand:item.quantity,committed:committedMove},update:{onHand:{increment:item.quantity},...(committedMove?{committed:{increment:committedMove}}:{})}});for(const reservation of linkedReservations)await tx.inventoryReservation.update({where:{id:reservation.id},data:{warehouseId:row.targetWarehouseId}});}await tx.warehouseTransfer.update({where:{id},data:{status,completedAt:new Date(),carrierName:b?.carrierName||row.carrierName,trackingCode:b?.trackingCode||row.trackingCode}});if(requirements.length){await tx.warehouseTransferRequirement.updateMany({where:{id:{in:requirements.map(x=>x.id)}},data:{status:'RECEIVED'}});for(const orderId of new Set(requirements.map(x=>x.orderId)))await tx.orderStatusHistory.create({data:{orderId:String(orderId),status:'WAREHOUSE_TRANSFER_RECEIVED',note:`${row.reference||'Transfer'} hedef depoya ulaştı`}});}else if(row.orderId)await tx.orderStatusHistory.create({data:{orderId:row.orderId,status:'WAREHOUSE_TRANSFER_RECEIVED',note:'Depolar arası transfer hedef depoya ulaştı'}});});}else{const data:any={status};if(status==='IN_TRANSIT')data.shippedAt=new Date();if(b?.carrierName!==undefined)data.carrierName=String(b.carrierName||'')||null;if(b?.trackingCode!==undefined)data.trackingCode=String(b.trackingCode||'')||null;await this.prisma.warehouseTransfer.update({where:{id},data});if(status==='CANCELLED')await this.prisma.warehouseTransferRequirement.updateMany({where:{transferId:id,status:'BATCHED'},data:{status:'OPEN',transferId:null}});}return this.prisma.warehouseTransfer.findUnique({where:{id},include:{sourceWarehouse:true,targetWarehouse:true,items:{include:{variant:{include:{product:true}}}}}});}

  async regionalSettings(tenantId:string,storeId:string){return this.regional.settings(tenantId,storeId);}
  async updateRegionalSettings(tenantId:string,storeId:string,body:RegionalSettingsInput){return this.regional.update(tenantId,storeId,body);}
  async refreshCurrencyRates(tenantId:string,storeId:string,body:RefreshRatesInput){return this.regional.refresh(tenantId,storeId,body);}

  async cacheSettings(tenantId:string,storeId:string){ await this.assertStore(tenantId,storeId); return this.prisma.cacheConfig.upsert({where:{storeId},create:{storeId},update:{}}); }
  async updateCacheSettings(tenantId:string,storeId:string,body:any){ await this.assertStore(tenantId,storeId); const allowed=['enabled','appTtlSeconds','storefrontTtlSeconds','seoTtlSeconds','menuTtlSeconds','warmHome','warmCategories','settings']; const data:any={}; for(const k of allowed) if(body[k]!==undefined)data[k]=body[k]; return this.prisma.cacheConfig.upsert({where:{storeId},create:{storeId,...data},update:data}); }

  async purgeCache(tenantId:string){ await this.cache.purgeTenant(tenantId); await this.cache.delPattern('public:site:*'); return {ok:true}; }
  async cacheStats(tenantId:string){ const stats=await this.cache.stats(); return {tenantId,...stats}; }




  async themeCatalog(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);
    const sub=await this.prisma.subscription.findFirst({where:{tenantId,status:{in:['ACTIVE','TRIAL']}},orderBy:{createdAt:'desc'},select:{planId:true}});
    const themeRows:any[]=await this.prisma.themeDefinition.findMany({where:{isActive:true},include:{planPrices:sub?.planId?{where:{planId:sub.planId,isActive:true}}:false,installations:{where:{tenantId},take:1}},orderBy:[{sortOrder:'asc'},{name:'asc'}]});
    const themes=themeRows.filter((theme:any)=>String((theme.config as any)?.format||'')==='ticarti-theme-package');
    return themes.map((theme:any)=>{const pp=Array.isArray(theme.planPrices)?theme.planPrices[0]:null;const owned=!!theme.installations?.[0];const included=!!pp?.included;return {id:theme.id,slug:theme.slug,name:theme.name,description:theme.description,category:theme.category,previewImageUrl:theme.previewImageUrl,version:theme.version,isFeatured:theme.isFeatured,isDefault:theme.isDefault,current:store.activeTheme===theme.slug,owned:owned||included,included,price:included?0:Number(pp?.price??theme.basePrice??0),currency:pp?.currency||theme.currency,billingType:theme.billingType}});
  }


  async themeDraft(tenantId:string,storeId:string,themeId:string){
    const store=await this.assertStore(tenantId,storeId);
    const theme:any=await this.prisma.themeDefinition.findFirst({where:{id:themeId,isActive:true}});
    if(!theme)throw new NotFoundException(apiError('theme.notFound'));
    const catalog:any[]=await this.themeCatalog(tenantId,storeId);const item:any=catalog.find((x:any)=>x.id===themeId);
    if(!item)throw new NotFoundException(apiError('theme.notFound'));
    if(!item.owned&&Number(item.price)>0)throw new BadRequestException(apiError('merchant.theme.purchaseRequired'));
    const cfg:any=theme.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};
    const active=String(store.activeTheme||'')===String(theme.slug||'');
    const runtime:any=this.themeRuntimeOf(store,theme.id,theme.slug,cfg);
    const state:any=this.themeStateOf(store);
    const stateMatches=active&&state&&String(state.themeId||'')===String(theme.id);
    const sourceDesign:any=stateMatches&&state?.design&&typeof state.design==='object'&&!Array.isArray(state.design)
      ? state.design
      : (cfg.design&&typeof cfg.design==='object'&&!Array.isArray(cfg.design)?cfg.design:{general:{themeId:theme.id}});
    const design:any={
      ...sourceDesign,
      general:{...(sourceDesign.general||{}),themeId:theme.id,packageSlug:theme.slug},
      themeSettings:{...(sourceDesign.themeSettings||{}),general:{...runtime.settingsCurrent}},
      themeSettingsSchema:cfg.settingsSchema||sourceDesign.themeSettingsSchema||[],
    };
    const sections:any[]=stateMatches&&Array.isArray(state?.sections)?state.sections:(Array.isArray(cfg.sections)?cfg.sections:[]);
    const menus:any[]=stateMatches&&Array.isArray(state?.menus)?state.menus:(Array.isArray(cfg?.demo?.menus)?cfg.demo.menus:[]);
    const persistedDraft=await this.prisma.themeDesignDraft.findUnique({where:{tenantId_themeId:{tenantId:storeId,themeId}}});
    const draft:any=persistedDraft?.payload&&typeof persistedDraft.payload==='object'&&!Array.isArray(persistedDraft.payload)?persistedDraft.payload:{};
    const preview=createThemePreviewToken(store.id,theme.id);
    return {
      previewToken:preview.token,previewExpiresAt:preview.expiresAt,
      source:persistedDraft?'draft':stateMatches?'tenant':'package',
      hasSavedDraft:!!persistedDraft,
      active,
      theme:{id:theme.id,slug:theme.slug,name:theme.name,version:theme.version,current:active},
      design,
      sections,
      menus,
      settingsSchema:cfg.settingsSchema||[],
      settingsCurrent:draft.settingsCurrent||runtime.settingsCurrent,
      templates:draft.templates||runtime.templates,
      groups:draft.groups||runtime.groups,
      sectionSchemas:Array.isArray(cfg.sectionSchemas)&&cfg.sectionSchemas.length?cfg.sectionSchemas:(Array.isArray(runtime.modules)?runtime.modules:[]),
      modules:Array.isArray(runtime.modules)?runtime.modules:[],
      blockSchemas:runtime.blockSchemas,
      editor:cfg.editor||{},
    };
  }

  private async captureThemeDesignHistory(tenantId:string,storeId:string,reason='MANUAL_SAVE',label?:string){
    const store=await this.assertStore(tenantId,storeId);const state:any=this.themeStateOf(store);const snapshot={activeTheme:store.activeTheme,themeState:state||null};
    const row=await this.prisma.themeDesignHistory.create({data:{tenantId:storeId,themeSlug:store.activeTheme,reason,label:label||null,snapshot:snapshot as any}});
    const old=await this.prisma.themeDesignHistory.findMany({where:{tenantId:storeId},orderBy:{createdAt:'desc'},skip:30,select:{id:true}});if(old.length)await this.prisma.themeDesignHistory.deleteMany({where:{id:{in:old.map((x:any)=>x.id)}}});
    return row;
  }
  async createDesignHistory(tenantId:string,storeId:string,body:any){return this.captureThemeDesignHistory(tenantId,storeId,String(body?.reason||'MANUAL_SAVE'),String(body?.label||'Tasarım kaydı'));}
  async designHistory(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);return this.prisma.themeDesignHistory.findMany({where:{tenantId:storeId},orderBy:{createdAt:'desc'},take:30,select:{id:true,themeSlug:true,reason:true,label:true,createdAt:true}});}
  async restoreDesignHistory(tenantId:string,storeId:string,id:string){
    const store=await this.assertStore(tenantId,storeId);const row=await this.prisma.themeDesignHistory.findFirst({where:{id,tenantId:storeId}});if(!row)throw new NotFoundException(apiError('merchant.designHistory.notFound'));
    await this.captureThemeDesignHistory(tenantId,storeId,'BEFORE_RESTORE','Geri yükleme öncesi otomatik yedek');
    const snap:any=row.snapshot||{};const root:any=store.settings||{};await this.prisma.tenant.update({where:{id:storeId},data:{activeTheme:String(snap.activeTheme||row.themeSlug||store.activeTheme),settings:{...root,themeState:snap.themeState||null}}});
    await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return {ok:true,activeTheme:String(snap.activeTheme||row.themeSlug||store.activeTheme)};
  }

  async saveThemeDesignDraft(tenantId:string,storeId:string,themeId:string,options:any={}){
    await this.assertStore(tenantId,storeId);
    const theme:any=await this.prisma.themeDefinition.findFirst({where:{id:themeId,isActive:true}});
    if(!theme)throw new NotFoundException(apiError('theme.notFound'));
    const catalog=await this.themeCatalog(tenantId,storeId);
    const item:any=catalog.find((x:any)=>x.id===themeId);
    if(!item||(!item.owned&&Number(item.price)>0))throw new BadRequestException(apiError('merchant.theme.purchaseRequired'));
    const cfg:any=theme.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};
    const packageRuntime:any=this.themePackageRuntime(cfg);
    const plain=(x:any)=>x&&typeof x==='object'&&!Array.isArray(x);
    if(!plain(options?.settingsCurrent)||!plain(options?.templates)||!plain(options?.groups))throw new BadRequestException('Invalid theme draft');
    const runtime={...packageRuntime,settingsCurrent:options.settingsCurrent,templates:options.templates,groups:options.groups};
    const sections=Array.isArray(options?.sections)?options.sections:(Array.isArray(cfg.sections)?cfg.sections:[]);
    const performanceBudget=assertThemePerformanceBudget({config:cfg,runtime,sections});
    const payload={settingsCurrent:options.settingsCurrent,templates:options.templates,groups:options.groups};
    const entry=await this.prisma.themeDesignDraft.upsert({where:{tenantId_themeId:{tenantId:storeId,themeId}},create:{tenantId:storeId,themeId,payload},update:{payload}});
    return {ok:true,savedAt:entry.updatedAt,performanceBudget};
  }

  async discardThemeDesignDraft(tenantId:string,storeId:string,themeId:string){
    await this.assertStore(tenantId,storeId);
    await this.prisma.themeDesignDraft.deleteMany({where:{tenantId:storeId,themeId}});
    return {ok:true};
  }

  async activateTheme(tenantId:string,storeId:string,themeId:string,options:any={}){
    const store=await this.assertStore(tenantId,storeId);
    const theme:any=await this.prisma.themeDefinition.findFirst({where:{id:themeId,isActive:true}});
    if(!theme)throw new NotFoundException(apiError('theme.notFound'));
    const catalog=await this.themeCatalog(tenantId,storeId);
    const item:any=catalog.find((x:any)=>x.id===themeId);
    if(!item)throw new NotFoundException(apiError('theme.notFound'));
    if(!item.owned&&Number(item.price)>0)throw new BadRequestException(apiError('merchant.theme.purchaseRequired'));
    const cfg:any=theme.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};
    const packageRuntime:any=this.themePackageRuntime(cfg);const runtime:any={...packageRuntime,settingsCurrent:options?.settingsCurrent&&typeof options.settingsCurrent==='object'&&!Array.isArray(options.settingsCurrent)?options.settingsCurrent:packageRuntime.settingsCurrent,templates:options?.templates&&typeof options.templates==='object'&&!Array.isArray(options.templates)?options.templates:packageRuntime.templates,groups:options?.groups&&typeof options.groups==='object'&&!Array.isArray(options.groups)?options.groups:packageRuntime.groups};
    const sourceDesign:any=options?.design&&typeof options.design==='object'&&!Array.isArray(options.design)?options.design:(cfg.design&&typeof cfg.design==='object'&&!Array.isArray(cfg.design)?cfg.design:{general:{themeId:theme.id}});
    const design:any={
      ...sourceDesign,
      general:{...(sourceDesign.general||{}),themeId:theme.id,packageSlug:theme.slug},
      themeSettings:{...(sourceDesign.themeSettings||{}),general:{...runtime.settingsCurrent}},
      themeSettingsSchema:cfg.settingsSchema||sourceDesign.themeSettingsSchema||[],
    };
    const sections:any[]=Array.isArray(options?.sections)?options.sections:(Array.isArray(cfg.sections)?cfg.sections:[]);
    const root:any=store.settings&&typeof store.settings==='object'&&!Array.isArray(store.settings)?store.settings:{};
    const previous:any=this.themeStateOf(store)||{};
    const menus=Array.isArray(options?.menus)?options.menus:(Array.isArray(cfg?.demo?.menus)&&cfg.demo.menus.length?cfg.demo.menus:(Array.isArray(previous.menus)?previous.menus:[]));
    const performanceBudget=assertThemePerformanceBudget({config:cfg,runtime,sections});
    const state:any={schema:'TICARTI_NATIVE_THEME_STATE_V2',version:2,themeId,themeSlug:theme.slug,design,sections,menus,runtime:{settingsCurrent:runtime.settingsCurrent,templates:runtime.templates,groups:runtime.groups},performanceBudget,savedAt:new Date().toISOString()};
    await this.captureThemeDesignHistory(tenantId,storeId,store.activeTheme===theme.slug?'THEME_SAVE':'THEME_CHANGE',store.activeTheme===theme.slug?`${theme.slug} kaydedildi`:`${store.activeTheme} -> ${theme.slug}`);
    await this.prisma.$transaction(async (tx:any)=>{
      await tx.themeInstallation.upsert({where:{tenantId_themeId:{tenantId,themeId}},create:{tenantId,themeId,status:'ACTIVE',source:item.included?'PLAN':'FREE',purchasedPrice:0,currency:item.currency,activatedAt:new Date()},update:{status:'ACTIVE',activatedAt:new Date()}});
      await tx.tenant.update({where:{id:store.id},data:{activeTheme:theme.slug,settings:{...root,themeState:state}}});
      await tx.themeDesignDraft.deleteMany({where:{tenantId:storeId,themeId}});
    });
    await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);
    return {activeTheme:theme.slug,themeId,design,sections,runtime:state.runtime,performanceBudget};
  }

  async bankTransferSettings(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    const row=await this.prisma.paymentMethod.findFirst({where:{storeId,code:'bank_transfer'}});
    const cfg:any=(row?.config as any)||{};const bank:any=cfg.bankTransfer||{};
    return{id:row?.id||null,enabled:row?.isActive??false,name:row?.name||'Havale / EFT',instructions:row?.instructions||'',bankName:String(bank.bankName||''),accountHolder:String(bank.accountHolder||''),iban:String(bank.iban||'')};
  }

  async updateBankTransferSettings(tenantId:string,storeId:string,body:any){
    await this.assertStore(tenantId,storeId);
    const existing=await this.prisma.paymentMethod.findFirst({where:{storeId,code:'bank_transfer'}});
    const iban=String(body.iban||'').replace(/\s+/g,'').toUpperCase();
    if(iban&&!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban))throw new BadRequestException('Invalid IBAN');
    const oldCfg:any=(existing?.config as any)||{};
    const config:any={...oldCfg,bankTransfer:{bankName:String(body.bankName||'').trim(),accountHolder:String(body.accountHolder||'').trim(),iban}};
    const data:any={name:String(body.name||'Havale / EFT').trim()||'Havale / EFT',type:'manual',instructions:String(body.instructions||'').trim()||null,requiresOnlinePayment:false,supportsInstallment:false,fee:0,isActive:body.enabled!==false,config};
    if(existing)return this.prisma.paymentMethod.update({where:{id:existing.id},data});
    return this.prisma.paymentMethod.create({data:{storeId,code:'bank_transfer',sortOrder:0,...data}});
  }

  // === Core Commerce Operations V5 ===
  private v5Int(value:any,fallback:number,min=1,max=200){const n=Math.floor(Number(value));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
  private v5Bool(value:any){return value===true||String(value).toLowerCase()==='true'||String(value)==='1';}
  private v5Date(value:any){const d=value?new Date(String(value)):null;return d&&!Number.isNaN(d.getTime())?d:null;}

  async commerceProducts(tenantId:string,q:any){
    const storeId=String(q?.storeId||'');await this.assertStore(tenantId,storeId);const page=this.v5Int(q?.page,1,1,100000),limit=this.v5Int(q?.limit,25,10,100);const search=String(q?.q||'').trim();const salesChannelId=String(q?.salesChannelId||'').trim();
    let channel:any=null;if(salesChannelId){channel=await this.prisma.salesChannel.findFirst({where:{id:salesChannelId,storeId,active:true},include:{stockLocations:{where:{active:true},select:{warehouseId:true}},priceList:{include:{prices:{where:{minQuantity:1}}}}}});if(!channel)throw new BadRequestException('Satış kanalı bulunamadı');}
    const where:any={storeId};if(q?.status&&q.status!=='ALL')where.status=String(q.status);if(q?.brandId&&q.brandId!=='ALL')where.brandId=String(q.brandId);if(q?.categoryId&&q.categoryId!=='ALL')where.categories={some:{categoryId:String(q.categoryId)}};
    if(search)where.OR=[{title:{contains:search,mode:'insensitive'}},{slug:{contains:search,mode:'insensitive'}},{variants:{some:{OR:[{sku:{contains:search,mode:'insensitive'}},{barcode:{contains:search,mode:'insensitive'}},{mpn:{contains:search,mode:'insensitive'}}]}}}];
    const stock=String(q?.stock||'ALL');if(stock==='OUT')where.variants={...(where.variants||{}),some:{...(where.variants?.some||{}),warehouseStocks:{every:{onHand:{lte:0}}}}};
    const sortable:any={title:'title',createdAt:'createdAt',updatedAt:'updatedAt',status:'status'};const sort=sortable[String(q?.sort||'createdAt')]||'createdAt';const dir=String(q?.dir||'desc').toLowerCase()==='asc'?'asc':'desc';
    const [total,rows,active,draft,archived]=await this.prisma.$transaction([
      this.prisma.product.count({where}),
      this.prisma.product.findMany({where,skip:(page-1)*limit,take:limit,orderBy:{[sort]:dir},include:{brand:true,images:{orderBy:{sortOrder:'asc'},take:1},categories:{include:{category:true}},salesChannels:salesChannelId?{where:{salesChannelId},select:{published:true}}:false,variants:{include:{inventory:true,warehouseStocks:channel?.stockLocations?.length?{where:{warehouseId:{in:channel.stockLocations.map((x:any)=>x.warehouseId)}}}:true,optionValues:{include:{optionValue:{include:{option:true}}}}}}}}),
      this.prisma.product.count({where:{storeId,status:'ACTIVE'}}),this.prisma.product.count({where:{storeId,status:'DRAFT'}}),this.prisma.product.count({where:{storeId,status:'ARCHIVED'}})
    ]);
    const priceMap=new Map<string,number>();for(const x of channel?.priceList?.prices||[])priceMap.set(String(x.variantId),Number(x.price));
    const items=rows.map((x:any)=>{const presented:any=this.presentAdminProduct(x);if(channel){presented.channel={id:channel.id,name:channel.name,type:channel.type,published:!!x.salesChannels?.[0]?.published};presented.variants=(presented.variants||[]).map((v:any)=>({...v,basePrice:Number(v.price||0),price:priceMap.has(String(v.id))?priceMap.get(String(v.id)):v.price}));}return presented;});
    return{items,total,page,limit,pages:Math.max(1,Math.ceil(total/limit)),summary:{total:active+draft+archived,active,draft,archived},channel:channel?{id:channel.id,name:channel.name,type:channel.type}:null};
  }

  async commerceProductsBulk(tenantId:string,b:any){
    const storeId=String(b?.storeId||'');await this.assertStore(tenantId,storeId);const ids:string[]=Array.from(new Set<string>((Array.isArray(b?.ids)?b.ids:[]).map((x:any)=>String(x)).filter((x:string)=>Boolean(x))));if(!ids.length)throw new BadRequestException('Ürün seçilmedi');if(ids.length>500)throw new BadRequestException('Tek işlemde en fazla 500 ürün');
    const action=String(b?.action||'').toUpperCase();if(action==='STATUS'){const status=String(b?.status||'');if(!['ACTIVE','DRAFT','ARCHIVED'].includes(status))throw new BadRequestException('Geçersiz durum');const r=await this.prisma.product.updateMany({where:{storeId,id:{in:ids}},data:{status:status as any}});return{updated:r.count};}
    if(action==='BRAND'){const brandId=b?.brandId?String(b.brandId):null;if(brandId&&!await this.prisma.brand.findFirst({where:{id:brandId,storeId}}))throw new BadRequestException('Marka mağazaya ait değil');const r=await this.prisma.product.updateMany({where:{storeId,id:{in:ids}},data:{brandId}});return{updated:r.count};}
    if(action==='CATEGORY_ADD'||action==='CATEGORY_REMOVE'){const categoryId=String(b?.categoryId||'');if(!await this.prisma.category.findFirst({where:{id:categoryId,storeId}}))throw new BadRequestException('Kategori mağazaya ait değil');if(action==='CATEGORY_REMOVE'){const r=await this.prisma.productCategory.deleteMany({where:{categoryId,productId:{in:ids},product:{storeId}}});return{updated:r.count};}let count=0;for(const id of ids){const p=await this.prisma.product.findFirst({where:{id,storeId},select:{id:true}});if(p){await this.prisma.productCategory.upsert({where:{productId_categoryId:{productId:id,categoryId}},create:{productId:id,categoryId},update:{}});count++;}}return{updated:count};}
    if(action==='TAG_ADD'||action==='TAG_REMOVE'){const tag=String(b?.tag||'').trim();if(!tag)throw new BadRequestException('Etiket gerekli');const rows=await this.prisma.product.findMany({where:{storeId,id:{in:ids}},select:{id:true,tags:true}});for(const row of rows){const tags=action==='TAG_ADD'?Array.from(new Set([...(row.tags||[]),tag])):(row.tags||[]).filter(x=>x!==tag);await this.prisma.product.update({where:{id:row.id},data:{tags}});}return{updated:rows.length};}
    if(action==='CHANNEL_PUBLISH'||action==='CHANNEL_UNPUBLISH'){const salesChannelId=String(b?.salesChannelId||'');const ch=await this.prisma.salesChannel.findFirst({where:{id:salesChannelId,storeId,active:true},select:{id:true}});if(!ch)throw new BadRequestException('Satış kanalı bulunamadı');const valid=await this.prisma.product.count({where:{storeId,id:{in:ids}}});if(valid!==ids.length)throw new BadRequestException('Ürün mağazaya ait değil');const published=action==='CHANNEL_PUBLISH';for(const productId of ids)await this.prisma.productSalesChannel.upsert({where:{productId_salesChannelId:{productId,salesChannelId}},create:{productId,salesChannelId,published},update:{published}});return{updated:ids.length,published};}
    throw new BadRequestException('Desteklenmeyen toplu işlem');
  }

  async commerceProductsImport(tenantId:string,b:any){
    const storeId=String(b?.storeId||'');await this.assertStore(tenantId,storeId);
    const rows=Array.isArray(b?.rows)?b.rows.slice(0,1000):[];if(!rows.length)throw new BadRequestException('İçe aktarılacak ürün yok');
    let created=0;const failed:any[]=[];
    for(let offset=0;offset<rows.length;offset+=20){const batch=rows.slice(offset,offset+20);const results=await Promise.all(batch.map(async(row:any,index:number)=>{try{const title=String(row?.title||'').trim();if(!title)throw new Error('Ürün adı gerekli');const sku=String(row?.sku||`SKU-${Date.now()}-${offset+index}`).trim();await this.createProduct(tenantId,storeId,{title,status:String(row?.status||'DRAFT'),brandId:row?.brandId||null,categoryIds:Array.isArray(row?.categoryIds)?row.categoryIds:[],tags:Array.isArray(row?.tags)?row.tags:[],variants:[{sku,title:String(row?.variantTitle||'Varsayılan'),price:Number(row?.price||0),stock:Number(row?.stock||0),barcode:row?.barcode||null,mpn:row?.mpn||null}]});return true}catch(e:any){failed.push({row:offset+index+2,message:e?.message||'İçe aktarma hatası'});return false}}));created+=results.filter(Boolean).length;}
    return{created,failed,total:rows.length};
  }

  async commerceProductClone(tenantId:string,storeId:string,id:string){
    await this.assertStore(tenantId,storeId);const src:any=await this.prisma.product.findFirst({where:{id,storeId},include:{images:true,categories:true,collections:true,variants:{include:{inventory:true}}}});if(!src)throw new NotFoundException('Product not found');
    const base=`${src.title} Kopya`;let slug=this.slugify(`${src.slug}-copy`),i=2;while(await this.prisma.product.findFirst({where:{storeId,slug},select:{id:true}}))slug=this.slugify(`${src.slug}-copy-${i++}`);
    return this.prisma.$transaction(async tx=>{const p=await tx.product.create({data:{storeId,brandId:src.brandId,taxCategoryId:src.taxCategoryId,unitDefinitionId:src.unitDefinitionId,title:base,slug,description:src.description,shortDescription:src.shortDescription,status:'DRAFT',productType:src.productType,tags:src.tags,seoTitle:src.seoTitle,seoDescription:src.seoDescription,metadata:src.metadata,requiresShipping:src.requiresShipping,isDigital:src.isDigital,ageRestricted:src.ageRestricted}});for(const im of src.images)await tx.productImage.create({data:{productId:p.id,url:im.url,alt:im.alt,sortOrder:im.sortOrder,mediaAssetId:im.mediaAssetId}});for(const c of src.categories)await tx.productCategory.create({data:{productId:p.id,categoryId:c.categoryId}});for(const v of src.variants){const nv=await tx.variant.create({data:{productId:p.id,sku:`${v.sku}-COPY-${String(Date.now()).slice(-5)}`,barcode:null,gtin:v.gtin,mpn:v.mpn,model:v.model,hsCode:v.hsCode,countryOfOrigin:v.countryOfOrigin,title:v.title,price:v.price,comparePrice:v.comparePrice,cost:v.cost,weight:v.weight,length:v.length,width:v.width,height:v.height,preorderEnabled:v.preorderEnabled,preorderMessage:v.preorderMessage,preorderAvailableAt:v.preorderAvailableAt,isActive:v.isActive}});if(v.inventory)await tx.inventoryItem.create({data:{variantId:nv.id,trackStock:v.inventory.trackStock,allowBackorder:v.inventory.allowBackorder,lowStockAt:v.inventory.lowStockAt}});}return p;});
  }

  async commerceOrders(tenantId:string,q:any,userId?:string){
    const storeId=String(q?.storeId||'');
    await this.assertStore(tenantId,storeId);
    const page=this.v5Int(q?.page,1,1,100000);
    const limit=this.v5Int(q?.limit,25,10,100);
    const search=String(q?.q||'').trim();
    const where:any={storeId};
    const warehouseScope=await this.warehouseScope(tenantId,userId,'fulfill');
    if(warehouseScope)where.OR=[{inventoryReservations:{some:{warehouseId:{in:warehouseScope}}}},{fulfillments:{some:{warehouseId:{in:warehouseScope}}}}];
    if(q?.status&&q.status!=='ALL')where.status=String(q.status);
    if(q?.paymentStatus&&q.paymentStatus!=='ALL')where.paymentStatus=String(q.paymentStatus);
    if(q?.fulfillmentStatus&&q.fulfillmentStatus!=='ALL')where.fulfillmentStatus=String(q.fulfillmentStatus);
    if(q?.salesChannelId){const ch=await this.prisma.salesChannel.findFirst({where:{id:String(q.salesChannelId),storeId,active:true},select:{id:true}});if(!ch)throw new BadRequestException('Satış kanalı bulunamadı');where.salesChannelId=ch.id;}if(q?.source&&q.source!=='ALL')where.source=String(q.source);if(q?.risk&&q.risk!=='ALL')where.riskLevel=String(q.risk);
    const from=this.v5Date(q?.from),to=this.v5Date(q?.to);
    if(from||to)where.createdAt={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
    if(search){
      const num=Number(search.replace(/\D/g,''));
      const searchOr:any[]=[
        ...(Number.isFinite(num)&&num>0?[{number:num}]:[]),
        {customer:{OR:[{email:{contains:search,mode:'insensitive'}},{firstName:{contains:search,mode:'insensitive'}},{lastName:{contains:search,mode:'insensitive'}}]}},
        {items:{some:{OR:[{sku:{contains:search,mode:'insensitive'}},{title:{contains:search,mode:'insensitive'}}]}}}
      ];
      if(warehouseScope)where.AND=[{OR:where.OR},{OR:searchOr}],delete where.OR;else where.OR=searchOr;
    }
    const [total,items,pending,paid,unfulfilled]=await this.prisma.$transaction([
      this.prisma.order.count({where}),
      this.prisma.order.findMany({
        where,skip:(page-1)*limit,take:limit,orderBy:{createdAt:'desc'},
        include:{customer:true,items:{select:{id:true,title:true,sku:true,quantity:true,fulfilledQuantity:true,total:true}},_count:{select:{returns:true,fulfillments:true,refunds:true}}}
      }),
      this.prisma.order.count({where:{storeId,...(where.salesChannelId?{salesChannelId:where.salesChannelId}:{}),status:{in:['PENDING_PAYMENT','PROCESSING']}}}),
      this.prisma.order.count({where:{storeId,...(where.salesChannelId?{salesChannelId:where.salesChannelId}:{}),paymentStatus:'PAID'}}),
      this.prisma.order.count({where:{storeId,...(where.salesChannelId?{salesChannelId:where.salesChannelId}:{}),fulfillmentStatus:{in:['UNFULFILLED','PARTIALLY_FULFILLED']},status:{not:'CANCELLED'}}})
    ]);
    const ctx=await this.orderDisplayContext(storeId);
    return{items:items.map((row:any)=>this.orderDisplay(row,ctx)),total,page,limit,pages:Math.max(1,Math.ceil(total/limit)),summary:{pending,paid,unfulfilled}};
  }

  async commerceOrderAction(tenantId:string,storeId:string,id:string,b:any,userId?:string){
    await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'fulfill');if(scope){const allowed=await this.prisma.order.findFirst({where:{id,storeId,OR:[{inventoryReservations:{some:{warehouseId:{in:scope}}}},{fulfillments:{some:{warehouseId:{in:scope}}}}]},select:{id:true}});if(!allowed)throw new ForbiddenException('Bu sipariş atanmış depolarınızın dışında');}const action=String(b?.action||'').toUpperCase();
    if(action==='CAPTURE_PAYMENT')return this.updateOrderStatus(tenantId,storeId,id,{storeId,paymentStatus:'PAID',status:'PROCESSING',note:b?.note||'Ödeme tahsil edildi'});
    if(action==='CANCEL')return this.updateOrderStatus(tenantId,storeId,id,{storeId,status:'CANCELLED',reason:b?.reason||'Yönetici tarafından iptal edildi',note:b?.note});
    if(action==='NOTE'){const order=await this.prisma.order.findFirst({where:{id,storeId}});if(!order)throw new NotFoundException();const note=String(b?.note||'').trim();const updated=await this.prisma.order.update({where:{id},data:{adminNote:note||null}});await this.prisma.orderStatusHistory.create({data:{orderId:id,status:'NOTE',note}});return updated;}
    if(action==='SET_RISK'){const level=String(b?.riskLevel||'NORMAL').toUpperCase();if(!['NORMAL','REVIEW','HIGH'].includes(level))throw new BadRequestException('Geçersiz risk seviyesi');const row=await this.prisma.order.update({where:{id},data:{riskLevel:level,riskReason:b?.riskReason?String(b.riskReason):null}});await this.prisma.orderStatusHistory.create({data:{orderId:id,status:'RISK_UPDATED',note:`${level}${b?.riskReason?` · ${b.riskReason}`:''}`}});return row;}
    if(action==='TAG_ADD'||action==='TAG_REMOVE'){const row=await this.prisma.order.findFirst({where:{id,storeId},select:{tags:true}});if(!row)throw new NotFoundException();const tag=String(b?.tag||'').trim();if(!tag)throw new BadRequestException('Etiket gerekli');const tags=action==='TAG_ADD'?Array.from(new Set([...(row.tags||[]),tag])):(row.tags||[]).filter(x=>x!==tag);return this.prisma.order.update({where:{id},data:{tags}});}
    if(action==='CREATE_INVOICE'){const doc=await this.edoc.createForOrder(storeId,id,{documentType:b?.documentType||'AUTO',provider:b?.provider});await this.prisma.orderStatusHistory.create({data:{orderId:id,status:'INVOICE_CREATED',note:doc?.documentNumber||doc?.uuid||'E-belge oluşturuldu'}});return doc;}
    if(action==='UPDATE_DETAILS'){const order:any=await this.prisma.order.findFirst({where:{id,storeId}});if(!order)throw new NotFoundException();const data:any={};if(b.shippingAddress!==undefined)data.shippingAddress=b.shippingAddress||{};if(b.billingAddress!==undefined)data.billingAddress=b.billingAddress||{};if(b.customerNote!==undefined)data.customerNote=String(b.customerNote||'')||null;if(b.shippingMethod!==undefined)data.shippingMethod=String(b.shippingMethod||'')||null;const current:any=order.metadata||{};if(b.invoice!==undefined)data.metadata={...current,invoice:{...(current.invoice||{}),...(b.invoice||{})}};const row=await this.prisma.order.update({where:{id},data});await this.prisma.orderStatusHistory.create({data:{orderId:id,status:'DETAILS_UPDATED',note:'Teslimat / fatura bilgileri güncellendi'}});return row;}
    throw new BadRequestException('Desteklenmeyen sipariş işlemi');
  }


  private async calculateOrderTaxBreakdown(db:any,storeId:string,rows:any[],context:any){
    const store:any=await db.tenant.findUnique({where:{id:storeId},select:{settings:true,defaultCountry:true}});
    if(!store)throw new NotFoundException('Store not found');
    const settings:any=store.settings||{};
    const taxPolicy:any=settings.taxInvoicePolicy||{};
    const regional:any=settings?.regional?.tax||{};
    const defaultTaxRate=Math.max(0,Number(taxPolicy.defaultTaxRate??regional.defaultRate??settings.taxRate??0));
    const pricesIncludeTax=Boolean(taxPolicy.pricesIncludeTax??regional.pricesIncludeTax??settings.pricesIncludeTax);
    const destination:any=(taxPolicy.destinationBased!==false?(context?.shippingAddress||context?.billingAddress):(context?.billingAddress||context?.shippingAddress))||{};
    const taxCountry=String(destination.country||store.defaultCountry||'TR').toUpperCase();
    const taxSubdivision=String(destination.state||destination.subdivision||'').toUpperCase();
    const customerMeta:any=context?.customerMetadata||{};
    const taxExempt=taxPolicy.exemptionsEnabled!==false&&customerMeta.taxExempt===true;
    const subtotal=this.posMoney(rows.reduce((n:number,row:any)=>n+Number(row.unit||0)*Number(row.quantity||0),0));
    const discountTotal=this.posMoney(Math.min(subtotal,Math.max(0,Number(context?.discountTotal||0))));
    const discountFactor=subtotal>0?Math.max(0,(subtotal-discountTotal)/subtotal):1;
    const lineItems:any[]=[];
    let itemTax=0;

    for(const row of rows){
      const category:any=row?.variant?.product?.taxCategory||null;
      const rules:any[]=Array.isArray(category?.rules)?category.rules:[];
      const matched=rules
        .filter((r:any)=>(!r.country||String(r.country).toUpperCase()===taxCountry)&&(!r.subdivision||String(r.subdivision).toUpperCase()===taxSubdivision))
        .sort((a:any,b:any)=>Number(!!b.subdivision)-Number(!!a.subdivision)||Number(!!b.country)-Number(!!a.country)||Number(a.priority||100)-Number(b.priority||100))[0];
      const rate=taxExempt?0:Math.max(0,Number(matched?.rate??category?.rate??defaultTaxRate));
      const gross=this.posMoney(Number(row.unit||0)*Number(row.quantity||0));
      const taxable=this.posMoney(gross*discountFactor);
      const tax=this.posMoney(rate<=0?0:(pricesIncludeTax?taxable-taxable/(1+rate/100):taxable*rate/100));
      itemTax=this.posMoney(itemTax+tax);
      lineItems.push({variantId:row.variant.id,taxRate:rate,taxAmount:tax});
    }

    const shippingTotal=this.posMoney(Math.max(0,Number(context?.shippingTotal||0)));
    const paymentFee=this.posMoney(Math.max(0,Number(context?.paymentFee||0)));
    const extraRate=taxExempt?0:defaultTaxRate;
    const shippingTax=taxPolicy.shippingTaxable===false?0:this.posMoney(extraRate<=0?0:(pricesIncludeTax?shippingTotal-shippingTotal/(1+extraRate/100):shippingTotal*extraRate/100));
    const paymentFeeTax=taxPolicy.paymentFeeTaxable===false?0:this.posMoney(extraRate<=0?0:(pricesIncludeTax?paymentFee-paymentFee/(1+extraRate/100):paymentFee*extraRate/100));
    const taxTotal=this.posMoney(itemTax+shippingTax+paymentFeeTax);
    const net=this.posMoney(Math.max(0,subtotal-discountTotal));
    const grandTotal=this.posMoney(net+shippingTotal+paymentFee+(pricesIncludeTax?0:taxTotal));

    return{subtotal,discountTotal,taxTotal,grandTotal,pricesIncludeTax,defaultTaxRate,taxCountry,taxSubdivision,lineItems,shippingTax,paymentFeeTax};
  }

  async editOrderItems(tenantId:string,storeId:string,id:string,b:any,userId?:string){
    const reservationMinutes=await this.reservationMinutes(storeId);
    await this.assertStore(tenantId,storeId);
    const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    const requested=(Array.isArray(b?.items)?b.items:[]).map((x:any)=>({id:x?.id?String(x.id):null,variantId:x?.variantId?String(x.variantId):null,quantity:Math.max(0,Math.floor(Number(x?.quantity||0))),unitPrice:Number(x?.unitPrice)})).filter((x:any)=>x.quantity>0&&(x.id||x.variantId));
    if(!requested.length)throw new BadRequestException('Siparişte en az bir ürün kalmalıdır');
    return this.prisma.$transaction(async tx=>{
      const order:any=await tx.order.findFirst({where:{id,storeId},include:{items:true,inventoryReservations:true,fulfillments:true,returns:true,refunds:true,paymentTransactions:true}});
      if(!order)throw new NotFoundException('Order not found');
      if(['CANCELLED','REFUNDED'].includes(String(order.status)))throw new BadRequestException('İptal veya iade edilmiş sipariş düzenlenemez');
      if(order.fulfillmentStatus!=='UNFULFILLED'||order.items.some((x:any)=>Number(x.fulfilledQuantity||0)>0)||order.fulfillments.length)throw new BadRequestException('Gönderimi başlamış siparişin ürünleri değiştirilemez');
      if(order.returns.length||order.refunds.length)throw new BadRequestException('İade veya geri ödeme süreci başlamış siparişin ürünleri değiştirilemez');
      const activeReservations=order.inventoryReservations.filter((x:any)=>['HELD','COMMITTED'].includes(String(x.status)));
      if(scope&&activeReservations.some((x:any)=>!scope.includes(String(x.warehouseId))))throw new ForbiddenException('Sipariş atanmış depolarınızın dışında');
      const existingById=new Map<string, any>(order.items.map((x:any)=>[String(x.id),x]));
      const variantIds:string[]=Array.from(new Set<string>(requested.map((x:any)=>String(x.variantId||(x.id?existingById.get(String(x.id))?.variantId:'')||'')).filter(Boolean)));
      const variants:any[]=variantIds.length?await tx.variant.findMany({where:{id:{in:variantIds},isActive:true,product:{storeId}},include:{product:{include:{taxCategory:{include:{rules:{orderBy:{priority:'asc'}}}}}},inventory:true}}):[];
      const variantById=new Map(variants.map((x:any)=>[String(x.id),x]));
      const rows:any[]=[];
      for(const req of requested){
        const old:any=req.id?existingById.get(req.id):null;
        if(req.id&&!old)throw new BadRequestException('Sipariş satırı siparişe ait değil');
        const variantId=String(req.variantId||old?.variantId||'');
        const variant:any=variantId?variantById.get(variantId):null;
        if(!variant)throw new BadRequestException('Ürün varyantı bulunamadı veya mağazaya ait değil');
        const unit=Number.isFinite(req.unitPrice)&&req.unitPrice>=0?this.posMoney(req.unitPrice):this.posMoney(old?.unitPrice??variant.price);
        rows.push({old,variant,quantity:req.quantity,unit,originalUnitPrice:Number((old?.originalUnitPrice ?? variant.price) || 0)});
      }
      const reserveStock=activeReservations.length>0||((order.metadata as any)?.manualOrder?.reserveStock===true);
      for(const reservation of activeReservations){
        const stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:reservation.warehouseId,variantId:reservation.variantId}}});
        if(stock){const qty=Math.max(0,Number(reservation.quantity||0)-Number(reservation.fulfilledQuantity||0));if(reservation.status==='HELD')await tx.warehouseStock.update({where:{id:stock.id},data:{reserved:{decrement:Math.min(Number(stock.reserved||0),qty)}}});else await tx.warehouseStock.update({where:{id:stock.id},data:{committed:{decrement:Math.min(Number(stock.committed||0),qty)}}});}
        await tx.inventoryReservation.update({where:{id:reservation.id},data:{status:'RELEASED',expiresAt:null}});
      }
      await tx.orderItem.deleteMany({where:{orderId:id}});
      const customer:any=order.customerId?await tx.customer.findFirst({where:{id:order.customerId,storeId},select:{metadata:true}}):null;
      const financials=await this.calculateOrderTaxBreakdown(tx,storeId,rows,{shippingAddress:order.shippingAddress,billingAddress:order.billingAddress,customerMetadata:customer?.metadata||{},discountTotal:Number(order.discountTotal||0),shippingTotal:Number(order.shippingTotal||0),paymentFee:Number(order.paymentFee||0)});
      const taxByVariant=new Map(financials.lineItems.map((x:any)=>[String(x.variantId),x]));
      const created:any[]=[];
      for(const row of rows){const lineTax:any=taxByVariant.get(String(row.variant.id))||{taxRate:0,taxAmount:0};created.push(await tx.orderItem.create({data:{orderId:id,variantId:row.variant.id,productIdSnapshot:row.variant.productId,sku:row.variant.sku,barcodeSnapshot:row.variant.barcode||null,title:row.variant.product.title,variantTitle:row.variant.title,quantity:row.quantity,fulfilledQuantity:0,originalUnitPrice:row.originalUnitPrice,unitPrice:row.unit,discountTotal:0,taxRate:lineTax.taxRate,taxAmount:lineTax.taxAmount,total:this.posMoney(row.unit*row.quantity)}}));}

      const reservationStatus=order.paymentStatus==='PAID'?'COMMITTED':'HELD';
      if(reserveStock){for(let i=0;i<rows.length;i++){const row=rows[i];const targets:any[]=await this.inventoryTargetsForVariant(storeId,row.variant.id,row.quantity,tx);for(const target of targets){if(!target.inventory?.trackStock||!target.warehouseId)continue;if(scope&&!scope.includes(String(target.warehouseId)))throw new ForbiddenException('Yeni stok dağıtımı yetkili olduğunuz depoların dışında');const qty=Math.max(0,Number(target.quantity||0));let stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:target.warehouseId,variantId:target.variantId}}});if(!stock&&target.inventory.allowBackorder)stock=await tx.warehouseStock.create({data:{warehouseId:target.warehouseId,variantId:target.variantId,onHand:0}});if(!stock)throw new BadRequestException(`Depoda stok kaydı yok: ${row.variant.sku}`);const available=Number(stock.onHand)-Number(stock.reserved)-Number(stock.committed)-Number(stock.damaged)-Number(stock.safetyStock);if(!target.inventory.allowBackorder&&available<qty)throw new BadRequestException(`Yetersiz stok: ${row.variant.product.title}`);await tx.warehouseStock.update({where:{id:stock.id},data:reservationStatus==='COMMITTED'?{committed:{increment:qty}}:{reserved:{increment:qty}}});await tx.inventoryReservation.create({data:{storeId,orderId:id,orderItemId:created[i].id,variantId:target.variantId,warehouseId:target.warehouseId,quantity:qty,status:reservationStatus,expiresAt:reservationStatus==='HELD'?new Date(Date.now()+reservationMinutes*60*1000):null,metadata:{source:'order_edit'}}});}}}
      const {subtotal,discountTotal,taxTotal,grandTotal}=financials;

      const paidGross=this.posMoney(order.paymentTransactions.filter((x:any)=>x.status==='SUCCEEDED'&&['SALE','CAPTURE'].includes(String(x.type))).reduce((n:number,x:any)=>n+Number(x.amount||0),0));const refundedGross=this.posMoney(order.paymentTransactions.filter((x:any)=>x.status==='SUCCEEDED'&&x.type==='REFUND').reduce((n:number,x:any)=>n+Number(x.amount||0),0));const paidNet=this.posMoney(Math.max(0,paidGross-refundedGross));const amountDue=this.posMoney(Math.max(0,grandTotal-paidNet));const refundDue=this.posMoney(Math.max(0,paidNet-grandTotal));const current:any=order.metadata||{};const revision=Number(current?.orderEditAdjustment?.revision||0)+1;const adjustment={revision,previousTotal:Number(order.grandTotal||0),newTotal:grandTotal,paidNet,amountDue,refundDue,status:amountDue>0?'PAYMENT_DUE':refundDue>0?'REFUND_DUE':'SETTLED',editedBy:userId||null,editedAt:new Date().toISOString()};
      if(amountDue>0)await tx.paymentAttempt.upsert({where:{storeId_idempotencyKey:{storeId,idempotencyKey:`order-edit:${id}:${revision}:charge`}},create:{storeId,orderId:id,provider:'ORDER_EDIT_ADJUSTMENT',amount:amountDue,currency:order.currency,status:'REQUIRES_ACTION',idempotencyKey:`order-edit:${id}:${revision}:charge`,raw:{revision,previousTotal:Number(order.grandTotal||0),newTotal:grandTotal}},update:{amount:amountDue,status:'REQUIRES_ACTION'}});
      const nextPayment=paidNet>0&&amountDue<=0?'PAID':amountDue>0?'PENDING':order.paymentStatus;const nextStatus=nextPayment==='PAID'?(order.status==='PENDING_PAYMENT'?'PROCESSING':order.status):order.status==='PROCESSING'?'PENDING_PAYMENT':order.status;
      await tx.order.update({where:{id},data:{subtotal,discountTotal,taxTotal,grandTotal,paymentStatus:nextPayment,status:nextStatus,metadata:{...current,orderEditAdjustment:adjustment,orderEditTax:{pricesIncludeTax:financials.pricesIncludeTax,defaultTaxRate:financials.defaultTaxRate,taxCountry:financials.taxCountry,taxSubdivision:financials.taxSubdivision,shippingTax:financials.shippingTax,paymentFeeTax:financials.paymentFeeTax,recalculatedAt:new Date().toISOString()}}}});await tx.orderStatusHistory.create({data:{orderId:id,status:'ITEMS_EDITED',note:`Toplam ${this.posMoney(order.grandTotal)} → ${grandTotal}; tahsil ${amountDue}; iade ${refundDue}`}});
      return tx.order.findFirst({where:{id,storeId},include:{items:{include:{variant:{include:{product:true}}}},inventoryReservations:true,paymentAttempts:true,paymentTransactions:true}});
    },{isolationLevel:'Serializable'} as any);
  }

  async settleOrderEditAdjustment(tenantId:string,storeId:string,id:string,b:any,userId?:string){
    await this.assertStore(tenantId,storeId);const scope=await this.warehouseScope(tenantId,userId,'fulfill');
    return this.prisma.$transaction(async tx=>{const order:any=await tx.order.findFirst({where:{id,storeId},include:{inventoryReservations:true,paymentTransactions:true,refunds:true}});if(!order)throw new NotFoundException('Order not found');if(scope&&order.inventoryReservations.some((x:any)=>['HELD','COMMITTED'].includes(String(x.status))&&!scope.includes(String(x.warehouseId))))throw new ForbiddenException('Sipariş atanmış depolarınızın dışında');const meta:any=order.metadata||{};const adj:any=meta.orderEditAdjustment||{};const revision=Number(adj.revision||0);if(!revision||adj.status==='SETTLED')return order;const amountDue=this.posMoney(adj.amountDue||0),refundDue=this.posMoney(adj.refundDue||0);
      if(amountDue>0){if(b?.paymentConfirmed!==true)throw new BadRequestException('Ödeme farkı tahsilat onayı gerekli');const key=`order-edit:${id}:${revision}:capture`;await tx.paymentTransaction.upsert({where:{storeId_idempotencyKey:{storeId,idempotencyKey:key}},create:{storeId,orderId:id,type:'CAPTURE',status:'SUCCEEDED',amount:amountDue,currency:order.currency,providerTransactionId:b?.providerReference?String(b.providerReference):`manual-edit-${id}-${revision}`,idempotencyKey:key,raw:{manual:true,editedBy:userId||null}},update:{status:'SUCCEEDED',providerTransactionId:b?.providerReference?String(b.providerReference):undefined}});await tx.paymentAttempt.updateMany({where:{storeId,orderId:id,idempotencyKey:`order-edit:${id}:${revision}:charge`,status:{in:['CREATED','REQUIRES_ACTION','PROCESSING','UNKNOWN']}},data:{status:'SUCCEEDED',providerReference:b?.providerReference?String(b.providerReference):'MANUAL'}});}
      if(refundDue>0){if(b?.refundConfirmed!==true)throw new BadRequestException('İade farkı onayı gerekli');const key=`order-edit:${id}:${revision}:refund`;let refund:any=await tx.refund.findUnique({where:{storeId_idempotencyKey:{storeId,idempotencyKey:key}}});if(!refund){refund=await tx.refund.create({data:{storeId,orderId:id,status:'SUCCEEDED',amount:refundDue,currency:order.currency,reason:'ORDER_EDIT_DIFFERENCE',idempotencyKey:key,metadata:{revision,manual:true,editedBy:userId||null}}});await tx.refundTransaction.create({data:{refundId:refund.id,status:'SUCCEEDED',providerReference:b?.refundReference?String(b.refundReference):'MANUAL_ORDER_EDIT',raw:{orderEdit:true,revision}}});await tx.paymentTransaction.create({data:{storeId,orderId:id,type:'REFUND',status:'SUCCEEDED',amount:refundDue,currency:order.currency,providerTransactionId:b?.refundReference?String(b.refundReference):`manual-edit-refund-${id}-${revision}`,idempotencyKey:`${key}:payment`,raw:{orderEdit:true,revision}}});}}
      const nextMeta={...meta,orderEditAdjustment:{...adj,status:'SETTLED',settledBy:userId||null,settledAt:new Date().toISOString(),amountDue:0,refundDue:0}};const row=await tx.order.update({where:{id},data:{paymentStatus:'PAID',status:order.status==='PENDING_PAYMENT'?'PROCESSING':order.status,metadata:nextMeta}});await tx.orderStatusHistory.create({data:{orderId:id,status:'ORDER_EDIT_ADJUSTMENT_SETTLED',note:amountDue>0?`Ek tahsilat ${amountDue}`:`Fark iadesi ${refundDue}`}});return row;},{isolationLevel:'Serializable'} as any);
  }

  async commerceOrdersBulk(tenantId:string,b:any,userId?:string){const storeId=String(b?.storeId||'');await this.assertStore(tenantId,storeId);const ids:string[]=Array.from(new Set<string>((Array.isArray(b?.ids)?b.ids:[]).map((x:any)=>String(x)).filter((x:string)=>Boolean(x))));if(!ids.length)throw new BadRequestException('Sipariş seçilmedi');if(ids.length>200)throw new BadRequestException('Tek işlemde en fazla 200 sipariş');const action=String(b?.action||'').toUpperCase();let updated=0,failed:any[]=[];for(const id of ids){try{await this.commerceOrderAction(tenantId,storeId,id,{...b,action},userId);updated++;}catch(e:any){failed.push({id,message:e?.message||'İşlem başarısız'});}}return{updated,failed};}

  async commerceCustomers(tenantId:string,q:any){
    const storeId=String(q?.storeId||'');await this.assertStore(tenantId,storeId);
    const page=this.v5Int(q?.page,1,1,100000),limit=this.v5Int(q?.limit,25,10,100),search=String(q?.q||'').trim();
    const where:any={storeId,mergedIntoId:null};
    if(q?.groupId&&q.groupId!=='ALL')where.groupId=q.groupId==='NONE'?null:String(q.groupId);
    if(q?.status==='ACTIVE'){where.isActive=true;where.emailVerifiedAt={not:null};}if(q?.status==='PASSIVE'){where.isActive=false;where.emailVerifiedAt={not:null};}if(q?.status==='PENDING')where.emailVerifiedAt=null;
    if(q?.marketing==='YES')where.acceptsMarketing=true;if(q?.marketing==='NO')where.acceptsMarketing=false;
    if(search)where.OR=[{email:{contains:search,mode:'insensitive'}},{firstName:{contains:search,mode:'insensitive'}},{lastName:{contains:search,mode:'insensitive'}},{phone:{contains:search}}];
    const segment=String(q?.segment||'ALL').toUpperCase();
    if(segment!=='ALL'){
      let ids:string[]=[];
      if(segment==='REPEAT'){const r:any[]=await this.prisma.$queryRawUnsafe('SELECT "customerId" FROM "Order" WHERE "storeId"=$1 AND "customerId" IS NOT NULL GROUP BY "customerId" HAVING COUNT(*) >= 2',storeId);ids=r.map(x=>String(x.customerId));}
      else if(segment==='HIGH_VALUE'){const threshold=Math.max(0,Number(q?.segmentValue||10000));const r:any[]=await this.prisma.$queryRawUnsafe('SELECT "customerId" FROM "Order" WHERE "storeId"=$1 AND "customerId" IS NOT NULL GROUP BY "customerId" HAVING SUM("grandTotal") >= $2',storeId,threshold);ids=r.map(x=>String(x.customerId));}
      else if(segment==='INACTIVE_90'){const r:any[]=await this.prisma.$queryRawUnsafe(`SELECT c.id FROM "Customer" c LEFT JOIN "Order" o ON o."customerId"=c.id AND o."storeId"=$1 WHERE c."storeId"=$1 GROUP BY c.id HAVING MAX(o."createdAt") IS NULL OR MAX(o."createdAt") < NOW() - INTERVAL '90 days'`,storeId);ids=r.map(x=>String(x.id));}
      where.id={in:ids};
    }
    const [total,rows,active,marketing]=await this.prisma.$transaction([
      this.prisma.customer.count({where}),
      this.prisma.customer.findMany({where,skip:(page-1)*limit,take:limit,orderBy:{createdAt:'desc'},include:{group:true,loyaltyAccount:true,addresses:{orderBy:[{isDefault:'desc'},{createdAt:'desc'}]},_count:{select:{orders:true,returns:true}}}}),
      this.prisma.customer.count({where:{storeId,mergedIntoId:null,isActive:true}}),
      this.prisma.customer.count({where:{storeId,mergedIntoId:null,acceptsMarketing:true}})
    ]);
    const ids=rows.map((x:any)=>x.id);
    const aggregates:any[]=ids.length?await (this.prisma.order.groupBy as any)({by:['customerId'],where:{storeId,customerId:{in:ids}},_sum:{grandTotal:true},_max:{createdAt:true},_count:{_all:true}}):[];
    const byCustomer=new Map(aggregates.map((a:any)=>[a.customerId,a]));
    const items=rows.map((c:any)=>{const a:any=byCustomer.get(c.id);const orderCount=Number(a?._count?._all||0),totalSpent=Number(a?._sum?.grandTotal||0);return{...c,totalSpent,averageOrderValue:orderCount?totalSpent/orderCount:0,lastOrderAt:a?._max?.createdAt||null};});
    return{items,total,page,limit,pages:Math.max(1,Math.ceil(total/limit)),summary:{total:await this.prisma.customer.count({where:{storeId,mergedIntoId:null}}),active,marketing}};
  }

  async commerceCustomersImport(tenantId:string,b:any){
    const storeId=String(b?.storeId||'');await this.assertStore(tenantId,storeId);
    const rows=Array.isArray(b?.rows)?b.rows.slice(0,2000):[];if(!rows.length)throw new BadRequestException('İçe aktarılacak müşteri yok');
    let imported=0;const failed:any[]=[];
    for(let offset=0;offset<rows.length;offset+=50){const batch=rows.slice(offset,offset+50);const result=await Promise.all(batch.map(async(row:any,index:number)=>{try{const email=String(row?.email||'').trim().toLowerCase();if(!email)throw new Error('E-posta gerekli');await this.prisma.customer.upsert({where:{storeId_email:{storeId,email}},create:{storeId,email,firstName:row?.firstName||null,lastName:row?.lastName||null,phone:row?.phone||null,acceptsMarketing:!!row?.acceptsMarketing,isActive:row?.isActive!==false,tags:Array.isArray(row?.tags)?row.tags:[],customerType:String(row?.customerType||'PERSON'),companyName:row?.companyName||null,taxNumber:row?.taxNumber||null,taxOffice:row?.taxOffice||null},update:{firstName:row?.firstName||undefined,lastName:row?.lastName||undefined,phone:row?.phone||undefined,acceptsMarketing:row?.acceptsMarketing===undefined?undefined:!!row.acceptsMarketing,isActive:row?.isActive===undefined?undefined:row.isActive!==false,tags:Array.isArray(row?.tags)?row.tags:undefined,customerType:row?.customerType||undefined,companyName:row?.companyName||undefined,taxNumber:row?.taxNumber||undefined,taxOffice:row?.taxOffice||undefined}});return true}catch(e:any){failed.push({row:offset+index+2,message:e?.message||'İçe aktarma hatası'});return false}}));imported+=result.filter(Boolean).length;}
    return{imported,failed,total:rows.length};
  }

  async commerceCustomersBulk(tenantId:string,b:any){const storeId=String(b?.storeId||'');await this.assertStore(tenantId,storeId);const ids:string[]=Array.from(new Set<string>((Array.isArray(b?.ids)?b.ids:[]).map((x:any)=>String(x)).filter((x:string)=>Boolean(x))));if(!ids.length)throw new BadRequestException('Müşteri seçilmedi');if(ids.length>500)throw new BadRequestException('Tek işlemde en fazla 500 müşteri');const action=String(b?.action||'').toUpperCase();if(action==='STATUS'){const r=await this.prisma.customer.updateMany({where:{storeId,id:{in:ids}},data:{isActive:b?.isActive!==false}});return{updated:r.count};}if(action==='GROUP'){const groupId=b?.groupId?String(b.groupId):null;if(groupId&&!await this.prisma.customerGroup.findFirst({where:{id:groupId,storeId}}))throw new BadRequestException('Grup mağazaya ait değil');const r=await this.prisma.customer.updateMany({where:{storeId,id:{in:ids}},data:{groupId}});return{updated:r.count};}if(action==='TAG_ADD'||action==='TAG_REMOVE'){const tag=String(b?.tag||'').trim();if(!tag)throw new BadRequestException('Etiket gerekli');const rows=await this.prisma.customer.findMany({where:{storeId,id:{in:ids}},select:{id:true,tags:true}});for(const row of rows){const tags=action==='TAG_ADD'?Array.from(new Set([...(row.tags||[]),tag])):(row.tags||[]).filter(x=>x!==tag);await this.prisma.customer.update({where:{id:row.id},data:{tags}});}return{updated:rows.length};}throw new BadRequestException('Desteklenmeyen toplu işlem');}

  async customerAddressCreate(tenantId:string,storeId:string,customerId:string,b:any){await this.assertStore(tenantId,storeId);const c=await this.prisma.customer.findFirst({where:{id:customerId,storeId},select:{id:true}});if(!c)throw new NotFoundException();if(b?.isDefault)await this.prisma.customerAddress.updateMany({where:{customerId},data:{isDefault:false}});return this.prisma.customerAddress.create({data:{customerId,title:b.title||null,firstName:String(b.firstName||''),lastName:String(b.lastName||''),phone:b.phone||null,company:b.company||null,address1:String(b.address1||''),address2:b.address2||null,district:b.district||null,city:String(b.city||''),state:b.state||null,postalCode:b.postalCode||null,country:String(b.country||'TR'),isDefault:!!b.isDefault}});}
  async customerAddressUpdate(tenantId:string,storeId:string,customerId:string,addressId:string,b:any){await this.assertStore(tenantId,storeId);const row=await this.prisma.customerAddress.findFirst({where:{id:addressId,customerId,customer:{storeId}}});if(!row)throw new NotFoundException();if(b?.isDefault)await this.prisma.customerAddress.updateMany({where:{customerId,id:{not:addressId}},data:{isDefault:false}});const data:any={};for(const k of ['title','firstName','lastName','phone','company','address1','address2','district','city','state','postalCode','country','isDefault'])if(b[k]!==undefined)data[k]=b[k];return this.prisma.customerAddress.update({where:{id:addressId},data});}
  async customerAddressDelete(tenantId:string,storeId:string,customerId:string,addressId:string){await this.assertStore(tenantId,storeId);const r=await this.prisma.customerAddress.deleteMany({where:{id:addressId,customerId,customer:{storeId}}});if(!r.count)throw new NotFoundException();return{deleted:true};}
  async customerMerge(tenantId:string,storeId:string,sourceId:string,b:any){
    await this.assertStore(tenantId,storeId);const targetEmail=String(b?.targetEmail||'').trim().toLowerCase();const targetId=String(b?.targetCustomerId||'').trim();
    const [source,target]=await Promise.all([this.prisma.customer.findFirst({where:{id:sourceId,storeId,mergedIntoId:null}}),this.prisma.customer.findFirst({where:{storeId,mergedIntoId:null,...(targetId?{id:targetId}:{email:targetEmail})}})]);
    if(!source)throw new NotFoundException('Kaynak müşteri bulunamadı');if(!target||target.id===source.id)throw new BadRequestException('Geçerli bir hedef müşteri seçin');
    return this.prisma.$transaction(async tx=>{
      await tx.order.updateMany({where:{storeId,customerId:source.id},data:{customerId:target.id}});await tx.returnRequest.updateMany({where:{storeId,customerId:source.id},data:{customerId:target.id}});await tx.customerAddress.updateMany({where:{customerId:source.id},data:{customerId:target.id}});await tx.consentRecord.updateMany({where:{storeId,customerId:source.id},data:{customerId:target.id}});await tx.privacyRequest.updateMany({where:{storeId,customerId:source.id},data:{customerId:target.id}});await tx.review.updateMany({where:{storeId,customerId:source.id},data:{customerId:target.id}});await tx.blogComment.updateMany({where:{storeId,customerId:source.id},data:{customerId:target.id}});await tx.cart.updateMany({where:{storeId,customerId:source.id},data:{customerId:target.id}});
      const [sa,ta]=await Promise.all([tx.loyaltyAccount.findUnique({where:{customerId:source.id}}),tx.loyaltyAccount.findUnique({where:{customerId:target.id}})]);if(sa){if(ta){await tx.loyaltyTransaction.updateMany({where:{accountId:sa.id},data:{accountId:ta.id}});await tx.loyaltyAccount.update({where:{id:ta.id},data:{points:{increment:sa.points},lifetimePoints:{increment:sa.lifetimePoints}}});await tx.loyaltyAccount.delete({where:{id:sa.id}});}else await tx.loyaltyAccount.update({where:{id:sa.id},data:{customerId:target.id}});}
      const sourceMeta:any=source.metadata||{},targetMeta:any=target.metadata||{};const notes=[...(Array.isArray(targetMeta.adminNotes)?targetMeta.adminNotes:[]),...(Array.isArray(sourceMeta.adminNotes)?sourceMeta.adminNotes:[])].slice(-200);await tx.customer.update({where:{id:target.id},data:{tags:Array.from(new Set([...(target.tags||[]),...(source.tags||[])])),acceptsMarketing:target.acceptsMarketing||source.acceptsMarketing,phone:target.phone||source.phone,companyName:target.companyName||source.companyName,taxNumber:target.taxNumber||source.taxNumber,taxOffice:target.taxOffice||source.taxOffice,metadata:{...targetMeta,adminNotes:notes,mergedCustomerIds:Array.from(new Set([...(Array.isArray(targetMeta.mergedCustomerIds)?targetMeta.mergedCustomerIds:[]),source.id]))}}});await tx.customer.update({where:{id:source.id},data:{isActive:false,mergedIntoId:target.id,mergedAt:new Date(),metadata:{...sourceMeta,mergedIntoId:target.id}}});await tx.auditLog.create({data:{tenantId,action:'CUSTOMER_MERGE',resource:'Customer',resourceId:target.id,method:'POST',path:'/admin/customers/:id/merge',statusCode:200,metadata:{sourceId:source.id,targetId:target.id}}});return{merged:true,sourceId:source.id,targetId:target.id};
    });
  }

  async customerNote(tenantId:string,storeId:string,customerId:string,b:any){await this.assertStore(tenantId,storeId);const c:any=await this.prisma.customer.findFirst({where:{id:customerId,storeId}});if(!c)throw new NotFoundException();const text=String(b?.note||'').trim();if(!text)throw new BadRequestException('Not gerekli');const meta:any=c.metadata||{};const notes=Array.isArray(meta.adminNotes)?meta.adminNotes.slice(-99):[];notes.push({id:`n_${Date.now()}`,text,createdAt:new Date().toISOString()});return this.prisma.customer.update({where:{id:customerId},data:{metadata:{...meta,adminNotes:notes}}});}


  async inventoryLedger(tenantId:string,storeId:string,q:any={}){
    await this.assertStore(tenantId,storeId);
    const page=this.v5Int(q?.page,1,1,100000),limit=this.v5Int(q?.limit,50,10,200);
    const where:any={storeId};
    if(q?.warehouseId)where.warehouseId=String(q.warehouseId);
    if(q?.variantId)where.variantId=String(q.variantId);
    if(q?.movementType&&q.movementType!=='ALL')where.movementType=String(q.movementType);
    const from=this.v5Date(q?.from),to=this.v5Date(q?.to);if(from||to)where.createdAt={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
    const [total,items]=await this.prisma.$transaction([
      this.prisma.inventoryLedgerEntry.count({where}),
      this.prisma.inventoryLedgerEntry.findMany({where,orderBy:{createdAt:'desc'},skip:(page-1)*limit,take:limit})
    ]);
    const warehouseIds=[...new Set(items.map((x:any)=>String(x.warehouseId)))],variantIds=[...new Set(items.map((x:any)=>String(x.variantId)))];
    const [warehouses,variants]=await Promise.all([
      warehouseIds.length?this.prisma.warehouse.findMany({where:{storeId,id:{in:warehouseIds}},select:{id:true,name:true,code:true}}):[],
      variantIds.length?this.prisma.variant.findMany({where:{id:{in:variantIds},product:{storeId}},select:{id:true,sku:true,title:true,product:{select:{title:true}}}}):[]
    ]);
    const wm=new Map(warehouses.map((x:any)=>[x.id,x])),vm=new Map(variants.map((x:any)=>[x.id,x]));
    return{items:items.map((x:any)=>({...x,warehouse:wm.get(x.warehouseId)||null,variant:vm.get(x.variantId)||null})),total,page,limit,pages:Math.max(1,Math.ceil(total/limit))};
  }

  async operationsReleaseExpiredReservations(tenantId:string,storeId:string,userId?:string){
    await this.assertStore(tenantId,storeId);
    const scope=await this.warehouseScope(tenantId,String(userId||''),'stock');
    if(scope){const released=await releaseExpiredInventoryReservations(this.prisma,{storeId,warehouseIds:scope});return{ok:true,released,scope:'assigned',warehouses:scope.length};}
    const released=await releaseExpiredInventoryReservations(this.prisma,{storeId});return{ok:true,released,scope:'store'};
  }

  async operationsRetryDelivery(tenantId:string,storeId:string,id:string){
    await this.assertStore(tenantId,storeId);
    const row=await this.prisma.eventDelivery.findFirst({where:{id,outbox:{tenantId}},include:{outbox:{select:{id:true,event:true,status:true}}}});if(!row)throw new NotFoundException('Webhook delivery not found');
    if(!['DEAD','RETRY','CANCELLED'].includes(String(row.status)))throw new BadRequestException('Only failed webhook deliveries can be retried');
    await this.prisma.$transaction(async tx=>{await tx.eventDelivery.update({where:{id},data:{status:'RETRY',nextAttemptAt:new Date(),lockUntil:null,lastError:null}});await tx.eventOutbox.update({where:{id:row.outboxId},data:{status:'PROCESSING',processedAt:null}})});
    return{ok:true,id,event:row.outbox.event};
  }

  async operationsReconcilePayment(tenantId:string,storeId:string,id:string,userId?:string){
    await this.assertStore(tenantId,storeId);
    return this.prisma.$transaction(async tx=>{
      const attempt:any=await tx.paymentAttempt.findFirst({where:{id,storeId},include:{order:{include:{paymentTransactions:true}}}});if(!attempt)throw new NotFoundException('Payment attempt not found');
      const order=attempt.order;const succeeded=(order?.paymentTransactions||[]).filter((x:any)=>x.status==='SUCCEEDED'&&['SALE','CAPTURE'].includes(String(x.type)));
      const paid=succeeded.reduce((n:number,x:any)=>n+Number(x.amount||0),0);const refunded=(order?.paymentTransactions||[]).filter((x:any)=>x.status==='SUCCEEDED'&&String(x.type)==='REFUND').reduce((n:number,x:any)=>n+Number(x.amount||0),0);const net=Math.max(0,paid-refunded);const expected=Number(order?.grandTotal||attempt.amount||0);
      if(net+0.0001<expected)return{ok:true,reconciled:false,status:'REVIEW_REQUIRED',expected,netPaid:net,reason:'No authoritative successful local payment transaction covers the order total'};
      if(attempt.status!=='SUCCEEDED'){if(!canTransition(PAYMENT_ATTEMPT_TRANSITIONS,attempt.status,'SUCCEEDED'))throw new BadRequestException(`Ödeme denemesi uzlaştırmaya uygun değil: ${attempt.status}`);await tx.paymentAttempt.update({where:{id},data:{status:'SUCCEEDED',raw:{...((attempt.raw as any)||{}),reconciledAt:new Date().toISOString(),reconciledBy:userId||null,reconcileSource:'PAYMENT_TRANSACTION_LEDGER'}}});}
      if(order&&order.paymentStatus!=='PAID'){await tx.order.update({where:{id:order.id},data:{paymentStatus:'PAID',status:order.status==='PENDING_PAYMENT'?'PROCESSING':order.status}});await tx.orderStatusHistory.create({data:{orderId:order.id,status:'PAYMENT_RECONCILED',note:'Payment state reconciled from successful payment transactions'}});}
      return{ok:true,reconciled:true,status:'SUCCEEDED',expected,netPaid:net,orderId:order?.id};
    },{isolationLevel:'Serializable'} as any);
  }

  async marketResolutionPreview(tenantId:string,storeId:string,q:any={}){
    const store:any=await this.assertStore(tenantId,storeId);let companyPriceListId:string|null=null;
    if(q?.customerId){const buyer:any=await this.prisma.b2BBuyer.findFirst({where:{customerId:String(q.customerId),company:{storeId,status:'ACTIVE'}},include:{company:true}});companyPriceListId=buyer?.company?.defaultPriceListId||null;}
    const [markets,lists]=await Promise.all([this.prisma.commerceMarket.findMany({where:{storeId,active:true},orderBy:{createdAt:'asc'}}),this.prisma.priceList.findMany({where:{storeId,active:true},orderBy:[{priority:'asc'},{createdAt:'asc'}]})]);
    return explainMarketResolution(markets as any,lists as any,{country:q?.country||store.defaultCountry,currency:q?.currency||store.currency,locale:q?.locale||store.locale,customerGroupId:q?.customerGroupId||null,companyPriceListId});
  }

  async globalSearch(tenantId:string,storeId:string,qRaw:string,allowed:string[]=['*']){
    await this.assertStore(tenantId,storeId);const q=String(qRaw||'').trim();if(q.length<2)return{q,items:[]};if(q.length>100)throw new BadRequestException('Search query is too long');
    const can=(p:string)=>allowed.includes('*')||allowed.includes(p);const jobs:Promise<any[]>[]=[];const kinds:string[]=[];
    if(can('orders.read')){const num=Number(q.replace(/\D/g,''));jobs.push(this.prisma.order.findMany({where:{storeId,OR:[...(Number.isFinite(num)&&num>0?[{number:num}]:[]),{customer:{OR:[{email:{contains:q,mode:'insensitive'}},{firstName:{contains:q,mode:'insensitive'}},{lastName:{contains:q,mode:'insensitive'}}]}},{items:{some:{OR:[{sku:{contains:q,mode:'insensitive'}},{title:{contains:q,mode:'insensitive'}}]}}}]},orderBy:{createdAt:'desc'},take:8,select:{id:true,number:true,status:true,grandTotal:true,currency:true,customer:{select:{firstName:true,lastName:true,email:true}}}}));kinds.push('order');}
    if(can('products.read')){jobs.push(this.prisma.product.findMany({where:{storeId,OR:[{title:{contains:q,mode:'insensitive'}},{slug:{contains:q,mode:'insensitive'}},{variants:{some:{OR:[{sku:{contains:q,mode:'insensitive'}},{barcode:{contains:q}}]}}}]},orderBy:{updatedAt:'desc'},take:8,select:{id:true,title:true,status:true,variants:{take:2,select:{sku:true,barcode:true}}}}));kinds.push('product');}
    if(can('customers.read')){jobs.push(this.prisma.customer.findMany({where:{storeId,mergedIntoId:null,OR:[{email:{contains:q,mode:'insensitive'}},{firstName:{contains:q,mode:'insensitive'}},{lastName:{contains:q,mode:'insensitive'}},{phone:{contains:q}}]},orderBy:{updatedAt:'desc'},take:8,select:{id:true,email:true,firstName:true,lastName:true,phone:true,isActive:true,_count:{select:{orders:true}}}}));kinds.push('customer');}
    if(can('content.read')){jobs.push(this.prisma.page.findMany({where:{storeId,OR:[{title:{contains:q,mode:'insensitive'}},{slug:{contains:q,mode:'insensitive'}}]},orderBy:{updatedAt:'desc'},take:8,select:{id:true,title:true,slug:true,status:true}}));kinds.push('page');}
    const rows=await Promise.all(jobs);const items:any[]=[];for(let i=0;i<rows.length;i++){const kind=kinds[i];for(const x of rows[i]){if(kind==='order')items.push({type:'Sipariş',title:`#${x.number}`,meta:`${[x.customer?.firstName,x.customer?.lastName].filter(Boolean).join(' ')||x.customer?.email||'Misafir'} · ${Number(x.grandTotal).toFixed(2)} ${x.currency} · ${x.status}`,href:`/orders/${x.id}`});else if(kind==='product')items.push({type:'Ürün',title:x.title,meta:`${x.variants?.[0]?.sku||'SKU yok'} · ${x.status}`,href:`/products/${x.id}/edit`});else if(kind==='customer')items.push({type:'Müşteri',title:[x.firstName,x.lastName].filter(Boolean).join(' ')||x.email,meta:`${x.email} · ${x._count?.orders||0} sipariş`,href:`/customers?id=${encodeURIComponent(x.id)}`});else if(kind==='page')items.push({type:'Sayfa',title:x.title,meta:`/${x.slug} · ${x.status}`,href:'/content/pages'});}}
    return{q,items:items.slice(0,24)};
  }

  async savedViews(tenantId:string,storeId:string,userId:string,resource?:string){await this.assertStore(tenantId,storeId);return this.prisma.savedAdminView.findMany({where:{storeId,userId,...(resource?{resource:String(resource)}:{})},orderBy:[{isDefault:'desc'},{updatedAt:'desc'}]});}
  async saveView(tenantId:string,storeId:string,userId:string,b:any){await this.assertStore(tenantId,storeId);const resource=String(b?.resource||'').trim(),name=String(b?.name||'').trim();if(!resource||!name)throw new BadRequestException('resource and name are required');if(name.length>80)throw new BadRequestException('View name is too long');if(b?.isDefault)await this.prisma.savedAdminView.updateMany({where:{storeId,userId,resource},data:{isDefault:false}});return this.prisma.savedAdminView.upsert({where:{storeId_userId_resource_name:{storeId,userId,resource,name}},create:{storeId,userId,resource,name,query:b?.query||{},columns:b?.columns||undefined,sort:b?.sort||undefined,isDefault:!!b?.isDefault},update:{query:b?.query||{},columns:b?.columns||undefined,sort:b?.sort||undefined,isDefault:!!b?.isDefault}});}
  async deleteSavedView(tenantId:string,storeId:string,userId:string,id:string){await this.assertStore(tenantId,storeId);const r=await this.prisma.savedAdminView.deleteMany({where:{id,storeId,userId}});if(!r.count)throw new NotFoundException('Saved view not found');return{deleted:true};}

}
