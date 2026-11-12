import {ConflictException,Injectable,ServiceUnavailableException} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';

const CONTROL_ONLY_DELEGATES=new Set([
  'user','membership','infrastructureCell','tenantPlacement','tenantCellMigration','tenantRouteKey',
  'userSession','merchantSession','merchantPasswordReset','merchantAuthHandoff','superAdmin','superAdminSession',
  'plan','subscription','planPayment','billingInvoice','themeDefinition','themePlanPrice','themePayment',
  'billingCoupon','platformPurchase','providerPaymentReceipt','emailCreditPackage','emailCreditWallet','emailCreditLedger',
  'aiCreditPackage','aiCreditWallet','aiCreditLedger','appDefinition','appPlanPrice','appVersion','appVersionScope','appClient','appAuthorizationCode','appAccessToken','appInstallation','appBillingSubscription','appUsageRecord','appBillingInvoice','appBillingCharge','appInstallationScope','appExtension','appInstallationExtension','appExtensionDataSnapshot','appLifecycleEvent',
  'supportTicket','supportMessage','emailPlatformPolicy','emailGlobalSuppression','storeApiKey','developerOrganization','developerUser','developerMembership','developerSession','appReviewSubmission','appReviewCheck','appAuditLog'
]);

type ModelMeta={name:string;delegate:string;fields:any[];primaryKey?:{name?:string|null;fields:string[]}|null};
type Snapshot={models:Map<string,Map<string,any>>;order:string[];totalRows:number};

function lowerFirst(value:string){return value.charAt(0).toLowerCase()+value.slice(1)}
function chunks<T>(items:T[],size:number){const out:T[][]=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out}
function errCode(error:any){return String(error?.code||error?.meta?.code||'')}

@Injectable()
export class TenantDataCopyService{
  private readonly models:ModelMeta[];
  private readonly byName=new Map<string,ModelMeta>();
  constructor(private readonly prisma:PrismaService){
    const raw=(((Prisma as any).dmmf?.datamodel?.models)||[]) as any[];
    this.models=raw.map(model=>({name:String(model.name),delegate:lowerFirst(String(model.name)),fields:model.fields||[],primaryKey:model.primaryKey||null})).filter(model=>!CONTROL_ONLY_DELEGATES.has(model.delegate));
    for(const model of this.models)this.byName.set(model.name,model);
  }

  async syncTenant(tenantId:string,sourcePoolKey:string,targetPoolKey:string,opts?:{prune?:boolean}){
    if(!tenantId)throw new ConflictException('tenantId is required');
    if(sourcePoolKey===targetPoolKey)throw new ConflictException('Source and target database pools must be different');
    if(!this.prisma.databasePoolConfigured(sourcePoolKey))throw new ServiceUnavailableException(`Database pool ${sourcePoolKey} is not configured`);
    if(!this.prisma.databasePoolConfigured(targetPoolKey))throw new ServiceUnavailableException(`Database pool ${targetPoolKey} is not configured`);
    const source=this.prisma.clientForPoolKey(sourcePoolKey) as any;
    const target=this.prisma.clientForPoolKey(targetPoolKey) as any;
    await Promise.all([this.prisma.pingPool(sourcePoolKey),this.prisma.pingPool(targetPoolKey)]);
    const snapshot=await this.snapshotTenant(source,tenantId);
    const copied=await this.applySnapshot(target,snapshot);
    let pruned=0;
    if(opts?.prune)pruned=await this.pruneTarget(target,tenantId,snapshot);
    return{tenantId,sourcePoolKey,targetPoolKey,models:snapshot.order.length,rows:snapshot.totalRows,copied,pruned,completedAt:new Date().toISOString()};
  }

  async compareTenant(tenantId:string,sourcePoolKey:string,targetPoolKey:string){
    const source=this.prisma.clientForPoolKey(sourcePoolKey) as any;const target=this.prisma.clientForPoolKey(targetPoolKey) as any;
    const [a,b]=await Promise.all([this.snapshotTenant(source,tenantId),this.snapshotTenant(target,tenantId)]);
    const names=Array.from(new Set([...a.models.keys(),...b.models.keys()])).sort();const models:any={};let ok=true;
    for(const name of names){const sourceCount=a.models.get(name)?.size||0;const targetCount=b.models.get(name)?.size||0;const match=sourceCount===targetCount;models[name]={source:sourceCount,target:targetCount,match};if(!match)ok=false}
    return{ok,sourceRows:a.totalRows,targetRows:b.totalRows,models};
  }

