export type Localized=Record<string,string>;
export type NavigationLink={id:string;label:Localized;url:string;enabled:boolean};
export type NavigationGroup={id:string;area:string;title:Localized;links:NavigationLink[]};
export type MenuNode={id:string;label:Localized;url:string;enabled:boolean;children:MenuNode[]};
export type MenuTree={header:MenuNode[];footer:MenuNode[]};
export type Navigation={version:number;menus?:MenuTree;groups?:NavigationGroup[]};
const API=(process.env.API_ORIGIN||'').replace(/\/$/,'');
function migrate(groups:NavigationGroup[]):MenuTree{
 const group=(id:string)=>groups.find(g=>g.id===id);
 const links=(g:NavigationGroup):MenuNode[]=>(g.links||[]).map(x=>({
  id:g.id==='header-primary'?x.id:g.id+'-'+x.id,label:x.label,url:x.url,
  enabled:x.enabled!==false,children:[]
 }));
 const column=(g:NavigationGroup):MenuNode=>({id:g.id,label:g.title,url:'',enabled:true,children:links(g)});
 const primary=group('header-primary');
 const header=primary?links(primary):[];
 for(const item of header){
  const ids=item.id==='nav-solutions'?['header-companies-1','header-companies-2','header-companies-3','header-companies-4']:
   item.id==='nav-resources'?['header-resources-1','header-resources-2','header-resources-3']:[];
  item.children=ids.map(group).filter((x):x is NavigationGroup=>!!x).map(column);
 }
 return {header,footer:groups.filter(x=>x.area==='footer').map(column)};
}
export function menuTree(data:Navigation|null|undefined):MenuTree{
 if(data?.menus&&Array.isArray(data.menus.header)&&Array.isArray(data.menus.footer))return data.menus;
 return Array.isArray(data?.groups)?migrate(data.groups):{header:[],footer:[]};
}
export async function getNavigation():Promise<Navigation>{
 if(!API)return {version:0,menus:{header:[],footer:[]}};
 try{
  const response=await fetch(API+'/v1/public/website/navigation',{
   cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return {version:0,menus:{header:[],footer:[]}};
  const data=await response.json();
  return data&&(data.menus||Array.isArray(data.groups))?data:{version:0,menus:{header:[],footer:[]}};
 }catch{return {version:0,menus:{header:[],footer:[]}};}
}
export function menuLabel(labels:Localized|undefined,locale:string){
 return labels?.[locale]||'';
}
export function menuLocaleFromPath(path:string){
 return path.match(/^\/(tr|en|de|ru|ar|bg|uk|id|vi)(?:\/|$)/)?.[1]||'tr';
}

/** Compatibility for older navigation components; new menus use menuTree. */
export function groupFor(data:Navigation|null|undefined,id:string){
 return data?.groups?.find(group=>group.id===id);
}
