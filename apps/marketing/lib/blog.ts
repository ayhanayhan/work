import {readFile} from 'node:fs/promises';
import path from 'node:path';

export type BlogPost={slug:string;category:string;title:string;excerpt:string;featuredImage:string;content:string;seoTitle?:string;seoDescription?:string};
type SeedPost={slug:string;category:string;title:string;excerpt:string;cover:string;paragraphs:string[]};
export const escapeHtml=(value:string)=>String(value||'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string,string>)[x]);
export const slugValid=(value:string)=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export const safeImage=(value:string)=>{
  if(/^https:\/\/[a-zA-Z0-9.-]+(?:\/[^\s"'<>]*)?$/.test(value))return value;
  if(/^\/?assets\/[a-zA-Z0-9_./-]+$/.test(value))return '/'+value.replace(/^\//,'');
  if(/^(?:\.\.\/)+assets\/[a-zA-Z0-9_./-]+$/.test(value))return '/'+value.replace(/^(?:\.\.\/)+/,'');
  return '/assets/images/blog/store.svg';
};
export async function getBlogPosts(lang='tr'):Promise<BlogPost[]>{
  const seed=JSON.parse(await readFile(path.join(process.cwd(),'public/assets/data/blog-posts.json'),'utf8')) as {posts:SeedPost[]};
  const fallback=seed.posts.map(p=>({slug:p.slug,category:p.category,title:p.title,excerpt:p.excerpt,featuredImage:`/assets/images/blog/${p.cover}.svg`,content:p.paragraphs.join('\n\n')}));
  const api=(process.env.API_ORIGIN||'').replace(/\/$/,'');
  if(!api)return fallback;
  try{
    const res=await fetch(`${api}/v1/public/website/blog?lang=${encodeURIComponent(lang)}`,{next:{revalidate:60},signal:AbortSignal.timeout(4000)});
    if(!res.ok)throw new Error('Corporate CMS temporarily unavailable');
    const data=await res.json() as {version?:number;posts?:any[]};
    if(!data.version)return fallback;
    return (data.posts||[]).filter(p=>p&&p.status==='PUBLISHED'&&slugValid(String(p.slug))).map(p=>({
      slug:String(p.slug),category:String(p.category||'Blog'),title:String(p.title||''),excerpt:String(p.excerpt||''),
      featuredImage:safeImage(String(p.featuredImage||'')),content:String(p.content||''),seoTitle:String(p.seoTitle||''),seoDescription:String(p.seoDescription||'')
    })).filter(p=>p.title);
  }catch{return fallback;}
}
export function archiveCard(post:BlogPost,prefix=''){ 
  const href=prefix+'/blog/'+encodeURIComponent(post.slug);
  const img=safeImage(post.featuredImage);
  return `<div class="card-items list-item box card-visible" data-tc-blog-category="${escapeHtml(post.category)}"><div class="card-wrap">
    <a href="${href}" aria-label="${escapeHtml(post.title)}" class="tc-blog-card-link"></a>
    <div class="bg-imge tc-stories-backdrop"><div class="img tc-stories-img-div"><img src="${escapeHtml(img)}" alt="${escapeHtml(post.title)}" loading="lazy" /></div></div>
    <div class="card-body"><div class="title"><p>${escapeHtml(post.category)}</p></div><div class="content"><p>${escapeHtml(post.title)}</p></div>
    <div class="card-expand"><div class="card-expand-desc">${escapeHtml(post.excerpt)}</div><span class="card-expand-cta">Yazıyı oku</span></div></div>
    <p class="theme"><span>${escapeHtml(post.category)}</span></p>
  </div></div>`;
}
export function homeCard(post:BlogPost,prefix=''){ 
  const href=prefix+'/blog/'+encodeURIComponent(post.slug);
  return `<article class="card-items list-item box card-visible tc-blog__card"><div class="card-wrap"><a class="tc-blog__card-link" href="${href}" aria-label="${escapeHtml(post.title)}"><div class="bg-imge"><div class="img"><img loading="lazy" width="800" height="640" alt="" src="${escapeHtml(safeImage(post.featuredImage))}"/></div></div><div class="card-body"><div class="title"><p>${escapeHtml(post.category)}</p></div><div class="content"><h4>${escapeHtml(post.title)}</h4></div><div class="card-expand"><div class="card-expand-desc">${escapeHtml(post.excerpt)}</div><span class="card-expand-cta">Yazıyı oku →</span></div></div></a></div></article>`;
}
export function replaceMarker(body:string,start:string,end:string,replacement:string){
  const begin='<!-- '+start+' -->',finish='<!-- '+end+' -->';
  const a=body.indexOf(begin),b=body.indexOf(finish,a+begin.length);
  if(a<0||b<0)throw new Error(`Content marker missing: ${start}`);
  return body.slice(0,a)+replacement+body.slice(b+finish.length);
}
