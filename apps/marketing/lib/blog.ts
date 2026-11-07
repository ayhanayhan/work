export const BLOG_LOCALES=['tr','en','pt','ru'] as const;
export type BlogLocale=string;
export type BlogPost={
  id:string;slug:string;category:string;title:string;excerpt:string;featuredImage:string;content:string;
  seoTitle:string;seoDescription:string;imageAlt:string;authorName:string;
  author?:{slug:string;name:string;bio:string;seoTitle:string;seoDescription:string;avatar:string;socials:Record<string,string>}|null;
  availableLocales:BlogLocale[];publishedAt:string|null;updatedAt:string|null;
  tags:string[];isFeatured:boolean;relatedPostIds:string[];ogImage:string;canonicalUrl:string;noIndex:boolean;
  localeSlugs:Partial<Record<BlogLocale,string>>;
};
export const isBlogLocale=(lang:string):lang is BlogLocale=>/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(lang);
export async function getWebsiteLocales():Promise<string[]>{
  const api=(process.env.API_ORIGIN||'').replace(/\/$/,'');
  if(!api)return [];
  try{
    const res=await fetch(api+'/v1/public/website/locales',{cache:'no-store',signal:AbortSignal.timeout(7000)});
    if(!res.ok)return [];
    const rows=await res.json();
    if(!Array.isArray(rows))return [];
    return rows.map((x:any)=>String(x.locale||'').toLowerCase()).filter(isBlogLocale);
  }catch{return [];}
}

