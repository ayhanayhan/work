import {moduleById,textFor,safeAssetUrl,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';

/** Feature cards are exclusively driven by saved Master data. */
export default function BuilderSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'builder');
 const items=(module?.items||[]).filter(item=>item.enabled!==false&&
   (textFor(item.fields?.heading,locale)||textFor(item.fields?.description,locale)));
 if(!hasLocalizedContent(module,locale)||!items.length)return null;
 return <section className="tc-builder-section">
  <div className="tc-builder-section__grid">
   {items.map(item=><article key={item.id} className="tc-builder-section__card">
     {item.assets?.image?<span className="tc-builder-section__badge">
       <img src={safeAssetUrl(item.assets.image,'')} alt=""/>
     </span>:null}
     {textFor(item.fields?.heading,locale)?<h3 className="tc-builder-section__title">
       <SimpleHtml html={textFor(item.fields?.heading,locale)}/>
     </h3>:null}
     {textFor(item.fields?.description,locale)?<div className="tc-builder-section__text">
       <SimpleHtml html={textFor(item.fields?.description,locale)}/>
     </div>:null}
   </article>)}
  </div>
 </section>;
}
