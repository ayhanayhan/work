import {Injectable,OnModuleDestroy} from '@nestjs/common';
import {Queue} from 'bullmq';
import IORedis from 'ioredis';

export type BackgroundJobName='OUTBOX_DRAIN'|'OPERATIONS_TICK';
export type EnqueueOptions={queueName?:string;priority?:number;redisPoolKey?:string};
function envKey(prefix:string,key:string){return `${prefix}_${String(key||'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'')}`}

@Injectable()
export class BackgroundJobsService implements OnModuleDestroy{
  private connections=new Map<string,IORedis>();
  private queues=new Map<string,Queue>();
  private redisUrl(poolKey='primary'){const normalized=String(poolKey||'primary').trim();if(!normalized||normalized==='primary')return String(process.env.REDIS_URL||'').trim();return String(process.env[envKey('REDIS_URL',normalized)]||'').trim()}
  private connectionInstance(poolKey='primary'){const redisUrl=this.redisUrl(poolKey);if(!redisUrl)return null;let connection=this.connections.get(poolKey);if(!connection){connection=new IORedis(redisUrl,{maxRetriesPerRequest:null,enableReadyCheck:true,lazyConnect:true});this.connections.set(poolKey,connection)}return connection}
  private getQueue(name='ticarti-operations',poolKey='primary'){const connection=this.connectionInstance(poolKey);if(!connection)return null;const mapKey=`${poolKey}:${name}`;let queue=this.queues.get(mapKey);if(!queue){queue=new Queue(name,{connection,defaultJobOptions:{removeOnComplete:1000,removeOnFail:5000,attempts:5,backoff:{type:'exponential',delay:5000}}});this.queues.set(mapKey,queue)}return queue}
  async enqueue(name:BackgroundJobName,data:Record<string,unknown>,jobId?:string,options:EnqueueOptions={}){const queueName=String(options.queueName||'ticarti-operations');const poolKey=String(options.redisPoolKey||'primary');const queue=this.getQueue(queueName,poolKey);if(!queue)return{queued:false,reason:'redis-not-configured',queueName,poolKey};try{await queue.add(name,data,{jobId,priority:options.priority,removeOnComplete:1000,removeOnFail:5000});return{queued:true,queueName,poolKey}}catch(error:unknown){return{queued:false,queueName,poolKey,reason:error instanceof Error?error.message:'queue-error'}}}
  connectionForWorker(poolKey='primary'){const redisUrl=this.redisUrl(poolKey);if(!redisUrl)return null;return new IORedis(redisUrl,{maxRetriesPerRequest:null,enableReadyCheck:true,lazyConnect:false})}
  redisConfigured(poolKey='primary'){return !!this.redisUrl(poolKey)}
  async onModuleDestroy(){for(const queue of this.queues.values())await queue.close().catch(()=>undefined);for(const connection of this.connections.values())await connection.quit().catch(()=>undefined)}
}
