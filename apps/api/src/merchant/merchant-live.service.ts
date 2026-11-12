import {ForbiddenException, Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class MerchantLiveService {
  constructor(private readonly prisma:PrismaService){}

  async snapshot(tenantId:string,storeId:string){
    if(storeId!==tenantId)throw new ForbiddenException('Site does not belong to tenant');
    const store=await this.prisma.tenant.findUnique({where:{id:tenantId},select:{id:true,name:true,currency:true}});
    if(!store)throw new ForbiddenException('Tenant not found');
    const now=new Date();
    const activeSince=new Date(now.getTime()-90_000);
    const halfHour=new Date(now.getTime()-30*60_000);
    const dayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    // Deliberately read-only and bounded. Product, order-item and customer data are never joined here.
    const [active,recentVisitors,recentOrders,todayOrders,todayVisitors]=await Promise.all([
      this.prisma.liveVisitorSession.findMany({where:{storeId,lastSeenAt:{gte:activeSince}},select:{visitorId:true,path:true,state:true,city:true,country:true,lastSeenAt:true},orderBy:{lastSeenAt:'desc'},take:200}),
      this.prisma.liveVisitorSession.findMany({where:{storeId,lastSeenAt:{gte:halfHour}},select:{lastSeenAt:true},orderBy:{lastSeenAt:'desc'},take:500}),
      this.prisma.order.findMany({where:{storeId,createdAt:{gte:halfHour}},select:{id:true,number:true,grandTotal:true,currency:true,shippingAddress:true,createdAt:true,source:true,metadata:true},orderBy:{createdAt:'desc'},take:30}),
      this.prisma.order.aggregate({where:{storeId,createdAt:{gte:dayStart},paymentStatus:'PAID'},_count:{id:true},_sum:{grandTotal:true}}),
      this.prisma.liveVisitorSession.count({where:{storeId,lastSeenAt:{gte:dayStart}}}),
    ]);
    const minuteBuckets=new Map<string,number>();
    for(const visitor of recentVisitors){const d=new Date(visitor.lastSeenAt);d.setSeconds(0,0);const key=d.toISOString();minuteBuckets.set(key,(minuteBuckets.get(key)||0)+1)}
    const history=Array.from({length:30},(_,i)=>{const from=new Date(now.getTime()-(29-i)*60_000);from.setSeconds(0,0);return{time:from.toISOString(),visitors:minuteBuckets.get(from.toISOString())||0}});
    const cartCount=active.filter(v=>v.state==='CART').length;
    const checkoutCount=active.filter(v=>v.state==='CHECKOUT').length;
    const cityMap=new Map<string,{city:string;visitors:number;orders:number;revenue:number}>();
    const countryMap=new Map<string,{country:string;countryCode:string;visitors:number;orders:number;revenue:number}>();
    const addCity=(city:unknown,key:'visitors'|'orders',amount=0)=>{const name=String(city||'Bilinmiyor').trim()||'Bilinmiyor';const row=cityMap.get(name)||{city:name,visitors:0,orders:0,revenue:0};row[key]+=1;row.revenue+=amount;cityMap.set(name,row)};
    const addCountry=(country:unknown,key:'visitors'|'orders',amount=0)=>{const raw=String(country||'').trim();if(!raw)return;const code=raw.length===2?raw.toUpperCase():'';const mapKey=code||raw.toLocaleLowerCase('tr');const row=countryMap.get(mapKey)||{country:raw,countryCode:code,visitors:0,orders:0,revenue:0};row[key]+=1;row.revenue+=amount;countryMap.set(mapKey,row)};
    active.forEach(v=>{addCity(v.city,'visitors');addCountry(v.country,'visitors')});
    recentOrders.forEach(o=>{const address=(o.shippingAddress&&typeof o.shippingAddress==='object'&&!Array.isArray(o.shippingAddress)?o.shippingAddress:{}) as Record<string,unknown>;addCity(address.city,'orders',Number(o.grandTotal||0));addCountry(address.country,'orders',Number(o.grandTotal||0))});
    return{
      store,generatedAt:now.toISOString(),
      metrics:{activeVisitors:active.length,todayVisitors,todayOrders:todayOrders._count.id,todayRevenue:Number(todayOrders._sum.grandTotal||0),cartCount,checkoutCount,recentOrderCount:recentOrders.length},
      activeVisitors:active.map(v=>({visitorId:v.visitorId,path:v.path,state:v.state,city:v.city,country:v.country,lastSeenAt:v.lastSeenAt})),history,
      cities:Array.from(cityMap.values()).sort((a,b)=>(b.orders+b.visitors)-(a.orders+a.visitors)),
      countries:Array.from(countryMap.values()).sort((a,b)=>(b.orders+b.visitors)-(a.orders+a.visitors)),
      recentOrders:recentOrders.map(o=>{const address=(o.shippingAddress&&typeof o.shippingAddress==='object'&&!Array.isArray(o.shippingAddress)?o.shippingAddress:{}) as Record<string,unknown>;const metadata=(o.metadata&&typeof o.metadata==='object'&&!Array.isArray(o.metadata)?o.metadata:{}) as Record<string,unknown>;return{id:o.id,number:o.number,total:Number(o.grandTotal),currency:o.currency,city:String(address.city||'Bilinmiyor'),country:String(address.country||''),source:o.source,sourceDetail:String(metadata.sourceDetail||''),createdAt:o.createdAt}}),
    };
  }
}
