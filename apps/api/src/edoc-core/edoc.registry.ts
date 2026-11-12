import {apiError} from '../i18n/api-error';
import {BadRequestException,Injectable} from '@nestjs/common';
import type {DocumentRef,EDocumentProvider,ProviderContext} from './edoc.types';
const PROVIDERS=[['EDM','EDM'],['QNB_ESOLUTIONS','QNB eSolutions'],['UYUMSOFT','Uyumsoft'],['TRENDYOL_EFATURAM','Trendyol E-Faturam'],['PARASUT','Paraşüt']] as const;
function endpoint(ctx:ProviderContext,key:string){const e=(ctx.config?.endpoints||{})[key]||ctx.config?.[key];if(!e)throw new BadRequestException(apiError('edoc.endpoint.missing',{key}));return new URL(String(e),String(ctx.config?.baseUrl||'')).toString()}
async function request(ctx:ProviderContext,key:string,body?:any,method='POST'){const url=endpoint(ctx,key);const headers:any={'content-type':'application/json',...(ctx.config?.headers||{})};if(ctx.credentials?.token)headers.authorization=`Bearer ${ctx.credentials.token}`;if(ctx.credentials?.username)headers['x-username']=ctx.credentials.username;if(ctx.credentials?.password)headers['x-password']=ctx.credentials.password;const r=await fetch(url,{method,headers,body:method==='GET'?undefined:JSON.stringify(body||{})});const text=await r.text();let data:any;try{data=text?JSON.parse(text):{}}catch{data={raw:text}}if(!r.ok)throw new BadRequestException(data?.message||`E-belge provider HTTP ${r.status}`);return data}
class ConfigurableProvider implements EDocumentProvider{
 constructor(public code:string,public name:string){}
 checkTaxpayer(ctx:ProviderContext,taxId:string){return request(ctx,'checkTaxpayer',{taxId})}
 sendInvoice(ctx:ProviderContext,doc:any){return request(ctx,'sendInvoice',doc)}
 getOutgoingStatus(ctx:ProviderContext,ref:DocumentRef){return request(ctx,'getOutgoingStatus',ref)}
 cancelEArchive(ctx:ProviderContext,ref:DocumentRef,reason?:string){return request(ctx,'cancelEArchive',{...ref,reason})}
 requestCancellation(ctx:ProviderContext,ref:DocumentRef,reason?:string){return request(ctx,'requestCancellation',{...ref,reason})}
 async listIncoming(ctx:ProviderContext,q:any){const x=await request(ctx,'listIncoming',q);return{items:Array.isArray(x?.items)?x.items:[],cursor:x?.cursor}}
 respondCommercial(ctx:ProviderContext,ref:DocumentRef,response:'ACCEPT'|'REJECT',note?:string){return request(ctx,'respondCommercial',{...ref,response,note})}
 getPdf(ctx:ProviderContext,ref:DocumentRef){return request(ctx,'getPdf',ref)}
 getXml(ctx:ProviderContext,ref:DocumentRef){return request(ctx,'getXml',ref)}
}
@Injectable()
export class EDocumentProviderRegistry{
 private providers:Map<string,EDocumentProvider>=new Map(PROVIDERS.map(([code,name])=>[String(code),new ConfigurableProvider(code,name)]));
 list(){return[...this.providers.values()].map(x=>({code:x.code,name:x.name}))}
 get(code:string){const p=this.providers.get(String(code));if(!p)throw new BadRequestException(apiError('edoc.provider.unsupported',{code}));return p}
}
