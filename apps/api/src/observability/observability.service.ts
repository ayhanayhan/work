import { Injectable } from '@nestjs/common';

type RouteMetric = {
  route:string; method:string; count:number; errors:number; totalMs:number;
  maxMs:number; p50:number; p95:number; p99:number; samples:number[];
};

@Injectable()
export class ObservabilityService {
  private startedAt = Date.now();
  private routes = new Map<string, RouteMetric>();
  private inflight = 0;
  private totals = { requests:0, errors:0 };

  begin(){ this.inflight++; }
  end(method:string,route:string,status:number,durationMs:number){
    this.inflight=Math.max(0,this.inflight-1); this.totals.requests++; if(status>=500)this.totals.errors++;
    const normalized=String(route||'unknown').replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/ig,':id').replace(/\/\d+(?=\/|$)/g,'/:id');
    const key=`${method.toUpperCase()} ${normalized}`;
    const m=this.routes.get(key)||{route:normalized,method:method.toUpperCase(),count:0,errors:0,totalMs:0,maxMs:0,p50:0,p95:0,p99:0,samples:[]};
    m.count++; if(status>=500)m.errors++; m.totalMs+=durationMs; m.maxMs=Math.max(m.maxMs,durationMs);
    m.samples.push(durationMs); if(m.samples.length>512)m.samples.shift();
    const sorted=[...m.samples].sort((a,b)=>a-b); const q=(p:number)=>sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p)-1))]||0;
    m.p50=q(.50);m.p95=q(.95);m.p99=q(.99); this.routes.set(key,m);
  }
  snapshot(){
    const uptimeSeconds=Math.floor((Date.now()-this.startedAt)/1000);
    const routes=Array.from(this.routes.values()).map(({samples,...x})=>({...x,avgMs:x.count?x.totalMs/x.count:0,errorRate:x.count?x.errors/x.count:0})).sort((a,b)=>b.p95-a.p95).slice(0,100);
    return {startedAt:new Date(this.startedAt).toISOString(),uptimeSeconds,inflight:this.inflight,requests:this.totals.requests,errors:this.totals.errors,errorRate:this.totals.requests?this.totals.errors/this.totals.requests:0,routes};
  }
}
