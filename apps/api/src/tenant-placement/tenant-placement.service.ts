import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type WorkloadClass = 'STANDARD'|'BUSY'|'HIGH_VOLUME'|'DEDICATED';
export type IsolationLevel = 'SHARED'|'ISOLATED_WORKERS'|'DEDICATED_CELL';

export type TenantRuntimePolicy = {
  tenantId:string;
  cellCode:string;
  cellStatus:string;
  databasePoolKey:string;
  redisPoolKey:string;
  redisNamespace:string;
  apiBaseUrl:string|null;
  databaseMode:string;
  routingVersion:number;
  workloadClass:WorkloadClass;
  isolationLevel:IsolationLevel;
  queueShard:number;
  queueShardCount:number;
  maxConcurrentJobs:number;
  webhookRatePerSecond:number;
  priority:number;
  queueName:string;
  writeBlocked:boolean;
};

const DEFAULTS:Record<WorkloadClass,{maxConcurrentJobs:number;webhookRatePerSecond:number;priority:number;isolationLevel:IsolationLevel}>={
  STANDARD:{maxConcurrentJobs:2,webhookRatePerSecond:20,priority:100,isolationLevel:'SHARED'},
  BUSY:{maxConcurrentJobs:4,webhookRatePerSecond:50,priority:80,isolationLevel:'ISOLATED_WORKERS'},
  HIGH_VOLUME:{maxConcurrentJobs:8,webhookRatePerSecond:100,priority:50,isolationLevel:'ISOLATED_WORKERS'},
  DEDICATED:{maxConcurrentJobs:16,webhookRatePerSecond:250,priority:20,isolationLevel:'DEDICATED_CELL'},
};

function stableShard(input:string,count:number){
  let h=2166136261;
  for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0)%Math.max(1,count);
}

@Injectable()
export class TenantPlacementService{
  private runtimeCache=new Map<string,{expires:number,value:TenantRuntimePolicy}>();
  constructor(private readonly prisma:PrismaService){}

  private runtimeFromRow(tenantId:string,row:any):TenantRuntimePolicy{
    const workload=(String(row?.workloadClass||'STANDARD').toUpperCase() as WorkloadClass);
    const d=DEFAULTS[workload]||DEFAULTS.STANDARD;
    const cell=row?.cell||{code:'primary',status:'ACTIVE',databasePoolKey:'primary',databaseMode:'SHARED',apiBaseUrl:null,redisPoolKey:'primary',redisNamespace:'ticarti',queueShardCount:Number(process.env.TENANT_QUEUE_SHARDS||8)||8};
    const shardCount=Math.max(1,Math.min(128,Number(cell.queueShardCount||8)||8));
    const queueShard=row?.queueShard===null||row?.queueShard===undefined?stableShard(tenantId,shardCount):Math.max(0,Number(row.queueShard)||0)%shardCount;
    const isolation=(String(row?.isolationLevel||d.isolationLevel).toUpperCase() as IsolationLevel);
    const lane=workload.toLowerCase().replace('_','-');
    return {
      tenantId,
      cellCode:String(cell.code||'primary'),
      cellStatus:String(cell.status||'ACTIVE'),
      databasePoolKey:String(cell.databasePoolKey||'primary'),
      databaseMode:String(cell.databaseMode||'SHARED'),
      apiBaseUrl:cell.apiBaseUrl?String(cell.apiBaseUrl).replace(/\/$/,''):null,
      redisPoolKey:String(cell.redisPoolKey||'primary'),
      redisNamespace:String(cell.redisNamespace||'ticarti'),
      routingVersion:Math.max(1,Number(row?.version||1)||1),
      workloadClass:workload,
      isolationLevel:isolation,
      queueShard,
      queueShardCount:shardCount,
      maxConcurrentJobs:Math.max(1,Math.min(64,Number(row?.maxConcurrentJobs||d.maxConcurrentJobs)||d.maxConcurrentJobs)),
      webhookRatePerSecond:Math.max(1,Math.min(2000,Number(row?.webhookRatePerSecond||d.webhookRatePerSecond)||d.webhookRatePerSecond)),
      priority:Math.max(1,Math.min(1000,Number(row?.priority||d.priority)||d.priority)),
      queueName:`${String(cell.redisNamespace||'ticarti')}-operations-${String(cell.code||'primary')}-${lane}${String(process.env.TENANT_QUEUE_PHYSICAL_SHARDS||'').toLowerCase()==='true'?`-s${queueShard}`:''}`,
      writeBlocked:Boolean((row?.metadata as any)?.migrationWriteFreeze),
    };
  }

  async resolve(tenantId:string):Promise<TenantRuntimePolicy>{
    const cached=this.runtimeCache.get(tenantId);if(cached&&cached.expires>Date.now())return cached.value;
    const row=await this.prisma.control().tenantPlacement.findUnique({where:{tenantId},include:{cell:true}});
    const value=this.runtimeFromRow(tenantId,row);this.runtimeCache.set(tenantId,{expires:Date.now()+60_000,value});
    if(this.runtimeCache.size>20_000)for(const [key,item] of this.runtimeCache)if(item.expires<=Date.now())this.runtimeCache.delete(key);
    return value;
  }

