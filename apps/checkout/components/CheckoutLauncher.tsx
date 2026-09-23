'use client';
import {useEffect,useState} from 'react';
import CheckoutPage from '../themes/ticarti/pages/CheckoutPage';

type SessionInfo={id:string;storeOrigin:string;returnUrl?:string;currency?:string;locale?:string};
export default function CheckoutLauncher({sessionId}:{sessionId:string}){
  const[session,setSession]=useState<SessionInfo|null>(null);
  const[error,setError]=useState('');
  useEffect(()=>{void fetch(`/api/v1/storefront/checkout-sessions/${encodeURIComponent(sessionId)}`,{credentials:'include'}).then(async r=>{const x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(x.message)?x.message.join(', '):x.message||'Checkout oturumu açılamadı');if(!x.cartToken||!x.session)throw new Error('Checkout oturumu eksik');localStorage.setItem('commerce-cart',x.cartToken);if(x.session.currency)localStorage.setItem('commerce-currency',x.session.currency);if(x.session.locale)localStorage.setItem('commerce-locale',x.session.locale);setSession(x.session)}).catch((e:any)=>setError(e?.message||'Checkout oturumu açılamadı'))},[sessionId]);
  if(error)return <main className="checkout-launcher"><div className="checkout-launcher-card"><h1>Checkout açılamadı</h1><p>{error}</p><a href="https://ticarti.com">Mağazaya dön</a></div></main>;
  if(!session)return <main className="checkout-launcher"><div className="checkout-launcher-card"><strong>Güvenli ödeme hazırlanıyor…</strong></div></main>;
  return <CheckoutPage sessionId={session.id} storeOrigin={session.storeOrigin}/>;
}
