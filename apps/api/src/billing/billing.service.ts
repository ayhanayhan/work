import {BadRequestException,Injectable,NotFoundException,UnauthorizedException} from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {randomUUID} from 'crypto';
import {AppsService} from '../apps/apps.service';
import {apiError} from '../i18n/api-error';
import {apiText} from '../i18n/api-i18n';
import {PrismaService} from '../prisma/prisma.service';
import type {BillingBuyerDto,IyzicoWebhookDto,PlatformCheckoutDto,PlanCheckoutDto,ThemeCheckoutDto} from './billing.dto';
import {isVerifiedIyzicoPayment} from './iyzico-verification';
import {verifyIyzicoWebhookV3} from './iyzico-webhook';

type IyzicoResult={
  status?:string; paymentStatus?:string; conversationId?:string;
  paidPrice?:string|number; price?:string|number; currency?:string; basketId?:string;
  paymentId?:string; token?:string; checkoutFormContent?:string; errorMessage?:string;
  [key:string]:unknown;
};
type IyzicoCreateMethod={create:(request:unknown,callback:(error:unknown,result:IyzicoResult)=>void)=>void};
type IyzicoRetrieveMethod={retrieve:(request:unknown,callback:(error:unknown,result:IyzicoResult)=>void)=>void};
type IyzicoClient={checkoutFormInitialize:IyzicoCreateMethod;checkoutForm:IyzicoRetrieveMethod};
type IyzicoModule={
  new(config:{apiKey:string;secretKey:string;uri:string}):IyzicoClient;
  LOCALE:{TR:string}; CURRENCY?:Record<string,string>; PAYMENT_GROUP?:Record<string,string>;
  BASKET_ITEM_TYPE:{VIRTUAL:string};
};
const Iyzipay=require('iyzipay') as IyzicoModule;

type PurchaseKind='PLAN'|'THEME'|'APP'|'AI_CREDIT'|'EMAIL_CREDIT';
type ResolvedBuyer={
  name:string;surname:string;phone:string;address:string;city:string;zipCode:string;country:string;
  identityNumber:string;companyName:string;taxOffice:string;email:string;userId:string;registrationDate:string;
};
type ResolvedProduct={kind:PurchaseKind;targetId:string;sku:string;name:string;unitPrice:number;currency:string;metadata?:Record<string,unknown>};
type CouponResult={code:string|null;discount:number;total:number};
type PurchaseTable='PLATFORM'|'PLAN'|'THEME';

@Injectable()
export class BillingService{
  constructor(private readonly prisma:PrismaService,private readonly apps:AppsService){}

  private client(){
    const apiKey=String(process.env.IYZICO_API_KEY||'').trim();
    const secretKey=String(process.env.IYZICO_SECRET_KEY||'').trim();
    if(!apiKey||!secretKey)throw new BadRequestException(apiError('billing.iyzico.notConfigured'));
    return new Iyzipay({apiKey,secretKey,uri:String(process.env.IYZICO_URI||'https://api.iyzipay.com')});
  }
  private callCreate(method:IyzicoCreateMethod,request:unknown){
    return new Promise<IyzicoResult>((resolve,reject)=>method.create(request,(err,result)=>err?reject(err):resolve(result)));
  }
  private callRetrieve(method:IyzicoRetrieveMethod,request:unknown){
    return new Promise<IyzicoResult>((resolve,reject)=>method.retrieve(request,(err,result)=>err?reject(err):resolve(result)));
  }
  private callbackBase(){return String(process.env.PUBLIC_API_URL||'https://dev.ticarti.com').replace(/\/$/,'')}
  private money(value:unknown){const n=Number(value||0);return Math.round((Number.isFinite(n)?n:0)*100)/100}
  private prismaJson(value:unknown):Prisma.InputJsonValue{return JSON.parse(JSON.stringify(value??{})) as Prisma.InputJsonValue}
  private currency(code:string){
    const normalized=String(code||'TRY').toUpperCase();
    const allowed=new Set(['TRY','USD','EUR','GBP']);
    if(!allowed.has(normalized))throw new BadRequestException(`Iyzico için desteklenmeyen para birimi: ${normalized}`);
    return Iyzipay.CURRENCY?.[normalized]||normalized;
  }
  private merchantAdminUrl(){
    const raw=String(process.env.MERCHANT_ADMIN_URL||'https://app.ticarti.com').replace(/\/$/,'');
    let url:URL;try{url=new URL(raw)}catch{throw new BadRequestException('MERCHANT_ADMIN_URL geçersiz')}
    if(url.protocol!=='https:'||(process.env.NODE_ENV==='production'&&url.hostname.endsWith('.hosted.app')))throw new BadRequestException('MERCHANT_ADMIN_URL güvenli bir HTTPS adresi olmalı');
    return raw;
  }

