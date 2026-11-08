import {BadRequestException,ConflictException,Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import defaultNavigation = require('./data/marketing-navigation-default.json');

const KEY='marketing_navigation_v1';
type LocaleText=Record<string,string>;
export type MenuNode={id:string;label:LocaleText;url:string;enabled:boolean;children:MenuNode[]};
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
  if(root.id==='nav-solutions')root.children=['header-companies-1','header-companies-2','header-companies-3','header-companies-4']
    .map(find).filter(Boolean).map(heading);
  if(root.id==='nav-resources')root.children=['header-resources-1','header-resources-2','header-resources-3']
    .map(find).filter(Boolean).map(heading);
 }
 return {header:roots,footer:groups.filter(g=>/^footer-\d+$/.test(g.id)).map(heading)};
}
function validateTree(menus:any):MenuTree{
 if(!menus||!Array.isArray(menus.header)||!Array.isArray(menus.footer))
  throw new BadRequestException('Header ve Footer menü ağaçları zorunludur.');
 const seen=new Set<string>();let count=0;
 const parse=(rows:any[],depth:number):MenuNode[]=>{
  if(depth>3||rows.length>50)throw new BadRequestException('Menü seviyesi veya öğe sayısı fazla.');
  return rows.map(row=>{
   if(!row||typeof row!=='object')throw new BadRequestException('Menü öğesi geçersiz.');
   const id=text(row.id,80),url=text(row.url,500);
   if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||seen.has(id))
    throw new BadRequestException('Tekrarlı veya geçersiz menü öğesi.');
   if(!safeUrl(url))throw new BadRequestException('Geçersiz menü URL.');
   seen.add(id);if(++count>250)throw new BadRequestException('En fazla 250 menü öğesi kullanılabilir.');
   if(!Array.isArray(row.children))throw new BadRequestException('Alt menüler dizi olmalıdır.');
   return {id,label:localize(row.label,160),url,enabled:row.enabled!==false,
    children:parse(row.children,depth+1)};
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
  const menus=saved?.menus&&Array.isArray(saved.menus.header)&&Array.isArray(saved.menus.footer)
   ?saved.menus:fromGroups(base.groups);
  return {version:Number(base.version)||0,menus,groups:base.groups};
 }
 async save(input:any){
  const previous=await this.get();
  if(Number(input?.version)!==previous.version)
   throw new ConflictException('Menü başka oturumda güncellendi. Yenileyin.');
  // Accept the former grouped format for compatibility with existing clients.
  const menus=validateTree(input?.menus||fromGroups(input?.groups||previous.groups));
  const next={version:previous.version+1,menus,groups:previous.groups};
  await this.prisma.platformSetting.upsert({where:{key:KEY},
   create:{key:KEY,value:next},update:{value:next}});
  return next;
 }
 async publicNavigation(){return this.get()}
}
