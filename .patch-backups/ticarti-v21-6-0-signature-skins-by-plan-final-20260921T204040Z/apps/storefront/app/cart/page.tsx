'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {api,getCartToken,money,mediaUrl} from '../../lib/api';
const A='/signature-assets/';function I({name}:{name:string}){return <img className="theme-icon" width="20" height="20" src={`${A}${name}.svg`} alt="" aria-hidden="true"/>}
type AccessMode='REQUIRED'|'SUGGESTED'|'GUEST';
export default function Cart(){const router=useRouter();const[c,setC]=useState<any>(null);const[code,setCode]=useState('');const[err,setErr]=useState('');const[busy,setBusy]=useState(false);const[gate,setGate]=useState(false);const[loggedIn,setLoggedIn]=useState(false);
async function load(){const t=getCartToken();if(!t){setC({items:[],totals:{grandTotal:0,currency:'TRY'},store:{checkoutConfig:{customerAccessMode:'GUEST'}}});return}try{setC(await api('/storefront/carts/'+t))}catch(e:any){setErr(e.message)}}
useEffect(()=>{void load();api('/storefront/customer/refresh',{method:'POST',credentials:'include',body:'{}'}).then(()=>setLoggedIn(true)).catch(()=>setLoggedIn(false));const h=()=>void load();window.addEventListener('currency-change',h);return()=>window.removeEventListener('currency-change',h)},[]);
async function qty(id:string,q:number){try{setBusy(true);await api(`/storefront/carts/${getCartToken()}/items/${id}`,{method:'PATCH',body:JSON.stringify({quantity:q})});await load();window.dispatchEvent(new Event('cart-change'))}catch(e:any){setErr(e.message)}finally{setBusy(false)}}
async function discount(){try{setBusy(true);await api(`/storefront/carts/${getCartToken()}/discount`,{method:'POST',body:JSON.stringify({code})});setCode('');await load()}catch(e:any){setErr(e.message)}finally{setBusy(false)}}
function checkout(){const mode=(c?.store?.checkoutConfig?.customerAccessMode||'GUEST') as AccessMode;if(loggedIn||mode==='GUEST'){router.push('/checkout');return}setGate(true)}
if(!c)return <main className="page-width top-spacing-normal">Sepet hazırlanıyor…</main>;const cur=c.totals?.currency||c.currency||'TRY';const mode=(c?.store?.checkoutConfig?.customerAccessMode||'GUEST') as AccessMode;
return <main id="MainContent" className="content-for-layout focus-none">
  <section className="display-block top-spacing-normal">
    <div className="page-width">
      {!c.items.length ? <div className="cart__warnings text-center">
        <div className="main-cart__warnings__icon big-svg-icon big-svg-icon__opacity-20"><I name="icon-cart"/></div>
        <h2 className="mt30 h2 cart__warnings__heading">Sepetiniz boş</h2>
        <Link className="mt40 btn btn__transition-text btn-wide" href="/products">Alışverişe devam et</Link>
      </div> : <>
        <div className="cart-page__heading display-flex justify-content-between align-items-center"><h1 className="h2">Sepetiniz</h1><Link className="link link-hover-span btn-font strong" href="/products">Alışverişe devam et</Link></div>
        {err&&<div className="color-error mt20">{err}</div>}
        <div className="page-grid-1 no-row-gap mt40"><div className="cart__contents">
          <div className="cart-item__headings-bar body2"><div className="cart-item__headings-bar__image"/><div className="cart-item__headings-bar__info"><span className="cart-item__headings-bar__product">Ürün</span><span className="cart-item__headings-bar__qty">Adet</span><span className="cart-item__headings-bar__total">Toplam</span></div></div>
          <div className="js-contents body3"><div className="main-cart-items__wrapper">
            {c.items.map((i:any)=><div className="cart-item" key={i.id}>
              <div className="cart-item__media image-hover01"><Link href={`/products/${i.variant.product.slug}`} className="image-hover-box__container"><div className="image-hover-box image-hover-box__small-radius">{i.variant.product.images?.[0]?.url&&<img src={mediaUrl(i.variant.product.images[0].url,'thumb','webp')} alt={i.variant.product.title}/>}</div></Link></div>
              <div className="cart-item__details"><div className="cart-item__details__items body3 mt--first-child-0"><Link href={`/products/${i.variant.product.slug}`} className="mt10 h6 cart-item__heading animation-underline">{i.variant.product.title}</Link><div className="mt3 product-option">{i.variant.title}</div><div className="mt10">{money(i.variant.price,cur)}</div></div></div>
              <div className="cart-item__quantity"><div className="field quantity"><button className="quantity__button" disabled={busy||i.quantity<=1} onClick={()=>void qty(i.id,i.quantity-1)}><I name="icon-minus"/></button><input className="field__input quantity__input" value={i.quantity} readOnly/><button className="quantity__button" disabled={busy} onClick={()=>void qty(i.id,i.quantity+1)}><I name="icon-plus"/></button></div><button className="cart-item__remove-button transition-up" onClick={()=>void qty(i.id,0)} disabled={busy}><I name="icon-remove"/></button></div>
              <div className="cart-item__totals"><span className="h5 price__main">{money(Number(i.variant.price)*i.quantity,cur)}</span></div>
            </div>)}
          </div></div>
        </div></div>
        <div className="page-grid-2 mt40"><div><label className="h6">İndirim kodu</label><div className="field field-with-icon mt10"><input className="field__input" value={code} onChange={e=>setCode(e.target.value)} placeholder="Kupon kodu"/><button className="field__icon" onClick={()=>void discount()} disabled={busy||!code.trim()}>→</button></div></div><div className="text-right"><div className="body2">Ara toplam: <b>{money(c.totals.subtotal,cur)}</b></div>{Number(c.totals.discountTotal)>0&&<div className="body2 mt8">İndirim: <b>-{money(c.totals.discountTotal,cur)}</b></div>}<div className="h4 mt16">Toplam: {money(c.totals.grandTotal,cur)}</div><button className="btn btn__transition-text btn-wide mt20" onClick={checkout}>Ödemeye geç</button></div></div>
      </>}
    </div>
  </section>
  {gate&&<div className="popup-modal active"><button className="popup-modal__overlay" onClick={()=>setGate(false)} aria-label="Kapat"/><div className="popup-modal__content"><button className="popup-modal__toggle" onClick={()=>setGate(false)}><I name="icon-close"/></button><div className="page-width mt40 mb40 text-center"><h2 className="h4">{mode==='REQUIRED'?'Ödeme için hesabınıza giriş yapın':'Nasıl devam etmek istersiniz?'}</h2><p className="body2 mt16">Sepetiniz korunacaktır.</p><div className="display-flex justify-content-center mt20"><Link className="btn" href="/account?mode=login&return=/checkout">Giriş yap</Link><Link className="btn btn--border ml10" href="/account?mode=register&return=/checkout">Üye ol</Link>{mode!=='REQUIRED'&&<button className="btn btn--border ml10" onClick={()=>router.push('/checkout')}>Misafir devam et</button>}</div></div></div></div>}
</main>}
