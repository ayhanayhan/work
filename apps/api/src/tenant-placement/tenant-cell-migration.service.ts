import {BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {TenantPlacementService} from './tenant-placement.service';
import {TenantDataCopyService} from './tenant-data-copy.service';

@Injectable()
export class TenantCellMigrationService{
  constructor(private readonly prisma:PrismaService,private readonly placements:TenantPlacementService,private readonly copier:TenantDataCopyService){}
  async list(tenantId?:string){return this.prisma.control().tenantCellMigration.findMany({where:tenantId?{tenantId}:undefined,include:{tenant:{select:{id:true,name:true,slug:true}},sourceCell:true,targetCell:true},orderBy:{createdAt:'desc'},take:100})}
  async plan(tenantId:string,targetCellCode:string){
    const placement=await this.placements.ensureDefault(tenantId);const target=await this.prisma.control().infrastructureCell.findUnique({where:{code:String(targetCellCode||'').trim().toLowerCase()}});if(!target||target.status==='DISABLED')throw new BadRequestException('Target cell is unavailable');if(target.id===placement.cellId)throw new BadRequestException('Tenant is already in target cell');
    const active=await this.prisma.control().tenantCellMigration.findFirst({where:{tenantId,status:{in:['PLANNED','COPYING','VERIFYING','READY_FOR_CUTOVER','CUTOVER']}},select:{id:true}});if(active)throw new ConflictException('Tenant already has an active cell migration');const used=await this.prisma.control().tenantPlacement.count({where:{cellId:target.id}});if(used>=target.maxTenants)throw new ConflictException('Target cell is at capacity');
    if(!this.prisma.databasePoolConfigured(target.databasePoolKey))throw new ServiceUnavailableException(`Database pool ${target.databasePoolKey} is not configured`);
    return this.prisma.control().tenantCellMigration.create({data:{tenantId,sourceCellId:placement.cellId,targetCellId:target.id,sourceVersion:placement.version,status:'PLANNED'},include:{sourceCell:true,targetCell:true,tenant:{select:{id:true,name:true,slug:true}}}})
  }
  async markCopying(id:string){const row=await this.get(id);if(!['PLANNED','FAILED'].includes(row.status))throw new ConflictException('Migration cannot enter COPYING from current state');return this.prisma.control().tenantCellMigration.update({where:{id},data:{status:'COPYING',startedAt:new Date(),error:null}})}

  async prepareRoutingKeys(id:string){
    const row=await this.get(id);const source=this.prisma.clientForPoolKey(row.sourceCell.databasePoolKey) as any;const control=this.prisma.control();const tenantId=row.tenantId;let media=0,carts=0,sessions=0;
    const copy=async(model:any,where:any,select:any,map:(x:any)=>any)=>{let cursor:string|undefined;let total=0;while(true){const rows=await model.findMany({where,select,orderBy:{id:'asc'},take:1000,...(cursor?{cursor:{id:cursor},skip:1}:{})});if(!rows.length)break;const data=rows.map(map);if(data.length)await control.tenantRouteKey.createMany({data,skipDuplicates:true});total+=data.length;cursor=rows[rows.length-1].id;if(rows.length<1000)break}return total};
    media=await copy(source.mediaAsset,{storeId:tenantId},{id:true},(x:any)=>({kind:'MEDIA',routeKey:x.id,tenantId}));
    carts=await copy(source.cart,{storeId:tenantId,status:'active'},{id:true,token:true},(x:any)=>({kind:'CART',routeKey:x.token,tenantId,expiresAt:new Date(Date.now()+90*86400000)}));
    sessions=await copy(source.customerSession,{customer:{storeId:tenantId},revokedAt:null,expiresAt:{gt:new Date()}},{id:true,expiresAt:true},(x:any)=>({kind:'CUSTOMER_SESSION',routeKey:x.id,tenantId,expiresAt:x.expiresAt}));
    return{media,carts,sessions};
  }


  async copyInitial(id:string){
    let row=await this.get(id);
    if(row.status==='PLANNED'||row.status==='FAILED')await this.markCopying(id);
    row=await this.get(id);
    if(!['COPYING','VERIFYING','READY_FOR_CUTOVER'].includes(row.status))throw new ConflictException('Migration cannot be copied from current state');
    const report=await this.copier.syncTenant(row.tenantId,row.sourceCell.databasePoolKey,row.targetCell.databasePoolKey,{prune:false});
    await this.prepareRoutingKeys(id);
    return report;
  }

  async deltaSync(id:string){
    const row=await this.get(id);
    if(!['COPYING','VERIFYING','READY_FOR_CUTOVER','COMPLETED'].includes(row.status))throw new ConflictException('Migration cannot be delta-synced from current state');
    return this.copier.syncTenant(row.tenantId,row.sourceCell.databasePoolKey,row.targetCell.databasePoolKey,{prune:true});
  }

  private async setWriteFreeze(tenantId:string,enabled:boolean){
    const current=await this.prisma.control().tenantPlacement.findUnique({where:{tenantId}});
    if(!current)throw new NotFoundException('Tenant placement not found');
    const metadata={...((current.metadata as any)||{})};
    if(enabled)metadata.migrationWriteFreeze=true;else delete metadata.migrationWriteFreeze;
    await this.prisma.control().tenantPlacement.update({where:{tenantId},data:{metadata}});
    this.placements.invalidate(tenantId);
  }

  async autoRun(id:string,cutover=false){
    let row=await this.get(id);
    if(row.status==='PLANNED'||row.status==='FAILED')await this.markCopying(id);
    row=await this.get(id);
    if(!['COPYING','VERIFYING','READY_FOR_CUTOVER'].includes(row.status))throw new ConflictException('Migration cannot be auto-run from current state');
    const initial=await this.copier.syncTenant(row.tenantId,row.sourceCell.databasePoolKey,row.targetCell.databasePoolKey,{prune:true});
    await this.prepareRoutingKeys(id);
    if(!cutover){const verification=await this.verify(id);return{cutover:false,initial,verification}}
    await this.setWriteFreeze(row.tenantId,true);
    try{
      const drainMs=Math.max(250,Math.min(10000,Number(process.env.TENANT_MIGRATION_DRAIN_MS||1500)||1500));
      await new Promise(resolve=>setTimeout(resolve,drainMs));
      const delta=await this.copier.syncTenant(row.tenantId,row.sourceCell.databasePoolKey,row.targetCell.databasePoolKey,{prune:true});
      await this.prepareRoutingKeys(id);
      const verification=await this.verify(id);
      if(!verification.ok)throw new ConflictException('Final migration verification failed');
      const placement=await this.cutover(id);
      return{cutover:true,initial,delta,verification,placement};
    }catch(error){await this.setWriteFreeze(row.tenantId,false).catch(()=>undefined);throw error}
  }

  async rollback(id:string){
    const row=await this.get(id);
    if(row.status!=='COMPLETED')throw new ConflictException('Only a completed migration can be rolled back');
    const current=await this.prisma.control().tenantPlacement.findUnique({where:{tenantId:row.tenantId}});
    if(!current||current.cellId!==row.targetCellId)throw new ConflictException('Tenant is no longer on migration target cell');
    await this.setWriteFreeze(row.tenantId,true);
    try{
      const drainMs=Math.max(250,Math.min(10000,Number(process.env.TENANT_MIGRATION_DRAIN_MS||1500)||1500));await new Promise(resolve=>setTimeout(resolve,drainMs));
      const reverse=await this.copier.syncTenant(row.tenantId,row.targetCell.databasePoolKey,row.sourceCell.databasePoolKey,{prune:true});
      const metadata={...((current.metadata as any)||{})};delete metadata.migrationWriteFreeze;
      const placement=await this.prisma.control().tenantPlacement.update({where:{tenantId:row.tenantId},data:{cellId:row.sourceCellId,version:{increment:1},movedAt:new Date(),metadata}});
      await this.prisma.control().tenantCellMigration.update({where:{id},data:{status:'CANCELLED',error:'Rolled back after cutover'}});
      this.placements.invalidate(row.tenantId);
      return{rolledBack:true,reverse,placement};
    }catch(error){await this.setWriteFreeze(row.tenantId,false).catch(()=>undefined);throw error}
  }

  async verify(id:string){
    const row=await this.get(id);if(!['PLANNED','COPYING','VERIFYING','FAILED','READY_FOR_CUTOVER'].includes(row.status))throw new ConflictException('Migration cannot be verified from current state');
    await this.prisma.control().tenantCellMigration.update({where:{id},data:{status:'VERIFYING',error:null}});
    try{
      const source=this.prisma.clientForPoolKey(row.sourceCell.databasePoolKey) as any;const tenantId=row.tenantId;
      const full=await this.copier.compareTenant(tenantId,row.sourceCell.databasePoolKey,row.targetCell.databasePoolKey);
      const result:any={dataPlane:full};let ok=full.ok;
      const [sourceMedia,sourceCarts,sourceSessions,mediaKeys,cartKeys,sessionKeys]=await Promise.all([source.mediaAsset.count({where:{storeId:tenantId}}),source.cart.count({where:{storeId:tenantId,status:'active'}}),source.customerSession.count({where:{customer:{storeId:tenantId},revokedAt:null,expiresAt:{gt:new Date()}}}),this.prisma.control().tenantRouteKey.count({where:{tenantId,kind:'MEDIA'}}),this.prisma.control().tenantRouteKey.count({where:{tenantId,kind:'CART'}}),this.prisma.control().tenantRouteKey.count({where:{tenantId,kind:'CUSTOMER_SESSION'}})]);
      result.routeKeys={media:{source:sourceMedia,indexed:mediaKeys,ok:mediaKeys>=sourceMedia},carts:{source:sourceCarts,indexed:cartKeys,ok:cartKeys>=sourceCarts},customerSessions:{source:sourceSessions,indexed:sessionKeys,ok:sessionKeys>=sourceSessions}};if(mediaKeys<sourceMedia||cartKeys<sourceCarts||sessionKeys<sourceSessions)ok=false;
      const next=ok?'READY_FOR_CUTOVER':'COPYING';await this.prisma.control().tenantCellMigration.update({where:{id},data:{status:next as any,verification:result,verifiedAt:ok?new Date():null,error:ok?null:'Verification counts do not match'}});return{ok,status:next,verification:result};
    }catch(error:any){await this.prisma.control().tenantCellMigration.update({where:{id},data:{status:'FAILED',error:String(error?.message||error).slice(0,1000)}}).catch(()=>undefined);throw error}
  }
  async cutover(id:string){
    const row=await this.get(id);if(row.status!=='READY_FOR_CUTOVER')throw new ConflictException('Migration must be READY_FOR_CUTOVER');if(row.targetCell.status!=='ACTIVE')throw new ConflictException('Target cell must be ACTIVE');
    const control=this.prisma.control();const result=await control.$transaction(async tx=>{const current=await tx.tenantPlacement.findUnique({where:{tenantId:row.tenantId}});if(!current)throw new NotFoundException('Tenant placement not found');if(current.version!==row.sourceVersion||current.cellId!==row.sourceCellId)throw new ConflictException('Tenant placement changed after migration was planned');await tx.tenantCellMigration.update({where:{id},data:{status:'CUTOVER',cutoverAt:new Date()}});const placement=await tx.tenantPlacement.update({where:{tenantId:row.tenantId},data:{cellId:row.targetCellId,isolationLevel:row.targetCell.databaseMode==='DEDICATED'?'DEDICATED_CELL':current.isolationLevel,version:{increment:1},movedAt:new Date(),metadata:(()=>{const m={...((current.metadata as any)||{})};delete m.migrationWriteFreeze;return m})()}});await tx.tenantCellMigration.update({where:{id},data:{status:'COMPLETED',completedAt:new Date()}});return placement});
    this.placements.invalidate(row.tenantId);return result;
  }
  async fail(id:string,message:string){await this.get(id);return this.prisma.control().tenantCellMigration.update({where:{id},data:{status:'FAILED',error:String(message||'Migration failed').slice(0,1000)}})}
  async cancel(id:string){const row=await this.get(id);if(['COMPLETED','CUTOVER'].includes(row.status))throw new ConflictException('Completed/cutover migration cannot be cancelled');return this.prisma.control().tenantCellMigration.update({where:{id},data:{status:'CANCELLED'}})}
  private async get(id:string){const row=await this.prisma.control().tenantCellMigration.findUnique({where:{id},include:{sourceCell:true,targetCell:true}});if(!row)throw new NotFoundException('Cell migration not found');return row}
}
