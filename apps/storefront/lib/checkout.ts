
'use client';

import {api,clearCartToken,getCartToken,isCartUnavailableError} from './api';

export async function startSharedCheckout(){
  const cartToken=getCartToken();
  if(!cartToken)throw new Error('Sepet bulunamadı.');
  try{
    const data:any=await api('/storefront/checkout-sessions',{method:'POST',body:JSON.stringify({cartToken,returnUrl:window.location.origin})});
    if(!data?.id)throw new Error('Checkout oturumu oluşturulamadı.');
    window.location.assign(`/checkout?session=${encodeURIComponent(String(data.id))}`);
  }catch(error:any){
    if(isCartUnavailableError(error)){clearCartToken(cartToken);window.location.assign('/cart');return}
    throw error;
  }
}
