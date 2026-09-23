'use client';
import Link from 'next/link';
import {useState} from 'react';
import {api,STORE,getCartToken,setCartToken,getCurrency,mediaUrl,money,track} from '../lib/api';

const A='/signature-assets/';
function I({name,alt=''}:{name:string;alt?:string}){return <img className="signature-icon" src={`${A}${name}.svg`} alt={alt} aria-hidden={alt?undefined:true}/>}
function saved(key:string,id:string){if(typeof window==='undefined')return false;try{return JSON.parse(localStorage.getItem(key)||'[]').includes(id)}catch{return false}}
function toggleSaved(key:string,id:string){if(typeof window==='undefined')return false;let arr:string[]=[];try{arr=JSON.parse(localStorage.getItem(key)||'[]')}catch{};arr=arr.includes(id)?arr.filter(x=>x!==id):[...arr,id];localStorage.setItem(key,JSON.stringify(arr));return arr.includes(id)}

export default function ProductCard({p,currency='TRY'}:{p:any,currency?:string,key?:any}){
  const variants=Array.isArray(p.variants)?p.variants:[];const[vId,setVId]=useState(variants[0]?.id||'');const v=variants.find((x:any)=>x.id===vId)||variants[0];
  const images=Array.isArray(p.images)?p.images:[];const first=images[0];const second=images[1];const[quick,setQuick]=useState(false);const[busy,setBusy]=useState(false);const[qty,setQty]=useState(1);const[liked,setLiked]=useState(()=>saved('ticarti-wishlist',String(p.id)));const[compared,setCompared]=useState(()=>saved('ticarti-compare',String(p.id)));
  const stock=v?.inventory?Math.max(0,Number(v.inventory.onHand||0)-Number(v.inventory.reserved||0)):null;const soldOut=stock!==null&&v?.inventory?.trackStock&&stock<1&&!v?.inventory?.allowBackorder;
  const discount=v?.comparePrice&&Number(v.comparePrice)>Number(v.price)?Math.round((1-Number(v.price)/Number(v.comparePrice))*100):0;const meta=p.metadata?.signature||p.metadata||{};
  async function add(){if(!v?.id||busy||soldOut)return;setBusy(true);try{let t=getCartToken();if(!t){const c=await api(`/storefront/${STORE}/carts`,{method:'POST',body:JSON.stringify({currency:getCurrency()})});t=c.token;setCartToken(t)}await api(`/storefront/carts/${t}/items`,{method:'POST',body:JSON.stringify({variantId:v.id,quantity:qty})});track('add_to_cart',{item_id:p.id,item_name:p.title,variant_id:v.id,value:Number(v.price||0),currency,quantity:qty});window.dispatchEvent(new Event('cart-change'))}finally{setBusy(false)}}
  return <div id={`product-card-${p.id}`} className="product-card text-left image-hover01-personal product_card__button_hover" data-product-id={p.id}>
    <div className="product-card__image__container image-hover-personal-element">
      <div className="product-card__image">
        <Link href={'/products/'+p.slug} className="product-card__image__url" aria-label={p.title} onClick={()=>track('select_item',{item_id:p.id,item_name:p.title,value:Number(v?.price||0),currency})}>
          <div className="image-hover-box__container">
            {first?<div className="media media--transparent media--hover-effect" style={{aspectRatio:'1 / 1'}}><img className="motion-reduce" loading="lazy" src={mediaUrl(first.url,'card','webp')} alt={first.alt||p.title}/>{second&&<img className="motion-reduce secondary-image" loading="lazy" src={mediaUrl(second.url,'card','webp')} alt={second.alt||p.title}/>}</div>:<div className="media media--transparent" style={{aspectRatio:'1 / 1'}}/>}
          </div>
        </Link>
      </div>
      <div className="product-card__media-buttons product-card__media-buttons--animation product-card__media-buttons_fixed">
        <button className={`product-card__media-buttons__item ${liked?'active':''}`} onClick={()=>setLiked(toggleSaved('ticarti-wishlist',String(p.id)))} aria-label="Favori"><I name="icon-heart"/></button>
        <button className={`product-card__media-buttons__item ${compared?'active':''}`} onClick={()=>setCompared(toggleSaved('ticarti-compare',String(p.id)))} aria-label="Karşılaştır"><I name="icon-compare"/></button>
        <button className="product-card__media-buttons__item" onClick={()=>setQuick(true)} aria-label="Hızlı görünüm"><I name="icon-eye"/></button>
      </div>
      <div className="badges__container">{soldOut?<span className="badges-item__medium badges-item__sold-out">TÜKENDİ</span>:discount>0&&<span className="badges-item__medium badges-item__sale">-%{discount}</span>}{meta.featuredBadge&&<span className="badges-item__medium badges-item__main">{String(meta.featuredBadge)}</span>}</div>
    </div>
    <div className="product-card__content">
      <div className="product-card__content__main">
        {p.brand?.name&&<div className="body3"><Link className="mt0 product-card-small__meta link link__base-to_accent-color text-uppercase a--no-hover-color native-hover" href={'/products?brand='+encodeURIComponent(p.brand.name)}>{p.brand.name}</Link></div>}
        <div className="body2 mt3 product-card__heading"><Link href={'/products/'+p.slug} className="product-card-name-size product-card-small__heading heading-color-block-hover a--no-hover-color clear-underline animation-underline native-hover"><h3>{p.title}</h3></Link></div>
        {p.rating&&<div className="review-stars mt5" aria-label={`${p.rating} puan`}><span>★★★★★</span><small>{p.reviewCount||''}</small></div>}
        <div className="price price--large h5"><div className="price__container"><div className="price__regular"><span className="price-item price-item--regular">{money(v?.price,currency)}</span></div>{v?.comparePrice&&Number(v.comparePrice)>Number(v.price)&&<div className="price__sale"><span className="price-item price-item--sale price-item--last">{money(v.price,currency)}</span><s className="price-item price-item--regular">{money(v.comparePrice,currency)}</s></div>}</div></div>
        {meta.smallDescription&&<div className="mt8 body3 product-card__description">{String(meta.smallDescription)}</div>}
        {variants.length>1&&<div className="product-card__variant-picker mt8">{variants.slice(0,6).map((x:any)=><button key={x.id} className={`button-swatches ${x.id===v?.id?'active':''}`} onClick={()=>setVId(x.id)}>{x.title}</button>)}</div>}
      </div>
      <div className="product-card__interface product-card__interface--small">
        <div className="product-card__form">
          <div className="field quantity product-card__quantity"><button className="quantity__button" onClick={()=>setQty(Math.max(1,qty-1))}><I name="icon-minus"/></button><input className="field__input quantity__input" type="number" min={1} value={qty} onChange={e=>setQty(Math.max(1,Number(e.target.value)||1))}/><button className="quantity__button" onClick={()=>setQty(qty+1)}><I name="icon-plus"/></button></div>
          <button type="button" className="quick-add__submit btn btn__transition-text btn-card-width" disabled={busy||soldOut} onClick={()=>void add()}><span className="btn__texts"><span className="btn__top-text is-visible"><I name="icon-cart"/>{soldOut?'Tükendi':busy?'Ekleniyor…':'Sepete ekle'}</span></span></button>
        </div>
      </div>
    </div>
    {quick&&<div className="popup-modal popup-modal--quickview active" role="dialog" aria-modal="true" onClick={()=>setQuick(false)}><div className="popup-modal__content" onClick={e=>e.stopPropagation()}><button className="popup-modal__toggle" onClick={()=>setQuick(false)}><I name="icon-close"/></button><div className="grid grid--2-col"><div className="grid__item">{first&&<img className="width-100" src={mediaUrl(first.url,'detail','webp')} alt={first.alt||p.title}/>}</div><div className="grid__item"><div className="body3">{p.brand?.name}</div><h2>{p.title}</h2><div className="price h3">{money(v?.price,currency)}</div><p>{p.shortDescription||p.description||''}</p><button className="btn width-100" onClick={()=>void add()}>Sepete ekle</button><Link className="link display-block mt15" href={'/products/'+p.slug}>Ürün detayları</Link></div></div></div></div>}
  </div>
}