  private async buyer(tenantId:string,userId:string,input?:BillingBuyerDto){
    const [tenant,user]=await Promise.all([
      this.prisma.tenant.findUnique({where:{id:tenantId}}),
      this.prisma.user.findUnique({where:{id:userId}}),
    ]);
    if(!tenant||!user)throw new NotFoundException(apiError('billing.plan.notFound'));
    const identityNumber=String(input?.identityNumber||tenant.taxNumber||'').replace(/\D/g,'');
    if(![10,11].includes(identityNumber.length))throw new BadRequestException(apiError('billing.identity.invalid'));
    const full=String(input?.name||user.name||tenant.companyName||tenant.name||apiText('billing.customer.default')).trim().split(/\s+/);
    const name=full.shift()||apiText('billing.customer.default');
    const surname=full.join(' ')||'-';
    const phone=String(input?.phone||tenant.phone||'').trim();
    const address=String(input?.address||tenant.addressText||'').trim();
    if(!phone||!address)throw new BadRequestException(apiError('billing.contact.required'));
    const resolved:ResolvedBuyer={
      userId:user.id,email:user.email,name,surname,phone,address,
      city:String(input?.city||'Istanbul').trim(),zipCode:String(input?.zipCode||'34000').trim(),
      country:String(input?.country||'Turkey').trim(),identityNumber,
      companyName:String(input?.companyName||tenant.companyName||tenant.name||'').trim(),
      taxOffice:String(input?.taxOffice||tenant.taxOffice||'').trim(),
      registrationDate:user.createdAt.toISOString().slice(0,19).replace('T',' '),
    };
    return{tenant,buyer:resolved};
  }
  private iyzicoBuyer(b:ResolvedBuyer,ip:string){
    return{id:b.userId,name:b.name,surname:b.surname,gsmNumber:b.phone,email:b.email,identityNumber:b.identityNumber,
      lastLoginDate:new Date().toISOString().slice(0,19).replace('T',' '),registrationDate:b.registrationDate,
      registrationAddress:b.address,ip:ip||'127.0.0.1',city:b.city,country:b.country,zipCode:b.zipCode};
  }
  private iyzicoAddress(b:ResolvedBuyer){return{contactName:`${b.name} ${b.surname}`,city:b.city,country:b.country,address:b.address,zipCode:b.zipCode}}

  private async coupon(tenantId:string,kind:PurchaseKind,targetId:string,subtotal:number,rawCode?:string):Promise<CouponResult>{
    const code=String(rawCode||'').trim().toUpperCase();
    if(!code)return{code:null,discount:0,total:subtotal};
    const now=new Date();
    const row=await this.prisma.billingCoupon.findFirst({where:{
      code,isActive:true,
      OR:[{startsAt:null},{startsAt:{lte:now}}],
      AND:[{OR:[{endsAt:null},{endsAt:{gte:now}}]}],
    }});
    if(!row)throw new BadRequestException('İndirim kodu geçersiz veya süresi dolmuş');
    if(row.appliesTo.length&&!row.appliesTo.includes('ALL')&&!row.appliesTo.includes(kind)&&!row.appliesTo.includes(`${kind}:${targetId}`))throw new BadRequestException('İndirim kodu bu ürün için geçerli değil');
    if(row.usageLimit!==null&&row.usageCount>=row.usageLimit)throw new BadRequestException('İndirim kodu kullanım limitine ulaştı');
    if(row.minAmount!==null&&subtotal<Number(row.minAmount))throw new BadRequestException(`İndirim kodu için minimum sepet tutarı ${Number(row.minAmount).toLocaleString('tr-TR')} TL`);
    if(row.perTenantLimit!==null){
      const counts=await Promise.all([
        this.prisma.platformPurchase.count({where:{tenantId,couponCode:code,status:'PAID'}}),
        this.prisma.planPayment.count({where:{tenantId,couponCode:code,status:'PAID'}}),
        this.prisma.themePayment.count({where:{tenantId,couponCode:code,status:'PAID'}}),
      ]);
      if(counts.reduce((sum,n)=>sum+n,0)>=row.perTenantLimit)throw new BadRequestException('Bu indirim kodunu kullanım limitinize ulaştınız');
    }
    let discount=row.type==='FIXED'?Number(row.value):subtotal*Math.max(0,Math.min(100,Number(row.value)))/100;
    if(row.maxDiscount!==null)discount=Math.min(discount,Number(row.maxDiscount));
    discount=this.money(Math.min(subtotal,Math.max(0,discount)));
    return{code,discount,total:this.money(subtotal-discount)};
  }

  private async consumeCoupon(tx:Prisma.TransactionClient,tenantId:string,code:string|null,table:PurchaseTable,currentId:string){
    if(!code)return;
    const existing=await tx.billingCoupon.findUnique({where:{code}});
    if(!existing)throw new BadRequestException('İndirim kodu artık geçerli değil');
    await tx.$queryRaw`SELECT id FROM "BillingCoupon" WHERE id=${existing.id} FOR UPDATE`;
    const row=await tx.billingCoupon.findUnique({where:{id:existing.id}});
    const now=new Date();
    if(!row||!row.isActive||(row.startsAt&&row.startsAt>now)||(row.endsAt&&row.endsAt<now))throw new BadRequestException('İndirim kodu artık geçerli değil');
    if(row.usageLimit!==null&&row.usageCount>=row.usageLimit)throw new BadRequestException('İndirim kodu kullanım limitine ulaştı');
    if(row.perTenantLimit!==null){
      const [platform,plans,themes]=await Promise.all([
        tx.platformPurchase.count({where:{tenantId,couponCode:code,status:'PAID',...(table==='PLATFORM'?{id:{not:currentId}}:{})}}),
        tx.planPayment.count({where:{tenantId,couponCode:code,status:'PAID',...(table==='PLAN'?{id:{not:currentId}}:{})}}),
        tx.themePayment.count({where:{tenantId,couponCode:code,status:'PAID',...(table==='THEME'?{id:{not:currentId}}:{})}}),
      ]);
      if(platform+plans+themes>=row.perTenantLimit)throw new BadRequestException('Bu indirim kodunu kullanım limitinize ulaştınız');
    }
    await tx.billingCoupon.update({where:{id:row.id},data:{usageCount:{increment:1}}});
  }

  private async claimProviderReceipt(tx:Prisma.TransactionClient,input:{paymentId:string;purchaseType:PurchaseTable;purchaseId:string;tenantId:string;amount:number;currency:string}){
    try{
      await tx.providerPaymentReceipt.create({data:{provider:'IYZICO',paymentId:input.paymentId,purchaseType:input.purchaseType,purchaseId:input.purchaseId,tenantId:input.tenantId,amount:input.amount,currency:input.currency}});
    }catch(error:unknown){
      const code=typeof error==='object'&&error!==null&&'code' in error?String((error as {code?:unknown}).code||''):'';
      if(code==='P2002')throw new BadRequestException('Bu provider ödemesi daha önce işlendi');
      throw error;
    }
  }

