'use client';
import Link from 'next/link';
import {useState} from 'react';
import {api,STORE,getCartToken,setCartToken,getCurrency,mediaUrl,money,track} from '../lib/api';

function Icon({kind}:{kind:'heart'|'compare'|'eye'|'cart'}){const p:any={heart:<path d="M12 20.5 4.8 13.7C.7 9.8 2.8 4 7.5 4c2 0 3.4 1 4.5 2.4C13.1 5 14.5 4 16.5 4c4.7 0 6.8 5.8 2.7 9.7L12 20.5Z"/>,compare:<><path d="M7 4v16M17 4v16"/><path d="m3.5 7 3.5-3 3.5 3M13.5 17l3.5 3 3.5-3"/></>,eye:<><path d="M2.5 12s3.3-5 9.5-5 9.5 5 9.5 5-3.3 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.3"/></>,cart:<><path d="M3 4h2l2.2 10.2h9.7L20 7H6.2"/><circle cx="9" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/></>};return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[kind]}</svg>}
function saved(key:string,id:string){if(typeof window==='undefined')return false;try{return JSON.parse(localStorage.getItem(key)||'[]').includes(id)}catch{return false}}
function toggleSaved(key:string,id:string){if(typeof window==='undefined')return false;let arr:string[]=[];try{arr=JSON.parse(localStorage.getItem(key)||'[]')}catch{};arr=arr.includes(id)?arr.filter(x=>x!==id):[...arr,id];localStorage.setItem(key,JSON.stringify(arr));return arr.includes(id)}

