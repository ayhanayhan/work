'use client';
import {sfText,currentStorefrontLocale} from '../../lib/i18n';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api,getCartToken,getCurrency,getLocale,setCurrency,setLocale} from '../../lib/api';
import {useStorefrontTheme} from '../../components/StorefrontThemeContext';
import {
  activeThemeLayout,
  boolSetting,
  numSetting,
  stringSetting,
  ThemeLayoutBlock,
} from '../ticarti/config/theme-settings';

type MenuNode={id?:string;label:string;href:string;children:MenuNode[]};
type LayoutType='header'|'footer';

function safeHref(value:any,fallback='/'){
  const raw=String(value||'').trim();
  if(!raw)return fallback;
  if(raw.startsWith('/')||raw.startsWith('#')||raw.startsWith('?'))return raw;
  try{
    const u=new URL(raw);
    return ['http:','https:','mailto:','tel:'].includes(u.protocol)?raw:fallback;
  }catch{return fallback}
}
function normalizeMenuItem(x:any):MenuNode{
  return {
    id:String(x?.id||''),
    label:String(x?.label||x?.title||x?.name||sfText('common.menu',currentStorefrontLocale())),
    href:safeHref(x?.href||x?.url||x?.path||'/'),
    children:Array.isArray(x?.children)?x.children.map(normalizeMenuItem):[],
  };
}
function normalizeLinks(value:any){
  return (Array.isArray(value)?value:[]).map((x:any)=>({
    label:String(x?.label||x?.title||x?.name||'Link'),
    href:safeHref(x?.href||x?.url||'/'),
  }));
}
function buildMenu(raw:any[],categories:any[]):MenuNode[]{
  if(Array.isArray(raw)&&raw.length){
    const rows=raw.map(normalizeMenuItem);
    if(rows.some(x=>x.children.length))return rows;
    const byId=new Map(rows.map(x=>[x.id,x]));
    const roots:MenuNode[]=[];
    raw.forEach((source:any,index:number)=>{
      const row=rows[index];
      const parent=byId.get(String(source?.parentId||source?.parentItemId||''));
      if(parent)parent.children.push(row);else roots.push(row);
    });
    if(roots.length)return roots;
  }
  return (Array.isArray(categories)?categories:[]).slice(0,10).map((c:any)=>({
    label:String(c?.name||c?.title||'Kategori'),
    href:'/products?category='+encodeURIComponent(String(c?.slug||c?.id||'')),
    children:[],
  }));
}
function Icon({name}:{name:'search'|'user'|'heart'|'cart'|'menu'|'close'|'chevron'}){
  const paths:any={
    search:<><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
    user:<><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.7-4.1 3.3-6.2 7.5-6.2s6.8 2.1 7.5 6.2"/></>,
    heart:<path d="M12 20.5 4.8 13.7C.7 9.8 2.8 4 7.5 4c2 0 3.4 1 4.5 2.4C13.1 5 14.5 4 16.5 4c4.7 0 6.8 5.8 2.7 9.7L12 20.5Z"/>,
    cart:<><path d="M3 4h2l2.2 10.2h9.7L20 7H6.2"/><circle cx="9" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/></>,
    menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close:<><path d="m6 6 12 12M18 6 6 18"/></>,
    chevron:<path d="m9 7 5 5-5 5"/>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function HeaderLayout({boot}:{boot:any}){
  const state=useStorefrontTheme();
  const design=state.design||boot?.design||{};
  const layout=activeThemeLayout(design,'header');
  const settings=layout?.settings||{};
  const store=boot?.store||{};
  const menus=Array.isArray(boot?.menus)?boot.menus:[];
  const categories=Array.isArray(boot?.categories)?boot.categories:[];
  const currencies=Array.isArray(store?.currencies)?store.currencies:[];
  const locales=Array.isArray(store?.locales)?store.locales:[];
  const router=useRouter();

  const [cartCount,setCartCount]=useState(0);
  const [searchOpen,setSearchOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [currency,setCur]=useState(getCurrency());
  const [locale,setLoc]=useState(getLocale());

  useEffect(()=>{
    let alive=true;
    async function sync(){
      const token=getCartToken();
      if(!token){if(alive)setCartCount(0);return}
      try{
        const cart=await api('/storefront/carts/'+token);
        if(alive)setCartCount((cart?.items||[]).reduce((sum:number,row:any)=>sum+Number(row?.quantity||0),0));
      }catch{if(alive)setCartCount(0)}
    }
    void sync();
    const handler=()=>void sync();
    window.addEventListener('cart-change',handler);
    return()=>{alive=false;window.removeEventListener('cart-change',handler)}
  },[]);

  // Deliberately no visual fallback:
  // without a header definition in the active theme package, no header is rendered.
  if(!layout)return null;

  const findMenu=(handle:any)=>{
    const wanted=String(handle||settings.menuHandle||'main').toLowerCase();
    const menu=menus.find((m:any)=>String(m?.handle||'').toLowerCase()===wanted)
      ||menus.find((m:any)=>['main','header-main','header','primary','main-menu'].includes(String(m?.handle||'').toLowerCase()))
      ||menus[0];
    return buildMenu(Array.isArray(menu?.items)?menu.items:[],categories);
  };

  const logoUrl=String(settings.logoUrl||store.logoUrl||store.logo||'').trim();
  const logoText=String(settings.logoText||store.name||'Ticarti');
  const logoWidth=numSetting(settings.logoWidth,150,60,320);
  const brand=<Link className="tc-layout-brand" href="/" aria-label={logoText}>
    {logoUrl?<img src={logoUrl} alt={logoText} style={{maxWidth:logoWidth}}/>:<span>{logoText}</span>}
  </Link>;

  function submitSearch(e:React.FormEvent){
    e.preventDefault();
    const q=query.trim();
    if(!q)return;
    setSearchOpen(false);
    router.push('/products?q='+encodeURIComponent(q));
  }
  function renderMenu(block:ThemeLayoutBlock,index:number){
    const s=block.settings||{};
    const items=findMenu(s.menuHandle);
    return <nav className="tc-layout-menu" aria-label={stringSetting(s.ariaLabel,'Ana menü')} key={block.id||`menu-${index}`}>
      <ul>{items.map((item,i)=><li key={`${item.label}-${i}`}>
        <Link href={item.href}>{item.label}{item.children.length>0&&<span className="tc-layout-menu__chevron"><Icon name="chevron"/></span>}</Link>
        {item.children.length>0&&<div className="tc-layout-menu__dropdown">{item.children.map((child,ci)=><Link key={`${child.label}-${ci}`} href={child.href}>{child.label}</Link>)}</div>}
      </li>)}</ul>
    </nav>;
  }
  function renderBlock(block:ThemeLayoutBlock,index:number){
    const s=block.settings||{};
    switch(String(block.type||'')){
      case 'logo': return <div className="tc-layout-logo" key={block.id||index}>{brand}</div>;
      case 'menu': return renderMenu(block,index);
      case 'spacer': return <div className="tc-layout-spacer" key={block.id||index}/>;
      case 'text': return <div className="tc-layout-text" key={block.id||index}>{stringSetting(s.text,'')}</div>;
      case 'search': return boolSetting(s.enabled,true)?<button className="tc-layout-icon" type="button" aria-label="Ara" onClick={()=>setSearchOpen(v=>!v)} key={block.id||index}><Icon name="search"/></button>:null;
      case 'account': return boolSetting(s.enabled,true)?<Link className="tc-layout-icon" href={safeHref(s.href,'/login')} aria-label={sfText('deep.final2.111')} key={block.id||index}><Icon name="user"/></Link>:null;
      case 'wishlist': return boolSetting(s.enabled,true)?<Link className="tc-layout-icon" href={safeHref(s.href,'/wishlist')} aria-label="Favoriler" key={block.id||index}><Icon name="heart"/></Link>:null;
      case 'cart': return boolSetting(s.enabled,true)?<Link className="tc-layout-icon tc-layout-cart" href={safeHref(s.href,'/cart')} aria-label={`Sepet, ${cartCount} ürün`} key={block.id||index}><Icon name="cart"/>{cartCount>0&&<span>{cartCount}</span>}</Link>:null;
      case 'locale': return locales.length>1?<select className="tc-layout-select" aria-label="Dil" value={locale} onChange={e=>{setLoc(e.target.value);setLocale(e.target.value)}} key={block.id||index}>{locales.map((x:any)=><option key={x.locale||x.code} value={x.locale||x.code}>{String(x.label||x.name||x.locale||x.code).toUpperCase()}</option>)}</select>:null;
      case 'currency': return currencies.length>1?<select className="tc-layout-select" aria-label="Para birimi" value={currency} onChange={e=>{setCur(e.target.value);setCurrency(e.target.value)}} key={block.id||index}>{currencies.map((x:any)=><option key={x.code} value={x.code}>{x.code}</option>)}</select>:null;
      case 'mobile-menu': return <button className="tc-layout-icon tc-layout-mobile-toggle" type="button" aria-label={sfText('deep.final2.116')} onClick={()=>setMobileOpen(true)} key={block.id||index}><Icon name="menu"/></button>;
      default:return null;
    }
  }

  const rows=Array.isArray(layout.rows)?layout.rows:[];
  return <header className="tc-theme-header" data-theme-area="header" data-layout-id={layout.id} data-theme-owned-layout="true" data-sticky={boolSetting(settings.sticky,false)?'true':'false'}>
    {settings.announcementEnabled&&settings.announcementText&&<div className="tc-layout-announcement">{String(settings.announcementText)}</div>}
    {rows.map((row:any,rowIndex:number)=><div className={`tc-layout-row ${String(row?.className||'')}`} data-row-id={String(row?.id||rowIndex)} key={row?.id||rowIndex}>
      <div className="tc-layout-container">{(Array.isArray(row?.blocks)?row.blocks:[]).map(renderBlock)}</div>
    </div>)}
    {searchOpen&&<div className="tc-layout-search"><form className="tc-layout-container" onSubmit={submitSearch}><Icon name="search"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder={sfText('deep.final2.154')} aria-label={sfText('deep.final2.155')}/><button type="button" onClick={()=>setSearchOpen(false)} aria-label="Kapat"><Icon name="close"/></button></form></div>}
    {mobileOpen&&<div className="tc-layout-drawer" role="dialog" aria-modal="true"><button className="tc-layout-drawer__backdrop" onClick={()=>setMobileOpen(false)} aria-label="Kapat"/><aside><div className="tc-layout-drawer__head">{brand}<button className="tc-layout-icon" onClick={()=>setMobileOpen(false)} aria-label="Kapat"><Icon name="close"/></button></div>{renderMenu({type:'menu',settings:{menuHandle:settings.menuHandle}},0)}</aside></div>}
  </header>;
}

function FooterLayout({boot}:{boot:any}){
  const state=useStorefrontTheme();
  const design=state.design||boot?.design||{};
  const layout=activeThemeLayout(design,'footer');

  // Deliberately no visual fallback:
  // without a footer definition in the active theme package, no footer is rendered.
  if(!layout)return null;

  const settings=layout.settings||{};
  const store=boot?.store||{};
  const menus=Array.isArray(boot?.menus)?boot.menus:[];
  const categories=Array.isArray(boot?.categories)?boot.categories:[];
  const year=new Date().getFullYear();

  const menuLinks=(handle:any)=>{
    const wanted=String(handle||settings.menuHandle||'footer-main').toLowerCase();
    const menu=menus.find((m:any)=>String(m?.handle||'').toLowerCase()===wanted);
    const links=normalizeLinks(menu?.items);
    if(links.length)return links;
    return categories.slice(0,8).map((c:any)=>({
      label:String(c?.name||c?.title||'Kategori'),
      href:'/products?category='+encodeURIComponent(String(c?.slug||c?.id||'')),
    }));
  };

  const logoUrl=String(settings.logoUrl||store.logoUrl||store.logo||'').trim();
  const brandText=String(settings.logoText||store.name||'Ticarti');
  const description=String(settings.description||store.description||'');
  const social=normalizeLinks(settings.socialLinks);

  function renderLinks(title:string,items:any[],key:any){
    if(!items.length)return null;
    return <div className="tc-footer-block tc-footer-links" key={key}>{title&&<h3>{title}</h3>}<nav>{items.map((x:any,i:number)=><Link href={x.href} key={`${x.label}-${i}`}>{x.label}</Link>)}</nav></div>;
  }
  function renderBlock(block:ThemeLayoutBlock,index:number){
    const s=block.settings||{};
    switch(String(block.type||'')){
      case 'brand': return <div className="tc-footer-block tc-footer-brand" key={block.id||index}><Link href="/" className="tc-footer-logo">{logoUrl?<img src={logoUrl} alt={brandText}/>:<span>{brandText}</span>}</Link>{boolSetting(s.showDescription,true)&&description&&<p>{description}</p>}</div>;
      case 'menu': return renderLinks(stringSetting(s.title,sfText('common.menu',currentStorefrontLocale())),menuLinks(s.menuHandle),block.id||index);
      case 'links': return renderLinks(stringSetting(s.title,'Bilgi'),normalizeLinks(s.items),block.id||index);
      case 'social': return boolSetting(s.enabled,true)?renderLinks(stringSetting(s.title,'Sosyal'),social,block.id||index):null;
      case 'newsletter': return boolSetting(s.enabled,true)?<div className="tc-footer-block tc-footer-newsletter" key={block.id||index}><h3>{stringSetting(s.title,'Bültene katıl')}</h3>{s.subtitle&&<p>{String(s.subtitle)}</p>}<form onSubmit={e=>e.preventDefault()}><input type="email" placeholder={stringSetting(s.placeholder,'E-posta adresiniz')} aria-label="E-posta"/><button type="submit">{stringSetting(s.buttonLabel,'Katıl')}</button></form></div>:null;
      case 'payments': return boolSetting(s.enabled,true)?<div className="tc-footer-block tc-footer-payments" key={block.id||index}>{Array.isArray(s.items)?s.items.join(' · '):'Visa · Mastercard · Troy'}</div>:null;
      case 'copyright': return <div className="tc-footer-block tc-footer-copyright" key={block.id||index}>{String(s.text||`© ${year} ${brandText}. Tüm hakları saklıdır.`).replace('{year}',String(year)).replace('{store}',brandText)}</div>;
      case 'spacer': return <div className="tc-layout-spacer" key={block.id||index}/>;
      default:return null;
    }
  }

  const rows=Array.isArray(layout.rows)?layout.rows:[];
  return <footer className="tc-theme-footer" data-theme-area="footer" data-layout-id={layout.id} data-theme-owned-layout="true">
    {rows.map((row:any,rowIndex:number)=><div className={`tc-footer-row ${String(row?.className||'')}`} data-row-id={String(row?.id||rowIndex)} key={row?.id||rowIndex}>
      <div className="tc-layout-container">{(Array.isArray(row?.blocks)?row.blocks:[]).map(renderBlock)}</div>
    </div>)}
  </footer>;
}

export default function ThemeLayoutRenderer({type,boot}:{type:LayoutType;boot:any}){
  return type==='header'?<HeaderLayout boot={boot}/>:<FooterLayout boot={boot}/>;
}
