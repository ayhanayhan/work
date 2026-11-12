import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CapacityPlanDto } from './capacity-planner.dto';

function envKey(prefix:string,key:string){return `${prefix}_${String(key).toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'')}`}

@Injectable()
export class CapacityPlannerService {
  constructor(private readonly prisma: PrismaService) {}

  plan(input:CapacityPlanDto={}) {
    const standardTenants=Math.max(1,Number(input.standardTenants??10000));
    const highVolumeTenants=Math.max(0,Number(input.highVolumeTenants??25));
    const standardPerCell=Math.max(250,Number(input.standardPerCell??2500));
    const highVolumePerCell=Math.max(1,Number(input.highVolumePerCell??5));
    const queueShards=Math.max(1,Math.min(128,Number(input.queueShards??16)));
    const dedicatedHighVolume=Boolean(input.dedicatedHighVolume??false);
    const standardCells=Math.ceil(standardTenants/standardPerCell);
    const highCells=highVolumeTenants?Math.ceil(highVolumeTenants/(dedicatedHighVolume?1:highVolumePerCell)):0;
    const cells:any[]=[];
    for(let i=1;i<=standardCells;i++) cells.push({code:`standard-${i}`,class:'STANDARD',databaseMode:'SHARED',databasePoolKey:`standard_${i}`,redisPoolKey:`standard_${i}`,redisNamespace:`ticarti-s${i}`,queueShardCount:queueShards,maxTenants:standardPerCell,targetTenants:Math.min(standardPerCell,Math.max(0,standardTenants-(i-1)*standardPerCell))});
    for(let i=1;i<=highCells;i++) cells.push({code:`hv-${i}`,class:'HIGH_VOLUME',databaseMode:dedicatedHighVolume?'DEDICATED':'SHARED',databasePoolKey:`hv_${i}`,redisPoolKey:`hv_${i}`,redisNamespace:`ticarti-hv${i}`,queueShardCount:Math.max(queueShards,16),maxTenants:dedicatedHighVolume?1:highVolumePerCell,targetTenants:Math.min(dedicatedHighVolume?1:highVolumePerCell,Math.max(0,highVolumeTenants-(i-1)*(dedicatedHighVolume?1:highVolumePerCell)))});
    return {input:{standardTenants,highVolumeTenants,standardPerCell,highVolumePerCell,queueShards,dedicatedHighVolume},summary:{standardCells,highVolumeCells:highCells,totalCells:cells.length,totalTenants:standardTenants+highVolumeTenants},cells};
  }

  async apply(input:CapacityPlanDto={}) {
    const plan=this.plan(input);
    const existing=await this.prisma.control().infrastructureCell.findMany({select:{id:true,code:true}});
    const byCode=new Map(existing.map(x=>[x.code,x]));
    const rows=[];
    for(const cell of plan.cells){
      const data={region:'europe-west1',status:'DRAINING' as const,databasePoolKey:cell.databasePoolKey,databaseMode:cell.databaseMode as 'SHARED'|'DEDICATED',redisPoolKey:cell.redisPoolKey,redisNamespace:cell.redisNamespace,queueShardCount:cell.queueShardCount,maxTenants:cell.maxTenants,metadata:{managedBy:'capacity-planner',class:cell.class,targetTenants:cell.targetTenants,provisioning:{status:'PLANNED',phase:'PLANNED'}}};
      rows.push(byCode.has(cell.code)?await this.prisma.control().infrastructureCell.update({where:{code:cell.code},data}):await this.prisma.control().infrastructureCell.create({data:{code:cell.code,...data}}));
    }
    return {plan,applied:rows.map((r:any)=>({code:r.code,id:r.id,databasePoolKey:r.databasePoolKey,redisPoolKey:r.redisPoolKey,databaseConfigured:this.prisma.databasePoolConfigured(r.databasePoolKey),databaseEnv:envKey('DATABASE_URL',r.databasePoolKey),redisEnv:envKey('REDIS_URL',r.redisPoolKey)}))};
  }

  async distributionPreview(input:CapacityPlanDto={}){
    const plan=this.plan(input);
    const [standard,high]=await Promise.all([
      this.prisma.control().tenantPlacement.findMany({where:{workloadClass:{in:['STANDARD','BUSY']}},select:{tenantId:true,workloadClass:true},orderBy:{tenantId:'asc'},take:Math.min(plan.input.standardTenants,50000)}),
      this.prisma.control().tenantPlacement.findMany({where:{workloadClass:{in:['HIGH_VOLUME','DEDICATED']}},select:{tenantId:true,workloadClass:true},orderBy:{tenantId:'asc'},take:Math.min(plan.input.highVolumeTenants,10000)})
    ]);
    const stdCells=plan.cells.filter((c:any)=>c.class==='STANDARD');const hvCells=plan.cells.filter((c:any)=>c.class==='HIGH_VOLUME');
    return {plan,assignments:{standard:standard.map((t,i)=>({...t,targetCell:stdCells.length?stdCells[i%stdCells.length].code:null})),highVolume:high.map((t,i)=>({...t,targetCell:hvCells.length?hvCells[i%hvCells.length].code:null}))},note:'Preview only. Existing tenant placements are not moved automatically; use the migration engine for safe copy/verify/cutover.'};
  }
}
