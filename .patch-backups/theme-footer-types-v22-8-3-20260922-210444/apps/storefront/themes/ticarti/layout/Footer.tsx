'use client';
import Link from 'next/link';
import {resolveTicartiSkin} from '../config/skin-registry';

type LinkItem=[string,string];
const defaultInfoLinks:LinkItem[]=[['About','/pages/about'],['Our Blog','/blog'],['Shipping & Returns','/pages/shipping-returns'],['Payment','/pages/payment'],['Warranty','/pages/warranty'],['Location','/pages/location'],['Contacts','/pages/contacts-us']];
const defaultSocialLinks:LinkItem[]=[['Facebook','#'],['Instagram','#'],['Pinterest','#']];
function normalizeLinks(value:any):LinkItem[]{return (Array.isArray(value)?value:[]).map((x:any)=>(Array.isArray(x)?[String(x[0]||'Link'),String(x[1]||'/')]:[String(x.label||x.title||'Link'),String(x.href||x.url||'/')]) as LinkItem)}
function LinkColumn({title,items,id}:{title:string;items:LinkItem[];id:string}){return <div id={id} className="footer__block-item"><div className="footer__block-heading link-list__block-heading footer__accordion__heading"><h2 className="h5 mt0 mb0">{title}</h2><div className="plusminus"/></div><div className="footer__accordion__content"><div className="link-list__block-item"><ul className="unstyle-ul">{items.map(([label,href])=><li key={`${label}:${href}`}><Link className="font-inherit footer-link__item link link-hover-span link__base-to_accent-color link--medium" href={href}><h3>{label}</h3></Link></li>)}</ul></div></div></div>}

export default function Footer({boot}:{boot:any}){
  const store=boot?.store||{};const design=boot?.design||{};const footer=design.footer||{};const skin=resolveTicartiSkin(design);
  const categories:LinkItem[]=(Array.isArray(boot?.categories)?boot.categories:[]).slice(0,8).map((c:any)=>[String(c.name||c.title||'Collection'),'/products?category='+encodeURIComponent(String(c.slug||c.id||''))]);
  const menus=Array.isArray(boot?.menus)?boot.menus:[];const footerMenu=menus.find((m:any)=>String(m.handle||'').toLowerCase()===String(footer.menuHandle||'footer-main').toLowerCase());const footerMenuLinks:LinkItem[]=Array.isArray(footerMenu?.items)?footerMenu.items.map((x:any)=>[String(x.label||x.title||'Link'),String(x.url||x.href||'/')]):[];
  const storeLinks=normalizeLinks(footer.storeLinks).length?normalizeLinks(footer.storeLinks):(footerMenuLinks.length?footerMenuLinks:(categories.length?categories:[['Shop','/products'],['New','/products?sort=newest'],['Blog','/blog']]));
  const infoLinks=normalizeLinks(footer.infoLinks).length?normalizeLinks(footer.infoLinks):defaultInfoLinks;
  const socialLinks=normalizeLinks(footer.socialLinks).length?normalizeLinks(footer.socialLinks):defaultSocialLinks;
  const newsletterTitle=String(footer.newsletterTitle||'Stay in the loop');
  const newsletterSub=String(footer.newsletterSubtitle||'Newsletter');
  const footerId=String(footer.sourceId||`theme-section-${skin.slug}-footer`);const newsletterId=String(footer.newsletterSourceId||`theme-section-${skin.slug}-newsletter`);
  const contactTitle=String(footer.contactTitle||'Contacts');const contactPhone=String(footer.contactPhone||store.phone||'T: 555-555-1000');const contactText=String(footer.contactText||store.address||'Open daily from 9:00 AM – 7:00 PM');
  const sectionClass=`section-${footerId.replace(/^theme-section-/,'').replace(/[^a-zA-Z0-9_-]/g,'-')}`;
  return <>
  {footer.newsletterEnabled!==false&&<section id={newsletterId} className="top-spacing-normal section-background section-background--medium" data-section-name="newsletter-signup" style={{'--color-section-background':footer.newsletterBackground||undefined} as any}><div className="page-width"><div className="page-grid-1 section-heading-container text-left"><div className="section-heading-elements"><p className="mt0 h5 subheading">{newsletterSub}</p><h2 className="mt0 section-heading-text">{newsletterTitle}</h2></div></div><form className="newsletter-form mt20" onSubmit={e=>e.preventDefault()}><div className="field field-with-icon"><input className="field__input" placeholder="Email" aria-label="Email" type="email"/><button className="field__icon" aria-label="Subscribe">→</button></div></form><div className="rte body3 mt15"><p>By clicking the button you agree to the <Link href="/pages/privacy">Privacy Policy</Link> and <Link href="/pages/terms">Terms and Conditions</Link>.</p></div></div></section>}
  <footer id={footerId} className={`footer top-spacing-none ${sectionClass} section-background section-background--medium`} data-section-name="wokiee-footer" data-theme-skin={skin.slug} style={{'--color-section-background':footer.backgroundColor||footer.color_background||undefined} as any}>
    <div className="page-width background__page-padding0"><div className="background__horizontal-line footer__horizontal-line--hide-mobile page_width"/></div>
    <div className="page-width footer-blocks__content"><div className="page-grid-sp-1 page-grid-st-4 page-grid-md-2 page-grid-4 footer__block__items page-vertical-gap-40 footer__accordion">
      <LinkColumn id="theme-block-store-links" title={String(footer.storeColumnTitle||'Store')} items={storeLinks}/>
      <LinkColumn id="theme-block-info-links" title={String(footer.infoColumnTitle||'Information')} items={infoLinks}/>
      <LinkColumn id="theme-block-social-links" title={String(footer.socialColumnTitle||'Social')} items={socialLinks}/>
      <div id="theme-block-contact" className="footer__block-item"><div className="footer__block-heading footer__accordion__heading"><h2 className="h5 mt0 mb0">{contactTitle}</h2><div className="plusminus"/></div><div className="footer__accordion__content"><div className="rte body3 mt10"><h4>{contactPhone}</h4></div><div className="rte body3 mt10"><p>{contactText}</p></div></div></div>
    </div></div>
    <div className="page-width"><div className="footer__content-bottom footer__content-bottom--space-between"><div className="footer__content-bottom--left"><div className="footer__copyright body3"><span className="copyright__content">{String(footer.copyright||'© {{year}} {{store_name}}. Tüm hakları saklıdır.').replace(/\{\{year\}\}/g,String(new Date().getFullYear())).replace(/\{\{store_name\}\}/g,String(store.name||'Ticarti'))}</span></div></div><div className="footer__content-bottom--right"><div className="footer__payment"><ul className="unstyle-ul list-payment" role="list"><li className="list-payment__item">VISA</li><li className="list-payment__item">MC</li><li className="list-payment__item">AMEX</li></ul></div></div></div></div>
  </footer>
</>}
