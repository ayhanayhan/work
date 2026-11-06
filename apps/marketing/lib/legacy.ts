import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {notFound} from 'next/navigation';
import {archiveCard,escapeHtml,getBlogPosts,homeCard,replaceMarker,safeImage,slugValid} from './blog';
import {applyPageValues,pageValues} from './page-content';

export type PageData={html:string;classes:string;title:string;description:string;scripts:string[];isBlogList:boolean};
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
const supportedLocales=new Set(['tr','en','pt','ru']);
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
  const lang=segments.length&&supportedLocales.has(segments[0])?segments[0]:'tr';
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
  const data=extract(raw!);
  const posts= isBlog||isHome ? await getBlogPosts(lang) : [];
  const linkRoot=lang==='tr'?'':('/'+lang);
  if(isBlogList){
    data.isBlogList=true;
    const categories=['Tümü',...new Set(posts.map(p=>p.category))];
    data.html=replaceMarker(data.html,'TICARTI_BLOG_FILTERS_START','TICARTI_BLOG_FILTERS_END',categories.map((name,i)=>{
      const id='tc-blog-category-'+i;
      return `<li><input type="radio" name="tc-blog-category" id="${id}" value="${escapeHtml(name)}" ${i===0?'checked':''}/><label for="${id}">${escapeHtml(name)}</label></li>`;
    }).join(''));
    data.html=replaceMarker(data.html,'TICARTI_BLOG_CARDS_START','TICARTI_BLOG_CARDS_END',posts.map(p=>archiveCard(p,linkRoot)).join(''));
    if(posts.length){const first=posts[0];
      data.html=data.html.replace(/(<div class="featured-case-text"[^>]*>[\s\S]*?<h2>)[^<]*(<\/h2>)/,`$1${escapeHtml(first.title)}$2`);
      data.html=data.html.replace(/<div class="featured-desc">[\s\S]*?<\/div>/,`<div class="featured-desc">${escapeHtml(first.excerpt)}</div>`);
      data.html=data.html.replace(/<img([^>]*?)src="\/assets\/images\/blog\/[^\"]+"([^>]*?)>/,`<img alt="${escapeHtml(first.title)}" loading="lazy" src="${escapeHtml(safeImage(first.featuredImage))}"/>`);
      data.html=data.html.replace(/class="tc-blog-featured-link" href="[^"]*"/,`class="tc-blog-featured-link" href="${linkRoot}/blog/${encodeURIComponent(first.slug)}"`);
    }
    if(!posts.length){
      data.html=data.html.replace('class="featured-case"','class="featured-case" hidden');
      data.html=data.html.replace('<div class="card-inner list box" id="tc-blog-cards">','<div class="card-inner list box" id="tc-blog-cards"><p>Henüz yayınlanmış blog yazısı yok.</p>');
    }
    data.title='Blog | Ticarti';
  }else if(isBlog){
    const post=posts.find(p=>p.slug===postSlug);
    if(!post)notFound();
    data.title=post.seoTitle||post.title+' | Ticarti Blog';data.description=post.seoDescription||post.excerpt;
    data.html=data.html.replace('<!-- TICARTI_POST_TITLE -->',escapeHtml(post.title))
      .replace('<!-- TICARTI_POST_SUMMARY -->',escapeHtml(post.excerpt))
      .replace('<!-- TICARTI_POST_CATEGORY -->',escapeHtml(post.category))
      .replace('/assets/images/blog/store.svg',escapeHtml(safeImage(post.featuredImage)));
    const paragraphs=post.content.split(/\n\s*\n/).filter(Boolean).map(x=>`<p>${escapeHtml(x)}</p>`).join('');
    data.html=data.html.replace('<!-- TICARTI_POST_CONTENT -->',paragraphs);
    data.html=replaceMarker(data.html,'TICARTI_BLOG_RELATED_START','TICARTI_BLOG_RELATED_END',posts.filter(x=>x.slug!==post.slug).slice(0,3).map(p=>archiveCard(p,linkRoot)).join(''));
  }
  if(isHome){
    // Keep the exact original header, layout, animations and FAQ; only swap blog content.
    if(posts.length){
      const open=data.html.indexOf('<div aria-label="Blog yazıları" class="card-inner tc-blog__track"');
      if(open>=0){
        const contentStart=data.html.indexOf('>',open)+1;
        const nextSection=data.html.indexOf('</section>',contentStart);
        const articleEnd=data.html.lastIndexOf('</article>',nextSection);
        const end=data.html.indexOf('</div>',articleEnd);
        if(end>=0)data.html=data.html.slice(0,contentStart)+posts.slice(0,8).map(p=>homeCard(p,linkRoot)).join('')+data.html.slice(end);
      }
    }
    // The original CMS binder remains available for homepage modules, not for blog posts.
    data.scripts.push('/assets/js/pages/website-home-cms.js');
  }
  const id=pageKey(source);
  if(id){const values=await pageValues(id,lang);if(Object.keys(values).length)data.html=applyPageValues(data.html,values,id);}
  return data;
}
