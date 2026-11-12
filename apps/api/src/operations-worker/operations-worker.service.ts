import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventOutboxService } from '../webhooks/event-outbox.service';
import { ShippingService } from '../shipping/shipping.service';
import { EmailService } from '../email/email.service';
import {TenantPlacementService} from '../tenant-placement/tenant-placement.service';
import {CellProvisioningService} from '../tenant-placement/cell-provisioning.service';
import {MerchantGrowthService} from '../merchant/merchant-growth.service';

@Injectable()
export class OperationsWorkerService {
  constructor(private prisma:PrismaService,private events:EventOutboxService,private shipping:ShippingService,private email:EmailService,private placements:TenantPlacementService,private provisioning:CellProvisioningService,private growth:MerchantGrowthService){}
  private batchLimit(value:number, fallback:number){
    const configured=Number(process.env.WORKER_BATCH_LIMIT||50);
    const maximum=Number(process.env.WORKER_MAX_BATCH_LIMIT||200);
    const cap=Number.isFinite(maximum)?Math.max(1,Math.min(200,Math.floor(maximum))):200;
    const defaultLimit=Number.isFinite(configured)?Math.max(1,Math.min(cap,Math.floor(configured))):50;
    return Number.isFinite(value)&&value>0?Math.max(1,Math.min(cap,Math.floor(value))):Math.min(cap,defaultLimit||fallback);
  }

  private async fairTenantRows<T extends {storeId:string|null|undefined}>(rows:T[],limit:number){
    const tenantIds=Array.from(new Set(rows.map(x=>String(x.storeId||'')).filter(Boolean)));const policies=await this.placements.resolveMany(tenantIds);
    const buckets=new Map<string,T[]>();for(const row of rows){const id=String(row.storeId||'');if(!id)continue;const b=buckets.get(id)||[];b.push(row);buckets.set(id,b)}
    const ids=Array.from(buckets.keys()).sort((a,b)=>(policies.get(a)?.priority||100)-(policies.get(b)?.priority||100));const out:T[]=[];const used=new Map<string,number>();
    while(out.length<limit){let moved=false;for(const id of ids){if(out.length>=limit)break;const bucket=buckets.get(id);if(!bucket?.length)continue;const cap=Math.max(1,policies.get(id)?.maxConcurrentJobs||2);const n=used.get(id)||0;if(n>=cap)continue;const row=bucket.shift();if(row){out.push(row);used.set(id,n+1);moved=true}}if(!moved)break}return out;
  }

  private async parallel<T>(rows:T[],concurrency:number,fn:(row:T)=>Promise<void>){let cursor=0;await Promise.all(Array.from({length:Math.min(Math.max(1,concurrency),rows.length||1)},async()=>{while(true){const i=cursor++;if(i>=rows.length)return;await fn(rows[i])}}));}

  assertToken(auth:string){this.events.assertWorkerToken(auth)}

  async runLocal<T>(fn:()=>Promise<T>){
    const code=String(process.env.TICARTI_CELL_CODE||'primary').trim();
    const cell=await this.prisma.control().infrastructureCell.findUnique({where:{code},select:{code:true,databasePoolKey:true,redisPoolKey:true}});
    const runtime=cell||{code:'primary',databasePoolKey:'primary',redisPoolKey:'primary'};
    return this.prisma.runInCell({cellCode:runtime.code,databasePoolKey:runtime.databasePoolKey,redisPoolKey:runtime.redisPoolKey},fn);
  }


  async status(){
    const [dead,retry,scheduledSms,activeShipping]=await Promise.all([
      this.prisma.eventDelivery.count({where:{status:'DEAD'}}),
      this.prisma.eventDelivery.count({where:{status:'RETRY'}}),
      this.prisma.messageRecord.count({where:{channel:{equals:'SMS',mode:'insensitive'},status:'SCHEDULED'}}),
      this.prisma.shippingShipment.count({where:{provider:{not:'MANUAL'},trackingCode:{not:null},status:{notIn:['DELIVERED','CANCELLED','RETURNED']}}}),
    ]);
    return {deadWebhooks:dead,retryWebhooks:retry,scheduledSms,activeShipping};
  }

  async retryDeadWebhooks(limit=50){
    const rows=await this.prisma.eventDelivery.findMany({where:{status:'DEAD'},orderBy:{updatedAt:'asc'},take:this.batchLimit(limit,50),select:{id:true}});
    if(rows.length)await this.prisma.eventDelivery.updateMany({where:{id:{in:rows.map(x=>x.id)},status:'DEAD'},data:{status:'RETRY',nextAttemptAt:new Date(),lockUntil:null,lastError:null}});
    return {retried:rows.length};
  }

