import type {ReactNode} from 'react';
import type {BlogPost,BlogLocale} from '@/lib/blog';
import {blogLabel,blogPath,renderBlogContent,safeImage} from '@/lib/blog';
import SiteShell from '@/components/site-shell';
import BlogCards from '@/components/home-snapshot/blog-cards';

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
export function BlogArticle({post,related,locale}:{post:BlogPost;related:BlogPost[];locale:BlogLocale}){
 const labels=blogLabel(locale);
 // renderBlogContent escapes arbitrary markup and only emits the supported CMS subset.
 const html=renderBlogContent(post.content);
 return <BlogFrame>
   <section className="tc-post-hero">
     <div className="inner"><div className="section-heading">
       <p className="tc-blog-kicker">{post.category}</p><h1>{post.title}</h1>
       {post.excerpt?<div className="content"><p>{post.excerpt}</p></div>:null}
       <p className="tc-blog-post-meta">{post.author?.name||post.authorName}{post.publishedAt?' · '+formatDate(post.publishedAt,locale):''}</p>
     </div></div>
   </section>
   <article className="tc-blog-article">
     {post.featuredImage?<img className="tc-blog-article-cover" src={safeImage(post.featuredImage)} alt={post.imageAlt||post.title}/>:null}
     <div className="tc-blog-article-copy" dangerouslySetInnerHTML={{__html:html}}/>
     <a className="tc-blog-back" href={blogPath(locale)}>← {labels.all}</a>
   </article>
   {related.length?<section className="tc-blog-related">
     <div className="tc-blog-related-head"><h2>{labels.related}</h2><a href={blogPath(locale)}>{labels.all} →</a></div>
     <div className="card"><div className="card-inner">
       <BlogCards posts={related} locale={locale}/>
     </div></div>
   </section>:null}
 </BlogFrame>;
}
