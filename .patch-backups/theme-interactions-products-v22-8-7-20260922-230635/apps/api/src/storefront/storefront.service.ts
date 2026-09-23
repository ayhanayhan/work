import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { evaluatePromotions } from './promotion-engine';
import { requestIp, securityHash } from '../common/security';
import { COUNTRY_CODES, LOCALES, SUBDIVISIONS } from '../common/reference-data';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private cache: CacheService) {}
  private tokenHash(v: string) { return createHash('sha256').update(v).digest('hex'); }
  private commentSettings(store:any){
    const cfg=(store?.settings as any)?.commentSettings||{};
    const norm=(v:any,d:any)=>({enabled:v?.enabled??d.enabled,autoApprove:v?.autoApprove??d.autoApprove,allowGuest:v?.allowGuest??d.allowGuest});
    return {productReviews:norm(cfg.productReviews,{enabled:true,autoApprove:false,allowGuest:true}),blogComments:norm(cfg.blogComments,{enabled:true,autoApprove:false,allowGuest:true})};
  }

  private designSettings(store:any){
    const saved:any=(store?.settings as any)?.design||{};
    const defaults:any={general:{layoutMode:'boxed',containerWidth:1180,customWidth:1180,bodyFont:'Inter, ui-sans-serif, system-ui, sans-serif',paragraphFont:'Inter, ui-sans-serif, system-ui, sans-serif',headingFont:'Inter, ui-sans-serif, system-ui, sans-serif',h1Font:'',h2Font:'',h3Font:'',h4Font:'',h5Font:'',baseFontSize:16,paragraphSize:16,h1Size:52,h2Size:34,h3Size:24,h4Size:20,h5Size:17,primaryColor:'#15171a',secondaryColor:'#727b85',headingColor:'#15171a',textColor:'#15171a',linkColor:'#15171a',backgroundColor:'#ffffff',surfaceColor:'#ffffff',borderColor:'#e6e9ec',sectionSpacing:64,borderRadius:8,buttonRadius:6,customCss:''},header:{template:1,sticky:true,topbarEnabled:false,topbarText:'',topbarLink:'',showSearch:false},footer:{template:1,copyright:'© {{year}} {{store_name}}. Tüm hakları saklıdır.',upperHtml:''},products:{categoryTemplate:1,productPageTemplate:1,productCardTemplate:1,columnsDesktop:4,columnsTablet:2,columnsMobile:2}};
    return {general:{...defaults.general,...(saved.general||{})},header:{...defaults.header,...(saved.header||{})},footer:{...defaults.footer,...(saved.footer||{})},products:{...defaults.products,...(saved.products||{})}};
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

  async publicGeoChildren(slug:string, parentId?:string, countryCode?:string, level?:any) {
    const store = await this.store(slug);
    const where:any={ isActive:true, ...(parentId?{parentId}:{parentId:null}), ...(countryCode?{countryCode}:{}) , ...(level?{level}:{}) };
    const [base, overrides, custom]=await Promise.all([
      this.prisma.geoNode.findMany({where,orderBy:[{sortOrder:'asc'},{name:'asc'}]}),
      this.prisma.geoOverride.findMany({where:{tenantId:store.tenantId}}),
      this.prisma.geoCustomNode.findMany({where:{tenantId:store.tenantId,isActive:true,...(parentId?{parentId}:{parentId:null}),...(countryCode?{countryCode}:{}),...(level?{level}:{})},orderBy:[{sortOrder:'asc'},{name:'asc'}]})
    ]);
    const om=new Map(overrides.map((x:any)=>[x.geoNodeId,x]));
    return [...base.filter((x:any)=>om.get(x.id)?.isEnabled!==false).map((x:any)=>({...x,name:om.get(x.id)?.customName||x.name,source:'SYSTEM'})),...custom.map((x:any)=>({...x,source:'CUSTOM'}))];
  }

  private async currencyInfo(store: any, requested?: string | null) {
    const rows = await this.prisma.storeCurrency.findMany({ where: { storeId: store.id, isEnabled: true } });
    const code = String(requested || store.currency).toUpperCase();
    const row = rows.find(x => x.code === code) || rows.find(x => x.isDefault) || rows.find(x => x.code === store.currency);
    return { code: row?.code || store.currency, rate: Number(row?.exchangeRate || 1), rounding: row?.rounding ?? 2, available: rows.map(x => ({ code: x.code, rate: Number(x.exchangeRate), isDefault: x.isDefault })) };
  }
  private money(v: any, rate: number, rounding=2) { const factor = 10 ** rounding; return Math.round(Number(v || 0) * rate * factor) / factor; }
  private async translateMany(storeId:string, entityType:string, items:any[], locale?:string, defaultLocale?:string) {
    if (!locale || locale === defaultLocale || !items.length) return items;
    const rows = await this.prisma.contentTranslation.findMany({ where: { storeId, entityType, locale, entityId: { in: items.map((x:any)=>x.id) } } });
    const map = new Map(rows.map((r:any)=>[r.entityId, r.fields as any]));
    return items.map((x:any)=>({ ...x, ...(map.get(x.id)||{}) }));
  }
  private presentProduct(p: any, ci: any) {
    return { ...p, displayCurrency: ci.code, variants: (p.variants || []).map((v:any)=>({ ...v, basePrice: Number(v.price), price: this.money(v.price, ci.rate, ci.rounding), comparePrice: v.comparePrice == null ? null : this.money(v.comparePrice, ci.rate, ci.rounding) })) };
  }

  private setConfig(product:any){const set:any=(product?.metadata as any)?.set||{};const items=Array.isArray(set.items)?set.items.filter((x:any)=>x?.variantId&&Number(x.quantity)>0).map((x:any)=>({variantId:String(x.variantId),quantity:Math.max(1,Number(x.quantity||1))})):[];return{stockMode:set.stockMode==='COMPONENTS'?'COMPONENTS':'SELF',items};}
  private async inventoryTargets(db:any,storeId:string,variant:any,quantity:number){
    let full=variant;if(!full?.product)full=await db.variant.findFirst({where:{id:variant?.id||variant,product:{storeId}},include:{inventory:true,product:true}});if(!full)return[];const cfg=this.setConfig(full.product);
    if(String(full.product.productType||'').toUpperCase()==='SET'&&cfg.stockMode==='COMPONENTS'&&cfg.items.length){const ids=cfg.items.map((x:any)=>x.variantId);const rows=await db.variant.findMany({where:{id:{in:ids},product:{storeId}},include:{inventory:true,product:true}});const map=new Map(rows.map((x:any)=>[x.id,x]));return cfg.items.map((x:any)=>({variant:map.get(x.variantId),variantId:x.variantId,quantity:x.quantity*quantity,inventory:(map.get(x.variantId) as any)?.inventory})).filter((x:any)=>x.variant);}
    return[{variant:full,variantId:full.id,quantity,inventory:full.inventory}];
  }
  private assertStock(targets:any[],label='product'){for(const target of targets){const inv=target.inventory;if(inv?.trackStock&&!inv.allowBackorder&&inv.onHand-inv.reserved<target.quantity)throw new BadRequestException(`Insufficient stock for ${target.variant?.sku||label}`);}}
  private mergeTargets(targets:any[]){const map=new Map<string,any>();for(const t of targets){const prev=map.get(t.variantId);if(prev)prev.quantity+=Number(t.quantity||0);else map.set(t.variantId,{...t,quantity:Number(t.quantity||0)});}return Array.from(map.values());}
  private async reserveTargets(db:any,targets:any[]){
    for(const target of targets){
      const inv=target.inventory;
      if(!inv?.trackStock)continue;
      if(inv.allowBackorder){
        await db.inventoryItem.update({where:{variantId:target.variantId},data:{reserved:{increment:target.quantity}}});
        continue;
      }
      // The availability check and increment happen in one database statement.
      // This prevents two concurrent checkouts from reserving the same stock.
      const result=await db.inventoryItem.updateMany({
        where:{variantId:target.variantId,trackStock:true,allowBackorder:false,reserved:{lte:Math.max(0,Number(inv.onHand)-target.quantity)}},
        data:{reserved:{increment:target.quantity}},
      });
      if(result.count!==1)throw new BadRequestException(`Insufficient stock for ${target.variant?.sku||'product'}`);
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

  async bootstrap(slug: string, currency?: string, locale?: string) {
    const store = await this.store(slug, true);
    const storeSettings:any = store.settings || {};
    if (this.maintenanceActive(store)) {
      return {
        store: {
          id: store.id, name: store.name, slug: store.slug, publicSlug: store.publicSlug,
          locale: store.locale, timezone: store.timezone, logoUrl: store.logoUrl, faviconUrl: store.faviconUrl,
          maintenanceMode: true, maintenanceLaunchAt: storeSettings.maintenanceLaunchAt || null
        },
        categories: [], banners: [], menus: [], featured: [], shippingMethods: [], paymentMethods: [], legalDocuments: [], contractPages: {}, popups: [], sections: [], reviews: [], blogPosts: [], brands: [], design: this.designSettings(store)
      };
    }
    const ci = await this.currencyInfo(store, currency);
    const [categoriesRaw, bannersRaw, menus, featuredRaw, shippingMethods, paymentMethods, legalDocuments, popups, locales, sections, reviews, blogPosts, brands, activeThemeDef] = await Promise.all([
      this.prisma.category.findMany({ where: { storeId: store.id, isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.banner.findMany({ where: { storeId: store.id, isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }] }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.menu.findMany({ where: { storeId: store.id } }),
      this.prisma.product.findMany({ where: { storeId: store.id, status: 'ACTIVE' }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, brand: true, variants: { where: { isActive: true }, include: { inventory: true }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 12 }),
      this.prisma.shippingMethod.findMany({ where: { storeId: store.id, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.paymentMethod.findMany({ where: { storeId: store.id, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.legalDocument.findMany({ where: { storeId: store.id, isActive: true }, select: { type:true,locale:true,version:true,title:true,publishedAt:true } }),
      this.prisma.marketingCampaign.findMany({ where: { storeId: store.id, channel: 'POPUP', status: 'ACTIVE', OR: [{ scheduleAt: null }, { scheduleAt: { lte: new Date() } }] }, select: { id:true,name:true,content:true,settings:true } }),
      this.prisma.storeLocale.findMany({ where: { storeId: store.id, isEnabled: true }, orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }] }),
      this.prisma.siteSection.findMany({where:{storeId:store.id,pageKey:'home',enabled:true},orderBy:{sortOrder:'asc'}}),
      this.prisma.review.findMany({where:{storeId:store.id,status:'APPROVED'},select:{id:true,rating:true,title:true,body:true,authorName:true,verifiedPurchase:true,product:{select:{title:true,slug:true}}},orderBy:{createdAt:'desc'},take:8}),
      this.prisma.blogPost.findMany({where:{storeId:store.id,status:'PUBLISHED',publishedAt:{lte:new Date()},locale:locale||store.locale},select:{id:true,title:true,slug:true,excerpt:true,featuredImageUrl:true,publishedAt:true},orderBy:{publishedAt:'desc'},take:6}),
      this.prisma.brand.findMany({where:{storeId:store.id},select:{id:true,name:true,slug:true,logoUrl:true},orderBy:{name:'asc'},take:20}),
      this.prisma.themeDefinition.findFirst({where:{slug:store.activeTheme,isActive:true},select:{id:true,slug:true,name:true,version:true,config:true}}),
    ]);
    const aiAssistant = await this.prisma.appInstallation.findFirst({where:{tenantId:store.id,enabled:true,status:'ACTIVE',app:{slug:'we-ai-assistant'}},select:{id:true}});
    const activeLocale = locales.some((x:any)=>x.locale===locale) ? locale! : (locales.find((x:any)=>x.isDefault)?.locale || store.locale);
    const categories = await this.translateMany(store.id,'category',categoriesRaw,activeLocale,store.locale);
    const banners = await this.translateMany(store.id,'banner',bannersRaw,activeLocale,store.locale);
    const featured = await this.translateMany(store.id,'product',featuredRaw,activeLocale,store.locale);
    const contractPages = await this.contractPages(store,activeLocale);
    const safeStore = { id: store.id, name: store.name, slug: store.slug, publicSlug: store.publicSlug, currency: ci.code, baseCurrency: store.currency, currencies: ci.available, locale: activeLocale, locales: locales.map((x:any)=>({locale:x.locale,label:x.label,isDefault:x.isDefault})), timezone: store.timezone, defaultCountry: store.defaultCountry, logoUrl: store.logoUrl, faviconUrl: store.faviconUrl, seoTitle: store.seoTitle, seoDescription: store.seoDescription, activeTheme: store.activeTheme, settings: store.settings, maintenanceMode: false, maintenanceLaunchAt: storeSettings.maintenanceLaunchAt || null };
    return { store: safeStore, categories, banners, menus, featured: featured.map(p=>this.presentProduct(p,ci)), shippingMethods: shippingMethods.map(x=>({ ...x, price:this.money(x.price,ci.rate,ci.rounding), freeAbove:x.freeAbove==null?null:this.money(x.freeAbove,ci.rate,ci.rounding) })), paymentMethods, legalDocuments, contractPages, popups, sections, reviews, blogPosts, brands, features:{aiAssistant:!!aiAssistant}, theme:activeThemeDef||{slug:'ticarti-signature-complete',name:'Ticarti Signature Complete',version:'21.6.2',config:{catalogGroup:'Ticarti Temaları'}}, design:this.designSettings(store) };
  }

  async products(slug: string, query: any) {
    const store = await this.store(slug); const ci = await this.currencyInfo(store, query.currency);
    const page = Math.max(1, Number(query.page || 1)); const limit = Math.min(60, Math.max(1, Number(query.limit || 24)));
    const minBase = query.minPrice !== undefined ? Number(query.minPrice) / ci.rate : undefined; const maxBase = query.maxPrice !== undefined ? Number(query.maxPrice) / ci.rate : undefined;
    const where: any = { storeId: store.id, status: 'ACTIVE', ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }, { tags: { has: query.q } }] } : {}), ...(query.category ? { categories: { some: { category: { slug: query.category } } } } : {}), ...(query.brand ? { brand: { slug: query.brand } } : {}), ...((minBase !== undefined || maxBase !== undefined) ? { variants: { some: { price: { ...(minBase !== undefined ? { gte: minBase } : {}), ...(maxBase !== undefined ? { lte: maxBase } : {}) } } } } : {}) };
    const orderBy: any = query.sort === 'oldest' ? { createdAt: 'asc' } : query.sort === 'name' ? { title: 'asc' } : { createdAt: 'desc' };
    const [items, total] = await Promise.all([this.prisma.product.findMany({ where, include: { brand: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { where: { isActive: true }, include: { inventory: true } }, categories: { include: { category: true } }, reviews: { where: { status: 'APPROVED' }, select: { rating: true } } }, orderBy, skip: (page - 1) * limit, take: limit }), this.prisma.product.count({ where })]);
    const localized = await this.translateMany(store.id,'product',items,query.locale,store.locale);
    const mapped = localized.map((p: any) => this.presentProduct({ ...p, rating: p.reviews.length ? p.reviews.reduce((a:number,r:any)=>a+r.rating,0)/p.reviews.length : null, reviewCount:p.reviews.length }, ci));
    return { items: mapped, currency: ci.code, locale: query.locale || store.locale, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async product(slug: string, productSlug: string, currency?: string, locale?: string) {
    const store = await this.store(slug); const ci=await this.currencyInfo(store,currency);
    const p = await this.prisma.product.findFirst({ where: { storeId: store.id, slug: productSlug, status: 'ACTIVE' }, include: { brand: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { where: { isActive: true }, include: { inventory: true } }, categories: { include: { category: true } }, reviews: { where: { status: 'APPROVED' }, include: { customer: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } } } });
    if (!p) throw new NotFoundException('Product not found'); const [localized]=await this.translateMany(store.id,'product',[p],locale,store.locale); return this.presentProduct(localized,ci);
  }
  async page(slug: string, pageSlug: string, locale?: string) { const s = await this.store(slug); const p = await this.pageByLocalizedSlug(s,pageSlug,locale); if (!p) throw new NotFoundException('Page not found'); return this.presentPage(s,p,locale); }
  async legal(slug:string,type:string,locale?:string){ const s=await this.store(slug); const mappings:any=(s.settings as any)?.contractPages||{};const pageId=mappings[type];if(pageId){const p=await this.prisma.page.findFirst({where:{id:String(pageId),storeId:s.id,status:'PUBLISHED'}});if(p){const localized=await this.presentPage(s,p,locale);return{type,locale:locale||s.locale,version:'page-'+p.updatedAt.toISOString(),title:localized.title,body:localized.body,slug:localized.slug||p.slug,href:'/pages/'+encodeURIComponent(localized.slug||p.slug)+'?locale='+encodeURIComponent(locale||s.locale),publishedAt:p.updatedAt};}}return this.prisma.legalDocument.findFirst({ where:{storeId:s.id,type:type as any,isActive:true,...(locale?{locale}:{})},orderBy:{publishedAt:'desc'} }); }

  async customerRegister(slug: string, body: any, req?: any) {
    const store = await this.store(slug); const email = String(body.email || '').toLowerCase(); const pw=String(body.password||'');
    if (!email || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(pw)) throw new BadRequestException('Valid email and a 10+ character password with upper/lower/number are required');
    const existing = await this.prisma.customer.findUnique({ where: { storeId_email: { storeId: store.id, email } } });
    if(existing)throw new ConflictException('An account already exists for this email');
    const hash = await bcrypt.hash(pw, 12);
    const customer = await this.prisma.customer.create({ data: { storeId: store.id, email, passwordHash: hash, firstName: body.firstName, lastName: body.lastName, phone: body.phone } });
    await this.recordConsents(store.id, customer.id, email, body.consents || {}, body.consentVersions || {}, req);
    return this.customerToken(customer);
  }
  async customerLogin(slug: string, body: any) { const store=await this.store(slug); const customer=await this.prisma.customer.findUnique({where:{storeId_email:{storeId:store.id,email:String(body.email||'').toLowerCase()}}}); if(!customer?.passwordHash||!(await bcrypt.compare(String(body.password||''),customer.passwordHash))) throw new UnauthorizedException('Invalid credentials'); if(!customer.isActive) throw new UnauthorizedException('Customer account disabled'); return this.customerToken(customer); }
  private async customerToken(customer:any){ const refreshToken=randomBytes(48).toString('base64url'); const session=await this.prisma.customerSession.create({data:{customerId:customer.id,refreshTokenHash:this.tokenHash(refreshToken),expiresAt:new Date(Date.now()+30*86400000)}}); const accessToken=await this.jwt.signAsync({sub:customer.id,storeId:customer.storeId,email:customer.email,kind:'customer',sid:session.id},{expiresIn:'15m'}); return {accessToken,refreshToken,expiresIn:900,customer:{id:customer.id,email:customer.email,firstName:customer.firstName,lastName:customer.lastName,phone:customer.phone}}; }
  async customerRefresh(refreshToken:string){ const h=this.tokenHash(refreshToken); const s=await this.prisma.customerSession.findFirst({where:{refreshTokenHash:h,revokedAt:null,expiresAt:{gt:new Date()},customer:{isActive:true}},include:{customer:true}}); if(!s||!s.customer.isActive) throw new UnauthorizedException('Invalid refresh token'); const next=randomBytes(48).toString('base64url'); const rotated=await this.prisma.customerSession.updateMany({where:{id:s.id,refreshTokenHash:h,revokedAt:null,expiresAt:{gt:new Date()}},data:{refreshTokenHash:this.tokenHash(next),lastUsedAt:new Date()}});if(rotated.count!==1)throw new UnauthorizedException('Invalid refresh token'); const accessToken=await this.jwt.signAsync({sub:s.customer.id,storeId:s.customer.storeId,email:s.customer.email,kind:'customer',sid:s.id},{expiresIn:'15m'}); return {accessToken,refreshToken:next,expiresIn:900}; }
  async customerLogout(refreshToken:string){ await this.prisma.customerSession.updateMany({where:{refreshTokenHash:this.tokenHash(refreshToken),revokedAt:null},data:{revokedAt:new Date()}}); return {loggedOut:true}; }

  async me(customerId:string){const c=await this.prisma.customer.findUnique({where:{id:customerId},include:{addresses:true,loyaltyAccount:true}});if(!c)throw new NotFoundException();const{passwordHash,...safe}=c as any;return safe;}
  async updateMe(customerId:string,body:any){const c=await this.prisma.customer.findUnique({where:{id:customerId}});if(!c)throw new NotFoundException();const data:any={};for(const k of ['firstName','lastName','phone'])if(body[k]!==undefined)data[k]=body[k];return this.prisma.customer.update({where:{id:customerId},data,select:{id:true,email:true,firstName:true,lastName:true,phone:true,acceptsMarketing:true,updatedAt:true}});}
  async addAddress(customerId:string,body:any){if(body.isDefault)await this.prisma.customerAddress.updateMany({where:{customerId},data:{isDefault:false}});return this.prisma.customerAddress.create({data:{customerId,title:body.title,firstName:body.firstName,lastName:body.lastName,phone:body.phone,company:body.company,address1:body.address1,address2:body.address2,district:body.district,city:body.city,state:body.state,postalCode:body.postalCode,country:body.country||'TR',admin1Id:body.admin1Id||null,admin2Id:body.admin2Id||null,localityId:body.localityId||null,neighborhoodId:body.neighborhoodId||null,isDefault:!!body.isDefault}});}
  async updateAddress(customerId:string,addressId:string,body:any){const current=await this.prisma.customerAddress.findFirst({where:{id:addressId,customerId}});if(!current)throw new NotFoundException('Address not found');if(body.isDefault)await this.prisma.customerAddress.updateMany({where:{customerId,id:{not:addressId}},data:{isDefault:false}});const data:any={};for(const k of ['title','firstName','lastName','phone','company','address1','address2','district','city','state','postalCode','country','admin1Id','admin2Id','localityId','neighborhoodId','isDefault'])if(body[k]!==undefined)data[k]=body[k];return this.prisma.customerAddress.update({where:{id:addressId},data});}
  async myOrders(customerId:string){return this.prisma.order.findMany({where:{customerId},include:{items:true},orderBy:{createdAt:'desc'}});}
  async myReturns(customerId:string){return this.prisma.returnRequest.findMany({where:{customerId},include:{order:{select:{number:true,currency:true,grandTotal:true}},items:{include:{orderItem:true}}},orderBy:{createdAt:'desc'}});}
  async myReviews(customerId:string){return this.prisma.review.findMany({where:{customerId},include:{product:{select:{title:true,slug:true}}},orderBy:{createdAt:'desc'}});}
  async myQuestions(customerId:string){return this.prisma.question.findMany({where:{customerId},orderBy:{createdAt:'desc'}});}
  async myPrivacyRequests(customerId:string){return this.prisma.privacyRequest.findMany({where:{customerId},orderBy:{createdAt:'desc'}});}
  async myConsents(customerId:string){return this.prisma.consentRecord.findMany({where:{customerId},orderBy:{createdAt:'desc'},take:100});}
  async askCustomerQuestion(customerId:string,body:any){const customer=await this.prisma.customer.findUnique({where:{id:customerId}});if(!customer)throw new NotFoundException();const type=String(body.type||'PRODUCT').toUpperCase();if(type==='PRODUCT'){const p=await this.prisma.product.findFirst({where:{id:body.productId,storeId:customer.storeId,status:'ACTIVE'}});if(!p)throw new NotFoundException('Product not found');}else if(type==='ORDER'){const o=await this.prisma.order.findFirst({where:{id:body.orderId,customerId,storeId:customer.storeId}});if(!o)throw new NotFoundException('Order not found');}else throw new BadRequestException('Invalid question type');return this.prisma.question.create({data:{storeId:customer.storeId,type:type as any,productId:body.productId||null,orderId:body.orderId||null,customerId,email:customer.email,subject:body.subject||null,question:String(body.question||'').trim(),priority:'NORMAL'}});}
  async addCustomerReview(customerId:string,body:any){const customer=await this.prisma.customer.findUnique({where:{id:customerId}});if(!customer)throw new NotFoundException();const store=await this.prisma.tenant.findUnique({where:{id:customer.storeId}});const cfg=this.commentSettings(store).productReviews;if(!cfg.enabled)throw new BadRequestException('Product reviews are disabled');const product=await this.prisma.product.findFirst({where:{id:body.productId,storeId:customer.storeId,status:'ACTIVE'}});if(!product)throw new NotFoundException('Product not found');const rating=Number(body.rating);if(rating<1||rating>5)throw new BadRequestException('Rating must be 1-5');const verified=!!(await this.prisma.orderItem.findFirst({where:{order:{customerId,status:{not:'CANCELLED'}},variant:{productId:product.id}}}));return this.prisma.review.create({data:{storeId:customer.storeId,productId:product.id,customerId,rating,title:body.title,body:body.body,authorName:[customer.firstName,customer.lastName].filter(Boolean).join(' ')||customer.email,verifiedPurchase:verified,status:cfg.autoApprove?'APPROVED':'PENDING'}});}
  async wishlist(customerId:string){return this.prisma.wishlistItem.findMany({where:{customerId},include:{product:{include:{images:{take:1},variants:{where:{isActive:true},take:1}}}},orderBy:{createdAt:'desc'}});}
  async toggleWishlist(customerId:string,storeId:string,productId:string){const product=await this.prisma.product.findFirst({where:{id:productId,storeId,status:'ACTIVE'}});if(!product)throw new NotFoundException('Product not found');const x=await this.prisma.wishlistItem.findUnique({where:{customerId_productId:{customerId,productId}}});if(x){await this.prisma.wishlistItem.delete({where:{id:x.id}});return{added:false};}return{added:true,item:await this.prisma.wishlistItem.create({data:{customerId,storeId,productId}})}};
  async addReview(slug:string,body:any,customerId?:string){const store=await this.store(slug);const cfg=this.commentSettings(store).productReviews;if(!cfg.enabled)throw new BadRequestException('Product reviews are disabled');if(!customerId&&!cfg.allowGuest)throw new UnauthorizedException('Guest product reviews are disabled');const product=await this.prisma.product.findFirst({where:{id:body.productId,storeId:store.id,status:'ACTIVE'}});if(!product)throw new NotFoundException('Product not found');const rating=Number(body.rating);if(rating<1||rating>5)throw new BadRequestException('Rating must be 1-5');return this.prisma.review.create({data:{storeId:store.id,productId:product.id,customerId:customerId||null,rating,title:body.title,body:body.body,authorName:body.authorName,authorEmail:body.authorEmail,status:cfg.autoApprove?'APPROVED':'PENDING'}});}

  async createCart(slug:string,currency?:string){const store=await this.store(slug);const ci=await this.currencyInfo(store,currency);return this.prisma.cart.create({data:{storeId:store.id,token:randomBytes(24).toString('hex'),currency:ci.code}});}
  async setCartCurrency(token:string,currency:string){const cart=await this.prisma.cart.findUnique({where:{token},include:{store:true}});if(!cart)throw new NotFoundException('Cart not found');if(cart.status!=='active')throw new BadRequestException('Cart is not active');const ci=await this.currencyInfo(cart.store,currency);await this.prisma.cart.update({where:{id:cart.id},data:{currency:ci.code,lastActivityAt:new Date()}});return this.getCart(token);}
  private async cartData(token:string){const cart=await this.prisma.cart.findUnique({where:{token},include:{items:{include:{variant:{include:{product:{include:{images:{orderBy:{sortOrder:'asc'},take:1},categories:true}},inventory:true}}}},store:true,customer:true}});if(!cart)throw new NotFoundException('Cart not found');return cart;}
  async getCart(token:string){const cart=await this.cartData(token);await this.prisma.cart.update({where:{id:cart.id},data:{lastActivityAt:new Date(),...(cart.abandonedAt?{recoveredAt:new Date(),abandonedAt:null}:{})}});const[totals,checkoutConfig]=await Promise.all([this.calculateCart(cart),this.prisma.checkoutConfig.findUnique({where:{storeId:cart.storeId},select:{customerAccessMode:true,allowGuestCheckout:true}})]);const displayItems=cart.items.map((i:any)=>({id:i.id,quantity:i.quantity,isGift:i.isGift,promotionId:i.promotionId,variant:{id:i.variant.id,title:i.variant.title,sku:i.variant.sku,basePrice:Number(i.variant.price),price:this.money(i.variant.price,totals.exchangeRate),product:{id:i.variant.product.id,title:i.variant.product.title,slug:i.variant.product.slug,productType:i.variant.product.productType,images:i.variant.product.images,categories:i.variant.product.categories}}}));return{id:cart.id,storeId:cart.storeId,status:cart.status,currency:cart.currency,discountCode:cart.discountCode,couponCodes:cart.couponCodes,shippingMethodId:cart.shippingMethodId,paymentMethodId:cart.paymentMethodId,items:displayItems,store:{id:cart.store.id,publicSlug:cart.store.publicSlug,name:cart.store.name,checkoutConfig:checkoutConfig||{customerAccessMode:'GUEST',allowGuestCheckout:true}},totals,promotionGifts:totals.gifts};}
  async addCartItem(token:string,body:any){const cart:any=await this.getCart(token);if(cart.status!=='active')throw new BadRequestException('Cart is not active');const variant=await this.prisma.variant.findFirst({where:{id:body.variantId,isActive:true,product:{storeId:cart.storeId,status:'ACTIVE'}},include:{inventory:true,product:true}});if(!variant)throw new NotFoundException('Variant not found');const qty=Math.max(1,Number(body.quantity||1));const existing=await this.prisma.cartItem.findUnique({where:{cartId_variantId:{cartId:cart.id,variantId:variant.id}}});const nextQty=existing?existing.quantity+qty:qty;this.assertStock(await this.inventoryTargets(this.prisma,cart.storeId,variant,nextQty),variant.sku);await this.prisma.cartItem.upsert({where:{cartId_variantId:{cartId:cart.id,variantId:variant.id}},create:{cartId:cart.id,variantId:variant.id,quantity:qty},update:{quantity:nextQty,isGift:false,promotionId:null}});return this.getCart(token);}
  async updateCartItem(token:string,itemId:string,quantity:number){const cart:any=await this.getCart(token);const item=cart.items.find((x:any)=>x.id===itemId);if(!item)throw new NotFoundException();if(item.isGift)throw new BadRequestException('Promotional gift quantity cannot be edited');if(quantity<=0)await this.prisma.cartItem.delete({where:{id:itemId}});else{this.assertStock(await this.inventoryTargets(this.prisma,cart.storeId,item.variant,quantity),item.variant.sku);await this.prisma.cartItem.update({where:{id:itemId},data:{quantity}});}return this.getCart(token);}
  async removeCartItem(token:string,itemId:string){const cart:any=await this.getCart(token);if(!cart.items.some((x:any)=>x.id===itemId))throw new NotFoundException();await this.prisma.cartItem.delete({where:{id:itemId}});return this.getCart(token);}

  async applyDiscount(token:string,code:string){const cart:any=await this.getCart(token);const c=String(code||'').trim().toUpperCase();if(!c)throw new BadRequestException('Coupon code required');const promoCode=await this.prisma.promotionCode.findFirst({where:{storeId:cart.storeId,code:c,isActive:true,promotion:{status:'ACTIVE'}}});if(promoCode){const codes=[...new Set([...(cart.couponCodes||[]),c])];await this.prisma.cart.update({where:{id:cart.id},data:{couponCodes:codes}});return this.getCart(token);}const discount=await this.validDiscount(cart.storeId,c,Number(cart.totals.subtotal));await this.prisma.cart.update({where:{id:cart.id},data:{discountCode:discount.code}});return this.getCart(token);}
  async removeCoupon(token:string,code:string){const cart:any=await this.getCart(token);const c=String(code||'').toUpperCase();await this.prisma.cart.update({where:{id:cart.id},data:{couponCodes:(cart.couponCodes||[]).filter((x:string)=>x!==c),...(cart.discountCode===c?{discountCode:null}:{})}});return this.getCart(token);}
  async checkoutData(token:string){
    const cart:any=await this.getCart(token);
    if(cart.status!=='active')throw new BadRequestException('Cart is not active');
    const ci=await this.currencyInfo(cart.store,cart.currency);
    const [shippingMethods,paymentMethods,checkoutConfig,legalDocuments]=await Promise.all([
      this.prisma.shippingMethod.findMany({where:{storeId:cart.storeId,isActive:true},orderBy:{sortOrder:'asc'}}),
      this.prisma.paymentMethod.findMany({where:{storeId:cart.storeId,isActive:true},orderBy:{sortOrder:'asc'}}),
      this.prisma.checkoutConfig.findUnique({where:{storeId:cart.storeId}}),
      this.prisma.legalDocument.findMany({where:{storeId:cart.storeId,isActive:true},select:{type:true,locale:true,version:true,title:true,publishedAt:true},orderBy:{publishedAt:'desc'}})
    ]);
    const cfg:any=checkoutConfig||{};
    const settings:any=cfg.settings||{};
    const customerAccessMode=cfg.customerAccessMode||(cfg.allowGuestCheckout===false?'REQUIRED':'GUEST');
    return{
      cart,
      store:{id:cart.store.id,name:cart.store.name,publicSlug:cart.store.publicSlug,currency:ci.code,locale:cart.store.locale,defaultCountry:cart.store.defaultCountry,logoUrl:cart.store.logoUrl},
      countries:[...COUNTRY_CODES],
      shippingMethods:shippingMethods.map((x:any)=>({...x,price:this.money(x.price,ci.rate,ci.rounding),freeAbove:x.freeAbove==null?null:this.money(x.freeAbove,ci.rate,ci.rounding)})),
      paymentMethods:paymentMethods.map((x:any)=>({...x,fee:this.money(x.fee,ci.rate,ci.rounding)})),
      legalDocuments,
      checkoutConfig:{singlePage:cfg.singlePage??true,customerAccessMode,allowGuestCheckout:cfg.allowGuestCheckout??true,requirePhone:cfg.requirePhone??true,requireBillingAddress:cfg.requireBillingAddress??false,showCouponField:cfg.showCouponField??true,stickyOrderSummary:cfg.stickyOrderSummary??true,requireTerms:cfg.requireTerms??true,requirePrivacyNotice:cfg.requirePrivacyNotice??true,requireKvkkNotice:cfg.requireKvkkNotice??false,...settings}
    };
  }
  async selectShipping(token:string,shippingMethodId:string){const cart:any=await this.getCart(token);if(cart.status!=='active')throw new BadRequestException('Cart is not active');const method=await this.prisma.shippingMethod.findFirst({where:{id:String(shippingMethodId||''),storeId:cart.storeId,isActive:true}});if(!method)throw new BadRequestException('Select a valid shipping method');await this.prisma.cart.update({where:{id:cart.id},data:{shippingMethodId:method.id,lastActivityAt:new Date()}});return this.getCart(token);}
  async selectPayment(token:string,paymentMethodId:string){const cart:any=await this.getCart(token);if(cart.status!=='active')throw new BadRequestException('Cart is not active');const method=await this.prisma.paymentMethod.findFirst({where:{id:String(paymentMethodId||''),storeId:cart.storeId,isActive:true}});if(!method)throw new BadRequestException('Select a valid payment method');await this.prisma.cart.update({where:{id:cart.id},data:{paymentMethodId:method.id,lastActivityAt:new Date()}});return this.getCart(token);}
  private async validDiscount(storeId:string,code:string,subtotal:number){const now=new Date();const d=await this.prisma.discount.findFirst({where:{storeId,code:code.toUpperCase(),isActive:true,OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]}]},include:{products:true,categories:true}});if(!d)throw new BadRequestException('Discount code is invalid');if(d.usageLimit&&d.usageCount>=d.usageLimit)throw new BadRequestException('Discount code usage limit reached');if(d.minimumAmount&&subtotal<Number(d.minimumAmount))throw new BadRequestException(`Minimum cart amount is ${d.minimumAmount}`);return d;}

  private async activePromotions(cart:any,ci:any){const now=new Date();const day=now.getDay();const promos=await this.prisma.promotion.findMany({where:{storeId:cart.storeId,status:'ACTIVE',OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]},{OR:[{daysOfWeek:{isEmpty:true}},{daysOfWeek:{has:day}}]}]},include:{codes:true,redemptions:cart.customerId?{where:{customerId:cart.customerId}}:false}});return promos.filter((p:any)=>!p.usageLimit||p.usageCount<p.usageLimit).filter((p:any)=>!p.perCustomerLimit||!cart.customerId||p.redemptions.length<p.perCustomerLimit);}
  private async calculateCart(cart:any){const ci=await this.currencyInfo(cart.store,cart.currency);const regular=cart.items.filter((i:any)=>!i.isGift);const items=regular.map((i:any)=>({variantId:i.variantId,productId:i.variant.productId,brandId:i.variant.product.brandId||null,sku:i.variant.sku,categoryIds:i.variant.product.categories.map((c:any)=>c.categoryId),quantity:i.quantity,unitPrice:this.money(i.variant.price,ci.rate,ci.rounding)}));const subtotal=items.reduce((s:any,i:any)=>s+i.unitPrice*i.quantity,0);const customerOrderCount=cart.customerId?await this.prisma.order.count({where:{customerId:cart.customerId}}):0;const promos=await this.activePromotions(cart,ci);const customerMeta:any=cart.customer?.metadata||{};const promotion=evaluatePromotions(promos,{subtotal,items,currency:ci.code,customerTags:cart.customer?.tags||[],customerOrderCount,couponCodes:(cart.couponCodes||[]).map((x:string)=>x.toUpperCase()),exchangeRate:ci.rate,shippingCountry:(cart.shippingAddress as any)?.country,customerId:cart.customerId,customerGroupId:cart.customer?.groupId||null,customerName:[cart.customer?.firstName,cart.customer?.lastName].filter(Boolean).join(' '),customerBirthDate:customerMeta.birthDate||null});let discountTotal=promotion.discountTotal;let freeShipping=promotion.freeShipping;
    if(cart.discountCode){try{const d=await this.validDiscount(cart.storeId,cart.discountCode,subtotal);let eligible=subtotal;if(d.scope==='PRODUCT'&&d.products.length)eligible=items.filter((i:any)=>d.products.some((p:any)=>p.productId===i.productId)).reduce((s:any,i:any)=>s+i.unitPrice*i.quantity,0);if(d.scope==='CATEGORY'&&d.categories.length)eligible=items.filter((i:any)=>i.categoryIds.some((c:string)=>d.categories.some((x:any)=>x.categoryId===c))).reduce((s:any,i:any)=>s+i.unitPrice*i.quantity,0);let legacy=0;if(d.type==='PERCENTAGE')legacy=eligible*Number(d.value)/100;if(d.type==='FIXED_AMOUNT')legacy=this.money(d.value,ci.rate,ci.rounding);if(d.type==='FREE_SHIPPING')freeShipping=true;if(d.maximumDiscount)legacy=Math.min(legacy,this.money(d.maximumDiscount,ci.rate,ci.rounding));discountTotal=Math.min(subtotal,discountTotal+legacy);}catch{}}
    let shippingTotal=0;if(cart.shippingMethodId){const m=await this.prisma.shippingMethod.findFirst({where:{id:cart.shippingMethodId,storeId:cart.storeId,isActive:true}});if(m&&!freeShipping){const freeAbove=m.freeAbove==null?null:this.money(m.freeAbove,ci.rate,ci.rounding);shippingTotal=freeAbove&&subtotal-discountTotal>=freeAbove?0:this.money(m.price,ci.rate,ci.rounding);}}
    let paymentFee=0;if(cart.paymentMethodId){const m=await this.prisma.paymentMethod.findFirst({where:{id:cart.paymentMethodId,storeId:cart.storeId,isActive:true}});if(m)paymentFee=this.money(m.fee,ci.rate,ci.rounding);}
    const settings:any=cart.store.settings||{};const base=subtotal-discountTotal+shippingTotal+paymentFee;const taxRate=Number(settings.taxRate||0);const taxTotal=settings.pricesIncludeTax?0:base*taxRate/100;const gifts=[] as any[];for(const g of promotion.gifts){const v=await this.prisma.variant.findFirst({where:{id:g.variantId,isActive:true,product:{storeId:cart.storeId,status:'ACTIVE'}},include:{product:{include:{images:{take:1}}},inventory:true}});if(v){const targets=await this.inventoryTargets(this.prisma,cart.storeId,v,g.quantity);const available=targets.length>0&&targets.every((target:any)=>!target.inventory?.trackStock||target.inventory.allowBackorder||target.inventory.onHand-target.inventory.reserved>=target.quantity);if(available)gifts.push({promotionId:g.promotionId,variantId:v.id,quantity:g.quantity,sku:v.sku,title:`${v.product.title} - ${v.title}`,unitPrice:0,product:v.product});}}
    return{subtotal,discountTotal,shippingTotal,paymentFee,taxTotal,grandTotal:Math.max(0,base+taxTotal),currency:ci.code,exchangeRate:ci.rate,appliedPromotions:promotion.applied,gifts,freeShipping};}

  async blogCategories(slug:string){const store=await this.store(slug);return this.prisma.blogCategory.findMany({where:{storeId:store.id,isActive:true},select:{id:true,parentId:true,title:true,slug:true,description:true,imageUrl:true,seoTitle:true,seoDescription:true,sortOrder:true},orderBy:[{sortOrder:'asc'},{title:'asc'}]});}
  async blogPosts(slug:string,q:any={}){const store=await this.store(slug);const page=Math.max(1,Number(q.page||1));const limit=Math.min(48,Math.max(1,Number(q.limit||12)));const where:any={storeId:store.id,status:'PUBLISHED',publishedAt:{lte:new Date()},locale:q.locale||store.locale};if(q.category){where.category={slug:String(q.category),isActive:true};}if(q.q){where.OR=[{title:{contains:String(q.q),mode:'insensitive'}},{excerpt:{contains:String(q.q),mode:'insensitive'}},{body:{contains:String(q.q),mode:'insensitive'}}];}const[items,total]=await Promise.all([this.prisma.blogPost.findMany({where,select:{id:true,title:true,slug:true,excerpt:true,featuredImageUrl:true,seoTitle:true,seoDescription:true,publishedAt:true,updatedAt:true,category:{select:{id:true,title:true,slug:true}},_count:{select:{comments:{where:{status:'APPROVED'}}}}},orderBy:{publishedAt:'desc'},skip:(page-1)*limit,take:limit}),this.prisma.blogPost.count({where})]);return{items,total,page,limit,pages:Math.ceil(total/limit)};}
  async blogPost(slug:string,postSlug:string,currency?:string,locale?:string){const store=await this.store(slug);const post=await this.prisma.blogPost.findFirst({where:{storeId:store.id,slug:postSlug,status:'PUBLISHED',locale:locale||store.locale,publishedAt:{lte:new Date()}},include:{category:true,products:{orderBy:{sortOrder:'asc'},include:{product:{include:{images:{take:1,orderBy:{sortOrder:'asc'}},variants:{where:{isActive:true},take:1}}}}},comments:{where:{status:'APPROVED'},select:{id:true,authorName:true,body:true,createdAt:true},orderBy:{createdAt:'desc'}}}});if(!post)throw new NotFoundException('Blog post not found');const ci=await this.currencyInfo(store,currency);return{...post,products:post.products.map((x:any)=>({...x,product:this.presentProduct(x.product,ci)})),commentSettings:this.commentSettings(store).blogComments,locale:locale||store.locale};}
  async addGuestBlogComment(slug:string,postSlug:string,body:any,req?:any){const store=await this.store(slug);const cfg=this.commentSettings(store).blogComments;if(!cfg.enabled)throw new BadRequestException('Blog comments are disabled');if(!cfg.allowGuest)throw new UnauthorizedException('Guest blog comments are disabled');const post=await this.prisma.blogPost.findFirst({where:{storeId:store.id,slug:postSlug,status:'PUBLISHED'}});if(!post)throw new NotFoundException('Blog post not found');const authorName=String(body.authorName||'').trim();const text=String(body.body||'').trim();if(!authorName||text.length<2)throw new BadRequestException('Name and comment are required');return this.prisma.blogComment.create({data:{storeId:store.id,postId:post.id,authorName,authorEmail:body.authorEmail?String(body.authorEmail).toLowerCase():null,body:text,status:cfg.autoApprove?'APPROVED':'PENDING',ipHash:securityHash(req?requestIp(req):null),userAgentHash:securityHash(req?.headers?.['user-agent'])}});}
  async addCustomerBlogComment(customerId:string,body:any,req?:any){const customer=await this.prisma.customer.findUnique({where:{id:customerId}});if(!customer)throw new NotFoundException();const store=await this.prisma.tenant.findUnique({where:{id:customer.storeId}});const cfg=this.commentSettings(store).blogComments;if(!cfg.enabled)throw new BadRequestException('Blog comments are disabled');const post=await this.prisma.blogPost.findFirst({where:{id:body.postId,storeId:customer.storeId,status:'PUBLISHED'}});if(!post)throw new NotFoundException('Blog post not found');const text=String(body.body||'').trim();if(text.length<2)throw new BadRequestException('Comment is required');return this.prisma.blogComment.create({data:{storeId:customer.storeId,postId:post.id,customerId,authorName:[customer.firstName,customer.lastName].filter(Boolean).join(' ')||customer.email,authorEmail:customer.email,body:text,status:cfg.autoApprove?'APPROVED':'PENDING',ipHash:securityHash(req?requestIp(req):null),userAgentHash:securityHash(req?.headers?.['user-agent'])}});}

  async prepareCheckout(token:string,body:any,customerId?:string){const cart:any=await this.cartData(token);if(cart.status!=='active')throw new BadRequestException('Cart is not active');if(!cart.items.filter((x:any)=>!x.isGift).length)throw new BadRequestException('Cart is empty');if(customerId){const customer=await this.prisma.customer.findFirst({where:{id:customerId,storeId:cart.storeId,isActive:true},select:{id:true}});if(!customer)throw new UnauthorizedException('Customer does not belong to this store');}const shipping=await this.prisma.shippingMethod.findFirst({where:{id:body.shippingMethodId,storeId:cart.storeId,isActive:true}});if(!shipping)throw new BadRequestException('Select a valid shipping method');const payment=await this.prisma.paymentMethod.findFirst({where:{id:body.paymentMethodId,storeId:cart.storeId,isActive:true}});if(!payment)throw new BadRequestException('Select a valid payment method');await this.prisma.cart.update({where:{id:cart.id,status:'active'},data:{customerId:customerId||cart.customerId,customerEmail:body.email,shippingMethodId:shipping.id,paymentMethodId:payment.id,shippingAddress:body.shippingAddress,billingAddress:body.billingAddress||body.shippingAddress,note:body.note}});const refreshed:any=await this.cartData(token);return{...refreshed,totals:await this.calculateCart(refreshed),paymentMethod:payment,shippingMethod:shipping};}
  async checkout(token:string,body:any,customerId?:string,req?:any){if(body.consents && (body.consents.terms===false || body.consents.privacy===false)) throw new BadRequestException('Required legal acknowledgements are missing');const idempotencyKey=String(body.idempotencyKey||'').trim()||null;const cartIdentity=await this.prisma.cart.findUnique({where:{token},select:{storeId:true}});if(!cartIdentity)throw new NotFoundException('Cart not found');if(idempotencyKey){const existing=await this.prisma.order.findUnique({where:{storeId_idempotencyKey:{storeId:cartIdentity.storeId,idempotencyKey}},include:{items:true,customer:true}});if(existing)return{order:existing,payment:{type:'existing',code:existing.paymentMethod,requiresExternalPayment:false}};}const prepared:any=await this.prepareCheckout(token,body,customerId);const cart:any=prepared;const payment=prepared.paymentMethod;const activeSub=await this.prisma.subscription.findFirst({where:{tenantId:cart.storeId,status:{in:['TRIAL','ACTIVE']}},include:{plan:true},orderBy:{createdAt:'desc'}});if(activeSub?.plan.maxOrdersPerMonth){const now=new Date();const monthStart=new Date(now.getFullYear(),now.getMonth(),1);const count=await this.prisma.order.count({where:{storeId:activeSub.tenantId,createdAt:{gte:monthStart}}});if(count>=activeSub.plan.maxOrdersPerMonth)throw new BadRequestException('Monthly order limit reached for current plan');}
    return this.prisma.$transaction(async tx=>{
      const freshItems=await tx.cartItem.findMany({where:{cartId:cart.id,isGift:false},include:{variant:{include:{inventory:true,product:true}}}});const gifts=cart.totals.gifts||[];const giftVariants=await Promise.all(gifts.map(async(g:any)=>({g,v:await tx.variant.findUnique({where:{id:g.variantId},include:{inventory:true,product:true}})})));
      const rawTargets:any[]=[];for(const item of freshItems)rawTargets.push(...await this.inventoryTargets(tx,cart.storeId,item.variant,item.quantity));for(const {g,v} of giftVariants as any){if(!v)throw new BadRequestException('Gift item unavailable');rawTargets.push(...await this.inventoryTargets(tx,cart.storeId,v,g.quantity));}const stockTargets=this.mergeTargets(rawTargets);this.assertStock(stockTargets);
      let customer=customerId?await tx.customer.findUnique({where:{id:customerId}}):null;if(!customer){const email=String(body.email||'').toLowerCase();if(!email)throw new BadRequestException('Email required');customer=await tx.customer.upsert({where:{storeId_email:{storeId:cart.storeId,email}},create:{storeId:cart.storeId,email,firstName:body.firstName,lastName:body.lastName,phone:body.phone},update:{firstName:body.firstName,lastName:body.lastName,phone:body.phone}});}await this.recordConsents(cart.storeId,customer.id,customer.email,body.consents||{},body.consentVersions||{},req,tx);await this.reserveTargets(tx,stockTargets);
      const claimed=await tx.cart.updateMany({where:{id:cart.id,status:'active'},data:{status:'converted',customerId:customer.id,customerEmail:customer.email}});if(claimed.count!==1)throw new BadRequestException('Cart has already been converted');const counter=await tx.tenant.update({where:{id:cart.storeId},data:{nextOrderNumber:{increment:1}},select:{nextOrderNumber:true}});const totals=cart.totals;const regularOrderItems=freshItems.map((item:any)=>({variantId:item.variantId,sku:item.variant.sku,title:`${item.variant.product.title} - ${item.variant.title}`,quantity:item.quantity,unitPrice:this.money(item.variant.price,totals.exchangeRate),total:this.money(item.variant.price,totals.exchangeRate)*item.quantity}));const giftOrderItems=giftVariants.map(({g,v}:any)=>({variantId:v.id,sku:v.sku,title:`${v.product.title} - ${v.title} (Gift)`,quantity:g.quantity,unitPrice:0,total:0}));const order=await tx.order.create({data:{storeId:cart.storeId,customerId:customer.id,number:counter.nextOrderNumber-1,idempotencyKey,status:payment.type==='cod'?'PROCESSING':'PENDING_PAYMENT',paymentStatus:'PENDING',fulfillmentStatus:'UNFULFILLED',paymentMethod:payment.code,shippingMethod:prepared.shippingMethod.code,currency:totals.currency,subtotal:totals.subtotal,discountTotal:totals.discountTotal,shippingTotal:totals.shippingTotal,paymentFee:totals.paymentFee||0,taxTotal:totals.taxTotal,grandTotal:totals.grandTotal,discountCode:cart.discountCode,promotionSnapshot:{applied:totals.appliedPromotions,gifts:totals.gifts,couponCodes:cart.couponCodes},metadata:{exchangeRate:totals.exchangeRate},customerNote:body.note,shippingAddress:body.shippingAddress,billingAddress:body.billingAddress||body.shippingAddress,items:{create:[...regularOrderItems,...giftOrderItems]},statusHistory:{create:{status:'CREATED',note:'Order created from storefront'}}},include:{items:true,customer:{select:{id:true,email:true,firstName:true,lastName:true,phone:true}}}});if(cart.discountCode)await tx.discount.updateMany({where:{storeId:cart.storeId,code:cart.discountCode},data:{usageCount:{increment:1}}});for(const ap of totals.appliedPromotions||[]){await tx.promotion.update({where:{id:ap.id},data:{usageCount:{increment:1}}});if(ap.code)await tx.promotionCode.updateMany({where:{promotionId:ap.id,code:ap.code},data:{usageCount:{increment:1}}});await tx.promotionRedemption.create({data:{promotionId:ap.id,customerId:customer.id,orderId:order.id,code:ap.code||null,discountAmount:Number(ap.discount||0)}});}return{order,payment:{type:payment.type,code:payment.code,instructions:payment.instructions,requiresExternalPayment:payment.type==='provider'}};
    });}

  private async recordConsents(storeId:string,customerId:string|null,email:string,consents:any,versions:any,req?:any,tx?:any){const db=tx||this.prisma;const map:any={terms:'TERMS',privacy:'PRIVACY',kvkkNotice:'KVKK_NOTICE',kvkkExplicit:'KVKK_EXPLICIT_CONSENT',emailMarketing:'MARKETING_EMAIL',smsMarketing:'MARKETING_SMS',phoneMarketing:'MARKETING_PHONE'};const rows=Object.entries(map).filter(([k])=>consents[k]!==undefined).map(([k,type])=>({storeId,customerId,email,type,granted:!!consents[k],documentVersion:versions?.[k]||null,source:'storefront',ipHash:securityHash(req?requestIp(req):null),userAgentHash:securityHash(req?.headers?.['user-agent'])}));if(rows.length)await db.consentRecord.createMany({data:rows});if(customerId){const marketing=!!consents.emailMarketing||!!consents.smsMarketing;await db.customer.update({where:{id:customerId},data:{acceptsMarketing:marketing}}).catch(()=>undefined);}}
  async cookiePreference(slug:string,visitorId:string,body:any){const s=await this.store(slug);return this.prisma.cookiePreference.upsert({where:{storeId_visitorId:{storeId:s.id,visitorId}},create:{storeId:s.id,visitorId,necessary:true,analytics:!!body.analytics,marketing:!!body.marketing,preferences:body.preferences||{},version:body.version},update:{necessary:true,analytics:!!body.analytics,marketing:!!body.marketing,preferences:body.preferences||{},version:body.version}});}
  async privacyRequest(slug:string,body:any){const s=await this.store(slug);const email=String(body.email||'').toLowerCase();if(!email)throw new BadRequestException('Email required');const customer=await this.prisma.customer.findUnique({where:{storeId_email:{storeId:s.id,email}}});return this.prisma.privacyRequest.create({data:{storeId:s.id,customerId:customer?.id||null,email,type:body.type,status:'RECEIVED',requestData:body.requestData||{},dueAt:new Date(Date.now()+30*86400000)}});}
  async requestReturn(customerId:string,orderId:string,body:any){const order=await this.prisma.order.findFirst({where:{id:orderId,customerId},include:{items:true}});if(!order)throw new NotFoundException('Order not found');if(!['FULFILLED','PROCESSING'].includes(order.status))throw new BadRequestException('Order is not eligible for return');const requested=Array.isArray(body.items)?body.items:[];if(!requested.length)throw new BadRequestException('At least one return item is required');const duplicateIds=requested.map((x:any)=>String(x.orderItemId||''));if(new Set(duplicateIds).size!==duplicateIds.length)throw new BadRequestException('Duplicate return item');const prior=await this.prisma.returnItem.groupBy({by:['orderItemId'],where:{returnRequest:{orderId,status:{not:'REJECTED'}}},_sum:{quantity:true}});const used=new Map(prior.map((x:any)=>[x.orderItemId,Number(x._sum.quantity||0)]));const items=requested.map((x:any)=>{const oi=order.items.find(i=>i.id===x.orderItemId);const quantity=Number(x.quantity);if(!oi||!Number.isInteger(quantity)||quantity<=0||quantity+Number(used.get(oi.id)||0)>oi.quantity)throw new BadRequestException('Invalid return quantity');return{orderItemId:oi.id,variantId:oi.variantId,quantity};});return this.prisma.returnRequest.create({data:{storeId:order.storeId,orderId,customerId,reason:String(body.reason||'').slice(0,500)||null,note:String(body.note||'').slice(0,2000)||null,items:{create:items}},include:{items:true}});}
}
