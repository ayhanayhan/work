import {moduleById,fieldFor,textFor,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';

/** Animated heading: show only saved text for the selected language. */
export default function AnimatedHeadingSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'animated');
 if(!hasLocalizedContent(module,locale))return null;
 const heading=fieldFor(module,'heading',locale);
 const description=fieldFor(module,'description',locale);
 const items=(module?.items||[]).filter(item=>item.enabled!==false&&textFor(item.fields?.heading,locale));
 if(!heading&&!description&&!items.length)return null;
 return <section className="tc-animated-heading is-type-ready is-reveal-ready">
  <div className="tc-animated-heading__inner">
   {description?<div className="tc-animated-heading__eyebrow hrt-reveal">
     <span className="tc-animated-heading__eyebrow-inner"><SimpleHtml html={description}/></span>
   </div>:null}
   <h2 className="tc-animated-heading__title hrt-reveal">
    <span className="tc-animated-heading__sr">{heading}</span>
    <span aria-hidden="true" className="tc-animated-heading__roller">
     <span className="tc-animated-heading__stack">
      {items.map((item,i)=><span key={item.id} className={'tc-animated-heading__item'+(i===0?' is-active':'')}>
       <SimpleHtml html={textFor(item.fields?.heading,locale)}/>
      </span>)}
     </span>
    </span>
    <i aria-hidden="true" className="tc-animated-heading__caret tc-animated-heading__caret--inline"/>
   </h2>
  </div>
 </section>;
}
