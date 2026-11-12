import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { EmailService } from '../../email/email.service';
import { EDocumentService } from '../../edoc-core/edoc.service';

const ZERO_DECIMAL=new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF']);

@Injectable()
export class PaymentProvidersService{
  constructor(private prisma:PrismaService,private integrations:IntegrationsService,private email:EmailService,private edoc:EDocumentService){}

  private tokenHash(v:string){return createHash('sha256').update(String(v||'')).digest('hex')}
  private minor(amount:any,currency:string){const n=Number(amount||0);return Math.round(n*(ZERO_DECIMAL.has(String(currency||'').toUpperCase())?1:100));}
  private major(amountMinor:any,currency:string){const n=Number(amountMinor||0);return n/(ZERO_DECIMAL.has(String(currency||'').toUpperCase())?1:100);}

  private async stripeConnection(storeId:string){const c:any=await this.integrations.internalProviderConnection(storeId,'stripe');if(!c)throw new BadRequestException('Stripe modülü bağlı veya aktif değil');const secretKey=String(c.credentials?.secretKey||'').trim();if(!secretKey)throw new BadRequestException('Stripe Secret Key tanımlı değil');return{...c,secretKey,webhookSecret:String(c.credentials?.webhookSecret||'').trim(),publishableKey:String((c.config as any)?.publishableKey||'').trim(),captureMethod:String((c.config as any)?.captureMethod||'automatic')==='manual'?'manual':'automatic',paymentElementLayout:String((c.config as any)?.paymentElementLayout||'tabs')};}
  private stripeTransport(){
    // Only a known local module is permitted. No URL or merchant-supplied paths.
    const modulePath=join(process.env.TICARTI_MODULES_DIR || join(process.cwd(),'..','..','modules'),'payment-stripe','transport.cjs');
    let transport:any;
    try{transport=require(modulePath);}catch{throw new BadRequestException('Stripe provider module is not installed');}
    if(typeof transport?.request!=='function'||typeof transport?.verifySignature!=='function')throw new BadRequestException('Stripe provider module invalid');
    return transport;
  }
  private async stripeRequest(storeId:string,path:string,opts:{method?:string;body?:Record<string,any>;idempotencyKey?:string}={}){
    const connection=await this.stripeConnection(storeId);
    try{return await this.stripeTransport().request({secretKey:connection.secretKey,path,...opts});}
    catch(error:any){throw new BadRequestException(error?.message||'Payment provider request failed');}
  }

