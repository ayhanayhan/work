import type {ReactNode} from 'react';
import type {BlogPost,BlogLocale} from '@/lib/blog';
import {blogLabel,blogPath,renderBlogContent,safeImage} from '@/lib/blog';
import SiteShell from '@/components/site-shell';
import BlogCards from '@/components/home-snapshot/blog-cards';
import {BlogComments,BlogPhoneCta} from '@/components/blog-post-actions';

const formatDate=(date:string|null,locale:string)=>date?new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',day:'numeric'}).format(new Date(date)):'';

function BlogFrame({children}:{children:ReactNode}){
 return <SiteShell><main className="tc-marketing-blog">{children}</main></SiteShell>;
}
/** Archive and article use native React and the same card, header and footer modules as the homepage. */
export function BlogArchive({posts,locale}:{posts:BlogPost[];locale:BlogLocale}){
 const labels=blogLabel(locale),featured=posts.find(p=>p.isFeatured)||posts[0];
 const categories=[...new Set(posts.map(p=>p.category).filter(Boolean))];
 return <BlogFrame>
   <section className="tc-blog-archive-hero">
     <div className="tc-stories-hero-section">
       <h1>Blog</h1><p className="tc-stories-hero-desc">{labels.blogDescription}</p>
     </div>
   </section>
   {featured?<section className="tc-blog-featured">
     <div className="featured-case-inner">
       <a className="featured-case-image" href={blogPath(locale,featured.slug)}><img loading="eager" alt={featured.imageAlt||featured.title} src={safeImage(featured.featuredImage)}/></a>
       <div className="featured-case-text">
         <p className="tc-blog-kicker">{labels.featured}</p>
         <h2>{featured.title}</h2>
         <p className="featured-desc">{featured.excerpt}</p>
         <a className="btn-featured" href={blogPath(locale,featured.slug)}>{labels.read} →</a>
       </div>
     </div>
   </section>:null}
   <section className="tc-blog-list" id="tc-blog-archive">
     <div className="tc-blog-archive-filters" role="group" aria-label="Blog kategorileri">
       <label><input type="radio" name="tc-blog-category" value="all" defaultChecked/>{labels.filter}</label>
       {categories.map(category=><label key={category}><input type="radio" name="tc-blog-category" value={category}/>{category}</label>)}
     </div>
     <div className="card"><div id="tc-blog-cards" className="card-inner">
       <BlogCards posts={posts} locale={locale}/>
     </div></div>
     {!posts.length?<p className="tc-blog-empty">Bu dilde henüz yayımlanmış blog yazısı bulunmuyor.</p>:null}
   </section>
 </BlogFrame>;
}
function articleWithToc(html:string){
 const headings:{id:string;title:string;level:number}[]=[];
 const used=new Set<string>();
 const marked=html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g,(_match,level:string,inner:string)=>{
  const title=inner.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();
  if(!title)return _match;
  let id=title.toLocaleLowerCase('tr').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(!id)id='section';
  const base=id;let number=2;while(used.has(id))id=base+'-'+number++;
  used.add(id);headings.push({id,title,level:Number(level)});
  return '<h'+level+' id="'+id+'">'+inner+'</h'+level+'>';
 });
 return {html:marked,headings};
}
export function BlogArticle({post,related,allPosts,locale}:{post:BlogPost;related:BlogPost[];allPosts:BlogPost[];locale:BlogLocale}){
 const labels=blogLabel(locale);
 const {html,headings}=articleWithToc(renderBlogContent(post.content));
 const chronological=[...allPosts].sort((a,b)=>Date.parse(b.publishedAt||'')-Date.parse(a.publishedAt||''));
 const index=chronological.findIndex(item=>item.id===post.id);
 const previous=index>=0?chronological[index+1]:undefined;
 const next=index>0?chronological[index-1]:undefined;
 const recent=chronological.filter(item=>item.id!==post.id).slice(0,4);
 const ui:Record<string,{toc:string;recent:string;previous:string;next:string;cta:string}>={
  tr:{toc:'İçindekiler',recent:'Son Yazılar',previous:'Önceki yazı',next:'Sonraki yazı',cta:'Sizi arayalım'},
  en:{toc:'Table of contents',recent:'Recent articles',previous:'Previous article',next:'Next article',cta:'Request a call'},
  de:{toc:'Inhaltsverzeichnis',recent:'Neueste Artikel',previous:'Vorheriger Artikel',next:'Nächster Artikel',cta:'Rückruf anfordern'},
  ru:{toc:'Содержание',recent:'Новые статьи',previous:'Предыдущая статья',next:'Следующая статья',cta:'Заказать звонок'},
  ar:{toc:'المحتويات',recent:'أحدث المقالات',previous:'المقال السابق',next:'المقال التالي',cta:'اطلب اتصالاً'}
 };
 const t=ui[locale]||ui.en;
 return <BlogFrame>
   <section className="tc-post-hero">
     <div className="inner"><div className="section-heading">
       <p className="tc-blog-kicker">{post.category}</p>
       <h1>{post.title}</h1>
       <p className="tc-blog-post-meta">{post.author?.name||post.authorName}{post.publishedAt?' · '+formatDate(post.publishedAt,locale):''}</p>
       {post.excerpt?<div className="content"><p>{post.excerpt}</p></div>:null}
     </div></div>
   </section>
   <div className="tc-blog-single-layout">
     <div className="tc-blog-single-primary">
       <article className="tc-blog-article">
         {post.featuredImage?<img className="tc-blog-article-cover" src={safeImage(post.featuredImage)} alt={post.imageAlt||post.title}/>:null}
         <div className="tc-blog-article-copy" dangerouslySetInnerHTML={{__html:html}}/>
       </article>
       <nav aria-label="Article navigation" className="tc-post-navigation">
         <div>{previous?<a href={blogPath(locale,previous.slug)}><small>← {t.previous}</small><strong>{previous.title}</strong></a>:null}</div>
         <div>{next?<a href={blogPath(locale,next.slug)}><small>{t.next} →</small><strong>{next.title}</strong></a>:null}</div>
       </nav>
       <BlogComments slug={post.slug} locale={locale}/>
     </div>
     <aside className="tc-blog-single-sidebar" aria-label="Blog sidebar">
       <div className="tc-post-toc">
         <h2>{t.toc}</h2>
         {headings.length?<nav aria-label={t.toc}>
           {headings.map(h=><a className={h.level===3?'is-subheading':''} key={h.id} href={'#'+h.id}>{h.title}</a>)}
         </nav>:null}
       </div>
       <BlogPhoneCta slug={post.slug} locale={locale}/>
       <div className="tc-post-recent">
         <h2>{t.recent}</h2>
         {recent.map(item=><a key={item.id} href={blogPath(locale,item.slug)}>
           {item.featuredImage?<img loading="lazy" src={safeImage(item.featuredImage)} alt=""/>:null}
           <span>{item.title}<small>{item.publishedAt?formatDate(item.publishedAt,locale):''}</small></span>
         </a>)}
       </div>
     </aside>
   </div>
 </BlogFrame>;
}
