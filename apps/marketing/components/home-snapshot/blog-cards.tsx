import type {BlogPost} from '@/lib/blog';
import {blogPath,safeImage} from '@/lib/blog';
export default function BlogCards({posts,locale}:{posts:BlogPost[];locale:string}){
 return <>{posts.map(post=><article key={post.id} className="card-items list-item box card-visible tc-blog__card">
   <div className="card-wrap">
     <a aria-label={post.title} className="tc-blog__card-link" href={blogPath(locale,post.slug)}>
       <div className="bg-imge"><div className="img">
         <img alt={post.imageAlt||post.title} loading="lazy" src={safeImage(post.featuredImage)}/>
       </div></div>
       <div className="card-body">
         <div className="title"><p>{post.category}</p></div>
         <div className="content"><h4>{post.title}</h4></div>
         <div className="card-expand">
           <div className="card-expand-desc">{post.excerpt}</div>
           <span className="card-expand-cta">Yazıyı oku →</span>
         </div>
       </div>
     </a>
   </div>
 </article>)}</>;
}
