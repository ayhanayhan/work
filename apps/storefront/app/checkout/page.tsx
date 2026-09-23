'use client';
import {useEffect,useState} from 'react';
import {getCartToken} from '../../lib/api';

export default function CheckoutGateway(){
  const[error,setError]=useState('');
  useEffect(()=>{
    const token=getCartToken();
    if(!token){window.location.replace('/cart');return}
    void fetch('/api/v1/storefront/checkout-sessions',{
      method:'POST',
      credentials:'include',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({cartToken:token,returnUrl:window.location.origin})
    }).then(async r=>{
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||'Checkout başlatılamadı');
      if(!data.url)throw new Error('Checkout adresi oluşturulamadı');
      window.location.replace(data.url);
    }).catch((e:any)=>setError(e?.message||'Checkout başlatılamadı'));
  },[]);
  return <main style={{position:'fixed',inset:0,zIndex:2147483647,display:'grid',placeItems:'center',background:'#fff',fontFamily:'Inter,system-ui,sans-serif'}}>
    <div style={{textAlign:'center',padding:24}}><strong>{error?'Checkout açılamadı':'Güvenli ödeme hazırlanıyor…'}</strong>{error&&<><p style={{color:'#777'}}>{error}</p><a href="/cart">Sepete dön</a></>}</div>
  </main>;
}
