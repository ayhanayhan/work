import {Injectable,OnModuleDestroy,OnModuleInit} from '@nestjs/common';
import {Worker} from 'bullmq';
import {BackgroundJobsService} from '../background-jobs/background-jobs.service';
import {EventOutboxService} from '../webhooks/event-outbox.service';
import {TenantPlacementService} from '../tenant-placement/tenant-placement.service';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class BullMqWorkerService implements OnModuleInit,OnModuleDestroy{
  private workers:Worker[]=[];
  constructor(private readonly jobs:BackgroundJobsService,private readonly events:EventOutboxService,private readonly placements:TenantPlacementService,private readonly prisma:PrismaService){}
  async onModuleInit(){
    if(String(process.env.BACKGROUND_WORKER_ENABLED||'').toLowerCase()!=='true')return;
    const concurrency=Math.max(1,Math.min(50,Number(process.env.BACKGROUND_WORKER_CONCURRENCY||10)||10));
    const batch=Math.max(10,Math.min(100,Number(process.env.WEBHOOK_WORKER_BATCH||50)||50));
    const cellFilter=new Set(String(process.env.BACKGROUND_WORKER_CELL_CODES||process.env.TICARTI_CELL_CODE||'primary').split(',').map(x=>x.trim()).filter(Boolean));
    const laneFilter=new Set(String(process.env.BACKGROUND_WORKER_LANES||'standard,busy,high-volume,dedicated').split(',').map(x=>x.trim()).filter(Boolean));
    const cells=(await this.placements.listCells()).filter((c:any)=>c.status!=='DISABLED'&&cellFilter.has(c.code));
    const physicalShards=String(process.env.TENANT_QUEUE_PHYSICAL_SHARDS||'').toLowerCase()==='true';
    const bindings:Array<{queueName:string;cell:any}>=[];
    if(cellFilter.has('primary'))bindings.push({queueName:'ticarti-operations',cell:{code:'primary',databasePoolKey:'primary',redisPoolKey:'primary'}});
    for(const cell of cells){for(const lane of laneFilter){const base=`${cell.redisNamespace}-operations-${cell.code}-${lane}`;if(physicalShards){for(let shard=0;shard<Math.max(1,Math.min(128,cell.queueShardCount));shard++)bindings.push({queueName:`${base}-s${shard}`,cell})}else bindings.push({queueName:base,cell})}}
    const unique=new Map(bindings.map(x=>[`${x.cell.redisPoolKey||'primary'}:${x.queueName}`,x]));
    for(const {queueName,cell} of unique.values()){
      const connection=this.jobs.connectionForWorker(cell.redisPoolKey||'primary');if(!connection)continue;
      this.workers.push(new Worker(queueName,async job=>this.prisma.runInCell({cellCode:cell.code,databasePoolKey:cell.databasePoolKey||'primary',redisPoolKey:cell.redisPoolKey||'primary'},async()=>{
        if(job.name==='OUTBOX_DRAIN'||job.name==='OPERATIONS_TICK')return this.events.processBatch(batch);
        return{ignored:true};
      }),{connection,concurrency}));
    }
  }
  async onModuleDestroy(){await Promise.all(this.workers.map(worker=>worker.close().catch(()=>undefined)))}
}