  private providerSuccess(result:IyzicoResult,input:{conversationId:string;amount:unknown;currency:string;basketId:string}){
    return isVerifiedIyzicoPayment(result,input);
  }

  private async resolveProduct(tenantId:string,input:PlatformCheckoutDto):Promise<ResolvedProduct>{
    if(input.kind==='AI_CREDIT'){
      const row=await this.prisma.aiCreditPackage.findFirst({where:{OR:[{id:input.targetId},{code:input.targetId}],isActive:true}});
      const virtual:Record<string,{credits:number;price:number;currency:string;name:string}>={
        AI_1000:{credits:1000,price:499,currency:'TRY',name:'1.000 AI Kredi'},
        AI_5000:{credits:5000,price:1990,currency:'TRY',name:'5.000 AI Kredi'},
        AI_15000:{credits:15000,price:4990,currency:'TRY',name:'15.000 AI Kredi'},
      };
      const fallback=virtual[input.targetId];
      if(!row&&!fallback)throw new NotFoundException('AI kredi paketi bulunamadı');
      return{kind:'AI_CREDIT',targetId:row?.id||input.targetId,sku:row?.code||input.targetId,name:row?.name||fallback?.name||input.targetId,
        unitPrice:Number(row?.price??fallback?.price??0),currency:row?.currency||fallback?.currency||'TRY',metadata:{credits:Number(row?.credits??fallback?.credits??0)}};
    }
    if(input.kind==='EMAIL_CREDIT'){
      const row=await this.prisma.emailCreditPackage.findFirst({where:{OR:[{id:input.targetId},{code:input.targetId}],isActive:true}});
      if(!row)throw new NotFoundException('E-posta kredi paketi bulunamadı');
      return{kind:'EMAIL_CREDIT',targetId:row.id,sku:row.code,name:row.name,unitPrice:Number(row.price),currency:row.currency,metadata:{credits:row.credits}};
    }
    const app=await this.prisma.appDefinition.findFirst({where:{OR:[{id:input.targetId},{slug:input.targetId}],isActive:true}});
    if(!app)throw new NotFoundException('Uygulama bulunamadı');
    const sub=await this.prisma.subscription.findFirst({where:{tenantId,status:{in:['ACTIVE','TRIAL']}},orderBy:{createdAt:'desc'},select:{planId:true}});
    const price=sub?.planId?await this.prisma.appPlanPrice.findFirst({where:{appId:app.id,planId:sub.planId,isActive:true}}):null;
    if(price?.included)return{kind:'APP',targetId:app.id,sku:app.slug,name:app.name,unitPrice:0,currency:price.currency||app.currency,metadata:{included:true}};
    return{kind:'APP',targetId:app.id,sku:app.slug,name:app.name,unitPrice:Number(price?.price??app.basePrice??0),currency:String(price?.currency||app.currency||'TRY'),metadata:{billingType:price?.billingType||app.billingType}};
  }

  private async fulfillPlatformPurchase(id:string){
    const claimed=await this.prisma.platformPurchase.updateMany({where:{id,status:'PAID',fulfillmentStatus:'PENDING'},data:{fulfillmentStatus:'PROCESSING'}});
    if(!claimed.count)return;
    try{
      const row=await this.prisma.platformPurchase.findUnique({where:{id}});
      if(!row)throw new NotFoundException('Satın alma kaydı bulunamadı');
      const meta=(row.metadata&&typeof row.metadata==='object'&&!Array.isArray(row.metadata)?row.metadata:{}) as Record<string,unknown>;
      if(row.kind==='AI_CREDIT'){
        const credits=Math.max(0,Number(meta.credits||0))*row.quantity;
        if(credits>0)await this.prisma.control().$transaction(async tx=>{
          const wallet=await tx.aiCreditWallet.upsert({where:{tenantId:row.tenantId},create:{tenantId:row.tenantId,balance:0,lifetimePurchased:0,lifetimeUsed:0},update:{}});
          if(await tx.aiCreditLedger.findFirst({where:{walletId:wallet.id,referenceId:row.id,type:'PURCHASE'}}))return;
          const fresh=await tx.aiCreditWallet.update({where:{id:wallet.id},data:{balance:{increment:credits},lifetimePurchased:{increment:credits}}});
          await tx.aiCreditLedger.create({data:{walletId:wallet.id,amount:credits,type:'PURCHASE',source:row.provider,referenceId:row.id,description:row.description,balanceAfter:fresh.balance}});
        });
      }else if(row.kind==='EMAIL_CREDIT'){
        const credits=Math.max(0,Number(meta.credits||0))*row.quantity;
        if(credits>0)await this.prisma.control().$transaction(async tx=>{
          const wallet=await tx.emailCreditWallet.upsert({where:{tenantId:row.tenantId},create:{tenantId:row.tenantId,balance:0,lifetimePurchased:0,lifetimeUsed:0},update:{}});
          if(await tx.emailCreditLedger.findFirst({where:{walletId:wallet.id,referenceId:row.id,type:'PURCHASE'}}))return;
          const fresh=await tx.emailCreditWallet.update({where:{id:wallet.id},data:{balance:{increment:credits},lifetimePurchased:{increment:credits}}});
          await tx.emailCreditLedger.create({data:{walletId:wallet.id,amount:credits,type:'PURCHASE',source:row.provider,referenceId:row.id,description:row.description,balanceAfter:fresh.balance}});
        });
      }else if(row.kind==='APP'){
        await this.apps.completePaidInstall(row.tenantId,row.targetId,Number(row.unitPrice),row.currency);
      }
      await this.prisma.platformPurchase.update({where:{id},data:{fulfillmentStatus:'DONE',fulfilledAt:new Date()}});
    }catch(error){
      await this.prisma.platformPurchase.updateMany({where:{id,fulfillmentStatus:'PROCESSING'},data:{fulfillmentStatus:'PENDING'}}).catch(()=>undefined);
      throw error;
    }
  }

