
'use client';
import {useEffect,useState} from 'react';
import SameOriginCheckoutLauncher from './SameOriginCheckoutLauncher';
import {startSharedCheckout} from '../../lib/checkout';

export default function SameOriginCheckoutEntry({sessionId}:{sessionId?:string}){
  const[error,setError]=useState('');
  useEffect(()=>{if(!sessionId)void startSharedCheckout().catch((e:any)=>setError(e?.message||'Checkout başlatılamadı.'))},[sessionId]);
  if(sessionId)return <SameOriginCheckoutLauncher sessionId={sessionId}/>;
  return <main className="checkout-launcher"><div className="checkout-launcher-card"><strong>{error||'Güvenli checkout hazırlanıyor…'}</strong>{error&&<p><a href="/cart">Sepete dön</a></p>}</div></main>;
}
