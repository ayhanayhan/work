import {BadRequestException,ConflictException,Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {isUntouchedStarter,isBarePublishedStarter} from './website-tools.service';
import defaultNavigation = require('./data/marketing-navigation-default.json');
import translatedLabels = require('./data/marketing-navigation-translations.json');
import featuredDefaults = require('./data/marketing-navigation-featured.json');

const KEY='marketing_navigation_v1';
type LocaleText=Record<string,string>;
export type MenuFeatured={eyebrow:LocaleText;description:LocaleText;buttonLabel:LocaleText;buttonUrl:string};
export type MenuNode={id:string;label:LocaleText;url:string;enabled:boolean;children:MenuNode[];featured?:MenuFeatured};
export type MenuTree={header:MenuNode[];footer:MenuNode[]};
const text=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);
const safeUrl=(url:string)=>!url||url.startsWith('/')&&!url.startsWith('//')||url.startsWith('#')||/^https:\/\/[^\s]+$/.test(url);
const localize=(value:any,max:number):LocaleText=>{
 const entries=Object.entries(value&&typeof value==='object'&&!Array.isArray(value)?value:{});
 return Object.fromEntries(entries.filter(([locale])=>/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(locale))
  .map(([locale,label])=>[locale,text(label,max)]));
};
function fromGroups(groups:any[]):MenuTree{
 const find=(id:string)=>groups.find(g=>g.id===id);
 const items=(group:any):MenuNode[]=>Array.isArray(group?.links)?group.links.map((x:any)=>({
  id:group.id==='header-primary'?text(x.id,80):text(group.id+'-'+x.id,80),label:localize(x.label,160),url:text(x.url,500),
  enabled:x.enabled!==false,children:[] as MenuNode[]
 })):[];
 const heading=(group:any):MenuNode=>({id:group.id,label:localize(group.title,160),
  url:'',enabled:true,children:items(group)});
 const primary=find('header-primary');
 const defaultRoot=(id:string,title:string,url:string):MenuNode=>({
  id,label:{tr:title},url,enabled:true,children:[]});
 const roots=primary?.links?.length?items(primary):[
  defaultRoot('nav-solutions','Çözümler','#'),
  defaultRoot('nav-features','Özellikler','/paketler.html#tc-compare'),
  defaultRoot('nav-resources','Kaynaklar','#')
 ];
 for(const root of roots){
  if(root.id==='nav-solutions'||root.id==='nav-resources')
   root.featured=(featuredDefaults as Record<string,MenuFeatured>)[root.id];
  if(root.id==='nav-solutions')root.children=['header-companies-1','header-companies-2','header-companies-3','header-companies-4']
    .map(find).filter(Boolean).map(heading);
  if(root.id==='nav-resources')root.children=['header-resources-1','header-resources-2','header-resources-3']
    .map(find).filter(Boolean).map(heading);
 }
 return {header:roots,footer:groups.filter(g=>/^footer-\d+$/.test(g.id)).map(heading)};
}
const MENU_LOCALES=['tr','en','de','ru','ar','bg','uk','id','vi'] as const;
const seedTranslations=translatedLabels as Record<string,Record<string,string>>;
function translated(label:string):LocaleText{
 return {tr:label,...(seedTranslations[label]||{})};
}
// One-time fill: never overwrite translations entered by a user.
const seededFeatured=featuredDefaults as Record<string,MenuFeatured>;
function completeExistingTranslations(tree:MenuTree):MenuTree{
 const fill=(items:MenuNode[]):MenuNode[]=>items.map(node=>{
  const original=node.label?.tr;
  const known=original&&seedTranslations[original];
  const label={...node.label};
  if(known)for(const locale of MENU_LOCALES)
   if(locale!=='tr'&&label[locale]===undefined&&known[locale])label[locale]=known[locale];
  const featured=node.featured?{
   eyebrow:{...node.featured.eyebrow},
   description:{...node.featured.description},
   buttonLabel:{...node.featured.buttonLabel},
   buttonUrl:node.featured.buttonUrl
  }:seededFeatured[node.id]?JSON.parse(JSON.stringify(seededFeatured[node.id])) as MenuFeatured:undefined;
  if(featured&&node.featured&&seededFeatured[node.id]){
   for(const field of ['eyebrow','description','buttonLabel'] as const)
    for(const locale of MENU_LOCALES)
     if(featured[field][locale]===undefined)
      featured[field][locale]=seededFeatured[node.id][field][locale]||'';
  }
  return {...node,label,children:fill(node.children||[]),...(featured?{featured}:{})};
 });
 return {header:fill(tree.header),footer:fill(tree.footer)};
}
const TOOL_MENU_ITEMS=[
 ['qr-kod-olusturucu','QR Kod Oluşturucu'],
 ['kdv-hesaplama','KDV Hesaplama'],
 ['trendyol-komisyon-hesaplama','Trendyol Komisyon Hesaplama'],
 ['amazon-komisyon-hesaplama','Amazon Komisyon Hesaplama'],
 ['hepsiburada-komisyon-hesaplama','Hepsiburada Komisyon Hesaplama'],
 ['n11-komisyon-hesaplama','n11 Komisyon Hesaplama'],
 ['ciceksepeti-komisyon-hesaplama','ÇiçekSepeti Komisyon Hesaplama'],
 ['pazarama-komisyon-hesaplama','Pazarama Komisyon Hesaplama'],
 ['maas-hesaplama','Net-Brüt Maaş Hesaplama'],
 ['gumruk-vergisi-hesaplama','Gümrük Vergisi Hesaplama'],
 ['desi-hesaplama','Desi Hesaplama']
] as const;
const TOOL_PATHS=new Set<string>(TOOL_MENU_ITEMS.map(([slug])=>'/araclar/'+slug));
function seedFooterTools(tree:MenuTree):MenuTree{
 // Move previously seeded menu items instead of losing user-entered translations.
 const carried=new Map<string,MenuNode>();
 const collect=(items:MenuNode[]):void=>{
  for(const node of items){
   if(TOOL_PATHS.has(node.url)&&!carried.has(node.url))carried.set(node.url,node);
   collect(node.children||[]);
  }
 };
 collect(tree.header);
 const clean=(nodes:MenuNode[]):MenuNode[]=>nodes
  .filter(node=>node.url!=='/araclar'&&!TOOL_PATHS.has(node.url))
  .map(node=>({...node,children:clean(node.children||[])}));
 const header=clean(tree.header);
 const footer=tree.footer.map(column=>{
  const previous=column.children||[];
  const links=previous.filter(item=>item.url!=='/araclar');
  if(column.id!=='footer-4')return {...column,children:links};
  const present=new Set(links.map(item=>item.url));
  const additions=TOOL_MENU_ITEMS.filter(([slug])=>!present.has('/araclar/'+slug))
   .map(([slug,title]):MenuNode=>{
    const url='/araclar/'+slug,old=carried.get(url);
    return old?{...old,
     // Older generated tools were disabled while unpublished. Publication
     // visibility is now checked independently in publicNavigation().
     enabled:/^(?:marketplace-|tool-)/.test(old.id)?true:old.enabled,
     children:[]
    }:{
     id:'footer-tool-'+slug,label:translated(title),url,
     enabled:true,children:[]
    };
   });
  const index=links.findIndex(item=>item.url==='/blog/'||item.url==='/blog');
  const insertion=index<0?0:index+1;
  return {...column,children:[...links.slice(0,insertion),...additions,...links.slice(insertion)]};
 });
 return {header,footer};
}
function validateTree(menus:any):MenuTree{
 if(!menus||!Array.isArray(menus.header)||!Array.isArray(menus.footer))
  throw new BadRequestException('Header ve Footer menü ağaçları zorunludur.');
 const seen=new Set<string>();let count=0;
 const parse=(rows:any[],depth:number):MenuNode[]=>{
  if((depth>3&&rows.length>0)||rows.length>50)throw new BadRequestException('Menü seviyesi veya öğe sayısı fazla.');
  return rows.map(row=>{
   if(!row||typeof row!=='object')throw new BadRequestException('Menü öğesi geçersiz.');
   const id=text(row.id,80),url=text(row.url,500);
   if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||seen.has(id))
    throw new BadRequestException('Tekrarlı veya geçersiz menü öğesi.');
   if(!safeUrl(url))throw new BadRequestException('Geçersiz menü URL.');
   seen.add(id);if(++count>250)throw new BadRequestException('En fazla 250 menü öğesi kullanılabilir.');
   if(!Array.isArray(row.children))throw new BadRequestException('Alt menüler dizi olmalıdır.');
   let featured:MenuFeatured|undefined;
   if(row.featured){
    const value=row.featured;
    featured={
     eyebrow:localize(value.eyebrow,160),
     description:localize(value.description,1000),
     buttonLabel:localize(value.buttonLabel,160),
     buttonUrl:text(value.buttonUrl,500)
    };
    if(!safeUrl(featured.buttonUrl))throw new BadRequestException('Geçersiz menü CTA URL.');
   }
   return {id,label:localize(row.label,160),url,enabled:row.enabled!==false,
    children:parse(row.children,depth+1),...(featured?{featured}:{})};
  });
 };
 return {header:parse(menus.header,0),footer:parse(menus.footer,0)};
}
@Injectable()
export class WebsiteNavigationService{
 constructor(private readonly prisma:PrismaService){}
 async get(){
  const row=await this.prisma.platformSetting.findUnique({where:{key:KEY}});
  const saved=row?.value as any;
  const base=saved&&Array.isArray(saved.groups)?saved:defaultNavigation;
  const existing=saved?.menus&&Array.isArray(saved.menus.header)&&Array.isArray(saved.menus.footer)
   ?saved.menus as MenuTree:fromGroups(base.groups);
  // One-time migration: respect user deletions after the first upgraded save.
  const seeded=saved?.toolsFooterMigration===1?existing:seedFooterTools(existing);
  const menus=saved?.navigationTranslationsMigration===1?seeded:completeExistingTranslations(seeded);
  return {version:Number(base.version)||0,menus,groups:base.groups};
 }
 async save(input:any){
  const previous=await this.get();
  if(Number(input?.version)!==previous.version)
   throw new ConflictException('Menü başka oturumda güncellendi. Yenileyin.');
  // Accept the former grouped format for compatibility with existing clients.
  const menus=validateTree(input?.menus||fromGroups(input?.groups||previous.groups));
  const next={version:previous.version+1,menus,groups:previous.groups,marketplaceLinksMigration:1,toolsMenuMigration:1,toolsFooterMigration:1,navigationTranslationsMigration:1};
  await this.prisma.platformSetting.upsert({where:{key:KEY},
   create:{key:KEY,value:next},update:{value:next}});
  return next;
 }
 async publicNavigation(locale='tr'){
  const data=await this.get();
  // Draft and untranslated tools must never point visitors to unpublished
  // detail pages, regardless of their visibility in the Master menu editor.
  const row=await this.prisma.platformSetting.findUnique({where:{key:'marketing_tools_pages_v1'}});
  const tools=Array.isArray((row?.value as any)?.tools)?(row?.value as any).tools as any[]:[];
  const published=new Set<string>(tools.filter(item=>
   (item?.status==='PUBLISHED'&&Boolean(item?.fields?.title?.[locale]))||
   ((isUntouchedStarter(item)||isBarePublishedStarter(item))&&
    Boolean(seedTranslations[item.fields.title.tr]?.[locale]||locale==='tr'))
  ).map(item=>'/araclar/'+item.id));
  // No stored content yet: all eleven starter pages are published by default.
  if(!tools.length)for(const [slug,title] of TOOL_MENU_ITEMS)
   if(locale==='tr'||Boolean(seedTranslations[title]?.[locale]))published.add('/araclar/'+slug);
  const prune=(nodes:MenuNode[]):MenuNode[]=>nodes.map(node=>({
   ...node,
   enabled:node.enabled&&(!TOOL_PATHS.has(node.url)||published.has(node.url)),
   children:prune(node.children||[])
  }));
  return {...data,menus:{header:prune(data.menus.header),footer:prune(data.menus.footer)}};
 }
}