  async accountSummary(tenantId:string){
    const now=new Date();const monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
    const [tenant,subscription,payments,invoices,productCount,orderCount,staffCount]=await Promise.all([
      this.prisma.tenant.findUnique({where:{id:tenantId},select:{id:true,name:true,companyName:true,email:true,phone:true,taxNumber:true,taxOffice:true,addressText:true,status:true,trialEndsAt:true,createdAt:true}}),
      this.prisma.subscription.findFirst({where:{tenantId,status:{in:['ACTIVE','TRIAL']}},include:{plan:true},orderBy:{createdAt:'desc'}}),
      this.prisma.planPayment.findMany({where:{tenantId},include:{plan:{select:{name:true,code:true}}},orderBy:{createdAt:'desc'},take:50}),
      this.prisma.billingInvoice.findMany({where:{tenantId},orderBy:{issuedAt:'desc'},take:50}),
      this.prisma.product.count({where:{storeId:tenantId}}),
      this.prisma.order.count({where:{storeId:tenantId,createdAt:{gte:monthStart}}}),
      this.prisma.membership.count({where:{tenantId}}),
    ]);
    if(!tenant)throw new NotFoundException('Mağaza bulunamadı');
    const plan=subscription?.plan||null;
    const usage={products:{used:productCount,limit:plan?.maxProducts??null},staff:{used:staffCount,limit:plan?.maxStaff??null},ordersThisMonth:{used:orderCount,limit:plan?.maxOrdersPerMonth??null}};
    const history=payments.map(p=>({id:p.id,planName:p.plan.name,planCode:p.plan.code,billing:p.billing,amount:Number(p.amount),subtotal:p.subtotal==null?null:Number(p.subtotal),discountTotal:Number(p.discountTotal||0),currency:p.currency,status:p.status,provider:p.provider,providerPaymentId:p.providerPaymentId||null,couponCode:p.couponCode||null,paidAt:p.paidAt,createdAt:p.createdAt}));
    return{tenant:{name:tenant.name,companyName:tenant.companyName,email:tenant.email,phone:tenant.phone,taxNumber:tenant.taxNumber,taxOffice:tenant.taxOffice,address:tenant.addressText,status:tenant.status,trialEndsAt:tenant.trialEndsAt,createdAt:tenant.createdAt},subscription:subscription?{id:subscription.id,status:subscription.status,startsAt:subscription.startsAt,trialEndsAt:subscription.trialEndsAt,currentPeriodStart:subscription.currentPeriodStart,currentPeriodEnd:subscription.currentPeriodEnd,cancelAtPeriodEnd:subscription.cancelAtPeriodEnd,plan:plan?{id:plan.id,name:plan.name,code:plan.code,description:plan.description,monthlyPrice:Number(plan.monthlyPrice),yearlyPrice:plan.yearlyPrice==null?null:Number(plan.yearlyPrice),currency:plan.currency,trialDays:plan.trialDays,maxStaff:plan.maxStaff,maxProducts:plan.maxProducts,maxOrdersPerMonth:plan.maxOrdersPerMonth,features:plan.features}:null}:null,usage,paymentHistory:history,invoices:invoices.map(i=>({id:i.id,invoiceNumber:i.invoiceNumber,total:Number(i.total),currency:i.currency,status:i.status,providerPaymentId:i.providerPaymentId,issuedAt:i.issuedAt,paidAt:i.paidAt}))};
  }

  async setCancelAtPeriodEnd(tenantId:string,cancel:boolean){
    const subscription=await this.prisma.subscription.findFirst({where:{tenantId,status:{in:['ACTIVE','TRIAL']}},orderBy:{createdAt:'desc'}});
    if(!subscription)throw new NotFoundException('Aktif abonelik bulunamadı');
    return this.prisma.subscription.update({where:{id:subscription.id},data:{cancelAtPeriodEnd:cancel}});
  }

  async catalog(tenantId:string){
    const [tenant,aiPackages,emailPackages,aiWallet,emailWallet,recentPurchases]=await Promise.all([
      this.prisma.tenant.findUnique({where:{id:tenantId},select:{id:true,name:true,companyName:true,taxNumber:true,taxOffice:true,phone:true,addressText:true}}),
      this.prisma.aiCreditPackage.findMany({where:{isActive:true},orderBy:{sortOrder:'asc'}}),
      this.prisma.emailCreditPackage.findMany({where:{isActive:true},orderBy:{sortOrder:'asc'}}),
      this.prisma.aiCreditWallet.findUnique({where:{tenantId}}),
      this.prisma.emailCreditWallet.findUnique({where:{tenantId}}),
      this.prisma.platformPurchase.findMany({where:{tenantId},orderBy:{createdAt:'desc'},take:30,select:{id:true,kind:true,sku:true,description:true,quantity:true,amount:true,currency:true,status:true,fulfillmentStatus:true,couponCode:true,paidAt:true,createdAt:true}}),
    ]);
    if(!tenant)throw new NotFoundException('Mağaza bulunamadı');
    return{profile:{companyName:tenant.companyName||tenant.name,taxNumber:tenant.taxNumber||'',taxOffice:tenant.taxOffice||'',phone:tenant.phone||'',address:tenant.addressText||''},
      aiPackages,emailPackages,aiWallet:aiWallet||{balance:0,lifetimePurchased:0,lifetimeUsed:0},emailWallet:emailWallet||{balance:0,lifetimePurchased:0,lifetimeUsed:0},recentPurchases};
  }

  async previewPlatformPurchase(tenantId:string,input:PlatformCheckoutDto){
    const product=await this.resolveProduct(tenantId,input);
    const quantity=Math.max(1,Math.min(100,Math.trunc(Number(input.quantity||1))));
    const subtotal=this.money(product.unitPrice*quantity);
    const promo=await this.coupon(tenantId,product.kind,product.targetId,subtotal,input.couponCode);
    return{product,quantity,subtotal,discount:promo.discount,total:promo.total,currency:product.currency,couponCode:promo.code};
  }

