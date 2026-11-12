import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppBillingService {
  constructor(private prisma: PrismaService) {}

  private n(v:any){const x=Number(v??0);return Number.isFinite(x)?x:0}
  private days(n:number){return Math.max(0,Math.trunc(n))*86400000}
  private addMonths(d:Date,months=1){const x=new Date(d);x.setUTCMonth(x.getUTCMonth()+months);return x}

  async tenantPricing(tenantId:string,app:any){
    const sub=await this.prisma.subscription.findFirst({where:{tenantId,status:{in:['TRIAL','ACTIVE','PAST_DUE']}},orderBy:{createdAt:'desc'}});
    const row=sub?await this.prisma.appPlanPrice.findUnique({where:{appId_planId:{appId:app.id,planId:sub.planId}}}):null;
    const included=!!row?.included;
    const billingType=String(row?.billingType||app.billingType||'FREE').toUpperCase();
    const amount=included?0:(row?.price!==null&&row?.price!==undefined?this.n(row.price):this.n(app.basePrice));
    return {
      included,amount,billingType,currency:String(row?.currency||app.currency||'TRY'),
      trialDays:Math.max(0,Number(row?.trialDays??app.trialDays??0)),
      gracePeriodDays:Math.max(0,Number(row?.gracePeriodDays??app.gracePeriodDays??3)),
      includedUnits:Math.max(0,Number(row?.includedUnits??app.includedUnits??0)),
      usageMetric:String(row?.usageMetric||app.usageMetric||'').trim()||null,
      usageUnitPrice:row?.usageUnitPrice!==null&&row?.usageUnitPrice!==undefined?this.n(row.usageUnitPrice):(app.usageUnitPrice!==null&&app.usageUnitPrice!==undefined?this.n(app.usageUnitPrice):null),
      usageLimit:row?.usageLimit??null,maxCharge:row?.maxCharge!==null&&row?.maxCharge!==undefined?this.n(row.maxCharge):null,
      planId:sub?.planId||null,
    };
  }

  async provision(installationId:string,pricing?:any){
    const install=await this.prisma.appInstallation.findUnique({where:{id:installationId},include:{app:true}});if(!install)throw new NotFoundException('App installation not found');
    const p=pricing||await this.tenantPricing(install.tenantId,install.app);const now=new Date();
    const free=p.included||p.billingType==='FREE'||this.n(p.amount)<=0;
    const trialing=!free&&Number(p.trialDays)>0;
    const status=trialing?'TRIALING':'ACTIVE';
    const trialEndsAt=trialing?new Date(now.getTime()+this.days(p.trialDays)):null;
    const periodStart=now;const periodEnd=trialEndsAt||this.addMonths(now,1);
    return this.prisma.appBillingSubscription.upsert({
      where:{installationId},
      create:{installationId,tenantId:install.tenantId,appId:install.appId,status,billingType:p.billingType,interval:p.billingType==='YEARLY'?'YEARLY':'MONTHLY',amount:p.amount,currency:p.currency,trialEndsAt,currentPeriodStart:periodStart,currentPeriodEnd:periodEnd,includedUnits:p.includedUnits||0,usageMetric:p.usageMetric||null,usageUnitPrice:p.usageUnitPrice,usageLimit:p.usageLimit??null,maxCharge:p.maxCharge,priceSnapshot:p},
      update:{status,billingType:p.billingType,interval:p.billingType==='YEARLY'?'YEARLY':'MONTHLY',amount:p.amount,currency:p.currency,trialEndsAt,currentPeriodStart:periodStart,currentPeriodEnd:periodEnd,graceEndsAt:null,cancelAtPeriodEnd:false,canceledAt:null,suspendedAt:null,includedUnits:p.includedUnits||0,usageMetric:p.usageMetric||null,usageUnitPrice:p.usageUnitPrice,usageLimit:p.usageLimit??null,usageCurrent:0,maxCharge:p.maxCharge,priceSnapshot:p}
    });
  }

  async cancelInstallation(installationId:string){
    const now=new Date();const sub=await this.prisma.appBillingSubscription.findUnique({where:{installationId}});if(!sub)return {ok:true};
    await this.prisma.control().$transaction([
      this.prisma.appBillingSubscription.update({where:{id:sub.id},data:{status:'CANCELED',canceledAt:now,cancelAtPeriodEnd:false}}),
      this.prisma.appBillingCharge.updateMany({where:{subscriptionId:sub.id,status:'PENDING'},data:{status:'VOID'}}),
    ]);return {ok:true};
  }

  async tenantSummary(tenantId:string){
    const subscriptions=await this.prisma.appBillingSubscription.findMany({where:{tenantId},include:{app:true,installation:true},orderBy:{createdAt:'desc'}});
    const invoices=await this.prisma.appBillingInvoice.findMany({where:{tenantId},include:{charges:{include:{app:true}}},orderBy:{createdAt:'desc'},take:50});
    return {subscriptions:subscriptions.map((s:any)=>({...s,amount:this.n(s.amount),usageUnitPrice:s.usageUnitPrice==null?null:this.n(s.usageUnitPrice),maxCharge:s.maxCharge==null?null:this.n(s.maxCharge)})),invoices};
  }

  async appStatus(tenantId:string,slug:string){
    const row=await this.prisma.appBillingSubscription.findFirst({where:{tenantId,app:{slug}},include:{app:true,installation:true},orderBy:{createdAt:'desc'}});if(!row)throw new NotFoundException('App billing subscription not found');return row;
  }

  async reportUsage(auth:any,body:any){
    const quantity=Math.max(1,Math.trunc(Number(body?.quantity||1)));const key=String(body?.idempotencyKey||'').trim();if(!key||key.length<8)throw new BadRequestException('idempotencyKey is required');
    const sub=await this.prisma.appBillingSubscription.findUnique({where:{installationId:auth.installationId}});if(!sub)throw new NotFoundException('App billing subscription not found');
    if(['CANCELED','SUSPENDED'].includes(sub.status))throw new ForbiddenException('App billing subscription is not active');
    const metric=String(body?.metric||sub.usageMetric||'usage').trim();if(sub.usageMetric&&metric!==sub.usageMetric)throw new BadRequestException(`Usage metric must be ${sub.usageMetric}`);
    const existing=await this.prisma.appUsageRecord.findUnique({where:{idempotencyKey:key}});if(existing)return existing;
    if(sub.usageLimit!=null&&sub.usageCurrent+quantity>sub.usageLimit)throw new ForbiddenException('App usage limit exceeded');
    const oldBillable=Math.max(0,sub.usageCurrent-sub.includedUnits);const nextUsage=sub.usageCurrent+quantity;const nextBillable=Math.max(0,nextUsage-sub.includedUnits);const billableDelta=Math.max(0,nextBillable-oldBillable);
    const unit=this.n(sub.usageUnitPrice);let amount=Math.round(billableDelta*unit*100)/100;
    if(sub.maxCharge!=null&&amount>0){const agg=await this.prisma.appBillingCharge.aggregate({_sum:{amount:true},where:{subscriptionId:sub.id,periodStart:sub.currentPeriodStart||undefined,status:{in:['PENDING','PAID']}}});const used=this.n(agg._sum.amount);amount=Math.max(0,Math.min(amount,this.n(sub.maxCharge)-used));}
    return this.prisma.control().$transaction(async tx=>{
      const rec=await tx.appUsageRecord.create({data:{installationId:auth.installationId,subscriptionId:sub.id,tenantId:auth.tenantId,appId:auth.appId,metric,quantity,unitPrice:unit||null,amount,idempotencyKey:key,billable:amount>0,metadata:body?.metadata||undefined,occurredAt:body?.occurredAt?new Date(body.occurredAt):new Date()}});
      await tx.appBillingSubscription.update({where:{id:sub.id},data:{usageCurrent:{increment:quantity}}});
      if(amount>0)await tx.appBillingCharge.create({data:{subscriptionId:sub.id,installationId:auth.installationId,tenantId:auth.tenantId,appId:auth.appId,type:'USAGE',status:'PENDING',amount,currency:sub.currency,quantity:billableDelta,unitPrice:unit||null,periodStart:sub.currentPeriodStart,periodEnd:sub.currentPeriodEnd,dueAt:sub.currentPeriodEnd,idempotencyKey:`usage:${key}`,metadata:{usageRecordId:rec.id,metric}}});
      return rec;
    });
  }

  private async recurringCharge(sub:any,periodStart:Date,periodEnd:Date){
    const amount=this.n(sub.amount);if(amount<=0)return null;const key=`recurring:${sub.id}:${periodStart.toISOString()}`;
    return this.prisma.appBillingCharge.upsert({where:{idempotencyKey:key},create:{subscriptionId:sub.id,installationId:sub.installationId,tenantId:sub.tenantId,appId:sub.appId,type:'RECURRING',status:'PENDING',amount,currency:sub.currency,periodStart,periodEnd,dueAt:periodStart,idempotencyKey:key},update:{}});
  }

  private async invoiceOpenCharges(){
    const charges=await this.prisma.appBillingCharge.findMany({where:{status:'PENDING',invoiceId:null},orderBy:{createdAt:'asc'}});const groups=new Map<string,any[]>();for(const c of charges){const k=`${c.tenantId}:${c.currency}`;groups.set(k,[...(groups.get(k)||[]),c]);}
    for(const rows of groups.values()){const amount=rows.reduce((a,c)=>a+this.n(c.amount),0);if(amount<=0)continue;const invoice=await this.prisma.appBillingInvoice.create({data:{tenantId:rows[0].tenantId,status:'OPEN',amount,currency:rows[0].currency,periodStart:rows.map(x=>x.periodStart).filter(Boolean).sort((a,b)=>+a-+b)[0]||null,periodEnd:rows.map(x=>x.periodEnd).filter(Boolean).sort((a,b)=>+b-+a)[0]||null,dueAt:rows.map(x=>x.dueAt).filter(Boolean).sort((a,b)=>+a-+b)[0]||new Date()}});await this.prisma.appBillingCharge.updateMany({where:{id:{in:rows.map(x=>x.id)}},data:{invoiceId:invoice.id}});}
  }

  async reconcile(limit=100){
    const now=new Date();const subs=await this.prisma.appBillingSubscription.findMany({where:{status:{in:['TRIALING','ACTIVE','PAST_DUE']}},orderBy:{updatedAt:'asc'},take:Math.max(1,Math.min(500,limit))});let transitioned=0;
    for(const sub of subs){
      if(sub.status==='TRIALING'&&sub.trialEndsAt&&sub.trialEndsAt<=now){const start=sub.trialEndsAt;const end=sub.interval==='YEARLY'?new Date(Date.UTC(start.getUTCFullYear()+1,start.getUTCMonth(),start.getUTCDate())):this.addMonths(start,1);await this.recurringCharge(sub,start,end);const paid=this.n(sub.amount)<=0;await this.prisma.appBillingSubscription.update({where:{id:sub.id},data:{status:paid?'ACTIVE':'PAST_DUE',currentPeriodStart:start,currentPeriodEnd:end,graceEndsAt:paid?null:new Date(now.getTime()+this.days(Number((sub.priceSnapshot as any)?.gracePeriodDays??3))),usageCurrent:0}});transitioned++;continue;}
      if(sub.status==='ACTIVE'&&sub.currentPeriodEnd&&sub.currentPeriodEnd<=now){const start=sub.currentPeriodEnd;const end=sub.interval==='YEARLY'?new Date(Date.UTC(start.getUTCFullYear()+1,start.getUTCMonth(),start.getUTCDate())):this.addMonths(start,1);await this.recurringCharge(sub,start,end);const paid=this.n(sub.amount)<=0;await this.prisma.appBillingSubscription.update({where:{id:sub.id},data:{status:paid?'ACTIVE':'PAST_DUE',currentPeriodStart:start,currentPeriodEnd:end,graceEndsAt:paid?null:new Date(now.getTime()+this.days(Number((sub.priceSnapshot as any)?.gracePeriodDays??3))),usageCurrent:0}});transitioned++;continue;}
      if(sub.status==='PAST_DUE'&&sub.graceEndsAt&&sub.graceEndsAt<=now){await this.prisma.control().$transaction([this.prisma.appBillingSubscription.update({where:{id:sub.id},data:{status:'SUSPENDED',suspendedAt:now}}),this.prisma.appInstallation.update({where:{id:sub.installationId},data:{status:'SUSPENDED',enabled:false}})]);transitioned++;}
    }
    await this.invoiceOpenCharges();return {ok:true,processed:subs.length,transitioned};
  }

  async markChargePaid(id:string,externalRef?:string){
    const charge=await this.prisma.appBillingCharge.findUnique({where:{id}});if(!charge)throw new NotFoundException('Charge not found');const now=new Date();
    await this.prisma.control().$transaction(async tx=>{await tx.appBillingCharge.update({where:{id},data:{status:'PAID',paidAt:now,externalRef:externalRef||charge.externalRef}});if(charge.invoiceId){const left=await tx.appBillingCharge.count({where:{invoiceId:charge.invoiceId,status:{not:'PAID'}}});if(left===0)await tx.appBillingInvoice.update({where:{id:charge.invoiceId},data:{status:'PAID',paidAt:now}});}const sub=await tx.appBillingSubscription.findUnique({where:{id:charge.subscriptionId}});if(sub&&['PAST_DUE','SUSPENDED'].includes(sub.status)){await tx.appBillingSubscription.update({where:{id:sub.id},data:{status:'ACTIVE',graceEndsAt:null,suspendedAt:null}});await tx.appInstallation.update({where:{id:sub.installationId},data:{status:'ACTIVE',enabled:true}});}});return {ok:true};
  }
}
