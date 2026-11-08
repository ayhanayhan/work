import {moduleById,fieldFor,textFor,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
export default function RadarSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'radar');
 if(!hasLocalizedContent(module,locale))return null;
 const heading=fieldFor(module,'heading',locale),description=fieldFor(module,'description',locale);
 const items=(module?.items||[]).filter(item=>item.enabled!==false&&
  (textFor(item.fields?.heading,locale)||textFor(item.fields?.description,locale)));
 if(!heading&&!description&&!items.length)return null;
 return <section className="tc-dashboard-radar">
  <div className="tc-dashboard-radar__inner"><div className="tc-dashboard-radar__left">
   <header className="tc-dashboard-radar__header">
    {heading?<h2 className="tc-dashboard-radar__heading tc-dashboard-radar__reveal"><SimpleHtml html={heading}/></h2>:null}
    {description?<p className="tc-dashboard-radar__subtitle tc-dashboard-radar__reveal"><SimpleHtml html={description}/></p>:null}
   </header>
   {items.length?<div className="tc-dashboard-radar__cards">
    {items.map(item=><article key={item.id} className="tc-dashboard-radar__card tc-dashboard-radar__reveal">
     <div className="tc-dashboard-radar__card-text">
      {textFor(item.fields?.heading,locale)?<h3><SimpleHtml html={textFor(item.fields?.heading,locale)}/></h3>:null}
      {textFor(item.fields?.description,locale)?<p><SimpleHtml html={textFor(item.fields?.description,locale)}/></p>:null}
     </div>
    </article>)}
   </div>:null}
  </div></div>
 </section>;
}