  async startPlatformPurchase(tenantId:string,userId:string,input:PlatformCheckoutDto,ip:string){
    const [{tenant,buyer},product]=await Promise.all([this.buyer(tenantId,userId,input.buyer),this.resolveProduct(tenantId,input)]);
    const quantity=Math.max(1,Math.min(100,Math.trunc(Number(input.quantity||1))));
    const subtotal=this.money(product.unitPrice*quantity);
    const promo=await this.coupon(tenantId,product.kind,product.targetId,subtotal,input.couponCode);
    const conversationId=randomUUID();
    const purchase=await this.prisma.platformPurchase.create({data:{tenantId,userId,kind:product.kind,targetId:product.targetId,sku:product.sku,description:product.name,quantity,
      unitPrice:product.unitPrice,subtotal,discountTotal:promo.discount,amount:promo.total,currency:product.currency,couponCode:promo.code,conversationId,
      billingInfo:{name:`${buyer.name} ${buyer.surname}`,companyName:buyer.companyName,taxOffice:buyer.taxOffice,identityNumber:buyer.identityNumber,phone:buyer.phone,address:buyer.address,city:buyer.city,zipCode:buyer.zipCode,country:buyer.country},metadata:this.prismaJson(product.metadata||{})}});
    if(promo.total<=0){
      await this.prisma.control().$transaction(async tx=>{
        const changed=await tx.platformPurchase.updateMany({where:{id:purchase.id,status:'PENDING'},data:{status:'PAID',provider:'COUPON',paidAt:new Date()}});
        if(!changed.count)return;
        await this.consumeCoupon(tx,tenantId,promo.code,'PLATFORM',purchase.id);
      });
      await this.fulfillPlatformPurchase(purchase.id);
      return{paid:true,attemptId:purchase.id,redirect:`${this.merchantAdminUrl()}/billing?payment=success`};
    }
    const callbackBase=this.callbackBase();
    const request={locale:Iyzipay.LOCALE.TR,conversationId,price:promo.total.toFixed(2),paidPrice:promo.total.toFixed(2),currency:this.currency(product.currency),
      basketId:`PLATFORM-${purchase.id}`,paymentGroup:Iyzipay.PAYMENT_GROUP?.PRODUCT||'PRODUCT',callbackUrl:`${callbackBase}/v1/billing/iyzico/platform-callback?attempt=${encodeURIComponent(purchase.id)}`,
      enabledInstallments:[1],buyer:this.iyzicoBuyer(buyer,ip),shippingAddress:this.iyzicoAddress(buyer),billingAddress:this.iyzicoAddress(buyer),
      basketItems:[{id:product.sku,name:`Ticarti - ${product.name}`,category1:'Digital',itemType:Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,price:promo.total.toFixed(2)}]};
    const result=await this.callCreate(this.client().checkoutFormInitialize,request).catch(async(error:unknown)=>{
      await this.prisma.platformPurchase.update({where:{id:purchase.id},data:{status:'FAILED',raw:{error:error instanceof Error?error.message:String(error)}}});
      throw new BadRequestException(apiError('billing.checkout.failed'));
    });
    if(result.status!=='success'||!result.checkoutFormContent){
      await this.prisma.platformPurchase.update({where:{id:purchase.id},data:{status:'FAILED',raw:this.prismaJson(result)}});
      throw new BadRequestException(result.errorMessage||apiError('billing.checkout.failed'));
    }
    await this.prisma.platformPurchase.update({where:{id:purchase.id},data:{token:result.token||null,raw:{checkoutFormContent:result.checkoutFormContent}}});
    return{attemptId:purchase.id,paymentUrl:`${callbackBase}/v1/billing/iyzico/platform-pay/${purchase.id}`,subtotal,discount:promo.discount,total:promo.total,currency:product.currency};
  }

  async platformPaymentPage(id:string){
    const row=await this.prisma.platformPurchase.findUnique({where:{id}});
    if(!row||row.status!=='PENDING')throw new NotFoundException();
    const raw=(row.raw&&typeof row.raw==='object'&&!Array.isArray(row.raw)?row.raw:{}) as Record<string,unknown>;
    if(!raw.checkoutFormContent)throw new NotFoundException();
    return String(raw.checkoutFormContent);
  }

  async platformCallback(attemptId:string,token:string){
    const row=await this.prisma.platformPurchase.findUnique({where:{id:attemptId}});
    if(!row)throw new NotFoundException();
    if(!token)throw new BadRequestException('iyzico token eksik');
    const tenant=await this.prisma.tenant.findUnique({where:{id:row.tenantId},select:{domain:true,publicSlug:true}});
    if(!tenant)throw new NotFoundException();
    const redirect=`${this.merchantAdminUrl()}/billing`;
    if(row.status==='PAID'){await this.fulfillPlatformPurchase(row.id);return{success:true,redirect:`${redirect}?payment=success`}}
    if(row.status!=='PENDING')throw new BadRequestException('Payment attempt is no longer pending');
    if(!row.token||row.token!==token)throw new UnauthorizedException('Payment token does not match this attempt');
    const result=await this.callRetrieve(this.client().checkoutForm,{locale:Iyzipay.LOCALE.TR,conversationId:row.conversationId,token});
    const success=this.providerSuccess(result,{conversationId:row.conversationId,amount:row.amount,currency:row.currency,basketId:`PLATFORM-${row.id}`});
    if(success){
      await this.prisma.control().$transaction(async tx=>{
        const claimed=await tx.platformPurchase.updateMany({where:{id:row.id,status:'PENDING'},data:{status:'PAID',providerPaymentId:String(result.paymentId),paidAt:new Date(),raw:this.prismaJson(result)}});
        if(!claimed.count)return;
        await this.claimProviderReceipt(tx,{paymentId:String(result.paymentId),purchaseType:'PLATFORM',purchaseId:row.id,tenantId:row.tenantId,amount:Number(row.amount),currency:row.currency});
        await this.consumeCoupon(tx,row.tenantId,row.couponCode,'PLATFORM',row.id);
      },{isolationLevel:'Serializable',maxWait:10000,timeout:30000} as any);
      await this.fulfillPlatformPurchase(row.id);
    }else{
      await this.prisma.platformPurchase.updateMany({where:{id:row.id,status:'PENDING'},data:{status:'FAILED',raw:this.prismaJson(result)}});
    }
    return{success,redirect:`${redirect}?payment=${success?'success':'failed'}`};
  }

