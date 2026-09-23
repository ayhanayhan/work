'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api,getCartToken,getCurrency,setCurrency,getLocale,setLocale,STORE,mediaUrl,money} from '../lib/api';

type MenuNode={id?:string;label:string;href:string;children:MenuNode[]};

function Icon({name}:{name:'search'|'user'|'heart'|'compare'|'cart'|'menu'|'close'|'chevron'|'trash'}){
  const paths:any={
    search:<><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
    user:<><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.7-4.1 3.3-6.2 7.5-6.2s6.8 2.1 7.5 6.2"/></>,
    heart:<path d="M12 20.5 4.8 13.7C.7 9.8 2.8 4 7.5 4c2 0 3.4 1 4.5 2.4C13.1 5 14.5 4 16.5 4c4.7 0 6.8 5.8 2.7 9.7L12 20.5Z"/>,
    compare:<><path d="M7 4v16M17 4v16"/><path d="m3.5 7 3.5-3 3.5 3M13.5 17l3.5 3 3.5-3"/></>,
    cart:<><path d="M3 4h2l2.2 10.2h9.7L20 7H6.2"/><circle cx="9" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/></>,
    menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close:<><path d="m6 6 12 12M18 6 6 18"/></>,
    chevron:<path d="m9 6 6 6-6 6"/>,
    trash:<><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/></>
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function menuTree(raw:any[],categories:any[]):MenuNode[]{
  if(!raw.length)return [{label:'Tüm Ürünler',href:'/products',children:categories.slice(0,8).map((x:any)=>({label:x.name,href:'/products?category='+encodeURIComponent(x.slug),children:[]}))},{label:'Yeni Gelenler',href:'/products?sort=newest',children:[]},{label:'Blog',href:'/blog',children:[]}];
  const normalize=(x:any):MenuNode=>({id:String(x.id||''),label:x.label||x.title||x.name||'Menü',href:x.href||x.url||x.path||'/',children:Array.isArray(x.children)?x.children.map(normalize):[]});
  const rows=raw.map(normalize);if(rows.some((x:any)=>x.children.length))return rows;
  const byId=new Map(rows.map(x=>[x.id,x]));const roots:MenuNode[]=[];
  raw.forEach((source:any,i:number)=>{const item=rows[i];const parent=byId.get(String(source.parentId||source.parentItemId||''));if(parent)parent.children.push(item);else roots.push(item)});
  return roots;
}

export default function Header({boot}:{boot:any}){
  const router=useRouter();
  const[count,setCount]=useState(0);const[currency,setCur]=useState(getCurrency());const[locale,setLoc]=useState(getLocale());
  const[searchOpen,setSearchOpen]=useState(false);const[mobileOpen,setMobileOpen]=useState(false);const[cartOpen,setCartOpen]=useState(false);const[q,setQ]=useState('');
  const[results,setResults]=useState<any[]>([]);const[searchBusy,setSearchBusy]=useState(false);const[cart,setCart]=useState<any>(null);const[cartBusy,setCartBusy]=useState(false);
  const store=boot?.store||{};const currencies=store.currencies||[];const locales=store.locales||[];const header=boot?.design?.header||{};const categories=Array.isArray(boot?.categories)?boot.categories:[];
  const coreTheme=String(boot?.theme?.slug||'')==='nova-commerce';
  const menuItems=useMemo(()=>{const menus=Array.isArray(boot?.menus)?boot.menus:[];const menu=menus.find((m:any)=>['header','main','primary'].includes(String(m.handle||'').toLowerCase()))||menus[0];return menuTree(Array.isArray(menu?.items)?menu.items:[],categories)},[boot?.menus,categories]);
  async function sync(){const t=getCartToken();if(!t){setCount(0);setCart(null);return}try{const c=await api('/storefront/carts/'+t);setCart(c);setCount(c.items?.reduce((a:number,x:any)=>a+x.quantity,0)||0);if(c.currency){setCur(c.currency);if(c.currency!==getCurrency())setCurrency(c.currency)}}catch{setCount(0);setCart(null)}}
  useEffect(()=>{setCur(getCurrency());setLoc(getLocale());void sync();const onCart=()=>void sync();window.addEventListener('cart-change',onCart);return()=>window.removeEventListener('cart-change',onCart)},[]);
  useEffect(()=>{if(!searchOpen||q.trim().length<2){setResults([]);setSearchBusy(false);return}setSearchBusy(true);const timer=window.setTimeout(()=>{api(`/storefront/${STORE}/products?q=${encodeURIComponent(q.trim())}&limit=6&currency=${encodeURIComponent(currency)}&locale=${encodeURIComponent(locale)}`).then(x=>setResults(x.items||[])).catch(()=>setResults([])).finally(()=>setSearchBusy(false))},220);return()=>window.clearTimeout(timer)},[q,searchOpen,currency,locale]);
  function changeLocale(code:string){setLoc(code);setLocale(code)}
  async function changeCurrency(code:string){setCur(code);setCurrency(code);const t=getCartToken();if(t){try{await api('/storefront/carts/'+t+'/currency',{method:'PATCH',body:JSON.stringify({currency:code})});window.dispatchEvent(new Event('cart-change'))}catch{}}}
  function submitSearch(e:React.FormEvent){e.preventDefault();const term=q.trim();setSearchOpen(false);router.push(term?'/products?q='+encodeURIComponent(term):'/products')}
  async function updateCart(itemId:string,quantity:number){const token=getCartToken();if(!token||cartBusy)return;setCartBusy(true);try{const next=await api(`/storefront/carts/${token}/items/${itemId}`,{method:'PATCH',body:JSON.stringify({quantity})});setCart(next);setCount(next.items?.reduce((a:number,x:any)=>a+x.quantity,0)||0);window.dispatchEvent(new Event('cart-change'))}finally{setCartBusy(false)}}
  async function openCart(){setCartOpen(true);await sync()}
  const logo=<Link className="logo" href="/" aria-label={store.name||'Anasayfa'}>{store.logoUrl?<img src={store.logoUrl} alt={store.name||'Logo'} decoding="async" fetchPriority="high"/>:<span>{store.name||'Mağaza'}</span>}</Link>;
  const tools=<div className="head-actions">
    {coreTheme&&<form className="core-header-search" onSubmit={submitSearch}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ara" aria-label="Mağazada ara"/><button aria-label="Ara"><Icon name="search"/></button></form>}
    {locales.length>1&&<select aria-label="Dil" value={locale} onChange={e=>changeLocale(e.target.value)}>{locales.map((l:any)=><option key={l.locale} value={l.locale}>{l.label}</option>)}</select>}
    {currencies.length>1&&<select aria-label="Para birimi" value={currency} onChange={e=>void changeCurrency(e.target.value)}>{currencies.map((c:any)=><option key={c.code} value={c.code}>{c.code}</option>)}</select>}
    <button type="button" className="head-icon-btn header-search-trigger" aria-label="Ara" onClick={()=>setSearchOpen(true)}><Icon name="search"/></button>
    <Link className="head-icon-btn" href="/account" aria-label="Hesabım"><Icon name="user"/></Link>
    <Link className="head-icon-btn head-optional-action" href="/account?tab=wishlist" aria-label="Favoriler"><Icon name="heart"/></Link>
    <Link className="head-icon-btn head-optional-action" href="/products?compare=1" aria-label="Karşılaştır"><Icon name="compare"/></Link>
    <button type="button" className="head-icon-btn cart-icon" onClick={()=>void openCart()} aria-label={`Sepet, ${count} ürün`}><Icon name="cart"/>{count>0&&<b>{count}</b>}</button>
    <button type="button" className="head-icon-btn mobile-menu-btn" aria-label="Menü" onClick={()=>setMobileOpen(true)}><Icon name="menu"/></button>
  </div>;
  const nav=<nav className="nav" aria-label="Ana menü">{menuItems.map((x,i)=><div className={'nav-item '+(x.children.length?'has-children':'')} key={x.id||i}><Link href={x.href}>{x.label}{x.children.length>0&&<span className="nav-caret">⌄</span>}</Link>{x.children.length>0&&<div className="mega-menu"><div className="container mega-menu-grid"><div className="mega-menu-title"><small>KOLEKSİYON</small><b>{x.label}</b><Link href={x.href}>Tümünü gör →</Link></div><div className="mega-menu-links">{x.children.map((child,j)=><div key={child.id||j}><Link href={child.href}><b>{child.label}</b></Link>{child.children.map((leaf,k)=><Link href={leaf.href} key={leaf.id||k}>{leaf.label}</Link>)}</div>)}</div><div className="mega-menu-promo"><span>Yeni sezon</span><b>Seçili ürünleri keşfedin</b><Link href={x.href}>Alışverişe başla</Link></div></div></div>}</div>)}</nav>;
  return <>
    {header.topbarEnabled&&<div data-design-target="topbar" data-design-label="Duyuru Barı" className="store-topbar">{header.topbarLink?<Link href={header.topbarLink}>{header.topbarText||'Duyuru'}</Link>:<span>{header.topbarText||'Duyuru'}</span>}</div>}
    <header data-design-target="header" data-design-label="Header" className={`header header-v${header.template||1} ${header.sticky===false?'header-static':''}`}>
      <div className="container head-inner">
        {Number(header.template||1)===4?<><div className="header-market-logo">{logo}</div><form className="header-market-search" onSubmit={submitSearch}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ürün, kategori veya marka ara"/><button aria-label="Ara"><Icon name="search"/></button></form>{tools}<div className="header-market-nav">{nav}</div></>:<>{logo}{nav}{tools}</>}
      </div>
      {Number(header.template||1)===5&&<div className="header-category-strip container">{categories.slice(0,8).map((c:any)=><Link key={c.id} href={'/products?category='+encodeURIComponent(c.slug)}>{c.name}</Link>)}</div>}
    </header>
    {searchOpen&&<div className="store-search-overlay" role="dialog" aria-modal="true" aria-label="Arama"><button className="store-search-close" type="button" aria-label="Kapat" onClick={()=>setSearchOpen(false)}><Icon name="close"/></button><form onSubmit={submitSearch}><label>Mağazada ara</label><div><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Ne aramıştınız?"/><button>ARA</button></div></form>{q.trim().length>1?<div className="predictive-results"><div className="predictive-head"><span>{searchBusy?'Aranıyor…':'Arama sonuçları'}</span>{results.length>0&&<button onClick={()=>{setSearchOpen(false);router.push('/products?q='+encodeURIComponent(q.trim()))}}>Tümünü gör</button>}</div>{results.map((p:any)=><Link onClick={()=>setSearchOpen(false)} href={'/products/'+p.slug} key={p.id}>{p.images?.[0]?.url?<img src={mediaUrl(p.images[0].url,'thumb','webp')} alt=""/>:<i/>}<span><b>{p.title}</b><small>{money(p.variants?.[0]?.price,p.displayCurrency||currency)}</small></span><Icon name="chevron"/></Link>)}</div>:<div className="store-search-suggestions"><span>Popüler kategoriler</span>{categories.slice(0,6).map((c:any)=><Link onClick={()=>setSearchOpen(false)} key={c.id} href={'/products?category='+encodeURIComponent(c.slug)}>{c.name}</Link>)}</div>}</div>}
    <div className={`store-mobile-drawer ${mobileOpen?'open':''}`} aria-hidden={!mobileOpen}><button className="drawer-close" type="button" aria-label="Kapat" onClick={()=>setMobileOpen(false)}><Icon name="close"/></button>{logo}<nav>{menuItems.map((x,i)=><div key={x.id||i}><Link onClick={()=>setMobileOpen(false)} href={x.href}>{x.label}<span>→</span></Link>{x.children.map((child,j)=><Link className="mobile-child" key={child.id||j} onClick={()=>setMobileOpen(false)} href={child.href}>{child.label}</Link>)}</div>)}</nav><div className="drawer-meta"><Link href="/account">Hesabım</Link><button onClick={()=>{setMobileOpen(false);void openCart()}}>Sepet ({count})</button></div></div>
    <aside className={`cart-drawer ${cartOpen?'open':''}`} aria-hidden={!cartOpen}><button className="cart-drawer-close" onClick={()=>setCartOpen(false)} aria-label="Sepeti kapat"><Icon name="close"/></button><div className="cart-drawer-head"><small>SEPETİNİZ</small><h2>{count} ürün</h2></div><div className="cart-drawer-progress"><span style={{width:`${Math.min(100,count*24)}%`}}/><p>{count?`${Math.max(0,4-count)} ürün daha ekleyerek fırsatları keşfedin.`:'Sepetinize ürün ekleyin.'}</p></div><div className="cart-drawer-items">{cart?.items?.length?cart.items.map((item:any)=><article key={item.id}>{item.variant?.product?.images?.[0]?.url?<img src={mediaUrl(item.variant.product.images[0].url,'thumb','webp')} alt=""/>:<i/>}<div><Link onClick={()=>setCartOpen(false)} href={'/products/'+item.variant.product.slug}>{item.variant.product.title}</Link><small>{item.variant.title}</small><div className="cart-drawer-qty"><button disabled={cartBusy} onClick={()=>void updateCart(item.id,item.quantity-1)}>−</button><span>{item.quantity}</span><button disabled={cartBusy} onClick={()=>void updateCart(item.id,item.quantity+1)}>+</button></div></div><strong>{money(Number(item.variant.price)*item.quantity,cart.totals?.currency||currency)}</strong><button className="cart-drawer-remove" disabled={cartBusy} onClick={()=>void updateCart(item.id,0)} aria-label="Ürünü kaldır"><Icon name="trash"/></button></article>):<div className="cart-drawer-empty"><Icon name="cart"/><b>Sepetiniz boş</b><p>Yeni ürünleri keşfetmeye başlayın.</p></div>}</div>{cart?.items?.length>0&&<div className="cart-drawer-foot"><div><span>Ara toplam</span><b>{money(cart.totals?.grandTotal,cart.totals?.currency||currency)}</b></div><Link href="/cart" onClick={()=>setCartOpen(false)} className="btn alt">Sepeti görüntüle</Link><Link href="/checkout" onClick={()=>setCartOpen(false)} className="btn">Ödemeye geç</Link></div>}</aside>
    {(mobileOpen||cartOpen)&&<button className="drawer-backdrop" aria-label="Paneli kapat" onClick={()=>{setMobileOpen(false);setCartOpen(false)}}/>}
  </>;
}
