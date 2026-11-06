import {BadRequestException,ConflictException,Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

const HOME_KEY='marketing_homepage_v1';
const BLOG_KEY='marketing_blog_v1';
const MODULE_IDS=['hero','animated','builder','radar','channels','showcase','references','bottomCta','blog','faq'] as const;
const MODULE_TITLES=['Ana Slider','Hareketli Başlık','Özellik Kartları','Operasyon','Satış Kanalları','Öne Çıkan Özellikler','Referanslar','Alt Çağrı Alanı','Blog','Sıkça Sorulan Sorular'];
const ITEM_FIELDS:Record<string,string[]>={animated:['heading'],builder:['heading','description'],radar:['heading','description'],channels:['description','button'],showcase:['heading','role','description','button'],references:['heading','description'],faq:['question','answer']};
const MODULE_FIELDS:Record<string,string[]>={hero:['heading','description','offer'],animated:['heading','description'],builder:[],radar:['heading','description'],channels:['heading','description'],showcase:['heading','description'],references:['heading'],bottomCta:['heading','offer'],blog:['heading','description'],faq:['heading','description']};
const str=(v:any,max=8000)=>String(v===undefined||v===null?'':v).slice(0,max);
function localized(v:any,max=8000):Record<string,string>{
  if(!v||typeof v!=='object'||Array.isArray(v))return {};
  const out:Record<string,string>={};
  for(const [lang,text] of Object.entries(v)){
    if(!/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(lang))continue;
    out[lang]=str(text,max);
  }
  return out;
}
function url(v:any):string{
  const value=str(v,2048).trim();
  if(!value)return '';
  if(value.startsWith('/assets/')||value.startsWith('../assets/'))return value;
  if(/^https:\/\//i.test(value))return value;
  throw new BadRequestException('Görsel veya bağlantı URL geçersiz.');
}
function link(v:any):string{
  const value=str(v,2048).trim();
  if(!value)return '';
  if(/^https:\/\//i.test(value))return value;
  if(!value.startsWith('/')&&!value.startsWith('#')&&!value.startsWith('./')&&!value.startsWith('../')&&!value.includes(':'))return value;
  if(value.startsWith('#')||value.startsWith('/')||value.startsWith('./')||value.startsWith('../'))return value;
  throw new BadRequestException('Bağlantı geçersiz.');
}
function safeFields(raw:any,allowed:string[]){
  const fields:any={};for(const key of allowed)fields[key]=localized(raw?.[key]);return fields;
}
function safeItems(moduleId:string,input:any){
  if(!ITEM_FIELDS[moduleId])return [];
  if(!Array.isArray(input))throw new BadRequestException('Modül kayıtları liste olmalıdır.');
  if(input.length>(moduleId==='faq'?80:40))throw new BadRequestException('Çok fazla tekrar eden kayıt var.');
  const seen=new Set<string>();
  return input.map((item:any,index:number)=>{
    const id=str(item?.id,90);
    if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id)||seen.has(id))throw new BadRequestException('Kayıt kimliği geçersiz veya tekrar ediyor.');
    seen.add(id);
    return {id,enabled:item?.enabled!==false,sortOrder:index,fields:safeFields(item?.fields,ITEM_FIELDS[moduleId]),assets:{image:url(item?.assets?.image)},links:{href:link(item?.links?.href)}};
  });
}
function defaultModules(){
  return MODULE_IDS.map((id,i)=>({id,title:MODULE_TITLES[i],selector:({
    hero:'.tc-site-hero',animated:'.tc-animated-heading',builder:'.tc-builder-section',radar:'.tc-dashboard-radar',channels:'.tc-sales-channels',showcase:'.tc-showcase',references:'.tc-press',bottomCta:'.tc-bottom-cta',blog:'#tc-blog',faq:'#tc-faq'
  } as any)[id],enabled:true,sortOrder:i,fields:safeFields({},MODULE_FIELDS[id]),items:[]}));
}
@Injectable()
export class WebsiteService{
  constructor(private readonly prisma:PrismaService){}
  private async get(key:string){
    const row=await this.prisma.platformSetting.findUnique({where:{key}});
    return row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value as any:null;
  }
  private async put(key:string,value:any){
    return this.prisma.platformSetting.upsert({where:{key},create:{key,value},update:{value}});
  }
  async home(){
    const data=await this.get(HOME_KEY);
    const modules=defaultModules().map(m=>{
      const saved=(Array.isArray(data?.modules)?data.modules:[]).find((x:any)=>x?.id===m.id);
      return saved?{...m,...saved,title:m.title,selector:m.selector}:{...m};
    });
    return {version:Number(data?.version)||0,modules};
  }
  async publicHome(lang='tr'){
    const data=await this.home();
    const locale=/^[a-z]{2,3}(?:-[A-Za-z]{2})?$/.test(lang)?lang:'tr';
    return {version:data.version,locale,modules:data.modules.filter((x:any)=>x.enabled!==false)};
  }
  async updateModule(id:string,body:any){
    if(!MODULE_IDS.includes(id as any))throw new BadRequestException('Geçersiz modül.');
    const snapshot=await this.home();
    if(body.version!==undefined&&Number(body.version)!==snapshot.version)throw new ConflictException('İçerik başka bir oturumda güncellendi. Sayfayı yenileyin.');
    const previous=snapshot.modules.find((x:any)=>x.id===id)!;
    const allowed=MODULE_FIELDS[id];
    const module={...previous,enabled:body.enabled!==false,fields:safeFields(body.fields,allowed),items:safeItems(id,body.items||[])};
    const modules=snapshot.modules.map(x=>x.id===id?module:x);
    const version=snapshot.version+1;
    await this.put(HOME_KEY,{version,modules});
    return {version,module};
  }
  async importHome(body:any){
    if(!Array.isArray(body?.modules))throw new BadRequestException('Anasayfa içerik dosyası geçersiz.');
    const snapshot=await this.home();
    if(body.version!==undefined&&Number(body.version)!==snapshot.version)throw new ConflictException('İçerik güncellenmiş. İçe aktarmadan önce sayfayı yenileyin.');
    const inputs=body.modules;
    if(inputs.length!==MODULE_IDS.length || new Set(inputs.map((x:any)=>x?.id)).size!==MODULE_IDS.length)throw new BadRequestException('İçe aktarma dosyası 10 farklı anasayfa modülünü içermeli.');
    const modules=snapshot.modules.map(m=>{
      const input=inputs.find((x:any)=>x.id===m.id);
      if(!input)throw new BadRequestException('Eksik modül: '+m.id);
      return {...m,enabled:input.enabled!==false,fields:safeFields(input.fields,MODULE_FIELDS[m.id]),items:safeItems(m.id,input.items||[])};
    });
    const version=snapshot.version+1;
    await this.put(HOME_KEY,{version,modules});
    return {version,modules};
  }
  async blog(){
    const data=await this.get(BLOG_KEY);
    return {version:Number(data?.version)||0,posts:Array.isArray(data?.posts)?data.posts:[]};
  }
  private cleanPost(raw:any,index:number){
    const slug=str(raw?.slug,150).toLocaleLowerCase('tr-TR');
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new BadRequestException('Blog URL kodu geçersiz.');
    const translations:any={};
    for(const [lang,translation] of Object.entries(raw?.translations||{})){
      if(!/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(lang))continue;
      const t:any=translation||{};
      translations[lang]={title:str(t.title,220),excerpt:str(t.excerpt,1200),content:str(t.content,40000),category:str(t.category,120),seoTitle:str(t.seoTitle,220),seoDescription:str(t.seoDescription,500)};
    }
    if(!Object.values(translations).some((x:any)=>x.title))throw new BadRequestException('Blog başlığı gereklidir.');
    return {id:str(raw?.id,90)||slug,slug,status:raw?.status==='PUBLISHED'?'PUBLISHED':'DRAFT',featuredImage:url(raw?.featuredImage),sortOrder:index,translations};
  }
  async updateBlog(body:any){
    if(!Array.isArray(body?.posts)||body.posts.length>250)throw new BadRequestException('Blog kayıtları geçersiz.');
    const existing=await this.blog();
    if(body.version!==undefined&&Number(body.version)!==existing.version)throw new ConflictException('Blog içeriği başka oturumda değişmiş. Yenileyin.');
    const posts=body.posts.map((post:any,i:number)=>this.cleanPost(post,i));
    if(new Set(posts.map((x:any)=>x.slug)).size!==posts.length)throw new BadRequestException('Blog URL kodları tekrar ediyor.');
    const version=existing.version+1;
    await this.put(BLOG_KEY,{version,posts});
    return {version,posts};
  }
  async publicBlog(lang='tr'){
    const data=await this.blog();
    const locale=/^[a-z]{2,3}(?:-[A-Za-z]{2})?$/.test(lang)?lang:'tr';
    return {version:data.version,posts:data.posts.filter((x:any)=>x.status==='PUBLISHED').map((x:any)=>({
      slug:x.slug,status:x.status,featuredImage:x.featuredImage,
      ...x.translations?.[locale],...(!x.translations?.[locale]?.title?x.translations?.tr||{}:{})
    }))};
  }
  async publicBlogPost(slug:string,lang='tr'){
    const feed=await this.publicBlog(lang);
    return feed.posts.find((x:any)=>x.slug===slug)||null;
  }
}
