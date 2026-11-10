'use client';
import {useState} from 'react';
type FAQ={enabled:boolean;heading:string;description:string;items:{id:string;question:string;answer:string}[]};
export default function PricingFaq({faq}:{faq:FAQ}){
 const[opened,setOpened]=useState<string[]>(faq.items.length?[faq.items[0].id]:[]);
 return <section className="tc-faq" id="tc-faq"><div className="tc-faq__inner">
   <div className="tc-faq__intro"><h2 className="tc-faq__title">{faq.heading||'Sıkça sorulan sorular'}</h2>
    <p className="tc-faq__subtitle">{faq.description}</p><a className="tc-faq__button" href="/iletisim">Ekibimizle iletişime geç</a></div>
   <div className="tc-faq__list">{faq.items.map((item,i)=>{
    const open=opened.includes(item.id),id='tc-faq-'+i;
    return <div className={'tc-faq__item'+(open?' is-open':'')} key={item.id}>
     <button type="button" className="tc-faq__question" id={id+'-heading'} aria-controls={id+'-panel'} aria-expanded={open}
      onClick={()=>setOpened(prev=>open?prev.filter(x=>x!==item.id):[...prev,item.id])}>
      <span className="tc-faq__q-text">{item.question}</span><span aria-hidden="true" className="tc-faq__icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span></button>
     <div className="tc-faq__panel" id={id+'-panel'} aria-labelledby={id+'-heading'} role="region" hidden={!open}><div className="tc-faq__answer"><p>{item.answer}</p></div></div>
    </div>})}</div>
  </div></section>;
}
