import {BadRequestException,ConflictException,Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import defaultNavigation = require('./data/marketing-navigation-default.json');

const KEY='marketing_navigation_v1';
const safe=(value:any,max:number)=>String(value??'').trim().slice(0,max);
const localize=(value:any,max:number)=>{
 const out:Record<string,string>={};
 for(const [language,label] of Object.entries(value&&typeof value==='object'&&!Array.isArray(value)?value:{})){
  if(/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(language))out[language]=safe(label,max);
 }
 return out;
};
function validate(input:any){
 if(!Array.isArray(input?.groups)||input.groups.length!==defaultNavigation.groups.length)
  throw new BadRequestException('Menü grupları eksik.');
 const expected=defaultNavigation.groups.map(x=>x.id);
 if(new Set(input.groups.map((x:any)=>x?.id)).size!==expected.length||
  expected.some(id=>!input.groups.some((x:any)=>x.id===id)))
  throw new BadRequestException('Geçersiz menü grubu.');
 return input.groups.map((group:any)=>{
  if(!Array.isArray(group.links)||group.links.length>40)
   throw new BadRequestException('Bir grupta en fazla 40 bağlantı olabilir.');
  const seen=new Set<string>();
  return {id:group.id,area:group.id.startsWith('header-')?'header':'footer',
   title:localize(group.title,100),
   links:group.links.map((link:any)=>{
    const id=safe(link.id,80),url=safe(link.url,500);
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||seen.has(id))
     throw new BadRequestException('Bağlantı kimliği tekrarlı veya geçersiz.');
    seen.add(id);
    if(url&&!url.startsWith('/')&&!url.startsWith('#')&&!/^https:\/\/[^\s]+$/.test(url))
     throw new BadRequestException('Bağlantı URL geçersiz.');
    return {id,label:localize(link.label,160),url,enabled:link.enabled!==false};
   })}
 });
}
@Injectable()
export class WebsiteNavigationService{
 constructor(private readonly prisma:PrismaService){}
 async get(){
  const row=await this.prisma.platformSetting.findUnique({where:{key:KEY}});
  const saved=row?.value as any;
  if(!saved||!Array.isArray(saved.groups))return defaultNavigation;
  return saved;
 }
 async save(input:any){
  const previous=await this.get();
  if(Number(input?.version)!==Number(previous.version))
   throw new ConflictException('Menü başka oturumda güncellendi. Yenileyin.');
  const next={version:previous.version+1,groups:validate(input)};
  await this.prisma.platformSetting.upsert({
   where:{key:KEY},create:{key:KEY,value:next},update:{value:next}});
  return next;
 }
 async publicNavigation(){return this.get()}
}
