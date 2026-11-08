import {moduleById,fieldFor,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
import {blogPath,type BlogPost} from '@/lib/blog';
import BlogCards from './blog-cards';
import {SimpleHtml} from './simple-html';
/* Static React snapshot of original Ticarti homepage: blog.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function BlogSection({home,locale='tr',posts=[]}:{home?:HomeContent|null;locale?:string;posts?:BlogPost[]}){
 const module=moduleById(home,'blog');
 if(!hasLocalizedContent(module,locale)||!posts.length)return null;
  return (
    <section aria-labelledby={"tc-blog-title"} className={"tc-article-carousel tc-blog"} id={"tc-blog"}>
      {"\n"}
      <div className={"tc-blog__inner"}>
        {"\n"}
        <div className={"tc-blog__top"}>
          {"\n"}
          <div className={"tc-blog__heading"}>
            {"\n"}
            <h2 id={"tc-blog-title"} data-tc-content-key={"h2-158"}>
              {fieldFor(module,'heading',locale)?<SimpleHtml html={fieldFor(module,'heading',locale)}/>:null}
            </h2>
            {"\n"}
            <p data-tc-content-key={"p-159"}>
              {fieldFor(module,'description',locale)?<SimpleHtml html={fieldFor(module,'description',locale)}/>:null}
            </p>
            {"\n"}
          </div>
          {"\n"}
          <div className={"tc-blog__actions"}>
            {"\n"}
            <a className={"tc-blog__all"} href={blogPath(locale)} data-tc-content-key={"a-160"}>
              {"Tüm yazılar →"}
            </a>
            {"\n"}
            <div aria-label={"Blog yazılarını kaydır"} className={"tc-blog__controls"}>
              {"\n"}
              <button aria-label={"Önceki yazı"} className={"tc-blog__arrow"} data-tc-blog-prev={""} type={"button"} data-tc-content-key={"button-161"}>
                {"←"}
              </button>
              {"\n"}
              <button aria-label={"Sonraki yazı"} className={"tc-blog__arrow"} data-tc-blog-next={""} type={"button"} data-tc-content-key={"button-162"}>
                {"→"}
              </button>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
        <div className={"cards-main"}>
          <div className={"card"}>
            <div aria-label={"Blog yazıları"} className={"card-inner tc-blog__track"} role={"region"} tabIndex={0}>{posts.length?<BlogCards posts={posts} locale={locale}/>:null}
            </div>
          </div>
        </div>
        {"\n"}
      </div>
      {"\n"}
    </section>
  );
}
