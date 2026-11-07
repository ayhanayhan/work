import {moduleById,fieldFor,textFor,safeAssetUrl,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';

/** References are exclusively uploaded through Master; no sample people or fake partner logos. */
export default function ReferencesSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'references');
 if(!hasLocalizedContent(module,locale))return null;
 const heading=fieldFor(module,'heading',locale);
 const items=(module?.items||[]).filter(item=>item.enabled!==false&&
   (textFor(item.fields?.heading,locale)||textFor(item.fields?.description,locale))&&Boolean(item.assets?.image));
 if(!heading&&!items.length)return null;
 return <section className="tc-press">
  <div className="tc-press__inner">
   {heading?<p aria-hidden="true" className="tc-press__title tc-press__title--m">
    <span><SimpleHtml html={heading}/></span>
   </p>:null}
   {items.length?<div className="tc-press__left"><div className="tc-press__carousel" data-autoplay="0" data-speed="5">
    <div className="tc-press__viewport"><ul className="tc-press__track" role="list">
     {items.map(item=><li key={item.id} className="tc-press__slide">
      <img className="tc-press__img" loading="lazy"
       src={safeAssetUrl(item.assets?.image,'')} alt={textFor(item.fields?.heading,locale)||''}/>
      {item.assets?.logo?<img className="tc-press__logo" loading="lazy"
       src={safeAssetUrl(item.assets.logo,'')} alt=""/>:null}
      {textFor(item.fields?.heading,locale)?<h3>{textFor(item.fields?.heading,locale)}</h3>:null}
      {textFor(item.fields?.description,locale)?<p>{textFor(item.fields.description,locale)}</p>:null}
     </li>)}
    </ul></div>
   </div></div>:null}
  </div>
 </section>;
}
