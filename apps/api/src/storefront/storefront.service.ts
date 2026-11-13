import {tenantRestriction} from '../common/subscription-restriction';
import {configuredPublicPath,configuredArticleUrl,configuredBlogCategoryUrl} from '../common/seo-url-configuration';
import { BadRequestException, ForbiddenException, GoneException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { evaluatePromotions } from './promotion-engine';
import { requestIp, securityHash } from '../common/security';
import { COUNTRY_CODES, LOCALES, SUBDIVISIONS } from '../common/reference-data';
import { CacheService } from '../cache/cache.service';
import {apiText} from '../i18n/api-i18n';
import {crossRatesFromTry,parseTcmbTryRates} from '../common/tcmb-rates';
import {EmailService} from '../email/email.service';
import {EDocumentService} from '../edoc-core/edoc.service';
import {releaseExpiredInventoryReservations,warehouseAvailable} from '../common/inventory-reservations';
import { eligiblePriceLists, resolveMarket } from '../common/market-resolution';
import { routeInventory, type RoutingPolicy } from '../common/fulfillment-routing';

@Injectable()
export class StorefrontService {
  private readonly checkoutStockAdmissionBatches=new Map<string,{timer:any;requests:any[]}>();
  private readonly checkoutStockReaperLastRun=new Map<string,number>();
  private readonly orderNumberBlocks=new Map<string,{next:number;end:number}>();
  private readonly orderNumberRefills=new Map<string,Promise<void>>();

  private readonly guestCartTtlMs=24*60*60*1000;
  constructor(private prisma: PrismaService, private jwt: JwtService, private cache: CacheService, private email: EmailService, private edoc: EDocumentService) {}
  private tokenHash(v: string) { return createHash('sha256').update(v).digest('hex'); }
  private async ensureSalesChannel(db:any,storeId:string,key:string,name:string,type:string){const existing=await db.salesChannel.findFirst({where:{storeId,OR:[{key},{type,name}]}});if(existing)return db.salesChannel.update({where:{id:existing.id},data:{key,isSystem:true}});return db.salesChannel.create({data:{storeId,key,name,type,isSystem:true,active:true}});}
  private async appEnabled(storeId:string,slug:string){return !!(await this.prisma.appInstallation.findFirst({where:{tenantId:storeId,enabled:true,status:'ACTIVE',app:{slug,isActive:true}},select:{id:true}}));}
  private async requireApp(storeId:string,slug:string,locale?:string){if(!(await this.appEnabled(storeId,slug)))throw new NotFoundException(apiText('app.inactive',locale));}
  private commentSettings(store:any){
    const cfg=(store?.settings as any)?.commentSettings||{};
    const norm=(v:any,d:any)=>({enabled:v?.enabled??d.enabled,autoApprove:v?.autoApprove??d.autoApprove,allowGuest:v?.allowGuest??d.allowGuest});
    return {productReviews:norm(cfg.productReviews,{enabled:true,autoApprove:false,allowGuest:true}),blogComments:norm(cfg.blogComments,{enabled:true,autoApprove:false,allowGuest:true})};
  }

  private themeState(store:any){const root:any=store?.settings&&typeof store.settings==='object'?store.settings:{};return root.themeState&&typeof root.themeState==='object'&&!Array.isArray(root.themeState)?root.themeState:null;}
  private localeCandidates(locale?:string,defaultLocale?:string){const out:string[]=[];for(const raw of [locale,locale?.split('-')[0],defaultLocale,defaultLocale?.split('-')[0]]){const v=String(raw||'').trim();if(v&&!out.includes(v))out.push(v)}return out;}
  private mergeThemeObject(base:any,override:any):any{if(Array.isArray(base)||Array.isArray(override))return override===undefined?base:override;if(base&&typeof base==='object'&&override&&typeof override==='object'){const out:any={...base};for(const [k,v] of Object.entries(override))out[k]=this.mergeThemeObject(out[k],v);return out}return override===undefined?base:override;}
  private localizeThemeNode(value:any,locale?:string,defaultLocale?:string):any{
    if(Array.isArray(value))return value.map(x=>this.localizeThemeNode(x,locale,defaultLocale));
    if(!value||typeof value!=='object')return value;
    const raw:any=value;const out:any={};for(const [k,v] of Object.entries(raw)){if(k==='_i18n')continue;out[k]=this.localizeThemeNode(v,locale,defaultLocale)}
    const map:any=raw._i18n&&typeof raw._i18n==='object'?raw._i18n:{};let localized:any={};for(const key of this.localeCandidates(locale,defaultLocale).reverse()){if(map[key]&&typeof map[key]==='object')localized=this.mergeThemeObject(localized,map[key])}
    if(!Object.keys(localized).length)return out;
    return this.mergeThemeObject(out,this.localizeThemeNode(localized,locale,defaultLocale));
  }
  private designSettings(store:any,locale?:string,themeConfig?:any){
    const state:any=this.themeState(store);
    const stateMatchesActive=!!state&&String(state?.themeSlug||'')===String(store?.activeTheme||'');
    const configDesign:any=themeConfig&&typeof themeConfig==='object'&&themeConfig.design&&typeof themeConfig.design==='object'?themeConfig.design:{};const packageStyles:any=themeConfig&&typeof themeConfig==='object'&&themeConfig.styles&&typeof themeConfig.styles==='object'&&!Array.isArray(themeConfig.styles)?themeConfig.styles:{};const baseRaw:any={...configDesign,themeStyles:Object.keys(packageStyles).length?packageStyles:(configDesign?.themeStyles||{})};
    const savedRaw:any=stateMatchesActive&&state?.design&&typeof state.design==='object'?state.design:{};
    const base:any=this.localizeThemeNode(baseRaw,locale,store?.locale);
    const saved:any=this.localizeThemeNode(savedRaw,locale,store?.locale);
    return this.mergeThemeObject(base,saved);
  }

  private maintenanceActive(store:any) {
    if (!store?.maintenanceMode) return false;
    const raw=(store.settings as any)?.maintenanceLaunchAt;
    if (!raw) return true;
    const at=new Date(raw).getTime();
    return Number.isNaN(at) || at > Date.now();
  }

  private normalizeStoreKey(input:string){
    const raw=String(input||'').trim().toLowerCase().replace(/^https?:\/\//,'').split('/')[0].replace(/:\d+$/,'').replace(/\.$/,'');
    if(raw.endsWith('.ticarti.com'))return raw.slice(0,-'.ticarti.com'.length).split('.')[0]||raw;
    return raw;
  }

  private async store(slug: string, allowMaintenance = false) {
    slug=this.normalizeStoreKey(slug);
    const cacheKey=`public:site:${slug}`;
    const cached=await this.cache.getJson<any>(cacheKey);
    if(cached){ if(this.maintenanceActive(cached) && !allowMaintenance) throw new BadRequestException('Store is in maintenance mode'); return cached; }
    const store = await this.prisma.tenant.findFirst({ where: { status: { in: ['TRIAL','ACTIVE'] }, OR: [{ publicSlug: slug }, { domain: slug }, { slug }] } });
    if (!store) throw new NotFoundException('Store not found');
    if (this.maintenanceActive(store) && !allowMaintenance) throw new BadRequestException('Store is in maintenance mode');
    await this.cache.setJson(cacheKey,store,120);
    return store;
  }


  async liveHeartbeat(slug:string,body:any,req:any){
    const store=await this.store(slug,true);
    const visitorId=String(body?.visitorId||'').trim().slice(0,120);
    if(!visitorId)throw new BadRequestException('visitorId required');
    const path=String(body?.path||'/').slice(0,500);
    const allowed=new Set(['BROWSING','CART','CHECKOUT']);
    const state=allowed.has(String(body?.state||''))?String(body.state):'BROWSING';
    const cartToken=String(body?.cartToken||'').trim().slice(0,160)||null;
    const geoHeader=(name:string)=>{const value=req?.headers?.[name];const raw=Array.isArray(value)?value[0]:value;try{return decodeURIComponent(String(raw||'').trim())}catch{return String(raw||'').trim()}};
    let city=String(body?.city||geoHeader('x-geo-city')||'').trim().slice(0,120)||null;
    let country=String(body?.country||geoHeader('x-geo-country')||geoHeader('cf-ipcountry')||'').trim().slice(0,12)||null;
    if(country==='XX')country=null;
    let customerId:string|null=null;
    if(cartToken){
      const cart=await this.prisma.cart.findFirst({where:{storeId:store.id,token:cartToken},select:{shippingAddress:true,billingAddress:true,customerId:true}});
      const addr:any=cart?.shippingAddress||cart?.billingAddress||{};
      city=city||String(addr?.city||'').trim().slice(0,120)||null;
      country=country||String(addr?.country||'').trim().slice(0,12)||null;
      customerId=cart?.customerId||null;
    }
    return this.prisma.liveVisitorSession.upsert({
      where:{storeId_visitorId:{storeId:store.id,visitorId}},
      create:{storeId:store.id,visitorId,path,state,city,country,cartToken,customerId,lastSeenAt:new Date()},
      update:{path,state,city,country,cartToken,customerId,lastSeenAt:new Date()},
      select:{id:true,lastSeenAt:true}
    });
  }

  referenceData(country?: string) {
    return { countries: COUNTRY_CODES, locales: LOCALES, subdivisions: country ? (SUBDIVISIONS[country.toUpperCase()] || []) : [] };
  }

  async publicGeoChildren(slug:string,parentId?:string,countryCode?:string,level?:any){
    await this.store(slug);
    const where:any={isActive:true};
    if(parentId)where.parentId=parentId;
    if(countryCode)where.countryCode=String(countryCode).toUpperCase();
    if(level)where.level=level;
    if(!parentId&&!countryCode&&!level)where.parentId=null;
    return this.prisma.geoNode.findMany({where,orderBy:[{sortOrder:'asc'},{name:'asc'}]});
  }

  private async maybeRefreshStoreCurrency(store:any){
    const settings:Record<string,any>=store?.settings&&typeof store.settings==='object'&&!Array.isArray(store.settings)?store.settings:{};
    const regional:Record<string,any>=settings.regional&&typeof settings.regional==='object'?settings.regional:{};
    const exchange:Record<string,any>=regional.exchange&&typeof regional.exchange==='object'?regional.exchange:{};
    if(!exchange.autoUpdate)return;
    const hours=Math.max(1,Number(exchange.intervalHours||6));const last=exchange.lastUpdatedAt?new Date(exchange.lastUpdatedAt).getTime():0;if(last&&Date.now()-last<hours*3600000)return;
    const rows=await this.prisma.storeCurrency.findMany({where:{storeId:store.id,isEnabled:true}});const base=String(store.currency||'TRY').toUpperCase();const targets=rows.map(x=>x.code).filter(x=>x!==base);const rates:Record<string,number>={[base]:1};const source=String(exchange.source||'TCMB').toUpperCase()==='FRANKFURTER'?'FRANKFURTER':'TCMB';
    try{
      if(targets.length&&source==='FRANKFURTER'){
        const res=await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(targets.join(','))}`,{signal:AbortSignal.timeout(8_000)});const json=await res.json() as {rates?:Record<string,number>};if(!res.ok||!json?.rates)throw new Error('Kur servisi yanıt vermedi');for(const code of targets){const rate=Number(json.rates[code]);if(!(rate>0))throw new Error(`${code} kuru eksik`);rates[code]=rate;}
      }else if(targets.length){
        const res=await fetch('https://www.tcmb.gov.tr/kurlar/today.xml',{signal:AbortSignal.timeout(8_000),headers:{accept:'application/xml,text/xml;q=0.9,*/*;q=0.1','user-agent':'Ticarti-FX/1.0'}});const xml=await res.text();if(!res.ok)throw new Error(`TCMB HTTP ${res.status}`);Object.assign(rates,crossRatesFromTry(parseTcmbTryRates(xml),base,targets));
      }
      await this.prisma.$transaction(async tx=>{for(const row of rows){if(regional.currencyMeta?.[row.code]?.pinned)continue;const rate=row.code===base?1:Number(rates[row.code]);if(!(rate>0))throw new Error(`${row.code} kuru doğrulanamadı`);await tx.storeCurrency.update({where:{id:row.id},data:{exchangeRate:rate}});}await tx.tenant.update({where:{id:store.id},data:{settings:{...settings,regional:{...regional,exchange:{...exchange,source,lastUpdatedAt:new Date().toISOString(),lastError:null}}}}});});
    }catch(e:unknown){const message=e instanceof Error?e.message:'FX update failed';await this.prisma.tenant.update({where:{id:store.id},data:{settings:{...settings,regional:{...regional,exchange:{...exchange,source,lastAttemptAt:new Date().toISOString(),lastError:message.slice(0,300)}}}}}).catch(()=>undefined);}
  }

  private async currencyInfo(store: any, requested?: string | null, db:any=this.prisma) {
    const [rows,fixedApp,rateRow] = await Promise.all([
      db.storeCurrency.findMany({ where: { storeId: store.id, isEnabled: true } }),
      db.appInstallation.findFirst({where:{tenantId:store.id,enabled:true,status:'ACTIVE',app:{slug:'fixed-currency-prices'}},select:{id:true}}),
      ((db as any).platformSetting?.findUnique
        ? (db as any).platformSetting.findUnique({where:{key:'market_rates'}}).catch(()=>null)
        : Promise.resolve(null)),
    ]);
    const code = String(requested || store.currency).toUpperCase();
    const row = rows.find((x:any) => x.code === code) || rows.find((x:any) => x.isDefault) || rows.find((x:any) => x.code === store.currency);
    const market:any=rateRow?.value&&typeof rateRow.value==='object'?rateRow.value:{};const central=Array.isArray(market.rates)?market.rates:[];const values=new Map<string,number>(central.map((x:any)=>[String(x.code||'').toUpperCase(),Number(x.valueInTry||0)]));values.set('TRY',1);
    const base=String(store.currency||'TRY').toUpperCase();const selected=String(row?.code||base).toUpperCase();const baseTry=Number(values.get(base)||0);const selectedTry=Number(values.get(selected)||0);const centralRate=baseTry>0&&selectedTry>0?baseTry/selectedTry:0;
    const meta:any=(store.settings as any)?.regional?.currencyMeta||{};
    const preferredRate=(target:string,fallback:number)=>{
      if(target===base)return 1;
      const record=rows.find((x:any)=>String(x.code).toUpperCase()===target);
      const pinned=!!meta[target]?.pinned;
      const marketRate=baseTry>0&&Number(values.get(target)||0)>0?baseTry/Number(values.get(target)):0;
      const result=pinned?Number(record?.exchangeRate):marketRate>0?marketRate:fallback;
      if(!(result>0)||!Number.isFinite(result))throw new BadRequestException(`Missing exchange rate for ${target}`);
      return result;
    };
    const rate=preferredRate(selected,Number(row?.exchangeRate||0));
    return { code: selected, rate, rounding: row?.rounding ?? 2, baseCurrency:base, available: rows.map((x:any) => ({ code:x.code, rate:preferredRate(String(x.code).toUpperCase(),Number(x.exchangeRate)), isDefault:x.isDefault })), fixedPricing:!!fixedApp };
  }
  private money(v: any, rate: number, rounding=2) { const factor = 10 ** rounding; return Math.round(Number(v || 0) * rate * factor) / factor; }
  // StoreCurrency rates express one store-base unit in the selected currency.
  // Variant.price is always persisted in Variant.priceCurrency, never rewritten by FX jobs.
  private variantRate(variant:any,ci:any):number{
    const source=String(variant?.priceCurrency||ci?.baseCurrency||'').toUpperCase();
    const target=String(ci?.code||'').toUpperCase();
    if(source===target)return 1;
    const rows=Array.isArray(ci?.available)?ci.available:[];
    const base=String(ci?.baseCurrency||'').toUpperCase();
    const sourceRate=source===base?1:Number(rows.find((r:any)=>r.code===source)?.rate);
    const targetRate=target===base?1:Number(rows.find((r:any)=>r.code===target)?.rate);
    if(!(sourceRate>0&&targetRate>0&&Number.isFinite(sourceRate)&&Number.isFinite(targetRate)))
      throw new BadRequestException(`Missing exchange rate: ${source} to ${target}`);
    return targetRate/sourceRate;
  }
  private variantMoney(v:any,variant:any,ci:any){return this.money(v,this.variantRate(variant,ci),ci.rounding);}
  private productRulePrice(product:any,variant:any,customerGroupId?:string|null,customerGroupDiscountPercent=0){
    const pricing:any=(product?.metadata as any)?.pricing||{};const rules:any[]=Array.isArray(pricing.groupPrices)?pricing.groupPrices:Array.isArray(pricing.discountPrices)?pricing.discountPrices:Array.isArray(pricing.discounts)?pricing.discounts:[];const now=Date.now();const base=Number(variant?.price||0);let best=base,matched=false;
    for(const rule of rules){const price=Number(rule?.priceEx??rule?.price);if(!(price>=0))continue;const group=String(rule?.customerGroupId||'');if(!group||group!==String(customerGroupId||''))continue;const start=rule?.startsAt?new Date(rule.startsAt).getTime():0;const end=rule?.endsAt?new Date(rule.endsAt).getTime():0;if(start&&start>now)continue;if(end&&end<now)continue;matched=true;if(price<best)best=price;}
    if(matched)return best;const pct=Math.max(0,Math.min(100,Number(customerGroupDiscountPercent||0)));return pct>0?base*(1-pct/100):base;
  }
  private displayVariantPrice(product:any,variant:any,ci:any,customerGroupId?:string|null,customerGroupDiscountPercent=0){
    const fixed=ci?.fixedPricing?Number((product?.metadata as any)?.pricing?.fixedCurrencyPrices?.[ci.code]?.[String(variant?.sku||'')]||0):0;
    if(fixed>0)return fixed;return this.variantMoney(this.productRulePrice(product,variant,customerGroupId,customerGroupDiscountPercent),variant,ci);
  }
  private async customerGroupDiscount(db:any,storeId:string,customerGroupId?:string|null){if(!customerGroupId)return 0;const row=await db.customerGroup.findFirst({where:{id:String(customerGroupId),storeId},select:{discountPercent:true}});return Math.max(0,Math.min(100,Number(row?.discountPercent||0)));}
  private async translateMany(storeId:string, entityType:string, items:any[], locale?:string, defaultLocale?:string) {
    if (!locale || !items.length) return items;
    const requested=String(locale).toLowerCase().split(/[-_]/)[0];
    if(requested===String(defaultLocale||'').toLowerCase().split(/[-_]/)[0])return items;
    const rows = await this.prisma.contentTranslation.findMany({ where: { storeId, entityType, entityId: { in: items.map((x:any)=>x.id) } } });
    const matches=rows.filter((r:any)=>String(r.locale||'').toLowerCase().split(/[-_]/)[0]===requested);
    const map = new Map(matches.map((r:any)=>[r.entityId, r.fields as any]));
    return items.map((x:any)=>({ ...x, ...(map.get(x.id)||{}) }));
  }
  private productPublicationAnd(now=new Date()){return [{OR:[{publishedAt:null},{publishedAt:{lte:now}}]},{OR:[{unpublishedAt:null},{unpublishedAt:{gt:now}}]},{salesChannels:{some:{published:true,salesChannel:{key:'storefront',active:true}}}}];}
  private productCommerce(p:any){const variants:any[]=p?.variants||[];const prices=variants.map(v=>Number(v.price||0)).filter(Number.isFinite);const available=variants.some(v=>v?.inventory?.trackStock===false||Number(v?.inventory?.available||0)>0||v?.inventory?.allowBackorder||v?.preorderEnabled);return{requiresShipping:p?.requiresShipping!==false,isDigital:!!p?.isDigital,ageRestricted:!!p?.ageRestricted,publishedAt:p?.publishedAt||null,unpublishedAt:p?.unpublishedAt||null,googleProductCategory:p?.googleProductCategory||null,priceRange:{min:prices.length?Math.min(...prices):0,max:prices.length?Math.max(...prices):0},available,hasPreorder:variants.some(v=>!!v?.preorderEnabled)};}

  private presentProduct(p: any, ci: any) {
    const variants=(p.variants||[]).map((v:any)=>{
      const selectedOptions:Record<string,string>={};
      for(const link of v.optionValues||[]){const option=link?.optionValue?.option;const value=link?.optionValue;if(option?.name&&value?.name)selectedOptions[String(option.name)]=String(value.name)}
      const stocks=v.warehouseStocks||[];const totals={onHand:stocks.reduce((a:number,x:any)=>a+Number(x.onHand||0),0),reserved:stocks.reduce((a:number,x:any)=>a+Number(x.reserved||0),0),committed:stocks.reduce((a:number,x:any)=>a+Number(x.committed||0),0),incoming:stocks.reduce((a:number,x:any)=>a+Number(x.incoming||0),0),damaged:stocks.reduce((a:number,x:any)=>a+Number(x.damaged||0),0),safetyStock:stocks.reduce((a:number,x:any)=>a+Number(x.safetyStock||0),0)};return {...v,inventory:{...(v.inventory||{}),...totals,available:totals.onHand-totals.reserved-totals.committed-totals.damaged-totals.safetyStock},selectedOptions,mediaIds:(v.media||[]).slice().sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)).map((m:any)=>m.imageId||m.image?.id).filter(Boolean),sellingPlans:(v.sellingPlans||[]).map((x:any)=>x.sellingPlan).filter((x:any)=>x?.isActive!==false),basePrice:Number(v.price),price:this.displayVariantPrice(p,v,ci),priceCurrency:String(v.priceCurrency||ci.baseCurrency),comparePrice:v.comparePrice==null?null:this.variantMoney(v.comparePrice,v,ci)};
    });
    return {...p,displayCurrency:ci.code,variants,commerce:this.productCommerce({...p,variants})};
  }

  private setConfig(product:any){const set:any=(product?.metadata as any)?.set||{};const items=Array.isArray(set.items)?set.items.filter((x:any)=>x?.variantId&&Number(x.quantity)>0).map((x:any)=>({variantId:String(x.variantId),quantity:Math.max(1,Number(x.quantity||1))})):[];return{stockMode:set.stockMode==='COMPONENTS'?'COMPONENTS':'SELF',items};}
  private async ensureDefaultWarehouse(db:any,storeId:string){
    let row=await db.warehouse.findFirst({where:{storeId,isDefault:true,isActive:true},orderBy:{priority:'asc'}});
    if(!row)row=await db.warehouse.findFirst({where:{storeId,isActive:true},orderBy:[{priority:'asc'},{createdAt:'asc'}]});
    if(!row)row=await db.warehouse.create({data:{storeId,name:'Ana Depo',code:'MAIN',isDefault:true,isActive:true,priority:0}});
    return row;
  }
  private warehouseDistanceHint(address:any,destination:any){
    const a=address&&typeof address==='object'?address:{},d=destination&&typeof destination==='object'?destination:{};
    const norm=(v:any)=>String(v||'').trim().toLocaleLowerCase('tr-TR');
    if(!Object.keys(d).length)return undefined;
    const alat=Number(a.lat??a.latitude),alon=Number(a.lng??a.lon??a.longitude),dlat=Number(d.lat??d.latitude),dlon=Number(d.lng??d.lon??d.longitude);
    if([alat,alon,dlat,dlon].every(Number.isFinite)){const rad=(v:number)=>v*Math.PI/180;const x=rad(dlat-alat),y=rad(dlon-alon);const h=Math.sin(x/2)**2+Math.cos(rad(alat))*Math.cos(rad(dlat))*Math.sin(y/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
    if(norm(a.postalCode)&&norm(a.postalCode)===norm(d.postalCode))return 0;
    if(norm(a.district)&&norm(a.district)===norm(d.district)&&norm(a.city)===norm(d.city))return 5;
    if(norm(a.city)&&norm(a.city)===norm(d.city))return 20;
    if(norm(a.country)&&norm(a.country)===norm(d.country))return 250;
    return 5000;
  }
  private async allocateVariantStock(db:any,storeId:string,variant:any,quantity:number,destination?:any){
    let full=variant;if(!full?.inventory||!full?.product)full=await db.variant.findFirst({where:{id:variant?.id||variant,product:{storeId}},include:{inventory:true,product:true}});if(!full)return[];const stockPolicy=full.inventory;if(!stockPolicy?.trackStock)return[{variant:full,variantId:full.id,quantity,inventory:stockPolicy,warehouseId:null,warehouseStock:null}];await releaseExpiredInventoryReservations(db,{storeId,variantId:full.id});
    const store=await db.tenant.findUnique({where:{id:storeId},select:{settings:true}});const cfg:any=(store?.settings as any)?.inventoryPolicy||{};const requestedMode=String(cfg.allocationPolicy||'SINGLE_WAREHOUSE').toUpperCase();const supported=new Set(['SINGLE_WAREHOUSE','STRICT_SINGLE_WAREHOUSE','PRIORITY','NEAREST','COST_OPTIMIZED','TRANSFER_TO_PRIMARY']);const mode=(supported.has(requestedMode)?requestedMode:'SINGLE_WAREHOUSE') as RoutingPolicy,splitAllowed=mode==='STRICT_SINGLE_WAREHOUSE'?false:cfg.splitAllowed!==false;
    const stocks=await db.warehouseStock.findMany({where:{variantId:full.id,warehouse:{storeId,isActive:true}},include:{warehouse:true}});const distanceMap:any=cfg.distanceKmByWarehouse||{},costMap:any=cfg.unitCostByWarehouse||{};let candidates=stocks.map((x:any)=>({warehouseId:String(x.warehouseId),available:warehouseAvailable(x),priority:Number(x.warehouse?.priority??100),isDefault:!!x.warehouse?.isDefault,distanceKm:this.warehouseDistanceHint(x.warehouse?.address,destination)??(Number.isFinite(Number(distanceMap[x.warehouseId]))?Number(distanceMap[x.warehouseId]):undefined),unitCost:Number.isFinite(Number(costMap[x.warehouseId]))?Number(costMap[x.warehouseId]):undefined}));const strictWarehouseId=String(cfg.onlineWarehouseId||'');if(mode==='STRICT_SINGLE_WAREHOUSE'){if(!strictWarehouseId)throw new BadRequestException('Online satış deposu seçilmelidir');candidates=candidates.filter((x:any)=>x.warehouseId===strictWarehouseId);}
    const targetId=mode==='TRANSFER_TO_PRIMARY'?String(cfg.transferTargetWarehouseId||stocks.find((x:any)=>x.warehouse?.isDefault)?.warehouseId||stocks[0]?.warehouseId||''):'';const wanted=Math.max(0,Number(quantity||0));const totalAvailable=candidates.reduce((n:number,x:any)=>n+Number(x.available||0),0);const backorder=!!stockPolicy.allowBackorder||!!full.preorderEnabled;const allocatable=backorder?Math.min(wanted,totalAvailable):wanted;let decisions=allocatable>0?routeInventory(candidates,allocatable,mode,splitAllowed):[];
    if(!decisions.length&&allocatable>0&&!backorder)throw new BadRequestException({code:'INSUFFICIENT_STOCK',message:`Insufficient stock for ${full.sku}`});if(!backorder&&decisions.reduce((n:number,x:any)=>n+x.quantity,0)<wanted)throw new BadRequestException({code:'INSUFFICIENT_STOCK',message:`Insufficient stock for ${full.sku}`});
    const stockMap=new Map(stocks.map((x:any)=>[String(x.warehouseId),x]));const out:any[]=decisions.map((d:any)=>({variant:full,variantId:full.id,quantity:d.quantity,inventory:stockPolicy,warehouseId:d.warehouseId,warehouseStock:stockMap.get(String(d.warehouseId)),routingReason:d.reason,transferTargetWarehouseId:targetId&&d.warehouseId!==targetId?targetId:null}));const allocated=out.reduce((n:number,x:any)=>n+Number(x.quantity||0),0);const remaining=Math.max(0,wanted-allocated);
    if(remaining>0){if(!backorder)throw new BadRequestException({code:'INSUFFICIENT_STOCK',message:`Insufficient stock for ${full.sku}`});const warehouse=stocks.find((x:any)=>x.warehouseId===targetId)?.warehouse||stocks.find((x:any)=>x.warehouse?.isDefault)?.warehouse||stocks[0]?.warehouse||await this.ensureDefaultWarehouse(db,storeId);let stock=stocks.find((x:any)=>x.warehouseId===warehouse.id);if(!stock)stock=await db.warehouseStock.upsert({where:{warehouseId_variantId:{warehouseId:warehouse.id,variantId:full.id}},create:{warehouseId:warehouse.id,variantId:full.id,onHand:0},update:{}});out.push({variant:full,variantId:full.id,quantity:remaining,inventory:stockPolicy,warehouseId:warehouse.id,warehouseStock:stock,routingReason:`${mode}:backorder`});}return out;
  }

  private async inventoryTargets(db:any,storeId:string,variant:any,quantity:number,destination?:any){
    let full=variant;if(!full?.product)full=await db.variant.findFirst({where:{id:variant?.id||variant,product:{storeId}},include:{inventory:true,product:true}});if(!full)return[];const cfg=this.setConfig(full.product);
    if(String(full.product.productType||'').toUpperCase()==='SET'&&cfg.stockMode==='COMPONENTS'&&cfg.items.length){const ids=cfg.items.map((x:any)=>x.variantId);const rows=await db.variant.findMany({where:{id:{in:ids},product:{storeId}},include:{inventory:true,product:true}});const map=new Map(rows.map((x:any)=>[x.id,x]));const out:any[]=[];for(const x of cfg.items){const component:any=map.get(x.variantId);if(component)out.push(...await this.allocateVariantStock(db,storeId,component,x.quantity*quantity,destination));}return out;}
    return this.allocateVariantStock(db,storeId,full,quantity,destination);
  }
  private assertStock(_targets:any[],_label='product'){return;}
  private mergeTargets(targets:any[]){const map=new Map<string,any>();for(const t of targets){const key=`${t.variantId}:${t.warehouseId||'untracked'}`;const prev=map.get(key);if(prev)prev.quantity+=Number(t.quantity||0);else map.set(key,{...t,quantity:Number(t.quantity||0)});}return Array.from(map.values());}
  private async reserveTargets(db:any,targets:any[]){
    for(const target of targets){
      if(!target.inventory?.trackStock||!target.warehouseId)continue;
      const quantity=Math.max(0,Number(target.quantity||0));
      if(!quantity)continue;

      const allowOversell=!!target.inventory.allowBackorder||!!target.variant?.preorderEnabled;
      const changed=allowOversell
        ? await db.$executeRawUnsafe(
            'UPDATE "WarehouseStock" SET "reserved" = "reserved" + $1 WHERE "warehouseId" = $2 AND "variantId" = $3',
            quantity,String(target.warehouseId),String(target.variantId)
          )
        : await db.$executeRawUnsafe(
            'UPDATE "WarehouseStock" SET "reserved" = "reserved" + $1 WHERE "warehouseId" = $2 AND "variantId" = $3 AND ("onHand" - "reserved" - "committed" - "damaged" - "safetyStock") >= $1',
            quantity,String(target.warehouseId),String(target.variantId)
          );

      if(Number(changed)===1)continue;

      const exists=await db.warehouseStock.findUnique({
        where:{warehouseId_variantId:{warehouseId:target.warehouseId,variantId:target.variantId}},
        select:{id:true}
      });
      if(!exists)throw new BadRequestException('Warehouse stock row disappeared during checkout');
      throw new BadRequestException(`Insufficient stock for ${target.variant?.sku||target.variantId}`);
    }
  }

  private compactCheckoutStockTargets(targets:any[]){
    return targets.filter((target:any)=>target?.inventory?.trackStock&&target?.warehouseId&&Number(target?.quantity||0)>0).map((target:any)=>({variantId:String(target.variantId),warehouseId:String(target.warehouseId),quantity:Math.max(0,Number(target.quantity||0)),allowOversell:!!target.inventory?.allowBackorder||!!target.variant?.preorderEnabled,transferTargetWarehouseId:target.transferTargetWarehouseId?String(target.transferTargetWarehouseId):null,sku:String(target.variant?.sku||target.variantId)})).sort((a:any,b:any)=>`${a.warehouseId}:${a.variantId}`.localeCompare(`${b.warehouseId}:${b.variantId}`));
  }
  private checkoutStockSignature(targets:any[]){return createHash('sha256').update(JSON.stringify(targets.map((x:any)=>({variantId:x.variantId,warehouseId:x.warehouseId,quantity:x.quantity,allowOversell:x.allowOversell,transferTargetWarehouseId:x.transferTargetWarehouseId||null})))).digest('hex');}
  private checkoutCartInventoryFingerprint(items:any[],gifts:any[]){const lines=[...items.filter((x:any)=>!x.isGift).map((x:any)=>({variantId:String(x.variantId||x.variant?.id||''),quantity:Number(x.quantity||0),gift:false})),...gifts.map((x:any)=>({variantId:String(x.variantId||x.v?.id||''),quantity:Number(x.quantity||x.g?.quantity||0),gift:true}))].sort((a:any,b:any)=>`${a.gift?'1':'0'}:${a.variantId}`.localeCompare(`${b.gift?'1':'0'}:${b.variantId}`));return createHash('sha256').update(JSON.stringify(lines)).digest('hex');}
  private async withCheckoutStockAdmissionLocks<T>(storeId:string,targets:any[],fn:()=>Promise<T>):Promise<T>{
    const compact=this.compactCheckoutStockTargets(targets);if(!compact.length)return fn();
    const keys=[...new Set(compact.map((x:any)=>`checkout:stock-lock:${storeId}:${x.warehouseId}:${x.variantId}`))].sort();
    const ttlMs=Math.max(5000,Math.min(120000,Number(process.env.CHECKOUT_STOCK_LOCK_TTL_MS||30000)||30000));
    const waitMs=Math.max(1000,Math.min(120000,Number(process.env.CHECKOUT_STOCK_LOCK_WAIT_MS||30000)||30000));
    const token=randomBytes(18).toString('hex');const held:string[]=[];const deadline=Date.now()+waitMs;
    try{
      for(const key of keys){
        let acquired=false;
        while(Date.now()<deadline){
          const result=await this.cache.acquireCoordinationLock(key,token,ttlMs);
          if(result===null){for(const heldKey of held.reverse())await this.cache.releaseCoordinationLock(heldKey,token);return fn();}
          if(result){held.push(key);acquired=true;break;}
          await new Promise(resolve=>setTimeout(resolve,8+Math.floor(Math.random()*17)));
        }
        if(!acquired)throw new ServiceUnavailableException('Inventory allocation is busy; retry checkout');
      }
      return await fn();
    }finally{
      for(const key of [...held].reverse())await this.cache.releaseCoordinationLock(key,token);
    }
  }

  private async releaseCheckoutStockHold(storeId:string,cartId:string,idempotencyKey:string){
    const rows=await this.prisma.checkoutInventoryHold.findMany({where:{storeId,cartId,idempotencyKey,status:'HELD'},select:{variantId:true,warehouseId:true,quantity:true}});
    if(!rows.length)return 0;
    return this.withCheckoutStockAdmissionLocks(storeId,rows.map((x:any)=>({variantId:x.variantId,warehouseId:x.warehouseId,quantity:x.quantity,inventory:{trackStock:true}})),()=>this.releaseCheckoutStockHoldUnlocked(storeId,cartId,idempotencyKey));
  }
  private async releaseCheckoutStockHoldUnlocked(storeId:string,cartId:string,idempotencyKey:string){
    const rows=await this.prisma.checkoutInventoryHold.findMany({where:{storeId,cartId,idempotencyKey,status:'HELD'},orderBy:[{warehouseId:'asc'},{variantId:'asc'}]});
    if(!rows.length)return 0;
    return this.prisma.$transaction(async tx=>{let released=0;for(const row of rows){const claimed=await tx.checkoutInventoryHold.updateMany({where:{id:row.id,status:'HELD'},data:{status:'RELEASED',expiresAt:null}});if(claimed.count!==1)continue;await tx.$executeRawUnsafe('UPDATE "WarehouseStock" SET "reserved" = GREATEST(0, "reserved" - $1) WHERE "warehouseId" = $2 AND "variantId" = $3',Number(row.quantity||0),String(row.warehouseId),String(row.variantId));released+=Number(row.quantity||0);}return released;},{isolationLevel:'ReadCommitted',maxWait:10000,timeout:10000} as any);
  }
  private async releaseExpiredCheckoutStockHolds(storeId:string,variantIds:string[]){
    const now=new Date();const rows=await this.prisma.checkoutInventoryHold.findMany({where:{storeId,status:'HELD',expiresAt:{lte:now},...(variantIds.length?{variantId:{in:variantIds}}:{})},select:{cartId:true,idempotencyKey:true},distinct:['cartId','idempotencyKey'],take:100});
    for(const row of rows)await this.releaseCheckoutStockHold(storeId,row.cartId,row.idempotencyKey);
  }
  private async acquireCheckoutStockHold(storeId:string,cartId:string,idempotencyKey:string,targets:any[]){
    const compact=this.compactCheckoutStockTargets(targets);if(!compact.length)return compact;
    const reaperKey=`${storeId}:${[...new Set(compact.map((x:any)=>x.variantId))].sort().join(',')}`;
    const now=Date.now(),last=this.checkoutStockReaperLastRun.get(reaperKey)||0;
    if(now-last>5000){this.checkoutStockReaperLastRun.set(reaperKey,now);await this.releaseExpiredCheckoutStockHolds(storeId,[...new Set(compact.map((x:any)=>x.variantId))]);}
    return this.enqueueCheckoutStockHoldBatch(storeId,cartId,idempotencyKey,targets,compact);
  }

  private checkoutStockBatchKey(storeId:string,compact:any[]){
    return `${storeId}|${compact.map((x:any)=>`${x.warehouseId}:${x.variantId}:${x.allowOversell?'1':'0'}:${x.transferTargetWarehouseId||''}`).join('|')}`;
  }

  private async enqueueCheckoutStockHoldBatch(storeId:string,cartId:string,idempotencyKey:string,targets:any[],compact:any[]){
    const key=this.checkoutStockBatchKey(storeId,compact);
    const windowMs=Math.max(1,Math.min(50,Number(process.env.CHECKOUT_STOCK_BATCH_WINDOW_MS||8)||8));
    const maxBatch=Math.max(2,Math.min(512,Number(process.env.CHECKOUT_STOCK_BATCH_MAX||128)||128));
    return await new Promise<any[]>((resolve,reject)=>{
      let batch=this.checkoutStockAdmissionBatches.get(key);
      if(!batch){batch={timer:null,requests:[]};this.checkoutStockAdmissionBatches.set(key,batch);}
      batch.requests.push({storeId,cartId,idempotencyKey,targets,compact,signature:this.checkoutStockSignature(compact),enqueuedAt:Date.now(),resolve,reject});
      if(batch.requests.length>=maxBatch){
        if(batch.timer)clearTimeout(batch.timer);
        batch.timer=null;
        void this.flushCheckoutStockHoldBatch(key);
      }else if(!batch.timer){
        batch.timer=setTimeout(()=>{batch!.timer=null;void this.flushCheckoutStockHoldBatch(key);},windowMs);
      }
    });
  }

  private async flushCheckoutStockHoldBatch(key:string){
    const batch=this.checkoutStockAdmissionBatches.get(key);if(!batch)return;
    this.checkoutStockAdmissionBatches.delete(key);
    if(batch.timer)clearTimeout(batch.timer);
    const requests=batch.requests.splice(0);if(!requests.length)return;
    const startedAt=Date.now(),storeId=String(requests[0].storeId);
    const lockTargets=requests.flatMap((r:any)=>r.compact.map((x:any)=>({variantId:x.variantId,warehouseId:x.warehouseId,quantity:x.quantity,inventory:{trackStock:true,allowBackorder:x.allowOversell},variant:{preorderEnabled:x.allowOversell}})));
    const configuredMode=String(process.env.CHECKOUT_STOCK_ADMISSION_MODE||'db-lock').toLowerCase();
    const atomicEnabled=process.env.LOADTEST_ENV==='true'&&configuredMode==='redis-atomic';
    let modeUsed=atomicEnabled?'redis-atomic':'db-lock',redisMs=0,txMs=0;
    try{
      let outcomes:any[];
      if(atomicEnabled){
        const atomic=await this.processCheckoutStockHoldBatchRedisAtomic(storeId,requests);
        redisMs=atomic.redisMs;txMs=atomic.txMs;
        if(atomic.fallback){modeUsed='db-lock-fallback';const t=Date.now();outcomes=await this.withCheckoutStockAdmissionLocks(storeId,lockTargets,()=>this.processCheckoutStockHoldBatchWithRetry(storeId,requests));txMs+=Date.now()-t;}else outcomes=atomic.outcomes;
      }else{const t=Date.now();outcomes=await this.withCheckoutStockAdmissionLocks(storeId,lockTargets,()=>this.processCheckoutStockHoldBatchWithRetry(storeId,requests));txMs=Date.now()-t;}
      if(process.env.LOADTEST_ENV==='true')console.log(JSON.stringify({event:'CHECKOUT_STOCK_BATCH',mode:modeUsed,batchSize:requests.length,queueMs:Math.max(0,startedAt-Math.min(...requests.map((r:any)=>Number(r.enqueuedAt||startedAt)))),redisMs,txMs,totalMs:Date.now()-startedAt,revision:process.env.K_REVISION||null}));
      for(let i=0;i<requests.length;i++){const out=outcomes[i];if(out?.ok)requests[i].resolve(requests[i].compact);else requests[i].reject(out?.error||new BadRequestException('Inventory allocation failed'));}
    }catch(error:any){
      if(process.env.LOADTEST_ENV==='true')console.log(JSON.stringify({event:'CHECKOUT_STOCK_BATCH',mode:modeUsed,batchSize:requests.length,redisMs,txMs,totalMs:Date.now()-startedAt,error:String(error?.code||error?.message||error),revision:process.env.K_REVISION||null}));
      for(const request of requests)request.reject(error);
    }
  }

  private async processCheckoutStockHoldBatchRedisAtomic(storeId:string,requests:any[]):Promise<{fallback:boolean;outcomes:any[];redisMs:number;txMs:number}>{
    const redisStarted=Date.now();
    const totals=new Map<string,{key:string;warehouseId:string;variantId:string;quantity:number;allowOversell:boolean;sku:string}>();
    for(const r of requests)for(const t of r.compact){const id=`${t.warehouseId}:${t.variantId}`;const cur=totals.get(id)||{key:`checkout:stock-credit:${storeId}:${t.warehouseId}:${t.variantId}`,warehouseId:t.warehouseId,variantId:t.variantId,quantity:0,allowOversell:!!t.allowOversell,sku:t.sku};cur.quantity+=Number(t.quantity||0);cur.allowOversell=cur.allowOversell||!!t.allowOversell;totals.set(id,cur);}
    const guarded=[...totals.values()].filter((x:any)=>!x.allowOversell);
    const stocks:any[]=guarded.length?await this.prisma.warehouseStock.findMany({where:{OR:guarded.map((x:any)=>({warehouseId:x.warehouseId,variantId:x.variantId}))}}):[];
    const stockByKey=new Map(stocks.map((x:any)=>[`${x.warehouseId}:${x.variantId}`,x]));
    const reservedKeys:string[]=[];
    for(const t of guarded){
      const row:any=stockByKey.get(`${t.warehouseId}:${t.variantId}`);
      if(!row){for(const k of reservedKeys)await this.cache.deleteCoordinationKey(k);return{fallback:false,outcomes:requests.map(()=>({ok:false,error:new BadRequestException(`Insufficient stock for ${t.sku}`)})),redisMs:Date.now()-redisStarted,txMs:0};}
      const available=Math.max(0,Number(row.onHand||0)-Number(row.reserved||0)-Number(row.committed||0)-Number(row.damaged||0)-Number(row.safetyStock||0));
      const result=await this.cache.coordinationStockReserve(t.key,t.quantity,available,Number(process.env.CHECKOUT_STOCK_CREDIT_TTL_MS||300000));
      if(result===null){for(const k of reservedKeys)await this.cache.deleteCoordinationKey(k);return{fallback:true,outcomes:[],redisMs:Date.now()-redisStarted,txMs:0};}
      if(!result.ok)return{fallback:false,outcomes:requests.map(()=>({ok:false,error:new BadRequestException(`Insufficient stock for ${t.sku}`)})),redisMs:Date.now()-redisStarted,txMs:0};
      reservedKeys.push(t.key);
    }
    const redisMs=Date.now()-redisStarted,txStarted=Date.now();
    try{const outcomes=await this.processCheckoutStockHoldBatchWithRetry(storeId,requests);if(outcomes.some((x:any)=>!x?.ok))for(const k of reservedKeys)await this.cache.deleteCoordinationKey(k);return{fallback:false,outcomes,redisMs,txMs:Date.now()-txStarted};}
    catch(error){for(const k of reservedKeys)await this.cache.deleteCoordinationKey(k);throw error;}
  }


  private async processCheckoutStockHoldBatchWithRetry(storeId:string,requests:any[]){
    const maxAttempts=Math.max(1,Math.min(5,Number(process.env.CHECKOUT_STOCK_TX_RETRY_ATTEMPTS||3)||3));
    let lastError:any;
    for(let attempt=1;attempt<=maxAttempts;attempt++){
      try{
        return await this.processCheckoutStockHoldBatch(storeId,requests);
      }catch(error:any){
        lastError=error;
        const code=String(error?.code||'');
        const message=String(error?.message||'');
        const transient=code==='P2028'||code==='P2024'||code==='P2034'||message.includes('Transaction already closed');
        if(!transient||attempt>=maxAttempts)throw error;
        const base=Math.max(5,Math.min(500,Number(process.env.CHECKOUT_STOCK_TX_RETRY_BASE_MS||35)||35));
        const delay=Math.min(1000,base*Math.pow(2,attempt-1))+Math.floor(Math.random()*Math.max(5,base));
        if(process.env.LOADTEST_ENV==='true')console.log(JSON.stringify({event:'CHECKOUT_STOCK_TX_RETRY',code:code||'UNKNOWN',attempt,maxAttempts,delayMs:delay,batchSize:requests.length,revision:process.env.K_REVISION||null}));
        await new Promise(resolve=>setTimeout(resolve,delay));
      }
    }
    throw lastError;
  }

  private async processCheckoutStockHoldBatch(storeId:string,requests:any[]){
    const expiresAt=new Date(Date.now()+5*60*1000);
    return this.prisma.$transaction(async tx=>{
      const outcomes=requests.map(()=>({ok:false,error:null as any}));
      const or=requests.map((r:any)=>({storeId,cartId:r.cartId,idempotencyKey:r.idempotencyKey,status:'HELD' as any}));
      const existing:any[]=or.length?await tx.checkoutInventoryHold.findMany({where:{OR:or},orderBy:[{warehouseId:'asc'},{variantId:'asc'}]}):[];
      const byReq=new Map<string,any[]>();
      for(const row of existing){const k=`${row.cartId}:${row.idempotencyKey}`;const a=byReq.get(k)||[];a.push(row);byReq.set(k,a);}
      const candidates:any[]=[];const refreshIds:string[]=[];
      for(let i=0;i<requests.length;i++){
        const r=requests[i],rows=byReq.get(`${r.cartId}:${r.idempotencyKey}`)||[];
        if(rows.length){
          const sig=String((rows[0]?.metadata as any)?.signature||'');
          const valid=sig===r.signature&&rows.length===r.compact.length&&rows.every((x:any)=>x.expiresAt&&x.expiresAt.getTime()>Date.now());
          if(valid){refreshIds.push(...rows.map((x:any)=>x.id));outcomes[i]={ok:true,error:null};continue;}
          outcomes[i]={ok:false,error:new BadRequestException('Checkout inventory hold changed; retry checkout')};continue;
        }
        candidates.push({index:i,...r});
      }

      const targetKeys=[...new Set(candidates.flatMap((r:any)=>r.compact.map((x:any)=>`${x.warehouseId}:${x.variantId}`)))];
      const stocks:any[]=targetKeys.length?await tx.warehouseStock.findMany({where:{OR:targetKeys.map((k:string)=>{const [warehouseId,variantId]=k.split(':');return{warehouseId,variantId};})}}):[];
      const stockByKey=new Map(stocks.map((x:any)=>[`${x.warehouseId}:${x.variantId}`,x]));
      const remaining=new Map<string,number>();
      for(const [k,row] of stockByKey as any){
        remaining.set(k,Number(row.onHand||0)-Number(row.reserved||0)-Number(row.committed||0)-Number(row.damaged||0)-Number(row.safetyStock||0));
      }

      const admitted:any[]=[];
      for(const r of candidates){
        let ok=true;
        for(const t of r.compact){
          if(t.allowOversell)continue;
          const k=`${t.warehouseId}:${t.variantId}`;
          if(!stockByKey.has(k)||Number(remaining.get(k)||0)<Number(t.quantity||0)){ok=false;break;}
        }
        if(!ok){
          const failedTarget=r.compact.find((t:any)=>!t.allowOversell&&(!stockByKey.has(`${t.warehouseId}:${t.variantId}`)||Number(remaining.get(`${t.warehouseId}:${t.variantId}`)||0)<Number(t.quantity||0)));
          outcomes[r.index]={ok:false,error:new BadRequestException(`Insufficient stock for ${failedTarget?.sku||'item'}`)};
          continue;
        }
        for(const t of r.compact)if(!t.allowOversell){const k=`${t.warehouseId}:${t.variantId}`;remaining.set(k,Number(remaining.get(k)||0)-Number(t.quantity||0));}
        admitted.push(r);
      }

      const totals=new Map<string,{warehouseId:string;variantId:string;quantity:number;allowOversell:boolean;sku:string}>();
      for(const r of admitted)for(const t of r.compact){
        const k=`${t.warehouseId}:${t.variantId}`;const cur=totals.get(k)||{warehouseId:t.warehouseId,variantId:t.variantId,quantity:0,allowOversell:!!t.allowOversell,sku:t.sku};
        cur.quantity+=Number(t.quantity||0);cur.allowOversell=cur.allowOversell||!!t.allowOversell;totals.set(k,cur);
      }

      for(const t of totals.values()){
        const changed=t.allowOversell
          ?await tx.$executeRawUnsafe('UPDATE "WarehouseStock" SET "reserved" = "reserved" + $1 WHERE "warehouseId" = $2 AND "variantId" = $3',t.quantity,t.warehouseId,t.variantId)
          :await tx.$executeRawUnsafe('UPDATE "WarehouseStock" SET "reserved" = "reserved" + $1 WHERE "warehouseId" = $2 AND "variantId" = $3 AND ("onHand" - "reserved" - "committed" - "damaged" - "safetyStock") >= $1',t.quantity,t.warehouseId,t.variantId);
        if(Number(changed)!==1)throw new BadRequestException(`Insufficient stock for ${t.sku}`);
      }

      const holdRows:any[]=[];
      for(const r of admitted)for(const t of r.compact)holdRows.push({storeId,cartId:r.cartId,idempotencyKey:r.idempotencyKey,variantId:t.variantId,warehouseId:t.warehouseId,quantity:t.quantity,status:'HELD' as any,expiresAt,metadata:{signature:r.signature,transferTargetWarehouseId:t.transferTargetWarehouseId||null}});
      if(holdRows.length)await tx.checkoutInventoryHold.createMany({data:holdRows});
      if(refreshIds.length)await tx.checkoutInventoryHold.updateMany({where:{id:{in:refreshIds},status:'HELD'},data:{expiresAt}});
      for(const r of admitted)outcomes[r.index]={ok:true,error:null};
      return outcomes;
    },{isolationLevel:'ReadCommitted',maxWait:10000,timeout:10000} as any);
  }
  private async acquireCheckoutStockHoldUnlocked(storeId:string,cartId:string,idempotencyKey:string,targets:any[]){
    const compact=this.compactCheckoutStockTargets(targets);if(!compact.length)return compact;const signature=this.checkoutStockSignature(compact);const expiresAt=new Date(Date.now()+5*60*1000);
    const existing=await this.prisma.checkoutInventoryHold.findMany({where:{storeId,cartId,idempotencyKey,status:'HELD'},orderBy:[{warehouseId:'asc'},{variantId:'asc'}]});
    if(existing.length){const existingSig=String((existing[0]?.metadata as any)?.signature||'');if(existingSig===signature&&existing.every((x:any)=>x.expiresAt&&x.expiresAt.getTime()>Date.now())){await this.prisma.checkoutInventoryHold.updateMany({where:{storeId,cartId,idempotencyKey,status:'HELD'},data:{expiresAt}});return compact;}await this.releaseCheckoutStockHold(storeId,cartId,idempotencyKey);}
    try{return await this.prisma.$transaction(async tx=>{const raced=await tx.checkoutInventoryHold.findMany({where:{storeId,cartId,idempotencyKey,status:'HELD'},orderBy:[{warehouseId:'asc'},{variantId:'asc'}]});if(raced.length){const racedSig=String((raced[0]?.metadata as any)?.signature||'');if(racedSig===signature)return compact;throw new BadRequestException('Checkout inventory hold changed; retry checkout');}for(const target of compact){const changed=target.allowOversell?await tx.$executeRawUnsafe('UPDATE "WarehouseStock" SET "reserved" = "reserved" + $1 WHERE "warehouseId" = $2 AND "variantId" = $3',target.quantity,target.warehouseId,target.variantId):await tx.$executeRawUnsafe('UPDATE "WarehouseStock" SET "reserved" = "reserved" + $1 WHERE "warehouseId" = $2 AND "variantId" = $3 AND ("onHand" - "reserved" - "committed" - "damaged" - "safetyStock") >= $1',target.quantity,target.warehouseId,target.variantId);if(Number(changed)!==1)throw new BadRequestException(`Insufficient stock for ${target.sku}`);await tx.checkoutInventoryHold.create({data:{storeId,cartId,idempotencyKey,variantId:target.variantId,warehouseId:target.warehouseId,quantity:target.quantity,status:'HELD',expiresAt,metadata:{signature,transferTargetWarehouseId:target.transferTargetWarehouseId||null}}});}return compact;},{isolationLevel:'ReadCommitted',maxWait:10000,timeout:10000} as any);}catch(error:any){if(String(error?.code||'')==='P2002'){const raced=await this.prisma.checkoutInventoryHold.findMany({where:{storeId,cartId,idempotencyKey,status:'HELD'}});if(raced.length&&String((raced[0]?.metadata as any)?.signature||'')===signature)return compact;}throw error;}
  }
  private async consumeCheckoutStockHold(tx:any,storeId:string,cartId:string,idempotencyKey:string,targets:any[]){const expected=this.compactCheckoutStockTargets(targets).length;if(!expected)return;const changed=await tx.checkoutInventoryHold.updateMany({where:{storeId,cartId,idempotencyKey,status:'HELD'},data:{status:'CONSUMED',expiresAt:null}});if(changed.count!==expected)throw new BadRequestException('Checkout inventory hold expired or changed; retry checkout');}

  private async allocateOrderNumber(storeId:string){
    for(;;){
      const block=this.orderNumberBlocks.get(storeId);
      if(block&&block.next<=block.end){
        const value=block.next;
        block.next+=1;
        return value;
      }
      let refill=this.orderNumberRefills.get(storeId);
      if(!refill){
        const configured=Number(process.env.ORDER_NUMBER_BLOCK_SIZE||64);
        const blockSize=Math.max(1,Math.min(1024,Number.isFinite(configured)?Math.floor(configured):64));
        refill=(async()=>{
          const row=await this.prisma.tenant.update({
            where:{id:storeId},
            data:{nextOrderNumber:{increment:blockSize}},
            select:{nextOrderNumber:true}
          });
          const end=Number(row.nextOrderNumber)-1;
          this.orderNumberBlocks.set(storeId,{next:end-blockSize+1,end});
        })().finally(()=>{this.orderNumberRefills.delete(storeId)});
        this.orderNumberRefills.set(storeId,refill);
      }
      await refill;
    }
  }

  private async pageByLocalizedSlug(store:any,pageSlug:string,locale?:string){
    const active=locale||store.locale;
    if(active!==store.locale){
      const translations=await this.prisma.contentTranslation.findMany({where:{storeId:store.id,entityType:'page',locale:active}});
      const hit=translations.find((x:any)=>String((x.fields as any)?.slug||'')===pageSlug);
      if(hit){const page=await this.prisma.page.findFirst({where:{id:hit.entityId,storeId:store.id,status:'PUBLISHED'}});if(page)return page;}
    }
    return this.prisma.page.findFirst({where:{storeId:store.id,slug:pageSlug,status:'PUBLISHED'}});
  }
  private async pageVariables(store:any,locale?:string){
    const address=await this.prisma.storeAddress.findFirst({where:{storeId:store.id},orderBy:[{isDefault:'desc'},{createdAt:'asc'}]});
    const addressText=store.addressText||[address?.address1,address?.address2,address?.district,address?.city,address?.state,address?.postalCode,address?.country].filter(Boolean).join(', ');
    let siteAddress='';if(store.domain)siteAddress='https://'+store.domain;else if(store.publicSlug)siteAddress='/'+store.publicSlug;
    let date='';try{date=new Intl.DateTimeFormat(locale||store.locale||'tr-TR',{dateStyle:'long'}).format(new Date())}catch{date=new Date().toISOString().slice(0,10)}
    const owner=store.companyName||store.name||'';
    return {
      firma_adi:owner,ticari_unvan:owner,marka_adi:store.name||'',telefon:store.phone||'',eposta:store.email||'',adres:addressText||'',vergi_dairesi:store.taxOffice||'',vergi_no:store.taxNumber||'',site_adresi:siteAddress,tarih:date,
      store_name:store.name||'',store_domain:store.domain||(`${store.publicSlug}.ticarti.com`),store_owner:owner,store_address:addressText||'',store_email:store.email||'',store_mail:store.email||'',store_telephone:store.phone||''
    };
  }
  private async presentPage(store:any,page:any,locale?:string){
    const active=locale||store.locale;const [localized]=await this.translateMany(store.id,'page',[page],active,store.locale);const vars=await this.pageVariables(store,active);
    const replace=(value:any)=>String(value||'').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}|\{\s*(store_[a-z0-9_]+)\s*\}/gi,(_m:string,keyA:string,keyB:string)=>{const key=keyA||keyB;return String((vars as any)[key]??_m)});
    return {...localized,title:replace(localized.title),body:replace(localized.body),seoTitle:replace(localized.seoTitle),seoDescription:replace(localized.seoDescription)};
  }
  private async contractPages(store:any,locale?:string){
    const mappings:any=(store.settings as any)?.contractPages||{};const entries=Object.entries(mappings).filter(([,id])=>Boolean(id));if(!entries.length)return{};
    const ids=Array.from(new Set(entries.map(([,id])=>String(id))));const pages=await this.prisma.page.findMany({where:{storeId:store.id,id:{in:ids},status:'PUBLISHED'}});const result:any={};
    for(const [type,id] of entries){const page=pages.find(x=>x.id===String(id));if(!page)continue;const localized=await this.presentPage(store,page,locale);result[type]={id:page.id,title:localized.title,slug:localized.slug||page.slug,href:'/pages/'+encodeURIComponent(localized.slug||page.slug)+'?locale='+encodeURIComponent(locale||store.locale),updatedAt:page.updatedAt};}
    return result;
  }

  // Small public SSR contract. Never include catalog, theme runtime or private settings.
  async bootstrapShell(slug: string) {
    const store = await this.store(slug, true);
    const activeTheme = await this.prisma.themeDefinition.findFirst({
      where: { slug: store.activeTheme, isActive: true },
      select: { slug: true, version: true, config: true }
    });
    const config:any = activeTheme?.config && typeof activeTheme.config === 'object' ? activeTheme.config : {};
    const settings:any = store.settings && typeof store.settings === 'object' ? store.settings : {};
    const seo:any = settings.seoAdvanced || {};
    const technical:any = seo.technical || {};
    const social:any = seo.social || {};
    const locales = await this.prisma.storeLocale.findMany({
      where: { storeId: store.id, isEnabled: true },
      select: { locale: true, label: true, isDefault: true }, orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }]
    });
    return {
      store: {
        id: store.id, name: store.name, slug: store.slug, publicSlug: store.publicSlug,
        logoUrl: store.logoUrl, faviconUrl: store.faviconUrl,
        locales, locale: store.locale, currency: store.currency, defaultCurrency: store.currency,
        activeTheme: store.activeTheme, maintenanceMode: this.maintenanceActive(store),
        seoTitle: store.seoTitle, seoDescription: store.seoDescription,
        settings: { seoAdvanced: {
          defaultTitle: seo.defaultTitle, defaultDescription: seo.defaultDescription,
          technical: { canonicalBase: technical.canonicalBase, robots: technical.robots },
          social: { ogImage: social.ogImage, twitterCard: social.twitterCard },
          tracking: seo.tracking, customHeadHtml: seo.customHeadHtml,
          schema: seo.schema
        } }
      },
      theme: { slug: activeTheme?.slug || store.activeTheme,
        version: activeTheme?.version || '', config: { engine: String(config.engine || config.manifest?.engine || '') } },
      __ticartiShell: true
    };
  }

  async bootstrap(slug: string, currency?: string, locale?: string) {
    const v16BootStart=Date.now();
    const store = await this.store(slug, true);
    const v16StoreMs=Date.now()-v16BootStart;
    const storeSettings:any = store.settings || {};
    if (this.maintenanceActive(store) || (await tenantRestriction(this.prisma,store.id)).restricted) {
      return {
        store: {
          id: store.id, name: store.name, slug: store.slug, publicSlug: store.publicSlug,
          locale: store.locale, timezone: store.timezone, logoUrl: store.logoUrl, faviconUrl: store.faviconUrl,
          maintenanceMode: true, maintenanceLaunchAt: storeSettings.maintenanceLaunchAt || null
        },
        categories: [], banners: [], menus: [], featured: [], shippingMethods: [], paymentMethods: [], legalDocuments: [], contractPages: {}, popups: [], sections: [], reviews: [], blogPosts: [], brands: [], design: this.designSettings(store)
      };
    }
    // ticarti:perf-v16 — start the independent best-seller aggregate while other
    // bootstrap reads run. Preserve the existing empty-on-error behaviour.
    // Starting the promise once prevents an extra serial database round trip.
    const v16SalesStart=Date.now();
    const v16SalesPromise:Promise<any[]> = Promise.resolve(
      (this.prisma.orderItem.groupBy as any)({by:['variantId'],where:{variantId:{not:null},order:{storeId:store.id}},_sum:{quantity:true},orderBy:{_sum:{quantity:'desc'}},take:80})
    ).then((rows:any)=>Array.isArray(rows)?rows:[]).catch(()=>[]);
    // ticarti:v15-bootstrap-independent-reads — start FX/app/rate reads with the independent storefront reads.
    const v15BootstrapQueryStart=Date.now();
    const [ci, categoriesRaw, bannersRaw, menus, featuredRaw, shippingMethods, paymentMethods, legalDocuments, popups, locales, sections, reviews, blogPosts, brands, activeThemeDef] = await Promise.all([
      this.currencyInfo(store, currency),
      this.prisma.category.findMany({ where: { storeId: store.id, isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.banner.findMany({ where: { storeId: store.id, isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }] }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.menu.findMany({ where: { storeId: store.id } }),
      this.prisma.product.findMany({ where: { storeId: store.id, status: 'ACTIVE', AND:this.productPublicationAnd() }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, brand: true, variants: { where: { isActive: true }, include: { inventory: true, warehouseStocks:true }, take: 1 }, categories: { include: { category: true } }, reviews: { where: { status: 'APPROVED' }, select: { rating: true } } }, orderBy: { createdAt: 'desc' }, take: 48 }),
      this.prisma.shippingMethod.findMany({ where: { storeId: store.id, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.paymentMethod.findMany({ where: { storeId: store.id, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.legalDocument.findMany({ where: { storeId: store.id, isActive: true }, select: { type:true,locale:true,version:true,title:true,publishedAt:true } }),
      this.prisma.marketingCampaign.findMany({ where: { storeId: store.id, channel: 'POPUP', OR: [{ status: 'ACTIVE', OR: [{ scheduleAt: null }, { scheduleAt: { lte: new Date() } }] }, { status: 'SCHEDULED', scheduleAt: { lte: new Date() } }] }, select: { id:true,name:true,subject:true,content:true,settings:true,scheduleAt:true }, orderBy:{createdAt:'desc'}, take:5 }),
      this.prisma.storeLocale.findMany({ where: { storeId: store.id, isEnabled: true }, orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }] }),
      Promise.resolve([]),
      this.prisma.review.findMany({where:{storeId:store.id,status:'APPROVED'},select:{id:true,rating:true,title:true,body:true,authorName:true,verifiedPurchase:true,product:{select:{title:true,slug:true}}},orderBy:{createdAt:'desc'},take:8}),
      this.prisma.blogPost.findMany({where:{storeId:store.id,status:'PUBLISHED',publishedAt:{lte:new Date()},locale:locale||store.locale},select:{id:true,title:true,slug:true,excerpt:true,featuredImageUrl:true,publishedAt:true,category:{select:{slug:true}}},orderBy:{publishedAt:'desc'},take:6}),
      this.prisma.brand.findMany({where:{storeId:store.id},select:{id:true,name:true,slug:true,logoUrl:true},orderBy:{name:'asc'},take:20}),
      this.prisma.themeDefinition.findFirst({where:{slug:store.activeTheme,isActive:true},select:{id:true,slug:true,name:true,version:true,config:true}}),
    ]);
    // ticarti:v9-bootstrap-parallel — independent reads run concurrently without altering the result contract.
    const v15BootstrapQueryMs=Date.now()-v15BootstrapQueryStart;
    const activeLocale = locales.some((x:any)=>x.locale===locale) ? locale! : (locales.find((x:any)=>x.isDefault)?.locale || store.locale);
    const v15EnrichStart=Date.now();
    const [aiAssistant, categories, banners, featured, contractPages] = await Promise.all([
      this.prisma.appInstallation.findFirst({where:{tenantId:store.id,enabled:true,status:'ACTIVE',app:{slug:'we-ai-assistant'}},select:{id:true}}),
      this.translateMany(store.id,'category',categoriesRaw,activeLocale,store.locale),
      this.translateMany(store.id,'banner',bannersRaw,activeLocale,store.locale),
      this.translateMany(store.id,'product',featuredRaw,activeLocale,store.locale),
      this.contractPages(store,activeLocale),
    ]);
    const v15EnrichMs=Date.now()-v15EnrichStart;
    // The final phase timing below also includes best-seller aggregation.
    const v16EnrichEnd=Date.now();
    const presentedPool = featured.map((p:any)=>this.presentProduct({ ...p, rating: p.reviews?.length ? p.reviews.reduce((a:number,r:any)=>a+Number(r.rating||0),0)/p.reviews.length : null, reviewCount:p.reviews?.length||0 },ci));
    let bestSelling:any[]=[];
    try{
      const sales:any[]=await v16SalesPromise;
      const variantIds=sales.map((x:any)=>x.variantId).filter(Boolean);const variants=variantIds.length?await this.prisma.variant.findMany({where:{id:{in:variantIds}},select:{id:true,productId:true}}):[];const productByVariant=new Map(variants.map((v:any)=>[v.id,v.productId]));const rank=new Map<string,number>();let pos=0;for(const row of sales){const pid=productByVariant.get(row.variantId as string);if(pid&&!rank.has(pid))rank.set(pid,pos++)}bestSelling=[...presentedPool].filter((p:any)=>rank.has(p.id)).sort((a:any,b:any)=>Number(rank.get(a.id))-Number(rank.get(b.id)));
    }catch{bestSelling=[]}
    if(process.env.TICARTI_STOREFRONT_BOOTSTRAP_TIMING==='true')console.log(JSON.stringify({component:'ticarti-storefront',event:'bootstrap_phases',storeMs:v16StoreMs,queriesMs:v15BootstrapQueryMs,enrichMs:v15EnrichMs,bestSellerWaitAfterEnrichMs:Date.now()-v16EnrichEnd,bestSellerOverlapElapsedMs:Date.now()-v16SalesStart,totalToBestSellerMs:Date.now()-v16BootStart}));
    const bestRated=[...presentedPool].filter((p:any)=>Number(p.reviewCount||0)>0).sort((a:any,b:any)=>Number(b.rating||0)-Number(a.rating||0)||Number(b.reviewCount||0)-Number(a.reviewCount||0));
    const safeStore = { id: store.id, name: store.name, slug: store.slug, publicSlug: store.publicSlug, currency: ci.code, baseCurrency: store.currency, currencies: ci.available, locale: activeLocale, locales: locales.map((x:any)=>({locale:x.locale,label:x.label,isDefault:x.isDefault})), timezone: store.timezone, defaultCountry: store.defaultCountry, logoUrl: store.logoUrl, faviconUrl: store.faviconUrl, seoTitle: store.seoTitle, seoDescription: store.seoDescription, activeTheme: store.activeTheme, settings: store.settings, maintenanceMode: false, maintenanceLaunchAt: storeSettings.maintenanceLaunchAt || null };
    const state:any=this.themeState(store);
    const themeConfig:any=activeThemeDef?.config&&typeof activeThemeDef.config==='object'?activeThemeDef.config:{};
    const stateMatchesActive=!!state&&String(state?.themeSlug||'')===String(store.activeTheme||'');
    const packageCurrent:any=themeConfig?.settingsData?.current&&typeof themeConfig.settingsData.current==='object'&&!Array.isArray(themeConfig.settingsData.current)?themeConfig.settingsData.current:(themeConfig?.design?.themeSettings?.general||{});
    const packageGroups:any=themeConfig?.groups&&typeof themeConfig.groups==='object'&&!Array.isArray(themeConfig.groups)?themeConfig.groups:{};
    const packageRuntime:any={settingsSchema:themeConfig?.settingsSchema||[],settingsCurrent:packageCurrent,templates:themeConfig?.pages||{},groups:{header:packageGroups.header||null,footer:packageGroups.footer||null,popups:packageGroups.popups||null},modules:Array.isArray(themeConfig?.modules)?themeConfig.modules:[],blockSchemas:Array.isArray(themeConfig?.blockSchemas)?themeConfig.blockSchemas:[]};
    const savedRuntime:any=stateMatchesActive&&state?.runtime&&typeof state.runtime==='object'&&!Array.isArray(state.runtime)?state.runtime:{};
    const themeRuntime:any={...packageRuntime,...savedRuntime,settingsSchema:packageRuntime.settingsSchema,modules:packageRuntime.modules,blockSchemas:packageRuntime.blockSchemas,settingsCurrent:{...packageRuntime.settingsCurrent,...(savedRuntime.settingsCurrent||{})},templates:{...packageRuntime.templates,...(savedRuntime.templates||{})},groups:{...packageRuntime.groups,...(savedRuntime.groups||{})}};
    const packageSections=Array.isArray(themeConfig?.sections)?themeConfig.sections:[];
    const packageMenus=Array.isArray(themeConfig?.menus)?themeConfig.menus:[];
    const sectionSource=stateMatchesActive&&Array.isArray(state?.sections)?state.sections:packageSections;
    const menuSource=stateMatchesActive&&Array.isArray(state?.menus)&&state.menus.length?state.menus:(packageMenus.length?packageMenus:menus);
    const themeSections=this.localizeThemeNode(sectionSource,activeLocale,store.locale).filter((x:any)=>x?.enabled!==false);
    const themeMenus=this.localizeThemeNode(menuSource,activeLocale,store.locale);
    return { store: safeStore, categories, banners, menus:themeMenus, featured: presentedPool.slice(0,12), productPools:{newest:presentedPool,bestSelling:bestSelling.length?bestSelling:presentedPool,bestRated:bestRated.length?bestRated:presentedPool}, shippingMethods: shippingMethods.map(x=>({ ...x, price:this.money(x.price,ci.rate,ci.rounding), freeAbove:x.freeAbove==null?null:this.money(x.freeAbove,ci.rate,ci.rounding) })), paymentMethods, legalDocuments, contractPages, popups, sections:themeSections, reviews, blogPosts, brands, features:{aiAssistant:!!aiAssistant}, theme:activeThemeDef||{slug:String(store.activeTheme||'default'),name:'Tema',version:'1.0.0',config:{}}, design:this.designSettings(store,activeLocale,themeConfig), themeRuntime:this.localizeThemeNode(stateMatchesActive&&state&&typeof state==='object'?{...state,...themeRuntime}:themeRuntime,activeLocale,store.locale), themeStateVersion:Number(state?.version||0) };
  }

  private collectionRuleWhere(rules:any[]){
    const conditions:any[]=[];for(const rule of rules||[]){const field=String(rule.field||'').toLowerCase(),op=String(rule.operator||'equals').toLowerCase();const raw:any=rule.value;const value=raw&&typeof raw==='object'&&'value' in raw?raw.value:raw;if(field==='tag'){if(op==='equals'||op==='contains')conditions.push({tags:{has:String(value)}});}else if(field==='brand'){conditions.push({brand:{slug:String(value)}});}else if(field==='category'){conditions.push({categories:{some:{category:{slug:String(value)}}}});}else if(field==='title'){conditions.push({title:{[op==='contains'?'contains':'equals']:String(value),mode:'insensitive'}});}else if(field==='price'){const n=Number(value);if(Number.isFinite(n))conditions.push({variants:{some:{price:{[op==='gt'?'gt':op==='gte'?'gte':op==='lt'?'lt':op==='lte'?'lte':'equals']:n}}}});}}return conditions.length?{AND:conditions}:{};
  }
  private csv(value:any){return Array.from(new Set(String(value||'').split(',').map(x=>x.trim()).filter(Boolean)));}
  private async categoryScope(storeId:string,slug?:string){
    if(!slug)return null;
    const rows=await this.prisma.category.findMany({where:{storeId,isActive:true},select:{id:true,parentId:true,slug:true,name:true,description:true,imageUrl:true,seoTitle:true,seoDescription:true}});
    const root=rows.find(x=>x.slug===slug);if(!root)return {ids:['__missing_category__'],category:null};
    const ids=[root.id];for(let i=0;i<ids.length;i++)for(const row of rows)if(row.parentId===ids[i]&&!ids.includes(row.id))ids.push(row.id);
    return {ids,category:root};
  }
  private productFilterWhere(query:any){
    const and:any[]=[];
    const brands=this.csv(query.brand||query['filter.brand']);if(brands.length)and.push({brand:{slug:{in:brands}}});
    const productTypes=this.csv(query.productType||query['filter.productType']);if(productTypes.length)and.push({productType:{in:productTypes}});
    const categorySlugs=this.csv(query['filter.category']);if(categorySlugs.length)and.push({categories:{some:{category:{slug:{in:categorySlugs},isActive:true}}}});
    const tags=this.csv(query.tag||query['filter.tag']);if(tags.length)and.push({tags:{hasSome:tags}});
    const availability=String(query.availability||query['filter.availability']||'').toLowerCase();
    if(availability==='in-stock'||availability==='instock')and.push({variants:{some:{isActive:true,OR:[{inventory:{allowBackorder:true}},{warehouseStocks:{some:{onHand:{gt:0}}}}]}}});
    if(availability==='out-of-stock'||availability==='outofstock')and.push({NOT:{variants:{some:{isActive:true,OR:[{inventory:{allowBackorder:true}},{warehouseStocks:{some:{onHand:{gt:0}}}}]}}}});
    for(const [key,raw] of Object.entries(query||{})){
      if(key.startsWith('filter.option.')){
        const option=key.slice('filter.option.'.length);const vals=this.csv(raw);
        if(vals.length)and.push({variants:{some:{isActive:true,optionValues:{some:{optionValue:{presetValueId:{in:vals},option:{presetId:option}}}}}}});
      }else if(key.startsWith('filter.meta.')){
        const code=key.slice('filter.meta.'.length);const [namespace='custom',field]=code.includes('.')?code.split('.',2):['custom',code];const vals=this.csv(raw);
        if(field&&vals.length)and.push({metafields:{some:{definition:{namespace,key:field},OR:vals.map(v=>({value:{equals:v}}))}}});
      }
    }
    return and;
  }
  private async storefrontFacets(storeId:string,where:any,query:any){
    const defs=await this.prisma.storefrontFilterDefinition.findMany({where:{storeId,enabled:true},orderBy:[{position:'asc'},{createdAt:'asc'}]});
    const auto=defs.length?defs:[
      {sourceType:'AVAILABILITY',sourceKey:'availability',label:'Stok Durumu',displayType:'CHECKBOX',selectionMode:'OR'},
      {sourceType:'BRAND',sourceKey:'brand',label:'Marka',displayType:'CHECKBOX',selectionMode:'OR'},
      {sourceType:'PRODUCT_TYPE',sourceKey:'productType',label:'Ürün Tipi',displayType:'CHECKBOX',selectionMode:'OR'},
      {sourceType:'PRICE',sourceKey:'price',label:'Fiyat',displayType:'RANGE',selectionMode:'OR'},
    ] as any[];
    const facets:any[]=[];
    for(const d of auto as any[]){
      const type=String(d.sourceType);
      if(type==='BRAND'){
        const rows:any[]=await this.prisma.product.findMany({where:{...where,brandId:{not:null}},select:{brand:{select:{slug:true,name:true}}}});
        const map=new Map<string,{value:string,label:string,count:number}>();for(const r of rows){const b=r.brand;if(!b)continue;const k=String(b.slug);const old=map.get(k);map.set(k,{value:k,label:b.name,count:(old?.count||0)+1})}
        facets.push({key:'brand',label:d.label,type:d.displayType,selectionMode:d.selectionMode,values:[...map.values()].sort((a,b)=>a.label.localeCompare(b.label))});
      }else if(type==='AVAILABILITY'){
        const [available,total]=await Promise.all([
          this.prisma.product.count({where:{...where,variants:{some:{isActive:true,OR:[{inventory:{allowBackorder:true}},{warehouseStocks:{some:{onHand:{gt:0}}}}]}}}}),
          this.prisma.product.count({where})
        ]);
        facets.push({key:'availability',label:d.label,type:d.displayType,selectionMode:d.selectionMode,values:[{value:'in-stock',label:'Stokta',count:available},{value:'out-of-stock',label:'Stokta Yok',count:Math.max(0,total-available)}]});
      }else if(type==='PRICE'){
        const variants:any[]=await this.prisma.variant.findMany({where:{isActive:true,product:where},select:{price:true,priceCurrency:true}});
        const currencyInfo=query.__currencyInfo;
        const prices=variants.map(v=>currencyInfo?this.variantMoney(v.price,v,currencyInfo):Number(v.price)).filter(Number.isFinite);
        if(prices.length)facets.push({key:'price',label:d.label,type:'RANGE',selectionMode:d.selectionMode,min:Math.min(...prices),max:Math.max(...prices),selectedMin:query.__selectedMin,selectedMax:query.__selectedMax});
      }else if(type==='CATEGORY'){
        const rows:any[]=await this.prisma.productCategory.findMany({where:{product:where,category:{isActive:true}},select:{category:{select:{slug:true,name:true,parentId:true}}}});
        const map=new Map<string,{value:string,label:string,count:number}>();for(const r of rows){const c=r.category;if(!c)continue;const old=map.get(c.slug);map.set(c.slug,{value:c.slug,label:c.name,count:(old?.count||0)+1})}
        facets.push({key:'category',label:d.label,type:d.displayType,selectionMode:d.selectionMode,values:[...map.values()].sort((a,b)=>a.label.localeCompare(b.label))});
      }else if(type==='PRODUCT_TYPE'){
        const rows:any[]=await this.prisma.product.findMany({where:{...where,productType:{not:null}},select:{productType:true}});const map=new Map<string,number>();for(const r of rows){const v=String(r.productType||'').trim();if(v)map.set(v,(map.get(v)||0)+1)}
        facets.push({key:'productType',label:d.label,type:d.displayType,selectionMode:d.selectionMode,values:[...map].map(([value,count])=>({value,label:value,count})).sort((a,b)=>a.label.localeCompare(b.label))});
      }else if(type==='TAG'){
        const rows:any[]=await this.prisma.product.findMany({where,select:{tags:true}});const map=new Map<string,number>();for(const r of rows)for(const tag of r.tags||[])map.set(tag,(map.get(tag)||0)+1);
        facets.push({key:'tag',label:d.label,type:d.displayType,selectionMode:d.selectionMode,values:[...map].map(([value,count])=>({value,label:value,count})).sort((a,b)=>a.label.localeCompare(b.label))});
      }else if(type==='OPTION'){
        const preset=await this.prisma.optionPreset.findFirst({where:{id:String(d.sourceKey),storeId,isActive:true}});
        if(!preset)continue;
        const presetData:any=preset.values||{};
        const locale=String(query.locale||'');
        const presetTranslations:any=presetData.translations||{};
        const title=String(presetTranslations[locale]||preset.name);
        const kinds=String(presetData.displayType||'button').toLowerCase();
        const presetRows:any[]=Array.isArray(presetData.items)?presetData.items:[];
        const byValue=new Map(presetRows.filter(v=>v.id).map(v=>[String(v.id),v]));
        const links:any[]=await this.prisma.variantOptionValue.findMany({
          where:{variant:{isActive:true,product:where},optionValue:{option:{presetId:preset.id},presetValueId:{not:null}}},
          select:{variant:{select:{productId:true}},optionValue:{select:{presetValueId:true,swatch:true,name:true}}}
        });
        const map=new Map<string,Set<string>>();
        for(const link of links){const id=String(link.optionValue.presetValueId||'');if(!byValue.has(id))continue;let products=map.get(id);if(!products){products=new Set();map.set(id,products)}products.add(String(link.variant.productId));}
        const values=presetRows.filter(v=>v.id&&map.has(String(v.id))).map(v=>{
          const id=String(v.id);const label=String(v.translations?.[locale]||v.name||'');
          const color=String(v.color||v.swatch?.color||'');
          return {value:id,label,count:map.get(id)!.size,active:this.csv(query['filter.option.'+preset.id]).includes(id),swatch:/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(color)?{color}:null};
        });
        if(values.length)facets.push({key:`option.${preset.id}`,label:title,type:kinds==='color'?'SWATCH':d.displayType,
          displayType:kinds==='color'?'SWATCH':d.displayType,presentation:kinds==='color'?'swatch':undefined,
          selectionMode:d.selectionMode,values});
      }else if(type==='METAFIELD'){
        const [namespace='custom',field]=String(d.sourceKey).includes('.')?String(d.sourceKey).split('.',2):['custom',String(d.sourceKey)];
        const rows:any[]=await this.prisma.productMetafieldValue.findMany({where:{product:where,definition:{namespace,key:field}},select:{value:true}});
        const map=new Map<string,number>();for(const row of rows){const values=Array.isArray(row.value)?row.value:[row.value];for(const v of values){const s=typeof v==='string'?v:JSON.stringify(v);map.set(s,(map.get(s)||0)+1)}}
        facets.push({key:`meta.${d.sourceKey}`,label:d.label,type:d.displayType,selectionMode:d.selectionMode,values:[...map].map(([value,count])=>({value,label:value,count}))});
      }
    }
    return facets;
  }
  async products(slug: string, query: any) {
    const store = await this.store(slug); const ci = await this.currencyInfo(store, query.currency);
    const page = Math.max(1, Number(query.page || 1)); const limit = Math.min(60, Math.max(1, Number(query.limit || 24)));
    const rawMin=query['filter.v.price.gte']??query.minPrice??query['price.min'];
    const rawMax=query['filter.v.price.lte']??query.maxPrice??query['price.max'];
    const numericPrice=(v:any)=>v!==undefined&&v!==null&&String(v).trim()!==''&&Number.isFinite(Number(String(v).trim().replace(',','.')))?Number(String(v).trim().replace(',','.')):undefined;
    const selectedMin=numericPrice(rawMin),selectedMax=numericPrice(rawMax);
    const minBase=selectedMin===undefined?undefined:selectedMin/ci.rate;
    const maxBase=selectedMax===undefined?undefined:selectedMax/ci.rate;
    let collectionFilter:any={};let collectionMeta:any=null;if(query.collection){const collection:any=await this.prisma.collection.findFirst({where:{storeId:store.id,slug:String(query.collection),isActive:true},include:{rules:{orderBy:{position:'asc'}}}});if(!collection)collectionFilter={id:'__missing_collection__'};else{collectionMeta={id:collection.id,title:collection.title,slug:collection.slug,description:collection.description,mode:collection.mode};collectionFilter=collection.mode==='AUTOMATED'?this.collectionRuleWhere(collection.rules):{collections:{some:{collectionId:collection.id}}};}}
    const categoryScope=await this.categoryScope(store.id,String(query.category||'')||undefined);
    let brandMeta:any=null;const requestedBrands=this.csv(query.brand||query['filter.brand']);if(requestedBrands.length===1){brandMeta=await this.prisma.brand.findFirst({where:{storeId:store.id,slug:requestedBrands[0]},select:{id:true,name:true,slug:true,logoUrl:true,description:true,seoTitle:true,seoDescription:true}});}
    const filterAnd=this.productFilterWhere(query);
    const publicationAnd=this.productPublicationAnd();
    const where: any = { storeId: store.id, status: 'ACTIVE',
      ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }, { tags: { has: query.q } },{variants:{some:{sku:{contains:query.q,mode:'insensitive'}}}}] } : {}),
      ...(categoryScope ? { categories: { some: { categoryId:{in:categoryScope.ids} } } } : {}),
      ...collectionFilter,

      AND:[...publicationAnd,...filterAnd]
    };
    const sort=String(query.sort||'newest');
    let orderBy:any=sort==='oldest'?{createdAt:'asc'}:sort==='name'||sort==='name-asc'?{title:'asc'}:sort==='name-desc'?{title:'desc'}:{createdAt:'desc'};
    let ids:string[]|null=null;
    if(sort==='price-asc'||sort==='price-desc'||selectedMin!==undefined||selectedMax!==undefined){
      // Currency-specific price filtering must happen AFTER conversion from each
      // variant's immutable source currency, before pagination or sorting.
      const candidates:any[]=await this.prisma.product.findMany({where,select:{id:true,variants:{where:{isActive:true},select:{price:true,priceCurrency:true}}},orderBy});
      const rows=candidates.map(p=>{const values=(p.variants||[]).map((v:any)=>this.variantMoney(v.price,v,ci)).filter(Number.isFinite);return {id:p.id,values,price:Math.min(...values,Number.POSITIVE_INFINITY)};});
      const filtered=rows.filter(p=>p.values.some((value:number)=>(selectedMin===undefined||value>=selectedMin)&&(selectedMax===undefined||value<=selectedMax)));
      if(sort==='price-asc'||sort==='price-desc')filtered.sort((a,b)=>sort==='price-asc'?a.price-b.price:b.price-a.price);
      ids=filtered.map(x=>x.id);
    }
    const include:any={brand:true,images:{orderBy:{sortOrder:'asc'}},options:{orderBy:{position:'asc'},include:{values:{orderBy:{position:'asc'}}}},metafields:{include:{definition:true}},variants:{where:{isActive:true},include:{inventory:true,warehouseStocks:true,quantityRule:true,optionValues:{include:{optionValue:{include:{option:true}}}},media:{include:{image:true}},sellingPlans:{include:{sellingPlan:{include:{group:true}}}}}},categories:{include:{category:true}},reviews:{where:{status:'APPROVED'},select:{rating:true}}};
    let items:any[];let total:number;
    if(ids){total=ids.length;const pageIds=ids.slice((page-1)*limit,page*limit);const rows:any[]=await this.prisma.product.findMany({where:{id:{in:pageIds}},include});const pos=new Map(pageIds.map((id,i)=>[id,i]));items=rows.sort((a,b)=>(pos.get(a.id)??0)-(pos.get(b.id)??0));}
    else [items,total]=await Promise.all([this.prisma.product.findMany({where,include,orderBy,skip:(page-1)*limit,take:limit}),this.prisma.product.count({where})]);
    const localized = await this.translateMany(store.id,'product',items,query.locale,store.locale);
    const mapped = localized.map((p: any) => this.presentProduct({ ...p, rating: p.reviews.length ? p.reviews.reduce((a:number,r:any)=>a+r.rating,0)/p.reviews.length : null, reviewCount:p.reviews.length }, ci));
    const facets=query.facets==='0'?[]:await this.storefrontFacets(store.id,where,{...query,__currencyRate:ci.rate,__currencyInfo:ci,__selectedMin:selectedMin,__selectedMax:selectedMax});
    return { items: mapped, currency: ci.code, locale: query.locale || store.locale, category:categoryScope?.category||null, collection:collectionMeta, brand:brandMeta, query:String(query.q||''), facets, pagination: { page, limit, total, pages: Math.ceil(total / limit) },sort };
  }

  async searchSuggest(slug:string,qRaw:string,locale?:string,currency?:string){
    const store=await this.store(slug);const q=String(qRaw||'').trim();if(q.length<2)return{q,products:[],categories:[],collections:[],brands:[],blogPosts:[]};const ci=await this.currencyInfo(store,currency);
    const [products,categories,collections,brands,blogPosts]=await Promise.all([
      this.prisma.product.findMany({where:{storeId:store.id,status:'ACTIVE',AND:this.productPublicationAnd(),OR:[{title:{contains:q,mode:'insensitive'}},{tags:{has:q}},{variants:{some:{sku:{contains:q,mode:'insensitive'}}}}]},include:{images:{orderBy:{sortOrder:'asc'},take:1},variants:{where:{isActive:true},include:{inventory:true,warehouseStocks:true},take:1},brand:true},take:6}),
      this.prisma.category.findMany({where:{storeId:store.id,isActive:true,name:{contains:q,mode:'insensitive'}},select:{id:true,name:true,slug:true,parentId:true},take:6}),
      this.prisma.collection.findMany({where:{storeId:store.id,isActive:true,title:{contains:q,mode:'insensitive'}},select:{id:true,title:true,slug:true},take:6}),
      this.prisma.brand.findMany({where:{storeId:store.id,name:{contains:q,mode:'insensitive'}},select:{id:true,name:true,slug:true,logoUrl:true},take:6}),
      this.prisma.blogPost.findMany({where:{storeId:store.id,status:'PUBLISHED',title:{contains:q,mode:'insensitive'},...(locale?{locale}:{})},select:{id:true,title:true,slug:true,excerpt:true},take:6})
    ]);
    const localized=await this.translateMany(store.id,'product',products,locale,store.locale);
    return{q,products:localized.map((p:any)=>this.presentProduct(p,ci)),categories,collections,brands,blogPosts};
  }

  async category(slug:string,categorySlug:string,query:any){
    const store=await this.store(slug);
    let category=await this.prisma.category.findFirst({
      where:{storeId:store.id,slug:categorySlug,isActive:true},
      select:{id:true,name:true,slug:true,description:true,imageUrl:true,seoTitle:true,seoDescription:true}
    });
    if(!category&&query?.locale){
      const code=String(query.locale).toLowerCase().split(/[-_]/)[0];
      const locales=await this.prisma.storeLocale.findMany({where:{storeId:store.id,isEnabled:true},select:{locale:true}});
      const selected=locales.find(x=>x.locale.toLowerCase().split(/[-_]/)[0]===code)?.locale;
      if(selected){const t=await this.prisma.contentTranslation.findFirst({where:{storeId:store.id,entityType:'category',locale:selected,fields:{path:['slug'],equals:categorySlug}} as any});if(t)category=await this.prisma.category.findFirst({where:{storeId:store.id,id:t.entityId,isActive:true},select:{id:true,name:true,slug:true,description:true,imageUrl:true,seoTitle:true,seoDescription:true}});}
    }
    if(!category)throw new NotFoundException('Category not found');
    const canonicalSlug=category.slug;
    if(query?.locale){const tr=await this.prisma.contentTranslation.findFirst({where:{storeId:store.id,entityType:'category',entityId:category.id,locale:String(query.locale)}});if(tr)category={...category,...(tr.fields as any)};}
    if (!category) throw new NotFoundException('Category not found');
    const resolvedCategory = category;
    const products=await this.products(slug,{...query,category:canonicalSlug});
    return{
      ...products,
      category: resolvedCategory,
      collection:{
        id:resolvedCategory.id,title:resolvedCategory.name,name:resolvedCategory.name,slug:resolvedCategory.slug,handle:resolvedCategory.slug,
        description:resolvedCategory.description||'',
        image:resolvedCategory.imageUrl?{src:resolvedCategory.imageUrl,url:resolvedCategory.imageUrl}:null,
        url:`/products?category=${encodeURIComponent(resolvedCategory.slug)}`,
        products:products.items||[],
        products_count:Number(products?.pagination?.total||0),
        all_products_count:Number(products?.pagination?.total||0)
      }
    };
  }

  async collections(slug:string){const store=await this.store(slug);return this.prisma.collection.findMany({where:{storeId:store.id,isActive:true},select:{id:true,title:true,slug:true,description:true,mode:true,sortOrder:true,_count:{select:{products:true}}},orderBy:[{sortOrder:'asc'},{title:'asc'}]});}
  async brands(slug:string){const store=await this.store(slug);return this.prisma.brand.findMany({where:{storeId:store.id},select:{id:true,name:true,slug:true,logoUrl:true,description:true,seoTitle:true,seoDescription:true,_count:{select:{products:true}}},orderBy:{name:'asc'}});}
  async brand(slug:string,brandSlug:string,query:any){const store=await this.store(slug);const brand=await this.prisma.brand.findFirst({where:{storeId:store.id,slug:brandSlug},select:{id:true,name:true,slug:true,logoUrl:true,description:true,seoTitle:true,seoDescription:true}});if(!brand)throw new NotFoundException('Brand not found');const products=await this.products(slug,{...query,brand:brandSlug});return{...products,brand};}
  async collection(slug:string,collectionSlug:string,query:any){const store=await this.store(slug);let collection=await this.prisma.collection.findFirst({where:{storeId:store.id,slug:collectionSlug,isActive:true},select:{id:true,title:true,slug:true,description:true,mode:true}});if(!collection&&query?.locale){const code=String(query.locale).toLowerCase().split(/[-_]/)[0];const rows=await this.prisma.contentTranslation.findMany({where:{storeId:store.id,entityType:'collection',fields:{path:['slug'],equals:collectionSlug}} as any});const tr=rows.find((x:any)=>String(x.locale||'').toLowerCase().split(/[-_]/)[0]===code);if(tr)collection=await this.prisma.collection.findFirst({where:{storeId:store.id,id:tr.entityId,isActive:true},select:{id:true,title:true,slug:true,description:true,mode:true}});}
    if(!collection)throw new NotFoundException('Collection not found');
    const canonicalSlug=collection.slug;
    if(query?.locale){const tr=await this.prisma.contentTranslation.findFirst({where:{storeId:store.id,entityType:'collection',locale:String(query.locale),entityId:collection.id}});if(tr)collection={...collection,...(tr.fields as any)};}const products=await this.products(slug,{...query,collection:canonicalSlug});return{...products,collection};}

  async productSelection(slug:string, ids:string, currency?:string, locale?:string) {
    const store=await this.store(slug);
    const ci=await this.currencyInfo(store,currency);
    const keys=Array.from(new Set(String(ids||'').split(',').map(x=>x.trim()).filter(Boolean))).slice(0,100);
    if(!keys.length)return{items:[],currency:ci.code,locale:locale||store.locale};
    const items:any[]=await this.prisma.product.findMany({
      where:{storeId:store.id,status:'ACTIVE',AND:this.productPublicationAnd(),OR:[{id:{in:keys}},{slug:{in:keys}}]},
      include:{brand:true,images:{orderBy:{sortOrder:'asc'}},metafields:{include:{definition:true}},variants:{where:{isActive:true},include:{inventory:true,warehouseStocks:true,quantityRule:true,optionValues:{include:{optionValue:{include:{option:true}}}},media:{include:{image:true}},sellingPlans:{include:{sellingPlan:{include:{group:true}}}}}},categories:{include:{category:true}},reviews:{where:{status:'APPROVED'},select:{rating:true}}}
    });
    const localized=await this.translateMany(store.id,'product',items,locale,store.locale);
    const mapped=localized.map((p:any)=>this.presentProduct({...p,rating:p.reviews?.length?p.reviews.reduce((a:number,r:any)=>a+Number(r.rating||0),0)/p.reviews.length:null,reviewCount:p.reviews?.length||0},ci));
    const index=new Map<string,any>();
    for(const p of mapped){index.set(String(p.id),p);if(p.slug)index.set(String(p.slug),p)}
    return{items:keys.map(k=>index.get(k)).filter(Boolean),currency:ci.code,locale:locale||store.locale};
  }

  async product(slug: string, productSlug: string, currency?: string, locale?: string) {
    const store = await this.store(slug); const ci=await this.currencyInfo(store,currency);const include:any={brand:true,images:{orderBy:{sortOrder:'asc'}},options:{orderBy:{position:'asc'},include:{values:{orderBy:{position:'asc'}}}},variants:{where:{isActive:true},include:{inventory:true,warehouseStocks:true,quantityRule:true,optionValues:{include:{optionValue:{include:{option:true}}}},media:{include:{image:true}},sellingPlans:{include:{sellingPlan:{include:{group:true}}}}}},collections:{include:{collection:true}},categories:{include:{category:true}},reviews:{where:{status:'APPROVED'},include:{customer:{select:{firstName:true,lastName:true}}},orderBy:{createdAt:'desc'}}};
    let p:any=await this.prisma.product.findFirst({where:{storeId:store.id,slug:productSlug,status:'ACTIVE',AND:this.productPublicationAnd()},include});
    if(!p&&locale){const code=String(locale).toLowerCase().split(/[-_]/)[0];const trs:any[]=await this.prisma.contentTranslation.findMany({where:{storeId:store.id,entityType:'product',fields:{path:['slug'],equals:productSlug}} as any});const hit=trs.find((row:any)=>String(row.locale||'').toLowerCase().split(/[-_]/)[0]===code);if(hit)p=await this.prisma.product.findFirst({where:{id:hit.entityId,storeId:store.id,status:'ACTIVE',AND:this.productPublicationAnd()},include});}
    if (!p) throw new NotFoundException('Product not found'); if(!(await this.appEnabled(store.id,'product-reviews')))p.reviews=[]; const [localized]=await this.translateMany(store.id,'product',[p],locale,store.locale); return this.presentProduct(localized,ci);
  }
  async page(slug: string, pageSlug: string, locale?: string) { const s = await this.store(slug); const p = await this.pageByLocalizedSlug(s,pageSlug,locale); if (!p) throw new NotFoundException('Page not found'); return this.presentPage(s,p,locale); }
  async legal(slug:string,type:string,locale?:string){ const s=await this.store(slug); const mappings:any=(s.settings as any)?.contractPages||{};const pageId=mappings[type];if(pageId){const p=await this.prisma.page.findFirst({where:{id:String(pageId),storeId:s.id,status:'PUBLISHED'}});if(p){const localized=await this.presentPage(s,p,locale);return{type,locale:locale||s.locale,version:'page-'+p.updatedAt.toISOString(),title:localized.title,body:localized.body,slug:localized.slug||p.slug,href:'/pages/'+encodeURIComponent(localized.slug||p.slug)+'?locale='+encodeURIComponent(locale||s.locale),publishedAt:p.updatedAt};}}return this.prisma.legalDocument.findFirst({ where:{storeId:s.id,type:type as any,isActive:true,...(locale?{locale}:{})},orderBy:{publishedAt:'desc'} }); }

  private customerPublicBase(store:any){const domain=String(store?.domain||'').trim().replace(/^https?:\/\//,'').replace(/\/.*$/,'');return domain?`https://${domain}`:`https://${store.slug}.ticarti.com`;}
  private async issueCustomerActionToken(customer:any,type:'VERIFY_EMAIL'|'RESET_PASSWORD',ttlMinutes:number){
    const token=randomBytes(32).toString('base64url'),tokenHash=this.tokenHash(token),expiresAt=new Date(Date.now()+ttlMinutes*60000);
    await this.prisma.customerActionToken.deleteMany({where:{customerId:customer.id,type,usedAt:null}});
    await this.prisma.customerActionToken.create({data:{customerId:customer.id,type,tokenHash,expiresAt}});
    return token;
  }
  private async sendVerification(customer:any,store:any){
    const token=await this.issueCustomerActionToken(customer,'VERIFY_EMAIL',24*60);
    const url=`${this.customerPublicBase(store)}/verify-email?token=${encodeURIComponent(token)}`;
    await this.email.sendTransactional({tenantId:store.id,to:customer.email,subject:'E-posta adresinizi doğrulayın',text:`Hesabınızı doğrulamak için bağlantıyı açın:\n${url}\n\nBağlantı 24 saat geçerlidir.`});
  }
  private b2bPolicy(settings:any){const raw:any=settings?.b2bPolicy||{};const price=['EVERYONE','LOGIN_REQUIRED','HIDDEN'].includes(String(raw.priceVisibility))?String(raw.priceVisibility):'EVERYONE';const approval=['AUTO','MANUAL'].includes(String(raw.approvalMode))?String(raw.approvalMode):'AUTO';return{enabled:!!raw.enabled,registrationEnabled:raw.registrationEnabled!==false,approvalMode:approval,priceVisibility:price,quoteEnabled:!!raw.quoteEnabled,quoteOnly:!!raw.quoteOnly,quoteRequireLogin:raw.quoteRequireLogin!==false,defaultPaymentTermsDays:Math.max(0,Math.min(365,Number(raw.defaultPaymentTermsDays||0)))}};
  async publicB2BConfig(slug:string){const store=await this.store(slug);return this.b2bPolicy(store.settings);}
  private async b2bMembership(customerId:string){return this.prisma.b2BBuyer.findFirst({where:{customerId},include:{company:true},orderBy:{createdAt:'asc'}});}
  async createB2BQuote(slug:string,body:any,customerId?:string){
    const store=await this.store(slug);
    const policy=this.b2bPolicy(store.settings);
    if(!policy.enabled||!policy.quoteEnabled)throw new BadRequestException('B2B teklif talepleri aktif değil');
    let customer:any=null,membership:any=null;
    if(customerId){
      customer=await this.prisma.customer.findFirst({where:{id:customerId,storeId:store.id,isActive:true}});
      if(customer)membership=await this.b2bMembership(customer.id);
    }
    if(policy.quoteRequireLogin&&(!membership||membership.company.status!=='ACTIVE'))throw new ForbiddenException('Teklif göndermek için onaylı B2B hesabıyla giriş yapmalısınız');
    const productSlug=String(body?.productSlug||'').trim();
    const product=productSlug?await this.prisma.product.findFirst({where:{storeId:store.id,slug:productSlug,status:'ACTIVE'},select:{id:true,title:true,slug:true}}):null;
    const quantity=Math.max(1,Math.min(100000,Math.floor(Number(body?.quantity||1))));
    const note=String(body?.note||'').trim().slice(0,5000);
    const email=String(customer?.email||body?.email||'').trim().toLowerCase();
    const phone=String(customer?.phone||body?.phone||'').trim()||null;
    const companyName=String(membership?.company?.name||body?.companyName||'').trim()||null;
    if(!email)throw new BadRequestException('E-posta gerekli');
    return this.prisma.b2BQuoteRequest.create({data:{
      storeId:store.id,
      customerId:customer?.id||null,
      companyId:membership?.company?.id||null,
      productId:product?.id||null,
      email,
      phone,
      companyName,
      quantity,
      subject:`B2B Teklif Talebi${product?.title?` · ${product.title}`:''}`,
      message:note||null,
      payload:{productSlug:product?.slug||productSlug||null,productName:product?.title||String(body?.productName||'').trim()||null},
      status:'NEW'
    }});
  }
  async createB2BQuoteByCustomer(customerId:string,body:any){const customer=await this.prisma.customer.findUnique({where:{id:customerId},select:{storeId:true}});if(!customer)throw new NotFoundException('Customer not found');const store=await this.prisma.tenant.findUnique({where:{id:customer.storeId},select:{slug:true}});if(!store?.slug)throw new NotFoundException('Store not found');return this.createB2BQuote(store.slug,body,customerId);}

  async customerRegister(slug: string, body: any, req?: any) {
    const store = await this.store(slug); const email = String(body.email || '').trim().toLowerCase(); const pw=String(body.password||'');
    if (!email || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(pw)) throw new BadRequestException('Valid email and a 10+ character password with upper/lower/number are required');
    const phone=String(body.phone||'').trim().replace(/[\s().-]/g,'');
    if(!/^\+?[0-9]{10,15}$/.test(phone))throw new BadRequestException('A valid phone number is required (10–15 digits)');
    if(body.consents?.terms!==true||body.consents?.privacy!==true||body.consents?.kvkkNotice!==true)throw new BadRequestException('Registration requires membership terms, privacy and KVKK acknowledgements');
    const versions=body.consentVersions||{};
    for(const [kind,key] of [['membership','terms'],['privacy','privacy'],['kvkk','kvkkNotice']] as const){const document=await this.legal(slug,kind,String(body.legalLocale||store.locale||'tr'));if(!document?.version||versions[key]!==document.version)throw new BadRequestException('Legal documents must be reviewed again before registration');}
    const c=body.consents||{};const v=body.consentVersions||{};const hasChannel=c.emailMarketing===true||c.smsMarketing===true||c.phoneMarketing===true;
    if(hasChannel&&c.commercialElectronic!==true)throw new BadRequestException('Commercial electronic messaging consent is required for selected channels');
    if(c.commercialElectronic===true){const doc=await this.legal(slug,'commercialElectronic',String(body.legalLocale||store.locale||'tr'));if(!doc?.version||doc.version!==v.commercialElectronic)throw new BadRequestException('Commercial electronic communication document must be reviewed');}
    if(c.kvkkExplicit===true){const doc=await this.legal(slug,'marketingExplicit',String(body.legalLocale||store.locale||'tr'));if(!doc?.version||doc.version!==v.kvkkExplicit)throw new BadRequestException('Marketing explicit consent document must be reviewed');}
    if(hasChannel){for(const channel of ['emailMarketing','smsMarketing','phoneMarketing'])if(c[channel]===true&&v[channel]!==v.commercialElectronic)throw new BadRequestException('Marketing channel document version mismatch');}
    const policy=this.b2bPolicy(store.settings);const wantsB2B=policy.enabled;
    if(policy.enabled&&!policy.registrationEnabled)throw new BadRequestException('Bu B2B mağazada yeni firma hesabı kaydı kapalı');
    const companyName=String(body.companyName||'').trim();const taxNumber=String(body.taxNumber||'').replace(/\s+/g,'').trim();const taxOffice=String(body.taxOffice||'').trim();if(wantsB2B&&!companyName)throw new BadRequestException('Firma adı gerekli');
    const existing = await this.prisma.customer.findUnique({ where: { storeId_email: { storeId: store.id, email } } });
    if(existing?.passwordHash)throw new BadRequestException('An account already exists for this email. Please sign in or use password reset.');
    const hash = await bcrypt.hash(pw, 12);
    const customer = await this.prisma.$transaction(async tx=>{const row=existing?await tx.customer.update({where:{id:existing.id},data:{passwordHash:hash,firstName:body.firstName||existing.firstName,lastName:body.lastName||existing.lastName,phone,emailVerifiedAt:null,isActive:false,customerType:wantsB2B?'COMPANY':existing.customerType,companyName:wantsB2B?companyName:existing.companyName,taxNumber:wantsB2B?(taxNumber||null):existing.taxNumber,taxOffice:wantsB2B?(taxOffice||null):existing.taxOffice}}):await tx.customer.create({data:{storeId:store.id,email,passwordHash:hash,firstName:body.firstName,lastName:body.lastName,phone,emailVerifiedAt:null,isActive:false,customerType:wantsB2B?'COMPANY':'PERSON',companyName:wantsB2B?companyName:null,taxNumber:wantsB2B?(taxNumber||null):null,taxOffice:wantsB2B?(taxOffice||null):null}});if(wantsB2B){let company=taxNumber?await tx.b2BCompany.findFirst({where:{storeId:store.id,taxNumber}}):null;if(!company)company=await tx.b2BCompany.create({data:{storeId:store.id,name:companyName,taxNumber:taxNumber||null,status:policy.approvalMode==='AUTO'?'ACTIVE':'PENDING',defaultPriceListId:null,paymentTermsDays:policy.defaultPaymentTermsDays,currency:store.currency,metadata:{source:'self_registration',taxOffice}}});await tx.b2BBuyer.upsert({where:{companyId_customerId:{companyId:company.id,customerId:row.id}},create:{companyId:company.id,customerId:row.id,role:'BUYER',permissions:[]},update:{}});}return row;});
    await this.recordConsents(store.id, customer.id, email, body.consents || {}, body.consentVersions || {}, req);await this.sendVerification(customer,store);return {verificationRequired:true,email:customer.email,b2b:wantsB2B};
  }
  async requestCustomerEmailVerification(slug:string,emailInput:string){
    const store=await this.store(slug);const email=String(emailInput||'').trim().toLowerCase();const customer=await this.prisma.customer.findUnique({where:{storeId_email:{storeId:store.id,email}}});
    if(customer&&!customer.emailVerifiedAt&&customer.passwordHash){
      const latest=await this.prisma.customerActionToken.findFirst({where:{customerId:customer.id,type:'VERIFY_EMAIL',usedAt:null},orderBy:{createdAt:'desc'}});
      if(!latest||Date.now()-new Date(latest.createdAt).getTime()>=60000){
        await this.sendVerification(customer,store).catch((err:any)=>{console.error('Verification delivery failed',err?.name||'error')});
      }
    }
    return {accepted:true};
  }
  async verifyCustomerEmail(slug:string,token:string){
    const store=await this.store(slug);const row=await this.prisma.customerActionToken.findFirst({where:{tokenHash:this.tokenHash(String(token||'')),type:'VERIFY_EMAIL',usedAt:null,expiresAt:{gt:new Date()}},include:{customer:true}});
    if(!row||row.customer.storeId!==store.id)throw new BadRequestException('Verification link is invalid or expired');
    const verifiedAt=new Date();
    const customer=await this.prisma.$transaction(async (tx:any)=>{
      const used=await tx.customerActionToken.updateMany({where:{id:row.id,usedAt:null,expiresAt:{gt:verifiedAt}},data:{usedAt:verifiedAt}});
      if(used.count!==1)throw new BadRequestException('Verification link is invalid or expired');
      // Do not automatically re-enable an already verified account disabled by staff.
      if(row.customer.emailVerifiedAt)throw new BadRequestException('Account is not awaiting verification');
      return tx.customer.update({where:{id:row.customerId},data:{emailVerifiedAt:verifiedAt,isActive:true}});
    });
    return this.customerToken(customer);
  }
  async requestCustomerPasswordReset(slug:string,emailInput:string){
    const store=await this.store(slug);const email=String(emailInput||'').trim().toLowerCase();const customer=await this.prisma.customer.findUnique({where:{storeId_email:{storeId:store.id,email}}});
    if(customer?.isActive){
      const token=await this.issueCustomerActionToken(customer,'RESET_PASSWORD',60);const url=`${this.customerPublicBase(store)}/reset-password?token=${encodeURIComponent(token)}`;
      await this.email.sendTransactional({tenantId:store.id,to:customer.email,subject:'Şifrenizi sıfırlayın',text:`Şifrenizi sıfırlamak için bağlantıyı açın:\n${url}\n\nBağlantı 60 dakika geçerlidir.`}).catch(()=>undefined);
    }
    return {accepted:true};
  }
  async resetCustomerPassword(slug:string,token:string,password:string){
    const store=await this.store(slug);const pw=String(password||'');if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(pw))throw new BadRequestException('Password must be 10+ characters with upper/lower/number');
    const row=await this.prisma.customerActionToken.findFirst({where:{tokenHash:this.tokenHash(String(token||'')),type:'RESET_PASSWORD',usedAt:null,expiresAt:{gt:new Date()}},include:{customer:true}});
    if(!row||row.customer.storeId!==store.id)throw new BadRequestException('Reset link is invalid or expired');
    await this.prisma.$transaction([this.prisma.customer.update({where:{id:row.customerId},data:{passwordHash:await bcrypt.hash(pw,12)}}),this.prisma.customerActionToken.update({where:{id:row.id},data:{usedAt:new Date()}}),this.prisma.customerSession.updateMany({where:{customerId:row.customerId,revokedAt:null},data:{revokedAt:new Date()}})]);
    return {reset:true};
  }
  async customerLogin(slug: string, body: any) { const store=await this.store(slug); const submittedPhone=String(body.phone||'').trim();
    let customer:any;
    if(submittedPhone){
      // Only E.164, scoped to this store. Never choose arbitrarily among duplicates.
      if(!/^\+[1-9]\d{7,14}$/.test(submittedPhone))throw new UnauthorizedException('Invalid credentials');
      const matches=await this.prisma.customer.findMany({where:{storeId:store.id,phone:submittedPhone},take:2});
      if(matches.length!==1)throw new UnauthorizedException('Invalid credentials');
      customer=matches[0];
    }else{
      const submittedEmail=String(body.email||'').trim().toLowerCase();
      if(!submittedEmail)throw new UnauthorizedException('Invalid credentials');
      customer=await this.prisma.customer.findUnique({where:{storeId_email:{storeId:store.id,email:submittedEmail}}});
    } if(!customer?.passwordHash||!(await bcrypt.compare(String(body.password||''),customer.passwordHash))) throw new UnauthorizedException('Invalid credentials'); if(!customer.emailVerifiedAt)throw new UnauthorizedException({code:'EMAIL_VERIFICATION_REQUIRED',message:'Email verification required'}); if(!customer.isActive) throw new UnauthorizedException('Customer account disabled'); return this.customerToken(customer); }
  private async customerToken(customer:any){ const refreshToken=randomBytes(48).toString('base64url'); const session=await this.prisma.customerSession.create({data:{customerId:customer.id,refreshTokenHash:this.tokenHash(refreshToken),expiresAt:new Date(Date.now()+30*86400000)}}); await this.prisma.control().tenantRouteKey.upsert({where:{kind_routeKey:{kind:'CUSTOMER_SESSION',routeKey:session.id}},create:{kind:'CUSTOMER_SESSION',routeKey:session.id,tenantId:customer.storeId,expiresAt:session.expiresAt},update:{tenantId:customer.storeId,expiresAt:session.expiresAt}}); const accessToken=await this.jwt.signAsync({sub:customer.id,storeId:customer.storeId,email:customer.email,kind:'customer',sid:session.id},{expiresIn:'15m'}); return {accessToken,refreshToken,expiresIn:900,customer:{id:customer.id,email:customer.email,firstName:customer.firstName,lastName:customer.lastName,phone:customer.phone,emailVerifiedAt:customer.emailVerifiedAt||null}}; }
  async customerSession(refreshToken:string){ const h=this.tokenHash(refreshToken); const s=await this.prisma.customerSession.findFirst({where:{refreshTokenHash:h,revokedAt:null,expiresAt:{gt:new Date()}},include:{customer:true}}); if(!s||!s.customer.isActive||!s.customer.emailVerifiedAt) throw new UnauthorizedException('Invalid customer session'); await this.prisma.customerSession.update({where:{id:s.id},data:{lastUsedAt:new Date()}}); const membership=await this.b2bMembership(s.customer.id);const accessToken=await this.jwt.signAsync({sub:s.customer.id,storeId:s.customer.storeId,email:s.customer.email,kind:'customer',sid:s.id},{expiresIn:'15m'}); return {accessToken,expiresIn:900,customer:{id:s.customer.id,email:s.customer.email,firstName:s.customer.firstName,lastName:s.customer.lastName,phone:s.customer.phone,emailVerifiedAt:s.customer.emailVerifiedAt||null,b2b:membership?{companyId:membership.companyId,companyName:membership.company.name,status:membership.company.status,role:membership.role}:null}}; }
  async customerRefresh(refreshToken:string){ const h=this.tokenHash(refreshToken); const s=await this.prisma.customerSession.findFirst({where:{refreshTokenHash:h,revokedAt:null,expiresAt:{gt:new Date()}},include:{customer:true}}); if(!s||!s.customer.isActive||!s.customer.emailVerifiedAt) throw new UnauthorizedException('Invalid refresh token'); const next=randomBytes(48).toString('base64url'); await this.prisma.customerSession.update({where:{id:s.id},data:{refreshTokenHash:this.tokenHash(next),lastUsedAt:new Date()}}); const accessToken=await this.jwt.signAsync({sub:s.customer.id,storeId:s.customer.storeId,email:s.customer.email,kind:'customer',sid:s.id},{expiresIn:'15m'}); return {accessToken,refreshToken:next,expiresIn:900}; }
  async customerLogout(refreshToken:string){ await this.prisma.customerSession.updateMany({where:{refreshTokenHash:this.tokenHash(refreshToken),revokedAt:null},data:{revokedAt:new Date()}}); return {loggedOut:true}; }

  async me(customerId:string){const c=await this.prisma.customer.findUnique({where:{id:customerId},include:{addresses:{orderBy:[{isDefault:'desc'},{createdAt:'desc'}]},loyaltyAccount:true}});if(!c)throw new NotFoundException();const [rows,membership]=await Promise.all([this.prisma.consentRecord.findMany({where:{customerId,type:{in:['MARKETING_EMAIL','MARKETING_SMS','MARKETING_PHONE']}},orderBy:{createdAt:'desc'},take:30}),this.b2bMembership(customerId)]);const latest:any={};for(const r of rows as any[]){if(latest[r.type]===undefined)latest[r.type]=!!r.granted}const{passwordHash,...safe}=c as any;return{...safe,b2b:membership?{companyId:membership.companyId,companyName:membership.company.name,status:membership.company.status,role:membership.role,paymentTermsDays:membership.company.paymentTermsDays,creditLimit:membership.company.creditLimit,defaultPriceListId:membership.company.defaultPriceListId}:null,marketingPreferences:{email:latest.MARKETING_EMAIL??!!c.acceptsMarketing,sms:latest.MARKETING_SMS??false,phone:latest.MARKETING_PHONE??false}};}
  async updateMe(customerId:string,body:any){const c=await this.prisma.customer.findUnique({where:{id:customerId}});if(!c)throw new NotFoundException();const data:any={};for(const k of ['firstName','lastName','phone'])if(body[k]!==undefined)data[k]=body[k];return this.prisma.customer.update({where:{id:customerId},data,select:{id:true,email:true,emailVerifiedAt:true,firstName:true,lastName:true,phone:true,acceptsMarketing:true,updatedAt:true}});}
  async changeCustomerPassword(customerId:string,body:any,currentSessionId?:string){const c=await this.prisma.customer.findUnique({where:{id:customerId}});if(!c?.passwordHash)throw new BadRequestException('Password login is not available for this account');const current=String(body?.currentPassword||''),next=String(body?.newPassword||'');if(!(await bcrypt.compare(current,c.passwordHash)))throw new UnauthorizedException('Current password is incorrect');if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(next))throw new BadRequestException('Password must be 10+ characters with upper/lower/number');if(await bcrypt.compare(next,c.passwordHash))throw new BadRequestException('New password must be different');await this.prisma.customer.update({where:{id:customerId},data:{passwordHash:await bcrypt.hash(next,12)}});if(body?.logoutOtherSessions!==false)await this.prisma.customerSession.updateMany({where:{customerId,revokedAt:null,...(currentSessionId?{id:{not:currentSessionId}}:{})},data:{revokedAt:new Date()}});return{changed:true};}
  async customerSessions(customerId:string,currentSessionId?:string){const rows=await this.prisma.customerSession.findMany({where:{customerId,revokedAt:null,expiresAt:{gt:new Date()}},select:{id:true,createdAt:true,lastUsedAt:true,expiresAt:true},orderBy:{lastUsedAt:'desc'}});return rows.map(x=>({...x,current:x.id===currentSessionId}));}
  async revokeCustomerSession(customerId:string,sessionId:string){const row=await this.prisma.customerSession.findFirst({where:{id:sessionId,customerId}});if(!row)throw new NotFoundException('Session not found');if(!row.revokedAt)await this.prisma.customerSession.update({where:{id:row.id},data:{revokedAt:new Date()}});return{revoked:true};}
  async revokeOtherCustomerSessions(customerId:string,currentSessionId?:string){const r=await this.prisma.customerSession.updateMany({where:{customerId,revokedAt:null,...(currentSessionId?{id:{not:currentSessionId}}:{})},data:{revokedAt:new Date()}});return{revoked:r.count};}
  async customerLoyalty(customerId:string){const c=await this.prisma.customer.findUnique({where:{id:customerId},select:{storeId:true}});if(!c)throw new NotFoundException();const [program,account]=await Promise.all([this.prisma.loyaltyProgram.findUnique({where:{storeId:c.storeId}}),this.prisma.loyaltyAccount.findUnique({where:{customerId},include:{transactions:{orderBy:{createdAt:'desc'},take:100}}})]);const tiers=Array.isArray((program?.settings as any)?.tiers)?(program!.settings as any).tiers:[];const lifetime=Number(account?.lifetimePoints||0);const tier=tiers.filter((x:any)=>Number(x?.minPoints||0)<=lifetime).sort((a:any,b:any)=>Number(b?.minPoints||0)-Number(a?.minPoints||0))[0]||null;const nextTier=tiers.filter((x:any)=>Number(x?.minPoints||0)>lifetime).sort((a:any,b:any)=>Number(a?.minPoints||0)-Number(b?.minPoints||0))[0]||null;return{enabled:!!program?.enabled,program:program?{programName:program.programName,redemptionRate:program.redemptionRate,minimumRedeemPoints:program.minimumRedeemPoints,pointsExpireDays:program.pointsExpireDays,tiers}:null,account:account?{points:account.points,lifetimePoints:account.lifetimePoints,tier,nextTier,transactions:account.transactions}:{points:0,lifetimePoints:0,tier,nextTier,transactions:[]}};}
  async customerBenefits(customerId:string){const c=await this.prisma.customer.findUnique({where:{id:customerId},select:{storeId:true,groupId:true,tags:true}});if(!c)throw new NotFoundException();const now=new Date();const promos=await this.prisma.promotion.findMany({where:{storeId:c.storeId,status:'ACTIVE',AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{endsAt:null},{endsAt:{gte:now}}]}]},include:{codes:{where:{isActive:true},select:{code:true,usageLimit:true,usageCount:true}}},orderBy:[{priority:'asc'},{createdAt:'desc'}]});const eligible=promos.filter((p:any)=>{const e:any=p.customerEligibility||{};const groups=Array.isArray(e.customerGroupIds)?e.customerGroupIds.map(String):[];if(groups.length&&!groups.includes(String(c.groupId||'')))return false;const include=Array.isArray(e.includeTags)?e.includeTags.map(String):[];if(include.length&&!include.some((t:string)=>c.tags.includes(t)))return false;const exclude=Array.isArray(e.excludeTags)?e.excludeTags.map(String):[];if(exclude.some((t:string)=>c.tags.includes(t)))return false;return true;}).map((p:any)=>({id:p.id,name:p.name,description:p.description,activation:p.activation,startsAt:p.startsAt,endsAt:p.endsAt,codes:p.activation==='COUPON'?p.codes.filter((x:any)=>!x.usageLimit||x.usageCount<x.usageLimit).map((x:any)=>x.code):[],conditionsApplyAtCheckout:true}));const used=await this.prisma.promotionRedemption.findMany({where:{customerId},include:{promotion:{select:{name:true}},order:{select:{number:true,currency:true}}},orderBy:{createdAt:'desc'},take:100});return{eligible,used};}
  async updateCustomerMarketingPreferences(customerId:string,body:any,req?:any){const c=await this.prisma.customer.findUnique({where:{id:customerId}});if(!c)throw new NotFoundException();const email=!!body?.email,sms=!!body?.sms,phone=!!body?.phone;await this.recordConsents(c.storeId,c.id,c.email,{emailMarketing:email,smsMarketing:sms,phoneMarketing:phone},{},req);return this.prisma.customer.update({where:{id:c.id},data:{acceptsMarketing:email||sms||phone},select:{id:true,acceptsMarketing:true}});}
  async createCustomerPrivacyRequest(customerId:string,body:any){const c=await this.prisma.customer.findUnique({where:{id:customerId}});if(!c)throw new NotFoundException();const allowed=new Set(['ACCESS','DELETE','RECTIFY','PORTABILITY','RESTRICT','OBJECT']);const type=String(body?.type||'').toUpperCase();if(!allowed.has(type))throw new BadRequestException('Invalid privacy request type');const active=await this.prisma.privacyRequest.findFirst({where:{customerId,type:type as any,status:{in:['RECEIVED','VERIFYING','IN_PROGRESS'] as any}}});if(active)throw new BadRequestException('A matching privacy request is already in progress');return this.prisma.privacyRequest.create({data:{storeId:c.storeId,customerId:c.id,email:c.email,type:type as any,status:'RECEIVED',requestData:body?.requestData||{},dueAt:new Date(Date.now()+30*86400000)}});}
  async addAddress(customerId:string,body:any){return this.prisma.$transaction(async tx=>{if(body.isDefault)await tx.customerAddress.updateMany({where:{customerId},data:{isDefault:false}});const hasDefault=await tx.customerAddress.count({where:{customerId,isDefault:true}});return tx.customerAddress.create({data:{customerId,title:body.title,firstName:body.firstName,lastName:body.lastName,phone:body.phone,company:body.company,address1:body.address1,address2:body.address2,district:body.district,city:body.city,state:body.state,postalCode:body.postalCode,country:body.country||'TR',admin1Id:body.admin1Id||null,admin2Id:body.admin2Id||null,localityId:body.localityId||null,neighborhoodId:body.neighborhoodId||null,isDefault:!!body.isDefault||hasDefault===0}})},{isolationLevel:'Serializable'} as any);}
  async updateAddress(customerId:string,addressId:string,body:any){return this.prisma.$transaction(async tx=>{const current=await tx.customerAddress.findFirst({where:{id:addressId,customerId}});if(!current)throw new NotFoundException('Address not found');if(body.isDefault)await tx.customerAddress.updateMany({where:{customerId,id:{not:addressId}},data:{isDefault:false}});const data:any={};for(const k of ['title','firstName','lastName','phone','company','address1','address2','district','city','state','postalCode','country','admin1Id','admin2Id','localityId','neighborhoodId','isDefault'])if(body[k]!==undefined)data[k]=body[k];return tx.customerAddress.update({where:{id:addressId},data})},{isolationLevel:'Serializable'} as any);}
  async deleteAddress(customerId:string,addressId:string){return this.prisma.$transaction(async tx=>{const row=await tx.customerAddress.findFirst({where:{id:addressId,customerId}});if(!row)throw new NotFoundException('Address not found');await tx.customerAddress.delete({where:{id:addressId}});if(row.isDefault){const next=await tx.customerAddress.findFirst({where:{customerId},orderBy:{createdAt:'desc'}});if(next)await tx.customerAddress.update({where:{id:next.id},data:{isDefault:true}})}return{deleted:true}},{isolationLevel:'Serializable'} as any);}
  private customerCancelPolicy(order:any,settings:any){
    const policy:any=settings?.orderCheckoutPolicy||{};
    const enabled=policy.allowCustomerCancel===true;
    const windowMinutes=Math.max(0,Number(policy.cancelWindowMinutes??30));
    const ageMinutes=Math.max(0,(Date.now()-new Date(order.createdAt).getTime())/60000);
    const fulfillmentStarted=String(order.fulfillmentStatus)!=='UNFULFILLED'||Number(order?.items?.some?.((x:any)=>Number(x.fulfilledQuantity||0)>0)||0)>0;
    const terminal=['CANCELLED','REFUNDED','FULFILLED'].includes(String(order.status));
    const paid=['PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(String(order.paymentStatus));
    let reason:string|null=null;
    if(!enabled)reason='CUSTOMER_CANCEL_DISABLED';
    else if(terminal)reason='ORDER_NOT_CANCELLABLE';
    else if(fulfillmentStarted)reason='FULFILLMENT_STARTED';
    else if(paid)reason='PAYMENT_ALREADY_CAPTURED';
    else if(windowMinutes>0&&ageMinutes>windowMinutes)reason='CANCEL_WINDOW_EXPIRED';
    return{enabled,windowMinutes,canCancel:reason===null,reason};
  }

  async cancelCustomerOrder(customerId:string,orderId:string,body:any={}){
    const order:any=await this.prisma.order.findFirst({
      where:{id:orderId,customerId},
      include:{items:true,store:{select:{settings:true}}}
    });
    if(!order)throw new NotFoundException('Order not found');
    const eligibility=this.customerCancelPolicy(order,order.store?.settings||{});
    if(!eligibility.canCancel){
      const messages:any={
        CUSTOMER_CANCEL_DISABLED:'Customer order cancellation is disabled',
        ORDER_NOT_CANCELLABLE:'Order cannot be cancelled',
        FULFILLMENT_STARTED:'Order fulfillment has already started',
        PAYMENT_ALREADY_CAPTURED:'Paid orders require a refund or return flow',
        CANCEL_WINDOW_EXPIRED:'Order cancellation window has expired'
      };
      throw new BadRequestException({code:eligibility.reason,message:messages[eligibility.reason||'']||'Order cannot be cancelled'});
    }

    const reason=String(body?.reason||'Customer requested cancellation').trim().slice(0,500)||'Customer requested cancellation';

    return this.prisma.$transaction(async tx=>{
      const current:any=await tx.order.findFirst({
        where:{id:orderId,customerId},
        include:{items:true,store:{select:{settings:true}},inventoryReservations:true}
      });
      if(!current)throw new NotFoundException('Order not found');

      const liveEligibility=this.customerCancelPolicy(current,current.store?.settings||{});
      if(!liveEligibility.canCancel){
        const messages:any={
          CUSTOMER_CANCEL_DISABLED:'Customer order cancellation is disabled',
          ORDER_NOT_CANCELLABLE:'Order cannot be cancelled',
          FULFILLMENT_STARTED:'Order fulfillment has already started',
          PAYMENT_ALREADY_CAPTURED:'Paid orders require a refund or return flow',
          CANCEL_WINDOW_EXPIRED:'Order cancellation window has expired'
        };
        throw new BadRequestException({code:liveEligibility.reason,message:messages[liveEligibility.reason||'']||'Order cannot be cancelled'});
      }

      const reservations=(current.inventoryReservations||[]).filter((x:any)=>String(x.status)==='HELD');
      for(const reservation of reservations){
        const stock:any=await tx.warehouseStock.findUnique({
          where:{warehouseId_variantId:{warehouseId:reservation.warehouseId,variantId:reservation.variantId}}
        });
        if(stock){
          const qty=Math.max(0,Number(reservation.quantity||0)-Number(reservation.fulfilledQuantity||0));
          const release=Math.min(Number(stock.reserved||0),qty);
          if(release>0){
            await tx.warehouseStock.update({
              where:{id:stock.id},
              data:{reserved:{decrement:release}}
            });
          }
        }
        await tx.inventoryReservation.update({
          where:{id:reservation.id},
          data:{status:'RELEASED',expiresAt:null,metadata:{...((reservation.metadata as any)||{}),releasedBy:'customer_cancel',releasedAt:new Date().toISOString()}}
        });
      }

      const existingMeta:any=current.metadata||{};
      const updated=await tx.order.update({
        where:{id:orderId},
        data:{
          status:'CANCELLED',
          metadata:{
            ...existingMeta,
            customerCancellation:{
              customerId,
              reason,
              cancelledAt:new Date().toISOString()
            }
          }
        }
      });

      await tx.orderStatusHistory.create({
        data:{orderId,status:'CUSTOMER_CANCELLED',note:reason}
      });

      return{
        order:updated,
        cancellation:{cancelled:true,reason,windowMinutes:liveEligibility.windowMinutes}
      };
    },{isolationLevel:'Serializable'} as any);
  }

  async myOrders(customerId:string){return this.prisma.order.findMany({where:{customerId},select:{id:true,number:true,status:true,paymentStatus:true,fulfillmentStatus:true,currency:true,grandTotal:true,createdAt:true,items:{select:{id:true,title:true,variantTitle:true,quantity:true,unitPrice:true,total:true}},shipments:{select:{id:true,provider:true,carrierName:true,carrierLogoUrl:true,trackingCode:true,trackingUrl:true,status:true,deliveredAt:true}}},orderBy:{createdAt:'desc'},take:100});}
  async myOrder(customerId:string,orderId:string){const row=await this.prisma.order.findFirst({where:{id:orderId,customerId},include:{items:true,statusHistory:{orderBy:{createdAt:'asc'}},shipments:{include:{events:{orderBy:{occurredAt:'desc'}}}},returns:{include:{items:true}}}});if(!row)throw new NotFoundException('Order not found');const [documents,store]=await Promise.all([this.prisma.eDocument.findMany({where:{storeId:row.storeId,orderId:row.id,direction:'OUTGOING'},select:{id:true,type:true,status:true,documentNumber:true,uuid:true,issueDate:true,totalGross:true,currency:true,provider:true},orderBy:{createdAt:'desc'}}),this.prisma.tenant.findUnique({where:{id:row.storeId},select:{settings:true}})]);const rp:any=(store?.settings as any)?.returnPolicy||{};const returnPolicy={returnWindowDays:Number(rp.returnWindowDays||14),corporateInvoiceRequired:rp.corporateInvoiceRequired!==false,reasons:Array.isArray(rp.reasons)&&rp.reasons.length?rp.reasons:[{code:'CHANGE_OF_MIND',label:'Fikir değişikliği',active:true},{code:'DAMAGED',label:'Hasarlı ürün',active:true,requiresImages:true},{code:'WRONG_ITEM',label:'Yanlış ürün',active:true,requiresImages:true},{code:'NOT_AS_DESCRIBED',label:'Açıklamayla uyuşmuyor',active:true},{code:'OTHER',label:'Diğer',active:true}]};const customerCancellation=this.customerCancelPolicy(row,store?.settings||{});return{...row,documents,returnPolicy,customerCancellation};}
  async customerDocument(customerId:string,documentId:string){const d=await this.prisma.eDocument.findUnique({where:{id:documentId}});if(!d?.orderId)throw new NotFoundException('Document not found');const order=await this.prisma.order.findFirst({where:{id:d.orderId,customerId,storeId:d.storeId},select:{id:true}});if(!order)throw new NotFoundException('Document not found');return d;}
  async customerDocumentBinary(customerId:string,documentId:string,kind:'pdf'|'xml'){const d=await this.customerDocument(customerId,documentId);return this.edoc.binary(d.storeId,d.id,kind);}

  async myReturns(customerId:string){return this.prisma.returnRequest.findMany({where:{customerId},include:{order:{select:{number:true,currency:true,grandTotal:true}},items:{include:{orderItem:true}}},orderBy:{createdAt:'desc'}});}
  async myReviews(customerId:string,locale?:string){const c=await this.prisma.customer.findUnique({where:{id:customerId},select:{storeId:true}});if(!c)throw new NotFoundException();await this.requireApp(c.storeId,'product-reviews',locale);return this.prisma.review.findMany({where:{customerId},include:{product:{select:{title:true,slug:true}}},orderBy:{createdAt:'desc'}});}
  async myQuestions(customerId:string){return this.prisma.question.findMany({where:{customerId},orderBy:{createdAt:'desc'}});}
  async myPrivacyRequests(customerId:string){return this.prisma.privacyRequest.findMany({where:{customerId},orderBy:{createdAt:'desc'}});}
  async myConsents(customerId:string){return this.prisma.consentRecord.findMany({where:{customerId},orderBy:{createdAt:'desc'},take:100});}
  async askCustomerQuestion(customerId:string,body:any){const customer=await this.prisma.customer.findUnique({where:{id:customerId}});if(!customer)throw new NotFoundException();const type=String(body.type||'PRODUCT').toUpperCase();if(type==='PRODUCT'){const p=await this.prisma.product.findFirst({where:{id:body.productId,storeId:customer.storeId,status:'ACTIVE'}});if(!p)throw new NotFoundException('Product not found');}else if(type==='ORDER'){const o=await this.prisma.order.findFirst({where:{id:body.orderId,customerId,storeId:customer.storeId}});if(!o)throw new NotFoundException('Order not found');}else throw new BadRequestException('Invalid question type');return this.prisma.question.create({data:{storeId:customer.storeId,type:type as any,productId:body.productId||null,orderId:body.orderId||null,customerId,email:customer.email,subject:body.subject||null,question:String(body.question||'').trim(),priority:'NORMAL'}});}
  async addCustomerReview(customerId:string,body:any,locale?:string){const customer=await this.prisma.customer.findUnique({where:{id:customerId}});if(!customer)throw new NotFoundException();await this.requireApp(customer.storeId,'product-reviews',locale);const store=await this.prisma.tenant.findUnique({where:{id:customer.storeId}});const cfg=this.commentSettings(store).productReviews;const program:any=(store?.settings as any)?.reviewProgram||{};if(!cfg.enabled)throw new BadRequestException(apiText('reviews.disabled',locale));const product=await this.prisma.product.findFirst({where:{id:body.productId,storeId:customer.storeId,status:'ACTIVE'}});if(!product)throw new NotFoundException(apiText('product.notFound',locale));const rating=Number(body.rating);if(rating<1||rating>5)throw new BadRequestException(apiText('reviews.ratingRange',locale));const verified=!!(await this.prisma.orderItem.findFirst({where:{order:{customerId,status:{not:'CANCELLED'}},variant:{productId:product.id}}}));if(program.requireVerifiedPurchase&&!verified)throw new BadRequestException('Verified purchase required for reviews');const maxMedia=Math.max(0,Math.min(12,Number(program.maxMedia??6)));const media=program.allowMedia===false?[]:(Array.isArray(body.media)?body.media.map((x:any)=>String(x||'').trim()).filter((x:string)=>/^https?:\/\//i.test(x)).slice(0,maxMedia):[]);return this.prisma.review.create({data:{storeId:customer.storeId,productId:product.id,customerId,rating,title:body.title,body:body.body,authorName:[customer.firstName,customer.lastName].filter(Boolean).join(' ')||customer.email,authorEmail:customer.email,verifiedPurchase:verified,media,status:cfg.autoApprove?'APPROVED':'PENDING',publishedAt:cfg.autoApprove?new Date():null}});}
  async wishlist(customerId:string,locale?:string){const c=await this.prisma.customer.findUnique({where:{id:customerId},select:{storeId:true}});if(!c)throw new NotFoundException();await this.requireApp(c.storeId,'wishlist',locale);return this.prisma.wishlistItem.findMany({where:{customerId},include:{product:{include:{images:{take:1},variants:{where:{isActive:true},include:{inventory:true,warehouseStocks:true},take:1}}}},orderBy:{createdAt:'desc'}});}
  async toggleWishlist(customerId:string,storeId:string,productId:string,locale?:string){await this.requireApp(storeId,'wishlist',locale);const product=await this.prisma.product.findFirst({where:{id:productId,storeId,status:'ACTIVE'}});if(!product)throw new NotFoundException(apiText('product.notFound',locale));const x=await this.prisma.wishlistItem.findUnique({where:{customerId_productId:{customerId,productId}}});if(x){await this.prisma.wishlistItem.delete({where:{id:x.id}});return{added:false};}return{added:true,item:await this.prisma.wishlistItem.create({data:{customerId,storeId,productId}})}};
  async addReview(slug:string,body:any,customerId?:string,locale?:string){const store=await this.store(slug);await this.requireApp(store.id,'product-reviews',locale);const cfg=this.commentSettings(store).productReviews;const program:any=(store?.settings as any)?.reviewProgram||{};if(!cfg.enabled)throw new BadRequestException(apiText('reviews.disabled',locale));if(!customerId&&!cfg.allowGuest)throw new UnauthorizedException(apiText('reviews.guestDisabled',locale));if(program.requireVerifiedPurchase&&!customerId)throw new UnauthorizedException('Verified purchase required for reviews');const product=await this.prisma.product.findFirst({where:{id:body.productId,storeId:store.id,status:'ACTIVE'}});if(!product)throw new NotFoundException(apiText('product.notFound',locale));const rating=Number(body.rating);if(rating<1||rating>5)throw new BadRequestException(apiText('reviews.ratingRange',locale));const verifiedPurchase=customerId?!!(await this.prisma.orderItem.findFirst({where:{productIdSnapshot:product.id,order:{customerId,storeId:store.id,paymentStatus:'PAID'}},select:{id:true}})):false;if(program.requireVerifiedPurchase&&!verifiedPurchase)throw new BadRequestException('Verified purchase required for reviews');const maxMedia=Math.max(0,Math.min(12,Number(program.maxMedia??6)));const media=program.allowMedia===false?[]:(Array.isArray(body.media)?body.media.map((x:any)=>String(x||'').trim()).filter((x:string)=>/^https?:\/\//i.test(x)).slice(0,maxMedia):[]);return this.prisma.review.create({data:{storeId:store.id,productId:product.id,customerId:customerId||null,rating,title:body.title,body:body.body,authorName:body.authorName,authorEmail:body.authorEmail,verifiedPurchase,media,status:cfg.autoApprove?'APPROVED':'PENDING',publishedAt:cfg.autoApprove?new Date():null}});}
  async reportReview(slug:string,id:string){const store=await this.store(slug);const review=await this.prisma.review.findFirst({where:{id,storeId:store.id}});if(!review)throw new NotFoundException('Review not found');const program:any=(store.settings as any)?.reviewProgram||{};const next=review.reportCount+1;const threshold=Math.max(1,Number(program.autoSpamReportThreshold??3));return this.prisma.review.update({where:{id},data:{reportCount:next,...(next>=threshold?{status:'SPAM' as any,unpublishedAt:new Date()}:{})},select:{id:true,reportCount:true,status:true}});}

  async claimCart(customerId:string,token:string){const customer=await this.prisma.customer.findUnique({where:{id:customerId},select:{id:true,storeId:true,email:true,isActive:true}});if(!customer?.isActive)throw new UnauthorizedException('Customer not active');const cart=await this.prisma.cart.findUnique({where:{token},select:{id:true,storeId:true,status:true}});if(!cart)throw new GoneException({code:'CART_NOT_FOUND',message:'Cart not found'});if(cart.storeId!==customer.storeId)throw new UnauthorizedException('Cart does not belong to this store');if(cart.status!=='active')throw new GoneException({code:'CART_NOT_ACTIVE',message:'Cart is not active'});await this.prisma.cart.update({where:{id:cart.id},data:{customerId:customer.id,customerEmail:customer.email,lastActivityAt:new Date()}});return{claimed:true};}

  async createCart(slug:string,currency?:string,affiliateCode?:string){const store=await this.store(slug);const ci=await this.currencyInfo(store,currency);let affiliate:any=null;const ref=String(affiliateCode||'').trim().toUpperCase();if(ref)affiliate=await this.prisma.affiliatePartner.findFirst({where:{storeId:store.id,code:ref,status:'ACTIVE'}});const cart=await this.prisma.cart.create({data:{storeId:store.id,token:randomBytes(24).toString('hex'),currency:ci.code,affiliateCode:affiliate?.code||null,affiliateClickId:affiliate?randomBytes(16).toString('hex'):null}});await this.prisma.control().tenantRouteKey.upsert({where:{kind_routeKey:{kind:'CART',routeKey:cart.token}},create:{kind:'CART',routeKey:cart.token,tenantId:store.id,expiresAt:new Date(Date.now()+this.guestCartTtlMs)},update:{tenantId:store.id,expiresAt:new Date(Date.now()+this.guestCartTtlMs)}});return cart;}
  async setCartCurrency(token:string,currency:string){const cart=await this.prisma.cart.findUnique({where:{token},include:{store:true}});if(!cart)throw new GoneException({code:'CART_NOT_FOUND',message:'Cart not found'});if(cart.status!=='active')throw new GoneException({code:'CART_NOT_ACTIVE',message:'Cart is not active'});const ci=await this.currencyInfo(cart.store,currency);await this.prisma.cart.update({where:{id:cart.id},data:{currency:ci.code,lastActivityAt:new Date()}});return this.getCart(token);}
  private normalizeShippingCountry(value:any){return String(value||'').trim().toUpperCase().slice(0,12);}
  private shippingRuleForCountry(settings:any,country:string){const rules:any[]=Array.isArray(settings?.shippingCountryRules)?settings.shippingCountryRules:[];const code=this.normalizeShippingCountry(country);return rules.find((r:any)=>{const countries=(Array.isArray(r?.countries)?r.countries:[]).map((x:any)=>this.normalizeShippingCountry(x));return countries.includes(code)||countries.includes('*')||countries.includes('ALL');})||null;}
  private shippingZoneMatch(zones:any,country:string){const list:any[]=Array.isArray(zones)?zones:[];if(!list.length)return {matched:true,zone:null};const code=this.normalizeShippingCountry(country);for(const z of list){if(typeof z==='string'){const c=this.normalizeShippingCountry(z);if(c===code||c==='*'||c==='ALL')return{matched:true,zone:{code:c}};continue;}if(!z||z.enabled===false)continue;const include=(Array.isArray(z.countries)?z.countries:Array.isArray(z.countryCodes)?z.countryCodes:z.country?[z.country]:[]).map((x:any)=>this.normalizeShippingCountry(x));const exclude=(Array.isArray(z.excludeCountries)?z.excludeCountries:[]).map((x:any)=>this.normalizeShippingCountry(x));if(exclude.includes(code))continue;if(!include.length||include.includes(code)||include.includes('*')||include.includes('ALL'))return{matched:true,zone:z};}return{matched:false,zone:null};}
  private shippingRuleMatches(rule:any,method:any,country:string,zone:any,subtotal:number,weight:number,quantity:number){if(!rule||rule.active===false||rule.enabled===false)return false;const ids=(Array.isArray(rule.methodIds)?rule.methodIds:rule.methodId?[rule.methodId]:[]).map(String);const codes=(Array.isArray(rule.methodCodes)?rule.methodCodes:rule.methodCode?[rule.methodCode]:[]).map((x:any)=>String(x).toLowerCase());if(ids.length&&!ids.includes(String(method.id)))return false;if(codes.length&&!codes.includes(String(method.code).toLowerCase()))return false;const countries=(Array.isArray(rule.countries)?rule.countries:[]).map((x:any)=>this.normalizeShippingCountry(x));if(countries.length&&!countries.includes(this.normalizeShippingCountry(country))&&!countries.includes('*')&&!countries.includes('ALL'))return false;const zoneIds=(Array.isArray(rule.zoneIds)?rule.zoneIds:rule.zoneId?[rule.zoneId]:[]).map(String);if(zoneIds.length&&!zoneIds.includes(String(zone?.id||zone?.code||zone?.name||'')))return false;const n=(v:any)=>v==null||v===''?null:Number(v);const minSubtotal=n(rule.minSubtotal),maxSubtotal=n(rule.maxSubtotal),minWeight=n(rule.minWeight??rule.minWeightGrams),maxWeight=n(rule.maxWeight??rule.maxWeightGrams),minQty=n(rule.minQuantity),maxQty=n(rule.maxQuantity);if(minSubtotal!=null&&subtotal<minSubtotal)return false;if(maxSubtotal!=null&&subtotal>maxSubtotal)return false;if(minWeight!=null&&weight<minWeight)return false;if(maxWeight!=null&&weight>maxWeight)return false;if(minQty!=null&&quantity<minQty)return false;if(maxQty!=null&&quantity>maxQty)return false;return true;}
  private async shippingProfileRates(db:any,cart:any,ci:any,netSubtotal:number,country:string,methods:any[],pricedItems:any[]){const profiles:any[]=await db.shippingProfile.findMany({where:{storeId:cart.storeId,active:true},orderBy:{createdAt:'asc'},take:100});const configured=profiles.filter((p:any)=>Array.isArray(p.rateRules)&&p.rateRules.length);if(!configured.length)return null;const regular=(cart.items||[]).filter((i:any)=>!i.isGift&&i.variant?.product?.requiresShipping!==false);const priceByVariant=new Map((pricedItems||[]).map((x:any)=>[String(x.variantId),Number(x.unitPrice||0)*Number(x.quantity||0)]));const specific=configured.filter((p:any)=>Array.isArray(p.productIds)&&p.productIds.length);const defaults=configured.filter((p:any)=>!Array.isArray(p.productIds)||!p.productIds.length);const groups=new Map<string,{profile:any,items:any[]}>();const legacy:any[]=[];for(const item of regular){const pid=String(item.variant?.productId||item.variant?.product?.id||'');const profile=specific.find((p:any)=>(p.productIds||[]).map(String).includes(pid))||defaults[0]||null;if(!profile){legacy.push(item);continue;}const key=String(profile.id);const g=groups.get(key)||{profile,items:[]};g.items.push(item);groups.set(key,g);}const out=new Map<string,any>();for(const method of methods){let total=0;let freeAboveTotal=0;let valid=true;const profileIds:string[]=[];for(const {profile,items} of groups.values()){const zoneMatch=this.shippingZoneMatch(profile.zones,country);if(!zoneMatch.matched){valid=false;break;}const subtotal=items.reduce((sum:number,i:any)=>sum+Number(priceByVariant.get(String(i.variantId))||0),0);const weight=items.reduce((sum:number,i:any)=>sum+Number(i.variant?.weight||0)*Number(i.quantity||0),0);const quantity=items.reduce((sum:number,i:any)=>sum+Number(i.quantity||0),0);const rules=(Array.isArray(profile.rateRules)?profile.rateRules:[]).filter((r:any)=>this.shippingRuleMatches(r,method,country,zoneMatch.zone,subtotal,weight,quantity)).sort((a:any,b:any)=>Number(a.priority??100)-Number(b.priority??100));const rule=rules[0];if(!rule){valid=false;break;}const priceBase=Number(rule.price??rule.amount??method.price??0);const freeAboveBase=rule.freeAbove==null?null:Number(rule.freeAbove);const convertedPrice=this.money(priceBase,ci.rate,ci.rounding);const convertedFree=freeAboveBase==null?null:this.money(freeAboveBase,ci.rate,ci.rounding);total+=convertedFree!=null&&subtotal>=convertedFree?0:convertedPrice;if(convertedFree!=null)freeAboveTotal+=convertedFree;profileIds.push(String(profile.id));}if(!valid)continue;if(legacy.length){const legacySubtotal=legacy.reduce((sum:number,i:any)=>sum+Number(priceByVariant.get(String(i.variantId))||0),0);const legacyFree=method.freeAbove==null?null:this.money(method.freeAbove,ci.rate,ci.rounding);total+=legacyFree!=null&&legacySubtotal>=legacyFree?0:this.money(method.price,ci.rate,ci.rounding);}out.set(String(method.id),{price:this.money(total,1,ci.rounding),freeAbove:freeAboveTotal>0?this.money(freeAboveTotal,1,ci.rounding):null,profileIds,rateSource:'SHIPPING_PROFILE'});}return out;}
  private async shippingContextForCart(cart:any,ci:any,totals:any,countryOverride?:string,db:any=this.prisma){const requiresShipping=(cart.items||[]).some((i:any)=>!i.isGift&&i.variant?.product?.requiresShipping!==false);if(!requiresShipping)return{country:null,availableMethods:[],selectedMethodId:null,selectedMethod:null,freeShippingThreshold:null,amountUntilFreeShipping:0,freeShippingReached:true,freeShippingByPromotion:false,progress:100,ruleApplied:false,profileRateApplied:false,digitalOnly:true};
    const [methods,checkoutConfig]=await Promise.all([
      db.shippingMethod.findMany({where:{storeId:cart.storeId,isActive:true},orderBy:{sortOrder:'asc'}}),
      db.checkoutConfig.findUnique({where:{storeId:cart.storeId},select:{settings:true}})
    ]);
    const country=this.normalizeShippingCountry(countryOverride||(cart.shippingAddress as any)?.country||(cart.billingAddress as any)?.country||cart.store?.defaultCountry||'');
    const settings:any=(checkoutConfig as any)?.settings||{};const rule:any=this.shippingRuleForCountry(settings,country);
    const methodIds=new Set((Array.isArray(rule?.methodIds)?rule.methodIds:[]).map(String));const methodCodes=new Set((Array.isArray(rule?.methodCodes)?rule.methodCodes:[]).map((x:any)=>String(x).toLowerCase()));
    let eligible:any[]=methods;if(rule?.disabled===true)eligible=[];else if(methodIds.size||methodCodes.size)eligible=methods.filter((m:any)=>methodIds.has(String(m.id))||methodCodes.has(String(m.code).toLowerCase()));
    const netSubtotal=Math.max(0,Number(totals?.subtotal||0)-Number(totals?.discountTotal||0));const profileRates=await this.shippingProfileRates(db,cart,ci,netSubtotal,country,eligible,totals?.items||[]);
    const freeByMethod:any=rule?.freeAboveByMethod&&typeof rule.freeAboveByMethod==='object'?rule.freeAboveByMethod:{};
    const availableMethods=eligible.map((m:any)=>{const profileRate=profileRates?.get(String(m.id));if(profileRates&&!profileRate)return null;const override=freeByMethod[m.id]??freeByMethod[m.code]??rule?.freeAbove;const freeAboveBase=profileRate?profileRate.freeAbove:(override==null?m.freeAbove:this.money(Number(override),ci.rate,ci.rounding));return {...m,price:profileRate?profileRate.price:this.money(m.price,ci.rate,ci.rounding),freeAbove:freeAboveBase==null?null:Number(freeAboveBase),rateSource:profileRate?.rateSource||'SHIPPING_METHOD',profileIds:profileRate?.profileIds||[]};}).filter(Boolean);
    const selectedMethod=availableMethods.find((m:any)=>String(m.id)===String(cart.shippingMethodId||''))||availableMethods[0]||null;
    const threshold=selectedMethod?.freeAbove==null?null:Number(selectedMethod.freeAbove);const promotionFree=!!totals?.freeShipping;const reached=promotionFree||(threshold!=null&&threshold>0&&netSubtotal>=threshold);const remaining=reached||threshold==null?0:Math.max(0,threshold-netSubtotal);const progress=threshold&&threshold>0?Math.max(0,Math.min(100,(netSubtotal/threshold)*100)):(reached?100:0);
    return {country,availableMethods,selectedMethodId:selectedMethod?.id||null,selectedMethod,freeShippingThreshold:threshold,amountUntilFreeShipping:remaining,freeShippingReached:reached,freeShippingByPromotion:promotionFree,progress,ruleApplied:!!rule,profileRateApplied:!!profileRates,digitalOnly:false};
  }
  async getCart(token:string){const cart=await this.prisma.cart.findUnique({where:{token},include:{items:{include:{sellingPlan:{include:{group:true}},variant:{include:{optionValues:{include:{optionValue:{include:{option:true}}}},product:{include:{images:{orderBy:{sortOrder:'asc'},take:1},categories:true,taxCategory:{include:{rules:{orderBy:{priority:'asc'}}}}}},inventory:true}}}},store:true,customer:{select:{id:true,storeId:true,email:true,firstName:true,lastName:true,phone:true,isActive:true,acceptsMarketing:true,groupId:true,tags:true,metadata:true,createdAt:true,updatedAt:true}}}});if(!cart)throw new GoneException({code:'CART_NOT_FOUND',message:'Cart not found'});if(cart.status!=='active')throw new GoneException({code:'CART_NOT_ACTIVE',message:'Cart is not active'});if(!cart.customerId&&Date.now()-new Date(cart.lastActivityAt).getTime()>this.guestCartTtlMs){await this.prisma.cart.updateMany({where:{id:cart.id,status:'active'},data:{status:'expired'}});throw new GoneException({code:'CART_EXPIRED',message:'Cart expired'});}await this.prisma.cart.update({where:{id:cart.id},data:{lastActivityAt:new Date(),...(cart.abandonedAt?{recoveredAt:new Date(),abandonedAt:null}:{})}});const totals=await this.calculateCart(cart);const ci=await this.currencyInfo(cart.store,cart.currency);const pricedMap=new Map((totals.items||[]).map((x:any)=>[x.variantId,x]));const displayItems=cart.items.map((i:any)=>{const priced:any=pricedMap.get(i.variantId);return{...i,variant:{...i.variant,basePrice:this.variantMoney(i.variant.price,i.variant,ci),comparePrice:i.variant.comparePrice==null?null:this.variantMoney(i.variant.comparePrice,i.variant,ci),price:priced?Number(priced.unitPrice):this.sellingPlanPrice(this.displayVariantPrice(i.variant.product,i.variant,ci,cart.customer?.groupId),i.sellingPlan),priceSource:priced?.priceSource||'BASE',priceListId:priced?.priceListId||null,marketId:priced?.marketId||null}}});
    const relationIds=new Set<string>();const bundleOffers:any[]=[];const rawGroups:any[]=[];
    for(const item of cart.items as any[]){const cfg:any=(item.variant?.product?.metadata as any)?.together||{};const relation=(Array.isArray(cfg.productIds)?cfg.productIds:[]).map(String).filter((id:string)=>id!==String(item.variant?.productId));for(const id of relation)relationIds.add(id);if(relation.length)rawGroups.push({anchorProductId:String(item.variant.productId),anchorTitle:String(item.variant?.product?.title||''),productIds:relation});if(cfg.bundleEnabled&&relation.length)bundleOffers.push({anchorProductId:item.variant.productId,anchorTitle:item.variant?.product?.title||'',productIds:relation,bundlePrice:cfg.bundlePrice==null?null:this.money(cfg.bundlePrice,ci.rate,ci.rounding)});}
    const existingProductIds=new Set((cart.items as any[]).map((x:any)=>String(x.variant?.productId||'')));const ids=[...relationIds].filter(id=>!existingProductIds.has(id));const related=ids.length?await this.prisma.product.findMany({where:{id:{in:ids},storeId:cart.storeId,status:'ACTIVE',AND:this.productPublicationAnd()},include:{images:{orderBy:{sortOrder:'asc'},take:1},variants:{where:{isActive:true},include:{inventory:true,warehouseStocks:true},take:1}}}):[];const togetherSuggestions=related.map((p:any)=>this.presentProduct(p,ci));const byId=new Map(togetherSuggestions.map((p:any)=>[String(p.id),p]));const togetherGroups=rawGroups.map((g:any)=>({...g,suggestions:g.productIds.map((id:string)=>byId.get(id)).filter(Boolean)})).filter((g:any)=>g.suggestions.length);
    const shippingContext=await this.shippingContextForCart(cart,ci,totals);
    const requiresShipping=(displayItems||[]).some((i:any)=>!i.isGift&&i.variant?.product?.requiresShipping!==false);return{...cart,items:displayItems,requiresShipping,totals,promotionGifts:totals.gifts,togetherSuggestions,togetherGroups,bundleOffers,shippingContext};}
  private sellingPlanPrice(base:number,plan:any){const policy:any=plan?.pricingPolicy||{};const type=String(policy.type||policy.kind||'').toUpperCase();const value=Number(policy.value??policy.amount??0);if(type==='PERCENTAGE'||type==='PERCENT_OFF')return Math.max(0,base*(1-Math.max(0,Math.min(100,value))/100));if(type==='FIXED_PRICE')return Math.max(0,value);if(type==='FIXED_AMOUNT'||type==='AMOUNT_OFF')return Math.max(0,base-Math.max(0,value));return base;}
  private cartLineKey(variantId:string,body:any){const stable=(v:any):any=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.keys(v).sort().reduce((o:any,k)=>{o[k]=stable(v[k]);return o},{}):v;const payload={variantId,properties:stable(body?.properties||{}),personalization:stable(body?.personalization||{}),sellingPlanId:body?.sellingPlanId||null};return createHash('sha256').update(JSON.stringify(payload)).digest('hex');}
  async addCartItem(token:string,body:any){const cart:any=await this.getCart(token);if(cart.status!=='active')throw new BadRequestException('Cart is not active');const variant=await this.prisma.variant.findFirst({where:{id:body.variantId,isActive:true,product:{storeId:cart.storeId,status:'ACTIVE',AND:this.productPublicationAnd()}},include:{inventory:true,product:true}});if(!variant)throw new NotFoundException('Variant not found');const qty=Math.max(1,Number(body.quantity||1));let sellingPlan:any=null;if(body.sellingPlanId){sellingPlan=await this.prisma.sellingPlan.findFirst({where:{id:String(body.sellingPlanId),isActive:true,group:{storeId:cart.storeId},variants:{some:{variantId:variant.id}}},include:{group:true}});if(!sellingPlan)throw new BadRequestException('Selling plan is not available for this variant');}const rule:any=await this.prisma.variantQuantityRule.findUnique({where:{variantId:variant.id}});if(rule){const minimum=Math.max(1,Number(rule.minimum||1)),increment=Math.max(1,Number(rule.increment||1));if(qty<minimum||((qty-minimum)%increment)!==0)throw new BadRequestException({code:'QUANTITY_RULE_FAILED',message:`Quantity must start at ${minimum} and increase by ${increment}`});if(rule.maximum!=null&&qty>Number(rule.maximum))throw new BadRequestException({code:'QUANTITY_RULE_FAILED',message:`Maximum quantity is ${rule.maximum}`});}const lineKey=this.cartLineKey(variant.id,body);const existing=await this.prisma.cartItem.findFirst({where:{cartId:cart.id,lineKey}});const nextQty=existing?existing.quantity+qty:qty;if(rule?.maximum!=null&&nextQty>Number(rule.maximum))throw new BadRequestException({code:'QUANTITY_RULE_FAILED',message:`Maximum quantity is ${rule.maximum}`});this.assertStock(await this.inventoryTargets(this.prisma,cart.storeId,variant,nextQty),variant.sku);if(existing)await this.prisma.cartItem.update({where:{id:existing.id},data:{quantity:nextQty,isGift:false,promotionId:null}});else await this.prisma.cartItem.create({data:{cartId:cart.id,variantId:variant.id,lineKey,quantity:qty,properties:body.properties||undefined,personalization:body.personalization||undefined,sellingPlanId:body.sellingPlanId||null}});return this.getCart(token);}
  async updateCartItem(token:string,itemId:string,quantity:number){const cart:any=await this.getCart(token);const item=cart.items.find((x:any)=>x.id===itemId);if(!item)throw new NotFoundException();if(item.isGift)throw new BadRequestException('Promotional gift quantity cannot be edited');if(quantity<=0)await this.prisma.cartItem.delete({where:{id:itemId}});else{const rule:any=await this.prisma.variantQuantityRule.findUnique({where:{variantId:item.variantId}});if(rule){const minimum=Math.max(1,Number(rule.minimum||1)),increment=Math.max(1,Number(rule.increment||1));if(quantity<minimum||((quantity-minimum)%increment)!==0)throw new BadRequestException({code:'QUANTITY_RULE_FAILED',message:`Quantity must start at ${minimum} and increase by ${increment}`});if(rule.maximum!=null&&quantity>Number(rule.maximum))throw new BadRequestException({code:'QUANTITY_RULE_FAILED',message:`Maximum quantity is ${rule.maximum}`});}this.assertStock(await this.inventoryTargets(this.prisma,cart.storeId,item.variant,quantity),item.variant.sku);await this.prisma.cartItem.update({where:{id:itemId},data:{quantity}});}return this.getCart(token);}
  async removeCartItem(token:string,itemId:string){const cart:any=await this.getCart(token);if(!cart.items.some((x:any)=>x.id===itemId))throw new NotFoundException();await this.prisma.cartItem.delete({where:{id:itemId}});return this.getCart(token);}

  async applyDiscount(token:string,code:string){const cart:any=await this.getCart(token);const c=String(code||'').trim().toUpperCase();if(!c)throw new BadRequestException('Coupon code required');const now=new Date();const day=now.getDay();const promoCode:any=await this.prisma.promotionCode.findFirst({where:{storeId:cart.storeId,code:c,isActive:true},include:{promotion:{include:{redemptions:cart.customerId?{where:{customerId:cart.customerId}}:false}}}});if(promoCode){const promo:any=promoCode.promotion;if(promo.status!=='ACTIVE')throw new BadRequestException('Promotion is not active');if(promo.activation!=='COUPON')throw new BadRequestException('Promotion does not accept coupon codes');if(promo.startsAt&&new Date(promo.startsAt)>now)throw new BadRequestException('Promotion has not started yet');if(promo.endsAt&&new Date(promo.endsAt)<now)throw new BadRequestException('Promotion has expired');if(Array.isArray(promo.daysOfWeek)&&promo.daysOfWeek.length&&!promo.daysOfWeek.includes(day))throw new BadRequestException('Promotion is not available today');if(promo.usageLimit&&promo.usageCount>=promo.usageLimit)throw new BadRequestException('Promotion usage limit reached');if(promoCode.usageLimit&&promoCode.usageCount>=promoCode.usageLimit)throw new BadRequestException('Promotion code usage limit reached');if(promo.perCustomerLimit){if(!cart.customerId)throw new BadRequestException('Sign in is required for this promotion');if((promo.redemptions||[]).length>=promo.perCustomerLimit)throw new BadRequestException('Promotion customer usage limit reached');}const codes=[...new Set([...(cart.couponCodes||[]),c])];await this.prisma.cart.update({where:{id:cart.id},data:{couponCodes:codes}});return this.getCart(token);}const discount=await this.validDiscount(cart.storeId,c,Number(cart.totals.subtotal));await this.prisma.cart.update({where:{id:cart.id},data:{discountCode:discount.code}});return this.getCart(token);}
  async removeCoupon(token:string,code:string){const cart:any=await this.getCart(token);const c=String(code||'').toUpperCase();await this.prisma.cart.update({where:{id:cart.id},data:{couponCodes:(cart.couponCodes||[]).filter((x:string)=>x!==c),...(cart.discountCode===c?{discountCode:null}:{})}});return this.getCart(token);}
  private isB2BTermsPayment(method:any){const cfg:any=method?.config||{};return String(method?.type||'').toLowerCase()==='b2b_terms'||cfg.b2bPaymentTerms===true;}
  private async b2bPaymentContext(db:any,storeId:string,customerId:string|null|undefined,currency:string,amount=0,locationId?:string|null){
    if(!customerId)return{eligible:false,reason:'CUSTOMER_REQUIRED'};
    const buyer:any=await db.b2BBuyer.findFirst({where:{customerId,company:{storeId,status:'ACTIVE'}},include:{company:{include:{locations:true}}}});
    if(!buyer?.company)return{eligible:false,reason:'COMPANY_REQUIRED'};
    const company:any=buyer.company;
    if(String(company.currency||currency)!==String(currency))return{eligible:false,reason:'CURRENCY_MISMATCH',companyId:company.id};
    const location=locationId?company.locations.find((x:any)=>String(x.id)===String(locationId)):null;
    if(locationId&&!location)return{eligible:false,reason:'LOCATION_INVALID',companyId:company.id};
    const termsDays=Math.max(0,Number(location?.paymentTermsDays??company.paymentTermsDays??0));
    const orders:any[]=await db.order.findMany({where:{storeId,customerId,status:{notIn:['CANCELLED','REFUNDED']},paymentStatus:{in:['PENDING','PARTIALLY_REFUNDED']}},select:{grandTotal:true,metadata:true}});
    const openBalance=orders.filter((o:any)=>String((o.metadata as any)?.b2bTerms?.companyId||'')===String(company.id)).reduce((sum:number,o:any)=>sum+Math.max(0,Number((o.metadata as any)?.b2bTerms?.amount||0)),0);
    const creditLimit=company.creditLimit==null?null:Number(company.creditLimit);
    const availableCredit=creditLimit==null?null:Math.max(0,creditLimit-openBalance);
    const requested=Math.max(0,Number(amount||0));
    const eligible=creditLimit==null||openBalance+requested<=creditLimit+0.000001;
    return{eligible,reason:eligible?null:'CREDIT_LIMIT_EXCEEDED',companyId:company.id,companyName:company.name,locationId:location?.id||null,termsDays,creditLimit,openBalance,availableCredit,currency:String(company.currency||currency)};
  }

  async checkoutData(token:string){
    const cart:any=await this.getCart(token);
    if(cart.status!=='active')throw new BadRequestException('Cart is not active');
    const ci=await this.currencyInfo(cart.store,cart.currency);
    const [shippingMethods,paymentMethods,checkoutConfig,legalDocuments,installedApps]=await Promise.all([
      this.prisma.shippingMethod.findMany({where:{storeId:cart.storeId,isActive:true},orderBy:{sortOrder:'asc'}}),
      this.prisma.paymentMethod.findMany({where:{storeId:cart.storeId,isActive:true},orderBy:{sortOrder:'asc'}}),
      this.prisma.checkoutConfig.findUnique({where:{storeId:cart.storeId}}),
      this.prisma.legalDocument.findMany({where:{storeId:cart.storeId,isActive:true},select:{type:true,locale:true,version:true,title:true,publishedAt:true},orderBy:{publishedAt:'desc'}}),
      this.prisma.appInstallation.findMany({where:{tenantId:cart.storeId,enabled:true,status:'ACTIVE',app:{isActive:true}},include:{app:{select:{slug:true}}}})
    ]);
    const b2bTermsContext=await this.b2bPaymentContext(this.prisma,cart.storeId,cart.customerId,cart.totals.currency,cart.totals.grandTotal);
    const cfg:any=checkoutConfig||{};
    const settings:any=cfg.settings||{};
    const customerAccessMode=cfg.customerAccessMode||(cfg.allowGuestCheckout===false?'REQUIRED':'GUEST');
    return{
      cart,
      store:{id:cart.store.id,name:cart.store.name,publicSlug:cart.store.publicSlug,currency:ci.code,locale:cart.store.locale,defaultCountry:cart.store.defaultCountry,logoUrl:cart.store.logoUrl},
      countries:[...COUNTRY_CODES],
      shippingMethods:Array.isArray(cart.shippingContext?.availableMethods)?cart.shippingContext.availableMethods:shippingMethods.map((x:any)=>({...x,price:this.money(x.price,ci.rate,ci.rounding),freeAbove:x.freeAbove==null?null:this.money(x.freeAbove,ci.rate,ci.rounding)})),
      shippingContext:cart.shippingContext,
      paymentMethods:paymentMethods.filter((x:any)=>{const slug=String((x.config as any)?.appSlug||'').trim();if(slug&&!new Set(installedApps.map((a:any)=>String(a.app?.slug||''))).has(slug))return false;if(this.isB2BTermsPayment(x)&&!b2bTermsContext.eligible)return false;return true;}).map((x:any)=>({id:x.id,name:x.name,code:x.code,type:x.type,instructions:x.instructions,requiresOnlinePayment:x.requiresOnlinePayment,supportsInstallment:x.supportsInstallment,fee:this.money(x.fee,ci.rate,ci.rounding),isActive:x.isActive,sortOrder:x.sortOrder,config:{...((x.config as any)?.public||{}),public:(x.config as any)?.public||{},appSlug:(x.config as any)?.appSlug||null},b2bTerms:this.isB2BTermsPayment(x)?b2bTermsContext:null})),
      legalDocuments,
      checkoutConfig:{singlePage:cfg.singlePage??true,customerAccessMode,allowGuestCheckout:cfg.allowGuestCheckout??true,requirePhone:cfg.requirePhone??true,requireBillingAddress:cfg.requireBillingAddress??false,showCouponField:cfg.showCouponField??true,stickyOrderSummary:cfg.stickyOrderSummary??true,requireTerms:cfg.requireTerms??true,requirePrivacyNotice:cfg.requirePrivacyNotice??true,requireKvkkNotice:cfg.requireKvkkNotice??false,...settings}
    };
  }
  async selectShipping(token:string,shippingMethodId:string){const cart:any=await this.getCart(token);if(cart.status!=='active')throw new BadRequestException('Cart is not active');const allowed=new Set((cart.shippingContext?.availableMethods||[]).map((x:any)=>String(x.id)));if(!allowed.has(String(shippingMethodId||'')))throw new BadRequestException('Select a shipping method available for this country');await this.prisma.cart.update({where:{id:cart.id},data:{shippingMethodId:String(shippingMethodId),lastActivityAt:new Date()}});return this.getCart(token);}
  async selectPayment(token:string,paymentMethodId:string){const cart:any=await this.getCart(token);if(cart.status!=='active')throw new BadRequestException('Cart is not active');const method=await this.prisma.paymentMethod.findFirst({where:{id:String(paymentMethodId||''),storeId:cart.storeId,isActive:true}});if(!method)throw new BadRequestException('Select a valid payment method');await this.prisma.cart.update({where:{id:cart.id},data:{paymentMethodId:method.id,lastActivityAt:new Date()}});return this.getCart(token);}
  private async validDiscount(storeId:string,code:string,subtotal:number){const now=new Date();const d=await this.prisma.discount.findFirst({where:{storeId,code:code.toUpperCase(),isActive:true,OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]}]},include:{products:true,categories:true}});if(!d)throw new BadRequestException('Discount code is invalid');if(d.usageLimit&&d.usageCount>=d.usageLimit)throw new BadRequestException('Discount code usage limit reached');if(d.minimumAmount&&subtotal<Number(d.minimumAmount))throw new BadRequestException(`Minimum cart amount is ${d.minimumAmount}`);return d;}

  private async activePromotions(cart:any,ci:any){const now=new Date();const day=now.getDay();const promos=await this.prisma.promotion.findMany({where:{storeId:cart.storeId,status:'ACTIVE',OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]},{OR:[{daysOfWeek:{isEmpty:true}},{daysOfWeek:{has:day}}]}]},include:{codes:true,redemptions:cart.customerId?{where:{customerId:cart.customerId}}:false}});return promos.filter((p:any)=>!p.usageLimit||p.usageCount<p.usageLimit).filter((p:any)=>!p.perCustomerLimit||(!!cart.customerId&&p.redemptions.length<p.perCustomerLimit));}
  private commerceCountry(cart:any){return String((cart?.shippingAddress as any)?.country||(cart?.billingAddress as any)?.country||cart?.store?.defaultCountry||'').trim().toUpperCase();}
  private async commercePriceMap(db:any,storeId:string,customerId:string|null|undefined,customerGroupId:string|null|undefined,country:string,currency:string,rows:Array<{variantId:string;quantity:number}>){
    const out=new Map<string,{price:number;priceListId:string|null;marketId:string|null;source:string}>();if(!rows.length)return out;
    let companyPriceListId:string|null=null;
    if(customerId){const buyer:any=await db.b2BBuyer.findFirst({where:{customerId,company:{storeId,status:'ACTIVE'}},include:{company:true}});companyPriceListId=buyer?.company?.defaultPriceListId||null;}
    const markets:any[]=await db.commerceMarket.findMany({where:{storeId,active:true},orderBy:{createdAt:'asc'},take:50});
    const market=resolveMarket(markets,{country,currency,customerGroupId,companyPriceListId});
    const lists:any[]=await db.priceList.findMany({where:{storeId,active:true,currency},orderBy:[{priority:'asc'},{createdAt:'asc'}],take:100});
    const eligible=eligiblePriceLists(lists,market,{country,currency,customerGroupId,companyPriceListId});
    const ids=eligible.map((x:any)=>x.id);if(!ids.length)return out;const rank=new Map(ids.map((id:string,i:number)=>[id,i]));
    const prices:any[]=await db.priceListPrice.findMany({where:{priceListId:{in:ids},variantId:{in:[...new Set(rows.map(x=>x.variantId))]}}});
    for(const row of rows){const matches=prices.filter((x:any)=>x.variantId===row.variantId&&Number(x.minQuantity||1)<=Math.max(1,row.quantity)).sort((a:any,b:any)=>{const ra=rank.get(a.priceListId)??9999,rb=rank.get(b.priceListId)??9999;return ra-rb||Number(b.minQuantity||1)-Number(a.minQuantity||1)});const hit=matches[0];if(hit)out.set(row.variantId,{price:Number(hit.price),priceListId:hit.priceListId,marketId:market?.id||null,source:companyPriceListId===hit.priceListId?'B2B':'PRICE_LIST'});}
    return out;
  }
  private giftCardHash(storeId:string,code:string){return createHash('sha256').update(`${storeId}:${String(code||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase()}`).digest('hex');}
  private async tenderPreview(db:any,storeId:string,customerId:string|null|undefined,currency:string,total:number,body:any){
    let remaining=Math.max(0,Number(total||0));let gift:any=null;let storeCredit:any=null;const code=String(body?.giftCardCode||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
    if(code){const row:any=await db.giftCard.findFirst({where:{storeId,codeHash:this.giftCardHash(storeId,code),status:'ACTIVE'}});if(!row)throw new BadRequestException('Gift card is invalid');if(row.expiresAt&&row.expiresAt.getTime()<=Date.now())throw new BadRequestException('Gift card has expired');if(String(row.currency)!==String(currency))throw new BadRequestException('Gift card currency does not match checkout');const requested=body?.giftCardAmount==null?remaining:Math.max(0,Number(body.giftCardAmount||0));const amount=Math.min(remaining,Number(row.balance||0),requested);gift={id:row.id,lastFour:row.lastFour,available:Number(row.balance||0),amount};remaining-=amount;}
    if(body?.useStoreCredit&&customerId&&remaining>0){const account:any=await db.storeCreditAccount.findUnique({where:{storeId_customerId_currency:{storeId,customerId,currency}}});if(account){const requested=body?.storeCreditAmount==null?remaining:Math.max(0,Number(body.storeCreditAmount||0));const amount=Math.min(remaining,Number(account.balance||0),requested);storeCredit={id:account.id,available:Number(account.balance||0),amount};remaining-=amount;}}
    return{giftCard:gift,storeCredit,total:Number(total||0),payable:Math.max(0,remaining)};
  }
  async checkoutBenefits(token:string,body:any,customerId?:string){const cart:any=await this.getCart(token);if(customerId&&String(cart.customerId||'')!==String(customerId)){const c=await this.prisma.customer.findFirst({where:{id:customerId,storeId:cart.storeId,isActive:true},select:{id:true}});if(!c)throw new UnauthorizedException('Customer does not belong to this store');}const effectiveCustomer=customerId||cart.customerId||null;return this.tenderPreview(this.prisma,cart.storeId,effectiveCustomer,cart.totals.currency,cart.totals.grandTotal,{...body,useStoreCredit:!!customerId&&!!body?.useStoreCredit});}
  private async consumeTenders(db:any,preview:any,storeId:string,customerId:string,currency:string,orderId:string,idempotencyKey:string){
    if(preview.giftCard?.amount>0){const changed=await db.giftCard.updateMany({where:{id:preview.giftCard.id,storeId,status:'ACTIVE',balance:{gte:preview.giftCard.amount}},data:{balance:{decrement:preview.giftCard.amount}}});if(changed.count!==1)throw new BadRequestException('Gift card balance changed; retry checkout');const row=await db.giftCard.findUnique({where:{id:preview.giftCard.id},select:{balance:true}});await db.giftCardTransaction.create({data:{giftCardId:preview.giftCard.id,type:'REDEEM',amount:-preview.giftCard.amount,balanceAfter:Number(row?.balance||0),orderId}});await db.paymentTransaction.create({data:{storeId,orderId,type:'SALE',status:'SUCCEEDED',amount:preview.giftCard.amount,currency,idempotencyKey:`${idempotencyKey}:gift-card`,raw:{tender:'GIFT_CARD',lastFour:preview.giftCard.lastFour}}});}
    if(preview.storeCredit?.amount>0){const changed=await db.storeCreditAccount.updateMany({where:{id:preview.storeCredit.id,storeId,customerId,currency,balance:{gte:preview.storeCredit.amount}},data:{balance:{decrement:preview.storeCredit.amount}}});if(changed.count!==1)throw new BadRequestException('Store credit balance changed; retry checkout');const account=await db.storeCreditAccount.findUnique({where:{id:preview.storeCredit.id},select:{balance:true}});await db.storeCreditTransaction.create({data:{accountId:preview.storeCredit.id,type:'DEBIT',amount:-preview.storeCredit.amount,balanceAfter:Number(account?.balance||0),referenceType:'ORDER',referenceId:orderId,note:'Checkout payment'}});await db.paymentTransaction.create({data:{storeId,orderId,type:'SALE',status:'SUCCEEDED',amount:preview.storeCredit.amount,currency,idempotencyKey:`${idempotencyKey}:store-credit`,raw:{tender:'STORE_CREDIT'}}});}
  }
  private async assessOrderRisk(db:any,cart:any,customer:any,order:any,body:any,req:any){const ship=String(body?.shippingAddress?.country||'').toUpperCase(),bill=String(body?.billingAddress?.country||body?.shippingAddress?.country||'').toUpperCase();const prior=customer?.id?await db.order.count({where:{storeId:cart.storeId,customerId:customer.id,id:{not:order.id}}}):0;const signals:any={highValue:Number(order.grandTotal)>=10000,countryMismatch:!!ship&&!!bill&&ship!==bill,firstOrder:prior===0,guest:!cart.customerId,paymentMethod:order.paymentMethod,country:ship||bill||null,ipHash:securityHash(req?requestIp(req):null)};let score=(signals.highValue?20:0)+(signals.countryMismatch?25:0)+(signals.firstOrder?5:0)+(signals.guest?5:0);let decision='ALLOW';const hits:string[]=[];const rules:any[]=await db.fraudRule.findMany({where:{storeId:cart.storeId,enabled:true},orderBy:{priority:'asc'}});for(const rule of rules){const c:any=rule.conditions||{};const match=(c.minTotal==null||Number(order.grandTotal)>=Number(c.minTotal))&&(c.maxTotal==null||Number(order.grandTotal)<=Number(c.maxTotal))&&(!Array.isArray(c.countries)||!c.countries.length||c.countries.map((x:any)=>String(x).toUpperCase()).includes(ship||bill))&&(!Array.isArray(c.paymentMethods)||!c.paymentMethods.length||c.paymentMethods.map(String).includes(String(order.paymentMethod)))&&(c.firstOrder==null||Boolean(c.firstOrder)===signals.firstOrder)&&(c.countryMismatch==null||Boolean(c.countryMismatch)===signals.countryMismatch);if(!match)continue;hits.push(rule.name);const a:any=rule.actions||{};score+=Number(a.scoreAdd||0);const d=String(a.decision||'').toUpperCase();if(d==='BLOCK')decision='BLOCK';else if(d==='REVIEW'&&decision!=='BLOCK')decision='REVIEW';}
    score=Math.max(0,Math.min(100,score));const level=score>=70?'HIGH':score>=40?'MEDIUM':'LOW';await db.orderRiskAssessment.upsert({where:{storeId_orderId:{storeId:cart.storeId,orderId:order.id}},create:{storeId:cart.storeId,orderId:order.id,score,level,signals:{...signals,ruleHits:hits},decision},update:{score,level,signals:{...signals,ruleHits:hits},decision}});await db.order.update({where:{id:order.id},data:{riskLevel:level,riskReason:hits.join(', ')||null}});if(decision==='BLOCK')throw new BadRequestException('Order blocked by risk policy');return{score,level,decision,signals,ruleHits:hits};
  }
  private async calculateCart(cart:any){const ci=await this.currencyInfo(cart.store,cart.currency);const customerGroupDiscountPercent=await this.customerGroupDiscount(this.prisma,cart.storeId,cart.customer?.groupId);const regular=cart.items.filter((i:any)=>!i.isGift);const commercePrices=await this.commercePriceMap(this.prisma,cart.storeId,cart.customerId,cart.customer?.groupId,this.commerceCountry(cart),ci.code,regular.map((i:any)=>({variantId:i.variantId,quantity:i.quantity})));const items=regular.map((i:any)=>{const cp=commercePrices.get(i.variantId);const base=cp?cp.price:this.displayVariantPrice(i.variant.product,i.variant,ci,cart.customer?.groupId,customerGroupDiscountPercent);return{variantId:i.variantId,productId:i.variant.productId,brandId:i.variant.product.brandId||null,sku:i.variant.sku,categoryIds:i.variant.product.categories.map((c:any)=>c.categoryId),quantity:i.quantity,unitPrice:this.sellingPlanPrice(base,i.sellingPlan),priceSource:cp?.source||'BASE',priceListId:cp?.priceListId||null,marketId:cp?.marketId||null}});const subtotal=items.reduce((s:any,i:any)=>s+i.unitPrice*i.quantity,0);const customerOrderCount=cart.customerId?await this.prisma.order.count({where:{customerId:cart.customerId}}):0;const promos=await this.activePromotions(cart,ci);const customerMeta:any=cart.customer?.metadata||{};const promotion=evaluatePromotions(promos,{subtotal,items,currency:ci.code,customerTags:cart.customer?.tags||[],customerOrderCount,couponCodes:(cart.couponCodes||[]).map((x:string)=>x.toUpperCase()),exchangeRate:ci.rate,shippingCountry:(cart.shippingAddress as any)?.country,customerId:cart.customerId,customerGroupId:cart.customer?.groupId||null,customerName:[cart.customer?.firstName,cart.customer?.lastName].filter(Boolean).join(' '),customerBirthDate:customerMeta.birthDate||null});let discountTotal=promotion.discountTotal;let freeShipping=promotion.freeShipping;
    const cartProductIds=new Set(items.map((x:any)=>String(x.productId)));for(const row of regular){const cfg:any=(row.variant?.product?.metadata as any)?.together||{};if(!cfg.bundleEnabled||Number(cfg.bundlePrice)<=0||!Array.isArray(cfg.productIds)||!cfg.productIds.length)continue;const relationIds=cfg.productIds.map(String);if(!relationIds.every((id:string)=>cartProductIds.has(id)))continue;const selected=[row,...regular.filter((x:any)=>relationIds.includes(String(x.variant?.productId)))];const regularTotal=selected.reduce((sum:number,x:any)=>sum+this.displayVariantPrice(x.variant.product,x.variant,ci,cart.customer?.groupId,customerGroupDiscountPercent),0);const bundleTarget=this.money(Number(cfg.bundlePrice),ci.rate,ci.rounding);discountTotal+=Math.max(0,regularTotal-bundleTarget);}discountTotal=Math.min(subtotal,discountTotal);
    if(cart.discountCode){try{const d=await this.validDiscount(cart.storeId,cart.discountCode,subtotal);let eligible=subtotal;if(d.scope==='PRODUCT'&&d.products.length)eligible=items.filter((i:any)=>d.products.some((p:any)=>p.productId===i.productId)).reduce((s:any,i:any)=>s+i.unitPrice*i.quantity,0);if(d.scope==='CATEGORY'&&d.categories.length)eligible=items.filter((i:any)=>i.categoryIds.some((c:string)=>d.categories.some((x:any)=>x.categoryId===c))).reduce((s:any,i:any)=>s+i.unitPrice*i.quantity,0);let legacy=0;if(d.type==='PERCENTAGE')legacy=eligible*Number(d.value)/100;if(d.type==='FIXED_AMOUNT')legacy=this.money(d.value,ci.rate,ci.rounding);if(d.type==='FREE_SHIPPING')freeShipping=true;if(d.maximumDiscount)legacy=Math.min(legacy,this.money(d.maximumDiscount,ci.rate,ci.rounding));discountTotal=Math.min(subtotal,discountTotal+legacy);}catch{}}
    let shippingTotal=0;if(cart.shippingMethodId&&!freeShipping){const m=await this.prisma.shippingMethod.findFirst({where:{id:cart.shippingMethodId,storeId:cart.storeId,isActive:true}});if(m){const country=this.normalizeShippingCountry((cart.shippingAddress as any)?.country||(cart.billingAddress as any)?.country||cart.store?.defaultCountry||'');const profileRates=await this.shippingProfileRates(this.prisma,cart,ci,Math.max(0,subtotal-discountTotal),country,[m],items);const profileRate=profileRates?.get(String(m.id));if(profileRates&&!profileRate)shippingTotal=0;else if(profileRate)shippingTotal=Number(profileRate.price||0);else{const freeAbove=m.freeAbove==null?null:this.money(m.freeAbove,ci.rate,ci.rounding);shippingTotal=freeAbove&&subtotal-discountTotal>=freeAbove?0:this.money(m.price,ci.rate,ci.rounding);}}}
    let paymentFee=0;if(cart.paymentMethodId){const m=await this.prisma.paymentMethod.findFirst({where:{id:cart.paymentMethodId,storeId:cart.storeId,isActive:true}});if(m)paymentFee=this.money(m.fee,ci.rate,ci.rounding);}
    const settings:any=cart.store.settings||{};const taxPolicy:any=settings.taxInvoicePolicy||{};const regionalTax:any=settings?.regional?.tax||{};const base=subtotal-discountTotal+shippingTotal+paymentFee;const defaultTaxRate=Math.max(0,Number(taxPolicy.defaultTaxRate??regionalTax.defaultRate??settings.taxRate??0));const pricesIncludeTax=Boolean(taxPolicy.pricesIncludeTax??regionalTax.pricesIncludeTax??settings.pricesIncludeTax);const destination:any=(taxPolicy.destinationBased!==false?(cart.shippingAddress||cart.billingAddress):(cart.billingAddress||cart.shippingAddress))||{};const taxCountry=String(destination.country||cart.store.defaultCountry||'TR').toUpperCase();const taxSubdivision=String(destination.state||destination.subdivision||'').toUpperCase();const taxExempt=taxPolicy.exemptionsEnabled!==false&&customerMeta.taxExempt===true;const discountFactor=subtotal>0?Math.max(0,(subtotal-discountTotal)/subtotal):1;
    const categoryRate=(category:any,fallback:number)=>{if(!category||category.isActive===false)return fallback;const rules:any[]=Array.isArray(category.rules)?category.rules:[];const matched=rules.filter((r:any)=>(!r.country||String(r.country).toUpperCase()===taxCountry)&&(!r.subdivision||String(r.subdivision).toUpperCase()===taxSubdivision)).sort((a:any,b:any)=>Number(!!b.subdivision)-Number(!!a.subdivision)||Number(!!b.country)-Number(!!a.country)||Number(a.priority||100)-Number(b.priority||100))[0];return Math.max(0,Number(matched?.rate??category.rate??fallback));};
    const itemTax=regular.reduce((sum:number,row:any)=>{const category:any=row.variant?.product?.taxCategory;const rate=taxExempt?0:categoryRate(category,defaultTaxRate);const priced=items.find((x:any)=>x.variantId===row.variantId);const line=Number(priced?.unitPrice||0)*row.quantity*discountFactor;return sum+(rate<=0?0:(pricesIncludeTax?line-line/(1+rate/100):line*rate/100))},0);
    const extras:any[]=await this.prisma.taxCategory.findMany({where:{storeId:cart.storeId,usageType:{in:['SHIPPING','PAYMENT_FEE']},isActive:true,isDefault:true},include:{rules:true}});const shippingCategory=extras.find(x=>x.usageType==='SHIPPING'),paymentFeeCategory=extras.find(x=>x.usageType==='PAYMENT_FEE');const shippingRate=taxExempt?0:categoryRate(shippingCategory,defaultTaxRate),paymentFeeRate=taxExempt?0:categoryRate(paymentFeeCategory,defaultTaxRate);const shippingTax=taxPolicy.shippingTaxable===false?0:(pricesIncludeTax?shippingTotal-shippingTotal/(1+shippingRate/100):shippingTotal*shippingRate/100);const paymentFeeTax=taxPolicy.paymentFeeTaxable===false?0:(pricesIncludeTax?paymentFee-paymentFee/(1+paymentFeeRate/100):paymentFee*paymentFeeRate/100);const taxTotal=itemTax+shippingTax+paymentFeeTax;const gifts=[] as any[];for(const g of promotion.gifts){const v=await this.prisma.variant.findFirst({where:{id:g.variantId,isActive:true,product:{storeId:cart.storeId,status:'ACTIVE',AND:this.productPublicationAnd()}},include:{product:{include:{images:{take:1}}},inventory:true}});if(v){const targets=await this.inventoryTargets(this.prisma,cart.storeId,v,g.quantity);const available=targets.length>0;if(available)gifts.push({promotionId:g.promotionId,variantId:v.id,quantity:g.quantity,sku:v.sku,title:`${v.product.title} - ${v.title}`,unitPrice:0,product:v.product});}}
    return{subtotal,discountTotal,shippingTotal,paymentFee,taxTotal,grandTotal:Math.max(0,base+taxTotal),currency:ci.code,exchangeRate:ci.rate,customerGroupDiscountPercent,appliedPromotions:promotion.applied,gifts,freeShipping,items};}

  private async blogTranslationMap(storeId:string,type:string,ids:string[],locale:string){if(!ids.length)return new Map<string,any>();const rows=await this.prisma.contentTranslation.findMany({where:{storeId,entityType:type,entityId:{in:ids},locale},select:{entityId:true,fields:true}});return new Map(rows.map((x:any)=>[x.entityId,x.fields||{}]));}
  async blogCategories(slug:string,locale?:string){const store=await this.store(slug);const loc=locale||store.locale;const rows=await this.prisma.blogCategory.findMany({where:{storeId:store.id,isActive:true},select:{id:true,parentId:true,title:true,slug:true,description:true,imageUrl:true,seoTitle:true,seoDescription:true,canonicalUrl:true,noIndex:true,sortOrder:true},orderBy:[{sortOrder:'asc'},{title:'asc'}]});const tr=loc===store.locale?new Map<string,any>():await this.blogTranslationMap(store.id,'blog_category',rows.map(x=>x.id),loc);return rows.map((x:any)=>({...x,...(tr.get(x.id)||{})}));}
  async blogPosts(slug:string,q:any={}){const store=await this.store(slug);const page=Math.max(1,Number(q.page||1));const limit=Math.min(48,Math.max(1,Number(q.limit||12)));const loc=String(q.locale||store.locale);const where:any={storeId:store.id,status:'PUBLISHED',publishedAt:{lte:new Date()}};if(q.category){let cat=await this.prisma.blogCategory.findFirst({where:{storeId:store.id,slug:String(q.category),isActive:true},select:{id:true}});if(!cat&&loc!==store.locale){const tr=await this.prisma.contentTranslation.findFirst({where:{storeId:store.id,entityType:'blog_category',locale:loc,fields:{path:['slug'],equals:String(q.category)}} as any,select:{entityId:true}});if(tr)cat={id:tr.entityId};}where.categoryId=cat?.id||'__none__';}if(q.author){let author=await this.prisma.blogAuthor.findFirst({where:{storeId:store.id,slug:String(q.author),isActive:true},select:{id:true}});if(!author&&loc!==store.locale){const tr=await this.prisma.contentTranslation.findFirst({where:{storeId:store.id,entityType:'blog_author',locale:loc,fields:{path:['slug'],equals:String(q.author)}} as any,select:{entityId:true}});if(tr)author={id:tr.entityId};}where.authorId=author?.id||'__none__';}if(q.tag)where.tags={has:String(q.tag)};if(q.q){where.OR=[{title:{contains:String(q.q),mode:'insensitive'}},{excerpt:{contains:String(q.q),mode:'insensitive'}},{body:{contains:String(q.q),mode:'insensitive'}},{tags:{has:String(q.q)}}];}const[items,total]=await Promise.all([this.prisma.blogPost.findMany({where,select:{id:true,title:true,slug:true,excerpt:true,featuredImageUrl:true,ogImageUrl:true,seoTitle:true,seoDescription:true,canonicalUrl:true,noIndex:true,isFeatured:true,readingTime:true,tags:true,publishedAt:true,updatedAt:true,author:{select:{id:true,name:true,slug:true,imageUrl:true,bio:true}},category:{select:{id:true,title:true,slug:true}},_count:{select:{comments:{where:{status:'APPROVED'}}}}},orderBy:[{isFeatured:'desc'},{publishedAt:'desc'}],skip:(page-1)*limit,take:limit}),this.prisma.blogPost.count({where})]);const postTr=loc===store.locale?new Map<string,any>():await this.blogTranslationMap(store.id,'blog_post',items.map(x=>x.id),loc);const catIds=items.map(x=>x.category?.id).filter(Boolean) as string[],authorIds=items.map(x=>x.author?.id).filter(Boolean) as string[];const catTr=loc===store.locale?new Map<string,any>():await this.blogTranslationMap(store.id,'blog_category',catIds,loc);const authTr=loc===store.locale?new Map<string,any>():await this.blogTranslationMap(store.id,'blog_author',authorIds,loc);return{items:items.map((x:any)=>({...x,...(postTr.get(x.id)||{}),category:x.category?{...x.category,...(catTr.get(x.category.id)||{})}:null,author:x.author?{...x.author,...(authTr.get(x.author.id)||{})}:null})),total,page,limit,pages:Math.max(1,Math.ceil(total/limit)),locale:loc};}
  async blogPost(slug:string,postSlug:string,currency?:string,locale?:string){const store=await this.store(slug);const loc=locale||store.locale;let postId:string|undefined=(await this.prisma.blogPost.findFirst({where:{storeId:store.id,slug:postSlug,status:'PUBLISHED',publishedAt:{lte:new Date()}},select:{id:true}}))?.id;if(!postId){const code=String(loc).toLowerCase().split(/[-_]/)[0];const trs=await this.prisma.contentTranslation.findMany({where:{storeId:store.id,entityType:'blog_post',fields:{path:['slug'],equals:postSlug}} as any,select:{entityId:true,locale:true}});postId=trs.find((t:any)=>String(t.locale||'').toLowerCase().split(/[-_]/)[0]===code)?.entityId;}if(!postId)throw new NotFoundException('Blog post not found');const post=await this.prisma.blogPost.findFirst({where:{id:postId,storeId:store.id,status:'PUBLISHED',publishedAt:{lte:new Date()}},include:{category:true,author:true,products:{orderBy:{sortOrder:'asc'},include:{product:{include:{images:{take:1,orderBy:{sortOrder:'asc'}},variants:{where:{isActive:true},include:{inventory:true,warehouseStocks:true},take:1}}}}},relatedFrom:{orderBy:{sortOrder:'asc'},include:{relatedPost:{select:{id:true,title:true,slug:true,excerpt:true,featuredImageUrl:true,publishedAt:true,status:true}}}},comments:{where:{status:'APPROVED'},select:{id:true,authorName:true,body:true,createdAt:true},orderBy:{createdAt:'desc'}}}});if(!post)throw new NotFoundException('Blog post not found');const ids=[post.id,...post.relatedFrom.map((x:any)=>x.relatedPost.id)];const pTr=loc===store.locale?new Map<string,any>():await this.blogTranslationMap(store.id,'blog_post',ids,loc);const cTr=post.category&&loc!==store.locale?await this.blogTranslationMap(store.id,'blog_category',[post.category.id],loc):new Map<string,any>();const aTr=post.author&&loc!==store.locale?await this.blogTranslationMap(store.id,'blog_author',[post.author.id],loc):new Map<string,any>();const ci=await this.currencyInfo(store,currency);return{...post,...(pTr.get(post.id)||{}),category:post.category?{...post.category,...(cTr.get(post.category.id)||{})}:null,author:post.author?{...post.author,...(aTr.get(post.author.id)||{})}:null,relatedPosts:post.relatedFrom.filter((x:any)=>x.relatedPost.status==='PUBLISHED').map((x:any)=>({...x.relatedPost,...(pTr.get(x.relatedPost.id)||{})})),products:post.products.map((x:any)=>({...x,product:this.presentProduct(x.product,ci)})),commentSettings:this.commentSettings(store).blogComments,locale:loc};}
  async addGuestBlogComment(slug:string,postSlug:string,body:any,req?:any){const store=await this.store(slug);const cfg=this.commentSettings(store).blogComments;if(!cfg.enabled)throw new BadRequestException('Blog comments are disabled');if(!cfg.allowGuest)throw new UnauthorizedException('Guest blog comments are disabled');const post=await this.prisma.blogPost.findFirst({where:{storeId:store.id,slug:postSlug,status:'PUBLISHED'}});if(!post)throw new NotFoundException('Blog post not found');const authorName=String(body.authorName||'').trim();const text=String(body.body||'').trim();if(!authorName||text.length<2)throw new BadRequestException('Name and comment are required');return this.prisma.blogComment.create({data:{storeId:store.id,postId:post.id,authorName,authorEmail:body.authorEmail?String(body.authorEmail).toLowerCase():null,body:text,status:cfg.autoApprove?'APPROVED':'PENDING',ipHash:securityHash(req?requestIp(req):null),userAgentHash:securityHash(req?.headers?.['user-agent'])}});}
  async addCustomerBlogComment(customerId:string,body:any,req?:any){const customer=await this.prisma.customer.findUnique({where:{id:customerId}});if(!customer)throw new NotFoundException();const store=await this.prisma.tenant.findUnique({where:{id:customer.storeId}});const cfg=this.commentSettings(store).blogComments;if(!cfg.enabled)throw new BadRequestException('Blog comments are disabled');const post=await this.prisma.blogPost.findFirst({where:{id:body.postId,storeId:customer.storeId,status:'PUBLISHED'}});if(!post)throw new NotFoundException('Blog post not found');const text=String(body.body||'').trim();if(text.length<2)throw new BadRequestException('Comment is required');return this.prisma.blogComment.create({data:{storeId:customer.storeId,postId:post.id,customerId,authorName:[customer.firstName,customer.lastName].filter(Boolean).join(' ')||customer.email,authorEmail:customer.email,body:text,status:cfg.autoApprove?'APPROVED':'PENDING',ipHash:securityHash(req?requestIp(req):null),userAgentHash:securityHash(req?.headers?.['user-agent'])}});}

  async prepareCheckout(token:string,body:any,customerId?:string){
    const cart:any=await this.getCart(token);
    if(cart.status!=='active')throw new BadRequestException('Cart is not active');
    if(!['ACTIVE','TRIAL'].includes(String(cart.store?.status||'')))throw new BadRequestException('Store is not accepting orders');
    if(!cart.items.filter((x:any)=>!x.isGift).length)throw new BadRequestException('Cart is empty');
    const cfg:any=await this.prisma.checkoutConfig.findUnique({where:{storeId:cart.storeId}});
    const accessMode=String(cfg?.customerAccessMode||(cfg?.allowGuestCheckout===false?'REQUIRED':'GUEST'));
    if(accessMode==='REQUIRED'&&!customerId)throw new UnauthorizedException('Customer login is required for checkout');
    if(customerId){const customer=await this.prisma.customer.findFirst({where:{id:customerId,storeId:cart.storeId,isActive:true},select:{id:true}});if(!customer)throw new UnauthorizedException('Customer does not belong to this store');}
    const email=String(body?.email||'').trim().toLowerCase();if(!email||!email.includes('@'))throw new BadRequestException('A valid email is required');
    if((cfg?.requirePhone??true)&&!String(body?.phone||'').trim())throw new BadRequestException('Phone is required');
    if((cfg?.requireBillingAddress??false)&&!body?.billingAddress)throw new BadRequestException('Billing address is required');
    const consents=body?.consents||{};
    if((cfg?.requireTerms??true)&&consents.terms!==true)throw new BadRequestException('Terms acceptance is required');
    if((cfg?.requirePrivacyNotice??true)&&consents.privacy!==true)throw new BadRequestException('Privacy notice acknowledgement is required');
    if((cfg?.requireKvkkNotice??false)&&consents.kvkkNotice!==true)throw new BadRequestException('KVKK notice acknowledgement is required');
    const ci=await this.currencyInfo(cart.store,cart.currency);
    const checkoutShipping=await this.shippingContextForCart({...cart,shippingAddress:body.shippingAddress||cart.shippingAddress,billingAddress:body.billingAddress||body.shippingAddress||cart.billingAddress},ci,cart.totals,String(body?.shippingAddress?.country||''));
    let shipping:any=null;
    if(!checkoutShipping.digitalOnly){
      const allowed=new Set((checkoutShipping.availableMethods||[]).map((x:any)=>String(x.id)));
      if(!allowed.has(String(body.shippingMethodId||'')))throw new BadRequestException('Select a shipping method available for the delivery country');
      shipping=await this.prisma.shippingMethod.findFirst({where:{id:String(body.shippingMethodId),storeId:cart.storeId,isActive:true}});if(!shipping)throw new BadRequestException('Select a valid shipping method');
    }
    const payment:any=await this.prisma.paymentMethod.findFirst({where:{id:body.paymentMethodId,storeId:cart.storeId,isActive:true}});if(!payment)throw new BadRequestException('Select a valid payment method');
    const appSlug=String((payment.config as any)?.appSlug||'').trim();if(appSlug){const installed=await this.prisma.appInstallation.findFirst({where:{tenantId:cart.storeId,enabled:true,status:'ACTIVE',app:{slug:appSlug,isActive:true}}});if(!installed)throw new BadRequestException('Selected payment module is not installed or active');}
    const shippingAddress=checkoutShipping.digitalOnly?null:body.shippingAddress;
    const billingAddress=body.billingAddress||body.shippingAddress||null;
    await this.prisma.cart.update({where:{id:cart.id},data:{customerId:customerId||cart.customerId,customerEmail:email,shippingMethodId:shipping?.id||null,paymentMethodId:payment.id,shippingAddress,billingAddress,note:body.note,lastActivityAt:new Date()}});
    await this.prisma.abandonedCheckout.upsert({where:{storeId_cartId:{storeId:cart.storeId,cartId:cart.id}},create:{storeId:cart.storeId,cartId:cart.id,customerId:customerId||cart.customerId||null,email,phone:String(body?.phone||'')||null,currency:cart.totals.currency,total:cart.totals.grandTotal,snapshot:{shippingMethodId:shipping?.id||null,paymentMethodId:payment.id,shippingAddress,billingAddress},lastActivityAt:new Date()},update:{customerId:customerId||cart.customerId||undefined,email,phone:String(body?.phone||'')||undefined,currency:cart.totals.currency,total:cart.totals.grandTotal,snapshot:{shippingMethodId:shipping?.id||null,paymentMethodId:payment.id,shippingAddress,billingAddress},status:'OPEN',lastActivityAt:new Date()}});
    return{...(await this.getCart(token)),paymentMethod:payment,shippingMethod:shipping,digitalOnly:!!checkoutShipping.digitalOnly};
  }

  private safeCheckoutOrder(order:any){
    if(!order)return order;
    const customer=order.customer?(({passwordHash,...rest}:any)=>rest)(order.customer):order.customer;
    return {...order,customer};
  }

  async setCartAffiliate(token:string,code:string){
    const cart=await this.prisma.cart.findUnique({where:{token},select:{id:true,storeId:true,status:true}});if(!cart)throw new NotFoundException('Cart not found');if(cart.status!=='active')throw new BadRequestException('Cart is not active');
    const normalized=String(code||'').trim().toUpperCase();if(!normalized)return this.prisma.cart.update({where:{id:cart.id},data:{affiliateCode:null,affiliateClickId:null}});
    const partner=await this.prisma.affiliatePartner.findFirst({where:{storeId:cart.storeId,code:normalized,status:'ACTIVE'}});if(!partner)throw new BadRequestException('Invalid affiliate code');
    return this.prisma.cart.update({where:{id:cart.id},data:{affiliateCode:partner.code,affiliateClickId:randomBytes(16).toString('hex')}});
  }

  async checkout(token:string,body:any,customerId?:string,req?:any){
    if(body.consents && (body.consents.terms===false || body.consents.privacy===false)) throw new BadRequestException('Required legal acknowledgements are missing');
    const idempotencyKey=String(body.idempotencyKey||'').trim();
    if(!idempotencyKey||idempotencyKey.length<12||idempotencyKey.length>160)throw new BadRequestException('A valid checkout idempotency key is required');
    const cartIdentity=await this.prisma.cart.findUnique({where:{token},select:{id:true,storeId:true,status:true}});
    if(!cartIdentity)throw new NotFoundException('Cart not found');
    if((await tenantRestriction(this.prisma,cartIdentity.storeId)).restricted)throw new ForbiddenException('STORE_MAINTENANCE');
    const existing=await this.prisma.order.findUnique({where:{storeId_idempotencyKey:{storeId:cartIdentity.storeId,idempotencyKey}},include:{items:true,customer:true}});
    if(existing){
      if(String((existing.metadata as any)?.checkoutCartId||'')!==cartIdentity.id)throw new BadRequestException('Idempotency key belongs to another checkout');
      if(existing.paymentStatus==='PAID')void this.edoc.maybeAutoCreateForOrder(cartIdentity.storeId,existing.id,'PAYMENT_PAID');
      return{order:this.safeCheckoutOrder(existing),payment:{type:'existing',code:existing.paymentMethod,requiresExternalPayment:existing.paymentStatus==='PENDING'&&String((existing.metadata as any)?.paymentType||'')==='provider'}};
    }
    if(cartIdentity.status!=='active')throw new BadRequestException('Cart is not active');
    if(body.checkoutSessionId){const checkoutSession=await this.prisma.checkoutSession.findFirst({where:{id:String(body.checkoutSessionId),storeId:cartIdentity.storeId,cartId:cartIdentity.id,status:'OPEN'}});if(!checkoutSession)throw new BadRequestException('Invalid checkout session');if(checkoutSession.expiresAt.getTime()<=Date.now())throw new BadRequestException('Checkout session expired');}
    const prepared:any=await this.prepareCheckout(token,body,customerId);const cart:any=prepared;const payment=prepared.paymentMethod;
    const activeSub=await this.prisma.subscription.findFirst({where:{tenantId:cart.storeId,status:{in:['TRIAL','ACTIVE']}},include:{plan:true},orderBy:{createdAt:'desc'}});
    if(!activeSub)throw new BadRequestException('Store subscription is not active');
    // Subscription period end is centrally checked above, including configurable grace.
    if(process.env.LOADTEST_ENV!=='true'&&activeSub?.plan.maxOrdersPerMonth){const now=new Date();const monthStart=new Date(now.getFullYear(),now.getMonth(),1);const count=await this.prisma.order.count({where:{storeId:activeSub.tenantId,createdAt:{gte:monthStart}}});if(count>=activeSub.plan.maxOrdersPerMonth)throw new BadRequestException('Monthly order limit reached for current plan');}

    // Allocate the human-facing order number outside the Serializable transaction.
    // This removes Tenant.nextOrderNumber from the checkout transaction's shared write-set.
    // Gaps are acceptable if a later checkout validation/transaction fails.
    const allocatedOrderNumber=await this.allocateOrderNumber(cart.storeId);

    const holdItems=(cart.items||[]).filter((x:any)=>!x.isGift);const holdGifts=cart.totals.gifts||[];const holdGiftVariants=await Promise.all(holdGifts.map(async(g:any)=>({g,v:await this.prisma.variant.findUnique({where:{id:g.variantId},include:{inventory:true,product:true}})})));const holdRawTargets:any[]=[];const holdDestination=body.shippingAddress||body.billingAddress||cart.shippingAddress||cart.billingAddress||{};for(const item of holdItems)holdRawTargets.push(...await this.inventoryTargets(this.prisma,cart.storeId,item.variant,item.quantity,holdDestination));for(const {g,v} of holdGiftVariants as any){if(!v)throw new BadRequestException('Gift item unavailable');holdRawTargets.push(...await this.inventoryTargets(this.prisma,cart.storeId,v,g.quantity,holdDestination));}const checkoutStockTargets=this.mergeTargets(holdRawTargets);const checkoutInventoryFingerprint=this.checkoutCartInventoryFingerprint(holdItems,holdGifts);await this.acquireCheckoutStockHold(cart.storeId,cart.id,idempotencyKey,checkoutStockTargets);

    const checkoutIsolationRaw=String(process.env.CHECKOUT_TX_ISOLATION||'Serializable');
    const checkoutIsolation=['ReadCommitted','RepeatableRead','Serializable'].includes(checkoutIsolationRaw)?checkoutIsolationRaw:'Serializable';

    for(let checkoutAttempt=0;;checkoutAttempt++){
      try{
        const checkoutResult:any=await this.prisma.$transaction(async tx=>{
        const claimed=await tx.cart.updateMany({where:{id:cart.id,storeId:cart.storeId,status:'active'},data:{status:'converting',lastActivityAt:new Date()}});
        if(claimed.count!==1){
          const prior=await tx.order.findUnique({where:{storeId_idempotencyKey:{storeId:cart.storeId,idempotencyKey}},include:{items:true,customer:true}});
          if(prior&&String((prior.metadata as any)?.checkoutCartId||'')===cart.id){if(prior.paymentStatus==='PAID')void this.edoc.maybeAutoCreateForOrder(cart.storeId,prior.id,'PAYMENT_PAID');return{order:this.safeCheckoutOrder(prior),payment:{type:'existing',code:prior.paymentMethod,requiresExternalPayment:prior.paymentStatus==='PENDING'&&String((prior.metadata as any)?.paymentType||'')==='provider'}};}
          throw new BadRequestException('Cart has already been submitted');
        }
        const store=await tx.tenant.findUnique({where:{id:cart.storeId}});if(!store||!['ACTIVE','TRIAL'].includes(String(store.status)))throw new BadRequestException('Store is not accepting orders');
        const freshItems=await tx.cartItem.findMany({where:{cartId:cart.id,isGift:false},include:{sellingPlan:{include:{group:true}},variant:{include:{inventory:true,product:true,optionValues:{include:{optionValue:{include:{option:true}}}}}}}});
        if(!freshItems.length)throw new BadRequestException('Cart is empty');
        let customer=customerId?await tx.customer.findFirst({where:{id:customerId,storeId:cart.storeId,isActive:true}}):null;
        if(customerId&&!customer)throw new UnauthorizedException('Customer does not belong to this store');
        if(!customer){const email=String(body.email||'').trim().toLowerCase();if(!email)throw new BadRequestException('Email required');customer=await tx.customer.upsert({where:{storeId_email:{storeId:cart.storeId,email}},create:{storeId:cart.storeId,email,firstName:body.firstName,lastName:body.lastName,phone:body.phone},update:{}});}
        const orderCi=await this.currencyInfo(store,cart.currency,tx);
        const checkoutGroupDiscountPercent=await this.customerGroupDiscount(tx,cart.storeId,customer?.groupId);
        const checkoutPriceMap=await this.commercePriceMap(tx,cart.storeId,customer?.id,customer?.groupId,String(body?.shippingAddress?.country||body?.billingAddress?.country||store.defaultCountry||'').toUpperCase(),orderCi.code,freshItems.map((i:any)=>({variantId:i.variantId,quantity:i.quantity})));const regularOrderItems=freshItems.map((item:any)=>{const cp=checkoutPriceMap.get(item.variantId);const raw=cp?cp.price:this.displayVariantPrice(item.variant.product,item.variant,orderCi,customer?.groupId,checkoutGroupDiscountPercent);const unitPrice=this.sellingPlanPrice(raw,item.sellingPlan);return {variantId:item.variantId,productIdSnapshot:item.variant.productId,sku:item.variant.sku,barcodeSnapshot:item.variant.barcode||null,title:item.variant.product.title,variantTitle:item.variant.title,selectedOptions:Object.fromEntries((item.variant.optionValues||[]).map((link:any)=>[String(link.optionValue?.option?.name||''),String(link.optionValue?.name||'')]).filter((x:any)=>x[0]&&x[1])),properties:{...((item.properties as any)||{}),sourceCurrency:String(item.variant.priceCurrency||store.currency||'TRY'),sourceUnitPrice:Number(item.variant.price),rateToOrderCurrency:this.variantRate(item.variant,orderCi),commercePrice:{source:cp?.source||'BASE',priceListId:cp?.priceListId||null,marketId:cp?.marketId||null}},personalization:item.personalization||{},sellingPlanId:item.sellingPlanId||null,sellingPlanSnapshot:item.sellingPlan?{id:item.sellingPlan.id,name:item.sellingPlan.name,group:item.sellingPlan.group,billingPolicy:item.sellingPlan.billingPolicy,deliveryPolicy:item.sellingPlan.deliveryPolicy,pricingPolicy:item.sellingPlan.pricingPolicy}:undefined,quantity:item.quantity,originalUnitPrice:unitPrice,unitPrice,weight:item.variant.weight==null?null:Number(item.variant.weight),total:this.money(unitPrice*item.quantity,1,orderCi.rounding)}});
        const freshSubtotal=this.money(regularOrderItems.reduce((sum:number,item:any)=>sum+Number(item.total),0),1,orderCi.rounding);
        if(Math.abs(freshSubtotal-Number(cart.totals.subtotal||0))>Math.pow(10,-Math.max(0,Number(orderCi.rounding||2))))throw new BadRequestException('Cart price changed during checkout. Please review the updated total.');
        if(prepared.shippingMethod){const txCart:any={...cart,items:freshItems,store,shippingAddress:body.shippingAddress||cart.shippingAddress,billingAddress:body.billingAddress||body.shippingAddress||cart.billingAddress};const freshShipping=await this.shippingContextForCart(txCart,orderCi,{...cart.totals,subtotal:freshSubtotal,items:regularOrderItems},String(body?.shippingAddress?.country||body?.billingAddress?.country||store.defaultCountry||''),tx);const selected=freshShipping.availableMethods.find((x:any)=>String(x.id)===String(prepared.shippingMethod.id));if(!selected)throw new BadRequestException('Selected shipping rate is no longer available. Please review delivery options.');const expectedShipping=cart.totals.freeShipping?0:Number(selected.price||0);if(Math.abs(expectedShipping-Number(cart.totals.shippingTotal||0))>Math.pow(10,-Math.max(0,Number(orderCi.rounding||2))))throw new BadRequestException('Shipping rate changed during checkout. Please review the updated total.');}
        const gifts=cart.totals.gifts||[];const giftVariants=await Promise.all(gifts.map(async(g:any)=>({g,v:await tx.variant.findUnique({where:{id:g.variantId},include:{inventory:true,product:true}})})));if(this.checkoutCartInventoryFingerprint(freshItems,gifts)!==checkoutInventoryFingerprint)throw new BadRequestException('Cart inventory changed during checkout. Please retry.');
        const stockTargets=checkoutStockTargets;
        await this.recordConsents(cart.storeId,customer.id,customer.email,body.consents||{},body.consentVersions||{},req,tx);
        const totals=cart.totals;
        if(cart.discountCode){
          const now=new Date();
          const discount:any=await tx.discount.findFirst({where:{storeId:cart.storeId,code:cart.discountCode,isActive:true,OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]}]}});
          if(!discount)throw new BadRequestException('Discount is no longer available');
          if(discount.minimumAmount&&freshSubtotal<Number(discount.minimumAmount))throw new BadRequestException(`Minimum cart amount is ${discount.minimumAmount}`);
          if(discount.perCustomerLimit&&discount.code){const used=await tx.order.count({where:{storeId:cart.storeId,customerId:customer.id,discountCode:discount.code}});if(used>=discount.perCustomerLimit)throw new BadRequestException('Discount customer usage limit reached');}
          const changed=await tx.discount.updateMany({where:{id:discount.id,...(discount.usageLimit?{usageCount:{lt:discount.usageLimit}}:{})},data:{usageCount:{increment:1}}});
          if(changed.count!==1)throw new BadRequestException('Discount usage limit reached');
        }
        for(const ap of totals.appliedPromotions||[]){
          const promo:any=await tx.promotion.findUnique({where:{id:ap.id}});if(!promo||promo.status!=='ACTIVE')throw new BadRequestException('Promotion is no longer available');
          if(promo.perCustomerLimit){const used=await tx.promotionRedemption.count({where:{promotionId:promo.id,customerId:customer.id}});if(used>=promo.perCustomerLimit)throw new BadRequestException('Promotion customer usage limit reached');}
          const changed=await tx.promotion.updateMany({where:{id:promo.id,...(promo.usageLimit?{usageCount:{lt:promo.usageLimit}}:{})},data:{usageCount:{increment:1}}});if(changed.count!==1)throw new BadRequestException('Promotion usage limit reached');
          if(ap.code){const code:any=await tx.promotionCode.findFirst({where:{promotionId:ap.id,code:String(ap.code).toUpperCase(),isActive:true}});if(!code)throw new BadRequestException('Promotion code is no longer available');const codeChanged=await tx.promotionCode.updateMany({where:{id:code.id,...(code.usageLimit?{usageCount:{lt:code.usageLimit}}:{})},data:{usageCount:{increment:1}}});if(codeChanged.count!==1)throw new BadRequestException('Promotion code usage limit reached');}
        }
        const tenderPreview=await this.tenderPreview(tx,cart.storeId,customer.id,totals.currency,totals.grandTotal,{...body,useStoreCredit:customerId?!!body.useStoreCredit:false});
        let b2bTerms:any=null;if(this.isB2BTermsPayment(payment)){if(tenderPreview.payable<=0)throw new BadRequestException('B2B payment terms are not required for a fully prepaid order');b2bTerms=await this.b2bPaymentContext(tx,cart.storeId,customer.id,totals.currency,tenderPreview.payable,body.b2bCompanyLocationId||null);if(!b2bTerms.eligible)throw new BadRequestException(b2bTerms.reason==='CREDIT_LIMIT_EXCEEDED'?'Company credit limit exceeded':'B2B payment terms are not available for this customer');}
        const giftOrderItems=giftVariants.map(({g,v}:any)=>({variantId:v.id,sku:v.sku,title:`${v.product.title} - ${v.title} (Gift)`,quantity:g.quantity,unitPrice:0,total:0}));

        const b2bBuyer=customer.id?await tx.b2BBuyer.findFirst({where:{customerId:customer.id},include:{company:true}}):null;const salesChannel=await this.ensureSalesChannel(tx,cart.storeId,'storefront','Online Mağaza','STOREFRONT');const order=await tx.order.create({data:{storeId:cart.storeId,customerId:customer.id,salesChannelId:salesChannel.id,salesChannelSnapshot:{id:salesChannel.id,key:salesChannel.key,name:salesChannel.name,type:salesChannel.type},number:allocatedOrderNumber,idempotencyKey,status:tenderPreview.payable<=0?'PROCESSING':(payment.type==='cod'||this.isB2BTermsPayment(payment))?'PROCESSING':'PENDING_PAYMENT',paymentStatus:tenderPreview.payable<=0?'PAID':'PENDING',fulfillmentStatus:'UNFULFILLED',paymentMethod:payment.code,shippingMethod:prepared.shippingMethod?.code||null,currency:totals.currency,exchangeRateSnapshot:orderCi.rate,rateTimestamp:new Date(),reportingCurrency:String(store.currency||'TRY').toUpperCase(),reportingTotalSnapshot:Math.round(totals.grandTotal/orderCi.rate*100)/100,subtotal:freshSubtotal,discountTotal:totals.discountTotal,shippingTotal:totals.shippingTotal,paymentFee:totals.paymentFee||0,taxTotal:totals.taxTotal,grandTotal:totals.grandTotal,discountCode:cart.discountCode,promotionSnapshot:{applied:totals.appliedPromotions,gifts:totals.gifts,couponCodes:cart.couponCodes},metadata:{exchangeRate:totals.exchangeRate,checkoutCartId:cart.id,checkoutSessionId:body.checkoutSessionId||null,paymentType:payment.type,reservationState:'HELD',reservationCreatedAt:new Date().toISOString(),affiliateCode:cart.affiliateCode||null,affiliateClickId:cart.affiliateClickId||null,paymentBreakdown:{giftCard:Number(tenderPreview.giftCard?.amount||0),storeCredit:Number(tenderPreview.storeCredit?.amount||0),externalPayable:Number(tenderPreview.payable||0)},b2bTerms:b2bTerms?{companyId:b2bTerms.companyId,companyName:b2bTerms.companyName,locationId:b2bTerms.locationId,termsDays:b2bTerms.termsDays,creditLimit:b2bTerms.creditLimit,openBalanceBefore:b2bTerms.openBalance,amount:Number(tenderPreview.payable||0),dueAt:new Date(Date.now()+b2bTerms.termsDays*86400000).toISOString()}:null},customerNote:body.note,shippingAddress:body.shippingAddress,billingAddress:body.billingAddress||body.shippingAddress,items:{create:[...regularOrderItems,...giftOrderItems]},statusHistory:{create:{status:'CREATED',note:'Order created from storefront'}}},include:{items:true,customer:true}});
        const risk=await this.assessOrderRisk(tx,cart,customer,order,body,req);await this.consumeTenders(tx,tenderPreview,cart.storeId,customer.id,totals.currency,order.id,idempotencyKey);
        // Affiliate attribution is captured from the cart and converted into a pending commission record at order creation.
        if(cart.affiliateCode){const partner=await tx.affiliatePartner.findFirst({where:{storeId:cart.storeId,code:String(cart.affiliateCode),status:'ACTIVE'}});if(partner){const commission=partner.commissionType==='FIXED'?Number(partner.commissionValue):Number(order.grandTotal)*Number(partner.commissionValue)/100;await tx.affiliateConversion.upsert({where:{storeId_orderId:{storeId:cart.storeId,orderId:order.id}},create:{storeId:cart.storeId,partnerId:partner.id,orderId:order.id,customerId:customer.id,status:'PENDING',orderTotal:order.grandTotal,commission,source:'STOREFRONT_REF',clickId:cart.affiliateClickId||null,metadata:{code:partner.code}},update:{orderTotal:order.grandTotal,commission}});}}
        // Materialize ORDER_CREATED automations idempotently inside the checkout transaction.
        const orderAutomations=await tx.marketingAutomation.findMany({where:{storeId:cart.storeId,enabled:true,trigger:'ORDER_CREATED'}});for(const automation of orderAutomations){await tx.marketingAutomationRun.upsert({where:{automationId_eventKey:{automationId:automation.id,eventKey:`order:${order.id}:created`}},create:{storeId:cart.storeId,automationId:automation.id,eventKey:`order:${order.id}:created`,customerId:customer.id,orderId:order.id,status:'PENDING',nextRunAt:new Date(Date.now()+automation.delayMinutes*60000),context:{number:order.number,total:Number(order.grandTotal),currency:order.currency}},update:{}});}
        for(const target of stockTargets){if(!target.inventory?.trackStock||!target.warehouseId)continue;const orderItem=order.items.find((x:any)=>x.variantId===target.variantId);await tx.inventoryReservation.create({data:{storeId:cart.storeId,orderId:order.id,orderItemId:orderItem?.id||null,variantId:target.variantId,warehouseId:target.warehouseId,quantity:Number(target.quantity||0),status:'HELD',expiresAt:new Date(Date.now()+30*60*1000)}});}
        const transferGroups=new Map<string,any[]>();for(const target of stockTargets){if(!target.transferTargetWarehouseId||!target.warehouseId||target.transferTargetWarehouseId===target.warehouseId)continue;const key=`${target.warehouseId}:${target.transferTargetWarehouseId}`;const arr=transferGroups.get(key)||[];arr.push({variantId:target.variantId,quantity:Number(target.quantity||0)});transferGroups.set(key,arr);}for(const [key,items] of transferGroups){const [sourceWarehouseId,targetWarehouseId]=key.split(':');await tx.warehouseTransferRequirement.createMany({data:items.map((it:any)=>({storeId:cart.storeId,orderId:order.id,orderItemId:order.items.find((x:any)=>x.variantId===it.variantId)?.id||null,variantId:it.variantId,sourceWarehouseId,targetWarehouseId,quantity:Number(it.quantity||0),priority:'NORMAL',status:'OPEN'}))});await tx.orderStatusHistory.create({data:{orderId:order.id,status:'WAREHOUSE_TRANSFER_REQUIRED',note:'Eksik stok transfer havuzuna eklendi; sipariş tek depoda birleştirilecek'}});}
        let paymentAttempt:any=null;let paymentSessionToken:string|null=null;if(tenderPreview.payable>0&&(payment.type==='provider'||payment.requiresOnlinePayment===true)){paymentSessionToken=randomBytes(32).toString('base64url');paymentAttempt=await tx.paymentAttempt.create({data:{storeId:cart.storeId,orderId:order.id,provider:String(payment.code||payment.type||'provider'),providerAccountId:String(payment.providerAccountId||'')||null,amount:tenderPreview.payable,currency:order.currency,status:'CREATED',idempotencyKey:`${idempotencyKey}:payment:1`,raw:{paymentBreakdown:(order.metadata as any)?.paymentBreakdown||null,publicTokenHash:this.tokenHash(paymentSessionToken)}}});}
        for(const ap of totals.appliedPromotions||[])await tx.promotionRedemption.create({data:{promotionId:ap.id,customerId:customer.id,orderId:order.id,code:ap.code||null,discountAmount:Number(ap.discount||0)}});
        await tx.cart.update({where:{id:cart.id},data:{status:'converted',customerId:customer.id,customerEmail:customer.email,recoveredAt:new Date()}});await tx.abandonedCheckout.updateMany({where:{storeId:cart.storeId,cartId:cart.id,status:'OPEN'},data:{status:'RECOVERED',recoveredOrderId:order.id,recoveredAt:new Date()}});
        if(body.checkoutSessionId)await tx.checkoutSession.updateMany({where:{id:String(body.checkoutSessionId),cartId:cart.id,storeId:cart.storeId,status:'OPEN'},data:{status:'COMPLETED',completedAt:new Date(),orderId:order.id}});

        // WarehouseStock was atomically pre-reserved in a short transaction before the long checkout transaction.
        // Consume the durable hold only after all checkout writes are ready; a rollback leaves the hold HELD
        // and the outer error path releases it. Successful commits hand ownership to InventoryReservation rows.
        await this.consumeCheckoutStockHold(tx,cart.storeId,cart.id,idempotencyKey,stockTargets);

        return{order:this.safeCheckoutOrder({...order,riskLevel:risk.level,riskReason:risk.ruleHits.join(', ')||null}),payment:{type:payment.type,code:payment.code,instructions:payment.instructions,requiresExternalPayment:tenderPreview.payable>0&&(payment.type==='provider'||payment.requiresOnlinePayment===true),paymentStatus:tenderPreview.payable<=0?'PAID':order.paymentStatus,paymentAttemptId:paymentAttempt?.id||null,paymentSessionToken:paymentSessionToken||null,providerConfig:(payment.config as any)?.public||{},paymentBreakdown:{giftCard:Number(tenderPreview.giftCard?.amount||0),storeCredit:Number(tenderPreview.storeCredit?.amount||0),externalPayable:Number(tenderPreview.payable||0)},b2bTerms:b2bTerms?{...b2bTerms,dueAt:new Date(Date.now()+b2bTerms.termsDays*86400000).toISOString()}:null}};
      },{isolationLevel:checkoutIsolation,maxWait:10000,timeout:30000} as any);
        if(checkoutResult?.order?.id&&checkoutResult.order.paymentStatus==='PAID')void this.edoc.maybeAutoCreateForOrder(cart.storeId,checkoutResult.order.id,'PAYMENT_PAID');
        return checkoutResult;
    }catch(error:any){
      if(String(error?.code||'')==='P2002'){
        const prior=await this.prisma.order.findUnique({where:{storeId_idempotencyKey:{storeId:cart.storeId,idempotencyKey}},include:{items:true,customer:true}});
        if(prior&&String((prior.metadata as any)?.checkoutCartId||'')===cart.id){if(prior.paymentStatus==='PAID')void this.edoc.maybeAutoCreateForOrder(cart.storeId,prior.id,'PAYMENT_PAID');return{order:this.safeCheckoutOrder(prior),payment:{type:'existing',code:prior.paymentMethod,requiresExternalPayment:prior.paymentStatus==='PENDING'&&String((prior.metadata as any)?.paymentType||'')==='provider'}};}
      }
        const code=String(error?.code||'');
        if(code==='P2034'&&checkoutAttempt<3){
          const backoffMs=Math.min(800,80*(2**checkoutAttempt))+Math.floor(Math.random()*80);
          await new Promise(resolve=>setTimeout(resolve,backoffMs));
          continue;
        }
        await this.releaseCheckoutStockHold(cart.storeId,cart.id,idempotencyKey).catch(()=>undefined);
        throw error;
      }
    }
  }

  async productRecommendations(slug:string,productSlug:string,type='related',limitValue:any=12,currency?:string,locale?:string){
    const store=await this.store(slug);
    const limit=Math.max(1,Math.min(24,Number(limitValue||12)||12));
    const anchor:any=await this.prisma.product.findFirst({
      where:{storeId:store.id,status:'ACTIVE',OR:[{slug:productSlug},{id:productSlug}]},
      select:{id:true,slug:true,metadata:true,categories:{select:{categoryId:true}},collections:{select:{collectionId:true}}}
    });
    if(!anchor)return{performed:true,products:[],products_count:0};
    const meta:any=anchor.metadata||{};
    const mode=String(type||'related').toLowerCase();
    const togetherIds=Array.isArray(meta?.together?.productIds)?meta.together.productIds.map(String):[];
    const relatedIds=Array.isArray(meta?.recommendations?.relatedProductIds)?meta.recommendations.relatedProductIds.map(String):[];
    const requested=mode==='complementary'?togetherIds:relatedIds;
    let products:any[]=[];
    if(requested.length){
      products=(await this.productSelection(slug,requested.filter((x:string)=>x!==String(anchor.id)).join(','),currency,locale)).items||[];
    }else if(mode!=='complementary'){
      const categoryIds=anchor.categories.map((x:any)=>x.categoryId);
      const collectionIds=anchor.collections.map((x:any)=>x.collectionId);
      const or:any[]=[];
      if(categoryIds.length)or.push({categories:{some:{categoryId:{in:categoryIds}}}});
      if(collectionIds.length)or.push({collections:{some:{collectionId:{in:collectionIds}}}});
      if(or.length){
        const ci=await this.currencyInfo(store,currency);
        const rows:any[]=await this.prisma.product.findMany({
          where:{storeId:store.id,status:'ACTIVE',id:{not:anchor.id},OR:or},
          include:{
            brand:true,
            images:{orderBy:{sortOrder:'asc'}},
            variants:{where:{isActive:true},include:{inventory:true,warehouseStocks:true,quantityRule:true,optionValues:{include:{optionValue:{include:{option:true}}}},media:{include:{image:true}},sellingPlans:{include:{sellingPlan:{include:{group:true}}}}}},
            categories:{include:{category:true}},
            reviews:{where:{status:'APPROVED'},select:{rating:true}}
          },
          orderBy:{createdAt:'desc'},
          take:limit
        });
        const localized=await this.translateMany(store.id,'product',rows,locale,store.locale);
        products=localized.map((p:any)=>this.presentProduct({...p,rating:p.reviews?.length?p.reviews.reduce((a:number,r:any)=>a+Number(r.rating||0),0)/p.reviews.length:null,reviewCount:p.reviews?.length||0},ci));
      }
    }
    products=products.filter((x:any)=>String(x.id)!==String(anchor.id)).slice(0,limit);
    return{performed:true,products,products_count:products.length};
  }

  async publicProductQuestions(slug:string,productSlug:string){
    const store=await this.store(slug);const product=await this.prisma.product.findFirst({where:{storeId:store.id,slug:productSlug,status:'ACTIVE',AND:this.productPublicationAnd()},select:{id:true}});if(!product)throw new NotFoundException('Product not found');
    return this.prisma.question.findMany({where:{storeId:store.id,productId:product.id,type:'PRODUCT',publishOnProduct:true,status:'ANSWERED',answer:{not:null}},select:{id:true,question:true,answer:true,answeredAt:true,createdAt:true},orderBy:{answeredAt:'desc'},take:100});
  }
  async mergeWishlist(customerId:string,storeId:string,productIds:any,locale?:string){
    const ids=Array.from(new Set((Array.isArray(productIds)?productIds:[]).map(String).filter(Boolean))).slice(0,200);
    if(ids.length){const valid=await this.prisma.product.findMany({where:{id:{in:ids},storeId,status:'ACTIVE',AND:this.productPublicationAnd()},select:{id:true}});if(valid.length)await this.prisma.wishlistItem.createMany({data:valid.map(x=>({storeId,customerId,productId:x.id})),skipDuplicates:true});}
    return this.wishlist(customerId,locale);
  }
  async pricingPreview(slug:string,idsRaw:string,currency?:string,locale?:string){
    const store=await this.store(slug);const ci=await this.currencyInfo(store,currency);const ids=this.csv(idsRaw).slice(0,100);
    const products:any[]=await this.prisma.product.findMany({where:{storeId:store.id,status:'ACTIVE',AND:this.productPublicationAnd(),OR:[{id:{in:ids}},{slug:{in:ids}}]},include:{brand:true,categories:true,variants:{where:{isActive:true},orderBy:{price:'asc'},take:1}}});
    const now=new Date();const day=now.getDay();const promotions=await this.prisma.promotion.findMany({where:{storeId:store.id,status:'ACTIVE',OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]},{OR:[{daysOfWeek:{isEmpty:true}},{daysOfWeek:{has:day}}]}]},include:{codes:{where:{isActive:true}}},orderBy:{priority:'asc'}});
    return {currency:ci.code,items:products.map((p:any)=>{const v=p.variants?.[0];const base=v?this.variantMoney(v.price,v,ci):0;if(!v)return{id:p.id,slug:p.slug,basePrice:0,effectivePrice:0};const result=evaluatePromotions(promotions as any,{subtotal:base,items:[{variantId:v.id,productId:p.id,brandId:p.brandId||null,sku:v.sku,categoryIds:(p.categories||[]).map((c:any)=>c.categoryId),quantity:1,unitPrice:base}],currency:ci.code,customerTags:[],customerOrderCount:0,couponCodes:[],exchangeRate:ci.rate});return{id:p.id,slug:p.slug,basePrice:base,effectivePrice:Math.max(0,base-Number(result.discountTotal||0)),discountTotal:Number(result.discountTotal||0),appliedPromotions:result.applied||[]}})};
  }

  private async recordConsents(storeId:string,customerId:string|null,email:string,consents:any,versions:any,req?:any,tx?:any){const db=tx||this.prisma;const map:any={terms:'TERMS',privacy:'PRIVACY',kvkkNotice:'KVKK_NOTICE',kvkkExplicit:'KVKK_EXPLICIT_CONSENT',emailMarketing:'MARKETING_EMAIL',smsMarketing:'MARKETING_SMS',phoneMarketing:'MARKETING_PHONE'};const rows=Object.entries(map).filter(([k])=>consents[k]!==undefined).map(([k,type])=>({storeId,customerId,email,type,granted:!!consents[k],documentVersion:versions?.[k]||null,source:'storefront',ipHash:securityHash(req?requestIp(req):null),userAgentHash:securityHash(req?.headers?.['user-agent'])}));if(rows.length)await db.consentRecord.createMany({data:rows});if(customerId){const marketing=!!consents.emailMarketing||!!consents.smsMarketing||!!consents.phoneMarketing;await db.customer.update({where:{id:customerId},data:{acceptsMarketing:marketing}}).catch(()=>undefined);}}
  async cookiePreference(slug:string,visitorId:string,body:any){const s=await this.store(slug);return this.prisma.cookiePreference.upsert({where:{storeId_visitorId:{storeId:s.id,visitorId}},create:{storeId:s.id,visitorId,necessary:true,analytics:!!body.analytics,marketing:!!body.marketing,preferences:body.preferences||{},version:body.version},update:{necessary:true,analytics:!!body.analytics,marketing:!!body.marketing,preferences:body.preferences||{},version:body.version}});}
  async privacyRequest(slug:string,body:any){const s=await this.store(slug);const email=String(body.email||'').toLowerCase();if(!email)throw new BadRequestException('Email required');const customer=await this.prisma.customer.findUnique({where:{storeId_email:{storeId:s.id,email}}});return this.prisma.privacyRequest.create({data:{storeId:s.id,customerId:customer?.id||null,email,type:body.type,status:'RECEIVED',requestData:body.requestData||{},dueAt:new Date(Date.now()+30*86400000)}});}
  async requestReturn(customerId:string,orderId:string,body:any){
    const requested=Array.isArray(body.items)?body.items:[];
    if(!requested.length)throw new BadRequestException('At least one return item is required');
    const normalized=requested.map((x:any)=>({orderItemId:String(x.orderItemId||''),quantity:Number(x.quantity)}));
    if(normalized.some((x:any)=>!x.orderItemId||!Number.isInteger(x.quantity)||x.quantity<=0))throw new BadRequestException('Return quantities must be positive integers');
    if(new Set(normalized.map((x:any)=>x.orderItemId)).size!==normalized.length)throw new BadRequestException('Duplicate return items are not allowed');
    return this.prisma.$transaction(async tx=>{
      const order=await tx.order.findFirst({where:{id:orderId,customerId},include:{items:true,shipments:{select:{deliveredAt:true,events:{select:{status:true,occurredAt:true},orderBy:{occurredAt:'desc'}}}},store:{select:{settings:true}}}});if(!order)throw new NotFoundException('Order not found');const rp:any=(order.store?.settings as any)?.returnPolicy||{};const windowDays=Math.max(1,Number(rp.returnWindowDays||14));const deliveredTimes=(order.shipments||[]).flatMap((s:any)=>[s.deliveredAt,...((s.events||[]).filter((e:any)=>['DELIVERED','FULFILLED'].includes(String(e.status||'').toUpperCase())).map((e:any)=>e.occurredAt))]).filter(Boolean).map((d:any)=>new Date(d).getTime());const returnWindowStart=deliveredTimes.length?Math.max(...deliveredTimes):new Date(order.createdAt).getTime();if(Date.now()-returnWindowStart>windowDays*86400000)throw new BadRequestException(`İade süresi ${windowDays} gündür`);const reasons:any[]=Array.isArray(rp.reasons)&&rp.reasons.length?rp.reasons:[];const reason=String(body.reason||'');const reasonCfg=reasons.find((x:any)=>x.active!==false&&String(x.code)===reason);if(reasons.length&&!reasonCfg)throw new BadRequestException('Geçersiz iade nedeni');if(reasonCfg?.requiresImages&&!(Array.isArray(body.attachments)&&body.attachments.length))throw new BadRequestException('Bu iade nedeni için görsel gereklidir');
      if(!['FULFILLED','PROCESSING'].includes(order.status))throw new BadRequestException('Order is not eligible for return');
      if(order.fulfillmentStatus!=='FULFILLED'&&order.status!=='FULFILLED')throw new BadRequestException('Order has not been delivered yet');
      const activeRequests=await tx.returnRequest.findMany({where:{orderId,status:{in:['REQUESTED','APPROVED','RECEIVED','REFUNDED','EXCHANGED']}},include:{items:true}});
      const already=new Map<string,number>();for(const rr of activeRequests as any[])for(const item of rr.items||[])already.set(item.orderItemId,Number(already.get(item.orderItemId)||0)+Number(item.quantity||0));
      const rows=normalized.map((x:any)=>{const oi=order.items.find((i:any)=>i.id===x.orderItemId);if(!oi)throw new BadRequestException('Invalid return item');const remaining=Number(oi.quantity)-Number(already.get(oi.id)||0);if(x.quantity>remaining)throw new BadRequestException(`Return quantity exceeds remaining quantity for ${oi.title}`);return{orderItemId:oi.id,variantId:oi.variantId,quantity:x.quantity};});
      const bill:any=order.billingAddress||{};const corporate=!!(bill.company||bill.taxNumber||bill.taxOffice);const invoiceRequired=corporate&&rp.corporateInvoiceRequired!==false;return tx.returnRequest.create({data:{storeId:order.storeId,orderId,customerId,reason:body.reason,note:body.note,attachments:Array.isArray(body.attachments)?body.attachments.slice(0,6):[],corporateInvoiceRequired:invoiceRequired,corporateInvoiceStatus:invoiceRequired?'REQUIRED':null,status:reasonCfg?.autoApprove?'APPROVED':'REQUESTED',items:{create:rows}},include:{items:true}});
    },{isolationLevel:'Serializable'} as any);
  }
  async seoSitemap(slug:string,type='all',page=1,limit=40000){
    const store=await this.store(slug,true),now=new Date(),safeLimit=Math.min(40000,Math.max(100,Number(limit||40000))),skip=(Math.max(1,Number(page||1))-1)*safeLimit;
    const map:any={
      products:{model:'product',where:{storeId:store.id,status:'ACTIVE' as any},select:{slug:true,updatedAt:true,images:{take:5,orderBy:{sortOrder:'asc'},select:{url:true,alt:true}}},path:(x:any)=>`/product/${x.slug}`},
      categories:{model:'category',where:{storeId:store.id,isActive:true},select:{slug:true,updatedAt:true},path:(x:any)=>`/products/${x.slug}`},
      collections:{model:'collection',where:{storeId:store.id,isActive:true},select:{slug:true,updatedAt:true},path:(x:any)=>`/collections/${x.slug}`},
      pages:{model:'page',where:{storeId:store.id,status:'PUBLISHED' as any},select:{slug:true,updatedAt:true},path:(x:any)=>`/pages/${x.slug}`},
      posts:{model:'blogPost',where:{storeId:store.id,status:'PUBLISHED' as any,publishedAt:{lte:now},noIndex:false},select:{slug:true,updatedAt:true,featuredImageUrl:true,category:{select:{slug:true}}},path:(x:any)=>configuredArticleUrl(store,x.slug,store.locale,x.category?.slug||'')},
      blogCategories:{model:'blogCategory',where:{storeId:store.id,isActive:true,noIndex:false},select:{slug:true,updatedAt:true},path:(x:any)=>configuredBlogCategoryUrl(store,x.slug,store.locale)},
      authors:{model:'blogAuthor',where:{storeId:store.id,isActive:true},select:{slug:true,updatedAt:true},path:(x:any)=>`${configuredPublicPath(store,'blog',store.locale)}/authors/${x.slug}`},
    };
    if(type==='index'){
      const out:any[]=[];for(const [name,cfg] of Object.entries(map) as any){const count=await (this.prisma as any)[cfg.model].count({where:cfg.where});for(let p=1;p<=Math.max(1,Math.ceil(count/safeLimit));p++)out.push({type:name,page:p,count:Math.min(safeLimit,Math.max(0,count-(p-1)*safeLimit))});}return{index:true,shards:out,limit:safeLimit};
    }
    if(type!=='all'){
      const cfg:any=map[type];if(!cfg)throw new BadRequestException('Invalid sitemap type');const rows=await (this.prisma as any)[cfg.model].findMany({where:cfg.where,select:cfg.select,orderBy:{updatedAt:'desc'},skip,take:safeLimit});return{entries:rows.map((x:any)=>({path:cfg.path(x),lastmod:x.updatedAt,images:x.images||(x.featuredImageUrl?[{url:x.featuredImageUrl,alt:null}]:[])})),type,page:Number(page||1),limit:safeLimit};
    }
    const entries:any[]=[{path:'/',lastmod:store.updatedAt},{path:'/products',lastmod:store.updatedAt},{path:configuredPublicPath(store,'blog',store.locale),lastmod:store.updatedAt}];for(const [name,cfg] of Object.entries(map) as any){const rows=await (this.prisma as any)[cfg.model].findMany({where:cfg.where,select:cfg.select,orderBy:{updatedAt:'desc'},take:Math.min(5000,safeLimit)});for(const x of rows)entries.push({path:cfg.path(x),lastmod:x.updatedAt,images:x.images||(x.featuredImageUrl?[{url:x.featuredImageUrl,alt:null}]:[])});}return{entries,truncated:entries.length>=5000};
  }

  // Resolve a translated permalink through the underlying entity ID, never by title/name.
  async localizedPath(slug:string,rawPath:string,targetLanguage:string){
    const store=await this.store(slug);
    const enabled=await this.prisma.storeLocale.findMany({where:{storeId:store.id,isEnabled:true},select:{locale:true,isDefault:true}});
    const code=(v:string)=>String(v||'').toLowerCase().split(/[-_]/)[0];
    const target=enabled.find(l=>code(l.locale)===code(targetLanguage));
    if(!target)throw new BadRequestException('Unsupported storefront locale');
    const def=enabled.find(l=>l.isDefault)?.locale||store.locale;
    const prefix=code(target.locale)===code(def)?'':`/${code(target.locale)}`;
    const supplied=String(rawPath||'/').split('?')[0].replace(/^\/(tr|en|ru|pt|es)(?=\/|$)/i,'')||'/';
    const clean=supplied.replace(/\/+$/,'')||'/';
    const match=clean.match(/^\/(product|products|collections|pages|blog)\/(.+)$/);
    if(!match)return{path:prefix+clean,locale:code(target.locale),translated:true};
    const segment=match[1],handle=decodeURIComponent(match[2]);
    if(handle.includes('/')||handle.length>200)return{path:prefix+clean,locale:code(target.locale),translated:false};
    const type=segment==='product'?'product':segment==='products'?'category':segment==='collections'?'collection':segment==='pages'?'page':'blog_post';
    // Find the record using its canonical slug, or any translated slug for this store.
    const model:any=type==='product'?this.prisma.product:type==='category'?this.prisma.category:type==='collection'?this.prisma.collection:type==='page'?this.prisma.page:this.prisma.blogPost;
    const canonical=await model.findFirst({where:{storeId:store.id,slug:handle},select:{id:true,slug:true}});
    let entity=canonical;
    if(!entity){
      const matches=await this.prisma.contentTranslation.findMany({where:{storeId:store.id,entityType:type,fields:{path:['slug'],equals:handle}} as any,select:{entityId:true},take:2});
      if(matches.length===1)entity=await model.findFirst({where:{id:matches[0].entityId,storeId:store.id},select:{id:true,slug:true}});
    }
    if(!entity)return{path:prefix+clean,locale:code(target.locale),translated:false};
    const tr=code(target.locale)===code(def)?null:await this.prisma.contentTranslation.findFirst({where:{storeId:store.id,entityType:type,entityId:entity.id,locale:target.locale},select:{fields:true}});
    const translatedSlug=String((tr?.fields as any)?.slug||entity.slug||'').trim();
    return{path:`${prefix}/${segment}/${encodeURIComponent(translatedSlug)}`,locale:code(target.locale),translated:!!translatedSlug};
  }

  async seoPublicConfig(slug:string){const store=await this.store(slug,true);const root:any=store.settings||{},seo:any=root.seoAdvanced||{};return{robotsText:String(seo.robotsText||''),defaultLocale:store.locale||'tr',urlRouting:seo.urlRouting||{locales:{}},technical:{indexing:true,sitemap:true,imageSitemap:true,...(seo.technical||{})},schema:{organization:true,product:true,breadcrumb:true,article:true,faq:true,websiteSearch:true,...(seo.schema||{})}}}

  async seoRecordNotFound(slug:string,body:any,req:any){const store=await this.store(slug,true);let path=String(body?.path||'/').trim();if(!path.startsWith('/'))path='/'+path;if(path.startsWith('/api/')||path.startsWith('/_next/'))return{ok:true,ignored:true};path=path.replace(/\s+/g,'').slice(0,500);await this.prisma.seoNotFoundEvent.upsert({where:{storeId_path:{storeId:store.id,path}},create:{storeId:store.id,path,referrer:String(body?.referrer||req?.headers?.referer||'').slice(0,1000)||null,userAgent:String(req?.headers?.['user-agent']||'').slice(0,500)||null,metadata:{method:String(req?.method||'GET')}},update:{hits:{increment:1},lastSeenAt:new Date(),referrer:String(body?.referrer||req?.headers?.referer||'').slice(0,1000)||undefined}});return{ok:true}}

}
