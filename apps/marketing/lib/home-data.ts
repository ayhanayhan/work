/**
 * Homepage read model.
 * Master writes through the protected Website API into Prisma platformSetting.
 * This Server Component layer reads the public API directly, never from HTML or JS.
 */
export type Translations=Record<string,string>;
export type HomeItem={
  id:string;enabled:boolean;sortOrder?:number;
  fields:Record<string,Translations>;
  assets?:{image?:string};
  links?:{href?:string};
};
export type HomeModule={
  id:string;title:string;enabled:boolean;sortOrder:number;
  fields:Record<string,Translations>;
  items:HomeItem[];
};
export type HomeData={version:number;locale:string;modules:HomeModule[]};
export type ActiveLocale={locale:string;label:string;isDefault:boolean};
const origin=()=>String(process.env.API_ORIGIN||'').replace(/\/$/,'');
const endpoint=async(path:string)=>{
  const api=origin();
  if(!api)throw Error('API_ORIGIN is not configured for Marketing');
  const response=await fetch(api+'/v1/'+path,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Website API '+path+' returned HTTP '+response.status);
  return response.json();
};
export async function homepageData(lang:string):Promise<HomeData>{
  const data=await endpoint('public/website/home?lang='+encodeURIComponent(lang));
  if(!data||!Array.isArray(data.modules))throw Error('Homepage API payload is invalid');
  return {
    version:Number(data.version)||0,locale:lang,
    modules:data.modules.filter((m:any)=>m&&typeof m.id==='string').map((m:any)=>({
      id:m.id,title:String(m.title||''),enabled:m.enabled!==false,
      sortOrder:Number(m.sortOrder)||0,
      fields:m.fields&&typeof m.fields==='object'?m.fields:{},
      items:Array.isArray(m.items)?m.items:[]
    })).sort((a:HomeModule,b:HomeModule)=>a.sortOrder-b.sortOrder)
  };
}
export async function activeLocales():Promise<ActiveLocale[]>{
  const data=await endpoint('public/website/locales');
  if(!Array.isArray(data))throw Error('Invalid active website locales');
  return data.filter((r:any)=>r&&/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(r.locale))
    .map((r:any)=>({locale:r.locale,label:String(r.label||r.locale),isDefault:r.isDefault===true}));
}
export const localized=(fields:Record<string,Translations>|undefined,key:string,lang:string)=>
  String(fields?.[key]?.[lang]||'').trim();
export function visibleItems(module:HomeModule,lang:string){
  return (module.items||[]).filter(x=>x?.enabled!==false)
    .sort((a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0))
    .filter(x=>Object.values(x.fields||{}).some(v=>!!v?.[lang]?.trim())||!!x.assets?.image);
}
export const validMedia=(raw:string|undefined)=>{
  if(!raw)return '';
  if(/^https:\/\/[^\s<>"']+$/i.test(raw))return raw;
  if(/^\/(?:assets|uploads)\/[a-zA-Z0-9_./-]+$/.test(raw))return raw;
  return '';
};
export const validLink=(raw:string|undefined)=>{
  if(!raw)return '';
  if(/^https:\/\/[^\s<>"']+$/i.test(raw)||/^\/(?!\/)[^\s<>"']*$/.test(raw)||/^#[a-zA-Z0-9_-]+$/.test(raw))return raw;
  return '';
};