  private async snapshotTenant(client:any,tenantId:string):Promise<Snapshot>{
    const selected=new Map<string,Map<string,any>>();const queue:string[]=[];const order:string[]=[];
    const addRows=(meta:ModelMeta,rows:any[])=>{if(!rows.length)return 0;let bucket=selected.get(meta.name);if(!bucket){bucket=new Map();selected.set(meta.name,bucket)}let added=0;for(const row of rows){const key=this.rowKey(meta,row);if(!bucket.has(key)){bucket.set(key,row);added++}}if(added&&!queue.includes(meta.name))queue.push(meta.name);if(added&&!order.includes(meta.name))order.push(meta.name);return added};
    const tenant=this.byName.get('Tenant');if(tenant){const row=await client[tenant.delegate].findUnique({where:{id:tenantId}});if(!row)throw new ConflictException('Tenant does not exist in source database');addRows(tenant,[row])}
    for(const meta of this.models){if(meta.name==='Tenant')continue;const direct=this.directTenantField(meta);if(!direct)continue;const rows=await this.findAll(client[meta.delegate],meta,{[direct]:tenantId});addRows(meta,rows)}
    let changed=true;let guard=0;
    while(changed&&guard++<this.models.length+4){changed=false;for(const child of this.models){for(const relation of child.fields.filter((f:any)=>f.kind==='object'&&Array.isArray(f.relationFromFields)&&f.relationFromFields.length>0)){const parent=this.byName.get(String(relation.type));const parentRows=parent?selected.get(parent.name):undefined;if(!parent||!parentRows?.size)continue;const from=relation.relationFromFields as string[];const refs=(relation.relationToFields||[]) as string[];if(!from.length||from.length!==refs.length)continue;const filters:Array<Record<string,unknown>>=[];for(const row of parentRows.values()){const filter:Record<string,unknown>={};let valid=true;for(let i=0;i<from.length;i++){const v=row[refs[i]];if(v===null||v===undefined){valid=false;break}filter[from[i]]=v}if(valid)filters.push(filter)}if(!filters.length)continue;for(const part of chunks(filters,200)){const where=part.length===1?part[0]:{OR:part};const rows=await this.findAll(client[child.delegate],child,where);if(addRows(child,rows)>0)changed=true}}
      }
    }
    return{models:selected,order,totalRows:Array.from(selected.values()).reduce((n,b)=>n+b.size,0)};
  }

  private async findAll(delegate:any,meta:ModelMeta,where:any){const out:any[]=[];const fields=this.primaryFields(meta);let skip=0;while(true){const orderBy:any={};for(const field of fields)orderBy[field]='asc';const rows=await delegate.findMany({where,take:500,skip,orderBy});out.push(...rows);if(rows.length<500)break;skip+=rows.length}return out}
  private directTenantField(meta:ModelMeta){const scalar=new Set(meta.fields.filter((f:any)=>f.kind==='scalar').map((f:any)=>String(f.name)));if(scalar.has('tenantId'))return'tenantId';if(scalar.has('storeId'))return'storeId';return''}
  private primaryFields(meta:ModelMeta){const explicit=(meta.primaryKey?.fields||[]).map(String);if(explicit.length)return explicit;const ids=meta.fields.filter((f:any)=>f.kind==='scalar'&&f.isId).map((f:any)=>String(f.name));return ids.length?ids:['id']}
  private rowKey(meta:ModelMeta,row:any){return this.primaryFields(meta).map(f=>`${f}:${String(row?.[f])}`).join('|')}
  private uniqueWhere(meta:ModelMeta,row:any){const fields=this.primaryFields(meta);if(fields.length===1)return{[fields[0]]:row[fields[0]]};const name=meta.primaryKey?.name||fields.join('_');const value:Record<string,unknown>={};for(const f of fields)value[f]=row[f];return{[name]:value}}
  private scalarData(meta:ModelMeta,row:any){const data:any={};for(const f of meta.fields){if(f.kind!=='scalar'&&f.kind!=='enum')continue;if(Object.prototype.hasOwnProperty.call(row,f.name))data[f.name]=row[f.name]}return data}

  private async applySnapshot(target:any,snapshot:Snapshot){const pending:Array<{meta:ModelMeta;row:any}>=[];for(const name of snapshot.order){const meta=this.byName.get(name);const rows=snapshot.models.get(name);if(meta&&rows)for(const row of rows.values())pending.push({meta,row})}let copied=0;let previous=-1;let passes=0;while(pending.length&&pending.length!==previous&&passes++<Math.max(8,snapshot.order.length+2)){previous=pending.length;for(let i=pending.length-1;i>=0;i--){const item=pending[i];const delegate=target[item.meta.delegate];try{const data=this.scalarData(item.meta,item.row);await delegate.upsert({where:this.uniqueWhere(item.meta,item.row),create:data,update:data});pending.splice(i,1);copied++}catch(error:any){if(errCode(error)==='P2003'||errCode(error)==='P2014'||errCode(error)==='P2025')continue;throw error}}}
    if(pending.length){const sample=pending.slice(0,12).map(x=>`${x.meta.name}:${this.rowKey(x.meta,x.row)}`).join(', ');throw new ConflictException(`Tenant copy could not satisfy foreign-key order for ${pending.length} rows. ${sample}`)}return copied}

  private async pruneTarget(target:any,tenantId:string,source:Snapshot){const current=await this.snapshotTenant(target,tenantId);const extra:Array<{meta:ModelMeta;row:any}>=[];for(const [name,rows] of current.models){const meta=this.byName.get(name);if(!meta||name==='Tenant')continue;const wanted=source.models.get(name);for(const [key,row] of rows)if(!wanted?.has(key))extra.push({meta,row})}let removed=0;let previous=-1;let passes=0;while(extra.length&&extra.length!==previous&&passes++<Math.max(8,current.order.length+2)){previous=extra.length;for(let i=0;i<extra.length;i++){const item=extra[i];try{await target[item.meta.delegate].delete({where:this.uniqueWhere(item.meta,item.row)});extra.splice(i,1);i--;removed++}catch(error:any){if(errCode(error)==='P2003'||errCode(error)==='P2014')continue;if(errCode(error)==='P2025'){extra.splice(i,1);i--;continue}throw error}}}if(extra.length)throw new ConflictException(`Tenant prune left ${extra.length} rows because of foreign-key dependencies`);return removed}
}
