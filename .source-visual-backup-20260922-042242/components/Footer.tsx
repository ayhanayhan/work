'use client';
import Link from 'next/link';
import {useState,type ReactNode} from 'react';

function FooterGroup({title,children,initial=false}:{title:string;children:ReactNode;initial?:boolean}){
  const[open,setOpen]=useState(initial);
  return <div className="footer__block-item"><button type="button" className={`footer__block-heading link-list__block-heading footer__accordion__heading ${open?'footer__accordion-opening':''}`} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><h2 className="h5 mt0 mb0">{title}</h2><span className="plusminus" aria-hidden="true"/></button><div className="footer__accordion__content" style={open?{'--scroll-height':'640px'} as any:undefined}>{children}</div></div>;
}

export default function Footer({boot}:{boot:any}){
  const store=boot?.store||{};const menus=Array.isArray(boot?.menus)?boot.menus:[];const design=boot?.design?.footer||{};
  const footerMenus=menus.filter((m:any)=>['footer','footer-1','footer-2','secondary'].includes(String(m.handle||'').toLowerCase())).slice(0,3);
  const year=new Date().getFullYear();const dark=design.backgroundColor||'#000000';const line=design.lineColor||'#444444';const text=design.textColor||'#ffffff';
  const social=store?.settings?.social||{};
  const fallback=[{title:'Mağaza',items:[{label:'Tüm Ürünler',href:'/products'},{label:'Blog',href:'/blog'},{label:'Hesabım',href:'/account'}]},{title:'Yardım',items:[{label:'Gizlilik',href:'/legal/privacy'},{label:'Koşullar',href:'/legal/terms'},{label:'İletişim',href:'/pages/contact'}]}];
  const groups=footerMenus.length?footerMenus.map((m:any)=>({title:m.title||m.name||'Bağlantılar',items:(m.items||[]).slice(0,10).map((x:any)=>({label:x.label||x.title||x.name,href:x.href||x.url||x.path||'/'}))})):fallback;
  return <>
    {design.showBenefits!==false&&<section className="section-background top-spacing-normal" style={{'--color-section-background':'#ffffff'} as any}><div className="page-width"><div className="page-grid-st-3 page-grid-3 page-vertical-gap-40 signature-footer-benefits"><div><b className="h5">Ücretsiz Kargo</b><p className="body2">Belirlediğiniz tutarın üzerindeki siparişlerde avantajlı teslimat.</p></div><div><b className="h5">Kolay İade</b><p className="body2">İade ve değişim sürecini mağaza politikanıza göre yönetin.</p></div><div><b className="h5">Güvenli Ödeme</b><p className="body2">Ödeme bilgileri güvenli ödeme altyapısı üzerinden işlenir.</p></div></div></div></section>}
    {design.showNewsletter!==false&&<section className="section-background section-background--medium signature-footer-newsletter" style={{'--color-section-background':dark,'--color-base-section':text,'--color-accent-section':text,'--color-lines':line} as any}><div className="page-width display-flex justify-content-between align-items-center signature-footer-newsletter__inner"><div><div className="body3">Bültene Katıl</div><h2 className="h3 mt3 mb0">Yeni ürünleri ve fırsatları kaçırmayın</h2></div><form className="field field-with-icon signature-footer-newsletter__form" onSubmit={e=>e.preventDefault()}><input className="field__input" type="email" placeholder="E-posta adresiniz" aria-label="E-posta"/><button className="field__icon" aria-label="Kaydol">→</button></form></div></section>}
    <footer className="footer section-background section-background--medium" style={{'--color-section-background':dark,'--color-base-section':text,'--color-accent-section':design.accentColor||text,'--color-lines':line} as any}>
      <div className="background__horizontal-line"/>
      <div className="page-width footer-blocks__content">
        <div className="page-grid-sp-1 page-grid-st-2 page-grid-md-2 page-grid-4 footer__block__items page-vertical-gap-40 footer__accordion">
          <div className="footer__block-item footer-accordion-opened-item-index"><div className="social__block-container">{store.logoUrl?<Link href="/" className="footer__link footer__link__logo clear-underline"><img className="footer-logo" src={store.logoUrl} alt={store.name||'Logo'} style={{maxWidth:Number(design.logoMaxWidth||130)}}/></Link>:<Link href="/" className="footer__link footer__link__logo clear-underline"><span className="h5">{store.name||'MAĞAZA'}</span></Link>}<div className="body2 mt20"><p>{store.description||'Modern ve güvenli alışveriş deneyimi.'}</p>{store.phone&&<p><a className="link link-hover-span link__base-to_accent-color" href={'tel:'+store.phone}>{store.phone}</a></p>}{store.email&&<p><a className="link link-hover-span link__base-to_accent-color" href={'mailto:'+store.email}>{store.email}</a></p>}{store.addressText&&<p>{store.addressText}</p>}</div>{Object.values(social).some(Boolean)&&<div className="signature-social__icons display-flex mt20">{Object.entries(social).filter(([,v])=>Boolean(v)).slice(0,6).map(([k,v]:any)=><a key={k} className="link body3" href={String(v)} target="_blank" rel="noreferrer">{k}</a>)}</div>}</div></div>
          {groups.map((g:any,i:number)=><FooterGroup key={i} title={g.title}><div className="link-list__block-item"><ul className="unstyle-ul">{g.items.map((x:any,j:number)=><li key={j}><Link className="font-inherit footer-link__item link link-hover-span link__base-to_accent-color link--medium" href={x.href}><span>{x.label}</span></Link></li>)}</ul></div></FooterGroup>)}
        </div>
      </div>
      <div className="background__horizontal-line"/>
      <div className="page-width"><div className="footer__content-bottom"><div className="footer__content-bottom--left"><div className="footer__copyright body3"><span>© {year} {store.name||'Mağaza'}</span></div><div className="footer__separate-line footer__separate-line__hide_mobile"/><ul className="policies unstyle-ul"><li><Link className="link link-hover-span link__base-to_accent-color body3" href="/legal/privacy"><span>Gizlilik</span></Link></li><li><Link className="link link-hover-span link__base-to_accent-color body3" href="/legal/terms"><span>Koşullar</span></Link></li></ul></div><div className="footer__content-bottom--right"><ul className="unstyle-ul list-payment" role="list"><li>VISA</li><li>MC</li><li>AMEX</li></ul></div></div></div>
    </footer>
  </>;
}