  async processAll(limit=50){
    const safe=this.batchLimit(limit,50);
    const results=await Promise.allSettled([
      this.events.processBatch(Math.min(100,safe)),
      this.processShipping(Math.min(100,safe)),
      this.processScheduledSms(safe),
      this.email.processMarketing(Math.min(safe,20)),
      this.processGrowthAutomations(Math.min(safe,100)),
      this.cleanupTransientData(),
      String(process.env.TICARTI_CELL_CODE||'primary')==='primary'?this.provisioning.reconcilePending(2):Promise.resolve({processed:0,results:[],skipped:'non-primary-cell'}),
    ]);
    const [webhooks,shipping,sms,marketingEmail,growthAutomations,cleanup,provisioning]=results.map((result)=>result.status==='fulfilled'?result.value:{failed:1,error:'Worker stage failed; see service logs'});
    return {ok:results.every(x=>x.status==='fulfilled'),webhooks,shipping,sms,marketingEmail,growthAutomations,cleanup,provisioning,processedAt:new Date().toISOString()};
  }

  async processGrowthAutomations(limit=100){
    const safe=this.batchLimit(limit,100);
    const stores=await this.prisma.marketingAutomation.findMany({where:{enabled:true},distinct:['storeId'],select:{storeId:true},take:100});
    let materialized=0,processed=0,completed=0,failed=0;
    for(const row of stores){
      try{
        const result:any=await this.growth.processAutomationRuns(row.storeId,row.storeId,Math.max(1,Math.ceil(safe/Math.max(1,stores.length))));
        materialized+=Number(result?.materialized||0);processed+=Number(result?.processed||0);completed+=Number(result?.completed||0);failed+=Number(result?.failed||0);
      }catch{failed++;}
    }
    return{stores:stores.length,materialized,processed,completed,failed};
  }

  async processShipping(limit=25){
    const safe=Math.min(100,this.batchLimit(limit,25));const scan=Math.min(500,Math.max(safe,safe*10));
    const rows=await this.prisma.shippingShipment.findMany({where:{provider:{not:'MANUAL'},trackingCode:{not:null},status:{notIn:['DELIVERED','CANCELLED','RETURNED']}},orderBy:{updatedAt:'asc'},take:scan,select:{id:true,storeId:true,metadata:true,updatedAt:true}});
    const selected=await this.fairTenantRows(rows,safe);const staleBefore=Date.now()-Math.max(5,Number(process.env.SHIPPING_TRACKING_INTERVAL_MINUTES||30))*60_000;let processed=0,failed=0,skipped=0;
    await this.parallel(selected,Math.max(1,Math.min(24,Number(process.env.SHIPPING_WORKER_CONCURRENCY||8)||8)),async row=>{const meta:any=row.metadata&&typeof row.metadata==='object'?row.metadata:{};const last=Date.parse(String(meta.lastSyncedAt||''));if(Number.isFinite(last)&&last>staleBefore){skipped++;return}try{await this.shipping.syncShipment(row.storeId,row.id);processed++}catch{failed++}});
    return {processed,failed,skipped,scanned:rows.length,tenants:new Set(selected.map(x=>x.storeId)).size};
  }

  async processScheduledSms(limit=50){
    const safe=this.batchLimit(limit,50);const scan=Math.min(500,Math.max(safe,safe*10));
    const candidates=await this.prisma.messageRecord.findMany({where:{channel:{in:['SMS','WHATSAPP'],mode:'insensitive'},status:'SCHEDULED',storeId:{not:null}},orderBy:{createdAt:'asc'},take:scan});
    const selected=await this.fairTenantRows(candidates,safe);let queued=0,skipped=0,failed=0;
    for(const row of selected){const payload:any=row.payload&&typeof row.payload==='object'?row.payload:{};const scheduleAt=Date.parse(String(payload.scheduleAt||payload.sendAt||''));if(Number.isFinite(scheduleAt)&&scheduleAt>Date.now()){skipped++;continue}const claimed=await this.prisma.messageRecord.updateMany({where:{id:row.id,status:'SCHEDULED'},data:{status:'PENDING',error:null}});if(!claimed.count)continue;try{if(row.storeId){const channel=String(row.channel||'SMS').toLowerCase();await this.events.publish(row.storeId,`messaging.${channel}.dispatch_requested`,{messageRecordId:row.id,provider:row.provider,recipient:row.recipient,template:row.template,payload},{resourceType:'MessageRecord',resourceId:row.id});}queued++}catch(e:any){failed++;await this.prisma.messageRecord.update({where:{id:row.id},data:{status:'FAILED',error:String(e?.message||'SMS dispatch enqueue failed').slice(0,1000)}})}}
    return {queued,skipped,failed,scanned:candidates.length,tenants:new Set(selected.map(x=>x.storeId)).size};
  }
  async cleanupTransientData(){
    const visitorBefore=new Date(Date.now()-24*60*60*1000);
    const deliveredBefore=new Date(Date.now()-180*24*60*60*1000);
    const completedBefore=new Date(Date.now()-180*24*60*60*1000);
    const [visitors,deliveries,outbox]=await this.prisma.$transaction([
      this.prisma.liveVisitorSession.deleteMany({where:{lastSeenAt:{lt:visitorBefore}}}),
      this.prisma.eventDelivery.deleteMany({where:{status:{in:['DELIVERED','CANCELLED']},updatedAt:{lt:deliveredBefore}}}),
      this.prisma.eventOutbox.deleteMany({where:{status:'COMPLETED',processedAt:{lt:completedBefore},deliveries:{none:{}}}}),
    ]);
    return {visitors:visitors.count,deliveries:deliveries.count,outbox:outbox.count};
  }

}
