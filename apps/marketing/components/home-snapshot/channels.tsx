import {moduleById,fieldFor,textFor,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
export default function ChannelsSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'channels');
 if(!hasLocalizedContent(module,locale))return null;
 const heading=fieldFor(module,'heading',locale),description=fieldFor(module,'description',locale);
 const items=(module?.items||[]).filter(item=>item.enabled!==false&&
  (textFor(item.fields?.description,locale)||textFor(item.fields?.button,locale)));
 if(!heading&&!description&&!items.length)return null;
 return <section aria-label="Ticarti satış kanalları" className="tc-sales-channels">
  {heading?<h2 className="tc-sales-channels__heading tc-sales-channels__reveal"><SimpleHtml html={heading}/></h2>:null}
  {description?<p className="tc-sales-channels__intro tc-sales-channels__reveal"><SimpleHtml html={description}/></p>:null}
  {items.length?<div className="tc-sales-channels__grid">
   {items.map(item=><article key={item.id} className="tc-sales-channels__col">
    {textFor(item.fields?.description,locale)?<p><SimpleHtml html={textFor(item.fields?.description,locale)}/></p>:null}
    {textFor(item.fields?.button,locale)&&item.links?.href?<a href={item.links.href}>{textFor(item.fields.button,locale)}</a>:null}
   </article>)}
  </div>:null}
 </section>;
}
