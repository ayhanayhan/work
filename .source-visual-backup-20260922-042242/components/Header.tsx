'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api,getCartToken,getCurrency,setCurrency,getLocale,setLocale,STORE,mediaUrl,money} from '../lib/api';

type MenuNode={id?:string;label:string;href:string;children:MenuNode[]};
const A='/signature-assets/';
function Icon({name}:{name:string}){return <img className="theme-icon" width="20" height="20" src={`${A}${name}.svg`} alt="" aria-hidden="true"/>}
function menuTree(raw:any[],categories:any[]):MenuNode[]{
  if(!raw.length)return [{label:'Tüm Ürünler',href:'/products',children:categories.slice(0,8).map((x:any)=>({label:x.name,href:'/products?category='+encodeURIComponent(x.slug),children:[]}))},{label:'Yeni Gelenler',href:'/products?sort=newest',children:[]},{label:'Blog',href:'/blog',children:[]}];
  const normalize=(x:any):MenuNode=>({id:String(x.id||''),label:x.label||x.title||x.name||'Menü',href:x.href||x.url||x.path||'/',children:Array.isArray(x.children)?x.children.map(normalize):[]});
  const rows=raw.map(normalize);if(rows.some((x:any)=>x.children.length))return rows;const byId=new Map(rows.map(x=>[x.id,x]));const roots:MenuNode[]=[];
  raw.forEach((source:any,i:number)=>{const item=rows[i];const parent=byId.get(String(source.parentId||source.parentItemId||''));if(parent)parent.children.push(item);else roots.push(item)});return roots;
}
export default function Header({boot}:{boot:any}){
  const router=useRouter();const[count,setCount]=useState(0);const[currency,setCur]=useState(getCurrency());const[locale,setLoc]=useState(getLocale());
  const[searchOpen,setSearchOpen]=useState(false);const[mobileOpen,setMobileOpen]=useState(false);const[cartOpen,setCartOpen]=useState(false);const[q,setQ]=useState('');const[results,setResults]=useState<any[]>([]);const[searchBusy,setSearchBusy]=useState(false);const[cart,setCart]=useState<any>(null);const[cartBusy,setCartBusy]=useState(false);
  const store=boot?.store||{};const currencies=store.currencies||[];const locales=store.locales||[];const header=boot?.design?.header||{};const categories=Array.isArray(boot?.categories)?boot.categories:[];
  const menuItems=useMemo(()=>{const menus=Array.isArray(boot?.menus)?boot.menus:[];const menu=menus.find((m:any)=>['header','main','primary'].includes(String(m.handle||'').toLowerCase()))||menus[0];return menuTree(Array.isArray(menu?.items)?menu.items:[],categories)},[boot?.menus,categories]);
  async function sync(){const t=getCartToken();if(!t){setCount(0);setCart(null);return}try{const c=await api('/storefront/carts/'+t);setCart(c);setCount(c.items?.reduce((a:number,x:any)=>a+x.quantity,0)||0);if(c.currency){setCur(c.currency);if(c.currency!==getCurrency())setCurrency(c.currency)}}catch{setCount(0);setCart(null)}}
  useEffect(()=>{setCur(getCurrency());setLoc(getLocale());void sync();const onCart=()=>void sync();window.addEventListener('cart-change',onCart);return()=>window.removeEventListener('cart-change',onCart)},[]);
  useEffect(()=>{if(!searchOpen||q.trim().length<2){setResults([]);setSearchBusy(false);return}setSearchBusy(true);const timer=window.setTimeout(()=>{api(`/storefront/${STORE}/products?q=${encodeURIComponent(q.trim())}&limit=6&currency=${encodeURIComponent(currency)}&locale=${encodeURIComponent(locale)}`).then(x=>setResults(x.items||[])).catch(()=>setResults([])).finally(()=>setSearchBusy(false))},220);return()=>window.clearTimeout(timer)},[q,searchOpen,currency,locale]);
  function changeLocale(code:string){setLoc(code);setLocale(code)}
  async function changeCurrency(code:string){setCur(code);setCurrency(code);const t=getCartToken();if(t){try{await api('/storefront/carts/'+t+'/currency',{method:'PATCH',body:JSON.stringify({currency:code})});window.dispatchEvent(new Event('cart-change'))}catch{}}}
  function submitSearch(e:React.FormEvent){e.preventDefault();const term=q.trim();setSearchOpen(false);router.push(term?'/products?q='+encodeURIComponent(term):'/products')}
  async function updateCart(itemId:string,quantity:number){const token=getCartToken();if(!token||cartBusy)return;setCartBusy(true);try{const next=await api(`/storefront/carts/${token}/items/${itemId}`,{method:'PATCH',body:JSON.stringify({quantity})});setCart(next);setCount(next.items?.reduce((a:number,x:any)=>a+x.quantity,0)||0);window.dispatchEvent(new Event('cart-change'))}finally{setCartBusy(false)}}
  async function openCart(){setCartOpen(true);await sync()}
  return <>
    {header.topbarEnabled&&<div className="header__top-bar section-background"><div className="page-width header__top-bar__content body3"><div>{header.topbarLink?<Link className="link link-hover-span" href={header.topbarLink}>{header.topbarText||'Duyuru'}</Link>:<span>{header.topbarText||'Duyuru'}</span>}</div></div></div>}
    <div className="section-header">
      <header className={`header__main ${header.sticky===false?'':'sticky-header'} ${header.logoPosition||'logo-to-left'} header-template-${header.template||1}`}>
        <div className="header__desktop hide-sp hide-st">
          <div className="page-width display-flex align-items-center">
            <div className="header__heading"><Link className="header__heading-link clear-underline" href="/" aria-label={store.name||'Anasayfa'}>{store.logoUrl?<img className="header__heading-logo" src={store.logoUrl} alt={store.name||'Logo'} style={{maxWidth:Number(header.logoMaxWidth||130)}}/>:<span className="h5">{store.name||'MAĞAZA'}</span>}</Link></div>
            <nav className={`list-menu list-menu--classic ${header.menuPosition||'top-menu-to-left'}`} aria-label="Ana menü"><ul className="unstyle-ul list-menu--inline">{menuItems.map((x,i)=><li className="list-menu--hover" key={x.id||i}><Link className="body2 list-menu__item strong" href={x.href}>{x.label}{x.children.length>0&&<span aria-hidden="true">⌄</span>}</Link>{x.children.length>0&&<div className="submenu--megamenu submenu-container submenu--to-left"><div className="page-width page-grid-4">{x.children.map((child,j)=><div key={child.id||j} className="mt-first-0"><Link className="h6 clear-underline animation-underline" href={child.href}>{child.label}</Link>{child.children.length>0&&<ul className="unstyle-ul mt10">{child.children.map((leaf,k)=><li key={leaf.id||k}><Link className="body2 link link-hover-span" href={leaf.href}>{leaf.label}</Link></li>)}</ul>}</div>)}</div></div>}</li>)}</ul></nav>
            <div className="header__icons header__icons--text display-flex align-items-center">
              {locales.length>1&&<select className="disclosure-selector body3" aria-label="Dil" value={locale} onChange={e=>changeLocale(e.target.value)}>{locales.map((l:any)=><option key={l.locale} value={l.locale}>{l.label}</option>)}</select>}
              {currencies.length>1&&<select className="disclosure-selector body3" aria-label="Para birimi" value={currency} onChange={e=>void changeCurrency(e.target.value)}>{currencies.map((c:any)=><option key={c.code} value={c.code}>{c.code}</option>)}</select>}
              <button className="header__button body2" type="button" aria-label="Ara" onClick={()=>setSearchOpen(true)}><Icon name="icon-search"/></button>
              <Link className="header__button body2" href="/account" aria-label="Hesabım"><Icon name="icon-account"/></Link>
              <Link className="header__button body2" href="/account?tab=wishlist" aria-label="Favoriler"><Icon name="icon-heart"/></Link>
              <button className="header__button header__button__bubble body2" type="button" aria-label={`Sepet, ${count} ürün`} onClick={()=>void openCart()}><Icon name="icon-cart"/><span className="header__button__bubble__count">{count}</span></button>
            </div>
          </div>
        </div>
        <div className="header__mobile hide-lg">
          <div className="page-width header__mobile__grid display-flex align-items-center justify-content-between">
            <button className="menu-drawer__button header__button" type="button" aria-label="Menü" onClick={()=>setMobileOpen(true)}><Icon name="icon-hamburger"/></button>
            <div className="header__heading"><Link className="header__heading-link clear-underline" href="/" aria-label={store.name||'Anasayfa'}>{store.logoUrl?<img className="header__heading-logo" src={store.logoUrl} alt={store.name||'Logo'} style={{maxWidth:Number(header.logoMaxWidthMobile||100)}}/>:<span className="h5">{store.name||'MAĞAZA'}</span>}</Link></div>
            <div className="header__icons display-flex align-items-center"><button className="header__button" type="button" aria-label="Ara" onClick={()=>setSearchOpen(true)}><Icon name="icon-search"/></button><button className="header__button header__button__bubble" type="button" aria-label={`Sepet, ${count} ürün`} onClick={()=>void openCart()}><Icon name="icon-cart"/><span className="header__button__bubble__count">{count}</span></button></div>
          </div>
        </div>
        {header.showBottomLine&&<div className="header__separate-line"/>}
      </header>
    </div>

    {searchOpen&&<div className="popup-modal popup-modal__right active" role="dialog" aria-modal="true"><button className="popup-modal__overlay" aria-label="Aramayı kapat" onClick={()=>setSearchOpen(false)}/><div className="popup-modal__content popup-modal__content__f-height"><button className="popup-modal__toggle modal-close-animation" onClick={()=>setSearchOpen(false)}><Icon name="icon-close"/></button><div className="popup-modal__content__data custom__scrollbar"><div className="page-width mt40"><form className="search field field-with-icon" onSubmit={submitSearch}><input autoFocus className="field__input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Ara"/><button className="field__icon" aria-label="Ara"><Icon name="icon-search"/></button></form>{q.trim().length>1&&<div className="predictive-search predictive-search--search-template mt30"><p className="predictive-search__heading body2">{searchBusy?'Aranıyor…':'Ürünler'}</p><ul className="predictive-search__results-list unstyle-ul">{results.map((p:any)=><li className="predictive-search__list-item" key={p.id}><Link onClick={()=>setSearchOpen(false)} href={'/products/'+p.slug} className="predictive-search__item predictive-search__item__product predictive-search__item--link image-hover-box__container">{p.images?.[0]?.url&&<div className="image-hover-box image-hover-box__small-radius"><img className="predictive-search__image" src={mediaUrl(p.images[0].url,'thumb','webp')} alt=""/></div>}<div className="predictive-search__item-content body2"><div className="predictive-search__item-vendor body3">{p.brand?.name||''}</div><p className="predictive-search__item-heading body2 mt3">{p.title}</p><div className="price">{money(p.variants?.[0]?.price,p.displayCurrency||currency)}</div></div></Link></li>)}</ul><button className="link link-hover-span body2" onClick={()=>{setSearchOpen(false);router.push('/products?q='+encodeURIComponent(q.trim()))}}>Tüm sonuçları gör →</button></div>}</div></div></div></div>}

    {mobileOpen&&<div className="popup-modal popup-modal__left active"><button className="popup-modal__overlay" aria-label="Menüyü kapat" onClick={()=>setMobileOpen(false)}/><div className="popup-modal__content popup-modal__content__f-height menu-drawer"><button className="popup-modal__toggle" onClick={()=>setMobileOpen(false)}><Icon name="icon-close"/></button><div className="popup-modal__content__data custom__scrollbar"><div className="page-width mt30"><div className="header__heading"><Link className="header__heading-link clear-underline" href="/" onClick={()=>setMobileOpen(false)}>{store.logoUrl?<img className="header__heading-logo" src={store.logoUrl} alt={store.name||'Logo'}/>:<span className="h5">{store.name||'MAĞAZA'}</span>}</Link></div><ul className="unstyle-ul list-menu mt30">{menuItems.map((x,i)=><li key={x.id||i}><Link className="body2 list-menu__item strong" href={x.href} onClick={()=>setMobileOpen(false)}>{x.label}</Link>{x.children.length>0&&<ul className="unstyle-ul ml20">{x.children.map((c,j)=><li key={c.id||j}><Link className="body2 list-menu__item" href={c.href} onClick={()=>setMobileOpen(false)}>{c.label}</Link></li>)}</ul>}</li>)}</ul></div></div></div></div>}

    {cartOpen&&<div className="popup-modal popup-modal__right cart-drawer-container active">
      <button className="popup-modal__overlay" aria-label="Sepeti kapat" onClick={()=>setCartOpen(false)}/>
      <div id="CartDrawer" className={`cart-drawer popup-modal__content popup-modal__content__f-height ${!cart?.items?.length?'is-empty':''}`}>
        <button className="popup-modal__toggle modal-close-animation" onClick={()=>setCartOpen(false)}><Icon name="icon-close"/></button>
        <div className="drawer__inner popup-modal__content__data custom__scrollbar">
          <div className="drawer__footer-content">
            <h4 className="drawer__heading mt0 mb0">Sepetiniz</h4>
            <div className="free-delivery-bar"><div className="free-delivery-bar__end" style={{width:`${Math.min(100,count*25)}%`}}/></div>
            <div className="drawer__contents js-contents">
              {cart?.items?.length?<div className="drawer__cart-items-wrapper">{cart.items.map((item:any)=><div className="drawer__cart-item" key={item.id}>
                <div className="drawer__cart-item__content">
                  {item.variant?.product?.images?.[0]?.url&&<div className="drawer__cart-item__media image-hover01"><Link className="image-hover-box__container" href={'/products/'+item.variant.product.slug} onClick={()=>setCartOpen(false)}><div className="image-hover-box image-hover-box__small-radius"><img src={mediaUrl(item.variant.product.images[0].url,'thumb','webp')} alt=""/></div></Link></div>}
                  <div className="drawer__cart-item__details">
                    <div className="drawer__cart-item__details__items body3 mt--first-child-0"><Link className="mt10 h6 cart-item__heading animation-underline" href={'/products/'+item.variant.product.slug} onClick={()=>setCartOpen(false)}>{item.variant.product.title}</Link><div className="mt3">{item.variant.title}</div>
                      <div className="cart-item__quantity mt20"><div className="field quantity"><button className="quantity__button" disabled={cartBusy} onClick={()=>void updateCart(item.id,item.quantity-1)}><Icon name="icon-minus"/></button><input className="field__input quantity__input" value={item.quantity} readOnly/><button className="quantity__button" disabled={cartBusy} onClick={()=>void updateCart(item.id,item.quantity+1)}><Icon name="icon-plus"/></button></div></div>
                    </div>
                    <div className="cart-item__totals mt20"><span className="h5 price__main">{money(Number(item.variant.price)*item.quantity,cart.totals?.currency||currency)}</span><button className="cart-item__remove-button transition-up" disabled={cartBusy} onClick={()=>void updateCart(item.id,0)}><Icon name="icon-remove"/></button></div>
                  </div>
                </div>
              </div>)}</div>:<div className="drawer__inner-empty"><div className="cart__warnings text-center"><div className="cart__warnings__icon"><Icon name="icon-cart"/></div><h4 className="mb0">Sepetiniz boş</h4><Link onClick={()=>setCartOpen(false)} href="/products" className="mt40 btn btn__transition-text w-full">Alışverişe devam et</Link></div></div>}
            </div>
            {cart?.items?.length>0&&<div className="drawer__footer mt30"><div className="display-flex justify-content-between"><span>Ara toplam</span><strong>{money(cart.totals?.grandTotal,cart.totals?.currency||currency)}</strong></div><Link href="/cart" onClick={()=>setCartOpen(false)} className="mt20 btn btn--border w-full">Sepeti görüntüle</Link><Link href="/checkout" onClick={()=>setCartOpen(false)} className="mt10 btn w-full">Ödemeye geç</Link></div>}
          </div>
        </div>
      </div>
    </div>}
  </>;
}
