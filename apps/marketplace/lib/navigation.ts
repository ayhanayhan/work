export type Localized=Record<string,string>;
export type NavigationLink={id:string;label:Localized;url:string;enabled:boolean};
export type NavigationGroup={id:string;area:string;title:Localized;links:NavigationLink[]};
export type MenuFeatured={eyebrow:Localized;description:Localized;buttonLabel:Localized;buttonUrl:string};
export type MenuNode={id:string;label:Localized;url:string;enabled:boolean;children:MenuNode[];featured?:MenuFeatured};
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
/** Normalize pre-Next.js CMS links when rendering navigation; no redirects or HTML routes. */
function contactUrl(url:string):string{
 if(!url)return url;
 if(url==='/yardim'||url==='/yardim/')return 'https://help.ticarti.com/';
 if(/^\/(?:(?:tr|en|de|ru|ar|bg|uk|id|vi)\/)?login(?:\.html)?\/?$/.test(url))return 'https://login.ticarti.com/';
 return url.replace(/(^|\/)paketler\.html(?=$|[?#])/,'$1paketler')
  .replace(/(^|\/)contacto(?:\.html)?(?=$|[?#])/,'$1iletisim');
}
function normalizeNode(node:MenuNode):MenuNode{
 return {...node,url:contactUrl(node.url),featured:node.featured?{...node.featured,buttonUrl:contactUrl(node.featured.buttonUrl)}:undefined,
  children:(node.children||[]).map(normalizeNode)};
}
export function menuTree(data:Navigation|null|undefined):MenuTree{
 const tree=data?.menus&&Array.isArray(data.menus.header)&&Array.isArray(data.menus.footer)?data.menus:
  Array.isArray(data?.groups)?migrate(data.groups):{header:[],footer:[]};
 return {header:tree.header.map(normalizeNode),footer:tree.footer.map(normalizeNode)};
}
export async function getNavigation(locale='tr'):Promise<Navigation>{
 if(!API)return {version:0,menus:{header:[],footer:[]}};
 try{
  const response=await fetch(API+'/v1/public/website/navigation?lang='+encodeURIComponent(locale),{
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