  async resolveMany(tenantIds:string[]):Promise<Map<string,TenantRuntimePolicy>>{
    const unique=Array.from(new Set(tenantIds.filter(Boolean)));
    const rows=unique.length?await this.prisma.control().tenantPlacement.findMany({where:{tenantId:{in:unique}},include:{cell:true}}):[];
    const byId=new Map(rows.map(row=>[row.tenantId,row]));
    return new Map(unique.map(id=>[id,this.runtimeFromRow(id,byId.get(id))]));
  }

  async ensureDefault(tenantId:string){
    const cell=await this.prisma.control().infrastructureCell.findUnique({where:{code:'primary'}});
    if(!cell)throw new BadRequestException('Primary infrastructure cell is missing');
    return this.prisma.control().tenantPlacement.upsert({
      where:{tenantId},
      create:{tenantId,cellId:cell.id,workloadClass:'STANDARD',isolationLevel:'SHARED',maxConcurrentJobs:2,webhookRatePerSecond:20,priority:100},
      update:{},
      include:{cell:true},
    });
  }

  async listCells(){
    return this.prisma.control().infrastructureCell.findMany({include:{_count:{select:{placements:true}}},orderBy:[{status:'asc'},{code:'asc'}]});
  }

  async listPlacements(input:{q?:string;take?:number;cursor?:string}={}){
    const take=Math.max(1,Math.min(200,Number(input.take||100)||100));
    const q=String(input.q||'').trim();
    const rows=await this.prisma.control().tenantPlacement.findMany({
      where:q?{tenant:{OR:[{name:{contains:q,mode:'insensitive'}},{slug:{contains:q,mode:'insensitive'}}]}}:undefined,
      include:{cell:true,tenant:{select:{id:true,name:true,slug:true,status:true}}},
      orderBy:[{updatedAt:'desc'},{id:'desc'}],take:take+1,
      ...(input.cursor?{cursor:{id:input.cursor},skip:1}:{}),
    });
    const hasMore=rows.length>take;const items=hasMore?rows.slice(0,take):rows;
    return{items,nextCursor:hasMore?items[items.length-1]?.id:null};
  }

