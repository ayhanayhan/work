'use client';
import {useMemo,useState} from 'react';
import {HELP_TOPICS,helpArticleSlug} from '@/lib/help-topics';

const copy={
 tr:{eyebrow:'TİCARTİ YARDIM MERKEZİ',title:'Size nasıl yardımcı olabiliriz?',intro:'Mağazanızı yönetirken ihtiyaç duyduğunuz bilgilere ulaşın.',search:'Yardım konusu veya sorun arayın...',topics:'Yardım konuları',empty:'Aramanızla eşleşen bir konu bulunamadı.',support:'Destek talebi oluştur',supportInfo:'Sorun devam ediyorsa mağaza hesabınızla giriş yaparak destek ekibimize ulaşabilirsiniz.',login:'Mağazama giriş yap',contact:'İletişim'},
 en:{eyebrow:'TICARTI HELP CENTER',title:'How can we help?',intro:'Find guidance for managing your Ticarti store.',search:'Search for a help topic or problem...',topics:'Help topics',empty:'No topics matched your search.',support:'Create support request',supportInfo:'If you still need help, sign in with your store account to contact support.',login:'Sign in to my store',contact:'Contact'}
} as const;
export default function HelpCenter({locale='tr'}:{locale?:string}){
 const t=locale==='tr'?copy.tr:copy.en;
 const [query,setQuery]=useState('');
 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase(locale==='tr'?'tr':'en');
  if(!q)return HELP_TOPICS;
  return HELP_TOPICS.filter(topic=>([topic.title,topic.summary,...topic.questions.flatMap(x=>[x.question,x.answer])]).join(' ').toLocaleLowerCase('tr').includes(q));
 },[query,locale]);
 const prefix=locale==='tr'?'':'/'+locale;
 return <main className="tc-help">
  <div className="tc-help__container">
   <header className="tc-help__intro">
    <p className="tc-help__eyebrow">{t.eyebrow}</p>
    <h1>{t.title}</h1>
    <p>{t.intro}</p>
    <label className="tc-help__search">
     <span className="tc-help__sr-only">{t.search}</span>
     <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 5 5"/></svg>
     <input type="search" placeholder={t.search} value={query} onChange={e=>setQuery(e.target.value)}/>
    </label>
   </header>
   <section className="tc-help__topics" aria-label={t.topics}>
    <h2>{t.topics}</h2>
    {filtered.length?<div className="tc-help__grid">{filtered.map(topic=><section key={topic.id} className="tc-help__topic" id={topic.id}>
     <h3><a href={'/yardim/kategori/'+topic.id}>{topic.title}</a></h3><p>{topic.summary}</p>
     <div className="tc-help__questions">{topic.questions.map(item=>
      <a className="tc-help__article-link" href={'/yardim/makale/'+helpArticleSlug(item.question)} key={item.question}>
       <span>{item.question}</span><span aria-hidden="true">↗</span>
      </a>)}</div>
    </section>)}</div>:<p className="tc-help__empty" role="status">{t.empty}</p>}
   </section>
   <section className="tc-help__support">
    <div><h2>{t.support}</h2><p>{t.supportInfo}</p></div>
    <div className="tc-help__actions">
     <a className="tc-help__cta" href="https://login.ticarti.com/?intent=support">{t.support}<span aria-hidden="true">↗</span></a>
     <a className="tc-help__text-link" href={prefix+'/iletisim'}>{t.contact}</a>
    </div>
   </section>
  </div>
 </main>;
}
