import defaultNavigation from './navigation-default.json';
export type Localized=Record<string,string>;
export type NavigationLink={id:string;label:Localized;url:string;enabled:boolean};
export type NavigationGroup={id:string;area:string;title:Localized;links:NavigationLink[]};
export type Navigation={version:number;groups:NavigationGroup[]};
const API=(process.env.API_ORIGIN||'').replace(/\/$/,'');
export async function getNavigation():Promise<Navigation|null>{
 if(!API)return defaultNavigation as Navigation;
 try{
  const response=await fetch(API+'/v1/public/website/navigation',{
   cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return defaultNavigation as Navigation;
  const data=await response.json();
  return Array.isArray(data?.groups)?data:defaultNavigation as Navigation;
 }catch{return defaultNavigation as Navigation;}
}
export function menuLabel(labels:Localized|undefined,locale:string){
 return labels?.[locale]||labels?.tr||Object.values(labels||{})[0]||'';
}
export function groupFor(data:Navigation|null|undefined,id:string){
 return data?.groups?.find(group=>group.id===id);
}
export function menuLocaleFromPath(path:string){
 return path.match(/^\/(tr|en|de|ru|ar|bg|uk|id|vi)(?:\/|$)/)?.[1]||'tr';
}