  private async activatePlan(tx:Prisma.TransactionClient,input:{paymentId:string;tenantId:string;planId:string;billing:string;tenantStatus:string}){
    const now=new Date();const end=new Date(now);
    if(input.billing==='YEARLY')end.setFullYear(end.getFullYear()+1);else end.setMonth(end.getMonth()+1);
    await tx.subscription.updateMany({where:{tenantId:input.tenantId,status:{in:['ACTIVE','TRIAL']}},data:{status:'CANCELLED'}});
    await tx.subscription.create({data:{tenantId:input.tenantId,planId:input.planId,status:'ACTIVE',startsAt:now,currentPeriodStart:now,currentPeriodEnd:end}});
    if(input.tenantStatus!=='SUSPENDED')await tx.tenant.update({where:{id:input.tenantId},data:{status:'ACTIVE'}});
  }

  async start(tenantId:string,userId:string,planId:string,body:PlanCheckoutDto,ip:string){
    const [{tenant,buyer},plan]=await Promise.all([this.buyer(tenantId,userId,body.buyer),this.prisma.plan.findFirst({where:{id:planId,isActive:true}})]);
    if(!plan)throw new NotFoundException(apiError('billing.plan.notFound'));
    const billing=body.billing==='YEARLY'?'YEARLY':'MONTHLY';
    const subtotal=Number(billing==='YEARLY'?(plan.yearlyPrice??plan.monthlyPrice):plan.monthlyPrice);
    if(!(subtotal>0))throw new BadRequestException(apiError('billing.plan.noPayment'));
    const promo=await this.coupon(tenantId,'PLAN',plan.id,subtotal,body.couponCode);
    const conversationId=randomUUID();
    const currency=String(plan.currency||'TRY');
    const attempt=await this.prisma.planPayment.create({data:{tenantId,planId,userId,billing,amount:promo.total,subtotal,discountTotal:promo.discount,couponCode:promo.code,currency,conversationId,provider:promo.total<=0?'COUPON':'IYZICO'}});
    if(promo.total<=0){
      await this.prisma.control().$transaction(async tx=>{
        const claimed=await tx.planPayment.updateMany({where:{id:attempt.id,status:'PENDING'},data:{status:'PAID',paidAt:new Date()}});if(!claimed.count)return;
        await this.activatePlan(tx,{paymentId:attempt.id,tenantId,planId,billing,tenantStatus:tenant.status});
        await this.consumeCoupon(tx,tenantId,promo.code,'PLAN',attempt.id);
      });
      return{paid:true,attemptId:attempt.id,redirect:`${this.merchantAdminUrl()}/plans?payment=success`};
    }
    const callbackBase=this.callbackBase();
    const request={locale:Iyzipay.LOCALE.TR,conversationId,price:promo.total.toFixed(2),paidPrice:promo.total.toFixed(2),currency:this.currency(currency),basketId:`PLAN-${attempt.id}`,
      paymentGroup:Iyzipay.PAYMENT_GROUP?.SUBSCRIPTION||Iyzipay.PAYMENT_GROUP?.PRODUCT||'PRODUCT',callbackUrl:`${callbackBase}/v1/billing/iyzico/callback?attempt=${encodeURIComponent(attempt.id)}`,
      enabledInstallments:[1],buyer:this.iyzicoBuyer(buyer,ip),shippingAddress:this.iyzicoAddress(buyer),billingAddress:this.iyzicoAddress(buyer),
      basketItems:[{id:plan.id,name:`Ticarti ${plan.name} - ${billing==='YEARLY'?'Yıllık':'Aylık'}`,category1:'SaaS',itemType:Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,price:promo.total.toFixed(2)}]};
    const result=await this.callCreate(this.client().checkoutFormInitialize,request).catch(async(error:unknown)=>{
      await this.prisma.planPayment.update({where:{id:attempt.id},data:{status:'FAILED',raw:{error:error instanceof Error?error.message:String(error)}}});
      throw new BadRequestException(apiError('billing.checkout.failed'));
    });
    if(result.status!=='success'||!result.checkoutFormContent){await this.prisma.planPayment.update({where:{id:attempt.id},data:{status:'FAILED',raw:this.prismaJson(result)}});throw new BadRequestException(result.errorMessage||apiError('billing.checkout.failed'))}
    await this.prisma.planPayment.update({where:{id:attempt.id},data:{token:result.token||null,raw:{checkoutFormContent:result.checkoutFormContent}}});
    return{attemptId:attempt.id,paymentUrl:`${callbackBase}/v1/billing/iyzico/pay/${attempt.id}`,subtotal,discount:promo.discount,total:promo.total};
  }

  async paymentPage(id:string){
    const row=await this.prisma.planPayment.findUnique({where:{id}});if(!row||row.status!=='PENDING')throw new NotFoundException();
    const raw=(row.raw&&typeof row.raw==='object'&&!Array.isArray(row.raw)?row.raw:{}) as Record<string,unknown>;if(!raw.checkoutFormContent)throw new NotFoundException();return String(raw.checkoutFormContent);
  }

