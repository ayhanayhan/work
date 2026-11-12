'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {api,STORE} from '../lib/api';

export default function B2BStorefrontBridge(){
 const[cfg,setCfg]=useState<any>(null),[session,setSession]=useState<any>(null),[path,setPath]=useState('');
 useEffect(()=>{setPath(window.location.pathname);let live=true;Promise.all([api(`/storefront/${STORE}/b2b/config`).catch(()=>({enabled:false})),api('/storefront/customer/session',{credentials:'include'}).catch(()=>({authenticated:false}))]).then(([c,s])=>{if(live){setCfg(c);setSession(s)}});return()=>{live=false}},[]);
 const activeB2B=String(session?.customer?.b2b?.status||'')==='ACTIVE';
 const hidePrices=!!cfg?.enabled&&(cfg.priceVisibility==='HIDDEN'||(cfg.priceVisibility==='LOGIN_REQUIRED'&&!activeB2B));
 const quoteOnly=!!cfg?.enabled&&!!cfg?.quoteOnly;
 const productSlug=useMemo(()=>{const m=path.match(/\/product\/([^/?#]+)/);return m?decodeURIComponent(m[1]):''},[path]);
 const canQuote=!!cfg?.enabled&&!!cfg?.quoteEnabled&&(!cfg.quoteRequireLogin||activeB2B);
 if(!cfg?.enabled)return null;
 return <>
  {(hidePrices||quoteOnly)&&<style>{`
html[data-ticarti-b2b-hide-prices="1"] .product-detail-price,
html[data-ticarti-b2b-hide-prices="1"] .product-card .price,
html[data-ticarti-b2b-hide-prices="1"] .product-price,
html[data-ticarti-b2b-hide-prices="1"] .tt-price,
html[data-ticarti-b2b-hide-prices="1"] [data-product-price],
html[data-ticarti-b2b-hide-prices="1"] [data-price-display]{display:none!important}
html[data-ticarti-b2b-quote-only="1"] .product-add-btn,
html[data-ticarti-b2b-quote-only="1"] .product-card-quickadd,
html[data-ticarti-b2b-quote-only="1"] [data-add-to-cart],
html[data-ticarti-b2b-quote-only="1"] form[action*="cart/add"] button[type="submit"]{display:none!important}
`}</style>}
  <DataSetter hidePrices={hidePrices} quoteOnly={quoteOnly}/>
  {cfg?.priceVisibility==='LOGIN_REQUIRED'&&!activeB2B&&<div style={{position:'fixed',left:18,bottom:18,zIndex:89,padding:'10px 12px',borderRadius:10,background:'var(--store-bg,#fff)',boxShadow:'0 8px 28px rgba(0,0,0,.12)',fontSize:12}}>Fiyatları görmek için onaylı firma hesabınızla giriş yapın.</div>}
  {productSlug&&<div style={{position:'fixed',right:18,bottom:18,zIndex:90,display:'flex',gap:8,alignItems:'center'}}>
    {canQuote&&<Link href={`/quote?product=${encodeURIComponent(productSlug)}`} className="btn" style={{boxShadow:'0 8px 28px rgba(0,0,0,.14)'}}>Teklif İste</Link>}
    {!canQuote&&cfg?.quoteEnabled&&cfg?.quoteRequireLogin&&!activeB2B&&<Link href={`/login?return=${encodeURIComponent(`/product/${productSlug}`)}`} className="btn" style={{boxShadow:'0 8px 28px rgba(0,0,0,.14)'}}>Teklif için giriş yap</Link>}
  </div>}
 </>;
}
function DataSetter({hidePrices,quoteOnly}:{hidePrices:boolean;quoteOnly:boolean}){useEffect(()=>{const el=document.documentElement;el.dataset.ticartiB2bHidePrices=hidePrices?'1':'0';el.dataset.ticartiB2bQuoteOnly=quoteOnly?'1':'0';return()=>{delete el.dataset.ticartiB2bHidePrices;delete el.dataset.ticartiB2bQuoteOnly}},[hidePrices,quoteOnly]);return null}
