'use client';

import {useEffect} from 'react';
import {api,getCartToken,STORE,visitorId} from '../lib/api';

function stateFromPath(path:string){if(path.startsWith('/checkout'))return 'CHECKOUT';if(path.startsWith('/cart'))return 'CART';return 'BROWSING';}

export default function LiveTrackerBeacon(){
  useEffect(()=>{
    let stopped=false;
    const send=async()=>{
      if(stopped||document.visibilityState==='hidden')return;
      try{
        await api(`/storefront/${STORE}/live/heartbeat`,{method:'POST',body:JSON.stringify({visitorId:visitorId(),path:window.location.pathname+window.location.search,state:stateFromPath(window.location.pathname),cartToken:getCartToken()||null,city:localStorage.getItem('commerce-city')||null,country:localStorage.getItem('commerce-country')||null})});
      }catch{}
    };
    void send();
    const timer=window.setInterval(()=>void send(),20000);
    const visible=()=>{if(document.visibilityState==='visible')void send()};
    document.addEventListener('visibilitychange',visible);
    return()=>{stopped=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
  },[]);
  return null;
}