  async callback(attemptId:string,token:string){
    const row=await this.prisma.planPayment.findUnique({where:{id:attemptId},include:{tenant:true}});if(!row)throw new NotFoundException();
    if(!token)throw new BadRequestException('iyzico token eksik');
    const redirect=`${this.merchantAdminUrl()}/plans`;
    if(row.status==='PAID')return{success:true,redirect:`${redirect}?payment=success`};
    if(row.status!=='PENDING')throw new BadRequestException('Payment attempt is no longer pending');
    if(!row.token||row.token!==token)throw new UnauthorizedException('Payment token does not match this attempt');
    const result=await this.callRetrieve(this.client().checkoutForm,{locale:Iyzipay.LOCALE.TR,conversationId:row.conversationId,token});
    const success=this.providerSuccess(result,{conversationId:row.conversationId,amount:row.amount,currency:row.currency,basketId:`PLAN-${row.id}`});
    if(success){
      await this.prisma.control().$transaction(async tx=>{
        const claimed=await tx.planPayment.updateMany({where:{id:row.id,status:'PENDING'},data:{status:'PAID',providerPaymentId:String(result.paymentId),paidAt:new Date(),raw:this.prismaJson(result)}});if(!claimed.count)return;
        await this.claimProviderReceipt(tx,{paymentId:String(result.paymentId),purchaseType:'PLAN',purchaseId:row.id,tenantId:row.tenantId,amount:Number(row.amount),currency:row.currency});
        await this.activatePlan(tx,{paymentId:String(result.paymentId),tenantId:row.tenantId,planId:row.planId,billing:row.billing,tenantStatus:row.tenant.status});
        await this.consumeCoupon(tx,row.tenantId,row.couponCode,'PLAN',row.id);
      },{isolationLevel:'Serializable',maxWait:10000,timeout:30000} as any);
    }else await this.prisma.planPayment.updateMany({where:{id:row.id,status:'PENDING'},data:{status:'FAILED',raw:this.prismaJson(result)}});
    return{success,redirect:`${redirect}?payment=${success?'success':'failed'}`};
  }

  async startTheme(tenantId:string,userId:string,themeId:string,body:ThemeCheckoutDto,ip:string){
    const [{tenant,buyer},theme,sub]=await Promise.all([
      this.buyer(tenantId,userId,body.buyer),
      this.prisma.themeDefinition.findFirst({where:{id:themeId,isActive:true}}),
      this.prisma.subscription.findFirst({where:{tenantId,status:{in:['ACTIVE','TRIAL']}},orderBy:{createdAt:'desc'},select:{planId:true}}),
    ]);
    if(!theme)throw new NotFoundException(apiError('billing.theme.notFound'));
    const planPrice=sub?.planId?await this.prisma.themePlanPrice.findFirst({where:{themeId,planId:sub.planId,isActive:true}}):null;
    if(planPrice?.included){await this.prisma.themeInstallation.upsert({where:{tenantId_themeId:{tenantId,themeId}},create:{tenantId,themeId,status:'ACTIVE',source:'PLAN',purchasedPrice:0,currency:planPrice.currency||theme.currency},update:{status:'ACTIVE',source:'PLAN'}});return{included:true}}
    const already=await this.prisma.themeInstallation.findUnique({where:{tenantId_themeId:{tenantId,themeId}}});if(already?.status==='ACTIVE')return{owned:true};
    const subtotal=Number(planPrice?.price??theme.basePrice??0);
    if(!(subtotal>0)){await this.prisma.themeInstallation.upsert({where:{tenantId_themeId:{tenantId,themeId}},create:{tenantId,themeId,status:'ACTIVE',source:'FREE',purchasedPrice:0,currency:theme.currency},update:{status:'ACTIVE'}});return{owned:true}}
    const promo=await this.coupon(tenantId,'THEME',theme.id,subtotal,body.couponCode);
    const conversationId=randomUUID();const currency=String(planPrice?.currency||theme.currency||'TRY');
    const attempt=await this.prisma.themePayment.create({data:{tenantId,themeId,userId,amount:promo.total,subtotal,discountTotal:promo.discount,couponCode:promo.code,currency,conversationId,provider:promo.total<=0?'COUPON':'IYZICO'}});
    if(promo.total<=0){
      await this.prisma.control().$transaction(async tx=>{
        const claimed=await tx.themePayment.updateMany({where:{id:attempt.id,status:'PENDING'},data:{status:'PAID',paidAt:new Date()}});if(!claimed.count)return;
        await tx.themeInstallation.upsert({where:{tenantId_themeId:{tenantId,themeId}},create:{tenantId,themeId,status:'ACTIVE',source:'PURCHASED',purchasedPrice:0,currency,installedAt:new Date()},update:{status:'ACTIVE',source:'PURCHASED',purchasedPrice:0,currency}});
        await this.consumeCoupon(tx,tenantId,promo.code,'THEME',attempt.id);
      });
      return{paid:true,attemptId:attempt.id,redirect:`${this.merchantAdminUrl()}/design-content?themePayment=success`};
    }
    const callbackBase=this.callbackBase();
    const request={locale:Iyzipay.LOCALE.TR,conversationId,price:promo.total.toFixed(2),paidPrice:promo.total.toFixed(2),currency:this.currency(currency),basketId:`THEME-${attempt.id}`,
      paymentGroup:Iyzipay.PAYMENT_GROUP?.PRODUCT||'PRODUCT',callbackUrl:`${callbackBase}/v1/billing/iyzico/theme-callback?attempt=${encodeURIComponent(attempt.id)}`,enabledInstallments:[1],
      buyer:this.iyzicoBuyer(buyer,ip),shippingAddress:this.iyzicoAddress(buyer),billingAddress:this.iyzicoAddress(buyer),
      basketItems:[{id:theme.id,name:`Ticarti Tema - ${theme.name}`,category1:'Theme',itemType:Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,price:promo.total.toFixed(2)}]};
    const result=await this.callCreate(this.client().checkoutFormInitialize,request).catch(async(error:unknown)=>{
      await this.prisma.themePayment.update({where:{id:attempt.id},data:{status:'FAILED',raw:{error:error instanceof Error?error.message:String(error)}}});throw new BadRequestException(apiError('billing.checkout.failed'));
    });
    if(result.status!=='success'||!result.checkoutFormContent){await this.prisma.themePayment.update({where:{id:attempt.id},data:{status:'FAILED',raw:this.prismaJson(result)}});throw new BadRequestException(result.errorMessage||apiError('billing.checkout.failed'))}
    await this.prisma.themePayment.update({where:{id:attempt.id},data:{token:result.token||null,raw:{checkoutFormContent:result.checkoutFormContent}}});
    return{attemptId:attempt.id,paymentUrl:`${callbackBase}/v1/billing/iyzico/theme-pay/${attempt.id}`,subtotal,discount:promo.discount,total:promo.total};
  }

