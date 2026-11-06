import {BadRequestException,ConflictException,Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {activePlatformLocales} from '../common/platform-locales';

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
  async publicFaq(lang='tr'){
    const locales=await activePlatformLocales(this.prisma);
    if(!locales.some(x=>x.locale===lang))return {enabled:false,configured:false,items:[],fields:{}};
    const home=await this.home();
    const module=home.modules.find((x:any)=>x.id==='faq');
    return module?{enabled:module.enabled!==false,configured:home.version>0&&Array.isArray(module.items)&&module.items.length>0,
      fields:module.fields,items:module.items}: {enabled:false,configured:false,fields:{},items:[]};
  }
  async activeLocales(){return activePlatformLocales(this.prisma)}
  async blog(){
    const data=await this.get(BLOG_KEY);
    return {version:Number(data?.version)||0,posts:Array.isArray(data?.posts)?data.posts:[],categories:Array.isArray(data?.categories)?data.categories:[],authors:Array.isArray(data?.authors)?data.authors:[]};
  }
  private cleanPost(raw:any,index:number){
    const slug=str(raw?.slug,150).toLowerCase();
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new BadRequestException('Blog URL kodu geçersiz.');
    const translations:Record<string,any>={};
    for(const [lang,translation] of Object.entries(raw?.translations||{})){
      if(!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(lang))continue;
      const t:any=translation||{};
      translations[lang]={
        title:str(t.title,220).trim(),slug:str(t.slug,150).trim().toLowerCase(),excerpt:str(t.excerpt,1200).trim(),
        content:str(t.content,40000).trim(),category:str(t.category,120).trim(),
        seoTitle:str(t.seoTitle,220).trim(),seoDescription:str(t.seoDescription,500).trim(),
        imageAlt:str(t.imageAlt,220).trim(),enabled:t.enabled!==false
      };
    }
    for(const t of Object.values(translations)){
      if(t.slug&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug))throw new BadRequestException('Dil bazlı blog URL kodu geçersiz.');
    }
    if(!Object.values(translations).some((x:any)=>x.title))throw new BadRequestException('En az bir dilde blog başlığı gereklidir.');
    const status=['PUBLISHED','DRAFT','ARCHIVED'].includes(raw?.status)?raw.status:'DRAFT';
    if(status==='PUBLISHED'&&!Object.values(translations).some((t:any)=>t.enabled&&t.title&&t.content)){
      throw new BadRequestException('Yayınlamak için en az bir dilde başlık ve içerik gerekir.');
    }
    return {
      id:str(raw?.id,90)||slug,slug,status,categoryId:str(raw?.categoryId,90)||null,authorId:str(raw?.authorId,90)||null,
      featuredImage:url(raw?.featuredImage),authorName:str(raw?.authorName,160).trim()||'Ticarti',
      sortOrder:index,translations,
      tags:Array.isArray(raw?.tags)?raw.tags.slice(0,30).map((x:any)=>str(x,80).trim()).filter(Boolean):[],
      relatedPostIds:Array.isArray(raw?.relatedPostIds)?[...new Set(raw.relatedPostIds.map((x:any)=>str(x,90)))].slice(0,30):[],
      scheduledAt:raw?.scheduledAt&&Number.isFinite(Date.parse(raw.scheduledAt))?new Date(raw.scheduledAt).toISOString():null,
      isFeatured:raw?.isFeatured===true,ogImage:url(raw?.ogImage),
      canonicalUrl:raw?.canonicalUrl?link(raw.canonicalUrl):'',noIndex:raw?.noIndex===true
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
        featuredImage:previous.featuredImage||'',authorName:previous.authorName||'Ticarti',authorId:previous.authorId||null,
        sortOrder:previous.sortOrder,translations:previous.translations,
        tags:previous.tags||[],relatedPostIds:previous.relatedPostIds||[],
        scheduledAt:previous.scheduledAt||null,isFeatured:previous.isFeatured===true,
        ogImage:previous.ogImage||'',canonicalUrl:previous.canonicalUrl||'',noIndex:previous.noIndex===true
      }:null;
      const changed=JSON.stringify(cleaned)!==JSON.stringify(prevComparable);
      return {
        ...cleaned,
        publishedAt:cleaned.status==='PUBLISHED'?(previous?.publishedAt||now):(previous?.publishedAt||null),
        updatedAt:changed?now:(previous?.updatedAt||now)
      };
    });
    if(new Set(posts.map((x:any)=>x.slug)).size!==posts.length)throw new BadRequestException('Blog URL kodları tekrar ediyor.');
    for(const locale of new Set<string>(posts.flatMap((p:any):string[]=>Object.keys(p.translations||{})))){
      const slugs=posts.map((p:any)=>p.translations?.[locale]?.slug||p.slug);
      if(new Set(slugs).size!==slugs.length)throw new BadRequestException(locale+' dilinde tekrarlanan blog URL kodu var.');
    }
    // Standalone Ticarti.com category records. Existing post category text stays
    // compatible with the public feed and the original marketing templates.
    const inputCategories=body.categories===undefined?existing.categories:body.categories;
    if(!Array.isArray(inputCategories)||inputCategories.length>200)throw new BadRequestException('Blog kategorileri geçersiz.');
    const categories=inputCategories.map((raw:any,index:number)=>{
      const id=str(raw?.id,90).trim();
      if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id))throw new BadRequestException('Kategori kimliği geçersiz.');
      const translations:Record<string,any>={};
      for(const [lang,value] of Object.entries(raw?.translations||{})){
        if(!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(lang))continue;
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
      const seen=new Set<string>([category.id]);
      let parentId:string|null=category.parentId;
      while(parentId){
        if(seen.has(parentId))throw new BadRequestException('Kategori döngüsü tespit edildi.');
        seen.add(parentId);
        const parent=categories.find((c:any)=>c.id===parentId);
        parentId=parent?.parentId||null;
      }
    }
    for(const post of posts){
      if(post.categoryId&&!categoryIds.has(post.categoryId))throw new BadRequestException('Yazının blog kategorisi bulunamadı.');
    }
    const inputAuthors=body.authors===undefined?existing.authors:body.authors;
    if(!Array.isArray(inputAuthors)||inputAuthors.length>100)throw new BadRequestException('Blog yazarları geçersiz.');
    const authors=inputAuthors.map((raw:any,index:number)=>{
      const id=str(raw?.id,90).trim(),slug=str(raw?.slug,150).trim().toLowerCase();
      if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        throw new BadRequestException('Yazar kimliği veya slug geçersiz.');
      const translations:Record<string,any>={};
      for(const [locale,tValue] of Object.entries(raw?.translations||{})){
        if(!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(locale))continue;
        const t:any=tValue||{};
        translations[locale]={name:str(t.name,150).trim(),bio:str(t.bio,4000).trim(),
          seoTitle:str(t.seoTitle,220).trim(),seoDescription:str(t.seoDescription,500).trim()};
      }
      if(!Object.values(translations).some((t:any)=>t.name))throw new BadRequestException('Yazar adı zorunlu.');
      const socials:Record<string,string>={};
      for(const key of ['website','linkedin','instagram','x','facebook','youtube']){
        const val=str(raw?.socials?.[key],400).trim();
        if(val&&!/^https:\/\/[^\s<>"']+$/i.test(val))throw new BadRequestException('Sosyal medya adresi HTTPS olmalıdır.');
        if(val)socials[key]=val;
      }
      return {id,slug,isActive:raw?.isActive!==false,avatar:url(raw?.avatar),sortOrder:index,socials,translations};
    });
    if(new Set(authors.map((x:any)=>x.id)).size!==authors.length||
       new Set(authors.map((x:any)=>x.slug)).size!==authors.length)
      throw new BadRequestException('Tekrarlanan yazar slug veya kimliği.');
    const authorIds=new Set(authors.map((x:any)=>x.id));
    for(const post of posts)if(post.authorId&&!authorIds.has(post.authorId))
      throw new BadRequestException('Yazıya bağlı yazar bulunamadı. Önce yazının yazarını değiştirin.');
    const postIds=new Set(posts.map((p:any)=>p.id));
    for(const post of posts){
      if(post.relatedPostIds.some((id:string)=>id===post.id||!postIds.has(id)))throw new BadRequestException('İlgili blog yazısı bulunamadı.');
    }
    const version=existing.version+1;
    const payload={version,posts,categories,authors};
    if(Buffer.byteLength(JSON.stringify(payload),'utf8')>2_500_000)throw new BadRequestException('Blog veri boyutu sınırı aşıldı.');
    await this.put(BLOG_KEY,payload);
    return payload;
  }
  async publicBlog(lang='tr'){
    const data=await this.blog();
    const activeLocales=(await activePlatformLocales(this.prisma)).map(x=>x.locale);
    const locale=activeLocales.includes(lang.toLowerCase())?lang.toLowerCase():'';
    const hasContent=(t:any)=>t?.enabled!==false&&typeof t?.title==='string'&&!!t.title.trim()&&typeof t?.content==='string'&&!!t.content.trim();
    const now=Date.now();
    const posts=data.posts.filter((x:any)=>x.status==='PUBLISHED'&&(!x.scheduledAt||Date.parse(x.scheduledAt)<=now)&&hasContent(x.translations?.[locale])).map((x:any)=>{
      const t=x.translations[locale];
      return {
        id:x.id,slug:t.slug||x.slug,status:x.status,featuredImage:x.featuredImage||'',
        localeSlugs:Object.fromEntries(activeLocales.filter(code=>hasContent(x.translations?.[code])).map(code=>[code,x.translations?.[code]?.slug||x.slug])),
        title:t.title,excerpt:t.excerpt||str(t.content||'',800).replace(/```[\s\S]*?```/g,' ').replace(/!?\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/<[^>]*>/g,' ').replace(/[#*_>~|`]/g,' ').replace(/\s+/g,' ').trim().slice(0,240),content:t.content,
        category:(data.categories.find((c:any)=>c.id===x.categoryId&&c.isActive!==false)?.translations?.[locale]?.title)||t.category||'Blog',seoTitle:t.seoTitle||'',seoDescription:t.seoDescription||'',
        imageAlt:t.imageAlt||t.title,authorName:(data.authors.find((a:any)=>a.id===x.authorId&&a.isActive!==false)?.translations?.[locale]?.name)||x.authorName||'Ticarti',
        author:(()=>{const a=data.authors.find((v:any)=>v.id===x.authorId&&v.isActive!==false);if(!a)return null;const tr=a.translations?.[locale];return tr?.name?{slug:a.slug,name:tr.name,bio:tr.bio||'',seoTitle:tr.seoTitle||'',seoDescription:tr.seoDescription||'',avatar:a.avatar||'',socials:a.socials||{}}:null;})(),
        tags:x.tags||[],isFeatured:x.isFeatured===true,relatedPostIds:x.relatedPostIds||[],
        ogImage:x.featuredImage||'',canonicalUrl:'',noIndex:x.noIndex===true,
        publishedAt:x.publishedAt||null,updatedAt:x.updatedAt||null,
        availableLocales:activeLocales.filter(code=>hasContent(x.translations?.[code]))
      };
    });
    posts.sort((a:any,b:any)=>Number(b.isFeatured===true)-Number(a.isFeatured===true));
    return {version:data.version,locale,posts};
  }
  async publicBlogPost(slug:string,lang='tr'){
    const feed=await this.publicBlog(lang);
    return feed.posts.find((x:any)=>x.slug===slug)||null;
  }

}
