import {moduleById,fieldFor,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
import FooterCallback from './bottomCta-callback';

/** Bottom CTA displays only translated Master content, never sample portraits or copy. */
export default function BottomCtaSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'bottomCta');
 if(!hasLocalizedContent(module,locale))return null;
 const heading=fieldFor(module,'heading',locale);
 const offer=fieldFor(module,'offer',locale);
 if(!heading&&!offer)return null;
 return <section className="tc-bottom-cta">
  <div className="tc-bottom-cta__inner">
   {heading?<h2 className="tc-bottom-cta__heading"><SimpleHtml html={heading}/></h2>:null}
   {offer?<p className="tc-bottom-cta__offer"><SimpleHtml html={offer}/></p>:null}
   {locale==='tr'?<FooterCallback/>:null}
  </div>
 </section>;
}
