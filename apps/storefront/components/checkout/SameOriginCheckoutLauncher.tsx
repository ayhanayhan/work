
'use client';

import {useEffect,useState} from 'react';
import CheckoutPage from './CheckoutPage';
import {api,clearCartToken,getCartToken,setCartToken} from '../../lib/api';
import {currentUiLocale,uiText} from './i18n';

type SessionInfo={id:string;storeOrigin:string;returnUrl?:string;currency?:string;locale?:string};

export default function SameOriginCheckoutLauncher({sessionId}:{sessionId:string}){
  const locale=currentUiLocale();
  const[session,setSession]=useState<SessionInfo|null>(null);
  const[sessionStore,setSessionStore]=useState<any>(null);
  const[error,setError]=useState('');

  useEffect(()=>{
    let live=true;
    void api(`/storefront/checkout-sessions/${encodeURIComponent(sessionId)}`,{credentials:'include'}).then((x:any)=>{
      if(!live)return;
      if(x?.inactive){
        if(x?.clearCart&&x?.cartToken)clearCartToken(String(x.cartToken));
        window.location.replace(String(x.redirectUrl||'/'));
        return;
      }
      if(!x?.cartToken||!x?.session)throw new Error(uiText('checkout.sessionMissing',locale));
      if(getCartToken()!==String(x.cartToken))setCartToken(String(x.cartToken));
      // CheckoutPage consumes session currency/locale without redirecting.
      // setLocale() navigates, creating a checkout reload loop.
      setSessionStore(x.store||null);
      setSession(x.session);
    }).catch((e:any)=>{if(live)setError(e?.message||uiText('checkout.errors.session',locale))});
    return()=>{live=false};
  },[sessionId]);

  if(error)return <main className="checkout-launcher"><div className="checkout-launcher-card"><h1>{uiText('checkout.openFailed',locale)}</h1><p>{error}</p><a href="/cart">{uiText('checkout.returnStore',locale)}</a></div></main>;
  if(!session)return <main className="checkout-launcher"><div className="checkout-launcher-card"><strong>{uiText('checkout.loading',locale)}</strong></div></main>;
  return <CheckoutPage sessionId={session.id} storeOrigin={session.storeOrigin} sessionStore={sessionStore} locale={session.locale||locale}/>;
}