export default function ProductCard({p,currency='TRY'}:{p:any,currency?:string,key?:any}){
  const v=p.variants?.[0];const images=Array.isArray(p.images)?p.images:[];const first=images[0];const second=images[1];const[quick,setQuick]=useState(false);const[busy,setBusy]=useState(false);const[liked,setLiked]=useState(()=>saved('ticarti-wishlist',String(p.id)));const[compared,setCompared]=useState(()=>saved('ticarti-compare',String(p.id)));
  const discount=v?.comparePrice&&Number(v.comparePrice)>Number(v.price)?Math.round((1-Number(v.price)/Number(v.comparePrice))*100):0;
  const stock=v?.inventory?Math.max(0,Number(v.inventory.onHand||0)-Number(v.inventory.reserved||0)):null;const soldOut=stock!==null&&v?.inventory?.trackStock&&stock<1&&!v?.inventory?.allowBackorder;
  async function quickAdd(){if(!v?.id||busy)return;setBusy(true);try{let t=getCartToken();if(!t){const c=await api(`/storefront/${STORE}/carts`,{method:'POST',body:JSON.stringify({currency:getCurrency()})});t=c.token;setCartToken(t)}await api(`/storefront/carts/${t}/items`,{method:'POST',body:JSON.stringify({variantId:v.id,quantity:1})});track('add_to_cart',{item_id:p.id,item_name:p.title,variant_id:v.id,value:Number(v.price||0),currency,quantity:1});window.dispatchEvent(new Event('cart-change'))}finally{setBusy(false)}}
  return <div id={`product-${p.id}`} className="product-card text-left image-hover-personal product_card__button_hover" data-product-id={p.id}>
    <div className="product-card__image__container image-hover-personal-element">
      <div className="product-card__image">
        <Link href={'/products/'+p.slug} className="product-card__image__url" aria-label={p.title} onClick={()=>track('select_item',{item_id:p.id,item_name:p.title,value:Number(v?.price||0),currency})}>
          <div className="image-hover-box__container">
            {first?<picture className="image-hover-box image-hover-box--scale"><source srcSet={mediaUrl(first.url,'card','avif')} type="image/avif"/><source srcSet={mediaUrl(first.url,'card','webp')} type="image/webp"/><img loading="lazy" decoding="async" src={mediaUrl(first.url,'card','webp')} alt={first.alt||p.title}/></picture>:<span className="product-image-empty" aria-hidden="true"/>}
            {second&&<picture className="image-hover-box image-hover-box__second"><source srcSet={mediaUrl(second.url,'card','avif')} type="image/avif"/><img loading="lazy" decoding="async" src={mediaUrl(second.url,'card','webp')} alt={second.alt||p.title}/></picture>}
          </div>
        </Link>
      </div>
      <div className="product-card__media-buttons product-card__media-buttons--animation product-card__media-buttons_fixed">
        <button type="button" className={`product-card__media-buttons__item ${liked?'active':''}`} onClick={()=>setLiked(toggleSaved('ticarti-wishlist',String(p.id)))} aria-label="Favoriye ekle"><Icon kind="heart"/></button>
        <button type="button" className={`product-card__media-buttons__item ${compared?'active':''}`} onClick={()=>setCompared(toggleSaved('ticarti-compare',String(p.id)))} aria-label="Karşılaştır"><Icon kind="compare"/></button>
        <button type="button" className="product-card__media-buttons__item" onClick={()=>setQuick(true)} aria-label="Hızlı görünüm"><Icon kind="eye"/></button>
      </div>
      <div className="badges__container">{soldOut?<span className="badges-item__medium badges-item__sold-out">TÜKENDİ</span>:discount>0&&<span className="badges-item__medium badges-item__sale">-%{discount}</span>}{p.featured&&<span className="badges-item__medium badges-item__main">ÖNE ÇIKAN</span>}</div>
    </div>
    <div className="product-card__content">
      <div className="product-card__content__main">
        {p.brand?.name&&<div className="body3"><Link className="mt0 product-card-small__meta link link__base-to_accent-color text-uppercase a--no-hover-color native-hover" href={'/products?brand='+encodeURIComponent(p.brand.slug||p.brand.name)}>{p.brand.name}</Link></div>}
        <div className="body2 mt3 product-card__heading"><Link href={'/products/'+p.slug} className="product-card-name-size product-card-small__heading heading-color-block-hover a--no-hover-color clear-underline animation-underline native-hover"><h3>{p.title}</h3></Link></div>
        {p.rating&&<div className="review-stars body3">★★★★★ <span>{p.reviewCount||''}</span></div>}
        <div className="price price--on-sale"><div className="price__container"><div className="price__regular"><span className="price-item price-item--regular">{money(v?.price,currency)}</span></div>{v?.comparePrice&&<div className="price__sale"><span className="price-item price-item--sale">{money(v?.price,currency)}</span><s className="price-item price-item--regular">{money(v.comparePrice,currency)}</s></div>}</div></div>
        {p.shortDescription&&<div className="mt8 body3 product-card__description">{p.shortDescription}</div>}
      </div>
      <div className="product-card__interface">
        <div className="product-card__form">{v?.id&&<button type="button" disabled={busy||soldOut} className="quick-add__submit btn btn__transition-text btn-card-width" onClick={()=>void quickAdd()}><span className="btn__texts"><span className="btn__top-text is-visible"><Icon kind="cart"/>{soldOut?'Tükendi':busy?'Ekleniyor':'Sepete ekle'}</span></span></button>}</div>
        <div className="product-card__media-buttons product-card__media-buttons__inline product-card__media-buttons--mobile"><button type="button" className="product-card__media-buttons__item" onClick={()=>setLiked(toggleSaved('ticarti-wishlist',String(p.id)))} aria-label="Favoriye ekle"><Icon kind="heart"/></button><button type="button" className="product-card__media-buttons__item" onClick={()=>setQuick(true)} aria-label="Hızlı görünüm"><Icon kind="eye"/></button></div>
      </div>
    </div>
    {quick&&<div className="popup-modal quick-view-backdrop" role="dialog" aria-modal="true" aria-label={`${p.title} hızlı görünüm`} onClick={()=>setQuick(false)}><div className="popup-modal__content quick-view" onClick={e=>e.stopPropagation()}><button className="quick-view-close" onClick={()=>setQuick(false)} aria-label="Kapat">×</button><div className="quick-view-media">{first&&<img src={mediaUrl(first.url,'detail','webp')} alt={first.alt||p.title}/>}</div><div className="quick-view-copy">{p.brand?.name&&<small>{p.brand.name}</small>}<h2>{p.title}</h2><div className="price">{money(v?.price,currency)}{v?.comparePrice&&<span className="old">{money(v.comparePrice,currency)}</span>}</div><p>{p.shortDescription||p.description||''}</p><div className="quick-view-buttons"><button className="btn" disabled={busy} onClick={()=>void quickAdd()}>Sepete ekle</button><Link className="btn alt" href={'/products/'+p.slug}>Ürüne git</Link></div></div></div></div>}
  </div>
}