  async themePaymentPage(id:string){
    const row=await this.prisma.themePayment.findUnique({where:{id}});if(!row||row.status!=='PENDING')throw new NotFoundException();
    const raw=(row.raw&&typeof row.raw==='object'&&!Array.isArray(row.raw)?row.raw:{}) as Record<string,unknown>;if(!raw.checkoutFormContent)throw new NotFoundException();return String(raw.checkoutFormContent);
  }

  async themeCallback(attemptId:string,token:string){
    const row=await this.prisma.themePayment.findUnique({where:{id:attemptId},include:{tenant:true}});if(!row)throw new NotFoundException();
    if(!token)throw new BadRequestException('iyzico token eksik');
    const redirect=`${this.merchantAdminUrl()}/design-content`;
    if(row.status==='PAID')return{success:true,redirect:`${redirect}?themePayment=success`};
    if(row.status!=='PENDING')throw new BadRequestException('Payment attempt is no longer pending');
    if(!row.token||row.token!==token)throw new UnauthorizedException('Payment token does not match this attempt');
    const result=await this.callRetrieve(this.client().checkoutForm,{locale:Iyzipay.LOCALE.TR,conversationId:row.conversationId,token});
    const success=this.providerSuccess(result,{conversationId:row.conversationId,amount:row.amount,currency:row.currency,basketId:`THEME-${row.id}`});
    if(success){
      await this.prisma.control().$transaction(async tx=>{
        const claimed=await tx.themePayment.updateMany({where:{id:row.id,status:'PENDING'},data:{status:'PAID',providerPaymentId:String(result.paymentId),paidAt:new Date(),raw:this.prismaJson(result)}});if(!claimed.count)return;
        await this.claimProviderReceipt(tx,{paymentId:String(result.paymentId),purchaseType:'THEME',purchaseId:row.id,tenantId:row.tenantId,amount:Number(row.amount),currency:row.currency});
        await tx.themeInstallation.upsert({where:{tenantId_themeId:{tenantId:row.tenantId,themeId:row.themeId}},create:{tenantId:row.tenantId,themeId:row.themeId,status:'ACTIVE',source:'PURCHASED',purchasedPrice:row.amount,currency:row.currency,installedAt:new Date()},update:{status:'ACTIVE',source:'PURCHASED',purchasedPrice:row.amount,currency:row.currency}});
        await this.consumeCoupon(tx,row.tenantId,row.couponCode,'THEME',row.id);
      },{isolationLevel:'Serializable',maxWait:10000,timeout:30000} as any);
    }else await this.prisma.themePayment.updateMany({where:{id:row.id,status:'PENDING'},data:{status:'FAILED',raw:this.prismaJson(result)}});
    return{success,redirect:`${redirect}?themePayment=${success?'success':'failed'}`};
  }

  async iyzicoWebhook(signature:string|undefined,body:IyzicoWebhookDto){
    const secretKey=String(process.env.IYZICO_SECRET_KEY||'').trim();
    if(!secretKey)throw new UnauthorizedException('iyzico webhook verification is not configured');
    if(String(body.iyziEventType||'')!=='CHECKOUT_FORM_AUTH')throw new BadRequestException('Unsupported iyzico webhook event type');
    if(!verifyIyzicoWebhookV3(secretKey,signature,{paymentConversationId:body.paymentConversationId,status:body.status,token:body.token,iyziEventType:body.iyziEventType,iyziPaymentId:body.iyziPaymentId}))throw new UnauthorizedException('Invalid iyzico webhook signature');
    const conversationId=String(body.paymentConversationId||'').trim();
    const token=String(body.token||'').trim();
    const [platform,plan,theme]=await Promise.all([
      this.prisma.platformPurchase.findUnique({where:{conversationId},select:{id:true,status:true}}),
      this.prisma.planPayment.findUnique({where:{conversationId},select:{id:true,status:true}}),
      this.prisma.themePayment.findUnique({where:{conversationId},select:{id:true,status:true}}),
    ]);
    const matches=[platform&&{type:'PLATFORM' as const,...platform},plan&&{type:'PLAN' as const,...plan},theme&&{type:'THEME' as const,...theme}].filter(Boolean) as Array<{type:'PLATFORM'|'PLAN'|'THEME';id:string;status:string}>;
    if(matches.length!==1)throw new BadRequestException(matches.length?'Ambiguous iyzico payment conversation':'Unknown iyzico payment conversation');
    const match=matches[0];
    if(match.status==='PAID'||match.status==='FAILED')return{ok:true,duplicate:true,status:match.status};
    if(match.status!=='PENDING')return{ok:true,duplicate:true,status:match.status};
    if(match.type==='PLATFORM')await this.platformCallback(match.id,token);
    else if(match.type==='PLAN')await this.callback(match.id,token);
    else await this.themeCallback(match.id,token);
    return{ok:true,duplicate:false};
  }

}
