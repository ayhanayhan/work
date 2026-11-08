import {BadRequestException,ConflictException,HttpException,HttpStatus,Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {randomUUID} from 'node:crypto';
import {activePlatformLocales} from '../common/platform-locales';
import initialBlog from './data/ticarti-blog-initial.json';
import {FAQ_SEED_MARKER,mergeFaqSeed} from './faq-seed';

const HOME_KEY='marketing_homepage_v1';
const BLOG_KEY='marketing_blog_v1';
const SEO_KEY='marketing_seo_v1';
const MODULE_IDS=['hero','animated','builder','radar','channels','showcase','references','bottomCta','blog','faq'] as const;
const MODULE_TITLES=['Ana Slider','Hareketli Başlık','Özellik Kartları','Operasyon','Satış Kanalları','Öne Çıkan Özellikler','Referanslar','Alt Çağrı Alanı','Blog','Sıkça Sorulan Sorular'];
const ITEM_FIELDS:Record<string,string[]>={hero:['heading','description'],animated:['heading'],builder:['heading','description'],radar:['heading','description'],channels:['description','button'],showcase:['heading','role','description','button'],references:['heading','description'],faq:['question','answer']};
const MODULE_FIELDS:Record<string,string[]>={hero:['heading','description','offer','button','buttonUrl','formButton','consentText','consentLinkText','phonePlaceholder','phoneEmpty','phoneInvalid','kvkkRequired','notConnected'],animated:['heading','description'],builder:[],radar:['heading','description'],channels:['heading','description'],showcase:['heading','description'],references:['heading'],bottomCta:['heading','offer'],blog:['heading','description'],faq:['heading','description','button','buttonUrl']};
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
    return {id,enabled:item?.enabled!==false,sortOrder:index,fields:safeFields(item?.fields,ITEM_FIELDS[moduleId]),assets:{image:url(item?.assets?.image),logo:url(item?.assets?.logo)},links:{href:link(item?.links?.href)},storeId:str(item?.storeId,90)};
  });
}
function safeLogos(raw:any){
 if(!Array.isArray(raw))return [];
 if(raw.length>100)throw new BadRequestException('Logo sayısı en fazla 100 olabilir.');
 const seen=new Set<string>();
 return raw.map((item:any,index:number)=>{
   const id=str(item?.id,90);
   if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id)||seen.has(id))throw new BadRequestException('Logo kimliği geçersiz veya tekrar ediyor.');
   seen.add(id);
   return {id,enabled:item?.enabled!==false,sortOrder:index,
     fields:{title:localized(item?.fields?.title,220)},assets:{image:url(item?.assets?.image)},storeId:str(item?.storeId,90)};
 });
}
function safeCategories(raw:any){
 if(raw===undefined)return [];
 if(!Array.isArray(raw)||raw.length>200)throw new BadRequestException('Blog kategori seçimi geçersiz.');
 return [...new Set(raw.map((x:any)=>str(x,90)))].filter(Boolean);
}
function defaultModules(){
  return MODULE_IDS.map((id,i)=>({id,title:MODULE_TITLES[i],selector:({
    hero:'.tc-site-hero',animated:'.tc-animated-heading',builder:'.tc-builder-section',radar:'.tc-dashboard-radar',channels:'.tc-sales-channels',showcase:'.tc-showcase',references:'.tc-press',bottomCta:'.tc-bottom-cta',blog:'#tc-blog',faq:'#tc-faq'
  } as any)[id],enabled:true,sortOrder:i,configured:false,fields:safeFields({},MODULE_FIELDS[id]),items:[],logos:[],ctaEnabled:true,categoryIds:[]}));
}
@Injectable()
export class WebsiteService{
  constructor(private readonly prisma:PrismaService){}
  /** Explicit maintenance operation, never part of API bootstrap.
   * This keeps Cloud Run startup, readiness and normal requests independent of content migration.
   * The transaction writes the content and marker atomically without overwriting edited translations.
   */
  async seedInitialFaq(){
    const marker=await this.prisma.platformSetting.findUnique({where:{key:FAQ_SEED_MARKER}});
    if(marker)return {alreadySeeded:true,inserted:0};
    try{
      return await this.prisma.$transaction(async tx=>{
        const done=await tx.platformSetting.findUnique({where:{key:FAQ_SEED_MARKER}});
        if(done)return {alreadySeeded:true,inserted:0};
        const row=await tx.platformSetting.findUnique({where:{key:HOME_KEY}});
        const saved=row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value as any:null;
        // Keep the exact saved module ordering and records; append only missing
        // default modules instead of reconstructing the entire homepage snapshot.
        const defaults=defaultModules();
        const existing=Array.isArray(saved?.modules)?saved.modules:[];
        const modules=[
          ...existing.map((record:any)=>structuredClone(record)),
          ...defaults.filter(m=>!existing.some((x:any)=>x?.id===m.id))
        ];
        const index=modules.findIndex(x=>x.id==='faq');
        const merged=mergeFaqSeed(modules[index]);
        modules[index]=merged.module;
        const version=(Number(saved?.version)||0)+1;
        await tx.platformSetting.upsert({
          where:{key:HOME_KEY},
          create:{key:HOME_KEY,value:{...(saved||{}),version,modules}},
          update:{value:{...(saved||{}),version,modules}}
        });
        await tx.platformSetting.create({
          data:{key:FAQ_SEED_MARKER,value:{version,added:merged.inserted,filled:merged.filled,locales:['tr','en','de','ru','ar'],completedAt:new Date().toISOString()}}
        });
        console.info('[ticarti-faq-seed] committed', {version,added:merged.inserted,filled:merged.filled});
        return {alreadySeeded:false,inserted:merged.inserted};
      },{isolationLevel:'Serializable'});
    }catch(error){
      // Another Cloud Run instance may win the same unique marker transaction.
      if(['P2002','P2034'].includes(String((error as any)?.code||''))){
        const winner=await this.prisma.platformSetting.findUnique({where:{key:FAQ_SEED_MARKER}});
        if(winner)return {alreadySeeded:true,inserted:0};
      }
      throw error;
    }
  }
  private async get(key:string){
    const row=await this.prisma.platformSetting.findUnique({where:{key}});
    return row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value as any:null;
  }
  private async put(key:string,value:any){
    return this.prisma.platformSetting.upsert({where:{key},create:{key,value},update:{value}});
  }
  async websiteSeo(){
    const saved=await this.get(SEO_KEY);
    return {
      version:Number(saved?.version)||0,
      siteName:str(saved?.siteName,100)||'Ticarti',
      defaultOgImage:str(saved?.defaultOgImage,2048),
      organizationLogo:str(saved?.organizationLogo,2048)||'/assets/images/ticarti-logo.svg',
      googleVerification:str(saved?.googleVerification,250),bingVerification:str(saved?.bingVerification,250),
      robotsText:str(saved?.robotsText,10000),
      allowIndexing:saved?.allowIndexing!==false,
      pages:saved?.pages&&typeof saved.pages==='object'&&!Array.isArray(saved.pages)?saved.pages:{},
      redirects:Array.isArray(saved?.redirects)?saved.redirects:[]
    };
  }
  async publicWebsiteSeo(){
    const seo=await this.websiteSeo();
    return {
      siteName:seo.siteName,defaultOgImage:seo.defaultOgImage,
      organizationLogo:seo.organizationLogo,robotsText:seo.robotsText,
      googleVerification:seo.googleVerification,bingVerification:seo.bingVerification,
      allowIndexing:seo.allowIndexing,pages:seo.pages,redirects:seo.redirects
    };
  }
  async updateWebsiteSeo(body:any){
    const current=await this.websiteSeo();
    if(Number(body?.version)!==current.version)throw new ConflictException('SEO ayarları başka oturumda güncellendi.');
    const locales=['tr','en','de','ru','ar'];
    const allowedPages=['home','blog','pricing','contact','enterprise','privacy','terms','kvkk'];
    const pageFields=['title','description','ogTitle','ogDescription','ogImage','twitterTitle','twitterDescription','canonicalPath'];
    const pages:Record<string,any>={};
    for(const id of allowedPages){
      const source=body?.pages?.[id];
      if(!source||typeof source!=='object')continue;
      const translations:Record<string,any>={};
      for(const locale of locales){
        const values=source?.[locale];
        if(!values||typeof values!=='object')continue;
        const fields:Record<string,any>={};
        for(const field of pageFields){
          const value=str(values?.[field],field==='description'||field==='ogDescription'||field==='twitterDescription'?500:field==='ogImage'||field==='canonicalPath'?2048:220).trim();
          if(field==='canonicalPath'&&value&&(!/^\/[a-zA-Z0-9_./-]*$/.test(value)||value.startsWith('//')||value.includes('..')))throw new BadRequestException('Canonical adres yalnızca site içi yol olabilir.');
          if(field==='ogImage'&&value&&!/^https:\/\/[^\s"'<>]+$/.test(value)&&!/^\/assets\/[a-zA-Z0-9_./-]+$/.test(value))throw new BadRequestException('OG görsel adresi geçersiz.');
          fields[field]=value;
        }
        fields.noindex=values.noindex===true;
        translations[locale]=fields;
      }
      pages[id]=translations;
    }
    const defaultOgImage=str(body?.defaultOgImage,2048).trim();
    const logo=str(body?.organizationLogo,2048).trim();
    for(const v of [defaultOgImage,logo]){
      if(v&&!/^https:\/\/[^\s"'<>]+$/.test(v)&&!/^\/assets\/[a-zA-Z0-9_./-]+$/.test(v))throw new BadRequestException('Görsel URL geçersiz.');
    }
    const redirects:any[]=[];
    if(Array.isArray(body?.redirects)){
      if(body.redirects.length>150)throw new BadRequestException('En fazla 150 yönlendirme eklenebilir.');
      for(const item of body.redirects){
        const from=str(item?.from,250).trim(),to=str(item?.to,250).trim();
        if(!/^\/[a-zA-Z0-9_./-]+$/.test(from)||!/^\/[a-zA-Z0-9_./-]+$/.test(to)||from===to||from.startsWith('//')||to.startsWith('//')||from.includes('..')||to.includes('..'))
          throw new BadRequestException('Yönlendirme yolları geçersiz.');
        if(redirects.some(r=>r.from===from))throw new BadRequestException('Tekrarlanan yönlendirme.');
        redirects.push({from,to,permanent:item?.permanent!==false});
      }
    }
    for(const start of redirects){
      const seen=new Set([start.from]);let target=start.to;
      while(redirects.some(r=>r.from===target)){
        if(seen.has(target))throw new BadRequestException('Döngüsel yönlendirme yapılamaz.');
        seen.add(target);target=redirects.find(r=>r.from===target).to;
      }
    }
    for(const token of [body?.googleVerification,body?.bingVerification]){
      if(token&&!/^[a-zA-Z0-9_-]{1,250}$/.test(String(token)))throw new BadRequestException('Doğrulama kodu geçersiz.');
    }
    const next={
      googleVerification:str(body?.googleVerification,250),
      bingVerification:str(body?.bingVerification,250),
      version:current.version+1,siteName:str(body?.siteName,100).trim()||'Ticarti',
      defaultOgImage,organizationLogo:logo||'/assets/images/ticarti-logo.svg',
      robotsText:str(body?.robotsText,10000),allowIndexing:body?.allowIndexing!==false,
      pages,redirects
    };
    await this.put(SEO_KEY,next);
    return next;
  }
  async home(){
    const data=await this.get(HOME_KEY);
    const modules=defaultModules().map(m=>{
      const saved=(Array.isArray(data?.modules)?data.modules:[]).find((x:any)=>x?.id===m.id);
      return saved?{...m,...saved,logos:Array.isArray(saved.logos)?saved.logos:[],categoryIds:Array.isArray(saved.categoryIds)?saved.categoryIds:[],ctaEnabled:saved.ctaEnabled!==false,title:m.title,selector:m.selector}:{...m};
    });
    return {version:Number(data?.version)||0,modules:modules.sort((x,y)=>x.sortOrder-y.sortOrder)};
  }
  async publicHome(lang='tr'){
    const data=await this.home();
    const locale=/^[a-z]{2,3}(?:-[A-Za-z]{2})?$/.test(lang)?lang:'tr';
    const settings=await this.get('platform_contracts');
     const contracts=Array.isArray(settings?.contracts)?settings.contracts:[];
     const kvkk=contracts.find((x:any)=>x.isActive!==false&&x.key==='KVKK_NOTICE'&&x.placements?.includes('REGISTER_KVKK'))
       ||contracts.find((x:any)=>x.isActive!==false&&x.contentKey==='kvkk-notice')
       ||{key:'KVKK_NOTICE',contentKey:'kvkk-notice'};
     const contractPaths:Record<string,string>={'kvkk-notice':'/kvkk.html','data-processing-policy':'/kvkk.html','privacy-policy':'/gizlilik-politikasi.html','membership-agreement':'/uyelik-sozlesmesi.html'};
     return {version:data.version,locale,modules:data.modules.filter((x:any)=>x.enabled!==false),disabledModuleIds:data.modules.filter((x:any)=>x.enabled===false).map((x:any)=>x.id),
       consentContract:{key:kvkk.key,contentKey:kvkk.contentKey,href:contractPaths[kvkk.contentKey]||'/kvkk.html'}};
  }
  async updateModule(id:string,body:any){
    if(!MODULE_IDS.includes(id as any))throw new BadRequestException('Geçersiz modül.');
    const snapshot=await this.home();
    if(body.version!==undefined&&Number(body.version)!==snapshot.version)throw new ConflictException('İçerik başka bir oturumda güncellendi. Sayfayı yenileyin.');
    const previous=snapshot.modules.find((x:any)=>x.id===id)!;
    const allowed=MODULE_FIELDS[id];
    const module={...previous,configured:true,enabled:body.enabled!==false,fields:safeFields(body.fields,allowed),items:safeItems(id,body.items||[]),ctaEnabled:id==='hero'?body.ctaEnabled!==false:previous.ctaEnabled,logos:id==='hero'?safeLogos(body.logos||[]):previous.logos,categoryIds:id==='blog'?safeCategories(body.categoryIds):previous.categoryIds};
    const modules=snapshot.modules.map(x=>x.id===id?module:x);
    const version=snapshot.version+1;
    await this.put(HOME_KEY,{version,modules});
    return {version,module};
  }
  async reorderHome(body:any){
    const snapshot=await this.home();
    if(Number(body?.version)!==snapshot.version)
      throw new ConflictException('Anasayfa sırası başka bir oturumda değişti. Yenileyin.');
    const ids=body?.ids;
    if(!Array.isArray(ids)||ids.length!==MODULE_IDS.length||
      new Set(ids).size!==MODULE_IDS.length||ids.some((id:any)=>!MODULE_IDS.includes(id)))
      throw new BadRequestException('Sıralamada 10 benzersiz modül bulunmalıdır.');
    const ranks=new Map<string,number>(ids.map((id:string,index:number)=>[id,index]));
    const modules=snapshot.modules.map(m=>({...m,sortOrder:ranks.get(m.id)!}))
      .sort((x,y)=>x.sortOrder-y.sortOrder);
    const version=snapshot.version+1;
    await this.put(HOME_KEY,{version,modules});
    return {version,modules};
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
      return {...m,configured:true,enabled:input.enabled!==false,fields:safeFields(input.fields,MODULE_FIELDS[m.id]),items:safeItems(m.id,input.items||[]),ctaEnabled:m.id==='hero'?input.ctaEnabled!==false:m.ctaEnabled,logos:m.id==='hero'?safeLogos(input.logos||[]):m.logos,categoryIds:m.id==='blog'?safeCategories(input.categoryIds):m.categoryIds};
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
    const items=(module?.items||[]).filter((item:any)=>item.enabled!==false
      &&String(item.fields?.question?.[lang]||'').trim()
      &&String(item.fields?.answer?.[lang]||'').trim());
    return module?{enabled:module.enabled!==false,configured:module.configured===true,
      fields:module.fields,items}: {enabled:false,configured:false,fields:{},items:[]};
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

  /** One-time, authenticated, server-side import. Browser sends no article payload. */
  async importInitialBlog(){
    if(initialBlog.schema!=='ticarti-blog-import-v1'||initialBlog.articles.length!==10||initialBlog.categories.length!==8)
      throw new BadRequestException('Blog başlangıç verisi geçersiz.');
    const current=await this.blog();
    const posts=structuredClone(current.posts) as any[];
    const categories=structuredClone(current.categories) as any[];
    const supported=['tr','en','de','ru','ar'];
    const categorySlugs:Record<string,string>={
      'E-Ticaret':'e-ticaret','Dijital Pazarlama':'dijital-pazarlama','Pazaryerleri':'pazaryerleri',
      'Kargo ve Lojistik':'kargo-ve-lojistik','Ödeme Sistemleri':'odeme-sistemleri',
      'Vergi ve Yasal Süreçler':'vergi-ve-yasal-surecler','Girişimcilik':'girisimcilik',
      'Ticarti Haberleri':'ticarti-haberleri'
    };
    let createdPosts=0,createdCategories=0,filledTranslations=0;
    const ids:Record<string,string>={};
    for(const seed of initialBlog.categories){
      const trSlug=seed.translations.tr.slug;
      let category=categories.find((c:any)=>c.id===seed.id||c.translations?.tr?.slug===trSlug);
      if(!category){
        category={...seed,parentId:null,isActive:true,sortOrder:categories.length};
        categories.push(category);createdCategories++;
      }else{
        for(const locale of supported){
          const original=(seed.translations as any)[locale];
          if(!original)continue;
          const saved={...(category.translations?.[locale]||{})};
          let changed=false;
          for(const field of ['title','slug','description','seoTitle','seoDescription']){
            if(!String(saved[field]||'').trim()&&original[field]){saved[field]=original[field];changed=true;}
          }
          if(changed){category.translations={...category.translations,[locale]:saved};filledTranslations++;}
        }
      }
      ids[trSlug]=category.id;
    }
    for(const seed of initialBlog.articles){
      const existing=posts.find((p:any)=>p.slug===seed.slug||p.translations?.tr?.slug===seed.slug);
      if(existing){
        for(const locale of supported){
          const translation=(seed.translations as any)[locale];
          if(!existing.translations?.[locale]?.title&&translation){
            existing.translations={...existing.translations,[locale]:translation};
            filledTranslations++;
          }
        }
        continue;
      }
      const categoryId=ids[categorySlugs[seed.category]];
      if(!categoryId)throw new BadRequestException('Kategori bulunamadı: '+seed.category);
      posts.push({
        id:'ticarti-article-'+seed.slug,slug:seed.slug,status:'DRAFT',categoryId,
        authorId:null,authorName:'Ticarti',featuredImage:'',isFeatured:false,tags:[],
        relatedPostIds:[],scheduledAt:null,ogImage:'',canonicalUrl:'',noIndex:false,
        translations:seed.translations
      });
      createdPosts++;
    }
    if(!createdPosts&&!createdCategories&&!filledTranslations)
      return {ok:true,createdPosts:0,createdCategories:0,filledTranslations:0,alreadyImported:true};
    try{
      await this.updateBlog({version:current.version,posts,categories,authors:current.authors});
    }catch(error){
      console.error('[ticarti-blog-seed] save failed', {
        code:(error as any)?.code||'UNKNOWN',
        message:error instanceof Error?error.message:String(error),
        existingPosts:current.posts.length,
        attemptedPosts:posts.length,
        attemptedCategories:categories.length
      });
      throw error;
    }
    return {ok:true,createdPosts,createdCategories,filledTranslations,alreadyImported:false};
  }

  private readonly submissionTimes=new Map<string,number>();
  private throttle(kind:string,ip:string,seconds:number){
    const now=Date.now(),key=kind+':'+ip,last=this.submissionTimes.get(key)||0;
    if(now-last<seconds*1000)throw new HttpException('Lütfen bir süre sonra yeniden deneyin.',HttpStatus.TOO_MANY_REQUESTS);
    if(this.submissionTimes.size>20000){
      for(const [k,v] of this.submissionTimes)if(now-v>3600000)this.submissionTimes.delete(k);
    }
    this.submissionTimes.set(key,now);
  }
  async blogComments(slug:string){
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new BadRequestException('Geçersiz yazı.');
    const rows=await this.prisma.platformSetting.findMany({where:{key:{startsWith:'marketing_blog_comment_v1_'}}});
    return rows.map(r=>r.value as any).filter(c=>c?.postSlug===slug&&c.status==='APPROVED')
      .sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))
      .map(c=>({id:c.id,name:c.name,comment:c.comment,createdAt:c.createdAt}));
  }
  async submitBlogComment(raw:any,ip:string){
    const slug=str(raw?.slug,150),name=str(raw?.name,100).trim(),comment=str(raw?.comment,3000).trim();
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||name.length<2||name.length>100||comment.length<5||comment.length>3000)
      throw new BadRequestException('Yazar adı veya yorum geçersiz.');
    if(raw?.website)throw new BadRequestException('Geçersiz istek.');
    const published=await this.blog(),post=published.posts.find((p:any)=>
      p.status==='PUBLISHED'&&(p.slug===slug||Object.values(p.translations||{}).some((t:any)=>t.slug===slug)));
    if(!post)throw new BadRequestException('Yayımlanmış yazı bulunamadı.');
    this.throttle('comment',ip,60);
    const id=randomUUID(),createdAt=new Date().toISOString();
    await this.prisma.platformSetting.create({
      data:{key:'marketing_blog_comment_v1_'+id,value:{id,postSlug:slug,name,comment,status:'PENDING',createdAt}}
    });
    return {ok:true,status:'PENDING'};
  }
  async pendingBlogComments(){
    const rows=await this.prisma.platformSetting.findMany({where:{key:{startsWith:'marketing_blog_comment_v1_'}}});
    return rows.map(r=>r.value as any).filter(c=>c&&c.status==='PENDING').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  async moderateBlogComment(id:string,status:string){
    if(!/^[0-9a-f-]{36}$/.test(id)||!['APPROVED','REJECTED'].includes(status))
      throw new BadRequestException('Yorum veya durum geçersiz.');
    const key='marketing_blog_comment_v1_'+id;
    const row=await this.prisma.platformSetting.findUnique({where:{key}});
    if(!row)throw new BadRequestException('Yorum bulunamadı.');
    await this.prisma.platformSetting.update({where:{key},data:{value:{...(row.value as object),status,reviewedAt:new Date().toISOString()}}});
    return {ok:true};
  }
  async blogCallbackRequests(){
    const rows=await this.prisma.platformSetting.findMany({where:{key:{startsWith:'marketing_blog_callback_v1_'}}});
    return rows.map(r=>r.value as any).filter(x=>x?.status==='NEW')
      .sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
      .map(x=>({id:x.id,phone:x.phone,slug:x.slug,createdAt:x.createdAt}));
  }
  async completeBlogCallback(id:string){
    if(!/^[0-9a-f-]{36}$/.test(id))throw new BadRequestException('Geçersiz başvuru.');
    const key='marketing_blog_callback_v1_'+id;
    const row=await this.prisma.platformSetting.findUnique({where:{key}});
    if(!row)throw new BadRequestException('Başvuru bulunamadı.');
    // Delete completed phone records rather than retaining personal data indefinitely.
    await this.prisma.platformSetting.delete({where:{key}});
    return {ok:true};
  }
  async submitBlogCallback(raw:any,ip:string){
    const dial=str(raw?.dial,5).trim(),phone=str(raw?.phone,24).replace(/[\s()\-]/g,'');
    const slug=str(raw?.slug,150),consent=raw?.consent===true;
    if(!/^\+[1-9]\d{0,3}$/.test(dial)||!/^\d{7,15}$/.test(phone)||!consent)
      throw new BadRequestException('Geçerli telefon numarası ve KVKK onayı zorunludur.');
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new BadRequestException('Geçersiz yazı.');
    if(raw?.website)throw new BadRequestException('Geçersiz istek.');
    this.throttle('blog-callback',ip,120);
    const id=randomUUID();
    await this.prisma.platformSetting.create({data:{
      key:'marketing_blog_callback_v1_'+id,
      value:{id,phone:dial+phone,slug,consent:true,createdAt:new Date().toISOString(),status:'NEW'}
    }});
    return {ok:true};
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
        id:x.id,slug:t.slug||x.slug,status:x.status,categoryId:x.categoryId||null,featuredImage:x.featuredImage||'',
        localeSlugs:Object.fromEntries(activeLocales.filter(code=>hasContent(x.translations?.[code])).map(code=>[code,x.translations?.[code]?.slug||x.slug])),
        title:t.title,excerpt:str(t.content||'',800).replace(/```[\s\S]*?```/g,' ').replace(/!?\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/<[^>]*>/g,' ').replace(/[#*_>~|`]/g,' ').replace(/\s+/g,' ').trim().slice(0,240),content:t.content,
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
