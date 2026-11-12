import {apiError} from '../i18n/api-error';
import { apiText } from '../i18n/api-i18n';
import {BadRequestException,Injectable} from '@nestjs/common';
import type {CreateShipmentInput,ShippingAdapter,ShippingProviderCode} from './shipping.types';
function required(config:any,key:string){const v=config?.endpoints?.[key]||config?.[key];if(!v)throw new BadRequestException(apiError('shipping.endpoint.missing',{key}));return new URL(String(v),String(config?.baseUrl||'')).toString()}
async function http(config:any,key:string,body:any){const url=required(config,key);const headers:any={'content-type':'application/json',...(config?.headers||{})};if(config?.token)headers.authorization=`Bearer ${config.token}`;const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body||{})});const text=await r.text();let data:any;try{data=text?JSON.parse(text):{}}catch{data={raw:text}}if(!r.ok)throw new BadRequestException(data?.message||apiText('shipping.provider.http',undefined,{status:r.status}));return data}
class ManualAdapter implements ShippingAdapter{
 capabilities={create:false,track:false,cancel:false};
 async testConnection():Promise<{ok:boolean;message:string;raw?:any}>{return{ok:true,message:apiText('shipping.manual.ready')}}
 async createShipment(_:CreateShipmentInput):Promise<{externalShipmentId?:string;trackingNumber?:string;label?:{format?:string;data?:string};raw?:any}>{throw new BadRequestException(apiError('shipping.manual.createUnsupported'))}
 async trackShipment():Promise<{status:string;rawStatus?:string;events:Array<{status:string;code?:string;description:string;location?:string;occurredAt:Date;raw?:any}>;raw?:any}>{return{status:'IN_TRANSIT',events:[]}}
 async cancelShipment():Promise<{cancelled:boolean;raw?:any}>{return{cancelled:true}}
}
class HttpAdapter implements ShippingAdapter{
 capabilities={create:true,track:true,cancel:true};constructor(private config:any){}
 async testConnection(){try{const r=await http(this.config,'testConnection',{});return{ok:r?.ok!==false,message:r?.message||apiText('shipping.connection.success'),raw:r}}catch(e:any){return{ok:false,message:e?.message||apiText('shipping.connection.failed')}}}
 async createShipment(input:CreateShipmentInput){const r=await http(this.config,'createShipment',input);return{externalShipmentId:r.externalShipmentId||r.id,trackingNumber:r.trackingNumber||r.trackingCode,label:r.label,raw:r}}
 async trackShipment(trackingCode:string,externalShipmentId?:string){const r=await http(this.config,'trackShipment',{trackingCode,externalShipmentId});return{status:r.status||'IN_TRANSIT',rawStatus:r.rawStatus,events:(Array.isArray(r.events)?r.events:[]).map((e:any)=>({...e,description:e.description||e.status||'',occurredAt:e.occurredAt?new Date(e.occurredAt):new Date()})),raw:r}}
 async cancelShipment(trackingCode:string,externalShipmentId?:string){const r=await http(this.config,'cancelShipment',{trackingCode,externalShipmentId});return{cancelled:r.cancelled!==false,raw:r}}
}
@Injectable()
export class ShippingProviderRegistry{create(provider:ShippingProviderCode,config:any):ShippingAdapter{return provider==='MANUAL'?new ManualAdapter():new HttpAdapter(config||{})}}
