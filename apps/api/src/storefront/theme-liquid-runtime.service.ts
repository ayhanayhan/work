import { Injectable, NotFoundException } from '@nestjs/common';
import { configuredPublicPath, configuredArticleUrl } from '../common/seo-url-configuration';
import { Storage } from '@google-cloud/storage';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { Liquid } from 'liquidjs';
import { PrismaService } from '../prisma/prisma.service';
import { unzipThemePackage } from '../superadmin/theme-package.util';

type ThemeEntries={sha:string;entries:Map<string,Buffer>;loadedAt:number};

@Injectable()
export class ThemeLiquidRuntimeService {
  private storage=new Storage();
  private cache=new Map<string,ThemeEntries>();
  private pendingEntries=new Map<string,Promise<Map<string,Buffer>>>();
  private runtimeRoots=new Map<string,string>();
  constructor(private prisma:PrismaService){}

  private bucket(){return String(process.env.GCS_BUCKET||'').trim();}
  private uploadRoot(){return process.env.UPLOAD_DIR||join(process.cwd(),'uploads');}
  private normalizeStoreKey(input:string){const raw=String(input||'').trim().toLowerCase().replace(/^https?:\/\//,'').split('/')[0].replace(/:\d+$/,'').replace(/\.$/,'');if(raw.endsWith('.ticarti.com'))return raw.slice(0,-'.ticarti.com'.length).split('.')[0]||raw;return raw;}
  private async themeForStore(storeKey:string,themeRef=''){const key=this.normalizeStoreKey(storeKey);const store:any=await this.prisma.tenant.findFirst({where:{status:{in:['TRIAL','ACTIVE']},OR:[{publicSlug:key},{domain:key},{slug:key}]},select:{id:true,name:true,slug:true,publicSlug:true,domain:true,activeTheme:true,currency:true,locale:true,logoUrl:true,faviconUrl:true,settings:true}});if(!store)throw new NotFoundException('Store not found');const ref=String(themeRef||'').trim();const theme:any=await this.prisma.themeDefinition.findFirst({where:{isActive:true,...(ref?{OR:[{id:ref},{slug:ref}]}:{slug:store.activeTheme})},select:{id:true,slug:true,name:true,version:true,basePrice:true,config:true,installations:{where:{tenantId:store.id,status:'ACTIVE'},take:1},planPrices:{where:{isActive:true},take:1}}});if(!theme)throw new NotFoundException('Theme not found');if(ref&&String(theme.slug)!==String(store.activeTheme)){const owned=Array.isArray(theme.installations)&&theme.installations.length>0;const included=Array.isArray(theme.planPrices)&&theme.planPrices.some((x:any)=>x?.included);if(!owned&&!included&&Number(theme.basePrice||0)>0)throw new NotFoundException('Theme not found');}return{store,theme};}
  private async zip(config:any){const key=String(config?.package?.storageKey||'');if(!key)throw new NotFoundException('Theme package not found');if(this.bucket()){const [data]=await this.storage.bucket(this.bucket()).file(key).download();return data;}return readFile(join(this.uploadRoot(),key));}
  // A theme archive is immutable only when addressed by its content digest. Version labels
  // and storage names are not sufficient: a replacement must never reuse cached bytes.
  // Coalesce concurrent cold loads per process; no cross-tenant HTML is cached here.
  private async entries(config:any){
    const sha=String(config?.package?.sha256||'').trim().toLowerCase();
    const identity=/^[a-f0-9]{64}$/.test(sha)?sha:'';
    if(identity){
      const hit=this.cache.get(identity);
      if(hit){this.cache.delete(identity);this.cache.set(identity,hit);return hit.entries;}
      const pending=this.pendingEntries.get(identity);
      if(pending)return pending;
    }
    const load=(async()=>{
      const data=await this.zip(config);
      if(identity){
        const {createHash}=await import('crypto');
        const actual=createHash('sha256').update(data).digest('hex');
        if(actual!==identity)throw new Error('Theme archive checksum mismatch');
      }
      const entries=unzipThemePackage(data);
      if(identity){
        this.cache.set(identity,{sha:identity,entries,loadedAt:Date.now()});
        while(this.cache.size>8){const first=this.cache.keys().next().value;if(!first)break;this.cache.delete(first);}
      }
      return entries;
    })();
    if(identity)this.pendingEntries.set(identity,load);
    try{return await load;}finally{if(identity)this.pendingEntries.delete(identity);}
  }
  private text(entries:Map<string,Buffer>,path:string){return entries.get(path)?.toString('utf8')||'';}
  private json(entries:Map<string,Buffer>,path:string,fallback:any={}){const raw=this.text(entries,path).replace(/^\s*\/\*[\s\S]*?\*\/\s*/,'');if(!raw)return fallback;try{return JSON.parse(raw)}catch{return fallback}}
  private mime(name:string){const ext=name.split('.').pop()?.toLowerCase();return ({css:'text/css; charset=utf-8',js:'application/javascript; charset=utf-8',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',avif:'image/avif',ico:'image/x-icon',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf'} as any)[ext||'']||'application/octet-stream';}
  async asset(storeKey:string,name:string,themeRef=''){const{theme}=await this.themeForStore(storeKey,themeRef);const cfg:any=theme.config||{};if(String(cfg.engine||cfg.manifest?.engine||'')!=='ticarti-liquid-source')throw new NotFoundException('Theme asset not found');const safe=String(name||'').replace(/\\/g,'/').replace(/^\/+/, '');if(!/^[A-Za-z0-9_.@+\-\/]+$/.test(safe)||safe.includes('..'))throw new NotFoundException('Theme asset not found');const entries=await this.entries(cfg);const path=safe.startsWith('theme/assets/')?safe:`theme/assets/${safe}`;const data=entries.get(path);if(!data)throw new NotFoundException('Theme asset not found');return{data,mime:this.mime(path),etag:String(cfg?.package?.sha256||theme.version||'')};}

  private schemaFromLiquid(source:string){const m=source.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/i);if(!m)return{};try{return JSON.parse(m[1])}catch{return{}}}
  private stripSourceTags(source:string){return source
    .replace(/{%-?\s*schema\s*-?%}[\s\S]*?{%-?\s*endschema\s*-?%}/gi,'')
    .replace(/{%-?\s*doc\s*-?%}[\s\S]*?{%-?\s*enddoc\s*-?%}/gi,'')
    .replace(/{%-?\s*stylesheet\s*-?%}([\s\S]*?){%-?\s*endstylesheet\s*-?%}/gi,'<style>$1</style>')
    .replace(/{%-?\s*style\s*-?%}([\s\S]*?){%-?\s*endstyle\s*-?%}/gi,'<style>$1</style>')
    .replace(/{%-?\s*layout\s+[^%]+%}/gi,'')
    .replace(/{%-?\s*paginate\s+[^%]+%}/gi,'')
    .replace(/{%-?\s*endpaginate\s*-?%}/gi,'')
    .replace(/{%-?\s*content_for\s+[^%]+%}/gi,'')
    // Keep Shopify form attributes: product pickers locate the exact form by ID
    // and data-type. Dropping these attributes prevents any variant from being added.
    .replace(/{%-?\s*form\s+([^%]*?)\s*-?%}/gi,(_match,args:string)=>{
      const attributes=['method="post"'];
      const allowed=new Set(['id','class','data-type','novalidate','accept-charset','enctype','autocomplete','aria-label','aria-labelledby']);
      const attribute=/([\w-]+)\s*:\s*('(?:[^']*)'|"(?:[^"]*)"|[\w.]+)/g;
      let match:RegExpExecArray|null;
      while((match=attribute.exec(args))!==null){
        const name=match[1].toLowerCase();
        if(!allowed.has(name))continue;
        const raw=match[2];
        const value=raw[0]==="'"||raw[0]==='"' ? raw.slice(1,-1) : `{{ ${raw} }}`;
        // The Liquid renderer resolves variables before the HTML reaches the browser.
        attributes.push(`${name}="${value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}"`);
      }
      return `<form ${attributes.join(' ')}>`;
    })
    .replace(/{%-?\s*endform\s*-?%}/gi,'</form>')
    .replace(/\btemplate\s*([=!]=?)\s*(["'])/g,'template.name $1 $2')
    .replace(/{%-?\s*sections\s+['"]([^'"]+)['"]\s*-?%}/g,(_m,name)=>`{{ __group_${String(name).replace(/[^a-z0-9_]/gi,'_')} }}`)
    .replace(/{%-?\s*section\s+['"]([^'"]+)['"]\s*-?%}/g,(_m,name)=>`{{ __section_${String(name).replace(/[^a-z0-9_]/gi,'_')} }}`)
    .replace(/^(\s*)sections\s+['"]([^'"]+)['"]\s*$/gm,(_m,sp,name)=>`${sp}echo __group_${String(name).replace(/[^a-z0-9_]/gi,'_')}`)
    .replace(/^(\s*)section\s+['"]([^'"]+)['"]\s*$/gm,(_m,sp,name)=>`${sp}echo __section_${String(name).replace(/[^a-z0-9_]/gi,'_')}`)
    .replace(/^(\s*)sections?\s+['"][^'"]+['"]\s*$/gm,'$1');}
  private escapeHtml(value:any){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);}
  private money(value:any,currency='TRY'){const n=Number(value||0)/100;try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency}).format(n)}catch{return `${n.toFixed(2)} ${currency}`}}
  private nested(obj:any,key:string){return String(key||'').split('.').reduce((a,k)=>a&&a[k]!==undefined?a[k]:undefined,obj)}
  private slugify(v:any){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
  // Ticarti native catalog -> Liquid theme contract. Preserve native IDs and real availability.
  private product(p:any){
    if(!p)return null;
    const image=p.imageUrl||p.featuredImage||p.images?.[0]?.url||p.media?.[0]?.url||'';
    const imageObject=(src:any)=>{const url=String(typeof src==='string'?src:(src?.url||src?.src||''));const id=String((typeof src==='object'&&src?.id)||url);return url?{id,src:url,url,preview_image:{id,src:url,url}}:null};
    const variants=Array.isArray(p.variants)?p.variants.map((v:any)=>{
      const rawOptions=v.selectedOptions&&typeof v.selectedOptions==='object'?v.selectedOptions:{};
      const available=v.inventory?.trackStock===false||v.inventory?.allowBackorder===true||v.preorderEnabled===true||(v.inventory?.available===undefined&&v.stock===undefined)||Number(v.inventory?.available??v.stock??0)>0;
      const galleryMedia=(Array.isArray(v.media)?v.media:[]).map((link:any)=>({sortOrder:Number(link.sortOrder||0),image:imageObject(link.image||link)})).filter((x:any)=>x.image).sort((a:any,b:any)=>a.sortOrder-b.sortOrder).map((x:any)=>x.image);
      const mediaSrc=v.imageUrl||v.image?.url||galleryMedia[0]?.url||'';
      return{...v,title:v.title||v.name||Object.values(rawOptions).join(' / ')||'Default',
        options:Object.values(rawOptions).map(String),selectedOptions:rawOptions,
        price:Math.round(Number(v.price??p.price??0)*100),
        compare_at_price:(v.compareAtPrice??v.comparePrice)==null?null:Math.round(Number(v.compareAtPrice??v.comparePrice)*100),
        available,image:imageObject(mediaSrc),featuredMedia:imageObject(mediaSrc),featured_image:imageObject(mediaSrc),galleryMedia,mediaIds:galleryMedia.map((x:any)=>x.id)
      };
    }):[];
    const keys:string[]=[];
    for(const opt of Array.isArray(p.options)?p.options:[]){const name=String(opt?.name||'').trim();if(name&&!keys.includes(name))keys.push(name);}
    for(const v of variants)for(const name of Object.keys(v.selectedOptions||{}))if(!keys.includes(name))keys.push(name);
    const selected=variants.find((v:any)=>v.available)||variants[0]||null;
    const optionsWithValues=keys.map((name,position)=>{
      const source=(p.options||[]).find((o:any)=>o.name===name)||{};
      const names:string[]=[];
      for(const val of Array.isArray(source.values)?source.values:[]){const key=String(val?.name||val?.value||'');if(key&&!names.includes(key))names.push(key);}
      for(const v of variants){const key=String(v.selectedOptions?.[name]||'');if(key&&!names.includes(key))names.push(key);}
      return{id:source.id||name,presetId:source.presetId||source.id||name,name,position:position+1,displayType:source.displayType||(/^(renk|color|colour)$/i.test(name)?'COLOR':'BUTTON'),
        values:names.map((value,i)=>{const matches=variants.filter((v:any)=>String(v.selectedOptions?.[name]||'')===value);const active=matches.find((v:any)=>v.available)||matches[0];const optValue=(source.values||[]).find((x:any)=>String(x.name||x.value)===value)||{};
          return{id:optValue.id||`${name}-${i}`,presetValueId:optValue.presetValueId||optValue.id||`${name}-${i}`,value,name:value,selected:!!selected&&String(selected.selectedOptions?.[name]||'')===value,available:matches.some((v:any)=>v.available),swatch:optValue.swatch||{},image:active?.image||null,variant:active||null};})};
    });
    const prices=variants.map((v:any)=>Number(v.price)).filter(Number.isFinite);
    const price=prices.length?Math.min(...prices):Math.round(Number(p.price||0)*100);
    return{...p,handle:p.slug||this.slugify(p.title||p.name),title:p.title||p.name||'',url:`/product/${p.slug||p.id}`,
      featured_image:imageObject(image),images:(p.images||[]).map((x:any)=>imageObject(x)).filter(Boolean),
      media:(p.images||[]).map((x:any)=>({id:String(x.id||x.url),url:x.url,src:x.url,mediaType:'image',media_type:'image',previewImage:imageObject(x),preview_image:imageObject(x)})),
      variants,selectedVariant:selected,selected_or_first_available_variant:selected,
      optionsWithValues,options_with_values:optionsWithValues,options:keys,
      hasOnlyDefaultVariant:optionsWithValues.length===0,has_only_default_variant:optionsWithValues.length===0,
      price,price_min:price,price_max:prices.length?Math.max(...prices):price,
      available:variants.length?variants.some((v:any)=>v.available):true,
      vendor:p.brand?.name||p.vendor||'',type:p.category?.name||p.categories?.[0]?.category?.name||p.productType||'',
      tags:Array.isArray(p.tags)?p.tags:[],description:p.description||'',content:p.description||'',rating:p.rating,review_count:p.reviewCount||0};
  }

  private liquidFacets(raw:any){
    return(Array.isArray(raw)?raw:[]).map((f:any)=>{
      const key=String(f.key||'');const price=key==='price';
      const paramName=price?'filter.v.price.gte':key.startsWith('option.')?'filter.option.'+key.slice(7):'filter.'+key;
      const values=(Array.isArray(f.values)?f.values:[]).map((v:any)=>({
        ...v,paramName,label:String(v.label||v.value||''),value:String(v.value||''),
        active:!!v.active,available:Number(v.count||0)>0,count:Number(v.count||0),swatch:v.swatch||null
      }));
      const cents=(v:any)=>Math.round(Number(v)*100);
      const chosen=(v:any)=>v!==undefined&&v!==null&&String(v).trim()!==''&&Number.isFinite(Number(v));
      return{...f,paramName,type:price?'price_range':(f.type==='BOOLEAN'?'boolean':'list'),
        presentation:f.displayType==='SWATCH'?'swatch':undefined,values,activeValues:values.filter((v:any)=>v.active),
        // Shopify Liquid expects money in minor units; blank is not an applied price filter.
        minValue:price?{paramName:'filter.v.price.gte',value:chosen(f.selectedMin)?cents(f.selectedMin):null}:undefined,
        maxValue:price?{paramName:'filter.v.price.lte',value:chosen(f.selectedMax)?cents(f.selectedMax):null}:undefined,
        rangeMax:price?cents(Math.max(0,Number(f.max||0))):undefined
      };
    });
  }

  private canonicalMenuUrl(value:any){const url=String(value||'');return url.replace(/^\/(?:category|categories)\//,'/products/');}
  private linkItem(row:any){const children=(row?.children||row?.items||[]).map((x:any)=>this.linkItem(x));return{title:row?.label||row?.title||row?.name||'',url:this.canonicalMenuUrl(row?.url||row?.href||'#'),handle:this.slugify(row?.label||row?.title||row?.name),links:children,child_active:false,active:false,levels:children.length?1:0};}
  private normalizeResourceHandle(value:any){return String(value||'').trim().toLowerCase().replace(/^shopify:\/\//,'').replace(/^ticarti:\/\//,'').replace(/^\/+/, '').replace(/^(collections|products|pages|blogs)\//,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');}

  private externalVideoObject(value:any){
    if(!value||typeof value!=='string')return value;
    const raw=String(value).trim();
    let m=raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    if(m)return{id:m[1],type:'youtube',url:raw};
    m=raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if(m)return{id:m[1],type:'vimeo',url:raw};
    return{id:raw,type:'external',url:raw};
  }

  private imageSettingObject(url:any){
    const src=String(url||'').trim();
    if(!src)return null;
    return{src,url:src,preview_image:{src,url:src},width:null,height:null,aspect_ratio:1};
  }

  private async resourceCatalog(storeId:string){
    const [menus,collections,products,pages]=await Promise.all([
      this.prisma.menu.findMany({
        where:{storeId},
        orderBy:{createdAt:'asc'},
        select:{id:true,name:true,handle:true,items:true}
      }),
      this.prisma.collection.findMany({
        where:{storeId,isActive:true},
        orderBy:[{sortOrder:'asc'},{title:'asc'}],
        take:80,
        select:{
          id:true,title:true,slug:true,description:true,
          products:{orderBy:{position:'asc'},take:40,select:{productId:true}}
        }
      }),
      this.prisma.product.findMany({
        where:{storeId,status:'ACTIVE'},
        orderBy:{createdAt:'desc'},
        take:160,
        include:{
          images:{orderBy:{sortOrder:'asc'}},
          variants:{where:{isActive:true}},
          brand:true,
          categories:{include:{category:true}}
        }
      }),
      this.prisma.page.findMany({
        where:{storeId,status:'PUBLISHED'},
        orderBy:{createdAt:'asc'},
        take:120,
        select:{id:true,title:true,slug:true,body:true,imageUrl:true,seoTitle:true,seoDescription:true}
      })
    ]);
    return{menus,collections,products,pages};
  }

  private validSchemaValue(row:any,value:any,baseValue:any){
    if(value===undefined||value===null)return false;
    const type=String(row?.type||'');
    if(type==='range'){
      const n=Number(value);
      if(!Number.isFinite(n))return false;
      if(row?.min!==undefined&&n<Number(row.min))return false;
      if(row?.max!==undefined&&n>Number(row.max))return false;
      return true;
    }
    if(type==='number')return Number.isFinite(Number(value));
    if(type==='checkbox')return typeof value==='boolean';
    if(type==='select'||type==='radio'){
      const opts=Array.isArray(row?.options)?row.options:[];
      const allowed=opts.map((x:any)=>typeof x==='object'?x?.value:x).filter((x:any)=>x!==undefined);
      return !allowed.length||allowed.some((x:any)=>String(x)===String(value));
    }
    if(type==='color'||type==='color_background'||type==='font_picker'){
      return !(typeof value==='string'&&value.trim()==='');
    }
    if(type==='text'&&typeof value==='string'&&value===''&&typeof baseValue==='string'&&baseValue!==''&&typeof row?.default==='string'&&row.default!=='')return false;
    return true;
  }

  private mergeSchemaSettings(base:any,override:any,schemaGroups:any[]){
    const out={...(base||{})};
    const defs=new Map<string,any>();
    for(const group of Array.isArray(schemaGroups)?schemaGroups:[]){
      for(const row of Array.isArray(group?.settings)?group.settings:[]){
        const id=String(row?.id||'');if(id)defs.set(id,row);
      }
    }
    for(const [key,value] of Object.entries(override&&typeof override==='object'?override:{})){
      const row=defs.get(String(key));
      if(!row){out[key]=value;continue;}
      if(this.validSchemaValue(row,value,out[key]))out[key]=value;
    }
    for(const [key,row] of defs){
      if(out[key]===undefined&&row?.default!==undefined)out[key]=row.default;
      if(!this.validSchemaValue(row,out[key],row?.default)&&row?.default!==undefined)out[key]=row.default;
    }
    return out;
  }

  private colorObject(value:any){
    const raw=String(value??'').trim();
    if(!raw)return value;
    let r:number|undefined,g:number|undefined,b:number|undefined,a=1;
    const hex=raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if(hex){
      let h=hex[1];
      if(h.length===3)h=h.split('').map(x=>x+x).join('');
      r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);
      if(h.length===8)a=parseInt(h.slice(6,8),16)/255;
    }else{
      const m=raw.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
      if(m){r=Number(m[1]);g=Number(m[2]);b=Number(m[3]);if(m[4]!==undefined)a=Number(m[4]);}
    }
    if(r===undefined||g===undefined||b===undefined)return value;
    return{red:r,green:g,blue:b,alpha:a,rgb:`${r}, ${g}, ${b}`,rgba:`rgba(${r},${g},${b},${a})`,hex:raw,toString(){return raw},valueOf(){return raw}};
  }

  private fontObject(value:any){
    const raw=String(value??'').trim();
    if(!raw)return value;
    const m=raw.match(/^(.*)_([ni])(\d)$/i);
    const family=(m?.[1]||raw).replace(/_/g,' ');
    const style=m?.[2]?.toLowerCase()==='i'?'italic':'normal';
    const weight=m?.[3]?Number(m[3])*100:400;
    return{family,fallback_families:'sans-serif',style,weight,system:false,toString(){return raw},valueOf(){return raw}};
  }

  private forceGlobalSettings(entries:Map<string,Buffer>,ctx:any,boot:any,extra:any){
    const data=this.json(entries,'theme/config/settings_data.json',{current:{}});
    const schema=this.json(entries,'theme/config/settings_schema.json',[]);
    const packageCurrent=data?.current&&typeof data.current==='object'?data.current:{};
    const saved=boot?.themeRuntime?.settingsCurrent&&typeof boot.themeRuntime.settingsCurrent==='object'?boot.themeRuntime.settingsCurrent:{};
    const preview=extra?.settingsCurrent&&typeof extra.settingsCurrent==='object'?extra.settingsCurrent:{};
    const persisted=this.mergeSchemaSettings(packageCurrent,saved,Array.isArray(schema)?schema:[]);
    const merged=this.mergeSchemaSettings(persisted,preview,Array.isArray(schema)?schema:[]);
    const rows=(Array.isArray(schema)?schema:[]).flatMap((g:any)=>Array.isArray(g?.settings)?g.settings:[]);
    ctx.settings=this.hydrateSettings(merged,{settings:rows},ctx);
    return ctx.settings;
  }

  private colorChannels(value:any){
    const raw=String(value?.toString?.()??value??'').trim();
    if(!raw)return null;
    let r=0,g=0,b=0,a=1;
    let m=raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if(m){
      let h=m[1];
      if(h.length===3)h=h.split('').map(x=>x+x).join('');
      r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);
      if(h.length===8)a=parseInt(h.slice(6,8),16)/255;
      return{r,g,b,a,raw};
    }
    m=raw.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if(m){
      r=Number(m[1]);g=Number(m[2]);b=Number(m[3]);a=m[4]===undefined?1:Number(m[4]);
      return{r,g,b,a,raw};
    }
    if(raw.toLowerCase()==='transparent')return{r:0,g:0,b:0,a:0,raw};
    return null;
  }

  private colorModifyValue(value:any,channel:any,amount:any){
    const c=this.colorChannels(value);if(!c)return String(value?.toString?.()??value??'');
    const ch=String(channel||'').toLowerCase();
    if(ch==='alpha')c.a=Math.max(0,Math.min(1,Number(amount)));
    else if(ch==='red')c.r=Math.max(0,Math.min(255,Number(amount)));
    else if(ch==='green')c.g=Math.max(0,Math.min(255,Number(amount)));
    else if(ch==='blue')c.b=Math.max(0,Math.min(255,Number(amount)));
    const a=Number.isFinite(c.a)?c.a:1;
    return a>=1?`rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`:`rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${Number(a.toFixed(4))})`;
  }

  private colorExtractValue(value:any,channel:any){
    const c=this.colorChannels(value);if(!c)return 0;
    const ch=String(channel||'').toLowerCase();
    if(ch==='red')return c.r;
    if(ch==='green')return c.g;
    if(ch==='blue')return c.b;
    if(ch==='alpha')return c.a;
    return 0;
  }

  private videoSettingObject(value:any){
    if(!value)return null;
    if(typeof value==='string'){
      const url=value.trim();if(!url)return null;
      return{id:url.split('/').pop()?.split('?')[0]||url,sources:[{url,mime_type:''}],preview_image:null,url};
    }
    const srcs=Array.isArray(value?.sources)?value.sources.map((x:any)=>typeof x==='string'?{url:x,mime_type:''}:{...x,url:x?.url||x?.src||''}).filter((x:any)=>x.url):[];
    const direct=value?.url||value?.src||'';
    if(!srcs.length&&direct)srcs.push({url:direct,mime_type:value?.mime_type||value?.mimeType||''});
    const preview=value?.preview_image||value?.previewImage||value?.poster||null;
    return{...value,sources:srcs,preview_image:preview};
  }

  private videoTag(value:any,opts:any={}){
    const v=this.videoSettingObject(value);if(!v||!v.sources?.length)return'';
    const attrs=opts&&typeof opts==='object'?opts:{};
    const attr=(name:string,val:any)=>{
      if(val===true)return` ${name}`;
      if(val===false||val===null||val===undefined||val==='')return'';
      return` ${name}="${this.escapeHtml(val)}"`;
    };
    const sources=v.sources.map((x:any)=>`<source src="${this.escapeHtml(x.url)}"${x.mime_type?` type="${this.escapeHtml(x.mime_type)}"`:''}>`).join('');
    return`<video${attr('class',attrs.class)}${attr('autoplay',attrs.autoplay)}${attr('muted',attrs.muted)}${attr('controls',attrs.controls)}${attr('loop',attrs.loop)}${attr('playsinline',attrs.playsinline??true)}${attr('preload',attrs.preload||'metadata')}>${sources}</video>`;
  }

  private baseContext(boot:any,path:string,locale:string,currency:string,extra:any,entries:Map<string,Buffer>){
    const store=boot?.store||{};
    const products=(boot?.productPools?.newest||boot?.featured||[]).map((x:any)=>this.product(x)).filter(Boolean);
    const allProducts:any={};
    const productById:any={};
    for(const p of products){
      if(p?.id)productById[String(p.id)]=p;
      if(p?.handle)allProducts[String(p.handle)]=p;
      if(p?.id)allProducts[String(p.id)]=p;
    }

    const catalog=extra?.__resourceCatalog&&typeof extra.__resourceCatalog==='object'?extra.__resourceCatalog:{menus:[],collections:[],products:[],pages:[]};

    for(const raw of Array.isArray(catalog.products)?catalog.products:[]){
      const p=this.product(raw);if(!p)continue;
      const handle=String(p.handle||'');
      if(handle&&!allProducts[handle]){allProducts[handle]=p;products.push(p);}
      if(p.id){allProducts[String(p.id)]=p;productById[String(p.id)]=p;}
      if(handle)productById[handle]=p;
    }

    const pages:any={};
    for(const p of Array.isArray(catalog.pages)?catalog.pages:[]){
      const handle=String(p?.slug||this.slugify(p?.title||p?.id));if(!handle)continue;
      const row={...p,handle,title:p?.title||handle,url:`/pages/${handle}`,content:p?.body||'',image:p?.imageUrl?this.imageSettingObject(p.imageUrl):null};
      pages[handle]=row;
      if(p?.id)pages[String(p.id)]=row;
    }

    const collections:any={};
    for(const c of Array.isArray(catalog.collections)?catalog.collections:[]){
      const handle=String(c?.slug||this.slugify(c?.title||c?.id));
      if(!handle)continue;
      const items=(Array.isArray(c?.products)?c.products:[]).map((x:any)=>productById[String(x?.productId||'')]).filter(Boolean);
      const image=items[0]?.featured_image||null;
      const row={...c,handle,title:c?.title||handle,url:`/collections/${handle}`,image,products:items,products_count:items.length,all_products_count:items.length};
      collections[handle]=row;
      if(c?.id)collections[String(c.id)]=row;
    }

    for(const c of boot?.categories||[]){
      const handle=String(c?.slug||this.slugify(c?.name||c?.title));
      if(!handle||collections[handle])continue;
      collections[handle]={...c,handle,title:c?.name||c?.title||handle,url:`/collections/${handle}`,image:c?.imageUrl?this.imageSettingObject(c.imageUrl):null,products,products_count:products.length,all_products_count:products.length};
    }
    collections.all={handle:'all',title:'Tüm Ürünler',url:'/products',products,products_count:products.length,all_products_count:products.length};
    const pool=(rows:any[])=>Array.isArray(rows)?rows.map((x:any)=>this.product(x)).filter(Boolean):[];
    const systemPools:any={
      'newest':pool(boot?.productPools?.newest||[]),
      'best-selling':pool(boot?.productPools?.bestSelling||[]),
      'best-rated':pool(boot?.productPools?.bestRated||[]),
      'featured':pool(boot?.featured||[])
    };
    for(const [handle,rows] of Object.entries(systemPools)){
      if(!collections[handle]&&Array.isArray(rows)&&rows.length)collections[handle]={handle,title:String(handle).replace(/-/g,' '),url:`/products?sort=${handle}`,products:rows,products_count:rows.length,all_products_count:rows.length};
    }

    const linklists:any={};
    const menuRows=[...(Array.isArray(boot?.menus)?boot.menus:[]),...(Array.isArray(catalog.menus)?catalog.menus:[])];
    for(const m of menuRows){
      const handle=String(m?.handle||this.slugify(m?.name||m?.title));
      if(!handle)continue;
      const rewriteMenuLink=(item:any):any=>{
        const current=String(item?.url||'');
        const names:Record<string,string>={'/login':'login','/register':'register','/forgot-password':'forgot-password','/reset-password':'reset-password','/verify-email':'verify-email','/account':'account','/orders':'orders','/questions':'questions','/returns':'returns','/reviews':'reviews','/cart':'cart','/checkout':'checkout','/wishlist':'wishlist','/compare':'compare','/blog':'blog'};
        const key=names[current];
        return {...item,url:key?configuredPublicPath(store,key,locale):current,links:(item.links||[]).map(rewriteMenuLink)};
      };
      const links=(m?.items||m?.links||[]).map((x:any)=>rewriteMenuLink(this.linkItem(x)));
      const row={title:m?.name||m?.title||handle,handle,links};
      linklists[handle]=row;
      linklists[this.normalizeResourceHandle(handle)]=row;
    }
    if(!linklists['main-menu']){
      const values=Object.values(linklists) as any[];
      const primary=values.find((x:any)=>/(main|primary|header|ana)/i.test(String(x?.handle||x?.title||'')))||values[0];
      if(primary)linklists['main-menu']=primary;
    }

    const settingsData=this.json(entries,'theme/config/settings_data.json',{current:{}});
    const saved=boot?.themeRuntime?.settingsCurrent||{};
    const preview=extra?.settingsCurrent&&typeof extra.settingsCurrent==='object'?extra.settingsCurrent:{};
    const schemaGroups=this.json(entries,'theme/config/settings_schema.json',[]);
    const packageCurrent=settingsData?.current&&typeof settingsData.current==='object'?settingsData.current:{};
    const persisted=this.mergeSchemaSettings(packageCurrent,saved,Array.isArray(schemaGroups)?schemaGroups:[]);
    const rawSettings=this.mergeSchemaSettings(persisted,preview,Array.isArray(schemaGroups)?schemaGroups:[]);

    const resolverCtx:any={
      linklists,collections,all_products:allProducts,
      __apiBase:String(extra?.apiBase||'/api/v1').replace(/\/$/,''),__previewThemeId:String(extra?.themeId||''),
      __storeKey:store.publicSlug||store.slug||'',__assetVersion:String(extra?.__assetVersion||'')
    };
    const globalRows=(Array.isArray(schemaGroups)?schemaGroups:[]).flatMap((g:any)=>Array.isArray(g?.settings)?g.settings:[]);
    const settings=this.hydrateSettings(rawSettings,{settings:globalRows},resolverCtx);

    /* TICARTI_ADMIN_SOCIAL_FALLBACK_V3 */
const __storeSettings:any=store?.settings&&typeof store.settings==='object'&&!Array.isArray(store.settings)?store.settings:{};
const socialAccountsRaw:any=__storeSettings?.socialAccounts??__storeSettings?.general?.socialAccounts??[];
const socialAccounts:any[]=Array.isArray(socialAccountsRaw)
  ?socialAccountsRaw
  :(socialAccountsRaw&&typeof socialAccountsRaw==='object'
    ?Object.entries(socialAccountsRaw).map(([platform,url])=>({platform,url}))
    :[]);
const socialPlatformAliases:any={
  instagram:'instagram',insta:'instagram',
  facebook:'facebook',fb:'facebook',
  x:'x',twitter:'x',
  youtube:'youtube',yt:'youtube',
  tiktok:'tiktok','tik-tok':'tiktok',
  linkedin:'linkedin','linked-in':'linkedin',
  pinterest:'pinterest',pin:'pinterest',
  whatsapp:'whatsapp','whats-app':'whatsapp',
  telegram:'telegram',
  twitch:'twitch',
  discord:'discord'
};
const socialAdmin:any={};
for(const item of socialAccounts){
  const raw=String(item?.platform??item?.type??item?.network??item?.name??'').trim().toLowerCase();
  const platform=socialPlatformAliases[raw]||raw.replace(/[^a-z0-9]+/g,'');
  const url=String(item?.url??item?.link??item?.href??item?.value??'').trim();
  if(platform&&url&&!socialAdmin[platform])socialAdmin[platform]=url;
}
const socialOrder=['instagram','facebook','x','youtube','tiktok','linkedin','pinterest','whatsapp','telegram','twitch','discord'];
const socialSettingAliases:any={
  instagram:['social_instagram_link','instagram_link','instagram','social_instagram'],
  facebook:['social_facebook_link','facebook_link','facebook','social_facebook'],
  x:['social_twitter_link','social_x_link','twitter_link','x_link','twitter','x'],
  youtube:['social_youtube_link','youtube_link','youtube','social_youtube'],
  tiktok:['social_tiktok_link','tiktok_link','tiktok','social_tiktok'],
  linkedin:['social_linkedin_link','linkedin_link','linkedin','social_linkedin'],
  pinterest:['social_pinterest_link','pinterest_link','pinterest','social_pinterest'],
  whatsapp:['social_whatsapp_link','whatsapp_link','whatsapp','social_whatsapp'],
  telegram:['social_telegram_link','telegram_link','telegram','social_telegram'],
  twitch:['social_twitch_link','twitch_link','twitch','social_twitch'],
  discord:['social_discord_link','discord_link','discord','social_discord']
};
for(let i=0;i<socialOrder.length;i++){
  const platform=socialOrder[i];
  const url=String(socialAdmin[platform]||'').trim();
  if(!url)continue;
  const genericKey=`social_media_${i+1}`;
  if(!String(settings?.[genericKey]??'').trim())settings[genericKey]=url;
  for(const key of socialSettingAliases[platform]||[]){
    if(!String(settings?.[key]??'').trim())settings[key]=url;
  }
}
/* /TICARTI_ADMIN_SOCIAL_FALLBACK_V3 */
const loc=this.json(entries,`theme/locales/${locale}.json`,null)||this.json(entries,`theme/locales/${String(locale).split('-')[0]}.json`,null)||this.json(entries,'theme/locales/en.default.json',{});
    const origin=typeof extra?.origin==='string'?extra.origin:'';
    const templateName=this.templateName(path);
    /* TICARTI_CART_CONTRACT_V2: normalize existing API cart for Shopify Liquid themes */
    const rawCart:any=extra?.cart;
    const cents=(n:any)=>Math.round((Number(n)||0)*100);
    const liquidCartItems=(Array.isArray(rawCart?.items)?rawCart.items:[]).map((line:any,index:number)=>{
      const variant=line.variant||{};
      const product=variant.product||{};
      const quantity=Math.max(0,Number(line.quantity)||0);
      const unit=cents(variant.price);
      const compare=variant.comparePrice==null?null:cents(variant.comparePrice);
      const options=(Array.isArray(variant.optionValues)?variant.optionValues:[])
        .map((link:any)=>({name:String(link?.optionValue?.option?.name||''),value:String(link?.optionValue?.name||''),position:Number(link?.optionValue?.position||0)}))
        .filter((x:any)=>x.name&&x.value).sort((x:any,y:any)=>x.position-y.position);
      const imageRaw=product.images?.[0];
      const url=String(imageRaw?.url||imageRaw?.publicUrl||imageRaw?.src||'');
      const image=url?{src:url,url,alt:product.title||'',width:Number(imageRaw?.width||500),height:Number(imageRaw?.height||500),aspect_ratio:Number(imageRaw?.aspectRatio||1)}:null;
      const selectedOptions=options.map(({name,value}:any)=>({name,value}));
      const link='/product/'+encodeURIComponent(String(product.slug||product.id||''));
      return {...line,index,id:variant.id,variant_id:variant.id,key:String(line.lineKey||line.id||''),
        quantity,title:String(product.title||''),url:link,image,featured_image:image,
        product:{...product,vendor:product.vendor||product.brand?.name||'',has_only_default_variant:options.length===0},
        variant:{...variant,options:options.map((x:any)=>x.value),selected_options:selectedOptions,available:true},
        options_with_values:selectedOptions,optionsWithValues:selectedOptions,properties:line.properties||{},
        original_price:unit,final_price:unit,price:unit,originalUnitPrice:unit,unitPrice:unit,
        original_line_price:unit*quantity,final_line_price:unit*quantity,line_price:unit*quantity,
        originalLineTotal:unit*quantity,lineTotal:unit*quantity,compare_at_price:compare,discounts:[],
        selling_plan_allocation:line.sellingPlan?{selling_plan:{name:line.sellingPlan.name||''}}:null};
    });
    const total=cents(rawCart?.totals?.subtotal??liquidCartItems.reduce((sum:number,line:any)=>sum+(line.final_line_price||0)/100,0));
    const count=liquidCartItems.reduce((sum:number,line:any)=>sum+line.quantity,0);
    const normalizedCart:any={...rawCart,items:liquidCartItems,item_count:count,total_price:total,
      original_total_price:total,items_subtotal_price:total,total:total,note:String(rawCart?.note||''),empty:count===0,
      cart_level_discount_applications:[],total_discount:cents(rawCart?.totals?.discountTotal||0)};
    const context:any={
      settings,
      shop:{name:store.name||'',domain:store.domain||store.publicSlug||'',permanent_domain:store.domain||`${store.publicSlug||store.slug}.ticarti.com`,currency,locale,customer_accounts_enabled:true,enabled_payment_types:[]},
      request:{locale:{iso_code:locale},origin,path,design_mode:!!extra?.designMode},
      routes:{root_url:'/',cart_url:configuredPublicPath(store,'cart',locale),cart_add_url:'/api/cart/add',cart_change_url:'/api/cart/change',cart_update_url:'/api/cart/update',predictive_search_url:'/search',product_recommendations_url:'/api/v1/storefront/'+encodeURIComponent(String(store.publicSlug||store.slug||''))+'/products/'+encodeURIComponent(String(extra?.product?.slug||extra?.product?.id||''))+'/recommendations',all_products_collection_url:'/collections/all',collections_url:'/collections',account_url:configuredPublicPath(store,'account',locale),account_login_url:configuredPublicPath(store,'login',locale),account_register_url:configuredPublicPath(store,'register',locale),account_logout_url:'/logout',search_url:'/search'},
      localization:{available_languages:(store.locales||[]).map((x:any)=>({iso_code:x.locale,name:x.label,endonym_name:x.label})),available_countries:[],country:{currency:{iso_code:currency,symbol:currency}},language:{iso_code:locale}},
      linklists,collections,pages,all_products:allProducts,products:allProducts,
      cart:normalizedCart,
      customer:extra?.customer||null,
      product:this.product(extra?.product)||null,
      ticarti:{cart:normalizedCart,currency,baseCurrency:String(store.baseCurrency||currency),currencies:(Array.isArray(store.currencies)?store.currencies:[]).map((c:any)=>({code:String(c.code||'').toUpperCase(),symbol:({TRY:'₺',USD:'$',EUR:'€',GBP:'£'} as Record<string,string>)[String(c.code||'').toUpperCase()]||String(c.code||''),rate:Number(c.rate||0)})).filter((c:any)=>/^[A-Z]{3}$/.test(c.code)),collection:extra?.collection?{facets:this.liquidFacets(extra.collection.facets)}:{}},
      results:extra?.collection?(()=>{
        const raw=extra.collection;
        const items=Array.isArray(raw.items)?raw.items:(Array.isArray(raw.products)?raw.products:[]);
        const page=Math.max(1,Number(raw.pagination?.page||1));
        const limit=Math.max(1,Number(raw.pagination?.limit||items.length||24));
        const total=Number(raw.pagination?.total??items.length);
        const pages=Math.max(1,Number(raw.pagination?.pages??Math.ceil(total/limit)));
        const facets=this.liquidFacets(raw.facets);
        const products=items.map((item:any)=>this.product(item));
        return{products,facets,filters:facets,productsCount:products.length,totalProductsCount:total,
          products_count:total,all_products_count:total,terms:String(raw.query||''),
          pagination:{page,pages,limit,total},url:path.split('?')[0],sortBy:String(raw.sort||'newest'),
          sortOptions:[{value:'newest',name:'En yeni'},{value:'price-asc',name:'Fiyat: Artan'},{value:'price-desc',name:'Fiyat: Azalan'}]};
      })():{products:[],facets:[],filters:[],productsCount:0,totalProductsCount:0,products_count:0,terms:'',pagination:{page:1,pages:1,limit:24,total:0},sortOptions:[]},
      collection:extra?.collection?(()=>{const c=extra.collection.collection||extra.collection;const items=extra.collection.items||extra.collection.products||[];const total=Number(extra.collection?.pagination?.total??c.products_count??items.length);const facets=this.liquidFacets(extra.collection.facets);return{...c,handle:c.slug||c.handle||'all',title:c.title||c.name,url:extra.collection.category?`/products/${c.slug||''}`:(c.url||'/products'),products:items.map((x:any)=>this.product(x)),products_count:total,all_products_count:total,facets,filters:facets}})():null,
      page:extra?.page||null,
      blog:extra?.blog||{title:'Blog',handle:'blog',url:configuredPublicPath(store,'blog',locale),articles:(boot?.blogPosts||[]).map((x:any)=>({...x,handle:x.slug,url:configuredArticleUrl(store,x.slug,locale,x?.category?.slug||''),image:x.featuredImageUrl?{src:x.featuredImageUrl,url:x.featuredImageUrl}:null,content:x.body||x.excerpt||''}))},
      article:extra?.article?{...extra.article,handle:extra.article.slug,url:configuredArticleUrl(store,extra.article.slug,locale,extra.article.category?.slug||''),image:extra.article.featuredImageUrl?{src:extra.article.featuredImageUrl,url:extra.article.featuredImageUrl}:null,content:extra.article.body||extra.article.excerpt||''}:null,
      search:extra?.search||{performed:false,terms:'',results:[],results_count:0},
      template:{name:templateName,suffix:null},
      page_title:extra?.pageTitle||store.seoTitle||store.name||'',
      page_description:extra?.pageDescription||store.seoDescription||'',
      canonical_url:`${origin}${path}`,current_page:1,current_tags:[],
      theme:{id:boot?.theme?.id||boot?.theme?.slug||'theme'},content_for_header:'',
      recommendations:extra?.recommendations&&typeof extra.recommendations==='object'?{performed:true,products:extra.recommendations.products||[],products_count:Number(extra.recommendations.products_count??extra.recommendations.products?.length??0)}:{performed:false,products:[],products_count:0},
      predictive_search:{performed:false,resources:{products:[],collections:[],pages:[],articles:[],queries:[]}},
      __translations:loc,__siteLogoUrl:String(store.logoUrl||''),__currency:currency,__storeKey:store.publicSlug||store.slug||'',__assetVersion:String(extra?.__assetVersion||''),
      __apiBase:String(extra?.apiBase||'/api/v1').replace(/\/$/,''),
      __entries:entries,__themeRuntime:boot?.themeRuntime||{}
    };
    // Keep Liquid aliases consistent: Lingerie prefers ticarti.collection.
    if(extra?.collection) context.ticarti.collection=context.results;
    return context;
  }
  private hydrateSettings(settings:any,schema:any,ctx:any){
    const out={...(settings||{})};
    for(const row of Array.isArray(schema?.settings)?schema.settings:[]){
      const id=String(row?.id||'');if(!id)continue;
      if((out[id]===undefined||out[id]===null||((row?.type==='range'||row?.type==='number')&&(typeof out[id]==='string'&&out[id].trim()===''||!Number.isFinite(Number(out[id])))))&&row?.default!==undefined)out[id]=row.default;
      const v=out[id];

      if(row?.type==='link_list'&&typeof v==='string'){
        const key=this.normalizeResourceHandle(v);
        out[id]=ctx.linklists?.[v]||ctx.linklists?.[key]||null;
      }

      if(row?.type==='collection'&&typeof v==='string'){
        const key=this.normalizeResourceHandle(v);
        out[id]=v?(ctx.collections?.[v]||ctx.collections?.[key]||null):null;
      }

      if(row?.type==='product'&&typeof v==='string'){
        const key=this.normalizeResourceHandle(v);
        out[id]=v?(ctx.all_products?.[v]||ctx.all_products?.[key]||null):null;
      }

      if(row?.type==='url'&&typeof v==='string'){
        out[id]=v
          .replace(/^shopify:\/\/collections\//,'/collections/')
          .replace(/^ticarti:\/\/collections\//,'/collections/')
          .replace(/^shopify:\/\/products\//,'/product/')
          .replace(/^ticarti:\/\/products\//,'/product/')
          .replace(/^shopify:\/\/pages\//,'/pages/')
          .replace(/^ticarti:\/\/pages\//,'/pages/')
          .replace(/^shopify:\/\/root$/,'/')
          .replace(/^ticarti:\/\/root$/,'/');
      }

      if(row?.type==='image_picker'){
        if((v===undefined||v===null||v==='')&&/(^|_)logo($|_)/i.test(id)&&ctx.__siteLogoUrl){
          out[id]=ctx.__siteLogoUrl;
        }
        const current=out[id];
        if(typeof current==='string'){
          const prefixes=['ticarti://shop_images/','shopify://shop_images/'];
          const prefix=prefixes.find(x=>current.startsWith(x));
          if(prefix){
            const rawName=current.slice(prefix.length);
            const url=`${process.env.THEME_CDN_BASE_URL?String(process.env.THEME_CDN_BASE_URL).replace(/\/$/,'')+'/v1':(ctx.__apiBase||'/api/v1')}/storefront/${encodeURIComponent(ctx.__storeKey)}/theme/asset?name=${encodeURIComponent(rawName)}${ctx.__previewThemeId?`&themeId=${encodeURIComponent(ctx.__previewThemeId)}`:''}${/^[a-f0-9]{64}$/i.test(String(ctx.__assetVersion||''))?`&v=${encodeURIComponent(ctx.__assetVersion)}`:''}`;
            out[id]=this.imageSettingObject(url);
          }else if(/^https?:\/\//i.test(current)||current.startsWith('/')){
            out[id]=this.imageSettingObject(current);
          }else if(!current){
            out[id]=null;
          }
        }
      }

      if(row?.type==='video_url'&&typeof v==='string')out[id]=this.externalVideoObject(v);
      if(row?.type==='video'&&out[id])out[id]=this.videoSettingObject(out[id]);
      if(row?.type==='font_picker'&&typeof out[id]==='string')out[id]=this.fontObject(out[id]);
    }
    for(const row of Array.isArray(schema?.settings)?schema.settings:[]){
      const id=String(row?.id||'');if(!id)continue;
      if(row?.type==='page'&&typeof out[id]==='string'){
        const key=this.normalizeResourceHandle(out[id]);
        out[id]=out[id]?(ctx.pages?.[out[id]]||ctx.pages?.[key]||{handle:key,title:key,url:`/pages/${key}`,content:''}):null;
      }
      if(row?.type==='article'&&typeof out[id]==='string'){
        const key=this.normalizeResourceHandle(out[id]);
        out[id]=out[id]?{handle:key,title:key,url:`/blog/${key}`}:null;
      }
    }
    return out;
  }
  /* TICARTI_V87_SCHEMA_VALUE_NORMALIZATION */
  private hydrateScopedSettings(settings:any,schema:any,ctx:any){
    const raw=settings&&typeof settings==='object'&&!Array.isArray(settings)?settings:{};
    const normalized:any={...raw};
    for(const row of Array.isArray(schema?.settings)?schema.settings:[]){
      const id=String(row?.id||'');
      if(!id || row?.default===undefined)continue;
      const value=normalized[id];
      // Empty is invalid only for numeric settings, not free text, rich text,
      // optional images, or links. Preserve explicit zero and false.
      const type=String(row?.type||'');
      const emptyNumber=(type==='range'||type==='number') &&
        (value===undefined || value===null || (typeof value==='string'&&value.trim()==='') || !Number.isFinite(Number(value)));
      if(value===undefined||value===null||emptyNumber){normalized[id]=row.default;continue;}
      if(type==='range'){
        const number=Number(value);
        if((row.min!==undefined&&number<Number(row.min)) || (row.max!==undefined&&number>Number(row.max))){
          normalized[id]=row.default;
        }
      }
    }
    return this.hydrateSettings(normalized,schema,ctx);
  }

  private blockArray(raw:any,schema:any,ctx:any){
    const blocks=raw?.blocks&&typeof raw.blocks==='object'&&!Array.isArray(raw.blocks)?raw.blocks:{};
    const order=Array.isArray(raw?.block_order)?raw.block_order:Object.keys(blocks);
    // Match Shopify section.blocks: only enabled, existing blocks in editor order.
    // Disabled blocks must not be rendered even when their IDs remain in block_order.
    const seen=new Set<string>();
    return order.flatMap((rawId:any)=>{
      const id=String(rawId);
      if(seen.has(id))return[];
      seen.add(id);
      if(!Object.prototype.hasOwnProperty.call(blocks,id))return[];
      const b=blocks[id];
      if(!b||typeof b!=='object'||b.disabled===true)return[];
      const bs=(schema?.blocks||[]).find((x:any)=>String(x?.type||'')===String(b?.type||''))||{};
      const nested=this.blockArray(b,bs,ctx);
      return[{id,type:String(b.type||'item'),settings:this.hydrateScopedSettings(b.settings||{},bs,ctx),blocks:nested,ticarti_attributes:`data-block-id="${this.escapeHtml(id)}"`}];
    });
  }
  private sectionObject(id:string,row:any,schema:any,ctx:any){return{id,type:String(row?.type||''),settings:this.hydrateScopedSettings(row?.settings||{},schema,ctx),blocks:this.blockArray(row,schema,ctx),ticarti_attributes:`data-section-id="${this.escapeHtml(id)}"`};}
  private sourceTemplateKey(file:string){return file.slice('theme/templates/'.length).replace(/\.(json|liquid)$/i,'');}
  private templateName(path:string){if(path==='/'||!path)return'index';if(path==='/cart')return'cart';if(path==='/products')return'collection';if(path.startsWith('/products/'))return'collection';if(path.startsWith('/product/'))return'product';if(path==='/collections')return'list-collections';if(path.startsWith('/collections/'))return'collection';if(path==='/search')return'search';if(path.startsWith('/blog/')&&path.split('/').filter(Boolean).length>1)return'article';if(path==='/blog')return'blog';if(path==='/login')return'customers/login';if(path==='/register')return'customers/register';if(path==='/account')return'customers/account';if(path.startsWith('/account/orders/'))return'customers/order';if(path==='/account/addresses')return'customers/addresses';if(path.startsWith('/pages/'))return'page';return'404';}
  private templatePath(entries:Map<string,Buffer>,path:string,extra:any){
    const name=this.templateName(path);
    if(name.startsWith('customers/'))return entries.has(`theme/templates/${name}.liquid`)?`theme/templates/${name}.liquid`:'';
    if(name==='page'){
      const slug=path.split('/').filter(Boolean).pop()||'';
      const explicit=extra?.page?.templateSuffix??extra?.page?.template_suffix;
      // No database/URL-controlled value may become a theme archive path.
      const safe=(value:unknown)=>typeof value==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value)?value:'';
      const suffix=safe(explicit)||(!explicit?safe(slug):'');
      if(suffix){
        for(const candidate of [`theme/templates/page.${suffix}.json`,`theme/templates/page.${suffix}.liquid`,`theme/templates/page-${suffix}.json`,`theme/templates/page-${suffix}.liquid`]){
          if(entries.has(candidate))return candidate;
        }
      }
      for(const candidate of ['theme/templates/page.json','theme/templates/page.liquid'])if(entries.has(candidate))return candidate;
      return '';
    }
    for(const ext of ['json','liquid']){const p=`theme/templates/${name}.${ext}`;if(entries.has(p))return p;}
    return '';
  }

  private async runtimeRoot(config:any,entries:Map<string,Buffer>){const sha=`${String(config?.package?.sha256||config?.manifest?.version||'theme').replace(/[^a-z0-9_-]/gi,'').slice(0,72)||'theme'}-liquidr3`;const cached=this.runtimeRoots.get(sha);if(cached)return cached;const base=join('/tmp','ticarti-liquid-themes',sha);for(const[name,data]of entries){if(!name.startsWith('theme/')||!name.endsWith('.liquid'))continue;const rel=name.slice('theme/'.length);const target=join(base,rel);await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await writeFile(target,this.stripSourceTags(data.toString('utf8')),'utf8');}this.runtimeRoots.set(sha,base);return base;}
  /* ticarti:theme-asset-sha-v2 */
  private engine(entries:Map<string,Buffer>,ctx:any,root:string){const liquid=new Liquid({strictFilters:false,strictVariables:false,dynamicPartials:true,globals:ctx,root:[join(root,'snippets'),join(root,'blocks'),join(root,'sections'),join(root,'templates')],partials:[join(root,'snippets'),join(root,'blocks')],layouts:[join(root,'layout')],extname:'.liquid',cache:true});const asset=(name:any)=>`${process.env.THEME_CDN_BASE_URL?String(process.env.THEME_CDN_BASE_URL).replace(/\/$/,'')+'/v1':(ctx.__apiBase||'/api/v1')}/storefront/${encodeURIComponent(ctx.__storeKey)}/theme/asset?name=${encodeURIComponent(String(name||''))}${ctx.__previewThemeId?`&themeId=${encodeURIComponent(ctx.__previewThemeId)}`:''}${/^[a-f0-9]{64}$/i.test(String(ctx.__assetVersion||''))?`&v=${encodeURIComponent(ctx.__assetVersion)}`:''}`;liquid.registerFilter('asset_url',asset);liquid.registerFilter('ticarti_asset_url',asset);liquid.registerFilter('stylesheet_tag',(url:any)=>`<link rel="stylesheet" href="${this.escapeHtml(url)}">`);liquid.registerFilter('inline_asset_content',(name:any)=>this.text(entries,`theme/assets/${String(name||'')}`));liquid.registerFilter('image_url',(input:any)=>typeof input==='string'?input:(input?.url||input?.src||input?.preview_image?.url||input?.preview_image?.src||input?.imageUrl||input?.previewImage?.url||input?.previewImage?.src||''));liquid.registerFilter('img_url',(input:any)=>typeof input==='string'?input:(input?.url||input?.src||''));liquid.registerFilter('image_tag',(input:any)=>{const src=typeof input==='string'?input:(input?.url||input?.src||'');return src?`<img src="${this.escapeHtml(src)}" loading="lazy">`:''});liquid.registerFilter('placeholder_svg_tag',(name:any)=>`<svg class="placeholder-svg" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#f4f4f4"/></svg>`);liquid.registerFilter('money_amount',(v:any)=>this.money(v,ctx.__currency));liquid.registerFilter('money',(v:any)=>this.money(v,ctx.__currency));liquid.registerFilter('money_without_currency',(v:any)=>(Number(v||0)/100).toFixed(2));liquid.registerFilter('money_without_trailing_zeros',(v:any)=>String(Number(v||0)/100));liquid.registerFilter('money_with_currency',(v:any)=>this.money(v,ctx.__currency));liquid.registerFilter('json',(v:any)=>JSON.stringify(v));liquid.registerFilter('handleize',(v:any)=>this.slugify(v));liquid.registerFilter('t',(key:any,...args:any[])=>{let v=this.nested(ctx.__translations,String(key||''));if(v===undefined||v===null)v=String(key||'');const hash=args?.[args.length-1]&&typeof args[args.length-1]==='object'?args[args.length-1]:{};if(v&&typeof v==='object'&&!Array.isArray(v)){const count=Number((hash as any)?.count);if(Number.isFinite(count)){v=count===0?(v.zero??v.other??v.many??v.one):count===1?(v.one??v.other):(v.other??v.many??v.one);}else v=v.other??v.one??Object.values(v)[0]??String(key||'');}let text=String(v??'');for(const[k,val]of Object.entries(hash))text=text.replace(new RegExp(`{{\\s*${k}\\s*}}`,'g'),String(val));return text});liquid.registerFilter('font_face',()=> '');liquid.registerFilter('font_url',()=> '');liquid.registerFilter('font_modify',(v:any)=>v);liquid.registerFilter('color_modify',(v:any,channel:any,amount:any)=>this.colorModifyValue(v,channel,amount));liquid.registerFilter('color_extract',(v:any,channel:any)=>this.colorExtractValue(v,channel));liquid.registerFilter('rgba',(v:any)=>{const c=this.colorChannels(v);return c?`rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a})`:String(v??'')});liquid.registerFilter('format_address',(v:any)=>typeof v==='string'?v:Object.values(v||{}).filter(Boolean).join(', '));liquid.registerFilter('time_tag',(v:any)=>`<time>${this.escapeHtml(v)}</time>`);liquid.registerFilter('link_to',(v:any,url:any)=>`<a href="${this.escapeHtml(url)}">${v??''}</a>`);liquid.registerFilter('link_to_tag',(v:any,tag:any)=>`<a href="/collections/all/${encodeURIComponent(String(tag||''))}">${v??''}</a>`);liquid.registerFilter('link_to_vendor',(v:any)=>String(v??''));liquid.registerFilter('payment_terms',()=> '');liquid.registerFilter('payment_button',()=> '');liquid.registerFilter('payment_type_svg_tag',()=> '');liquid.registerFilter('login_button',()=> '');liquid.registerFilter('external_video_url',(v:any)=>{const x=typeof v==='string'?this.externalVideoObject(v):v;if(x?.type==='youtube')return`https://www.youtube.com/watch?v=${x.id}`;if(x?.type==='vimeo')return`https://vimeo.com/${x.id}`;return x?.url||String(v||'')});liquid.registerFilter('external_video_tag',(v:any)=>`<iframe src="${this.escapeHtml(v)}" loading="lazy" allowfullscreen></iframe>`);liquid.registerFilter('video_tag',(v:any,...args:any[])=>{const opts=args?.[args.length-1]&&typeof args[args.length-1]==='object'?args[args.length-1]:{};return this.videoTag(v,opts)});liquid.registerFilter('media_tag',(v:any,...args:any[])=>{const t=String(v?.media_type||v?.mediaType||'');if(t==='video')return this.videoTag(v,args?.[args.length-1]);return String(v?.url||v?.src||'')});liquid.registerFilter('default_errors',()=> '');liquid.registerFilter('format_code',(v:any)=>v);return liquid;}
  // ticarti:v12-per-request-liquid-ast — Liquid instances are request-local; never share parsed AST across tenants or requests.
  private readonly v12Ast=new WeakMap<Liquid,{ast:Map<string,ReturnType<Liquid['parse']>>;parseMs:number;executeMs:number;hits:number;misses:number}>();
  private async renderSource(liquid:Liquid,source:string,ctx:any){
    const prepared=this.stripSourceTags(source);
    try{
      let state=this.v12Ast.get(liquid);
      if(!state){state={ast:new Map(),parseMs:0,executeMs:0,hits:0,misses:0};this.v12Ast.set(liquid,state)}
      let ast=state.ast.get(prepared);
      if(ast){state.hits++}else{
        const started=Date.now();
        ast=liquid.parse(prepared);
        state.parseMs+=Date.now()-started;
        state.misses++;
        if(state.ast.size<128)state.ast.set(prepared,ast);
      }
      const started=Date.now();
      const result=await liquid.render(ast,ctx);
      state.executeMs+=Date.now()-started;
      return result;
    }catch(e:any){return `<!-- ticarti-liquid-render-error: ${this.escapeHtml(e?.message||String(e))} -->`;}
  }
  private async renderSection(entries:Map<string,Buffer>,liquid:Liquid,type:string,id:string,row:any,ctx:any,groupName=''){const profile=process.env.TICARTI_LIQUID_SECTION_PROFILE==='true';const began=profile?performance.now():0;const source=this.text(entries,`theme/sections/${type}.liquid`);if(!source)return'';const schema=this.schemaFromLiquid(source);const section=this.sectionObject(id,row,schema,ctx);const preparedAt=profile?performance.now():0;if(type==='main-product'&&id==='main'&&process.env.TICARTI_BLOCK_AUDIT==='true'){const order=Array.isArray(row?.block_order)?row.block_order.map(String):null;const defined=row?.blocks&&typeof row.blocks==='object'?Object.keys(row.blocks):[];const rendered=section.blocks.map((b:any)=>String(b.id));console.log('TICARTI_BLOCK_AUDIT='+JSON.stringify({section:id,type,hasOrder:Array.isArray(order),order,definedCount:defined.length,definedOutsideOrder:order?defined.filter((x:string)=>!order.includes(x)):[],rendered,unexpected:order?rendered.filter((x:string)=>!order.includes(x)):[],missing:order?order.filter((x:string)=>!rendered.includes(x)):[],savedRuntimeTemplate:!!ctx?.__themeRuntime?.templates?.product,publishedTemplate:!!ctx?.__publishedThemePages?.product}));}const inner=await this.renderSource(liquid,source,{...ctx,section});if(profile){const elapsed=performance.now();console.log(JSON.stringify({component:'ticarti-liquid',event:'section_profile',group:groupName||'template',sectionType:String(type).slice(0,80),prepareMs:Math.round((preparedAt-began)*10)/10,renderMs:Math.round((elapsed-preparedAt)*10)/10,totalMs:Math.round((elapsed-began)*10)/10}));}const tag=/^[a-z][a-z0-9-]*$/i.test(String(schema?.tag||''))?String(schema.tag):'div';const classes=['ticarti-section',groupName?`ticarti-section-group-${groupName}`:'',String(schema?.class||'')].filter(Boolean).join(' ');return`<${tag} id="ticarti-section-${this.escapeHtml(id)}" class="${this.escapeHtml(classes)}">${inner}</${tag}>`;}
  private async renderGroup(entries:Map<string,Buffer>,liquid:Liquid,group:any,ctx:any,groupName=''){const sections=group?.sections&&typeof group.sections==='object'?group.sections:{};const order=Array.isArray(group?.order)?group.order:Object.keys(sections);let html='';for(const id of order){const row=sections[String(id)]||{};if(row.disabled===true)continue;html+=await this.renderSection(entries,liquid,String(row.type||''),String(id),row,ctx,groupName)}return html;}
  /* TICARTI_V86_PRODUCT_TEMPLATE_SETTINGS_MERGE */
  private mergeTemplateConfig(base:any, override:any){
    if(!override || typeof override!=='object' || Array.isArray(override))return base;
    const baseSections=base?.sections&&typeof base.sections==='object'?base.sections:{};
    const overrides=override?.sections&&typeof override.sections==='object'?override.sections:{};
    const sections:any={...baseSections};
    for(const [id,updated] of Object.entries(overrides) as [string,any][]){
      const prior:any=baseSections[id];
      if(!prior||typeof prior!=='object'||!updated||typeof updated!=='object'){
        sections[id]=updated;continue;
      }
      const blocks:any={...(prior.blocks||{})};
      for(const [bid,block] of Object.entries(updated.blocks&&typeof updated.blocks==='object'?updated.blocks:{})){
        const existing:any=blocks[bid];
        blocks[bid]=existing&&typeof existing==='object'&&block&&typeof block==='object'
          ?{...existing,...block,settings:{...(existing.settings||{}),...((block as any).settings||{})}}
          :block;
      }
      sections[id]={...prior,...updated,
        settings:{...(prior.settings||{}),...(updated.settings||{})},blocks,
        block_order:Array.isArray(updated.block_order)?updated.block_order:prior.block_order};
    }
    return {...base,...override,sections,order:Array.isArray(override.order)?override.order:base?.order};
  }
  private runtimeTemplates(extra:any,ctx:any,entries:Map<string,Buffer>){
    const saved=ctx?.__themeRuntime?.templates&&typeof ctx.__themeRuntime.templates==='object'?ctx.__themeRuntime.templates:{};
    const preview=extra?.templates&&typeof extra.templates==='object'?extra.templates:{};
    const result:any={};
    for(const key of new Set([...Object.keys(saved),...Object.keys(preview)])){
      const base=this.mergeTemplateConfig(this.json(entries,`theme/templates/${key}.json`,{sections:{},order:[]}),ctx?.__publishedThemePages?.[key]);
      result[key]=this.mergeTemplateConfig(this.mergeTemplateConfig(base,(saved as any)[key]),(preview as any)[key]);
    }
    return result;
  }
  private runtimeGroups(extra:any,ctx:any){const saved=ctx?.__themeRuntime?.groups&&typeof ctx.__themeRuntime.groups==='object'?ctx.__themeRuntime.groups:{};const preview=extra?.groups&&typeof extra.groups==='object'?extra.groups:{};return{...saved,...preview};}
  private async renderStaticSectionTags(entries:Map<string,Buffer>,liquid:Liquid,source:string,ctx:any){
    const types=new Set<string>();
    for(const m of source.matchAll(/{%-?\s*section\s+['"]([^'"]+)['"]\s*-?%}/g))types.add(String(m[1]||''));
    for(const m of source.matchAll(/^\s*section\s+['"]([^'"]+)['"]\s*$/gm))types.add(String(m[1]||''));
    let prepared=source;
    for(const type of types){
      if(!type)continue;
      const safe=type.replace(/[^a-z0-9_]/gi,'_');
      const key=`__static_section_${safe}`;
      if(ctx[key]===undefined)ctx[key]=await this.renderSection(entries,liquid,type,type,{type,settings:{}},ctx);
      prepared=prepared
        .replace(new RegExp(`{%-?\\s*section\\s+['"]${type.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}['"]\\s*-?%}`,'g'),`{{ ${key} }}`)
        .replace(new RegExp(`^(\\s*)section\\s+['"]${type.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}['"]\\s*$`,'gm'),`$1echo ${key}`);
    }
    return prepared;
  }
  // Normalize the effective runtime template, not the stored/editor template.
  // An explicit block_order is authoritative. Unreferenced blocks may remain
  // in source JSON for editor history but must never reach the Liquid renderer.
  private orderedRuntimeTemplate(input:any){
    if(!input || typeof input!=='object' || Array.isArray(input))return input;
    const sections=input.sections;
    if(!sections || typeof sections!=='object' || Array.isArray(sections))return input;
    let changed=false;
    const result:any={...sections};
    for(const [sid, section] of Object.entries(sections) as [string,any][]){
      if(!section || typeof section!=='object' || Array.isArray(section))continue;
      const blocks=section.blocks;
      if(!blocks || typeof blocks!=='object' || Array.isArray(blocks) || !Array.isArray(section.block_order))continue;
      const ordered:any={};
      const seen=new Set<string>();
      for(const rawId of section.block_order){
        const id=String(rawId);
        if(seen.has(id) || !Object.prototype.hasOwnProperty.call(blocks,id))continue;
        seen.add(id);
        const block=blocks[id];
        if(!block || typeof block!=='object' || block.disabled===true)continue;
        ordered[id]=block;
      }
      result[sid]={...section,blocks:ordered,block_order:Object.keys(ordered)};
      changed=true;
    }
    return changed?{...input,sections:result}:input;
  }
  private async renderTemplate(entries:Map<string,Buffer>,liquid:Liquid,path:string,extra:any,ctx:any){
    const file=this.templatePath(entries,path,extra);if(!file)return'';
    if(file.endsWith('.liquid')){const source=await this.renderStaticSectionTags(entries,liquid,this.text(entries,file),ctx);return this.renderSource(liquid,source,ctx);}
    const key=this.sourceTemplateKey(file);
    const override=this.runtimeTemplates(extra,ctx,entries)?.[key];
    /* TICARTI_V89_PUBLISHED_TEMPLATE_SOURCE */
    const base=this.mergeTemplateConfig(this.json(entries,file,{sections:{},order:[]}),ctx?.__publishedThemePages?.[key]);
    const tpl=override&&typeof override==='object'?override:base;
    return this.renderGroup(entries,liquid,this.orderedRuntimeTemplate(tpl),ctx);
  }
  private layoutStaticSectionTypes(source:string){const out=new Set<string>();for(const m of source.matchAll(/{%-?\s*section\s+['"]([^'"]+)['"]\s*-?%}/g))out.add(String(m[1]||''));for(const m of source.matchAll(/^\s*section\s+['"]([^'"]+)['"]\s*$/gm))out.add(String(m[1]||''));return[...out].filter(Boolean);}
  private activateLayoutPlaceholders(source:string){return source
    .replace(/{%-?\s*sections\s+['"]([^'"]+)['"]\s*-?%}/g,(_m,name)=>`{{ __group_${String(name).replace(/[^a-z0-9_]/gi,'_')} }}`)
    .replace(/{%-?\s*section\s+['"]([^'"]+)['"]\s*-?%}/g,(_m,name)=>`{{ __section_${String(name).replace(/[^a-z0-9_]/gi,'_')} }}`)
    .replace(/^(\s*)sections\s+['"]([^'"]+)['"]\s*$/gm,(_m,sp,name)=>`${sp}echo __group_${String(name).replace(/[^a-z0-9_]/gi,'_')}`)
    .replace(/^(\s*)section\s+['"]([^'"]+)['"]\s*$/gm,(_m,sp,name)=>`${sp}echo __section_${String(name).replace(/[^a-z0-9_]/gi,'_')}`); }
  private fragment(full:string,designMode=false,meta:any={}){
    const head=(full.match(/<head[^>]*>([\s\S]*?)<\/head>/i)||[])[1]||'';
    const body=(full.match(/<body[^>]*>([\s\S]*?)<\/body>/i)||[])[1]||full;
    const headAssets=[...head.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*>/gi)].map(x=>x[0]).join('\n');
    const safeMeta=JSON.stringify(meta||{}).replace(/</g,'\\u003c');
    const compat=`<script data-ticarti-liquid-compat>(function(w,m){var d=${designMode?'true':'false'};var T=w.Ticarti=w.Ticarti||{};T.designMode=d;T.previewMode=d;T.shop=m.shop||'';T.locale=m.locale||'tr';T.country=m.country||'TR';T.currency=m.currency||{active:'TRY',rate:1};T.theme=m.theme||{id:'theme',name:'Ticarti Theme',schema_name:'Ticarti'};T.routes=Object.assign(T.routes||{},m.routes||{});T.cdnHost=m.cdnHost||'';var S=w.Shopify=w.Shopify||{};S.designMode=d;S.previewMode=d;S.shop=T.shop;S.locale=T.locale;S.country=T.country;S.currency=T.currency;S.theme=T.theme;S.routes=T.routes;S.cdnHost=T.cdnHost;if(typeof w.debounce!=='function'){w.debounce=function(fn,wait){var t;return function(){var a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a)},Number(wait)||0)}}}})(window,${safeMeta});</script>`;
    return`${compat}\n${headAssets}\n${body}`;
  }

  // Render the active theme's actual collection.wishlist_ajax.liquid / product-card.liquid.
  // No custom product-card DOM, invented ratings or duplicated theme settings.
  async renderWishlistCards(storeKey:string,boot:any,rawProducts:any[],rawSettings:string,localeValue?:string,currencyValue?:string){
    const cfg:any=boot?.theme?.config||{};
    if(String(cfg.engine||cfg.manifest?.engine||'')!=='ticarti-liquid-source')return {html:''};
    const entries=await this.entries(cfg);
    const source=this.text(entries,'theme/templates/collection.wishlist_ajax.liquid');
    if(!source)throw new NotFoundException('Active theme wishlist product template not found');
    const locale=String(localeValue||boot?.store?.locale||'tr');
    const currency=String(currencyValue||boot?.store?.currency||'TRY');
    const context:any=this.baseContext(boot,'/wishlist',locale,currency,{
      apiBase:'/api/v1',origin:'',__assetVersion:String(cfg?.package?.sha256||'')
    },entries);
    const products=(Array.isArray(rawProducts)?rawProducts:[]).slice(0,80).map(p=>this.product(p)).filter(Boolean);
    const byHandle:Record<string,any>={};
    const handles:string[]=[];
    for(const product of products){
      const handle=String(product?.handle||product?.slug||'');
      if(!handle||handle.includes('||'))continue;
      handles.push(handle);byHandle[handle]=product;
    }
    context.all_products={...(context.all_products||{}),...byHandle};
    // The original Wokiee template encodes 22 product-card settings after "||".
    const settings=String(rawSettings||'').slice(0,4096);
    if(settings.includes('||'))throw new Error('Invalid wishlist theme settings');
    context.collection={...(context.collection||{}),sort_by:handles.join('||')+'||'+settings};
    const root=await this.runtimeRoot(cfg,entries);
    const engine=this.engine(entries,context,root);
    const html=await this.renderSource(engine,source,context);
    if(html.includes('ticarti-liquid-render-error'))throw new Error('Wishlist Liquid rendering failed');
    return {html};
  }
  async render(storeKey:string,boot:any,pathValue:string,localeValue?:string,currencyValue?:string,extra:any={}){const requestedThemeRef=String(extra?.themeId||'').trim();if(requestedThemeRef&&requestedThemeRef!==String(boot?.theme?.id||'')&&requestedThemeRef!==String(boot?.theme?.slug||'')){const picked=await this.themeForStore(storeKey,requestedThemeRef);boot={...boot,theme:picked.theme,themeRuntime:{}};}const cfg:any=boot?.theme?.config||{};if(String(cfg.engine||cfg.manifest?.engine||'')!=='ticarti-liquid-source')return null;// ticarti:v11-render-tracing — structured stage timings; no payloads, tenant identifiers or tokens in logs.
    const v11Started=Date.now();
    // ticarti:v10-liquid-preparation — independent archive and tenant-scoped resource reads are concurrent.
    const prepStart=Date.now();
    const [entries,resourceCatalog]=await Promise.all([
      this.entries(cfg),
      this.resourceCatalog(String(boot?.store?.id||'')),
    ]);
    const v11PrepareMs=Date.now()-prepStart;
    const locale=String(localeValue||boot?.store?.locale||'tr');const currency=String(currencyValue||boot?.store?.currency||'TRY');const path=String(pathValue||'/').split('?')[0]||'/';const origin=String(extra?.origin||'');const ctx:any=this.baseContext(boot,path,locale,currency,{...extra,origin,__resourceCatalog:resourceCatalog,__assetVersion:String(cfg?.package?.sha256||'')},entries);
    // Route values follow merchant SEO overrides, not theme-specific hardcoded links.
    const seoRouting:any=boot?.store?.settings?.seoAdvanced?.urlRouting||{};
    const availableLocales:any=seoRouting.locales||{};
    const routeLanguage=locale.toLowerCase();
    const localeEntry:any=availableLocales[routeLanguage]||availableLocales[routeLanguage.split('-')[0]]||{};
    const merchantPath=(key:string,fallback:string)=>{
      const custom=String(localeEntry?.paths?.[key]||'').trim().replace(/^\/+|\/+$/g,'');
      return custom?'/'+custom:fallback;
    };
    Object.assign(ctx.routes||{},{
      root_url:'/',
      cart_url:merchantPath('cart','/cart'),
      cart_add_url:'/api/cart/add',
      cart_change_url:'/api/cart/change',
      cart_update_url:'/api/cart/update',
      cart_clear_url:'/api/cart/clear',
      checkout_url:merchantPath('checkout','/checkout'),
      collections_url:'/collections',
      all_products_collection_url:'/collections/all',
      search_url:'/search',
      predictive_search_url:'/search',
      account_url:merchantPath('account','/account'),
      account_login_url:merchantPath('login','/login'),
      account_register_url:merchantPath('register','/register'),
      account_logout_url:'/account/logout',
      account_orders_url:merchantPath('orders','/orders'),
      account_addresses_url:merchantPath('addresses','/addresses'),
      wishlist_url:merchantPath('wishlist','/wishlist'),
      compare_url:merchantPath('compare','/compare'),
      account_returns_url:merchantPath('returns','/returns'),
      account_questions_url:merchantPath('questions','/questions'),
      account_reviews_url:merchantPath('reviews','/reviews'),
      account_forgot_password_url:merchantPath('forgot-password','/forgot-password')
    });
    ctx.shop={...(ctx.shop||{}),url:origin,secure_url:origin,locale,currency};
    ctx.request={...(ctx.request||{}),origin,host:String(origin||'').replace(/^https?:\/\//,'').replace(/\/$/,''),path,design_mode:!!extra?.designMode};
    ctx.canonical_url=`${origin}${path}`;this.forceGlobalSettings(entries,ctx,boot,extra);const v11ContextMs=Date.now()-v11Started-v11PrepareMs;const v11TemplateStart=Date.now();ctx.__publishedThemePages=cfg?.pages&&typeof cfg.pages==='object'&&!Array.isArray(cfg.pages)?cfg.pages:{};const root=await this.runtimeRoot(cfg,entries);const liquid=this.engine(entries,ctx,root);const content=await this.renderTemplate(entries,liquid,path,extra,ctx);const v11TemplateMs=Date.now()-v11TemplateStart;const v11GroupsStart=Date.now();const groupOverrides=this.runtimeGroups(extra,ctx);const header=groupOverrides.header||this.json(entries,'theme/sections/header-group.json',{sections:{},order:[]});const footer=groupOverrides.footer||this.json(entries,'theme/sections/footer-group.json',{sections:{},order:[]});const popups=groupOverrides.popups||this.json(entries,'theme/sections/popups-group.json',{sections:{},order:[]});/* TICARTI_V14_PARALLEL_GROUPS: experimental, only enable after strict HTML regression. */
    if(process.env.TICARTI_LIQUID_PARALLEL_GROUPS==='true' && !extra?.designMode){
      const [h,f,p]=await Promise.all([
        this.renderGroup(entries,liquid,header,ctx,'header-group'),
        this.renderGroup(entries,liquid,footer,ctx,'footer-group'),
        this.renderGroup(entries,liquid,popups,ctx,'popups-group')
      ]);
      ctx.__group_header_group=h;
      ctx.__group_footer_group=f;
      ctx.__group_popups_group=p;
    }else{
      ctx.__group_header_group=await this.renderGroup(entries,liquid,header,ctx,'header-group');
      ctx.__group_footer_group=await this.renderGroup(entries,liquid,footer,ctx,'footer-group');
      ctx.__group_popups_group=await this.renderGroup(entries,liquid,popups,ctx,'popups-group');
    }ctx.content_for_layout=content;let layout=this.text(entries,'theme/layout/theme.liquid');for(const type of this.layoutStaticSectionTypes(layout)){ctx[`__section_${type.replace(/[^a-z0-9_]/gi,'_')}`]=await this.renderSection(entries,liquid,type,type,{type,settings:{}},ctx);}const v11GroupsMs=Date.now()-v11GroupsStart;const v11LayoutStart=Date.now();layout=this.activateLayoutPlaceholders(layout);const full=await this.renderSource(liquid,layout,ctx);const v11LayoutMs=Date.now()-v11LayoutStart;console.log(JSON.stringify({component:'ticarti-liquid',event:'render_pipeline',stage:'runtime',prepareMs:v11PrepareMs,contextMs:v11ContextMs,templateMs:v11TemplateMs,groupsMs:v11GroupsMs,layoutMs:v11LayoutMs,parseMs:this.v12Ast.get(liquid)?.parseMs||0,executeMs:this.v12Ast.get(liquid)?.executeMs||0,parseHits:this.v12Ast.get(liquid)?.hits||0,parseMisses:this.v12Ast.get(liquid)?.misses||0,totalMs:Date.now()-v11Started,preview:!!extra?.designMode}));if(Buffer.byteLength(String(full),'utf8')>2*1024*1024)throw new Error('Theme render output limit exceeded');return{engine:'ticarti-liquid-source',runtimeVersion:'6.3.2',html:this.fragment(full,!!extra?.designMode,{
      shop:String(ctx?.shop?.permanent_domain||ctx?.shop?.domain||''),
      locale,
      country:String(extra?.country||boot?.store?.countryCode||boot?.store?.country||'TR'),
      currency:{active:currency,rate:Number(extra?.currencyRate||1)||1},
      theme:{
        id:String(boot?.theme?.id||boot?.theme?.slug||'theme'),
        name:String(boot?.theme?.name||'Ticarti Theme'),
        schema_name:'Ticarti',
        schema_version:String(boot?.theme?.version||cfg?.manifest?.version||'1.0.0'),
        role:extra?.designMode?'unpublished':'main',
        handle:String(boot?.theme?.slug||'theme'),
        style:{id:null,handle:null}
      },
      routes:ctx.routes||{},
      cdnHost:String(ctx?.shop?.permanent_domain||ctx?.shop?.domain||'')
    }),template:this.templateName(path),theme:{slug:boot?.theme?.slug,version:boot?.theme?.version}};}
}