export const escapeHtml=(value:string)=>String(value||'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string,string>)[x]);
export const slugValid=(value:string)=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export const safeImage=(value:string)=>{
  if(/^https:\/\/[a-zA-Z0-9.-]+(?:\/[^\s"'<>]*)?$/.test(value))return value;
  if(/^\/?assets\/[a-zA-Z0-9_./-]+$/.test(value))return '/'+value.replace(/^\//,'');
  if(/^(?:\.\.\/)+assets\/[a-zA-Z0-9_./-]+$/.test(value))return '/'+value.replace(/^(?:\.\.\/)+/,'');
  return '/assets/images/blog/store.svg';
};
export const blogRoot=(lang:BlogLocale)=>lang==='tr'?'':'/'+lang;
export const blogPath=(lang:BlogLocale,slug?:string)=>blogRoot(lang)+'/blog'+(slug?'/'+encodeURIComponent(slug):'');
export const blogLabels:Record<string,{read:string;all:string;related:string;featured:string;filter:string;blogDescription:string}>={
  tr:{read:'Yazıyı oku',all:'Tüm yazılar',related:'Diğer yazılar',featured:'ÖNE ÇIKAN YAZI',filter:'Tümü',blogDescription:'E-ticaret ve mağaza yönetimi üzerine yazılar.'},
  en:{read:'Read article',all:'All articles',related:'Other articles',featured:'FEATURED ARTICLE',filter:'All',blogDescription:'Articles about e-commerce and store management.'},
  pt:{read:'Ler artigo',all:'Todos os artigos',related:'Outros artigos',featured:'ARTIGO EM DESTAQUE',filter:'Todos',blogDescription:'Artigos sobre comércio eletrónico e gestão de lojas.'},
  ru:{read:'Читать статью',all:'Все статьи',related:'Другие статьи',featured:'ИЗБРАННАЯ СТАТЬЯ',filter:'Все',blogDescription:'Статьи об электронной коммерции и управлении магазином.'}
};
export const blogLabel=(lang:string)=>blogLabels[lang]||blogLabels.en;
const validDate=(v:unknown)=>typeof v==='string'&&!Number.isNaN(Date.parse(v))?v:null;
/** Never use seed content, and never fall back to Turkish for missing locales. */
export async function getBlogPosts(lang:BlogLocale='tr'):Promise<BlogPost[]>{
  if(!isBlogLocale(lang))return [];
  const api=(process.env.API_ORIGIN||'').replace(/\/$/,'');
  if(!api)return [];
  try{
    const res=await fetch(api+'/v1/public/website/blog?lang='+encodeURIComponent(lang),{cache:'no-store',signal:AbortSignal.timeout(7000)});
    if(!res.ok){console.error('[marketing-blog] Feed HTTP '+res.status+' for '+lang);return [];}
    const result=await res.json() as {posts?:unknown[]};
    if(!Array.isArray(result.posts))return [];
    return result.posts.filter((entry:any)=>entry&&entry.status==='PUBLISHED'&&
      typeof entry.title==='string'&&entry.title.trim()&&
      typeof entry.content==='string'&&entry.content.trim()&&
      slugValid(String(entry.slug||''))&&Array.isArray(entry.availableLocales)&&entry.availableLocales.includes(lang)
    ).map((entry:any)=>({
      id:String(entry.id||entry.slug),slug:String(entry.slug),category:String(entry.category||'Blog'),title:String(entry.title).trim(),
      localeSlugs:entry.localeSlugs&&typeof entry.localeSlugs==='object'?entry.localeSlugs:{},
      excerpt:String(entry.excerpt||'').trim(),featuredImage:String(entry.featuredImage||''),
      content:String(entry.content).trim(),seoTitle:String(entry.seoTitle||'').trim(),
      seoDescription:String(entry.seoDescription||'').trim(),imageAlt:String(entry.imageAlt||entry.title),
      authorName:String(entry.authorName||'Ticarti'),
      author:entry.author&&typeof entry.author==='object'?entry.author:null,
      availableLocales:entry.availableLocales.filter((code:unknown):code is string=>typeof code==='string'&&isBlogLocale(code)),
      tags:Array.isArray(entry.tags)?entry.tags.filter((x:any)=>typeof x==='string'):[],
      isFeatured:entry.isFeatured===true,relatedPostIds:Array.isArray(entry.relatedPostIds)?entry.relatedPostIds:[],
      ogImage:String(entry.ogImage||''),canonicalUrl:String(entry.canonicalUrl||''),noIndex:entry.noIndex===true,
      publishedAt:validDate(entry.publishedAt),updatedAt:validDate(entry.updatedAt)
    }));
  }catch(e){console.error('[marketing-blog] Unable to load published blog for '+lang,e);return [];}
}
function inlineMarkdown(raw:string){
  const tokens:string[]=[];
  // Escape before adding a strictly limited set of Markdown formatting.
  let result=escapeHtml(raw);
  result=result.replace(/`([^`]+)`/g,(_m,code)=>{
    const marker='%%CODE'+tokens.length+'%%';
    tokens.push('<code>'+code+'</code>');return marker;
  });
  result=result
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/~~([^~]+)~~/g,'<del>$1</del>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/assets\/[^\s)]+)\)/g,
      (_m,title,href)=>'<a href="'+escapeHtml(href)+'" target="_blank" rel="noopener noreferrer">'+title+'</a>');
  return result.replace(/%%CODE(\d+)%%/g,(_m,n)=>tokens[Number(n)]||'');
}
const tableCells=(line:string)=>line.replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(x=>x.trim().replace(/\\\|/g,'|'));
/** Strict Markdown renderer: content is escaped; only known safe elements are emitted. */
export function renderBlogContent(content:string):string{
  const lines=content.replace(/\r\n?/g,'\n').split('\n');
  const out:string[]=[];let paragraph:string[]=[];let list:string[]=[];let numbered=false;
  let code:string[]|null=null,lang='';
  const flushParagraph=()=>{if(paragraph.length){out.push('<p>'+paragraph.map(inlineMarkdown).join(' ')+'</p>');paragraph=[]}};
  const flushList=()=>{if(list.length){const tag=numbered?'ol':'ul';out.push('<'+tag+'>'+list.map(x=>'<li>'+inlineMarkdown(x)+'</li>').join('')+'</'+tag+'>');list=[];numbered=false}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(code){
      if(/^```\s*$/.test(line)){
        out.push('<pre'+(lang?' data-language="'+escapeHtml(lang)+'"':'')+'><code>'+escapeHtml(code.join('\n'))+'</code></pre>');
        code=null;lang='';
      }else code.push(lines[i]);
      continue;
    }
    const fence=/^```([a-zA-Z0-9+#-]*)\s*$/.exec(line);
    if(fence){flushParagraph();flushList();code=[];lang=fence[1];continue}
    if(!line){flushParagraph();flushList();continue}
    const header=/^(#{1,6})\s+(.+)$/.exec(line);
    if(header){flushParagraph();flushList();out.push('<h'+header[1].length+'>'+inlineMarkdown(header[2])+'</h'+header[1].length+'>');continue}
    const image=/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/assets\/[^\s)]+)\)$/.exec(line);
    if(image){
      flushParagraph();flushList();
      out.push('<figure><img loading="lazy" alt="'+escapeHtml(image[1])+'" src="'+escapeHtml(image[2])+'"/></figure>');
      continue;
    }
    const tableSep=/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test((lines[i+1]||'').trim());
    if(line.includes('|')&&tableSep){
      flushParagraph();flushList();const headings=tableCells(line);
      out.push('<div class="tc-blog-table-wrap"><table><thead><tr>'+headings.map(h=>'<th>'+inlineMarkdown(h)+'</th>').join('')+'</tr></thead><tbody>');
      i++;
      while(i+1<lines.length&&lines[i+1].includes('|')&&lines[i+1].trim()){
        i++;const row=tableCells(lines[i]);
        out.push('<tr>'+headings.map((_,n)=>'<td>'+inlineMarkdown(row[n]||'')+'</td>').join('')+'</tr>');
      }
      out.push('</tbody></table></div>');continue;
    }
    const bullet=/^[-*]\s+(.+)$/.exec(line),ordered=/^\d+\.\s+(.+)$/.exec(line);
    if(bullet||ordered){
      flushParagraph();
      if(list.length&&numbered!==!!ordered)flushList();
      numbered=!!ordered;list.push((bullet||ordered)![1]);continue;
    }
    if(/^>\s?/.test(line)){flushParagraph();flushList();out.push('<blockquote>'+inlineMarkdown(line.replace(/^>\s?/,''))+'</blockquote>');continue}
    if(/^(-{3,}|\*{3,})$/.test(line)){flushParagraph();flushList();out.push('<hr/>');continue}
    flushList();paragraph.push(line);
  }
  flushParagraph();flushList();
  if(code)out.push('<pre'+(lang?' data-language="'+escapeHtml(lang)+'"':'')+'><code>'+escapeHtml(code.join('\n'))+'</code></pre>');
  return out.join('\n');
}
export function archiveCard(post:BlogPost,lang:BlogLocale='tr'){
  const href=blogPath(lang,post.slug),img=safeImage(post.featuredImage);
  return '<div class="card-items list-item box card-visible" data-tc-blog-category="'+escapeHtml(post.category)+'"><div class="card-wrap">'+
    '<a href="'+href+'" aria-label="'+escapeHtml(post.title)+'" class="tc-blog-card-link"></a>'+
    '<div class="bg-imge tc-stories-backdrop"><div class="img tc-stories-img-div"><img src="'+escapeHtml(img)+'" alt="'+escapeHtml(post.imageAlt)+'" loading="lazy" /></div></div>'+
    '<div class="card-body"><div class="title"><p>'+escapeHtml(post.category)+'</p></div><div class="content"><p>'+escapeHtml(post.title)+'</p></div>'+
    '<div class="card-expand"><div class="card-expand-desc">'+escapeHtml(post.excerpt)+'</div><span class="card-expand-cta">'+blogLabel(lang).read+'</span></div></div>'+
    '<p class="theme"><span>'+escapeHtml(post.category)+'</span></p></div></div>';
}
export function homeCard(post:BlogPost,lang:BlogLocale='tr'){
  return '<article class="card-items list-item box card-visible tc-blog__card"><div class="card-wrap">'+
    '<a class="tc-blog__card-link" href="'+blogPath(lang,post.slug)+'" aria-label="'+escapeHtml(post.title)+'">'+
    (post.featuredImage?'<div class="bg-imge"><div class="img"><img loading="lazy" width="800" height="640" alt="'+escapeHtml(post.imageAlt)+'" src="'+escapeHtml(safeImage(post.featuredImage))+'"/></div></div>':'')+
    '<div class="card-body"><div class="title"><p>'+escapeHtml(post.category)+'</p></div><div class="content"><h4>'+escapeHtml(post.title)+'</h4></div>'+
    '<div class="card-expand"><div class="card-expand-desc">'+escapeHtml(post.excerpt)+'</div><span class="card-expand-cta">'+blogLabel(lang).read+'</span></div></div></a></div></article>';
}
export function replaceMarker(body:string,start:string,end:string,replacement:string){
  const begin='<!-- '+start+' -->',finish='<!-- '+end+' -->';
  const a=body.indexOf(begin),b=body.indexOf(finish,a+begin.length);
  if(a<0||b<0)throw new Error('Content marker missing: '+start);
  return body.slice(0,a)+replacement+body.slice(b+finish.length);
}
