import { AsyncLocalStorage } from 'node:async_hooks';

export type CellRuntimeState={
  tenantId?:string;
  cellCode?:string;
  databasePoolKey?:string;
  redisPoolKey?:string;
  routingVersion?:number;
};

class CellRuntimeContext{
  private readonly storage=new AsyncLocalStorage<CellRuntimeState>();
  run<T>(fn:()=>T,seed:CellRuntimeState={}):T{return this.storage.run({...seed},fn)}
  current(){return this.storage.getStore()||null}
  set(values:Partial<CellRuntimeState>){const store=this.storage.getStore();if(store)Object.assign(store,values);else this.storage.enterWith({...values})}
  clear(){const store=this.storage.getStore();if(store)for(const key of Object.keys(store))delete (store as any)[key]}
}

export const cellRuntimeContext=new CellRuntimeContext();
