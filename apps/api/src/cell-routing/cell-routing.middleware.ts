import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantPlacementService, TenantRuntimePolicy } from '../tenant-placement/tenant-placement.service';

function firstHeader(v:unknown){return Array.isArray(v)?String(v[0]||''):String(v||'').split(',')[0].trim()}
function canHaveBody(method:string){return !['GET','HEAD'].includes(String(method||'GET').toUpperCase())}
function customerSessionId(auth:unknown){const raw=String(auth||'');if(!raw.startsWith('Bearer '))return '';const token=raw.slice(7);const parts=token.split('.');if(parts.length<2)return '';try{const payload=JSON.parse(Buffer.from(parts[1].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));return payload?.kind==='customer'?String(payload?.sid||''):''}catch{return ''}}

@Injectable()
export class CellRoutingMiddleware implements NestMiddleware{
  constructor(private readonly prisma:PrismaService,private readonly placements:TenantPlacementService){}
  async use(req:any,res:any,next:(error?:unknown)=>void){
    return this.prisma.runWithRequestContext(async()=>{
      try{
        const policy=await this.resolvePolicy(req);
        if(policy){
          (req as any).tenantRuntime=policy;
          this.prisma.setTenantRouting(policy);
          const local=String(process.env.TICARTI_CELL_CODE||'primary').trim();
          if(policy.cellStatus==='DISABLED')throw new ServiceUnavailableException(`Tenant cell ${policy.cellCode} is disabled`);
          if(policy.writeBlocked&&!['GET','HEAD','OPTIONS'].includes(String(req.method||'GET').toUpperCase()))throw new ServiceUnavailableException('Tenant is in migration cutover; writes are temporarily paused');
          const mode=String(process.env.CELL_ROUTING_MODE||'direct').trim().toLowerCase();
          if(policy.cellCode!==local&&mode==='proxy'&&policy.apiBaseUrl){await this.proxy(req,res,policy);return;}
          if(policy.cellCode!==local&&String(process.env.CELL_ROUTING_ENFORCE||'').toLowerCase()==='true'&&mode!=='direct')throw new ServiceUnavailableException(`Tenant is assigned to cell ${policy.cellCode}`);
        }
        next();
      }catch(error){next(error)}
    });
  }
  private async resolvePolicy(req:any):Promise<TenantRuntimePolicy|null>{
    const tenantId=firstHeader(req.headers['x-tenant-id']);
    if(tenantId)return this.placements.resolve(tenantId);
    const storeKey=firstHeader(req.headers['x-ticarti-store-key']);
    if(storeKey)return this.placements.resolveByStoreKey(storeKey);
    const path=String((req as any).originalUrl||req.url||'');
    const url=new URL(path,'http://local');
    const queryStore=String(url.searchParams.get('store')||'').trim();if(queryStore)return this.placements.resolveByStoreKey(queryStore);
    const match=path.match(/\/v1\/storefront\/([^/?#]+)/i);
    if(match){const first=decodeURIComponent(match[1]);if(!['customer','carts','reference-data'].includes(first))return this.placements.resolveByStoreKey(first)}
    const media=path.match(/\/v1\/media\/([^/?#]+)\/content/i);if(media){const tenantId=await this.routeKeyTenant('MEDIA',decodeURIComponent(media[1]));if(tenantId)return this.placements.resolve(tenantId)}
    const cart=path.match(/\/v1\/storefront\/carts\/([^/?#]+)/i);if(cart){const tenantId=await this.routeKeyTenant('CART',decodeURIComponent(cart[1]));if(tenantId)return this.placements.resolve(tenantId)}
    const sid=customerSessionId(req.headers.authorization);if(sid){const tenantId=await this.routeKeyTenant('CUSTOMER_SESSION',sid);if(tenantId)return this.placements.resolve(tenantId)}
    return null;
  }
  private async routeKeyTenant(kind:'MEDIA'|'CART'|'CUSTOMER_SESSION',routeKey:string){const row=await this.prisma.control().tenantRouteKey.findUnique({where:{kind_routeKey:{kind,routeKey}},select:{tenantId:true,expiresAt:true}});if(!row)return '';if(row.expiresAt&&row.expiresAt.getTime()<Date.now()){void this.prisma.control().tenantRouteKey.deleteMany({where:{kind,routeKey}});return ''}return row.tenantId}
  private async proxy(req:any,res:any,policy:TenantRuntimePolicy){
    const hop=Math.max(0,Number(firstHeader(req.headers['x-ticarti-routing-hop'])||0));if(hop>=1)throw new ServiceUnavailableException('Cell routing loop detected');
    const base=String(policy.apiBaseUrl||'').replace(/\/$/,'');if(!/^https:\/\//i.test(base)&&process.env.NODE_ENV==='production')throw new ServiceUnavailableException('Target cell API URL is invalid');
    const url=base+String((req as any).originalUrl||req.url||'');
    const headers=new Headers();for(const [key,value] of Object.entries(req.headers)){if(value===undefined)continue;const k=key.toLowerCase();if(['host','content-length','connection','transfer-encoding'].includes(k))continue;headers.set(key,Array.isArray(value)?value.join(', '):String(value))}
    headers.set('x-ticarti-routing-hop',String(hop+1));headers.set('x-ticarti-routed-cell',policy.cellCode);headers.set('x-ticarti-tenant-id',policy.tenantId);
    let body:BodyInit|undefined;
    if(canHaveBody(req.method)){const b=(req as any).body;if(Buffer.isBuffer(b))body=Uint8Array.from(b).buffer;else if(typeof b==='string')body=b;else if(b!==undefined){body=JSON.stringify(b);if(!headers.has('content-type'))headers.set('content-type','application/json')}}
    const upstream=await fetch(url,{method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(Math.max(1000,Number(process.env.CELL_PROXY_TIMEOUT_MS||30000)||30000))});
    res.status(upstream.status);upstream.headers.forEach((value,key)=>{if(key.toLowerCase()!=='set-cookie'&&key.toLowerCase()!=='transfer-encoding')res.setHeader(key,value)});const cookies=(upstream.headers as any).getSetCookie?.();if(Array.isArray(cookies)&&cookies.length)res.setHeader('set-cookie',cookies);res.setHeader('x-ticarti-cell',policy.cellCode);const buf=Buffer.from(await upstream.arrayBuffer());res.send(buf);
  }
}
