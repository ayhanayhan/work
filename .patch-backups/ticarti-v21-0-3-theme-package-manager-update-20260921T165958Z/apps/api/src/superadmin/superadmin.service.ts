import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  users(q?: string) {
    return this.prisma.user.findMany({ where: { memberships: { some: {} }, ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}) }, select: { id: true, email: true, name: true, createdAt: true, memberships: { include: { tenant: { select: { id: true, name: true } } } } }, orderBy: { createdAt: 'desc' } });
  }

  apps(){
    return this.prisma.appDefinition.findMany({include:{planPrices:{include:{plan:true},orderBy:{createdAt:'asc'}},_count:{select:{installs:true}}},orderBy:[{sortOrder:'asc'},{name:'asc'}]});
  }

  private appMarketplaceMeta(body:any){
    const screenshots=Array.isArray(body.screenshots)?body.screenshots.map((x:any)=>String(x).trim()).filter(Boolean):String(body.screenshots||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    return {logoUrl:String(body.logoUrl||'').trim()||null,usageGuide:String(body.usageGuide||'').trim()||null,screenshots};
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
    if(['logoUrl','usageGuide','screenshots'].some(k=>body[k]!==undefined)){
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

  async toggleThemeModule(themeId:string,body:any){
    const theme=await this.prisma.themeDefinition.findUnique({where:{id:themeId}});if(!theme)throw new NotFoundException('Tema bulunamadı');
    const config:any=theme.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};const modules=Array.isArray(config.modules)?config.modules:[];const type=String(body.type||'').trim();if(!type)throw new BadRequestException('Modül tipi gerekli');
    let found=false;const next=modules.map((m:any)=>{if(String(m.type)===type){found=true;return{...m,enabled:body.enabled!==false}}return m});if(!found)next.push({type,label:String(body.label||type),enabled:body.enabled!==false});
    return this.prisma.themeDefinition.update({where:{id:themeId},data:{config:{...config,modules:next}}});
  }

}
