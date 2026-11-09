import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import SiteShell from '@/components/site-shell';
import {getHelpTopics,findHelpArticle,articleUrl} from '@/lib/help-cms';

type Props={params:Promise<{slug:string}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params,entry=findHelpArticle(await getHelpTopics(),slug);
 if(!entry)return {robots:{index:false}};
 return {title:entry.article.question+' | Ticarti Yardım Merkezi',
  description:entry.article.answer.slice(0,160),
  alternates:{canonical:'https://help.ticarti.com/makale/'+slug},
  robots:{index:false,follow:true}};
}
export default async function HelpArticlePage({params}:Props){
 const {slug}=await params,entry=findHelpArticle(await getHelpTopics(),slug);
 if(!entry)notFound();
 const {topic,article}=entry;
 const topics=await getHelpTopics();
 return <SiteShell><main className="tc-help tc-help--article">
  <div className="tc-help__container">
   <nav className="tc-help__breadcrumb" aria-label="İçerik yolu">
    <a href="https://help.ticarti.com/">Yardım Merkezi</a><span aria-hidden="true">/</span>
    <a href={'https://help.ticarti.com/kategori/'+(topic.slug||topic.id)}>{topic.title}</a>
   </nav>
   <div className="tc-help__article-layout">
    <aside className="tc-help__article-menu" aria-label="Yardım kategorileri">
     <h2>Yardım konuları</h2>
     <nav>{topics.map(item=><a key={item.id} href={'https://help.ticarti.com/kategori/'+(item.slug||item.id)} aria-current={item.id===topic.id?'page':undefined}>{item.title}</a>)}</nav>
    </aside>
    <article className="tc-help__article-body">
     <p className="tc-help__eyebrow">{topic.title}</p>
     <h1>{article.question}</h1>
     <p style={{whiteSpace:'pre-wrap'}}>{article.answer}</p>
     <section className="tc-help__related" aria-label="İlgili makaleler">
      <h2>Bu konuda diğer makaleler</h2>
      {topic.questions.filter(q=>q.question!==article.question).map(q=>
       <a href={articleUrl(q)} key={q.question}>{q.question} <span aria-hidden="true">↗</span></a>)}
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
