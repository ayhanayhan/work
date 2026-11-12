import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { cellRuntimeContext } from '../cell-routing/runtime-context';

function envKey(prefix:string,key:string){return `${prefix}_${String(key||'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'')}`}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger=new Logger(CacheService.name);
  private lastLockWarningAt=0;
  private clients=new Map<string,Redis>();
  private redisUrl(poolKey:string){const normalized=String(poolKey||'primary').trim();if(!normalized||normalized==='primary')return String(process.env.REDIS_URL||'').trim();return String(process.env[envKey('REDIS_URL',normalized)]||'').trim()}
  private client(){const pool=String(cellRuntimeContext.current()?.redisPoolKey||'primary');const url=this.redisUrl(pool);if(!url)return null;let redis=this.clients.get(pool);if(!redis){redis=new Redis(url,{lazyConnect:true,maxRetriesPerRequest:1,enableOfflineQueue:false,retryStrategy:(times)=>Math.min(times*500,5000)});redis.on('error',()=>{});this.clients.set(pool,redis)}return redis}
  private coordinationClient(){
    const pool='__coordination';
    const url=String(process.env.REDIS_COORDINATION_URL||process.env.REDIS_URL||'').trim();
    if(!url)return null;
    let redis=this.clients.get(pool);
    if(!redis){
      redis=new Redis(url,{lazyConnect:true,maxRetriesPerRequest:1,enableOfflineQueue:false,retryStrategy:(times)=>Math.min(times*500,5000)});
      redis.on('error',()=>{});
      this.clients.set(pool,redis);
    }
    return redis;
  }

  private async ready(redis:Redis){
    if(String(redis.status)==='ready')return true;
    if(String(redis.status)==='wait'){
      try{await redis.connect()}catch(error){if(String(redis.status)!=='ready')throw error}
    }
    if(String(redis.status)==='ready')return true;
    await new Promise<void>((resolve,reject)=>{
      let settled=false;
      const cleanup=()=>{redis.off('ready',onReady);redis.off('end',onEnd);clearTimeout(timer)};
      const finish=(error?:Error)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve()};
      const onReady=()=>finish();
      const onEnd=()=>finish(new Error('Redis connection ended before ready'));
      const timer=setTimeout(()=>finish(new Error(`Redis not ready after 3000ms (${String(redis.status)})`)),3000);
      redis.once('ready',onReady);redis.once('end',onEnd);
      if(String(redis.status)==='ready')finish();
    });
    return true;
  }
  key(tenantId:string,scope:string,id:string){ return `tenant:${tenantId}:${scope}:${id}`; }
  async getJson<T>(key:string):Promise<T|null>{const redis=this.client();if(!redis)return null;try{await this.ready(redis);const v=await redis.get(key);return v?JSON.parse(v):null}catch{return null}}
  async setJson(key:string,value:any,ttl=300){const redis=this.client();if(!redis)return;try{await this.ready(redis);await redis.set(key,JSON.stringify(value),'EX',Math.max(1,ttl));}catch{}}
  async del(...keys:string[]){const redis=this.client();if(!redis||!keys.length)return;try{await this.ready(redis);await redis.del(...keys)}catch{}}
  async delPattern(pattern:string){const redis=this.client();if(!redis)return;try{await this.ready(redis);let cursor='0';do{const [next,keys]=await redis.scan(cursor,'MATCH',pattern,'COUNT',200);cursor=next;if(keys.length)await redis.del(...keys)}while(cursor!=='0')}catch{}}
  async purgeTenant(tenantId:string){ return this.delPattern(`tenant:${tenantId}:*`); }
  async incrementWindow(key:string,windowSeconds:number):Promise<number|null>{const redis=this.client();if(!redis)return null;try{await this.ready(redis);const count=await redis.incr(key);if(count===1)await redis.expire(key,Math.max(1,windowSeconds));return count}catch{return null}}
  async acquireCoordinationLock(key:string,token:string,ttlMs:number):Promise<boolean|null>{
    const redis=this.coordinationClient();
    if(!redis){
      const now=Date.now();
      if(now-this.lastLockWarningAt>10000){
        this.lastLockWarningAt=now;
        this.logger.warn('Redis coordination lock unavailable: REDIS_COORDINATION_URL/REDIS_URL not configured');
      }
      return null;
    }
    try{
      await this.ready(redis);
      const result=await redis.set(key,token,'PX',Math.max(1000,Math.floor(ttlMs)),'NX');
      return result==='OK';
    }catch(error:any){
      const now=Date.now();
      if(now-this.lastLockWarningAt>10000){
        this.lastLockWarningAt=now;
        this.logger.warn(`Redis coordination lock fallback: ${String(error?.message||error||'unknown error')}`);
      }
      return null;
    }
  }

  async releaseCoordinationLock(key:string,token:string):Promise<void>{
    const redis=this.coordinationClient();
    if(!redis)return;
    try{
      await this.ready(redis);
      await redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",1,key,token);
    }catch(error:any){
      const now=Date.now();
      if(now-this.lastLockWarningAt>10000){
        this.lastLockWarningAt=now;
        this.logger.warn(`Redis coordination unlock warning: ${String(error?.message||error||'unknown error')}`);
      }
    }
  }

  async acquireLock(key:string,token:string,ttlMs:number):Promise<boolean|null>{
    const redis=this.client();if(!redis)return null;
    try{
      await this.ready(redis);
      const result=await redis.set(key,token,'PX',Math.max(1000,Math.floor(ttlMs)),'NX');
      return result==='OK';
    }catch(error:any){
      const now=Date.now();
      if(now-this.lastLockWarningAt>10000){
        this.lastLockWarningAt=now;
        this.logger.warn(`Redis admission lock fallback: ${String(error?.message||error||'unknown error')}`);
      }
      return null;
    }
  }
  async releaseLock(key:string,token:string):Promise<void>{const redis=this.client();if(!redis)return;try{await this.ready(redis);await redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",1,key,token)}catch{}}

  async stats(){const redis=this.client();if(!redis)return {connected:false,configured:false};try{await this.ready(redis);const info=await redis.info('stats');const memory=await redis.info('memory');return {connected:true,configured:true,info,memory,poolKey:cellRuntimeContext.current()?.redisPoolKey||'primary'}}catch{return {connected:false,configured:true}}}
  async onModuleDestroy(){for(const redis of this.clients.values())try{await redis.quit()}catch{}}

  async coordinationStockReserve(key:string,quantity:number,initialAvailable:number,ttlMs=300000):Promise<{ok:boolean;remaining:number}|null>{
    const redis=this.coordinationClient();if(!redis)return null;
    const qty=Math.max(0,Math.floor(Number(quantity||0)));
    const initial=Math.max(0,Math.floor(Number(initialAvailable||0)));
    const ttl=Math.max(5000,Math.min(3600000,Math.floor(Number(ttlMs||300000))));
    if(qty<=0)return{ok:true,remaining:initial};
    const script=`
      if redis.call('EXISTS',KEYS[1]) == 0 then redis.call('SET',KEYS[1],ARGV[2],'PX',ARGV[3],'NX') end
      local cur=tonumber(redis.call('GET',KEYS[1]) or '-1')
      local qty=tonumber(ARGV[1])
      if cur < 0 then return {-1,-1} end
      if cur < qty then return {0,cur} end
      local next=redis.call('DECRBY',KEYS[1],qty)
      redis.call('PEXPIRE',KEYS[1],ARGV[3])
      return {1,next}
    `;
    try{const out:any=await redis.eval(script,1,key,String(qty),String(initial),String(ttl));const code=Number(out?.[0]||0);if(code===-1)return null;return{ok:code===1,remaining:Number(out?.[1]??-1)};}catch{return null;}
  }

  async deleteCoordinationKey(key:string):Promise<boolean>{
    const redis=this.coordinationClient();if(!redis)return false;
    try{return Number(await redis.del(key))>0;}catch{return false;}
  }

}