  private mapAttemptStatus(pi:any){const s=String(pi?.status||'');if(s==='succeeded')return'SUCCEEDED';if(s==='canceled')return'CANCELLED';if(s==='requires_action'||s==='requires_payment_method'||s==='requires_confirmation')return'REQUIRES_ACTION';if(s==='processing'||s==='requires_capture')return'PROCESSING';return'UNKNOWN';}
  private async requirePublicAttempt(attemptId:string,token:string){if(!token)throw new UnauthorizedException('Payment session token required');const attempt:any=await this.prisma.paymentAttempt.findUnique({where:{id:attemptId},include:{order:true}});if(!attempt||String(attempt.provider).toLowerCase()!=='stripe')throw new NotFoundException('Stripe payment attempt not found');const raw:any=attempt.raw||{};const expected=String(raw.publicTokenHash||'');const actual=this.tokenHash(token);if(!expected||expected.length!==actual.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))throw new UnauthorizedException('Invalid payment session');return attempt;}
  private async stripeAttemptForOrder(storeId:string,orderId:string){const attempt:any=await this.prisma.paymentAttempt.findFirst({where:{storeId,orderId,provider:{equals:'stripe',mode:'insensitive'}},include:{order:true},orderBy:{createdAt:'desc'}});if(!attempt)throw new NotFoundException('Bu sipariş için Stripe ödeme kaydı bulunamadı');return attempt;}

  async startStripe(attemptId:string,token:string){const attempt:any=await this.requirePublicAttempt(attemptId,token);const connection=await this.stripeConnection(attempt.storeId);if(!connection.publishableKey)throw new BadRequestException('Stripe Publishable Key tanımlı değil');let pi:any=null;if(attempt.providerSessionId){pi=await this.stripeRequest(attempt.storeId,`/v1/payment_intents/${encodeURIComponent(attempt.providerSessionId)}`);}else{pi=await this.stripeRequest(attempt.storeId,'/v1/payment_intents',{method:'POST',idempotencyKey:`ticarti:${attempt.id}:create`,body:{amount:this.minor(attempt.amount,attempt.currency),currency:String(attempt.currency).toLowerCase(),'automatic_payment_methods[enabled]':'true',capture_method:connection.captureMethod,'metadata[storeId]':attempt.storeId,'metadata[orderId]':attempt.orderId,'metadata[attemptId]':attempt.id,description:`Ticarti Order #${attempt.order?.number||attempt.orderId}`}});}
    await this.prisma.paymentAttempt.update({where:{id:attempt.id},data:{providerSessionId:pi.id,providerReference:pi.id,status:this.mapAttemptStatus(pi) as any,raw:{...((attempt.raw as any)||{}),stripeStatus:pi.status,lastStripeSyncAt:new Date().toISOString()}}});
    if(pi.status==='succeeded')await this.syncSucceeded(attempt,pi);
    return{provider:'stripe',publishableKey:connection.publishableKey,clientSecret:pi.client_secret,status:pi.status,captureMethod:connection.captureMethod,layout:connection.paymentElementLayout};
  }

  async stripeStatus(attemptId:string,token:string){const attempt:any=await this.requirePublicAttempt(attemptId,token);if(!attempt.providerSessionId)return{provider:'stripe',status:'created',paid:false};const pi=await this.stripeRequest(attempt.storeId,`/v1/payment_intents/${encodeURIComponent(attempt.providerSessionId)}`);await this.syncStripeAttempt(attempt,pi);const order=await this.prisma.order.findUnique({where:{id:attempt.orderId},include:{items:true,customer:true}});return{provider:'stripe',status:pi.status,paid:order?.paymentStatus==='PAID',order};}

  private async syncStripeAttempt(attempt:any,pi:any){const status=this.mapAttemptStatus(pi);await this.prisma.paymentAttempt.update({where:{id:attempt.id},data:{status:status as any,providerSessionId:pi.id,providerReference:pi.id,raw:{...((attempt.raw as any)||{}),stripeStatus:pi.status,lastStripeSyncAt:new Date().toISOString()}}});if(pi.status==='succeeded')return this.syncSucceeded(attempt,pi);if(pi.status==='canceled'){const failed=await this.prisma.order.updateMany({where:{id:attempt.orderId,storeId:attempt.storeId,paymentStatus:'PENDING'},data:{paymentStatus:'FAILED'}});if(failed.count)void this.email.sendOrderTemplateEvent(attempt.storeId,'payment_failed',attempt.orderId);}return{status:pi.status};}

  private async syncSucceeded(attempt:any,pi:any){let becamePaid=false;const result=await this.prisma.$transaction(async(tx:any)=>{const lock:any[]=await tx.$queryRawUnsafe('SELECT "id" FROM "Order" WHERE "id" = $1 AND "storeId" = $2 FOR UPDATE',attempt.orderId,attempt.storeId);if(!lock.length)throw new NotFoundException('Order not found');const order:any=await tx.order.findFirst({where:{id:attempt.orderId,storeId:attempt.storeId}});if(!order)throw new NotFoundException('Order not found');await tx.paymentAttempt.update({where:{id:attempt.id},data:{status:'SUCCEEDED',providerSessionId:pi.id,providerReference:pi.id,raw:{...((attempt.raw as any)||{}),stripeStatus:pi.status,lastStripeSyncAt:new Date().toISOString()}}});await tx.paymentTransaction.upsert({where:{storeId_idempotencyKey:{storeId:attempt.storeId,idempotencyKey:`stripe:${attempt.id}:paid`}},create:{storeId:attempt.storeId,orderId:attempt.orderId,attemptId:attempt.id,type:'SALE',status:'SUCCEEDED',amount:attempt.amount,currency:attempt.currency,providerTransactionId:String(pi.latest_charge||pi.id),idempotencyKey:`stripe:${attempt.id}:paid`,raw:{paymentIntentId:pi.id,status:pi.status}},update:{status:'SUCCEEDED',providerTransactionId:String(pi.latest_charge||pi.id),raw:{paymentIntentId:pi.id,status:pi.status}}});if(order.paymentStatus==='PAID')return order;const reservations=await tx.inventoryReservation.findMany({where:{orderId:order.id,status:'HELD'}});for(const reservation of reservations){for(let retry=0;retry<4;retry++){const stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:reservation.warehouseId,variantId:reservation.variantId}}});if(!stock)throw new BadRequestException('Reserved warehouse stock not found');const qty=Number(reservation.quantity||0);const release=Math.min(Number(stock.reserved||0),qty);const changed=await tx.warehouseStock.updateMany({where:{id:stock.id,reserved:stock.reserved,committed:stock.committed},data:{reserved:{decrement:release},committed:{increment:qty}}});if(changed.count===1)break;if(retry===3)throw new BadRequestException('Inventory changed while capturing Stripe payment');}await tx.inventoryReservation.update({where:{id:reservation.id},data:{status:'COMMITTED',expiresAt:null}});}await tx.affiliateConversion.updateMany({where:{storeId:attempt.storeId,orderId:order.id,status:'PENDING'},data:{status:'APPROVED',approvedAt:new Date()}});const automations=await tx.marketingAutomation.findMany({where:{storeId:attempt.storeId,enabled:true,trigger:'ORDER_PAID'}});for(const automation of automations)await tx.marketingAutomationRun.upsert({where:{automationId_eventKey:{automationId:automation.id,eventKey:`order:${order.id}:paid`}},create:{storeId:attempt.storeId,automationId:automation.id,eventKey:`order:${order.id}:paid`,customerId:order.customerId,orderId:order.id,status:'PENDING',nextRunAt:new Date(Date.now()+automation.delayMinutes*60000),context:{number:order.number,total:Number(order.grandTotal),currency:order.currency}},update:{}});const nextStatus=order.status==='PENDING_PAYMENT'?'PROCESSING':order.status;becamePaid=true;const updated=await tx.order.update({where:{id:order.id},data:{paymentStatus:'PAID',status:nextStatus}});await tx.orderStatusHistory.create({data:{orderId:order.id,status:'PAYMENT_PAID',note:'Stripe payment succeeded'}});return updated;});if(becamePaid){void this.email.sendOrderTemplateEvent(attempt.storeId,'payment_received',attempt.orderId);void this.edoc.maybeAutoCreateForOrder(attempt.storeId,attempt.orderId,'PAYMENT_PAID');}return result;}

  private verifyStripeSignature(raw:string,header:string,secret:string){
    try{this.stripeTransport().verifySignature(raw,header,secret);}
    catch{throw new UnauthorizedException('Invalid Stripe webhook signature');}
  }
  async stripeWebhook(raw:string,signature:string){let event:any;try{event=JSON.parse(raw)}catch{throw new BadRequestException('Invalid Stripe webhook body')}const object=event?.data?.object||{};const storeId=String(object?.metadata?.storeId||'');const attemptId=String(object?.metadata?.attemptId||'');if(!storeId||!attemptId)throw new BadRequestException('Stripe metadata missing');const connection=await this.stripeConnection(storeId);if(!connection.webhookSecret)throw new BadRequestException('Stripe Webhook Signing Secret tanımlı değil');this.verifyStripeSignature(raw,signature,connection.webhookSecret);const attempt:any=await this.prisma.paymentAttempt.findFirst({where:{id:attemptId,storeId,provider:{equals:'stripe',mode:'insensitive'}}});if(!attempt)return{received:true,ignored:true};if(String(event.type||'').startsWith('payment_intent.'))await this.syncStripeAttempt(attempt,object);return{received:true};}

  async reconcileStripeOrder(storeId:string,orderId:string){const attempt=await this.stripeAttemptForOrder(storeId,orderId);if(!attempt.providerSessionId)throw new BadRequestException('Stripe PaymentIntent henüz oluşturulmamış');const pi=await this.stripeRequest(storeId,`/v1/payment_intents/${encodeURIComponent(attempt.providerSessionId)}`);await this.syncStripeAttempt(attempt,pi);return{ok:true,status:pi.status};}
  async captureStripeOrder(storeId:string,orderId:string,body:any){const attempt=await this.stripeAttemptForOrder(storeId,orderId);if(!attempt.providerSessionId)throw new BadRequestException('Stripe PaymentIntent bulunamadı');const amount=body?.amount?this.minor(body.amount,attempt.currency):undefined;const pi=await this.stripeRequest(storeId,`/v1/payment_intents/${encodeURIComponent(attempt.providerSessionId)}/capture`,{method:'POST',idempotencyKey:`ticarti:${attempt.id}:capture:${amount||'all'}`,body:{amount_to_capture:amount}});await this.syncStripeAttempt(attempt,pi);return{ok:true,status:pi.status};}
  async cancelStripeOrder(storeId:string,orderId:string,body:any){const attempt=await this.stripeAttemptForOrder(storeId,orderId);if(!attempt.providerSessionId)throw new BadRequestException('Stripe PaymentIntent bulunamadı');const pi=await this.stripeRequest(storeId,`/v1/payment_intents/${encodeURIComponent(attempt.providerSessionId)}/cancel`,{method:'POST',idempotencyKey:`ticarti:${attempt.id}:cancel`});await this.syncStripeAttempt(attempt,pi);if(body?.cancelOrder){await this.prisma.$transaction(async(tx:any)=>{const order:any=await tx.order.findFirst({where:{id:orderId,storeId}});if(!order||order.status==='CANCELLED')return;const reservations=await tx.inventoryReservation.findMany({where:{orderId,status:'HELD'}});for(const r of reservations){const stock=await tx.warehouseStock.findUnique({where:{warehouseId_variantId:{warehouseId:r.warehouseId,variantId:r.variantId}}});if(stock)await tx.warehouseStock.update({where:{id:stock.id},data:{reserved:{decrement:Math.min(Number(stock.reserved||0),Number(r.quantity||0))}}});await tx.inventoryReservation.update({where:{id:r.id},data:{status:'RELEASED',expiresAt:null}});}await tx.order.update({where:{id:orderId},data:{status:'CANCELLED',paymentStatus:'FAILED'}});await tx.orderStatusHistory.create({data:{orderId,status:'CANCELLED',note:'Stripe payment cancelled'}});});}return{ok:true,status:pi.status};}
  // v33.1.7: A refund is reserved durably BEFORE calling the external provider.
  // A failed or ambiguous provider response is retained as UNKNOWN and counts
  // against the refundable balance until a dedicated reconciliation resolves it.
  async refundStripeOrder(storeId:string,orderId:string,body:any){
    const requestId=String(body?.idempotencyKey||body?.requestId||'').trim();
    if(!/^[a-zA-Z0-9_-]{8,128}$/.test(requestId))throw new BadRequestException('Refund idempotencyKey (8-128 ASCII characters) required');
    const attempt=await this.stripeAttemptForOrder(storeId,orderId);
    if(!attempt.providerSessionId)throw new BadRequestException('Stripe PaymentIntent bulunamadı');
    const key=`stripe:${attempt.id}:refund:${createHash('sha256').update(requestId).digest('hex')}`;
    const reserved:any=await this.prisma.$transaction(async(tx:any)=>{
      // Order row lock serializes refund reservations across all API instances.
      const locked=await tx.$queryRawUnsafe('SELECT "id" FROM "Order" WHERE "id" = $1 AND "storeId" = $2 FOR UPDATE',orderId,storeId);
      if(!locked.length)throw new NotFoundException('Order not found');
      const existing=await tx.paymentTransaction.findUnique({where:{storeId_idempotencyKey:{storeId,idempotencyKey:key}}});
      if(existing){
        if(existing.type!=='REFUND'||existing.orderId!==orderId||existing.attemptId!==attempt.id)throw new BadRequestException('Refund request identity conflict');
        const requested=body?.amount===undefined||body?.amount===''?null:Number(body.amount);
        if(requested!==null&&this.minor(requested,attempt.currency)!==this.minor(existing.amount,attempt.currency))throw new BadRequestException('Refund idempotency amount conflict');
        return{existing:true,transaction:existing};
      }
      const order=await tx.order.findFirst({where:{id:orderId,storeId}});
      const transactions=await tx.paymentTransaction.findMany({where:{storeId,orderId,type:'REFUND',status:{in:['PENDING','UNKNOWN','SUCCEEDED']}}});
      const taken=transactions.reduce((n:number,t:any)=>n+this.minor(t.amount,attempt.currency),0);
      // Never reserve a refund based solely on order grand total: the payment
      // might be uncaptured or only partially settled. Use successful ledger
      // entries and conservatively cap at the order total.
      const paidRows=await tx.paymentTransaction.findMany({where:{storeId,orderId,type:{in:['SALE','CAPTURE']},status:'SUCCEEDED',currency:attempt.currency}});
      const recordedPaid=paidRows.reduce((n:number,t:any)=>n+this.minor(t.amount,attempt.currency),0);
      const total=Math.min(this.minor(order.grandTotal,attempt.currency),recordedPaid);
      const remaining=total-taken;
      const requested=body?.amount===undefined||body?.amount===''?remaining:this.minor(body.amount,attempt.currency);
      if(!Number.isSafeInteger(requested)||requested<=0||requested>remaining)throw new BadRequestException('Refund exceeds unreserved refundable amount');
      const amount=this.major(requested,attempt.currency);
      const transaction=await tx.paymentTransaction.create({data:{storeId,orderId,attemptId:attempt.id,type:'REFUND',status:'PENDING',amount,currency:attempt.currency,idempotencyKey:key,raw:{requestIdHash:createHash('sha256').update(requestId).digest('hex'),phase:'RESERVED'}}});
      return{existing:false,transaction};
    });
    if(reserved.existing){
      // Never re-issue a provider call for PENDING/UNKNOWN requests automatically.
      const tx=reserved.transaction;
      return{ok:tx.status==='SUCCEEDED',status:tx.status,idempotent:true,transactionId:tx.id,requiresReconciliation:tx.status!=='SUCCEEDED'};
    }
    const record=reserved.transaction;
    let refund:any;
    try{
      refund=await this.stripeRequest(storeId,'/v1/refunds',{method:'POST',idempotencyKey:key,body:{payment_intent:attempt.providerSessionId,amount:this.minor(record.amount,attempt.currency),'metadata[orderId]':orderId,'metadata[attemptId]':attempt.id,'metadata[transactionId]':record.id,reason:body?.reason||undefined}});
    }catch(e){
      // Timeout/5xx could mean Stripe created the refund. Preserve the hold.
      await this.prisma.paymentTransaction.updateMany({where:{id:record.id,status:'PENDING'},data:{status:'UNKNOWN',raw:{phase:'RECONCILIATION_REQUIRED'}}});
      throw e;
    }
    const succeeded=refund.status==='succeeded';
    const failed=refund.status==='failed'||refund.status==='canceled';
    return this.prisma.$transaction(async(tx:any)=>{
      await tx.$queryRawUnsafe('SELECT "id" FROM "Order" WHERE "id" = $1 AND "storeId" = $2 FOR UPDATE',orderId,storeId);
      await tx.paymentTransaction.update({where:{id:record.id},data:{status:succeeded?'SUCCEEDED':failed?'FAILED':'PENDING',providerTransactionId:refund.id,raw:refund}});
      const order=await tx.order.findFirst({where:{id:orderId,storeId}});
      const all=await tx.paymentTransaction.findMany({where:{storeId,orderId,type:'REFUND',status:'SUCCEEDED'}});
      const refundedMinor=all.reduce((n:number,x:any)=>n+this.minor(x.amount,attempt.currency),0);
      const totalMinor=this.minor(order.grandTotal,attempt.currency);
      if(succeeded){
        const fully=refundedMinor>=totalMinor;
        await tx.order.update({where:{id:orderId},data:{paymentStatus:fully?'REFUNDED':'PARTIALLY_REFUNDED'}});
        await tx.orderStatusHistory.create({data:{orderId,status:fully?'PAYMENT_REFUNDED':'PAYMENT_PARTIALLY_REFUNDED',note:`Stripe refund ${Number(record.amount).toFixed(2)} ${attempt.currency}`}});
      }
      return{ok:succeeded,status:refund.status,refund,refunded:this.major(refundedMinor,attempt.currency),remaining:this.major(Math.max(0,totalMinor-refundedMinor),attempt.currency),requiresReconciliation:!succeeded&&!failed};
    });
  }

  async reconcileStripeRefund(storeId:string,orderId:string,transactionId:string){
    const attempt=await this.stripeAttemptForOrder(storeId,orderId);
    const row:any=await this.prisma.paymentTransaction.findFirst({where:{id:transactionId,storeId,orderId,attemptId:attempt.id,type:'REFUND'}});
    if(!row)throw new NotFoundException('Refund transaction not found');
    if(row.status==='SUCCEEDED'||row.status==='FAILED')return{status:row.status,idempotent:true};
    if(!['UNKNOWN','PENDING'].includes(row.status))throw new BadRequestException('Refund state cannot be reconciled');
    const connection=await this.stripeConnection(storeId);
    if(!attempt.providerSessionId)throw new BadRequestException('Missing payment intent');
    const transport=this.stripeTransport();
    if(typeof transport.reconcileRefund!=='function')throw new BadRequestException('Stripe refund reconciliation module unavailable');
    const refund:any=await transport.reconcileRefund({secretKey:connection.secretKey,paymentIntentId:attempt.providerSessionId,transactionId:row.id,providerRefundId:row.providerTransactionId||undefined});
    if(!refund)return{status:row.status,requiresReconciliation:true,reason:'NOT_FOUND'};
    if(this.minor(row.amount,attempt.currency)!==Number(refund.amount)||String(refund.currency).toUpperCase()!==String(attempt.currency).toUpperCase())throw new BadRequestException('Refund amount or currency mismatch');
    const finalStatus=refund.status==='succeeded'?'SUCCEEDED':(['failed','canceled'].includes(refund.status)?'FAILED':'PENDING');
    return this.prisma.$transaction(async(tx:any)=>{
      const locked:any[]=await tx.$queryRawUnsafe('SELECT "id" FROM "Order" WHERE "id" = $1 AND "storeId" = $2 FOR UPDATE',orderId,storeId);
      if(!locked.length)throw new NotFoundException('Order not found');
      const fresh:any=await tx.paymentTransaction.findFirst({where:{id:row.id,storeId,orderId,attemptId:attempt.id,type:'REFUND'}});
      if(!fresh)throw new NotFoundException('Refund transaction not found');
      if(['SUCCEEDED','FAILED'].includes(fresh.status))return{status:fresh.status,idempotent:true};
      await tx.paymentTransaction.update({where:{id:fresh.id},data:{status:finalStatus,providerTransactionId:String(refund.id),raw:refund}});
      if(finalStatus==='SUCCEEDED'){
        const order:any=await tx.order.findFirst({where:{id:orderId,storeId}});
        const paid:any[]=await tx.paymentTransaction.findMany({where:{storeId,orderId,type:'REFUND',status:'SUCCEEDED'}});
        const total=paid.reduce((n:number,r:any)=>n+this.minor(r.amount,attempt.currency),0);
        const complete=total>=this.minor(order.grandTotal,attempt.currency);
        await tx.order.update({where:{id:orderId},data:{paymentStatus:complete?'REFUNDED':'PARTIALLY_REFUNDED'}});
        await tx.orderStatusHistory.create({data:{orderId,status:complete?'PAYMENT_REFUNDED':'PAYMENT_PARTIALLY_REFUNDED',note:'Provider refund reconciled'}});
      }
      return{status:finalStatus,refundId:String(refund.id),requiresReconciliation:finalStatus==='PENDING'};
    });
  }

}
