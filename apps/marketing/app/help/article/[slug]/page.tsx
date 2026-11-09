import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import SiteShell from '@/components/site-shell';
import {HELP_TOPICS,helpArticleBySlug,helpArticleSlug} from '@/lib/help-topics';

type Props={params:Promise<{slug:string}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params,entry=helpArticleBySlug(slug);
 if(!entry)return {robots:{index:false}};
 return {title:entry.article.question+' | Ticarti Yardım Merkezi',
  description:entry.article.answer.slice(0,160),
  alternates:{canonical:'https://ticarti.com/yardim/makale/'+slug},
  robots:{index:false,follow:true}};
}
export default async function HelpArticlePage({params}:Props){
 const {slug}=await params,entry=helpArticleBySlug(slug);
 if(!entry)notFound();
 const {topic,article}=entry;
 return <SiteShell><main className="tc-help tc-help--article">
  <div className="tc-help__container">
   <nav className="tc-help__breadcrumb" aria-label="İçerik yolu">
    <a href="/yardim">Yardım Merkezi</a><span aria-hidden="true">/</span>
    <a href={'/yardim/kategori/'+topic.id}>{topic.title}</a>
   </nav>
   <div className="tc-help__article-layout">
    <aside className="tc-help__article-menu" aria-label="Yardım kategorileri">
     <h2>Yardım konuları</h2>
     <nav>{HELP_TOPICS.map(item=><a key={item.id} href={'/yardim/kategori/'+item.id} aria-current={item.id===topic.id?'page':undefined}>{item.title}</a>)}</nav>
    </aside>
    <article className="tc-help__article-body">
     <p className="tc-help__eyebrow">{topic.title}</p>
     <h1>{article.question}</h1>
     <p>{article.answer}</p>
     <section className="tc-help__related" aria-label="İlgili makaleler">
      <h2>Bu konuda diğer makaleler</h2>
      {topic.questions.filter(q=>q.question!==article.question).map(q=>
       <a href={'/yardim/makale/'+helpArticleSlug(q.question)} key={q.question}>{q.question} <span aria-hidden="true">↗</span></a>)}
     </section>
     <section className="tc-help__article-footnote">
      <h2>Yardıma mı ihtiyacınız var?</h2>
      <p>Mağaza hesabınıza giriş yaparak mevcut Ticarti Destek sistemi üzerinden talep oluşturabilirsiniz.</p>
      <a className="tc-help__cta" href="https://login.ticarti.com/?intent=support">Destek talebi oluştur <span aria-hidden="true">↗</span></a>
     </section>
    </article>
   </div>
  </div>
 </main></SiteShell>;
}
