import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {notFound} from 'next/navigation';
import {archiveCard,BlogLocale,BlogPost,blogLabel,blogPath,escapeHtml,getBlogPosts,getWebsiteLocales,homeCard,renderBlogContent,replaceMarker,safeImage,slugValid} from './blog';
import {applyPageValues,pageValues} from './page-content';
import {applyHomepageFaq,FaqContent,getHomepageFaq} from './faq';
import {applyPricingFeed,getPricingFeed,type PricingFeed} from './pricing';

export type PageData={html:string;classes:string;title:string;description:string;scripts:string[];isBlogList:boolean;post?:BlogPost;posts?:BlogPost[];locale?:BlogLocale;isHome?:boolean;faq?:FaqContent;pricing?:PricingFeed|null};
function extract(html:string):PageData{
  const body=html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if(!body)throw new Error('Source page missing body');
  const classes=html.match(/<html\b[^>]*class="([^"]*)"/i)?.[1]||'';
  const title=html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'Ticarti';
  const description=html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"/i)?.[1]||'Ticarti ile e-ticaret siteni oluştur.';
  const scripts:string[]=[];
  const raw=body.replace(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/gi,(_tag,src:string)=>{
    const normalized=src.replace(/^(?:\.\.\/)+assets\//,'/assets/').replace(/^assets\//,'/assets/').replace(/\?.*$/,'');
    if(normalized.startsWith('/assets/js/'))scripts.push(normalized);
    return '';
  });
  const markup=raw.replace(/(?:\.\.\/)+assets\//g,'/assets/').replace(/(?<![\w/])assets\//g,'/assets/');
  return {html:markup,classes,title:title.replace(/<[^>]+>/g,''),description,scripts,isBlogList:false};
}

/** Hide links to missing translations and prevent the footer from leading to a 404. */
function hideUnpublishedBlogLinks(html:string,posts:BlogPost[],locale:BlogLocale){
  const listing=blogPath(locale);
  const known=new Set(posts.map(p=>blogPath(locale,p.slug)));
  return html.replace(/<li\b[^>]*>\s*<a\b[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*<\/li>/gi,(whole,href:string)=>{
    const pathname=href.split(/[?#]/)[0];
    if(pathname===listing&&!posts.length)return '';
    if(pathname.startsWith(listing+'/')&&!known.has(pathname))return '';
    return whole;
  });
}


/** Preserve original HTML and CSS while fixing template-era relative navigation. */
function normalizeLegacyLinks(html:string,source:string,locale:BlogLocale){
  const prefix=locale==='tr'?'':'/'+locale;
  return html.replace(/\bhref="([^"]+)"/gi,(whole,url:string)=>{
    if(/^(https?:|mailto:|tel:|#|javascript:|data:)/i.test(url))return whole;
    const parts=url.match(/^([^?#]*)([?#].*)?$/);if(!parts||!parts[1])return whole;
    const raw=parts[1],suffix=parts[2]||'';
    if(raw.includes('/assets/'))return whole;
    let target=raw.startsWith('/')?raw.replace(/^\/+/,''):path.posix.normalize(path.posix.join(path.posix.dirname(source),raw));
    if(target.startsWith('tr/')||target.startsWith('pt/')||target.startsWith('ru/'))target=target.slice(3);
    if(!target.startsWith('en/')&&target.startsWith('blog/'))target='en/'+target;
    if(!target.startsWith('en/'))return whole;
    const relative=target.slice(3);
    let dest:string|null=null;
    if(relative==='blog'||relative==='blog/index.html')dest=prefix+'/blog';
    else if(/^blog\/[a-z0-9-]+(?:\.html)?$/.test(relative))dest=prefix+'/blog/'+relative.slice(5).replace(/\.html$/,'');
    else if(relative==='index.html')dest=prefix+'/';
    else if(relative==='success-stories/index.html')dest=prefix+'/success-stories/';
    else if(/^(?:paketler|contacto|login|register|kvkk|gizlilik-politikasi|uyelik-sozlesmesi|companies\/enterprise|success-stories\/crowdy)\.html$/.test(relative))dest=prefix+'/'+relative;
    return dest===null?whole:'href="'+dest+suffix+'"';
  });
}

function staticPath(segments:string[]):string{
  const parts=segments.length?[...segments]:['en'];
  if(parts[0]!=='en')parts.unshift('en');
  if(parts.some(p=>p==='..'||p==='.'||!/^[-a-zA-Z0-9_.]+$/.test(p)))notFound();
  if(parts.length===1)return 'en/index.html';
  const route=parts.join('/');
  const named=new Set(['en/paketler','en/contacto','en/login','en/register','en/kvkk','en/gizlilik-politikasi','en/uyelik-sozlesmesi','en/companies/enterprise','en/success-stories/crowdy']);
  if(named.has(route))return route+'.html';
  if(route==='en/success-stories')return route+'/index.html';
  const last=parts.at(-1)!;
  return last.endsWith('.html')?route:route+'/index.html';
}
function pageKey(source:string):string{
  const map:Record<string,string>={'en/index.html':'home','en/paketler.html':'pricing','en/contacto.html':'contact','en/login.html':'login','en/register.html':'register','en/kvkk.html':'kvkk','en/gizlilik-politikasi.html':'privacy','en/uyelik-sozlesmesi.html':'terms','en/success-stories/index.html':'success-stories','en/success-stories/crowdy.html':'success-story','en/companies/enterprise.html':'enterprise','en/blog/index.html':'blog','en/blog/post.html':'blog-post'};
  return map[source]||'';
}
export async function renderPage(segments:string[],search:Record<string,string|undefined>={}):Promise<PageData>{
  const supportedLocales=new Set(await getWebsiteLocales());
  const lang:BlogLocale=segments.length&&supportedLocales.has(segments[0])?segments[0] as BlogLocale:'tr';
  const route=['en',...(segments.length&&supportedLocales.has(segments[0])?segments.slice(1):segments)];
  const isHome=route.join('/')==='en'||route.join('/')==='en/index.html';
  const isBlog=route[0]==='en'&&route[1]==='blog';
  const isBlogList=isBlog&&(route.length===2||route[2]==='index.html');
  let source=staticPath(route);
  let postSlug='';
  if(isBlog){
    if(isBlogList)source='en/blog/index.html';
    else{source='en/blog/post.html';postSlug=String(route[2]||'').replace(/\.html$/,'');if(postSlug==='post'&&search.slug)postSlug=search.slug;}
  }
  if(isBlog&&!isBlogList&&!slugValid(postSlug))notFound();
  let raw:string;
  try{raw=await readFile(path.join(process.cwd(),'templates',source),'utf8')}
  catch{notFound();}
  const data=extract(raw!);data.locale=lang;data.isHome=isHome;
  const posts=await getBlogPosts(lang);
  if(isBlog&&!isBlogList&&!posts.length)notFound();
  if(isBlogList)data.posts=posts;
  if(isBlogList){
    data.isBlogList=true;
    const categories=[blogLabel(lang).filter,...new Set(posts.map(p=>p.category))];
    data.html=replaceMarker(data.html,'TICARTI_BLOG_FILTERS_START','TICARTI_BLOG_FILTERS_END',categories.map((name,i)=>{
      const id='tc-blog-category-'+i;
      return `<li><input type="radio" name="tc-blog-category" id="${id}" value="${i===0?'all':escapeHtml(name)}" ${i===0?'checked':''}/><label for="${id}">${escapeHtml(name)}</label></li>`;
    }).join(''));
    data.html=replaceMarker(data.html,'TICARTI_BLOG_CARDS_START','TICARTI_BLOG_CARDS_END',posts.map(p=>archiveCard(p,lang)).join(''));
    if(posts.length){const first=posts[0];
      data.html=data.html.replace(/(<div class="featured-case-text"[^>]*>[\s\S]*?<h2>)[^<]*(<\/h2>)/,`$1${escapeHtml(first.title)}$2`);
      data.html=data.html.replace(/<div class="featured-desc">[\s\S]*?<\/div>/,`<div class="featured-desc">${escapeHtml(first.excerpt)}</div>`);
      data.html=data.html.replace(/<img([^>]*?)src="\/assets\/images\/blog\/[^\"]+"([^>]*?)>/,`<img alt="${escapeHtml(first.title)}" loading="lazy" src="${escapeHtml(safeImage(first.featuredImage))}"/>`);
      data.html=data.html.replace(/class="tc-blog-featured-link" href="[^"]*"/,`class="tc-blog-featured-link" href="${blogPath(lang,first.slug)}"`);
    }
    data.html=data.html.replace('ÖNE ÇIKAN YAZI',blogLabel(lang).featured).replace('Yazıyı oku</a>',blogLabel(lang).read+'</a>');
    data.title='Blog | Ticarti';data.description=blogLabel(lang).blogDescription;
  }else if(isBlog){
    const post=posts.find(p=>p.slug===postSlug);
    if(!post)notFound();data.post=post;
    data.title=post.seoTitle||post.title+' | Ticarti Blog';data.description=post.seoDescription||post.excerpt;
    data.html=data.html.replace('<!-- TICARTI_POST_TITLE -->',escapeHtml(post.title))
      .replace('<!-- TICARTI_POST_SUMMARY -->',escapeHtml(post.excerpt))
      .replace('<!-- TICARTI_POST_CATEGORY -->',escapeHtml(post.category))
      .replace('/assets/images/blog/store.svg',escapeHtml(safeImage(post.featuredImage)));
    const paragraphs=renderBlogContent(post.content);
    data.html=data.html.replace('<!-- TICARTI_POST_CONTENT -->',paragraphs);
    const relatedIds=post.relatedPostIds||[];
    const available=posts.filter(x=>x.slug!==post.slug);
    const related=relatedIds.length?[...relatedIds.map(id=>available.find(x=>x.id===id)).filter((x):x is BlogPost=>!!x),...available.filter(x=>!relatedIds.includes(x.id))].slice(0,3):available.slice(0,3);
    data.html=replaceMarker(data.html,'TICARTI_BLOG_RELATED_START','TICARTI_BLOG_RELATED_END',related.map(p=>archiveCard(p,lang)).join(''));
    data.html=data.html.replace('Diğer yazılar',blogLabel(lang).related).replace('Tüm blog yazıları',blogLabel(lang).all).replace('Tüm yazılar',blogLabel(lang).all);
  }
  if(isHome){
    // Keep the exact original header, layout, animations and FAQ; only swap blog content.
    if(!posts.length){
      data.html=data.html.replace(/<section\b(?=[^>]*\bid="tc-blog")[^>]*>[\s\S]*?<\/section>/i,'');
    }else{
      const open=data.html.indexOf('<div aria-label="Blog yazıları" class="card-inner tc-blog__track"');
      if(open>=0){
        const contentStart=data.html.indexOf('>',open)+1;
        const nextSection=data.html.indexOf('</section>',contentStart);
        const articleEnd=data.html.lastIndexOf('</article>',nextSection);
        const end=data.html.indexOf('</div>',articleEnd);
        if(end>=0)data.html=data.html.slice(0,contentStart)+posts.slice(0,8).map(p=>homeCard(p,lang)).join('')+data.html.slice(end);
      }
    }
    if(posts.length){
      data.html=data.html.replace('href="blog/index.html"','href="'+blogPath(lang)+'"');
      data.html=data.html.replace('Tüm yazılar →',blogLabel(lang).all+' →');
    }
    // FAQ visible markup and SEO structured data are built from this same locale-specific CMS snapshot.
    data.faq=await getHomepageFaq(lang);
    // Other homepage modules still use the existing integration.
    // Homepage text is no longer patched by any client-side CMS script.
  }
  // Pricing is rendered on the server from Master rather than static HTML demo prices.
  if(source==='en/paketler.html'){data.pricing=await getPricingFeed(lang);data.html=applyPricingFeed(data.html,data.pricing);}
  const id=pageKey(source);
  if(id){const values=await pageValues(id,lang);if(Object.keys(values).length)data.html=applyPageValues(data.html,values,id);}
  data.html=hideUnpublishedBlogLinks(normalizeLegacyLinks(data.html,source,lang),posts,lang);
  if(isHome&&data.faq){
    data.html=applyHomepageFaq(data.html,data.faq);
    // Do not advertise FAQ structured data if the live HTML template did not accept the content.
    if(data.faq.items.length&&!data.html.includes('data-tc-ssr-faq="1"'))
      data.faq={...data.faq,items:[]};
  }
  return data;
}
