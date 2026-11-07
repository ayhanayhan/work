import {escapeHtml,safeImage,homeCard,BlogPost,BlogLocale,blogPath} from './blog';

type Values=Record<string,Record<string,string>>;
type HomeItem={id:string;enabled:boolean;fields:Values;assets?:{image?:string};links?:{href?:string};sortOrder?:number};
type HomeModule={id:string;enabled:boolean;sortOrder:number;fields:Values;items:HomeItem[]};
export type HomepageSnapshot={version:number;modules:HomeModule[]};
const API_ORIGIN=(process.env.API_ORIGIN||'').replace(/\/$/,'');
const names=['hero','animated','builder','radar','channels','showcase','references','bottomCta','blog','faq'] as const;
const classes:Record<string,string>={
  hero:'tc-site-hero',animated:'tc-animated-heading',builder:'tc-builder-section',
  radar:'tc-dashboard-radar',channels:'tc-sales-channels',showcase:'tc-showcase',
  references:'tc-press',bottomCta:'tc-bottom-cta',blog:'tc-blog',faq:'tc-faq'
};
const text=(v:any,lang:string)=>typeof v?.[lang]==='string'?v[lang].trim():'';
const safe=(v:string)=>escapeHtml(v);
export async function getHomepageSnapshot(lang:string):Promise<HomepageSnapshot|null>{
  if(!API_ORIGIN){console.error('[homepage-ssr] API_ORIGIN is missing');return null;}
  try{
    const response=await fetch(API_ORIGIN+'/v1/public/website/home?lang='+encodeURIComponent(lang),{
      cache:'no-store',signal:AbortSignal.timeout(8000)
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    const value=await response.json();
    if(!Array.isArray(value?.modules))throw Error('Invalid CMS module payload');
    return {version:Number(value.version)||0,modules:value.modules};
  }catch(e){console.error('[homepage-ssr] Could not load homepage modules',e);return null}
}
/** Find complete, nested HTML elements, rather than stopping at the first closing div. */
function matched(html:string,start:number,tag:string):number{
  const rx=new RegExp('<\\/?'+tag+'\\b[^>]*>','gi');rx.lastIndex=start;
  let depth=1,m:RegExpExecArray|null;
  while((m=rx.exec(html))){
    if(m[0].startsWith('</'))depth--;else if(!/\/\s*>$/.test(m[0]))depth++;
    if(depth===0)return rx.lastIndex;
  }
  return -1;
}
function sectionRanges(html:string){
  const rx=/<section\b[^>]*>/gi;
  const out:{id:string;start:number;end:number}[]=[];
  let m:RegExpExecArray|null;
  while((m=rx.exec(html))){
    const attrs=m[0];
    const id=names.find(key=>new RegExp('(?:class="[^"]*\\b'+classes[key]+'\\b|id="tc-'+key+'")').test(attrs));
    if(!id)continue;
    const end=matched(html,rx.lastIndex,'section');
    if(end>0){out.push({id,start:m.index,end});rx.lastIndex=end}
  }
  return out;
}
function setClassText(section:string,className:string,value:string,allowBreak=false):string{
  // Match one content element using an existing design class, never a global placeholder key.
  const escaped=className.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const rx=new RegExp('<(h[1-6]|p|span|div)\\b([^>]*class="[^"]*\\b'+escaped+'\\b[^"]*"[^>]*)>[\\s\\S]*?<\\/\\1>','i');
  return section.replace(rx,(_whole,tag,attrs)=>'<'+tag+attrs+'>'+
    (allowBreak?value.split(/\n/).map(safe).join('<br/>'):safe(value))+'</'+tag+'>');
}
const fields:Record<string,Record<string,string>>={
 hero:{heading:'tc-site-hero__h1',description:'tc-site-hero__sub',offer:'tc-hero-offer'},
 animated:{heading:'tc-animated-heading__sr',description:'tc-animated-heading__static'},
 radar:{heading:'tc-dashboard-radar__heading',description:'tc-dashboard-radar__subtitle'},
 channels:{heading:'tc-sales-channels__heading',description:'tc-sales-channels__intro'},
 showcase:{heading:'tc-showcase__heading',description:'tc-showcase__intro'},
 references:{heading:'tc-press__title'},
 bottomCta:{heading:'tc-bottom-cta__heading',offer:'tc-bottom-cta__offer'},
 blog:{heading:'tc-blog-title',description:'tc-blog__heading p'},
 faq:{heading:'tc-faq__title',description:'tc-faq__subtitle'}
};
function scopedText(section:string,mod:HomeModule,lang:string){
  for(const [key,cls] of Object.entries(fields[mod.id]||{})){
    const value=text(mod.fields?.[key],lang);
    if(mod.id==='blog'&&key==='heading'){
      section=section.replace(/(<h2\b[^>]*id="tc-blog-title"[^>]*>)[\s\S]*?(<\/h2>)/i,'$1'+safe(value)+'$2');
    }else if(mod.id==='blog'&&key==='description'){
      section=section.replace(/(<div\\b[^>]*class="tc-blog__heading"[^>]*>[\\s\\S]*?<p\\b[^>]*>)[\\s\\S]*?(<\\/p>)/i,
        '$1'+safe(value)+'$2');
    }else section=setClassText(section,cls,value,key==='heading'&&mod.id==='hero');
  }
  return section;
}
function sectionItems(mod:HomeModule,lang:string){
  return (Array.isArray(mod.items)?mod.items:[])
    .filter(item=>item?.enabled!==false)
    .sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0))
    .map(item=>({
      id:item.id,heading:text(item.fields?.heading,lang),description:text(item.fields?.description,lang),
      role:text(item.fields?.role,lang),button:text(item.fields?.button,lang),
      image:item.assets?.image||'',href:item.links?.href||''
    })).filter(x=>x.heading||x.description||x.role||x.button||x.image);
}
function removeContainer(section:string,className:string){
  const rx=new RegExp('<div\\b[^>]*class="[^"]*\\b'+className+'\\b[^"]*"[^>]*>','i');
  const match=rx.exec(section);
  if(!match)return section;
  const end=matched(section,match.index+match[0].length,'div');
  return end<0?section:section.slice(0,match.index)+section.slice(end);
}
function replaceChildren(section:string,parentClass:string,markup:string){
  const target=new RegExp('<div\\b[^>]*class="[^"]*\\b'+parentClass+'\\b[^"]*"[^>]*>','i').exec(section);
  if(!target)return section;
  const from=target.index+target[0].length, to=matched(section,from,'div');
  if(to<0)return section;
  const closing=section.slice(to-6,to); // simple div end token; matched returns offset after </div>
  return section.slice(0,from)+markup+(closing.startsWith('</div')?closing:'</div>')+section.slice(to);
}
function renderEntries(section:string,mod:HomeModule,lang:string){
  const items=sectionItems(mod,lang);
  const parts=items.map((item)=>{
    const name=safe(item.heading),desc=safe(item.description),role=safe(item.role),button=safe(item.button);
    const img=item.image?'<img loading="lazy" src="'+safe(safeImage(item.image))+'" alt="'+name+'"/>':'';
    const href=/^(https:\/\/|\/|#)/.test(item.href)?safe(item.href):'';
    const open=href?'<a href="'+href+'">':'',close=href?'</a>':'';
    switch(mod.id){
      case 'animated':return '<span class="tc-animated-heading__item">'+name+'</span>';
      case 'builder':return '<article class="tc-builder-section__card">'+open+
        (img?'<span class="tc-builder-section__badge">'+img+'</span>':'')+
        (name?'<h3 class="tc-builder-section__title">'+name+'</h3>':'')+
        (desc?'<p class="tc-builder-section__text">'+desc+'</p>':'')+close+'</article>';
      case 'radar':return '<article class="tc-dashboard-radar__card tc-dashboard-radar__reveal">'+
        '<div class="tc-dashboard-radar__card-text">'+img+
        (name?'<h3 class="tc-dashboard-radar__card-title">'+name+'</h3>':'')+
        (desc?'<p class="tc-dashboard-radar__card-body">'+desc+'</p>':'')+'</div></article>';
      case 'channels':return '<div class="tc-sales-channels__col">'+open+img+
        (desc?'<div class="tc-sales-channels__text">'+desc+'</div>':'')+
        (button?'<span>'+button+'</span>':'')+close+'</div>';
      case 'showcase':return '<article class="tc-showcase__item">'+open+
        '<div class="tc-showcase__card">'+img+(name?'<h3>'+name+'</h3>':'')+
        (role?'<div>'+role+'</div>':'')+(desc?'<p>'+desc+'</p>':'')+
        (button?'<span>'+button+'</span>':'')+'</div>'+close+'</article>';
      case 'references':return '<div>'+open+img+(name?'<span>'+name+'</span>':'')+close+'</div>';
      default:return '';
    }
  }).join('');
  const parents:Record<string,string>={
    animated:'tc-animated-heading__stack',builder:'tc-builder-section__grid',
    radar:'tc-dashboard-radar__cards',channels:'tc-sales-channels__grid',
    showcase:'tc-showcase__track',references:'tc-press__awards-row'
  };
  return parents[mod.id]?replaceChildren(section,parents[mod.id],parts):section;
}
function replaceBlogCards(section:string,posts:BlogPost[],lang:string){
  return replaceChildren(section,'tc-blog__track',posts.slice(0,8).map(post=>homeCard(post,lang)).join(''));
}
function renderSingle(section:string,mod:HomeModule|undefined,lang:string,posts:BlogPost[]):string{
  if(!mod||mod.enabled===false)return '';
  if(mod.id==='faq')return section; // authoritative FAQ and schema rendered by faq.ts
  const items=sectionItems(mod,lang);
  if(mod.id==='blog'){
    if(!posts.length)return '';
    return replaceBlogCards(scopedText(section,mod,lang),posts,lang)
      .replace('href="blog/index.html"','href="'+blogPath(lang)+'"');
  }
  const hasText=Object.values(mod.fields||{}).some(v=>!!text(v,lang));
  const requiresItems=['animated','builder','radar','channels','showcase','references'].includes(mod.id);
  if(!hasText&&!items.length)return '';
  if(requiresItems&&!items.length)return ''; // No original static demo cards.
  section=scopedText(section,mod,lang);
  if(requiresItems)section=renderEntries(section,mod,lang);
  // Remove template imagery that the CMS has not supplied.
  if(mod.id==='hero')section=section.replace(/<img\b[^>]*>/gi,'');
  return section;
}
const localeNames:Record<string,string>={tr:'Türkçe',en:'English',de:'Deutsch',ru:'Русский',pt:'Português',ar:'العربية',bg:'Български',fr:'Français',es:'Español'};
export function renderFooterLanguages(html:string,activeLocales:string[],lang:string,pathSegments:string[]=[]):string{
  const marker='<div class="footer-lang-wrap">';
  const start=html.indexOf(marker);
  if(start<0)return html;
  const end=matched(html,start+marker.length,'div');
  if(end<0)return html;
  const segments=[...pathSegments];
  if(segments[0]===lang)segments.shift();
  const suffix=segments.filter(x=>x!=='index.html').join('/');
  const list=activeLocales.filter(x=>/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(x));
  if(!list.length)return html.slice(0,start)+html.slice(end);
  const entries=list.map(locale=>{
    const url=(locale==='tr'?'':'/'+locale)+'/'+suffix;
    return '<li'+(locale===lang?' class="is-active"':'')+'><a class="lang-item" href="'+safe(url.replace(/\/+/g,'/'))+'" lang="'+safe(locale)+'"'+(locale===lang?' aria-current="page"':'')+'>'+
      '<span class="lang-name">'+safe(localeNames[locale]||locale.toUpperCase())+'</span></a></li>';
  }).join('');
  const replacement='<div class="footer-lang-wrap"><details class="lang-wrap">'+
    '<summary class="lang-toggle" aria-label="Dil seçimi"><span class="lang-current">'+safe(localeNames[lang]||lang.toUpperCase())+'</span><span class="lang-caret"></span></summary>'+
    '<ul class="lang-menu">'+entries+'</ul></details></div>';
  return html.slice(0,start)+replacement+html.slice(end);
}
export function renderHomepageServer(html:string,home:HomepageSnapshot|null,lang:string,posts:BlogPost[]):string{
  const sections=sectionRanges(html);
  if(!sections.length)throw Error('Homepage template has no matching CMS sections');
  const modules=home?.modules||[];
  const lookup=new Map(modules.map(m=>[m.id,m]));
  const replacements=new Map<string,string>();
  for(const span of sections)replacements.set(span.id,renderSingle(html.slice(span.start,span.end),lookup.get(span.id),lang,posts));
  let result=html;
  // Replace from right to left to keep offsets valid.
  for(const span of [...sections].reverse())result=result.slice(0,span.start)+(replacements.get(span.id)||'')+result.slice(span.end);
  // Sort actual rendered sections, not just Master nav entries.
  const ordered=modules.filter(m=>replacements.get(m.id)).sort((a,b)=>a.sortOrder-b.sortOrder);
  const anchors=sectionRanges(result);
  if(!ordered.length||!anchors.length)return result;
  // Only reorder adjacent module sections within their existing layout container
  // in the next migration; never move sections across unrelated wrappers.
  return result;
}
