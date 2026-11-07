/* Server-only typed homepage content. The existing React design is the fallback
   until each selected Master module has saved content. */
export type Localized=Record<string,string>;
export type HomeItem={id:string;enabled?:boolean;fields?:Record<string,Localized>;assets?:{image?:string;logo?:string};links?:{href?:string};storeId?:string};
export type HomeLogo={id:string;enabled?:boolean;fields?:{title?:Localized};assets?:{image?:string};storeId?:string};
export type HomeModule={
 id:string;enabled?:boolean;fields?:Record<string,Localized>;items?:HomeItem[];
 logos?:HomeLogo[];ctaEnabled?:boolean;categoryIds?:string[];
};
export type HomeContent={locale:string;version:number;modules:HomeModule[];consentContract?:{key:string;contentKey:string;href:string}};
export const moduleById=(home:HomeContent|null|undefined,id:string)=>home?.modules?.find(m=>m.id===id&&m.enabled!==false);
export const textFor=(values:Localized|undefined,locale:string)=>values?.[locale]?.trim()||'';
export const fieldFor=(module:HomeModule|undefined,key:string,locale:string)=>textFor(module?.fields?.[key],locale);
export function safePageUrl(input:string|undefined,fallback:string){
 const value=(input||'').trim();
 if(!value)return fallback;
 if(value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!/[\u0000-\u001f]/.test(value))return value;
 if(/^https:\/\/[^\s"'<>]+$/i.test(value))return value;
 return fallback;
}
export function safeAssetUrl(input:string|undefined,fallback:string){
 const value=(input||'').trim();
 if(value.startsWith('/assets/')||/^https:\/\/[^\s"'<>]+$/i.test(value))return value;
 return fallback;
}
export async function getHomeContent(locale:string):Promise<HomeContent|null>{
 const origin=(process.env.API_ORIGIN||'').replace(/\/$/,'');
 if(!origin)return null;
 try{
  const response=await fetch(origin+'/v1/public/website/home?lang='+encodeURIComponent(locale),
    {cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!response.ok)return null;
  const data=await response.json();
  if(!data||!Array.isArray(data.modules)||typeof data.version!=='number')return null;
  return {locale,version:data.version,modules:data.modules,consentContract:data.consentContract};
 }catch{return null;}
}
