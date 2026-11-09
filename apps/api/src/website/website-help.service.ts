import {BadRequestException,ConflictException,Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import starter = require('./data/help-starter.json');

const KEY='marketing_help_center_v1';
const slugValid=(value:string)=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<=100;
const plain=(value:unknown,limit:number)=>String(value??'').trim().slice(0,limit);
type Article={id:string;slug:string;question:string;answer:string;enabled:boolean;sortOrder:number};
type Category={id:string;slug:string;title:string;summary:string;enabled:boolean;sortOrder:number;questions:Article[]};

@Injectable()
export class WebsiteHelpService {
 constructor(private readonly prisma:PrismaService){}
 private async read(){
  const row=await this.prisma.platformSetting.findUnique({where:{key:KEY}});
  const raw:any=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:null;
  return raw&&Array.isArray(raw.topics)?raw:{version:0,topics:starter};
 }
 async get(){return this.read();}
 async publicHelp(){
  const snapshot=await this.read();
  return {version:snapshot.version,topics:(snapshot.topics as Category[])
   .filter(c=>c.enabled!==false).map(c=>({...c,questions:c.questions.filter(a=>a.enabled!==false)}))};
 }
 async save(body:any){
  if(!body||!Array.isArray(body.topics)||body.topics.length>100)
   throw new BadRequestException('Yardım kategorileri geçersiz veya çok fazla.');
  const topicIds=new Set<string>(),topicSlugs=new Set<string>(),articleIds=new Set<string>(),slugs=new Set<string>();
  let count=0;
  const topics:Category[]=body.topics.map((c:any,index:number)=>{
   const id=plain(c.id,100);
   if(!slugValid(id)||topicIds.has(id))throw new BadRequestException('Kategori bağlantı adı geçersiz veya tekrar ediyor.');
   topicIds.add(id);
   const topicSlug=plain(c.slug||id,100);
   if(!slugValid(topicSlug)||topicSlugs.has(topicSlug))throw new BadRequestException('Kategori slug adresi geçersiz veya tekrar ediyor.');
   topicSlugs.add(topicSlug);
   const title=plain(c.title,220),summary=plain(c.summary,1500);
   if(!title)throw new BadRequestException('Kategori başlığı boş olamaz.');
   if(!Array.isArray(c.questions)||c.questions.length>250)throw new BadRequestException('Bir kategoride çok fazla makale var.');
   const questions:Article[]=c.questions.map((a:any,j:number)=>{
    count++;if(count>1500)throw new BadRequestException('Çok fazla yardım makalesi.');
    const aid=plain(a.id,100),slug=plain(a.slug,100),question=plain(a.question,300);
    const answer=plain(a.answer,30000);
    if(!slugValid(aid)||articleIds.has(aid)||!slugValid(slug)||slugs.has(slug))
      throw new BadRequestException('Makale ID veya bağlantı adresi geçersiz/tekrar ediyor.');
    if(!question||!answer)throw new BadRequestException('Makale başlığı ve açıklaması zorunludur.');
    articleIds.add(aid);slugs.add(slug);
    return {id:aid,slug,question,answer,enabled:a.enabled!==false,sortOrder:j};
   });
   return {id,slug:topicSlug,title,summary,enabled:c.enabled!==false,sortOrder:index,questions};
  });
  const previous=await this.read();
  if(!Number.isInteger(body.version)||body.version!==previous.version)
   throw new ConflictException('Yardım Merkezi başka bir oturumda güncellendi. Sayfayı yenileyip tekrar deneyin.');
  const next={version:previous.version+1,topics};
  await this.prisma.platformSetting.upsert({
   where:{key:KEY},create:{key:KEY,value:next as any},update:{value:next as any}
  });
  return next;
 }
}
