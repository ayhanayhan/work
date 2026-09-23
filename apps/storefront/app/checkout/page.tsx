'use client';
import {useEffect,useState} from 'react';
import {getCartToken,getLocale} from '../../lib/api';
import {sfText} from '../../lib/i18n';

export default function CheckoutGateway(){
  const tt=(key:string)=>sfText(key,getLocale());
  const[error,setError]=useState('');
  useEffect(()=>{
    const token=getCartToken();
localStorage.setItem('commerce-checkout-store-origin', window.location.origin);
    if(!token){window.location.replace('/cart');return}
    void fetch('/api/v1/storefront/checkout-sessions',{
      method:'POST',
      credentials:'include',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({cartToken:token,returnUrl:window.location.origin})
    }).then(async r=>{
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||tt('system.checkoutFailed'));
      if(!data.url)throw new Error(tt('system.checkoutFailed'));
      window.location.replace(data.url);
    }).catch((e:any)=>setError(e?.message||tt('system.checkoutFailed')));
  },[]);
  return <main style={{position:'fixed',inset:0,zIndex:2147483647,display:'grid',placeItems:'center',background:'#fff',fontFamily:'Inter,system-ui,sans-serif'}}>
    <div style={{textAlign:'center',padding:24}}><strong>{error?tt('system.checkoutFailed'):tt('system.checkoutLoading')}</strong>{error&&<><p style={{color:'#777'}}>{error}</p><a href="/cart">{tt('system.returnCart')}</a></>}</div>
  </main>;
}
