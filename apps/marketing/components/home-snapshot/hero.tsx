import HeroCallback from './hero-callback';
import {SimpleHtml} from './simple-html';
import HeroCards from './hero-cards';
import HeroLogoGroup from './hero-logo-group';
import {moduleById,fieldFor,textFor,safePageUrl,hasLocalizedContent,type HomeContent} from '@/lib/home-content';

/** Master-only hero. Neither locale changes nor empty records can restore demo cards or logos. */
export default function HeroSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'hero');
 if(!hasLocalizedContent(module,locale))return null;
 const heading=fieldFor(module,'heading',locale);
 const description=fieldFor(module,'description',locale);
 const offer=fieldFor(module,'offer',locale);
 const button=fieldFor(module,'button',locale);
 const items=(module?.items||[]).filter(item=>item.enabled!==false&&
   (textFor(item.fields?.heading,locale)||textFor(item.fields?.description,locale))&&Boolean(item.assets?.image));
 const logos=(module?.logos||[]).filter(item=>item.enabled!==false&&Boolean(item.assets?.image));
 return <section aria-label="Ticarti" className="tc-site-hero is-armed"
   data-kpi-replay="false" data-kpi-stagger="0">
  <div className="tc-site-hero__intro">
   {heading?<h1 className="tc-site-hero__h1"><SimpleHtml html={heading.replace(/\n/g,'<br>')}/></h1>:null}
   {description?<p className="tc-site-hero__sub"><SimpleHtml html={description}/></p>:null}
   {offer?<p className="tc-hero-offer"><SimpleHtml html={offer}/></p>:null}
   {module?.ctaEnabled!==false?<HeroCallback module={module} locale={locale}
     consentHref={safePageUrl(home?.consentContract?.href,'/kvkk.html')}/>:null}
   {button?<div className="tc-site-hero__ctas">
    <a className="tc-site-hero__cta tc-site-hero__cta--1" href={safePageUrl(fieldFor(module,'buttonUrl',locale),'/paketler.html')}>
     <span>{button}</span>
    </a>
   </div>:null}
  </div>
  {items.length?<div className="tc-site-hero__carousel">
   <span aria-hidden="true" className="tc-site-hero__fade tc-site-hero__fade--l"/>
   <span aria-hidden="true" className="tc-site-hero__fade tc-site-hero__fade--r"/>
   <button aria-label="Önceki kart" className="tc-site-hero__arrow tc-site-hero__arrow--prev" data-dir="prev" type="button">←</button>
   <button aria-label="Sonraki kart" className="tc-site-hero__arrow tc-site-hero__arrow--next" data-dir="next" type="button">→</button>
   <div className="tc-site-hero__viewport" id="skViewport"><div className="tc-site-hero__track" id="skTrack">
    <HeroCards items={items} locale={locale}/>
    <HeroCards clone items={items} locale={locale}/>
    <HeroCards clone items={items} locale={locale}/>
   </div></div>
  </div>:null}
  {logos.length?<div className="tc-site-hero__green">
   <div className="tc-ui-logos"><div className="tc-ui-logos__track">
    <HeroLogoGroup logos={logos} locale={locale}/>
   </div></div>
  </div>:null}
 </section>;
}
