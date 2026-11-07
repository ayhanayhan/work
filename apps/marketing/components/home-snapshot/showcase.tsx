import {moduleById,fieldFor,textFor,safeAssetUrl,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
export default function ShowcaseSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'showcase');
 if(!hasLocalizedContent(module,locale))return null;
 const heading=fieldFor(module,'heading',locale),description=fieldFor(module,'description',locale);
 const items=(module?.items||[]).filter(item=>item.enabled!==false&&
  (textFor(item.fields?.heading,locale)||textFor(item.fields?.description,locale)||textFor(item.fields?.role,locale)));
 if(!heading&&!description&&!items.length)return null;
 return <section aria-labelledby="tc-showcase-heading" className="tc-showcase">
  <div className="tc-showcase__header">
   {heading?<h2 className="tc-showcase__heading" id="tc-showcase-heading"><SimpleHtml html={heading}/></h2>:null}
   {description?<p className="tc-showcase__intro"><SimpleHtml html={description}/></p>:null}
  </div>
  {items.length?<div className="tc-showcase__rail">
   <div className="tc-showcase__track" role="region" tabIndex={0} aria-label="Ticarti özellikleri">
    {items.map(item=><article key={item.id} className="tc-showcase__item">
     <div className="tc-showcase__card tc-showcase__card--photo">
      {item.assets?.image?<img className="tc-showcase__image" alt="" loading="lazy" src={safeAssetUrl(item.assets.image,'')}/>:null}
      <div className="tc-showcase__body">
       {textFor(item.fields?.heading,locale)?<h3 className="tc-showcase__name"><SimpleHtml html={textFor(item.fields?.heading,locale)}/></h3>:null}
       {textFor(item.fields?.role,locale)?<p className="tc-showcase__role">{textFor(item.fields?.role,locale)}</p>:null}
      </div>
     </div>
     {textFor(item.fields?.description,locale)?<p className="tc-showcase__description"><SimpleHtml html={textFor(item.fields?.description,locale)}/></p>:null}
    </article>)}
   </div>
  </div>:null}
 </section>;
}