  async updatePlacement(tenantId:string,input:{cellCode?:string;workloadClass?:WorkloadClass;isolationLevel?:IsolationLevel;queueShard?:number|null;maxConcurrentJobs?:number;webhookRatePerSecond?:number;priority?:number}){
    const existing=await this.ensureDefault(tenantId);
    const workload=(input.workloadClass||existing.workloadClass) as WorkloadClass;
    const d=DEFAULTS[workload]||DEFAULTS.STANDARD;
    let cellId=existing.cellId;
    if(input.cellCode){
      const cell=await this.prisma.control().infrastructureCell.findUnique({where:{code:input.cellCode}});
      if(!cell||cell.status==='DISABLED')throw new BadRequestException('Target infrastructure cell is unavailable');
      if(cell.id!==existing.cellId&&cell.databaseMode==='DEDICATED')throw new BadRequestException('Dedicated cell moves must use the migration/cutover workflow');
      cellId=cell.id;
    }
    const isolation=(input.isolationLevel||d.isolationLevel) as IsolationLevel;
    const updated=await this.prisma.control().tenantPlacement.update({where:{tenantId},data:{
      cellId,
      workloadClass:workload,
      isolationLevel:isolation,
      queueShard:input.queueShard===undefined?existing.queueShard:input.queueShard,
      maxConcurrentJobs:input.maxConcurrentJobs===undefined?d.maxConcurrentJobs:Math.max(1,Math.min(64,input.maxConcurrentJobs)),
      webhookRatePerSecond:input.webhookRatePerSecond===undefined?d.webhookRatePerSecond:Math.max(1,Math.min(2000,input.webhookRatePerSecond)),
      priority:input.priority===undefined?d.priority:Math.max(1,Math.min(1000,input.priority)),
      version:{increment:1},movedAt:cellId!==existing.cellId?new Date():existing.movedAt,
    },include:{cell:true,tenant:{select:{id:true,name:true,slug:true}}}});
    this.runtimeCache.delete(tenantId);return updated;
  }
  async saveCell(code:string|undefined,input:{code?:string;region?:string;status?:'ACTIVE'|'DRAINING'|'READ_ONLY'|'DISABLED';databasePoolKey?:string;databaseMode?:'SHARED'|'DEDICATED';apiBaseUrl?:string|null;redisPoolKey?:string;redisNamespace?:string;queueShardCount?:number;maxTenants?:number}){
    const normalized=String(code||input.code||'').trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9-]{1,31}$/.test(normalized))throw new BadRequestException('Invalid cell code');
    const clean=(value:string)=>String(value).trim().replace(/[^a-zA-Z0-9_-]/g,'');
    if(code){
      const data:any={};
      if(input.region!==undefined)data.region=String(input.region).trim();
      if(input.status!==undefined)data.status=input.status;
      if(input.databasePoolKey!==undefined)data.databasePoolKey=String(input.databasePoolKey).trim().slice(0,80);
      if(input.databaseMode!==undefined)data.databaseMode=input.databaseMode;
      if(input.apiBaseUrl!==undefined)data.apiBaseUrl=this.cleanApiBaseUrl(input.apiBaseUrl);
      if(input.redisPoolKey!==undefined)data.redisPoolKey=String(input.redisPoolKey).trim().slice(0,80)||'primary';
      if(input.redisNamespace!==undefined)data.redisNamespace=clean(input.redisNamespace).slice(0,40)||'ticarti';
      if(input.queueShardCount!==undefined)data.queueShardCount=Math.max(1,Math.min(128,Number(input.queueShardCount)||8));
      if(input.maxTenants!==undefined)data.maxTenants=Math.max(1,Math.min(100000,Number(input.maxTenants)||5000));
      const row=await this.prisma.control().infrastructureCell.update({where:{code:normalized},data});this.runtimeCache.clear();return row;
    }
    const row=await this.prisma.control().infrastructureCell.create({data:{code:normalized,region:String(input.region||'europe-west1').trim(),status:input.status||'ACTIVE',databasePoolKey:String(input.databasePoolKey||normalized).trim().slice(0,80),databaseMode:input.databaseMode||'SHARED',apiBaseUrl:this.cleanApiBaseUrl(input.apiBaseUrl),redisPoolKey:String(input.redisPoolKey||normalized||'primary').trim().slice(0,80),redisNamespace:clean(input.redisNamespace||'ticarti').slice(0,40)||'ticarti',queueShardCount:Math.max(1,Math.min(128,Number(input.queueShardCount||8)||8)),maxTenants:Math.max(1,Math.min(100000,Number(input.maxTenants||5000)||5000))}});this.runtimeCache.clear();return row;
  }


  private cleanApiBaseUrl(value:unknown){const raw=String(value||'').trim().replace(/\/$/,'');if(!raw)return null;let u:URL;try{u=new URL(raw)}catch{throw new BadRequestException('Invalid cell API URL')}if(!['https:','http:'].includes(u.protocol))throw new BadRequestException('Invalid cell API URL');if(process.env.NODE_ENV==='production'&&u.protocol!=='https:')throw new BadRequestException('Cell API URL must use HTTPS in production');return u.origin+(u.pathname==='/'?'':u.pathname.replace(/\/$/,''))}

  async resolveByStoreKey(storeKey:string):Promise<TenantRuntimePolicy|null>{
    const key=String(storeKey||'').trim().toLowerCase();if(!key)return null;
    const tenant=await this.prisma.control().tenant.findFirst({where:{OR:[{slug:key},{publicSlug:key},{domain:key}]},select:{id:true}});
    return tenant?this.resolve(tenant.id):null;
  }

  async cellReadiness(){
    const cells=await this.listCells();
    return cells.map((cell:any)=>({code:cell.code,status:cell.status,databaseMode:cell.databaseMode,databasePoolKey:cell.databasePoolKey,databaseConfigured:this.prisma.databasePoolConfigured(cell.databasePoolKey),redisPoolKey:cell.redisPoolKey,redisConfigured:this.redisConfigured(cell.redisPoolKey),apiBaseUrl:cell.apiBaseUrl||null,placements:cell._count?.placements||0,maxTenants:cell.maxTenants}));
  }
  private redisConfigured(poolKey:string){const normalized=String(poolKey||'primary').trim();if(!normalized||normalized==='primary')return !!String(process.env.REDIS_URL||'').trim();const key='REDIS_URL_'+normalized.toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');return !!String(process.env[key]||'').trim()}

  invalidate(tenantId:string){this.runtimeCache.delete(tenantId)}

  async runtime(tenantId:string){return this.resolve(tenantId)}

  async overview(){const [cells,page,tenants,highVolume,dedicated]=await Promise.all([this.listCells(),this.listPlacements({take:100}),this.prisma.control().tenantPlacement.count(),this.prisma.control().tenantPlacement.count({where:{workloadClass:{in:['HIGH_VOLUME','DEDICATED']}}}),this.prisma.control().tenantPlacement.count({where:{isolationLevel:'DEDICATED_CELL'}})]);return{cells,placements:page.items,nextCursor:page.nextCursor,summary:{cells:cells.length,tenants,highVolume,dedicated}}}

  async assertLocal(tenantId:string){
    const policy=await this.resolve(tenantId);
    if(String(process.env.CELL_ROUTING_ENFORCE||'').toLowerCase()!=='true')return policy;
    const local=String(process.env.TICARTI_CELL_CODE||'primary').trim();
    if(policy.cellCode!==local)throw new ServiceUnavailableException(`Tenant is assigned to cell ${policy.cellCode}`);
    if(['DISABLED','READ_ONLY'].includes(policy.cellStatus))throw new ServiceUnavailableException(`Tenant cell is ${policy.cellStatus}`);
    return policy;
  }

}
