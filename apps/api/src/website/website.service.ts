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
    return {version:Number(data?.version)||0,posts:Array.isArray(data?.posts)?data.posts:[],categories:Array.isArray(data?.categories)?data.categories:[]};
  }
  private cleanPost(raw:any,index:number){
    const slug=str(raw?.slug,150).toLowerCase();
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new BadRequestException('Blog URL kodu geçersiz.');
    const translations:Record<string,any>={};
    for(const [lang,translation] of Object.entries(raw?.translations||{})){
      if(!/^(tr|en|pt|ru)$/.test(lang))continue;
      const t:any=translation||{};
      translations[lang]={
        title:str(t.title,220).trim(),excerpt:str(t.excerpt,1200).trim(),
        content:str(t.content,40000).trim(),category:str(t.category,120).trim(),
        seoTitle:str(t.seoTitle,220).trim(),seoDescription:str(t.seoDescription,500).trim(),
        imageAlt:str(t.imageAlt,220).trim(),enabled:t.enabled!==false
      };
    }
    if(!Object.values(translations).some((x:any)=>x.title))throw new BadRequestException('En az bir dilde blog başlığı gereklidir.');
    const status=raw?.status==='PUBLISHED'?'PUBLISHED':'DRAFT';
    if(status==='PUBLISHED'&&!Object.values(translations).some((t:any)=>t.enabled&&t.title&&t.content)){
      throw new BadRequestException('Yayınlamak için en az bir dilde başlık ve içerik gerekir.');
    }
    return {
      id:str(raw?.id,90)||slug,slug,status,categoryId:str(raw?.categoryId,90)||null,
      featuredImage:url(raw?.featuredImage),authorName:str(raw?.authorName,160).trim()||'Ticarti',
      sortOrder:index,translations
    };
  }
  async updateBlog(body:any){
    if(!Array.isArray(body?.posts)||body.posts.length>250)throw new BadRequestException('Blog kayıtları geçersiz.');
    const existing=await this.blog();
    if(body.version!==undefined&&Number(body.version)!==existing.version)throw new ConflictException('Blog içeriği başka oturumda değişmiş. Yenileyin.');
    const now=new Date().toISOString();
    const posts=body.posts.map((post:any,i:number)=>{
      const cleaned=this.cleanPost(post,i);
      const previous=existing.posts.find((x:any)=>x.id===cleaned.id||x.slug===cleaned.slug);
      const prevComparable=previous?{
        id:previous.id,slug:previous.slug,status:previous.status,categoryId:previous.categoryId||null,
        featuredImage:previous.featuredImage||'',authorName:previous.authorName||'Ticarti',
        sortOrder:previous.sortOrder,translations:previous.translations
      }:null;
      const changed=JSON.stringify(cleaned)!==JSON.stringify(prevComparable);
      return {
        ...cleaned,
        publishedAt:cleaned.status==='PUBLISHED'?(previous?.publishedAt||now):(previous?.publishedAt||null),
        updatedAt:changed?now:(previous?.updatedAt||now)
      };
    });
    if(new Set(posts.map((x:any)=>x.slug)).size!==posts.length)throw new BadRequestException('Blog URL kodları tekrar ediyor.');
    // Standalone Ticarti.com category records. Existing post category text stays
    // compatible with the public feed and the original marketing templates.
    const inputCategories=body.categories===undefined?existing.categories:body.categories;
    if(!Array.isArray(inputCategories)||inputCategories.length>200)throw new BadRequestException('Blog kategorileri geçersiz.');
    const categories=inputCategories.map((raw:any,index:number)=>{
      const id=str(raw?.id,90).trim();
      if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id))throw new BadRequestException('Kategori kimliği geçersiz.');
      const translations:Record<string,any>={};
      for(const [lang,value] of Object.entries(raw?.translations||{})){
        if(!/^(tr|en|pt|ru)$/.test(lang))continue;
        const t:any=value||{};
        translations[lang]={
          title:str(t.title,160).trim(),slug:str(t.slug,160).trim().toLowerCase(),
          description:str(t.description,1600).trim(),
          seoTitle:str(t.seoTitle,220).trim(),seoDescription:str(t.seoDescription,500).trim()
        };
        if(translations[lang].slug&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(translations[lang].slug))throw new BadRequestException('Kategori SEO URL kodu geçersiz.');
      }
      if(!Object.values(translations).some((t:any)=>t.title))throw new BadRequestException('Kategori adı en az bir dilde gereklidir.');
      return {id,parentId:str(raw?.parentId,90)||null,isActive:raw?.isActive!==false,sortOrder:index,translations};
    });
    const categoryIds=new Set(categories.map((c:any)=>c.id));
    if(categoryIds.size!==categories.length)throw new BadRequestException('Tekrarlanan kategori kimliği var.');
    for(const category of categories){
      if(category.parentId&&!categoryIds.has(category.parentId))throw new BadRequestException('Üst kategori bulunamadı.');
      if(category.parentId===category.id)throw new BadRequestException('Kategori kendisine bağlanamaz.');
      const seen=new Set<string>([category.id]);let current=category;
      while(current.parentId){
        if(seen.has(current.parentId))throw new BadRequestException('Kategori döngüsü tespit edildi.');
        seen.add(current.parentId);
        current=categories.find((c:any)=>c.id===current.parentId);
        if(!current)break;
      }
    }
    for(const post of posts){
      if(post.categoryId&&!categoryIds.has(post.categoryId))throw new BadRequestException('Yazının blog kategorisi bulunamadı.');
    }
    const version=existing.version+1;
    const payload={version,posts,categories};
    if(Buffer.byteLength(JSON.stringify(payload),'utf8')>2_500_000)throw new BadRequestException('Blog veri boyutu sınırı aşıldı.');
    await this.put(BLOG_KEY,payload);
    return payload;
  }
  async publicBlog(lang='tr'){
    const data=await this.blog();
    const locale=/^(tr|en|pt|ru)$/.test(lang)?lang:'';
    const hasContent=(t:any)=>t?.enabled!==false&&typeof t?.title==='string'&&!!t.title.trim()&&typeof t?.content==='string'&&!!t.content.trim();
    const posts=data.posts.filter((x:any)=>x.status==='PUBLISHED'&&hasContent(x.translations?.[locale])).map((x:any)=>{
      const t=x.translations[locale];
      return {
        slug:x.slug,status:x.status,featuredImage:x.featuredImage||'',
        title:t.title,excerpt:t.excerpt||'',content:t.content,
        category:(data.categories.find((c:any)=>c.id===x.categoryId&&c.isActive!==false)?.translations?.[locale]?.title)||t.category||'Blog',seoTitle:t.seoTitle||'',seoDescription:t.seoDescription||'',
        imageAlt:t.imageAlt||t.title,authorName:x.authorName||'Ticarti',
        publishedAt:x.publishedAt||null,updatedAt:x.updatedAt||null,
        availableLocales:['tr','en','pt','ru'].filter(code=>hasContent(x.translations?.[code]))
      };
    });
    return {version:data.version,locale,posts};
  }
  async publicBlogPost(slug:string,lang='tr'){
    const feed=await this.publicBlog(lang);
    return feed.posts.find((x:any)=>x.slug===slug)||null;
  }

}
