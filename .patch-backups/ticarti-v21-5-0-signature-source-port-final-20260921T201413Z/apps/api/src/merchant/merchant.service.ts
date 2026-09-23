import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { COUNTRY_CODES, LOCALES, SUBDIVISIONS } from '../common/reference-data';
import { PERMISSIONS } from '../common/permissions';
import { CacheService } from '../cache/cache.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { evaluatePromotions } from '../storefront/promotion-engine';
import { GoogleAuth } from 'google-auth-library';

@Injectable()
export class MerchantService {
  private readonly appHostingAuth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  constructor(private prisma: PrismaService, private cache: CacheService, private integrations: IntegrationsService) {}

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

  async dashboard(tenantId: string, storeId: string) {
    const site = await this.assertStore(tenantId, storeId);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const [orders, products, customers, lowStock, revenue, chartOrders] = await Promise.all([
      this.prisma.order.count({ where: { storeId, createdAt: { gte: start } } }),
      this.prisma.product.count({ where: { storeId, status: 'ACTIVE' } }),
      this.prisma.customer.count({ where: { storeId } }),
      this.prisma.inventoryItem.count({ where: { variant: { product: { storeId } }, trackStock: true, onHand: { lte: 5 } } }),
      this.prisma.order.aggregate({ where: { storeId, paymentStatus: 'PAID', createdAt: { gte: start } }, _sum: { grandTotal: true } }),
      this.prisma.order.findMany({where:{storeId,paymentStatus:'PAID',createdAt:{gte:chartStart}},select:{createdAt:true,grandTotal:true}}),
    ]);
    const recentOrders = await this.prisma.order.findMany({ where: { storeId }, include: { customer: true }, orderBy: { createdAt: 'desc' }, take: 8 });
    const monthNames=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    const monthlyRevenue=Array.from({length:12},(_,index)=>{const date=new Date(now.getFullYear(),now.getMonth()-11+index,1);return{key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`,label:`${monthNames[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`,amount:0,orders:0}});
    const monthMap=new Map(monthlyRevenue.map(x=>[x.key,x]));
    for(const order of chartOrders){const date=new Date(order.createdAt);const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;const row=monthMap.get(key);if(row){row.amount+=Number(order.grandTotal||0);row.orders+=1;}}
    return { period: 'month', currency: site.currency, metrics: { orders, products, customers, lowStock, revenue: Number(revenue._sum.grandTotal || 0) }, monthlyRevenue, recentOrders };
  }


  async createStoreForUser(currentTenantId:string,userId:string,body:any){
    await this.assertStore(currentTenantId,currentTenantId);
    const name=String(body?.name||'').trim();
    if(name.length<2)throw new BadRequestException('Mağaza adı gerekli');
    const slugBase=this.slugify(name)||'store';
    const slug=`${slugBase}-${randomBytes(3).toString('hex')}`;
    return this.prisma.$transaction(async tx=>{
      const tenant=await tx.tenant.create({data:{name,slug,publicSlug:slug,status:'TRIAL',trialEndsAt:new Date(Date.now()+14*86400000),defaultCountry:'TR',settings:{taxRate:20,pricesIncludeTax:true,showStock:true,allowGuestCheckout:true}}});
      await tx.membership.create({data:{userId,tenantId:tenant.id,role:'OWNER'}});
      await tx.storeCurrency.create({data:{storeId:tenant.id,code:'TRY',isDefault:true,isEnabled:true,exchangeRate:1}});
      await tx.storeLocale.create({data:{storeId:tenant.id,locale:'tr-TR',label:'Türkçe',isDefault:true,isEnabled:true,sortOrder:0}});
      const plan=await tx.plan.findFirst({where:{isActive:true},orderBy:[{sortOrder:'asc'},{monthlyPrice:'asc'}]});
      if(plan)await tx.subscription.create({data:{tenantId:tenant.id,planId:plan.id,status:'TRIAL',trialEndsAt:new Date(Date.now()+plan.trialDays*86400000)}});
      await tx.shippingMethod.create({data:{storeId:tenant.id,name:'Standart Kargo',code:'standard',price:79.90,freeAbove:1500,estimatedMinDays:1,estimatedMaxDays:4}});
      await tx.paymentMethod.createMany({data:[
        {storeId:tenant.id,name:'Havale / EFT',code:'bank_transfer',type:'manual',instructions:'Sipariş numaranızı açıklamaya yazarak banka hesabımıza ödeme yapabilirsiniz.'},
        {storeId:tenant.id,name:'Kapıda Ödeme',code:'cash_on_delivery',type:'cod',fee:0},
      ]});
      return {id:tenant.id,name:tenant.name,slug:tenant.slug,publicSlug:tenant.publicSlug};
    });
  }

  async updateStore(tenantId: string, storeId: string, body: any) {
    await this.assertStore(tenantId, storeId);
    const allowed = ['name','domain','currency','locale','timezone','defaultCountry','weightUnit','dimensionUnit','activeTheme','logoUrl','faviconUrl','email','phone','companyName','taxNumber','taxOffice','addressText','seoTitle','seoDescription','maintenanceMode','settings'];
    const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    const updated=await this.prisma.tenant.update({ where: { id: storeId }, data });
    await this.cache.delPattern('public:site:*'); await this.cache.purgeTenant(tenantId);
    return updated;
  }


  private async ownerForStoreDeletion(tenantId:string,userId:string){
    const membership=await this.prisma.membership.findFirst({where:{tenantId,userId},include:{user:true,tenant:true}});if(!membership||membership.role!=='OWNER')throw new ForbiddenException('Mağaza silme talebini yalnızca mağaza sahibi oluşturabilir.');return membership;
  }
  private async sendDeletionConfirmation(email:string,confirmUrl:string,storeName:string){
    const apiKey=String(process.env.RESEND_API_KEY||'').trim();const from=String(process.env.MAIL_FROM||'Ticarti <noreply@ticarti.com>').trim();
    if(!apiKey){if(process.env.NODE_ENV==='production')throw new BadRequestException('Silme onay e-postası için RESEND_API_KEY yapılandırılmalı.');return false;}
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:[email],subject:`${storeName} mağaza silme onayı`,html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>Mağaza silme talebi</h2><p><b>${storeName}</b> mağazasının silinmesi için talep aldık.</p><p>Bu işlem yalnızca aşağıdaki bağlantı ile onaylandıktan sonra başlar. Onaydan 15 gün sonra mağaza ve mağazaya bağlı veriler kalıcı olarak silinir.</p><p><a href="${confirmUrl}" style="display:inline-block;padding:12px 18px;background:#16a36f;color:white;text-decoration:none;border-radius:7px">Silme talebini onayla</a></p><p>Bu talebi siz oluşturmadıysanız hiçbir işlem yapmayın.</p></div>`})});if(!r.ok)throw new BadRequestException('Silme onay e-postası gönderilemedi.');return true;
  }
  async requestStoreDeletion(tenantId:string,userId:string,storeId:string){
    if(tenantId!==storeId)throw new ForbiddenException();const m=await this.ownerForStoreDeletion(tenantId,userId);const token=randomBytes(32).toString('hex');const hash=createHash('sha256').update(token).digest('hex');const host=m.tenant.domain||`${m.tenant.publicSlug}.ticarti.com`;const confirmUrl=`https://${host}/admin/settings?tab=delete-store&deleteToken=${encodeURIComponent(token)}`;
    await this.sendDeletionConfirmation(m.user.email,confirmUrl,m.tenant.name);await this.prisma.tenant.update({where:{id:tenantId},data:{deletionRequestedAt:new Date(),deletionConfirmedAt:null,deletionScheduledAt:null,deletionRequestTokenHash:hash}});return{requested:true,email:m.user.email.replace(/^(.{2}).+(@.+)$/,'$1***$2')};
  }
  async confirmStoreDeletion(tenantId:string,userId:string,storeId:string,token:string){
    if(tenantId!==storeId)throw new ForbiddenException();await this.ownerForStoreDeletion(tenantId,userId);const store=await this.prisma.tenant.findUnique({where:{id:storeId}});if(!store?.deletionRequestTokenHash)throw new BadRequestException('Aktif silme talebi bulunamadı.');const hash=createHash('sha256').update(String(token||'')).digest('hex');if(hash!==store.deletionRequestTokenHash)throw new BadRequestException('Onay bağlantısı geçersiz veya süresi dolmuş.');const now=new Date(),scheduled=new Date(now.getTime()+15*86400000);await this.prisma.tenant.update({where:{id:storeId},data:{deletionConfirmedAt:now,deletionScheduledAt:scheduled,deletionRequestTokenHash:null}});return{confirmed:true,scheduledAt:scheduled};
  }
  async cancelStoreDeletion(tenantId:string,userId:string,storeId:string){
    if(tenantId!==storeId)throw new ForbiddenException();await this.ownerForStoreDeletion(tenantId,userId);await this.prisma.tenant.update({where:{id:storeId},data:{deletionRequestedAt:null,deletionConfirmedAt:null,deletionScheduledAt:null,deletionRequestTokenHash:null}});return{canceled:true};
  }

  async team(tenantId: string) {
    return this.prisma.membership.findMany({ where: { tenantId }, include: { customRole: true, user: { select: { id: true, email: true, name: true, createdAt: true } } }, orderBy: { user: { createdAt: 'asc' } } });
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
    if (body.customRoleId) {
      const role = await this.prisma.customRole.findFirst({ where: { id: body.customRoleId, tenantId } });
      if (!role) throw new BadRequestException('Role does not belong to tenant');
    }
    const membership = await this.prisma.membership.upsert({ where: { userId_tenantId: { userId: user.id, tenantId } }, create: { userId: user.id, tenantId, role: body.role || 'STAFF', customRoleId: body.customRoleId || null }, update: { role: body.role || 'STAFF', customRoleId: body.customRoleId || null } });
    return this.prisma.membership.findUnique({ where: { id: membership.id }, include: { customRole: true, user: { select: { id: true, email: true, name: true } } } });
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
    if (body.name !== undefined) await this.prisma.user.update({ where: { id: membership.userId }, data: { name: body.name } });
    return this.prisma.membership.findUnique({ where: { id: membershipId }, include: { customRole: true, user: { select: { id: true, email: true, name: true } } } });
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

  async products(tenantId: string, storeId: string, q?: string) {
    await this.assertStore(tenantId, storeId);
    return this.prisma.product.findMany({
      where: { storeId, ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } }] } : {}) },
      include: { brand: true, images: { orderBy: { sortOrder: 'asc' } }, categories: { include: { category: true } }, variants: { include: { inventory: true } } },
      orderBy: { createdAt: 'desc' },
    }).then(async rows=>{const trs=rows.length?await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'product',entityId:{in:rows.map(x=>x.id)}}}):[];return rows.map(x=>({...x,translations:trs.filter(t=>t.entityId===x.id).map(t=>({locale:t.locale,fields:t.fields}))}));});
  }

  async product(tenantId:string,storeId:string,id:string){
    await this.assertStore(tenantId,storeId);
    const row=await this.prisma.product.findFirst({where:{id,storeId},include:{brand:true,images:{orderBy:{sortOrder:'asc'}},categories:{include:{category:true}},variants:{include:{inventory:true}}}});
    if(!row)throw new NotFoundException('Product not found');
    const translations=await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'product',entityId:id}});
    return {...row,translations:translations.map(t=>({locale:t.locale,fields:t.fields}))};
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
  private async inventoryTargetsForVariant(storeId:string,variantId:string,quantity:number){
    const variant=await this.prisma.variant.findFirst({where:{id:variantId,product:{storeId}},include:{inventory:true,product:true}});if(!variant)return[];
    const cfg=this.setConfig(variant.product);
    if(String(variant.product.productType||'').toUpperCase()==='SET'&&cfg.stockMode==='COMPONENTS'&&cfg.items.length){
      const ids=cfg.items.map((x:any)=>x.variantId);const rows=await this.prisma.variant.findMany({where:{id:{in:ids},product:{storeId}},include:{inventory:true}});const map=new Map(rows.map(x=>[x.id,x]));
      return cfg.items.map((x:any)=>({variant:map.get(x.variantId),variantId:x.variantId,quantity:x.quantity*quantity,inventory:(map.get(x.variantId) as any)?.inventory})).filter((x:any)=>x.variant);
    }
    return [{variant,variantId:variant.id,quantity,inventory:variant.inventory}];
  }

  async createProduct(tenantId: string, storeId: string, body: any) {
    await this.assertStore(tenantId, storeId);
    if (body.brandId) { const brand=await this.prisma.brand.findFirst({where:{id:body.brandId,storeId}}); if(!brand)throw new BadRequestException('Brand does not belong to store'); }
    if (Array.isArray(body.categoryIds) && body.categoryIds.length) { const count=await this.prisma.category.count({where:{id:{in:body.categoryIds},storeId}}); if(count!==new Set(body.categoryIds).size)throw new BadRequestException('One or more categories do not belong to store'); }
    await this.validateSetConfig(storeId,body);
    const sub=await this.prisma.subscription.findFirst({where:{tenantId,status:{in:['TRIAL','ACTIVE']}},include:{plan:true},orderBy:{createdAt:'desc'}});
    if(sub){const count=await this.prisma.product.count({where:{storeId:tenantId}});if(count>=sub.plan.maxProducts)throw new BadRequestException(`Plan allows ${sub.plan.maxProducts} products`);}
    const variants=Array.isArray(body.variants)&&body.variants.length?body.variants:[{title:'Standart',sku:body.sku||`SKU-${Date.now()}`,price:body.price||0,stock:body.stock||0}];
    return this.prisma.$transaction(async tx=>{
      const product=await tx.product.create({data:{storeId,brandId:body.brandId||null,title:body.title,slug:this.slugify(body.slug||body.title),description:body.description,shortDescription:body.shortDescription,status:body.status||'DRAFT',productType:String(body.productType||'SIMPLE').toUpperCase(),tags:body.tags||[],seoTitle:body.seoTitle,seoDescription:body.seoDescription,metadata:body.metadata||{},images:{create:(body.images||[]).map((x:any,i:number)=>({url:typeof x==='string'?x:x.url,mediaAssetId:typeof x==='string'?null:(x.mediaAssetId||null),aiGenerated:typeof x==='string'?false:!!x.aiGenerated,alt:typeof x==='string'?body.title:x.alt,sortOrder:i}))},categories:{create:(body.categoryIds||[]).map((categoryId:string)=>({categoryId}))},variants:{create:variants.map((v:any)=>({title:v.title||'Standart',sku:String(v.sku||`SKU-${Date.now()}`),barcode:v.barcode||null,price:Number(v.price||0),comparePrice:v.comparePrice===undefined||v.comparePrice===null?null:Number(v.comparePrice),cost:v.cost===undefined||v.cost===null?null:Number(v.cost),weight:v.weight===undefined||v.weight===null?null:Number(v.weight),attributes:v.attributes||{},isActive:v.isActive!==false,inventory:{create:{onHand:Number(v.stock||0),lowStockAt:Number(v.lowStockAt??5),trackStock:v.trackStock!==false,allowBackorder:!!v.allowBackorder}}}))}}});
      await this.saveEntityTranslations(tx,storeId,'product',product.id,body);
      return tx.product.findUnique({where:{id:product.id},include:{brand:true,images:true,categories:{include:{category:true}},variants:{include:{inventory:true}}}});
    });
  }

  async updateProduct(tenantId: string, storeId: string, id: string, body: any) {
    await this.assertStore(tenantId, storeId);const product=await this.prisma.product.findFirst({where:{id,storeId}});if(!product)throw new NotFoundException('Product not found');
    if(body.brandId){const brand=await this.prisma.brand.findFirst({where:{id:body.brandId,storeId}});if(!brand)throw new BadRequestException('Brand does not belong to store');}
    if(Array.isArray(body.categoryIds)&&body.categoryIds.length){const count=await this.prisma.category.count({where:{id:{in:body.categoryIds},storeId}});if(count!==new Set(body.categoryIds).size)throw new BadRequestException('One or more categories do not belong to store');}
    await this.validateSetConfig(storeId,{...body,productType:body.productType??product.productType,metadata:body.metadata??product.metadata},id);
    const allowed=['brandId','title','slug','description','shortDescription','status','productType','tags','seoTitle','seoDescription','metadata'];const data:any=Object.fromEntries(Object.entries(body).filter(([k])=>allowed.includes(k)));if(body.productType!==undefined)data.productType=String(body.productType||'SIMPLE').toUpperCase();if(body.slug!==undefined||body.title!==undefined)data.slug=this.slugify(body.slug||body.title||product.slug);
    return this.prisma.$transaction(async tx=>{
      if(Array.isArray(body.categoryIds)){await tx.productCategory.deleteMany({where:{productId:id}});data.categories={create:body.categoryIds.map((categoryId:string)=>({categoryId}))};}
      if(Array.isArray(body.images)){await tx.productImage.deleteMany({where:{productId:id}});data.images={create:body.images.map((x:any,i:number)=>({url:typeof x==='string'?x:x.url,mediaAssetId:typeof x==='string'?null:(x.mediaAssetId||null),aiGenerated:typeof x==='string'?false:!!x.aiGenerated,alt:typeof x==='string'?body.title||product.title:x.alt,sortOrder:i}))};}
      await tx.product.update({where:{id},data});
      if(Array.isArray(body.variants)&&body.variants.length){
        const requestedIds:string[]=body.variants.filter((v:any)=>v.id).map((v:any)=>String(v.id));if(requestedIds.length){const count=await tx.variant.count({where:{id:{in:requestedIds},productId:id}});if(count!==new Set(requestedIds).size)throw new BadRequestException('One or more variants do not belong to product');}
        if(body.replaceVariants===true)await tx.variant.updateMany({where:{productId:id,...(requestedIds.length?{id:{notIn:requestedIds}}:{})},data:{isActive:false}});
        for(const v of body.variants){const variantData:any={title:v.title||'Standart',sku:String(v.sku||''),barcode:v.barcode||null,price:Number(v.price||0),comparePrice:v.comparePrice===undefined||v.comparePrice===null||v.comparePrice===''?null:Number(v.comparePrice),cost:v.cost===undefined||v.cost===null||v.cost===''?null:Number(v.cost),weight:v.weight===undefined||v.weight===null||v.weight===''?null:Number(v.weight),attributes:v.attributes||{},isActive:v.isActive!==false};if(!variantData.sku)throw new BadRequestException('Variant SKU is required');if(v.id){await tx.variant.update({where:{id:String(v.id)},data:variantData});await tx.inventoryItem.upsert({where:{variantId:String(v.id)},create:{variantId:String(v.id),onHand:Number(v.stock||0),lowStockAt:Number(v.lowStockAt??5),trackStock:v.trackStock!==false,allowBackorder:!!v.allowBackorder},update:{onHand:Number(v.stock||0),lowStockAt:Number(v.lowStockAt??5),trackStock:v.trackStock!==false,allowBackorder:!!v.allowBackorder}});}else{await tx.variant.create({data:{productId:id,...variantData,inventory:{create:{onHand:Number(v.stock||0),lowStockAt:Number(v.lowStockAt??5),trackStock:v.trackStock!==false,allowBackorder:!!v.allowBackorder}}}});}}
      }
      await this.saveEntityTranslations(tx,storeId,'product',id,body);return tx.product.findUnique({where:{id},include:{brand:true,images:true,categories:{include:{category:true}},variants:{include:{inventory:true}}}});
    });
  }

  async addVariant(tenantId: string, storeId: string, productId: string, body: any) {
    await this.assertStore(tenantId, storeId);
    const product = await this.prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.variant.create({ data: { productId, title: body.title, sku: body.sku, barcode: body.barcode, price: body.price, comparePrice: body.comparePrice, cost: body.cost, weight: body.weight, attributes: body.attributes, inventory: { create: { onHand: body.stock || 0, lowStockAt: body.lowStockAt ?? 5, trackStock: body.trackStock ?? true, allowBackorder: body.allowBackorder ?? false } } }, include: { inventory: true } });
  }

  async updateVariant(tenantId: string, storeId: string, id: string, body: any) {
    await this.assertStore(tenantId, storeId);
    const variant = await this.prisma.variant.findFirst({ where: { id, product: { storeId } } });
    if (!variant) throw new NotFoundException('Variant not found');
    const allowed = ['title','sku','barcode','price','comparePrice','cost','weight','attributes','isActive'];
    const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if (body.stock !== undefined || body.lowStockAt !== undefined || body.trackStock !== undefined || body.allowBackorder !== undefined) {
      await this.prisma.inventoryItem.update({ where: { variantId: id }, data: { ...(body.stock !== undefined ? { onHand: Number(body.stock) } : {}), ...(body.lowStockAt !== undefined ? { lowStockAt: Number(body.lowStockAt) } : {}), ...(body.trackStock !== undefined ? { trackStock: !!body.trackStock } : {}), ...(body.allowBackorder !== undefined ? { allowBackorder: !!body.allowBackorder } : {}) } });
    }
    return this.prisma.variant.update({ where: { id }, data, include: { inventory: true } });
  }

  async archiveProduct(tenantId: string, storeId: string, id: string) {
    await this.assertStore(tenantId, storeId);
    const p = await this.prisma.product.findFirst({ where: { id, storeId } });
    if (!p) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async catalogDefinitions(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const saved:any=settings.catalogDefinitions||{};
    const defaults:any={customFields:[],variantTypes:[{id:'variant-color',name:'Renk',code:'color',active:true},{id:'variant-size',name:'Beden / Boyut',code:'size',active:true}],productGroups:[],suppliers:[],personalizations:[],tags:[],units:[{id:'unit-piece',name:'Adet',code:'adet',active:true},{id:'unit-pack',name:'Paket',code:'paket',active:true},{id:'unit-service',name:'Servis',code:'servis',active:true}]};
    return {...defaults,...saved};
  }
  async updateCatalogDefinitions(tenantId:string,storeId:string,definitions:any){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const keys=['customFields','variantTypes','productGroups','suppliers','personalizations','tags','units'];const clean:any={};for(const key of keys){const rows=Array.isArray(definitions?.[key])?definitions[key]:[];clean[key]=rows.slice(0,500).map((x:any,i:number)=>({id:String(x?.id||`${key}-${Date.now()}-${i}`),name:String(x?.name||'').trim().slice(0,160),code:String(x?.code||'').trim().slice(0,80),active:x?.active!==false})).filter((x:any)=>x.name);}
    await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,catalogDefinitions:clean}}});await this.cache.purgeTenant(tenantId);return this.catalogDefinitions(tenantId,storeId);
  }

  async categories(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);const rows=await this.prisma.category.findMany({where:{storeId},orderBy:[{sortOrder:'asc'},{name:'asc'}]});const trs=rows.length?await this.prisma.contentTranslation.findMany({where:{storeId,entityType:'category',entityId:{in:rows.map(x=>x.id)}}}):[];return rows.map(x=>({...x,translations:trs.filter(t=>t.entityId===x.id).map(t=>({locale:t.locale,fields:t.fields}))}));}
  async createCategory(tenantId:string,storeId:string,body:any){await this.assertStore(tenantId,storeId);if(body.parentId){const parent=await this.prisma.category.findFirst({where:{id:body.parentId,storeId}});if(!parent)throw new BadRequestException('Parent category does not belong to store');}return this.prisma.$transaction(async tx=>{const row=await tx.category.create({data:{storeId,parentId:body.parentId||null,name:body.name,slug:this.slugify(body.slug||body.name),description:body.description,imageUrl:body.imageUrl,seoTitle:body.seoTitle,seoDescription:body.seoDescription,sortOrder:body.sortOrder||0,isActive:body.isActive??true}});await this.saveEntityTranslations(tx,storeId,'category',row.id,body);return row;});}
  async updateCategory(tenantId:string,storeId:string,id:string,body:any){await this.assertStore(tenantId,storeId);const x=await this.prisma.category.findFirst({where:{id,storeId}});if(!x)throw new NotFoundException();if(body.parentId){const parent=await this.prisma.category.findFirst({where:{id:body.parentId,storeId}});if(!parent)throw new BadRequestException('Parent category does not belong to store');}const allowed=['parentId','name','slug','description','imageUrl','seoTitle','seoDescription','sortOrder','isActive'];const data:any=Object.fromEntries(Object.entries(body).filter(([k])=>allowed.includes(k)));if(body.slug!==undefined||body.name!==undefined)data.slug=this.slugify(body.slug||body.name||x.slug);return this.prisma.$transaction(async tx=>{const row=await tx.category.update({where:{id},data});await this.saveEntityTranslations(tx,storeId,'category',id,body);return row;});}

  async brands(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.brand.findMany({ where: { storeId }, orderBy: { name: 'asc' } }); }
  async createBrand(tenantId: string, storeId: string, body: any) { await this.assertStore(tenantId, storeId); return this.prisma.brand.create({ data: { storeId, name: body.name, slug: this.slugify(body.slug || body.name), logoUrl: body.logoUrl, description: body.description, seoTitle: body.seoTitle, seoDescription: body.seoDescription } }); }

  async customers(tenantId: string, storeId: string, q?: string) { await this.assertStore(tenantId, storeId); return this.prisma.customer.findMany({ where: { storeId, ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }] } : {}) }, include: { group: true, _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' } }); }
  async customer(tenantId: string, storeId: string, id: string) { await this.assertStore(tenantId, storeId); const c = await this.prisma.customer.findFirst({ where: { id, storeId }, include: { group: true, addresses: true, orders: { orderBy: { createdAt: 'desc' } } } }); if (!c) throw new NotFoundException(); return c; }


  async customerGroups(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    return this.prisma.customerGroup.findMany({where:{storeId},include:{_count:{select:{customers:true}}},orderBy:[{isDefault:'desc'},{name:'asc'}]});
  }
  async createCustomerGroup(tenantId:string,storeId:string,body:any){
    await this.assertStore(tenantId,storeId);
    const name=String(body?.name||'').trim();if(!name)throw new BadRequestException('Grup adı gerekli');
    if(body?.isDefault)await this.prisma.customerGroup.updateMany({where:{storeId},data:{isDefault:false}});
    return this.prisma.customerGroup.create({data:{storeId,name,description:body?.description||null,color:body?.color||'#16a34a',discountPercent:Math.max(0,Math.min(100,Number(body?.discountPercent||0))),isDefault:!!body?.isDefault}});
  }
  async updateCustomerGroup(tenantId:string,storeId:string,id:string,body:any){
    await this.assertStore(tenantId,storeId);
    const row=await this.prisma.customerGroup.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException('Müşteri grubu bulunamadı');
    if(body?.isDefault)await this.prisma.customerGroup.updateMany({where:{storeId,id:{not:id}},data:{isDefault:false}});
    const data:any={};for(const k of ['name','description','color','isDefault'])if(body[k]!==undefined)data[k]=body[k];
    if(body.discountPercent!==undefined)data.discountPercent=Math.max(0,Math.min(100,Number(body.discountPercent||0)));
    return this.prisma.customerGroup.update({where:{id},data});
  }
  async deleteCustomerGroup(tenantId:string,storeId:string,id:string){
    await this.assertStore(tenantId,storeId);
    const row=await this.prisma.customerGroup.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException('Müşteri grubu bulunamadı');
    await this.prisma.customer.updateMany({where:{storeId,groupId:id},data:{groupId:null}});
    await this.prisma.customerGroup.delete({where:{id}});
    return {deleted:true};
  }
  async assignCustomerGroup(tenantId:string,storeId:string,customerId:string,groupId?:string|null){
    await this.assertStore(tenantId,storeId);
    const customer=await this.prisma.customer.findFirst({where:{id:customerId,storeId}});if(!customer)throw new NotFoundException('Müşteri bulunamadı');
    if(groupId){const group=await this.prisma.customerGroup.findFirst({where:{id:groupId,storeId}});if(!group)throw new BadRequestException('Müşteri grubu mağazaya ait değil');}
    return this.prisma.customer.update({where:{id:customerId},data:{groupId:groupId||null},include:{group:true}});
  }

  async orders(tenantId:string,storeId:string,status?:any){
    await this.assertStore(tenantId,storeId);return this.prisma.order.findMany({where:{storeId,...(status?{status}:{})},include:{customer:true,items:{include:{variant:{include:{product:{include:{images:{orderBy:{sortOrder:'asc'},take:1}}}}}}}},orderBy:{createdAt:'desc'},take:200});
  }
  async order(tenantId:string,storeId:string,id:string){
    await this.assertStore(tenantId,storeId);const o=await this.prisma.order.findFirst({where:{id,storeId},include:{customer:true,items:{include:{variant:{include:{product:{include:{images:{orderBy:{sortOrder:'asc'},take:1}}}}}}},statusHistory:{orderBy:{createdAt:'desc'}},returns:{include:{items:true}}}});if(!o)throw new NotFoundException();return o;
  }
  async updateOrderStatus(tenantId:string,storeId:string,id:string,body:any){
    await this.assertStore(tenantId,storeId);const order:any=await this.order(tenantId,storeId,id);
    if(body.status==='CANCELLED'&&!['CANCELLED','FULFILLED','REFUNDED'].includes(order.status)){
      for(const item of order.items){if(!item.variantId)continue;const targets=await this.inventoryTargetsForVariant(storeId,item.variantId,item.quantity);for(const target of targets as any[]){const inv=target.inventory;if(!inv?.trackStock)continue;if(order.paymentStatus==='PAID')await this.prisma.inventoryItem.update({where:{variantId:target.variantId},data:{onHand:{increment:target.quantity}}});else if(inv.reserved>0)await this.prisma.inventoryItem.update({where:{variantId:target.variantId},data:{reserved:{decrement:Math.min(inv.reserved,target.quantity)}}});}}
    }
    if(body.paymentStatus==='PAID'&&order.paymentStatus!=='PAID'){
      for(const item of order.items){if(!item.variantId)continue;const targets=await this.inventoryTargetsForVariant(storeId,item.variantId,item.quantity);for(const target of targets as any[]){const inv=target.inventory;if(inv?.trackStock)await this.prisma.inventoryItem.update({where:{variantId:target.variantId},data:{onHand:{decrement:target.quantity},reserved:{decrement:Math.min(inv.reserved,target.quantity)}}});}}
    }
    if(body.paymentStatus==='PAID'&&order.paymentStatus!=='PAID'&&order.customerId){const program=await this.prisma.loyaltyProgram.findUnique({where:{storeId}});if(program?.enabled){const existingEarn=await this.prisma.loyaltyTransaction.findFirst({where:{orderId:order.id,type:'EARN'}});if(!existingEarn){const rate=Number((order.metadata as any)?.exchangeRate||1);const baseAmount=Number(order.grandTotal)/Math.max(rate,0.00000001);const points=Math.max(0,Math.floor(baseAmount*Number(program.pointsPerCurrencyUnit)));if(points>0){const account=await this.prisma.loyaltyAccount.upsert({where:{customerId:order.customerId},create:{storeId,customerId:order.customerId,points,lifetimePoints:points},update:{points:{increment:points},lifetimePoints:{increment:points}}});await this.prisma.loyaltyTransaction.create({data:{accountId:account.id,orderId:order.id,type:'EARN',points,balanceAfter:account.points,note:`Order #${order.number}`}});}}}}
    const data:any={};for(const k of ['status','paymentStatus','fulfillmentStatus','adminNote'])if(body[k]!==undefined)data[k]=body[k];if(body.shipping!==undefined||body.invoice!==undefined){const current:any=order.metadata||{};data.metadata={...current,...(body.shipping!==undefined?{shipping:{...(current.shipping||{}),...(body.shipping||{})}}:{}),...(body.invoice!==undefined?{invoice:{...(current.invoice||{}),...(body.invoice||{})}}:{})};}
    const updated=await this.prisma.order.update({where:{id},data});await this.prisma.orderStatusHistory.create({data:{orderId:id,status:body.status||body.paymentStatus||body.fulfillmentStatus||'UPDATED',note:body.note}});return updated;
  }


  private posMoney(value:any){const n=Number(value||0);return Math.round((Number.isFinite(n)?n:0)*100)/100;}
  private posAddress(value:any,fallback:any={}){const source=value&&typeof value==='object'?value:{};const base=fallback&&typeof fallback==='object'?fallback:{};const pick=(key:string)=>String(source[key]??base[key]??'').trim();const name=pick('name');const pieces=name.split(/\s+/).filter(Boolean);const firstName=pick('firstName')||(pieces.length?pieces.slice(0,-1).join(' ')||pieces[0]:'');const lastName=pick('lastName')||(pieces.length>1?pieces[pieces.length-1]:'');return {name,firstName,lastName,email:pick('email'),phone:pick('phone'),company:pick('company'),taxOffice:pick('taxOffice'),taxNumber:pick('taxNumber'),address1:pick('address1'),address2:pick('address2'),district:pick('district'),city:pick('city'),state:pick('state'),postalCode:pick('postalCode'),country:(pick('country')||'TR').toUpperCase()};}
  private async buildPosQuote(tenantId:string,body:any){
    const storeId=String(body?.storeId||tenantId);const store=await this.assertStore(tenantId,storeId);
    const items=Array.isArray(body?.items)?body.items.filter((x:any)=>x?.variantId&&Number(x.quantity)>0).map((x:any)=>({variantId:String(x.variantId),quantity:Math.max(1,Math.floor(Number(x.quantity||1))),unitPrice:x.unitPrice})) : [];
    if(!items.length)throw new BadRequestException('POS sepeti boş');
    const variants=await this.prisma.variant.findMany({where:{id:{in:items.map((x:any)=>x.variantId)},product:{storeId,status:'ACTIVE'}},include:{product:{include:{categories:true}},inventory:true}});
    if(variants.length!==new Set(items.map((x:any)=>x.variantId)).size)throw new BadRequestException('Bir veya daha fazla ürün bulunamadı');
    const byId=new Map(variants.map((v:any)=>[v.id,v]));const prepared:any[]=[];let subtotal=0;
    for(const item of items){const variant:any=byId.get(item.variantId);const catalogPrice=this.posMoney(variant.price);const requested=Number(item.unitPrice);const unit=Number.isFinite(requested)&&requested>=0?this.posMoney(requested):catalogPrice;const targets:any[]=await this.inventoryTargetsForVariant(storeId,item.variantId,item.quantity);for(const target of targets){const inv=target.inventory;if(inv?.trackStock&&!inv.allowBackorder&&Number(inv.onHand)<Number(target.quantity))throw new BadRequestException(`${variant.product.title} için yeterli stok yok`);}subtotal=this.posMoney(subtotal+unit*item.quantity);prepared.push({variant,quantity:item.quantity,targets,unit,catalogPrice});}

    const email=String(body?.customerEmail||'').trim().toLowerCase();const existingCustomer=email?await this.prisma.customer.findUnique({where:{storeId_email:{storeId,email}}}):null;const customerOrderCount=existingCustomer?await this.prisma.order.count({where:{customerId:existingCustomer.id}}):0;
    const couponCode=String(body?.couponCode||'').trim().toUpperCase();const now=new Date();const day=now.getDay();
    const promos=await this.prisma.promotion.findMany({where:{storeId,status:'ACTIVE',OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]},{OR:[{daysOfWeek:{isEmpty:true}},{daysOfWeek:{has:day}}]}]},include:{codes:true,redemptions:existingCustomer?{where:{customerId:existingCustomer.id}}:false}});
    const activePromos=(promos as any[]).filter((p:any)=>!p.usageLimit||p.usageCount<p.usageLimit).filter((p:any)=>!p.perCustomerLimit||!existingCustomer||p.redemptions.length<p.perCustomerLimit);
    const existingMeta:any=existingCustomer?.metadata||{};const promotion=evaluatePromotions(activePromos,{subtotal,items:prepared.map((row:any)=>({variantId:row.variant.id,productId:row.variant.productId,brandId:row.variant.product?.brandId||null,sku:row.variant.sku,categoryIds:(row.variant.product.categories||[]).map((c:any)=>c.categoryId),quantity:row.quantity,unitPrice:row.unit})),currency:String(store.currency||'TRY'),customerTags:existingCustomer?.tags||[],customerOrderCount,couponCodes:couponCode?[couponCode]:[],exchangeRate:1,shippingCountry:String(body?.shippingAddress?.country||'TR').toUpperCase(),customerId:existingCustomer?.id||null,customerGroupId:existingCustomer?.groupId||null,customerName:[existingCustomer?.firstName,existingCustomer?.lastName].filter(Boolean).join(' '),customerBirthDate:existingMeta.birthDate||null});
    const automaticDiscountTotal=this.posMoney((promotion.applied||[]).filter((x:any)=>!x.code).reduce((sum:number,x:any)=>sum+Number(x.discount||0),0));
    let couponDiscountTotal=this.posMoney((promotion.applied||[]).filter((x:any)=>x.code).reduce((sum:number,x:any)=>sum+Number(x.discount||0),0));let legacyDiscount:any=null;
    if(couponCode){
      const promoCode=await this.prisma.promotionCode.findFirst({where:{storeId,code:couponCode,isActive:true,promotion:{status:'ACTIVE'}}});
      if(promoCode&&!promotion.applied?.some((x:any)=>String(x.code||'').toUpperCase()===couponCode))throw new BadRequestException('Kupon koşulları bu satış için sağlanmıyor');
      if(!promoCode){legacyDiscount=await this.prisma.discount.findFirst({where:{storeId,code:couponCode,isActive:true,OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]}]},include:{products:true,categories:true}});if(!legacyDiscount)throw new BadRequestException('Kupon kodu geçersiz');if(legacyDiscount.usageLimit&&legacyDiscount.usageCount>=legacyDiscount.usageLimit)throw new BadRequestException('Kupon kullanım limiti dolmuş');if(legacyDiscount.minimumAmount&&subtotal<Number(legacyDiscount.minimumAmount))throw new BadRequestException(`Kupon için minimum sepet tutarı ${legacyDiscount.minimumAmount}`);let eligible=subtotal;if(legacyDiscount.scope==='PRODUCT'&&legacyDiscount.products.length)eligible=prepared.filter((r:any)=>legacyDiscount.products.some((p:any)=>p.productId===r.variant.productId)).reduce((sum:number,r:any)=>sum+r.unit*r.quantity,0);if(legacyDiscount.scope==='CATEGORY'&&legacyDiscount.categories.length)eligible=prepared.filter((r:any)=>(r.variant.product.categories||[]).some((c:any)=>legacyDiscount.categories.some((x:any)=>x.categoryId===c.categoryId))).reduce((sum:number,r:any)=>sum+r.unit*r.quantity,0);let amount=0;if(legacyDiscount.type==='PERCENTAGE')amount=eligible*Math.max(0,Number(legacyDiscount.value||0))/100;if(legacyDiscount.type==='FIXED_AMOUNT')amount=Math.max(0,Number(legacyDiscount.value||0));if(legacyDiscount.maximumDiscount)amount=Math.min(amount,Number(legacyDiscount.maximumDiscount));couponDiscountTotal=this.posMoney(Math.min(Math.max(0,subtotal-automaticDiscountTotal),amount));}
    }
    const manualType=String(body?.manualDiscount?.type||'NONE').toUpperCase();const manualValue=Math.max(0,Number(body?.manualDiscount?.value||0));const remainingBeforeManual=Math.max(0,subtotal-automaticDiscountTotal-couponDiscountTotal);let manualDiscountTotal=0;if(manualType==='PERCENTAGE')manualDiscountTotal=remainingBeforeManual*Math.min(100,manualValue)/100;if(manualType==='FIXED')manualDiscountTotal=Math.min(remainingBeforeManual,manualValue);manualDiscountTotal=this.posMoney(manualDiscountTotal);
    const discountTotal=this.posMoney(Math.min(subtotal,automaticDiscountTotal+couponDiscountTotal+manualDiscountTotal));
    const rawPaymentMethod=String(body?.paymentMethod||'POS_CASH').trim();const builtInPayment=rawPaymentMethod.toUpperCase();const paymentMethod=['POS_CASH','POS_CARD'].includes(builtInPayment)?builtInPayment:rawPaymentMethod;const paymentRow=['POS_CASH','POS_CARD'].includes(paymentMethod)?null:await this.prisma.paymentMethod.findFirst({where:{storeId,code:paymentMethod,isActive:true}});const paymentFee=this.posMoney(paymentRow?.fee||0);
    const requestedDelivery=String(body?.deliveryType||'SHIPPING').toUpperCase();const deliveryType=['SHIPPING','PICKUP','COURIER'].includes(requestedDelivery)?requestedDelivery:'SHIPPING';const shippingMethodCode=String(body?.shippingMethodCode||'').trim();let shippingMethod:any=null;
    if(shippingMethodCode)shippingMethod=await this.prisma.shippingMethod.findFirst({where:{storeId,code:shippingMethodCode,isActive:true}});
    if(!shippingMethod){const preferredType=deliveryType==='PICKUP'?'pickup':deliveryType==='COURIER'?'courier':'shipping';shippingMethod=await this.prisma.shippingMethod.findFirst({where:{storeId,type:preferredType,isActive:true},orderBy:{sortOrder:'asc'}});}
    const settings:any=store.settings||{};const regionalTax:any=settings?.regional?.tax||{};const pricesIncludeTax=regionalTax.pricesIncludeTax??settings.pricesIncludeTax??true;const taxRate=Math.max(0,Number(regionalTax.defaultRate??settings.taxRate??20));const netAfterDiscount=Math.max(0,this.posMoney(subtotal-discountTotal));const shippingBase=deliveryType==='PICKUP'?0:this.posMoney(shippingMethod?.price||0);const shippingFree=deliveryType==='PICKUP'||(shippingMethod?.freeAbove!=null&&netAfterDiscount>=Number(shippingMethod.freeAbove));const shippingTotal=this.posMoney(shippingFree?0:shippingBase);const taxTotal=this.posMoney(taxRate<=0?0:(pricesIncludeTax?netAfterDiscount-(netAfterDiscount/(1+taxRate/100)):netAfterDiscount*taxRate/100));const grandTotal=this.posMoney(netAfterDiscount+(pricesIncludeTax?0:taxTotal)+shippingTotal+paymentFee);
    return {store,prepared,existingCustomer,couponCode,legacyDiscount,promotion,paymentMethod,deliveryType,shippingMethod,totals:{subtotal,automaticDiscountTotal,couponDiscountTotal,manualDiscountTotal,discountTotal,shippingTotal,paymentFee,taxTotal,taxRate,pricesIncludeTax,grandTotal,currency:String(store.currency||'TRY')}};
  }
  async posQuote(tenantId:string,body:any){const q=await this.buildPosQuote(tenantId,body);return q.totals;}
  async createPosOrder(tenantId:string,userId:string,body:any){
    const q=await this.buildPosQuote(tenantId,body);const {store,prepared,couponCode,legacyDiscount,promotion,paymentMethod,deliveryType,shippingMethod,totals}=q;const storeId=store.id;
    const email=String(body?.customerEmail||'').trim().toLowerCase();const customerName=String(body?.customerName||'').trim();const customerPhone=String(body?.customerPhone||'').trim();const nameParts=customerName.split(/\s+/).filter(Boolean);const firstName=nameParts.length>1?nameParts.slice(0,-1).join(' '):(nameParts[0]||'POS Müşterisi');const lastName=nameParts.length>1?nameParts[nameParts.length-1]:'';let customerId:string|null=q.existingCustomer?.id||null;
    if(email){const customer=await this.prisma.customer.upsert({where:{storeId_email:{storeId,email}},create:{storeId,email,firstName,lastName:lastName||null,phone:customerPhone||null},update:{firstName:customerName?firstName:undefined,lastName:customerName?(lastName||null):undefined,phone:customerPhone||undefined}});customerId=customer.id;}
    const shippingAddress=this.posAddress(body?.shippingAddress,{name:customerName,email,phone:customerPhone,country:'TR'});const billingAddress=this.posAddress(body?.billingAddress||body?.shippingAddress,{name:customerName,email,phone:customerPhone,country:shippingAddress.country||'TR'});
    return this.prisma.$transaction(async tx=>{
      for(const row of prepared)for(const target of row.targets){const inv=target.inventory;if(!inv?.trackStock)continue;if(inv.allowBackorder){await tx.inventoryItem.update({where:{variantId:target.variantId},data:{onHand:{decrement:target.quantity}}});continue;}const changed=await tx.inventoryItem.updateMany({where:{variantId:target.variantId,onHand:{gte:target.quantity}},data:{onHand:{decrement:target.quantity}}});if(changed.count!==1)throw new BadRequestException(`${row.variant.product.title} için yeterli stok yok`);}
      const counter=await tx.tenant.update({where:{id:storeId},data:{nextOrderNumber:{increment:1}},select:{nextOrderNumber:true}});
      const priceOverrides=prepared.filter((row:any)=>row.unit!==row.catalogPrice).map((row:any)=>({variantId:row.variant.id,sku:row.variant.sku,originalPrice:row.catalogPrice,unitPrice:row.unit}));
      const order=await tx.order.create({data:{storeId,customerId,number:counter.nextOrderNumber-1,status:'PROCESSING',paymentStatus:'PAID',fulfillmentStatus:'UNFULFILLED',paymentMethod,shippingMethod:shippingMethod?.code||`POS_${deliveryType}`,currency:store.currency,subtotal:totals.subtotal,discountTotal:totals.discountTotal,shippingTotal:totals.shippingTotal,paymentFee:totals.paymentFee,taxTotal:totals.taxTotal,grandTotal:totals.grandTotal,discountCode:couponCode||null,promotionSnapshot:{applied:promotion.applied||[],couponCode:couponCode||null,manualDiscount:body?.manualDiscount||null,automaticDiscountTotal:totals.automaticDiscountTotal,couponDiscountTotal:totals.couponDiscountTotal,manualDiscountTotal:totals.manualDiscountTotal},customerNote:body?.note||null,shippingAddress,billingAddress,source:'pos',metadata:{pos:{staffUserId:userId,completedAt:new Date().toISOString(),taxRate:totals.taxRate,pricesIncludeTax:totals.pricesIncludeTax,priceOverrides,deliveryType,shippingMethodCode:shippingMethod?.code||null,shippingMethodName:shippingMethod?.name||null},invoice:{status:'PENDING',company:billingAddress.company||null,taxOffice:billingAddress.taxOffice||null,taxNumber:billingAddress.taxNumber||null}},items:{create:prepared.map((row:any)=>({variantId:row.variant.id,sku:row.variant.sku,title:`${row.variant.product.title} - ${row.variant.title}`,quantity:row.quantity,unitPrice:row.unit,total:this.posMoney(row.unit*row.quantity)}))},statusHistory:{create:{status:'POS_SALE',note:`POS ${paymentMethod} · ${deliveryType}`}}},include:{items:true,customer:true}});
      if(legacyDiscount)await tx.discount.update({where:{id:legacyDiscount.id},data:{usageCount:{increment:1}}});
      for(const ap of promotion.applied||[]){await tx.promotion.update({where:{id:ap.id},data:{usageCount:{increment:1}}});if(ap.code)await tx.promotionCode.updateMany({where:{promotionId:ap.id,code:String(ap.code).toUpperCase()},data:{usageCount:{increment:1}}});await tx.promotionRedemption.create({data:{promotionId:ap.id,customerId,orderId:order.id,code:ap.code||null,discountAmount:Number(ap.discount||0)}});}
      return order;
    });
  }

  async liveTracking(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const now=new Date();const activeSince=new Date(now.getTime()-90000);const halfHour=new Date(now.getTime()-30*60000);const dayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    await this.prisma.liveVisitorSession.deleteMany({where:{storeId,lastSeenAt:{lt:new Date(now.getTime()-24*60*60000)}}});
    const [active,recentVisitors,recentOrders,todayOrders,todayItems]=await Promise.all([
      this.prisma.liveVisitorSession.findMany({where:{storeId,lastSeenAt:{gte:activeSince}},orderBy:{lastSeenAt:'desc'},take:200}),
      this.prisma.liveVisitorSession.findMany({where:{storeId,lastSeenAt:{gte:halfHour}},orderBy:{lastSeenAt:'desc'},take:500}),
      this.prisma.order.findMany({where:{storeId,createdAt:{gte:halfHour}},include:{customer:true},orderBy:{createdAt:'desc'},take:20}),
      this.prisma.order.aggregate({where:{storeId,createdAt:{gte:dayStart},paymentStatus:'PAID'},_count:{id:true},_sum:{grandTotal:true}}),
      this.prisma.orderItem.findMany({where:{order:{storeId,createdAt:{gte:dayStart},paymentStatus:'PAID'}},select:{title:true,quantity:true,total:true}}),
    ]);
    const topMap=new Map<string,{title:string,quantity:number,total:number}>();
    for(const item of todayItems){const key=String(item.title||'Ürün');const row=topMap.get(key)||{title:key,quantity:0,total:0};row.quantity+=Number(item.quantity||0);row.total+=Number(item.total||0);topMap.set(key,row);}
    const topItems=Array.from(topMap.values()).sort((a,b)=>b.quantity-a.quantity).slice(0,8);
    const history=Array.from({length:30},(_,i)=>{const from=new Date(now.getTime()-(29-i)*60000);const to=new Date(from.getTime()+60000);return {time:from.toISOString(),visitors:recentVisitors.filter((v:any)=>v.lastSeenAt>=from&&v.lastSeenAt<to).length};});
    const cartCount=active.filter((v:any)=>v.state==='CART').length;const checkoutCount=active.filter((v:any)=>v.state==='CHECKOUT').length;
    const cityMap=new Map<string,{city:string,visitors:number,orders:number,revenue:number}>();
    const countryMap=new Map<string,{country:string,countryCode:string,visitors:number,orders:number,revenue:number}>();
    const addCity=(city:any,key:'visitors'|'orders',amount=0)=>{const name=String(city||'Bilinmiyor').trim()||'Bilinmiyor';const row=cityMap.get(name)||{city:name,visitors:0,orders:0,revenue:0};row[key]+=1;row.revenue+=amount;cityMap.set(name,row);};
    const addCountry=(country:any,key:'visitors'|'orders',amount=0)=>{const raw=String(country||'').trim();if(!raw)return;const code=raw.length===2?raw.toUpperCase():'';const mapKey=code||raw.toLocaleLowerCase('tr');const row=countryMap.get(mapKey)||{country:raw,countryCode:code,visitors:0,orders:0,revenue:0};row[key]+=1;row.revenue+=amount;countryMap.set(mapKey,row);};
    active.forEach((v:any)=>{addCity(v.city,'visitors');addCountry(v.country,'visitors')});
    recentOrders.forEach((o:any)=>{const address:any=o.shippingAddress||{};addCity(address?.city,'orders',Number(o.grandTotal||0));addCountry(address?.country,'orders',Number(o.grandTotal||0))});
    return {store:{id:store.id,name:store.name,currency:store.currency},generatedAt:now.toISOString(),metrics:{activeVisitors:active.length,todayVisitors:await this.prisma.liveVisitorSession.count({where:{storeId,lastSeenAt:{gte:dayStart}}}),todayOrders:todayOrders._count.id,todayRevenue:Number(todayOrders._sum.grandTotal||0),cartCount,checkoutCount,recentOrderCount:recentOrders.length},activeVisitors:active.map((v:any)=>({visitorId:v.visitorId,path:v.path,state:v.state,city:v.city,country:v.country,lastSeenAt:v.lastSeenAt})),history,cities:Array.from(cityMap.values()).sort((a,b)=>(b.orders+b.visitors)-(a.orders+a.visitors)),countries:Array.from(countryMap.values()).sort((a,b)=>(b.orders+b.visitors)-(a.orders+a.visitors)),recentOrders:recentOrders.map((o:any)=>({id:o.id,number:o.number,total:Number(o.grandTotal),currency:o.currency,city:(o.shippingAddress as any)?.city||'Bilinmiyor',country:(o.shippingAddress as any)?.country||'',customer:o.customer?.email||'Misafir',createdAt:o.createdAt})),topItems};
  }

  async merchantSessions(userId:string){
    return this.prisma.merchantSession.findMany({where:{userId,revokedAt:null,expiresAt:{gt:new Date()}},select:{id:true,userAgentHash:true,ipHash:true,lastUsedAt:true,createdAt:true,expiresAt:true},orderBy:{lastUsedAt:'desc'},take:20});
  }
  async revokeMerchantSession(userId:string,sessionId:string,currentSessionId?:string){
    if(sessionId===currentSessionId)throw new BadRequestException('Aktif oturumu buradan kaldıramazsınız; çıkış yapın');
    const row=await this.prisma.merchantSession.findFirst({where:{id:sessionId,userId,revokedAt:null}});if(!row)throw new NotFoundException('Oturum bulunamadı');
    await this.prisma.merchantSession.update({where:{id:sessionId},data:{revokedAt:new Date()}});return {revoked:true};
  }
  private apiKeyHash(value:string){return createHash('sha256').update(value).digest('hex');}
  async apiKeys(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);return this.prisma.storeApiKey.findMany({where:{storeId},select:{id:true,name:true,prefix:true,scopes:true,lastUsedAt:true,expiresAt:true,revokedAt:true,createdAt:true},orderBy:{createdAt:'desc'}});}
  async createApiKey(tenantId:string,storeId:string,body:any){await this.assertStore(tenantId,storeId);const secret=`we_${randomBytes(24).toString('base64url')}`;const prefix=secret.slice(0,11);const row=await this.prisma.storeApiKey.create({data:{storeId,name:String(body?.name||'API Anahtarı'),prefix,secretHash:this.apiKeyHash(secret),scopes:Array.isArray(body?.scopes)?body.scopes.map(String):[],expiresAt:body?.expiresAt?new Date(body.expiresAt):null}});return {id:row.id,name:row.name,prefix:row.prefix,secret,scopes:row.scopes,createdAt:row.createdAt};}
  async revokeApiKey(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.storeApiKey.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException('API anahtarı bulunamadı');return this.prisma.storeApiKey.update({where:{id},data:{revokedAt:new Date()}});}

  async discounts(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.discount.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }); }
  async createDiscount(tenantId: string, storeId: string, body: any) { await this.assertStore(tenantId, storeId); if (Array.isArray(body.productIds) && body.productIds.length) { const count = await this.prisma.product.count({ where: { id: { in: body.productIds }, storeId } }); if (count !== new Set(body.productIds).size) throw new BadRequestException('One or more products do not belong to store'); } if (Array.isArray(body.categoryIds) && body.categoryIds.length) { const count = await this.prisma.category.count({ where: { id: { in: body.categoryIds }, storeId } }); if (count !== new Set(body.categoryIds).size) throw new BadRequestException('One or more categories do not belong to store'); } return this.prisma.discount.create({ data: { storeId, name: body.name, code: body.code?.toUpperCase() || null, type: body.type, scope: body.scope || 'ORDER', value: body.value || 0, minimumAmount: body.minimumAmount, maximumDiscount: body.maximumDiscount, usageLimit: body.usageLimit, perCustomerLimit: body.perCustomerLimit, startsAt: body.startsAt ? new Date(body.startsAt) : null, endsAt: body.endsAt ? new Date(body.endsAt) : null, isActive: body.isActive ?? true, products: { create: (body.productIds || []).map((productId: string) => ({ productId })) }, categories: { create: (body.categoryIds || []).map((categoryId: string) => ({ categoryId })) } } }); }
  async updateDiscount(tenantId: string, storeId: string, id: string, body: any) { await this.assertStore(tenantId, storeId); const d = await this.prisma.discount.findFirst({ where: { id, storeId } }); if (!d) throw new NotFoundException(); const allowed = ['name','code','type','scope','value','minimumAmount','maximumDiscount','usageLimit','perCustomerLimit','isActive']; return this.prisma.discount.update({ where: { id }, data: Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k))) }); }

  async shippingMethods(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.shippingMethod.findMany({ where: { storeId }, orderBy: { sortOrder: 'asc' } }); }
  async createShippingMethod(tenantId: string, storeId: string, b: any) { await this.assertStore(tenantId, storeId); return this.prisma.shippingMethod.create({ data: { storeId, name: b.name, code: b.code, type: b.type || 'shipping', description: b.description, requiresAddress: b.requiresAddress ?? true, supportsPickup: b.supportsPickup ?? false, price: b.price || 0, freeAbove: b.freeAbove, estimatedMinDays: b.estimatedMinDays, estimatedMaxDays: b.estimatedMaxDays, isActive: b.isActive ?? true, sortOrder: b.sortOrder || 0 } }); }
  async updateShippingMethod(tenantId: string, storeId: string, id: string, b: any) { await this.assertStore(tenantId, storeId); const row = await this.prisma.shippingMethod.findFirst({ where: { id, storeId } }); if (!row) throw new NotFoundException(); const allowed = ['name','code','type','description','requiresAddress','supportsPickup','price','freeAbove','estimatedMinDays','estimatedMaxDays','isActive','sortOrder']; return this.prisma.shippingMethod.update({ where: { id }, data: Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k))) }); }
  async deleteShippingMethod(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.shippingMethod.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException('Kargo yöntemi bulunamadı');await this.prisma.shippingMethod.delete({where:{id}});return{deleted:true};}

  async paymentMethods(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.paymentMethod.findMany({ where: { storeId }, orderBy: { sortOrder: 'asc' } }); }
  async createPaymentMethod(tenantId: string, storeId: string, b: any) { await this.assertStore(tenantId, storeId); return this.prisma.paymentMethod.create({ data: { storeId, name: b.name, code: b.code, type: b.type || 'manual', instructions: b.instructions, requiresOnlinePayment: !!b.requiresOnlinePayment, supportsInstallment: !!b.supportsInstallment, fee: b.fee || 0, isActive: b.isActive ?? true, sortOrder: b.sortOrder || 0, config: b.config } }); }
  async updatePaymentMethod(tenantId: string, storeId: string, id: string, b: any) { await this.assertStore(tenantId, storeId); const row = await this.prisma.paymentMethod.findFirst({ where: { id, storeId } }); if (!row) throw new NotFoundException(); const allowed = ['name','code','type','instructions','requiresOnlinePayment','supportsInstallment','fee','isActive','sortOrder','config']; return this.prisma.paymentMethod.update({ where: { id }, data: Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k))) }); }

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
    const pages=await this.prisma.page.findMany({where:{storeId},orderBy:{updatedAt:'desc'}});
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
      const page=await tx.page.create({data:{storeId,title:base.fields.title,slug:base.fields.slug,body:base.fields.body||'',imageUrl:b.imageUrl||null,status:b.status||'DRAFT',seoTitle:base.fields.seoTitle||null,seoDescription:base.fields.seoDescription||null}});
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
      await tx.page.update({where:{id},data:{title:base.fields.title,slug:base.fields.slug,body:base.fields.body||'',imageUrl:b.imageUrl===undefined?row.imageUrl:(b.imageUrl||null),status:b.status||row.status,seoTitle:base.fields.seoTitle||null,seoDescription:base.fields.seoDescription||null}});
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
  async moderateReview(tenantId: string, storeId: string, id: string, status: any) { await this.assertStore(tenantId, storeId); const r = await this.prisma.review.findFirst({ where: { id, storeId } }); if (!r) throw new NotFoundException(); return this.prisma.review.update({ where: { id }, data: { status } }); }

  async returns(tenantId: string, storeId: string) { await this.assertStore(tenantId, storeId); return this.prisma.returnRequest.findMany({ where: { storeId }, include: { order: true, customer: true, items: { include: { orderItem: true } } }, orderBy: { createdAt: 'desc' } }); }
  async updateReturn(tenantId: string, storeId: string, id: string, b: any) { await this.assertStore(tenantId, storeId); const r = await this.prisma.returnRequest.findFirst({ where: { id, storeId } }); if (!r) throw new NotFoundException(); return this.prisma.returnRequest.update({ where: { id }, data: { status: b.status, note: b.note, refundAmount: b.refundAmount } }); }

  referenceData(country?: string) {
    const currencies = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : ['TRY','USD','EUR','GBP'];
    const timezones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Europe/Istanbul','UTC'];
    return { countries: COUNTRY_CODES, currencies, timezones, locales: LOCALES, subdivisions: country ? (SUBDIVISIONS[country.toUpperCase()] || []) : [] };
  }

  async storeSettings(tenantId: string, storeId: string) {
    await this.assertStore(tenantId, storeId);
    return this.prisma.tenant.findUnique({ where: { id: storeId }, include: { addresses: { orderBy: [{ isDefault: 'desc' }, { label: 'asc' }] }, currencies: { orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] }, locales: { orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }] }, checkoutConfig: true, legalDocuments: { orderBy: { updatedAt: 'desc' } } } });
  }
  async contractSettings(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};return{mappings:settings.contractPages||{}};
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
    const store = await this.assertStore(tenantId, storeId); await this.requireFeature(tenantId, 'multiCurrency');
    const code = String(body.code || '').toUpperCase();
    if (!code || !(typeof Intl.supportedValuesOf !== 'function' || Intl.supportedValuesOf('currency').includes(code))) throw new BadRequestException('Unsupported currency');
    if (body.isDefault) {
      await this.prisma.storeCurrency.updateMany({ where: { storeId }, data: { isDefault: false } });
      await this.prisma.tenant.update({ where: { id: storeId }, data: { currency: code } });
    }
    const rate = body.isDefault ? 1 : Number(body.exchangeRate || 0);
    if (!(rate > 0)) throw new BadRequestException('Exchange rate must be greater than 0');
    return this.prisma.storeCurrency.upsert({ where: { storeId_code: { storeId, code } }, create: { storeId, code, isEnabled: body.isEnabled ?? true, isDefault: !!body.isDefault, exchangeRate: rate, rounding: Number(body.rounding ?? 2) }, update: { isEnabled: body.isEnabled ?? true, isDefault: !!body.isDefault, exchangeRate: rate, rounding: Number(body.rounding ?? 2) } });
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
    const data = { singlePage: true, allowGuestCheckout: body.allowGuestCheckout ?? true, requirePhone: body.requirePhone ?? true, requireBillingAddress: !!body.requireBillingAddress, showCouponField: body.showCouponField ?? true, stickyOrderSummary: body.stickyOrderSummary ?? true, requireTerms: body.requireTerms ?? true, requirePrivacyNotice: body.requirePrivacyNotice ?? true, requireKvkkNotice: body.requireKvkkNotice ?? false, settings: body.settings };
    return this.prisma.checkoutConfig.upsert({ where: { storeId }, create: { storeId, ...data }, update: data });
  }

  roles(tenantId: string) { return this.prisma.customRole.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }); }
  permissionCatalog() { return PERMISSIONS; }
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

  async auditLogs(tenantId: string, storeId?: string) { if (storeId) await this.assertStore(tenantId, storeId); return this.prisma.auditLog.findMany({ where: { tenantId }, include: { user: { select: { email: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 300 }); }


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
  async designSettings(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const defaults=this.defaultDesignSettings();const saved:any=settings.design||{};
    return {general:{...defaults.general,...(saved.general||{})},header:{...defaults.header,...(saved.header||{})},footer:{...defaults.footer,...(saved.footer||{})},products:{...defaults.products,...(saved.products||{})}};
  }
  async updateDesignSettings(tenantId:string,storeId:string,body:any){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const current:any=await this.designSettings(tenantId,storeId);const incoming:any=body?.design||body||{};
    const clamp=(v:any,min:number,max:number,fallback:number)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback};
    const next:any={
      general:{...current.general,...(incoming.general||{})},
      header:{...current.header,...(incoming.header||{})},
      footer:{...current.footer,...(incoming.footer||{})},
      products:{...current.products,...(incoming.products||{})}
    };
    next.general.baseFontSize=clamp(next.general.baseFontSize,12,24,16);next.general.h1Size=clamp(next.general.h1Size,24,96,52);next.general.h2Size=clamp(next.general.h2Size,20,72,34);next.general.h3Size=clamp(next.general.h3Size,16,56,24);next.general.containerWidth=clamp(next.general.containerWidth,760,1800,1180);next.general.sectionSpacing=clamp(next.general.sectionSpacing,16,160,64);next.general.borderRadius=clamp(next.general.borderRadius,0,40,8);next.general.buttonRadius=clamp(next.general.buttonRadius,0,40,6);
    next.header.template=clamp(next.header.template,1,8,1);next.footer.template=clamp(next.footer.template,1,5,1);next.products.categoryTemplate=clamp(next.products.categoryTemplate,1,8,1);next.products.productPageTemplate=clamp(next.products.productPageTemplate,1,8,1);next.products.productCardTemplate=clamp(next.products.productCardTemplate,1,4,1);
    await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,design:next}}});await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return next;
  }
  async designSections(tenantId:string,storeId:string,pageKey='home'){ await this.assertStore(tenantId,storeId); return this.prisma.siteSection.findMany({where:{storeId,pageKey},orderBy:{sortOrder:'asc'}}); }
  async saveDesignSection(tenantId:string,storeId:string,body:any){ await this.assertStore(tenantId,storeId); return this.prisma.siteSection.create({data:{storeId,pageKey:body.pageKey||'home',sectionType:String(body.sectionType||'html'),sortOrder:Number(body.sortOrder||0),enabled:body.enabled!==false,settings:body.settings||{}}}); }
  async updateDesignSection(tenantId:string,storeId:string,id:string,body:any){await this.assertStore(tenantId,storeId);const row=await this.prisma.siteSection.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException('Design section not found');const data:any={};for(const k of ['sectionType','sortOrder','enabled','settings'])if(body[k]!==undefined)data[k]=k==='sortOrder'?Number(body[k]):body[k];const out=await this.prisma.siteSection.update({where:{id},data});await this.cache.delPattern('public:site:*');return out;}
  async deleteDesignSection(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.siteSection.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException('Design section not found');await this.prisma.siteSection.delete({where:{id}});await this.cache.delPattern('public:site:*');return{deleted:true};}
  async reorderDesignSections(tenantId:string,storeId:string,body:any){await this.assertStore(tenantId,storeId);const items=Array.isArray(body?.items)?body.items:[];const ids=items.map((x:any)=>String(x.id));const count=ids.length?await this.prisma.siteSection.count({where:{storeId,id:{in:ids}}}):0;if(count!==ids.length)throw new BadRequestException('Invalid design section list');await this.prisma.$transaction(items.map((x:any,i:number)=>this.prisma.siteSection.update({where:{id:String(x.id)},data:{sortOrder:Number(x.sortOrder??i)}})));await this.cache.delPattern('public:site:*');return this.designSections(tenantId,storeId,body.pageKey||'home');}


  async domainSettings(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const cfg:any=settings.domains||{};
    const platformSuffix=String(process.env.STOREFRONT_SUBDOMAIN_SUFFIX||'').trim().replace(/^\.+|\.+$/g,'');
    const cnameTarget=String(process.env.STOREFRONT_DOMAIN_TARGET||'commerce-storefront--wedidit-64fae.europe-west4.hosted.app').trim();
    const cf=await this.prisma.integrationConnection.findFirst({where:{tenantId,provider:'cloudflare-dns'},select:{id:true,enabled:true,config:true,updatedAt:true}});
    const appHosting=store.domain?await this.appHostingStatus(store.domain,false):null;
    return {publicSlug:store.publicSlug,domain:store.domain,platformSuffix,cnameTarget,settings:cfg,appHosting,cloudflare:cf?{connected:cf.enabled,connectionId:cf.id,zoneId:(cf.config as any)?.zoneId||'',updatedAt:cf.updatedAt}:null};
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
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const mode=body?.mode==='custom'?'custom':'subdomain';
    const data:any={};let publicSlug=store.publicSlug;let domain=store.domain;
    if(mode==='subdomain'){
      publicSlug=this.slugify(body?.subdomain||store.publicSlug);if(publicSlug.length<3)throw new BadRequestException('Alt alan adı en az 3 karakter olmalı');
      const availability=await this.subdomainAvailability(tenantId,storeId,publicSlug);if(!availability.available)throw new BadRequestException(availability.reason||'Bu alt alan adı kullanılamıyor');
      data.publicSlug=publicSlug;
    }
    if(mode==='custom'){
      let raw=String(body?.domain||'').trim().toLowerCase().replace(/^https?:\/\//,'').split('/')[0].replace(/\.$/,'');
      if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(raw))throw new BadRequestException('Geçerli bir alan adı girin');
      const used=await this.prisma.tenant.findFirst({where:{domain:raw,id:{not:storeId}},select:{id:true}});if(used)throw new BadRequestException('Bu alan adı başka bir mağazaya bağlı');domain=raw;data.domain=raw;
    }
    const domains={...(settings.domains||{}),mode,forceWww:!!body?.forceWww,redirectToPrimary:body?.redirectToPrimary!==false,sslMode:'AUTO'};
    data.settings={...settings,domains};await this.prisma.tenant.update({where:{id:storeId},data});await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);
    if(mode==='custom'&&domain)await this.appHostingStatus(domain,true);
    return this.domainSettings(tenantId,storeId);
  }

  async syncCloudflareDomain(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const domain=String(store.domain||'').trim();if(!domain)throw new BadRequestException('Önce özel alan adını kaydedin');
    const appHosting:any=await this.appHostingStatus(domain,true);if(!appHosting?.available)throw new BadRequestException(appHosting?.error||'Firebase App Hosting alan adı hazırlanamadı');
    const desired=Array.isArray(appHosting.records)?appHosting.records:[];if(!desired.length){if(appHosting.connected)return{ok:true,connected:true,records:[]};throw new BadRequestException('Firebase henüz gerekli DNS kayıtlarını üretmedi. Birkaç saniye sonra tekrar deneyin.');}
    const conn:any=await this.integrations.internalProviderConnection(tenantId,'cloudflare-dns');if(!conn)throw new BadRequestException('Cloudflare bağlantısı bulunamadı. API Token ve Zone ID kaydedin.');
    const token=String(conn.credentials?.apiToken||'').trim();const zoneId=String(conn.config?.zoneId||'').trim();if(!token||!zoneId)throw new BadRequestException('Cloudflare API Token veya Zone ID eksik');
    const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};const base=`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/dns_records`;const applied:any[]=[];
    for(const rec of desired){
      const type=String(rec.type||'').toUpperCase();if(!['A','AAAA','CNAME','TXT','CAA'].includes(type))continue;
      const name=String(rec.domainName||domain).replace(/\.$/,'');const content=String(rec.rdata||'').trim().replace(/^"|"$/g,'');if(!name||!content)continue;
      const list=await fetch(`${base}?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`,{headers});const lj:any=await list.json().catch(()=>({}));if(!list.ok||lj?.success===false)throw new BadRequestException(lj?.errors?.[0]?.message||`Cloudflare DNS kayıtları okunamadı: ${name}`);
      const current=Array.isArray(lj.result)?lj.result.find((x:any)=>String(x.content||'')===content):null;
      const payload:any={type,name,content,ttl:1};if(type==='A'||type==='AAAA'||type==='CNAME')payload.proxied=false;
      const res=await fetch(current?`${base}/${current.id}`:base,{method:current?'PUT':'POST',headers,body:JSON.stringify(payload)});const out:any=await res.json().catch(()=>({}));if(!res.ok||out?.success===false)throw new BadRequestException(out?.errors?.[0]?.message||`Cloudflare DNS kaydı güncellenemedi: ${name}`);
      applied.push({type,name,content,id:out?.result?.id||current?.id||null});
    }
    const settings:any=store.settings||{};const cfg:any=settings.domains||{};const nextDomains={...cfg,lastCloudflareSyncAt:new Date().toISOString(),firebaseDnsApplied:applied.map(x=>({type:x.type,name:x.name,content:x.content}))};await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,domains:nextDomains}}});
    return {ok:true,connected:!!appHosting.connected,records:applied,manualRemovals:appHosting.manualRemovals||[]};
  }

  async warehouses(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);return this.prisma.warehouse.findMany({where:{storeId},orderBy:[{isDefault:'desc'},{priority:'asc'},{name:'asc'}]});}
  async createWarehouse(tenantId:string,storeId:string,body:any){await this.assertStore(tenantId,storeId);const name=String(body?.name||'').trim();const code=this.slugify(body?.code||name).toUpperCase().replace(/-/g,'_');if(!name||!code)throw new BadRequestException('Lokasyon adı ve kodu zorunludur');if(body?.isDefault)await this.prisma.warehouse.updateMany({where:{storeId},data:{isDefault:false}});return this.prisma.warehouse.create({data:{storeId,name,code,isDefault:!!body?.isDefault,isActive:body?.isActive!==false,priority:Number(body?.priority??100),address:body?.address||{}}});}
  async updateWarehouse(tenantId:string,storeId:string,id:string,body:any){await this.assertStore(tenantId,storeId);const row=await this.prisma.warehouse.findFirst({where:{id,storeId}});if(!row)throw new NotFoundException('Lokasyon bulunamadı');if(body?.isDefault)await this.prisma.warehouse.updateMany({where:{storeId,id:{not:id}},data:{isDefault:false}});const data:any={};for(const k of ['name','isDefault','isActive','priority','address'])if(body[k]!==undefined)data[k]=k==='priority'?Number(body[k]):body[k];if(body.code!==undefined)data.code=this.slugify(body.code).toUpperCase().replace(/-/g,'_');return this.prisma.warehouse.update({where:{id},data});}
  async deleteWarehouse(tenantId:string,storeId:string,id:string){await this.assertStore(tenantId,storeId);const row=await this.prisma.warehouse.findFirst({where:{id,storeId},include:{_count:{select:{stocks:true}}}});if(!row)throw new NotFoundException('Lokasyon bulunamadı');if(row._count.stocks>0)throw new BadRequestException('Stok hareketi bulunan lokasyon silinemez; pasif hale getirin');await this.prisma.warehouse.delete({where:{id}});return{deleted:true};}

  async regionalSettings(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};
    const [locales,currencies]=await Promise.all([this.prisma.storeLocale.findMany({where:{storeId},orderBy:[{isDefault:'desc'},{sortOrder:'asc'}]}),this.prisma.storeCurrency.findMany({where:{storeId},orderBy:[{isDefault:'desc'},{code:'asc'}]})]);
    const regional:any=settings.regional||{};
    return {defaultLocale:store.locale,defaultCurrency:store.currency,locales,currencies,currencyMeta:regional.currencyMeta||{},exchange:regional.exchange||{source:'TCMB',autoUpdate:false,intervalHours:6,lastUpdatedAt:null},tax:regional.tax||{pricesIncludeTax:true,defaultRate:20},taxRules:Array.isArray(regional.taxRules)?regional.taxRules:[]};
  }
  async updateRegionalSettings(tenantId:string,storeId:string,body:any){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const regional:any=settings.regional||{};
    const localeItems:any[]|null=Array.isArray(body.locales)?body.locales:null;const currencyItems:any[]|null=Array.isArray(body.currencies)?body.currencies:null;
    const defaultLocale=String(body.defaultLocale||store.locale);const defaultCurrency=String(body.defaultCurrency||store.currency).toUpperCase();
    await this.prisma.$transaction(async tx=>{
      if(localeItems){
        const normalized=localeItems.map((item:any,i:number)=>typeof item==='string'?{locale:String(item),label:String(item),isEnabled:true,isDefault:String(item)===defaultLocale,sortOrder:i}:{locale:String(item.locale||''),label:String(item.label||item.locale||''),isEnabled:item.isEnabled!==false,isDefault:String(item.locale||'')===defaultLocale,sortOrder:Number(item.sortOrder??i)}).filter((x:any)=>x.locale);
        if(normalized.length&&!normalized.some((x:any)=>x.locale===defaultLocale))normalized.unshift({locale:defaultLocale,label:defaultLocale,isEnabled:true,isDefault:true,sortOrder:0});
        const codes=normalized.map((x:any)=>x.locale);await tx.storeLocale.updateMany({where:{storeId,locale:{notIn:codes}},data:{isEnabled:false,isDefault:false}});
        for(const item of normalized)await tx.storeLocale.upsert({where:{storeId_locale:{storeId,locale:item.locale}},create:{storeId,...item},update:{label:item.label,isEnabled:item.isEnabled,isDefault:item.isDefault,sortOrder:item.sortOrder}});
      }
      if(currencyItems){
        const normalized=currencyItems.map((item:any)=>typeof item==='string'?{code:String(item).toUpperCase(),isEnabled:true,isDefault:String(item).toUpperCase()===defaultCurrency,exchangeRate:1,rounding:2}:{code:String(item.code||'').toUpperCase(),isEnabled:item.isEnabled!==false,isDefault:String(item.code||'').toUpperCase()===defaultCurrency,exchangeRate:Number(item.exchangeRate||1),rounding:Number(item.rounding??2)}).filter((x:any)=>x.code);
        if(normalized.length&&!normalized.some((x:any)=>x.code===defaultCurrency))normalized.unshift({code:defaultCurrency,isEnabled:true,isDefault:true,exchangeRate:1,rounding:2});
        const codes=normalized.map((x:any)=>x.code);await tx.storeCurrency.updateMany({where:{storeId,code:{notIn:codes}},data:{isEnabled:false,isDefault:false}});
        for(const item of normalized){if(item.isDefault)item.exchangeRate=1;await tx.storeCurrency.upsert({where:{storeId_code:{storeId,code:item.code}},create:{storeId,...item},update:{isEnabled:item.isEnabled,isDefault:item.isDefault,exchangeRate:item.exchangeRate,rounding:item.rounding}});}
      }
      const nextRegional:any={...regional};if(body.currencyMeta!==undefined)nextRegional.currencyMeta=body.currencyMeta||{};if(body.exchange!==undefined)nextRegional.exchange={...(regional.exchange||{}),...(body.exchange||{})};if(body.tax!==undefined)nextRegional.tax={...(regional.tax||{}),...(body.tax||{})};if(body.taxRules!==undefined)nextRegional.taxRules=Array.isArray(body.taxRules)?body.taxRules:[];
      const tenantData:any={settings:{...settings,regional:nextRegional}};if(body.defaultLocale!==undefined)tenantData.locale=defaultLocale;if(body.defaultCurrency!==undefined)tenantData.currency=defaultCurrency;await tx.tenant.update({where:{id:storeId},data:tenantData});
    });await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return this.regionalSettings(tenantId,storeId);
  }
  async refreshCurrencyRates(tenantId:string,storeId:string,body:any){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const regional:any=settings.regional||{};const source=String(body?.source||regional.exchange?.source||'TCMB').toUpperCase();const rows=await this.prisma.storeCurrency.findMany({where:{storeId,isEnabled:true}});const base=String(store.currency||'TRY').toUpperCase();const targets=rows.map(x=>x.code).filter(x=>x!==base);const rates:Record<string,number>={[base]:1};
    try{
      if(targets.length&&source==='FRANKFURTER'){
        const res=await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(targets.join(','))}`);const json:any=await res.json();if(!res.ok||!json?.rates)throw new Error('Kur servisi yanıt vermedi');for(const code of targets)if(Number(json.rates[code])>0)rates[code]=Number(json.rates[code]);
      }else if(targets.length&&source==='YAHOO'){
        for(const code of targets){const res=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(base+code+'=X')}?interval=1d&range=1d`);const json:any=await res.json();const price=Number(json?.chart?.result?.[0]?.meta?.regularMarketPrice||0);if(price>0)rates[code]=price;}
      }else if(targets.length){
        const res=await fetch('https://www.tcmb.gov.tr/kurlar/today.xml');const xml=await res.text();if(!res.ok||!xml.includes('<Tarih_Date'))throw new Error('TCMB yanıt vermedi');const tryPer:Record<string,number>={TRY:1};const re=/<Currency[^>]*CurrencyCode="([A-Z]{3})"[^>]*>([\s\S]*?)<\/Currency>/g;let m:RegExpExecArray|null;while((m=re.exec(xml))){const unit=Number((m[2].match(/<Unit>([^<]+)<\/Unit>/)||[])[1]||1);const sell=Number((m[2].match(/<ForexSelling>([^<]+)<\/ForexSelling>/)||[])[1]||0);const buy=Number((m[2].match(/<ForexBuying>([^<]+)<\/ForexBuying>/)||[])[1]||0);const value=sell||buy;if(value>0)tryPer[m[1]]=value/Math.max(unit,1);}const baseTry=tryPer[base];if(!baseTry)throw new Error('Varsayılan para birimi TCMB tablosunda bulunamadı');for(const code of targets)if(tryPer[code])rates[code]=baseTry/tryPer[code];
      }
    }catch(e:any){throw new BadRequestException(`Döviz kurları güncellenemedi: ${e?.message||'servis hatası'}`)}
    for(const row of rows){const rate=row.code===base?1:Number(rates[row.code]||0);if(rate>0)await this.prisma.storeCurrency.update({where:{id:row.id},data:{exchangeRate:rate}});}
    const nextRegional={...regional,exchange:{...(regional.exchange||{}),source,lastUpdatedAt:new Date().toISOString()}};await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,regional:nextRegional}}});await this.cache.delPattern('public:site:*');return this.regionalSettings(tenantId,storeId);
  }

  async cacheSettings(tenantId:string,storeId:string){ await this.assertStore(tenantId,storeId); return this.prisma.cacheConfig.upsert({where:{storeId},create:{storeId},update:{}}); }
  async updateCacheSettings(tenantId:string,storeId:string,body:any){ await this.assertStore(tenantId,storeId); const allowed=['enabled','appTtlSeconds','storefrontTtlSeconds','seoTtlSeconds','menuTtlSeconds','warmHome','warmCategories','settings']; const data:any={}; for(const k of allowed) if(body[k]!==undefined)data[k]=body[k]; return this.prisma.cacheConfig.upsert({where:{storeId},create:{storeId,...data},update:data}); }

  async purgeCache(tenantId:string){ await this.cache.purgeTenant(tenantId); await this.cache.delPattern('public:site:*'); return {ok:true}; }
  async cacheStats(tenantId:string){ const stats=await this.cache.stats(); return {tenantId,...stats}; }

  async themeCatalog(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);
    const sub=await this.prisma.subscription.findFirst({where:{tenantId,status:{in:['ACTIVE','TRIAL']}},orderBy:{createdAt:'desc'},select:{planId:true}});
    const themes=await this.prisma.themeDefinition.findMany({where:{isActive:true},include:{planPrices:sub?.planId?{where:{planId:sub.planId,isActive:true}}:false,installations:{where:{tenantId},take:1}},orderBy:[{sortOrder:'asc'},{name:'asc'}]});
    return themes.filter((theme:any)=>{const cfg:any=theme.config||{};return cfg.visibility!=='PRIVATE'||!!theme.installations?.[0]||store.activeTheme===theme.slug}).map((theme:any)=>{const pp=Array.isArray(theme.planPrices)?theme.planPrices[0]:null;const owned=!!theme.installations?.[0];const included=!!pp?.included;const price=included?0:Number(pp?.price??theme.basePrice??0);return {id:theme.id,slug:theme.slug,name:theme.name,description:theme.description,category:theme.category,previewImageUrl:theme.previewImageUrl,version:theme.version,isFeatured:theme.isFeatured,isDefault:theme.isDefault,current:store.activeTheme===theme.slug,owned:owned||included,included,price,currency:pp?.currency||theme.currency,billingType:theme.billingType,config:theme.config};});
  }
  private async captureThemeDesignHistory(tenantId:string,storeId:string,reason='MANUAL_SAVE',label?:string){
    const store=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};
    const sections=await this.prisma.siteSection.findMany({where:{storeId},orderBy:[{pageKey:'asc'},{sortOrder:'asc'}]});
    const snapshot={activeTheme:store.activeTheme,design:settings.design||await this.designSettings(tenantId,storeId),sections:sections.map((x:any)=>({pageKey:x.pageKey,sectionType:x.sectionType,sortOrder:x.sortOrder,enabled:x.enabled,settings:x.settings}))};
    const row=await this.prisma.themeDesignHistory.create({data:{tenantId:storeId,themeSlug:store.activeTheme,reason,label:label||null,snapshot:snapshot as any}});
    const old=await this.prisma.themeDesignHistory.findMany({where:{tenantId:storeId},orderBy:{createdAt:'desc'},skip:30,select:{id:true}});if(old.length)await this.prisma.themeDesignHistory.deleteMany({where:{id:{in:old.map((x:any)=>x.id)}}});
    return row;
  }
  async createDesignHistory(tenantId:string,storeId:string,body:any){return this.captureThemeDesignHistory(tenantId,storeId,String(body?.reason||'MANUAL_SAVE'),String(body?.label||'Tasarım kaydı'));}
  async designHistory(tenantId:string,storeId:string){await this.assertStore(tenantId,storeId);return this.prisma.themeDesignHistory.findMany({where:{tenantId:storeId},orderBy:{createdAt:'desc'},take:30,select:{id:true,themeSlug:true,reason:true,label:true,createdAt:true}});}
  async restoreDesignHistory(tenantId:string,storeId:string,id:string){
    const store=await this.assertStore(tenantId,storeId);const row=await this.prisma.themeDesignHistory.findFirst({where:{id,tenantId:storeId}});if(!row)throw new NotFoundException('Tasarım geçmişi bulunamadı');
    await this.captureThemeDesignHistory(tenantId,storeId,'BEFORE_RESTORE','Geri yükleme öncesi otomatik yedek');
    const snap:any=row.snapshot||{};const root:any=store.settings||{};const sections=Array.isArray(snap.sections)?snap.sections:[];
    await this.prisma.$transaction(async tx=>{await tx.tenant.update({where:{id:storeId},data:{activeTheme:String(snap.activeTheme||row.themeSlug||store.activeTheme),settings:{...root,design:snap.design||root.design||{}}}});await tx.siteSection.deleteMany({where:{storeId}});if(sections.length)await tx.siteSection.createMany({data:sections.map((x:any,i:number)=>({storeId,pageKey:String(x.pageKey||'home'),sectionType:String(x.sectionType||'rich_text'),sortOrder:Number(x.sortOrder??i),enabled:x.enabled!==false,settings:x.settings||{}}))});});
    await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return {ok:true,activeTheme:String(snap.activeTheme||row.themeSlug||store.activeTheme)};
  }
  async activateTheme(tenantId:string,storeId:string,themeId:string,options:any={}){
    const store=await this.assertStore(tenantId,storeId);const theme=await this.prisma.themeDefinition.findFirst({where:{id:themeId,isActive:true}});if(!theme)throw new NotFoundException('Tema bulunamadı');
    const catalog=await this.themeCatalog(tenantId,storeId);const item:any=catalog.find((x:any)=>x.id===themeId);if(!item)throw new NotFoundException('Tema bulunamadı');if(!item.owned&&Number(item.price)>0)throw new BadRequestException('Bu temayı kullanmak için önce satın almalısınız.');
    await this.captureThemeDesignHistory(tenantId,storeId,'THEME_CHANGE',`${store.activeTheme} → ${theme.slug}`);
    const cfg:any=theme.config||{};const preset:any[]=Array.isArray(cfg.homePreset)?cfg.homePreset:[];const themeDesign:any=cfg.design||{};const root:any=store.settings||{};const currentDesign:any=await this.designSettings(tenantId,storeId);const nextDesign={general:{...currentDesign.general,...(themeDesign.general||{})},header:{...currentDesign.header,...(themeDesign.header||{})},footer:{...currentDesign.footer,...(themeDesign.footer||{})},products:{...currentDesign.products,...(themeDesign.products||{})}};
    const loadThemeModules=options?.loadThemeModules===true;
    const currentSections=await this.prisma.siteSection.findMany({where:{storeId,pageKey:'home'},orderBy:{sortOrder:'asc'}});
    const contentKeys=['title','subtitle','content','imageUrl','imageUrlMobile','linkUrl','buttonText','items','handle','videoUrl','endsAt','html','collectionId','productId','categoryId','brandId'];
    await this.prisma.$transaction(async tx=>{
      await tx.themeInstallation.upsert({where:{tenantId_themeId:{tenantId,themeId}},create:{tenantId,themeId,status:'ACTIVE',source:item.included?'PLAN':'FREE',purchasedPrice:0,currency:item.currency,activatedAt:new Date()},update:{status:'ACTIVE',activatedAt:new Date()}});
      await tx.tenant.update({where:{id:store.id},data:{activeTheme:theme.slug,settings:{...root,design:nextDesign}}});
      if(loadThemeModules){
        await tx.siteSection.deleteMany({where:{storeId,pageKey:'home'}});
        if(preset.length)await tx.siteSection.createMany({data:preset.map((x:any,i:number)=>({storeId,pageKey:'home',sectionType:String(x.sectionType||'rich_text'),sortOrder:i,enabled:x.enabled!==false,settings:x.settings||{}}))});
      }else if(currentSections.length&&preset.length){
        const used=new Set<string>();let order=0;
        for(const p of preset){const match=currentSections.find((x:any)=>!used.has(x.id)&&String(x.sectionType)===String(p.sectionType));if(!match)continue;used.add(match.id);const keep:any={};for(const key of contentKeys)if((match.settings as any)?.[key]!==undefined)keep[key]=(match.settings as any)[key];await tx.siteSection.update({where:{id:match.id},data:{sortOrder:order++,settings:{...(p.settings||{}),...keep}}});}
        for(const x of currentSections)if(!used.has(x.id))await tx.siteSection.update({where:{id:x.id},data:{sortOrder:order++}});
      }
    });
    await this.cache.delPattern('public:site:*');await this.cache.purgeTenant(tenantId);return {activeTheme:theme.slug,loadThemeModules,design:nextDesign,sections:await this.designSections(tenantId,storeId,'home')};
  }

}
