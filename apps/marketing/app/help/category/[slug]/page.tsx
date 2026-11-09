import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import SiteShell from '@/components/site-shell';
import {HELP_TOPICS,helpArticleSlug} from '@/lib/help-topics';

type Props={params:Promise<{slug:string}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params,topic=HELP_TOPICS.find(t=>t.id===slug);
 if(!topic)return {robots:{index:false}};
 return {title:topic.title+' | Ticarti Yardım Merkezi',description:topic.summary,
  alternates:{canonical:'https://help.ticarti.com/kategori/'+slug},
  robots:{index:false,follow:true}};
}
export default async function HelpCategoryPage({params}:Props){
 const {slug}=await params,topic=HELP_TOPICS.find(t=>t.id===slug);
 if(!topic)notFound();
 return <SiteShell><main className="tc-help tc-help--article">
  <div className="tc-help__container">
   <nav className="tc-help__breadcrumb" aria-label="İçerik yolu"><a href="https://help.ticarti.com/">Yardım Merkezi</a><span aria-hidden="true">/</span><span>{topic.title}</span></nav>
   <header className="tc-help__category-intro"><h1>{topic.title}</h1><p>{topic.summary}</p></header>
   <section className="tc-help__category-list" aria-label="Makaleler">
    {topic.questions.map(item=><a key={item.question} href={'https://help.ticarti.com/makale/'+helpArticleSlug(item.question)}>
     <span>{item.question}</span><span aria-hidden="true">↗</span>
    </a>)}
   </section>
   <div className="tc-help__article-footnote"><p>Aradığınız yanıtı bulamadınız mı?</p>
    <a className="tc-help__cta" href="https://login.ticarti.com/?intent=support">Mağaza desteğine ulaşın <span aria-hidden="true">↗</span></a>
   </div>
  </div>
 </main></SiteShell>;
}
