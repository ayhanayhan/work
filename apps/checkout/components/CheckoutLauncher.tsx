'use client';
import {useEffect,useState} from 'react';
import CheckoutPage from '../themes/ticarti/pages/CheckoutPage';
import {currentUiLocale,uiText} from '../lib/i18n';

type SessionInfo={id:string;storeOrigin:string;returnUrl?:string;currency?:string;locale?:string};
export default function CheckoutLauncher({sessionId}:{sessionId:string}){
  const locale=currentUiLocale();
  const[session,setSession]=useState<SessionInfo|null>(null);
  const[error,setError]=useState('');
  const[fallbackStoreOrigin,setFallbackStoreOrigin]=useState('');
  useEffect(()=>{
    try{
      setFallbackStoreOrigin(localStorage.getItem('commerce-checkout-store-origin')||'');
    }catch{}
    void fetch(`/api/v1/storefront/checkout-sessions/${encodeURIComponent(sessionId)}`,{credentials:'include'}).then(async r=>{const x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(x.message)?x.message.join(', '):x.message||uiText('checkout.errors.session',locale));if(!x.cartToken||!x.session)throw new Error(uiText('checkout.sessionMissing',locale));localStorage.setItem('commerce-cart',x.cartToken);if(x.session.currency)localStorage.setItem('commerce-currency',x.session.currency);if(x.session.locale)localStorage.setItem('commerce-locale',x.session.locale);
if(x.session.storeOrigin){
  localStorage.setItem('commerce-checkout-store-origin',x.session.storeOrigin);
  setFallbackStoreOrigin(x.session.storeOrigin);
}
setSession(x.session)}).catch((e:any)=>setError(e?.message||uiText('checkout.errors.session',locale)))},[sessionId]);
  if(error){
    const backUrl=fallbackStoreOrigin||'https://ticarti.com';
    return <main className="checkout-launcher"><div className="checkout-launcher-card"><h1>{uiText('checkout.openFailed',locale)}</h1><p>{error}</p><a href={backUrl}>{uiText('checkout.returnStore',locale)}</a></div></main>;
  }
  if(!session)return <main className="checkout-launcher"><div className="checkout-launcher-card"><strong>{uiText('checkout.loading',locale)}</strong></div></main>;
  return <CheckoutPage sessionId={session.id} storeOrigin={session.storeOrigin} locale={session.locale||locale}/>;
}
