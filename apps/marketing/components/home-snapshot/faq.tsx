import {moduleById,fieldFor,safePageUrl,textFor,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';

/** Homepage FAQ: only Master CMS entries in the requested language. No demo fallback. */
export default function FaqSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'faq');
 const items=(module?.items||[]).filter(item=>item.enabled!==false&&
   textFor(item.fields?.question,locale)&&textFor(item.fields?.answer,locale));
 if(!hasLocalizedContent(module,locale))return null;
 const heading=fieldFor(module,'heading',locale),description=fieldFor(module,'description',locale);
 const button=fieldFor(module,'button',locale);
 if(!heading&&!description&&!items.length&&!button)return null;
 return <section className="tc-faq" id="tc-faq">
   <div className="tc-faq__inner">
    <div className="tc-faq__intro">
     {heading?<h2 className="tc-faq__title"><SimpleHtml html={heading}/></h2>:null}
     {description?<p className="tc-faq__subtitle"><SimpleHtml html={description}/></p>:null}
     {button?<a className="tc-faq__button" href={safePageUrl(fieldFor(module,'buttonUrl',locale),'/contacto.html')}>{button}</a>:null}
    </div>
    {items.length?<div className="tc-faq__list">
      {items.map((item,i)=><div key={item.id} className={'tc-faq__item'+(i===0?' is-open':'')}>
       <button className="tc-faq__question" id={'tc-faq-head-'+item.id}
        aria-controls={'tc-faq-panel-'+item.id} aria-expanded={i===0} type="button">
        <span className="tc-faq__q-text">{textFor(item.fields?.question,locale)}</span>
        <span aria-hidden="true" className="tc-faq__icon">
         <svg fill="none" height={20} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
          strokeWidth={2} viewBox="0 0 24 24" width={20}><polyline points="6 9 12 15 18 9"/></svg>
        </span>
       </button>
       <div aria-labelledby={'tc-faq-head-'+item.id} className="tc-faq__panel"
        id={'tc-faq-panel-'+item.id} role="region">
        <div className="tc-faq__answer"><p style={{whiteSpace:'pre-line'}}>{textFor(item.fields?.answer,locale)}</p></div>
       </div>
      </div>)}
     </div>:null}
   </div>
 </section>;
}
