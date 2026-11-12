import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { PrismaService } from '../prisma/prisma.service';
import { eventPatternMatches, normalizeEventName } from './event-topics';
import {BackgroundJobsService} from '../background-jobs/background-jobs.service';
import {TenantPlacementService} from '../tenant-placement/tenant-placement.service';
import {CacheService} from '../cache/cache.service';
import { currentTraceId } from '../common/trace-context';

function isPrivateIp(address:string){
  if(address==='::1'||address==='0:0:0:0:0:0:0:1')return true;
  if(address.startsWith('fc')||address.startsWith('fd')||address.startsWith('fe80:'))return true;
  const p=address.split('.').map(Number);if(p.length!==4||p.some(Number.isNaN))return false;const[a,b]=p;
  return a===10||a===127||a===0||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127);
}

@Injectable()
export class EventOutboxService{
  constructor(private prisma:PrismaService,private jobs:BackgroundJobsService,private placements:TenantPlacementService,private cache:CacheService){}

  private key(){const raw=process.env.INTEGRATION_ENCRYPTION_KEY||'';if(process.env.NODE_ENV==='production'&&raw.length<32)throw new BadRequestException('INTEGRATION_ENCRYPTION_KEY must be configured');return createHash('sha256').update(raw||process.env.JWT_SECRET||'development-only-key').digest()}
  private encryptSecret(secret:string){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',this.key(),iv);const data=Buffer.concat([c.update(secret,'utf8'),c.final()]);return{v:1,alg:'aes-256-gcm',iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:data.toString('base64')}}
  private decryptSecret(box:any){if(!box||box.v!==1||box.alg!=='aes-256-gcm')throw new Error('Invalid webhook secret');const d=createDecipheriv('aes-256-gcm',this.key(),Buffer.from(box.iv,'base64'));d.setAuthTag(Buffer.from(box.tag,'base64'));return Buffer.concat([d.update(Buffer.from(box.data,'base64')),d.final()]).toString('utf8')}

  private async resolveSafeUrl(raw:string){let u:URL;try{u=new URL(raw)}catch{throw new BadRequestException('Invalid webhook URL')}if(!['https:','http:'].includes(u.protocol))throw new BadRequestException('Webhook must use HTTP(S)');if(process.env.NODE_ENV==='production'&&u.protocol!=='https:')throw new BadRequestException('Production webhook URL must use HTTPS');if(u.username||u.password)throw new BadRequestException('Webhook URL cannot contain credentials');const host=u.hostname.replace(/^\[|\]$/g,'');const addresses:any[]=isIP(host)?[{address:host,family:isIP(host)}]:await lookup(host,{all:true,verbatim:true}).catch(()=>[]);if(!addresses.length)throw new BadRequestException('Webhook host could not be resolved');if(process.env.WEBHOOK_ALLOW_PRIVATE!=='true'&&addresses.some(x=>isPrivateIp(x.address)))throw new BadRequestException('Private/local webhook targets are blocked');const selected=addresses.find(x=>!isPrivateIp(x.address))||addresses[0];return{url:u,address:String(selected.address),family:Number(selected.family||isIP(String(selected.address))||4)}}
  async assertSafeUrl(raw:string){await this.resolveSafeUrl(raw)}
  private async postPinnedWebhook(raw:string,headers:Record<string,string>,body:string){const target=await this.resolveSafeUrl(raw);const u=target.url;const transport=u.protocol==='https:'?httpsRequest:httpRequest;return await new Promise<{ok:boolean;status:number;text:string}>((resolve,reject)=>{const req=transport(u,{method:'POST',headers,timeout:10_000,servername:u.hostname,lookup:((_hostname:any,_options:any,cb:any)=>cb(null,target.address,target.family)) as any},res=>{const chunks:Buffer[]=[];let size=0;res.on('data',(chunk:any)=>{if(size<1000){const b=Buffer.from(chunk);chunks.push(b.subarray(0,Math.max(0,1000-size)));size+=b.length}});res.on('end',()=>resolve({ok:Number(res.statusCode)>=200&&Number(res.statusCode)<300,status:Number(res.statusCode||0),text:Buffer.concat(chunks).toString('utf8').slice(0,1000)}))});req.on('timeout',()=>req.destroy(new Error('Webhook request timeout')));req.on('error',reject);req.end(body)})}


  private normalizeEvents(events:unknown):string[]{if(!Array.isArray(events)||!events.length||events.length>100)throw new BadRequestException('Webhook event list is invalid');try{return Array.from(new Set<string>(events.map(value=>normalizeEventName(value))))}catch{throw new BadRequestException('Webhook event name is invalid')}}

  async listAppSubscriptions(auth:any){return this.prisma.appWebhookSubscription.findMany({where:{tenantId:auth.tenantId,appId:auth.appId,installationId:auth.installationId},select:{id:true,url:true,events:true,apiVersion:true,enabled:true,failureCount:true,lastSuccessAt:true,lastFailureAt:true,disabledAt:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'desc'}})}

  async createAppSubscription(auth:any,body:any){await this.assertSafeUrl(String(body?.url||''));const events=this.normalizeEvents(body?.events);const secret=randomBytes(32).toString('base64url');const row=await this.prisma.appWebhookSubscription.create({data:{tenantId:auth.tenantId,appId:auth.appId,installationId:auth.installationId,url:String(body.url),events,apiVersion:String(body?.apiVersion||'2026-09').slice(0,32),secretBox:this.encryptSecret(secret) as any}});return{id:row.id,url:row.url,events:row.events,apiVersion:row.apiVersion,enabled:row.enabled,secret}}

  async updateAppSubscription(auth:any,id:string,body:any){const row=await this.prisma.appWebhookSubscription.findFirst({where:{id,tenantId:auth.tenantId,appId:auth.appId,installationId:auth.installationId}});if(!row)throw new BadRequestException('Webhook subscription not found');const data:any={};if(body?.url!==undefined){await this.assertSafeUrl(String(body.url));data.url=String(body.url)}if(body?.events!==undefined)data.events=this.normalizeEvents(body.events);if(body?.enabled!==undefined){data.enabled=!!body.enabled;data.disabledAt=body.enabled?null:new Date();if(body.enabled)data.failureCount=0}if(body?.apiVersion!==undefined)data.apiVersion=String(body.apiVersion).slice(0,32);return this.prisma.appWebhookSubscription.update({where:{id},data,select:{id:true,url:true,events:true,apiVersion:true,enabled:true,failureCount:true,lastSuccessAt:true,lastFailureAt:true,disabledAt:true,updatedAt:true}})}

  async rotateAppSubscriptionSecret(auth:any,id:string){const row=await this.prisma.appWebhookSubscription.findFirst({where:{id,tenantId:auth.tenantId,appId:auth.appId,installationId:auth.installationId}});if(!row)throw new BadRequestException('Webhook subscription not found');const secret=randomBytes(32).toString('base64url');await this.prisma.appWebhookSubscription.update({where:{id},data:{secretBox:this.encryptSecret(secret) as any}});return{id,secret}}

  async deleteAppSubscription(auth:any,id:string){const row=await this.prisma.appWebhookSubscription.findFirst({where:{id,tenantId:auth.tenantId,appId:auth.appId,installationId:auth.installationId},select:{id:true}});if(!row)throw new BadRequestException('Webhook subscription not found');await this.prisma.appWebhookSubscription.delete({where:{id}});return{ok:true}}

  async publish(tenantId:string,eventRaw:string,payload:unknown,meta?:{resourceType?:string;resourceId?:string;occurredAt?:Date}){
    let event:string;try{event=normalizeEventName(eventRaw)}catch{throw new BadRequestException('Invalid event name')}
    let json:any;try{json=JSON.parse(JSON.stringify(payload??null))}catch{throw new BadRequestException('Event payload must be JSON serializable')}
    if(Buffer.byteLength(JSON.stringify(json),'utf8')>512*1024)throw new BadRequestException('Event payload exceeds 512 KB');
    const [apps,legacy]=await Promise.all([
      this.prisma.appWebhookSubscription.findMany({where:{tenantId,enabled:true},select:{id:true,events:true}}),
      this.prisma.webhookEndpoint.findMany({where:{tenantId,enabled:true},select:{id:true,events:true}}),
    ]);
    const destinations=[...apps.filter(x=>x.events.some(p=>eventPatternMatches(p,event))).map(x=>({type:'APP',id:x.id})),...legacy.filter(x=>x.events.some(p=>eventPatternMatches(p,event))).map(x=>({type:'LEGACY',id:x.id}))];
    const outbox=await this.prisma.$transaction(async tx=>{const row=await tx.eventOutbox.create({data:{tenantId,event,traceId:currentTraceId(),payload:json,resourceType:meta?.resourceType||null,resourceId:meta?.resourceId||null,occurredAt:meta?.occurredAt||new Date(),status:destinations.length?'PENDING':'COMPLETED',processedAt:destinations.length?null:new Date()}});if(destinations.length)await tx.eventDelivery.createMany({data:destinations.map(d=>({outboxId:row.id,destinationType:d.type,destinationId:d.id,idempotencyKey:`${row.id}:${d.type}:${d.id}`}))});return row});
    // Durable DB outbox is drained by OperationsWorker; never perform external delivery in the request process.
    if(destinations.length){const route=await this.placements.resolve(tenantId);void this.jobs.enqueue('OUTBOX_DRAIN',{outboxId:outbox.id,tenantId,queueShard:route.queueShard,workloadClass:route.workloadClass},`outbox-${outbox.id}`,{queueName:route.queueName,priority:route.priority,redisPoolKey:route.redisPoolKey});}
    return{id:outbox.id,event:outbox.event,status:outbox.status,destinations:destinations.length};
  }

  private retryDelaySeconds(attempt:number){return Math.min(3600,5*Math.pow(2,Math.max(0,attempt-1)))+Math.floor(Math.random()*4)}

  private async resolveDestination(d:any){if(d.destinationType==='APP'){const s=await this.prisma.appWebhookSubscription.findUnique({where:{id:d.destinationId}});if(!s||!s.enabled)return null;return{url:s.url,secret:this.decryptSecret(s.secretBox),apiVersion:s.apiVersion,kind:'APP'}}const e=await this.prisma.webhookEndpoint.findUnique({where:{id:d.destinationId}});if(!e||!e.enabled)return null;return{url:e.url,secret:e.secret,apiVersion:'legacy',kind:'LEGACY'}}

  async processBatch(limit=50){
    const now=new Date();
    const safeLimit=Math.max(1,Math.min(100,limit));
    // Scan wider than the execution batch so one high-volume tenant cannot monopolize the worker.
    const scanLimit=Math.max(safeLimit,Math.min(500,safeLimit*10));
    const candidates=await this.prisma.eventDelivery.findMany({
      where:{OR:[{status:{in:['PENDING','RETRY']},nextAttemptAt:{lte:now},OR:[{lockUntil:null},{lockUntil:{lt:now}}]},{status:'PROCESSING',lockUntil:{lt:now}}]},
      include:{outbox:{select:{tenantId:true}}},
      orderBy:[{nextAttemptAt:'asc'},{createdAt:'asc'}],take:scanLimit,
    });
    const policies=await this.placements.resolveMany(candidates.map(d=>d.outbox.tenantId));
    const buckets=new Map<string,typeof candidates>();
    for(const row of candidates){const id=row.outbox.tenantId;const bucket=buckets.get(id)||[];bucket.push(row);buckets.set(id,bucket)}
    const tenantIds=Array.from(buckets.keys()).sort((a,b)=>(policies.get(a)?.priority||100)-(policies.get(b)?.priority||100));
    const selected:typeof candidates=[];const perTenant=new Map<string,number>();
    while(selected.length<safeLimit){let progressed=false;for(const tenantId of tenantIds){if(selected.length>=safeLimit)break;const bucket=buckets.get(tenantId);if(!bucket?.length)continue;const policy=policies.get(tenantId);const cap=Math.max(1,policy?.maxConcurrentJobs||2);const used=perTenant.get(tenantId)||0;if(used>=cap)continue;const row=bucket.shift();if(row){selected.push(row);perTenant.set(tenantId,used+1);progressed=true}}if(!progressed)break}
    let processed=0,failed=0;
    const globalConcurrency=Math.max(1,Math.min(32,Number(process.env.WEBHOOK_WORKER_CONCURRENCY||12)||12));
    let cursor=0;
    const run=async()=>{while(true){const index=cursor++;if(index>=selected.length)return;const d=selected[index];try{const lockUntil=new Date(Date.now()+30_000);const claimed=await this.prisma.eventDelivery.updateMany({where:{id:d.id,OR:[{status:{in:['PENDING','RETRY']},nextAttemptAt:{lte:new Date()},OR:[{lockUntil:null},{lockUntil:{lt:new Date()}}]},{status:'PROCESSING',lockUntil:{lt:new Date()}}]},data:{status:'PROCESSING',lockUntil}});if(!claimed.count)continue;processed++;await this.deliver(d.id)}catch{failed++;await this.prisma.eventDelivery.updateMany({where:{id:d.id,status:'PROCESSING'},data:{status:'RETRY',lockUntil:null,nextAttemptAt:new Date(Date.now()+60_000)}}).catch(()=>undefined)}}};
    await Promise.all(Array.from({length:Math.min(globalConcurrency,selected.length||1)},()=>run()));
    return{processed,failed,scanned:candidates.length,tenants:tenantIds.length};
  }

  private async deliver(id:string){const d=await this.prisma.eventDelivery.findUnique({where:{id},include:{outbox:true}});if(!d)return;const attempt=d.attemptCount+1;try{const policy=await this.placements.resolve(d.outbox.tenantId);const rateCount=await this.cache.incrementWindow(`tenant:${d.outbox.tenantId}:webhook-rate`,1);if(rateCount!==null&&rateCount>policy.webhookRatePerSecond){await this.prisma.eventDelivery.update({where:{id},data:{status:'RETRY',lockUntil:null,nextAttemptAt:new Date(Date.now()+1000+Math.floor(Math.random()*500)),lastError:'Tenant webhook backpressure'}});return;}const dest=await this.resolveDestination(d);if(!dest){await this.prisma.eventDelivery.update({where:{id},data:{status:'CANCELLED',attemptCount:attempt,lockUntil:null,lastError:'Destination disabled or missing'}});await this.refreshOutbox(d.outboxId);return}const body=JSON.stringify({id:d.outbox.id,deliveryId:d.id,event:d.outbox.event,apiVersion:dest.apiVersion,occurredAt:d.outbox.occurredAt.toISOString(),tenantId:d.outbox.tenantId,data:d.outbox.payload});const ts=Math.floor(Date.now()/1000).toString();const signature=createHmac('sha256',dest.secret).update(`${ts}.${body}`).digest('hex');const res=await this.postPinnedWebhook(dest.url,{'content-type':'application/json','user-agent':'Ticarti-Webhooks/2.0','x-ticarti-event':d.outbox.event,'x-ticarti-delivery-id':d.id,'x-ticarti-idempotency-key':d.idempotencyKey,'x-ticarti-timestamp':ts,'x-ticarti-signature':`v1=${signature}`},body);const snippet=res.text.slice(0,1000);if(res.ok){await this.prisma.eventDelivery.update({where:{id},data:{status:'DELIVERED',attemptCount:attempt,statusCode:res.status,responseSnippet:snippet||null,lastError:null,deliveredAt:new Date(),lockUntil:null}});if(dest.kind==='APP')await this.prisma.appWebhookSubscription.update({where:{id:d.destinationId},data:{failureCount:0,lastSuccessAt:new Date()}})}else throw Object.assign(new Error(`HTTP ${res.status}`),{statusCode:res.status,snippet})}catch(e:any){const dead=attempt>=d.maxAttempts;const next=new Date(Date.now()+this.retryDelaySeconds(attempt)*1000);await this.prisma.eventDelivery.update({where:{id},data:{status:dead?'DEAD':'RETRY',attemptCount:attempt,statusCode:Number(e?.statusCode)||null,responseSnippet:String(e?.snippet||'').slice(0,1000)||null,lastError:String(e?.message||'delivery failed').slice(0,1000),nextAttemptAt:dead?d.nextAttemptAt:next,lockUntil:null}});if(d.destinationType==='APP'){await this.prisma.appWebhookSubscription.updateMany({where:{id:d.destinationId},data:{failureCount:{increment:1},lastFailureAt:new Date()}});if(dead){const configured=Number(process.env.APP_WEBHOOK_DISABLE_AFTER_FAILURES||40);const threshold=Number.isFinite(configured)?Math.max(8,Math.min(1000,configured)):40;const subscription=await this.prisma.appWebhookSubscription.findUnique({where:{id:d.destinationId},select:{failureCount:true,enabled:true}});if(subscription?.enabled&&subscription.failureCount>=threshold){await this.prisma.appWebhookSubscription.update({where:{id:d.destinationId},data:{enabled:false,disabledAt:new Date()}})}}}}await this.refreshOutbox(d.outboxId)}

  private async refreshOutbox(outboxId:string){const grouped=await this.prisma.eventDelivery.groupBy({by:['status'],where:{outboxId},_count:{_all:true}});const counts=new Map<string,number>(grouped.map(x=>[String(x.status),Number(x._count._all||0)]));const pending=['PENDING','RETRY','PROCESSING'].some(x=>(counts.get(x)||0)>0);const delivered=(counts.get('DELIVERED')||0)>0;const dead=(counts.get('DEAD')||0)>0;const status=pending?'PROCESSING':dead?(delivered?'PARTIAL':'DEAD'):'COMPLETED';await this.prisma.eventOutbox.update({where:{id:outboxId},data:{status,processedAt:pending?null:new Date()}})}

  async retryDelivery(tenantId:string,id:string){const d=await this.prisma.eventDelivery.findFirst({where:{id,outbox:{tenantId}}});if(!d)throw new BadRequestException('Delivery not found');await this.prisma.eventDelivery.update({where:{id},data:{status:'RETRY',nextAttemptAt:new Date(),lockUntil:null}});return{ok:true}}

  async listRecent(tenantId:string){return this.prisma.eventOutbox.findMany({where:{tenantId},include:{deliveries:{select:{id:true,destinationType:true,destinationId:true,status:true,attemptCount:true,maxAttempts:true,nextAttemptAt:true,statusCode:true,lastError:true,deliveredAt:true}}},orderBy:{createdAt:'desc'},take:100})}

  assertWorkerToken(header:string){const expected=String(process.env.EVENT_WORKER_TOKEN||'');const supplied=String(header||'').replace(/^Bearer\s+/i,'');const a=Buffer.from(expected);const b=Buffer.from(supplied);if(!expected||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Invalid event worker token')}
}
